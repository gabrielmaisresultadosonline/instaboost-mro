// User session storage (local JSON + Supabase persistence)
import { MROUser, UserSession, RegisteredIG, normalizeInstagramUsername } from '@/types/user';
import { supabase } from '@/integrations/supabase/client';

const USER_STORAGE_KEY = 'mro_user_session';

export const getUserSession = (): UserSession => {
  const stored = localStorage.getItem(USER_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    user: null,
    isAuthenticated: false,
    lastSync: new Date().toISOString()
  };
};

export const saveUserSession = (session: UserSession): void => {
  session.lastSync = new Date().toISOString();
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session));
};

// Load profiles from database for a SquareCloud user
export const loadProfilesFromDatabase = async (squarecloudUsername: string): Promise<RegisteredIG[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('squarecloud-profile-storage', {
      body: {
        action: 'load',
        squarecloud_username: squarecloudUsername
      }
    });

    if (error) {
      console.error('[userStorage] Error loading from database:', error);
      return [];
    }

    if (data?.success && data?.profiles) {
      return data.profiles.map((p: any) => ({
        username: p.instagram_username,
        registeredAt: p.created_at,
        email: p.profile_data?.email || '',
        printSent: p.profile_data?.printSent || true,
        syncedFromSquare: p.profile_data?.syncedFromSquare || false
      }));
    }

    return [];
  } catch (error) {
    console.error('[userStorage] Error loading profiles:', error);
    return [];
  }
};

// Save a single profile to database
export const saveProfileToDatabase = async (
  squarecloudUsername: string, 
  instagramUsername: string, 
  profileData: any
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('squarecloud-profile-storage', {
      body: {
        action: 'save',
        squarecloud_username: squarecloudUsername,
        instagram_username: instagramUsername,
        profile_data: profileData
      }
    });

    if (error) {
      console.error('[userStorage] Error saving to database:', error);
      return false;
    }

    return data?.success || false;
  } catch (error) {
    console.error('[userStorage] Error saving profile:', error);
    return false;
  }
};

export const loginUser = async (
  username: string, 
  daysRemaining: number,
  email?: string
): Promise<UserSession> => {
  // Check if user already exists to preserve creativesUnlocked status
  const existingSession = getUserSession();
  const existingUser = existingSession.user?.username === username ? existingSession.user : null;
  
  // Load profiles from database
  const dbProfiles = await loadProfilesFromDatabase(username);
  
  // Merge with any local profiles (local takes precedence if both exist)
  const existingLocalIGs = existingUser?.registeredIGs || [];
  const mergedIGs: RegisteredIG[] = [...dbProfiles];
  
  // Add local profiles that aren't in database
  existingLocalIGs.forEach(localIG => {
    if (!mergedIGs.find(ig => ig.username === localIG.username)) {
      mergedIGs.push(localIG);
    }
  });
  
  const session: UserSession = {
    user: {
      username,
      email,
      daysRemaining,
      loginAt: new Date().toISOString(),
      registeredIGs: mergedIGs,
      creativesUnlocked: existingUser?.creativesUnlocked || false
    },
    isAuthenticated: true,
    lastSync: new Date().toISOString()
  };
  saveUserSession(session);
  
  console.log(`[userStorage] Loaded ${mergedIGs.length} profiles from database for ${username}`);
  
  return session;
};

// Admin function to unlock creatives for a lifetime user
export const unlockCreativesForUser = (username: string): void => {
  const session = getUserSession();
  if (session.user && session.user.username === username) {
    session.user.creativesUnlocked = true;
    saveUserSession(session);
  }
};

// Admin function to lock creatives for a lifetime user  
export const lockCreativesForUser = (username: string): void => {
  const session = getUserSession();
  if (session.user && session.user.username === username) {
    session.user.creativesUnlocked = false;
    saveUserSession(session);
  }
};

export const logoutUser = (): void => {
  localStorage.removeItem(USER_STORAGE_KEY);
};

export const updateUserEmail = (email: string): void => {
  const session = getUserSession();
  if (session.user) {
    session.user.email = email;
    saveUserSession(session);
  }
};

export const addRegisteredIG = async (
  instagram: string,
  email: string,
  syncedFromSquare: boolean = false
): Promise<void> => {
  const session = getUserSession();
  if (session.user) {
    const normalizedIG = normalizeInstagramUsername(instagram);
    
    // Check if already registered locally
    if (!session.user.registeredIGs.find(ig => ig.username === normalizedIG)) {
      const newIG: RegisteredIG = {
        username: normalizedIG,
        registeredAt: new Date().toISOString(),
        email,
        printSent: !syncedFromSquare,
        syncedFromSquare
      };
      
      session.user.registeredIGs.push(newIG);
      saveUserSession(session);
      
      // Save to database for persistence
      await saveProfileToDatabase(session.user.username, normalizedIG, {
        email,
        printSent: newIG.printSent,
        syncedFromSquare
      });
    }
  }
};

export const isIGRegistered = (instagram: string): boolean => {
  const session = getUserSession();
  if (!session.user) return false;
  
  const normalizedIG = normalizeInstagramUsername(instagram);
  return session.user.registeredIGs.some(ig => ig.username === normalizedIG);
};

export const getRegisteredIGs = (): RegisteredIG[] => {
  const session = getUserSession();
  return session.user?.registeredIGs || [];
};

export const syncIGsFromSquare = async (instagrams: string[], email: string): Promise<void> => {
  const session = getUserSession();
  if (session.user) {
    for (const ig of instagrams) {
      const normalizedIG = normalizeInstagramUsername(ig);
      if (!session.user.registeredIGs.find(r => r.username === normalizedIG)) {
        const newIG: RegisteredIG = {
          username: normalizedIG,
          registeredAt: new Date().toISOString(),
          email,
          printSent: true,
          syncedFromSquare: true
        };
        
        session.user.registeredIGs.push(newIG);
        
        // Save each profile to database
        await saveProfileToDatabase(session.user.username, normalizedIG, {
          email,
          printSent: true,
          syncedFromSquare: true
        });
      }
    }
    saveUserSession(session);
  }
};

export const isAuthenticated = (): boolean => {
  const session = getUserSession();
  return session.isAuthenticated && session.user !== null;
};

export const getCurrentUser = (): MROUser | null => {
  const session = getUserSession();
  return session.user;
};
