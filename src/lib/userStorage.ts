// User session storage (local JSON + Supabase cloud persistence)
import { MROUser, UserSession, RegisteredIG, normalizeInstagramUsername } from '@/types/user';
import { supabase } from '@/integrations/supabase/client';
import { ProfileSession } from '@/types/instagram';

const USER_STORAGE_KEY = 'mro_user_session';

// Generate auth token for secure API calls
const generateAuthToken = (username: string): string => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${username.toLowerCase()}_${timestamp}_${randomPart}`;
};

// Get stored auth token or generate new one
const getOrCreateAuthToken = (username: string): string => {
  const tokenKey = `mro_auth_token_${username.toLowerCase()}`;
  let token = sessionStorage.getItem(tokenKey);
  if (!token) {
    token = generateAuthToken(username);
    sessionStorage.setItem(tokenKey, token);
  }
  return token;
};

// Cloud storage functions
export const loadUserFromCloud = async (username: string): Promise<{
  email: string | null;
  isEmailLocked: boolean;
  daysRemaining: number;
  profileSessions: ProfileSession[];
  archivedProfiles: ProfileSession[];
} | null> => {
  try {
    const auth_token = getOrCreateAuthToken(username);
    const session = getUserSession();
    
    const { data, error } = await supabase.functions.invoke('user-cloud-storage', {
      body: {
        action: 'load',
        username: username.toLowerCase(),
        email: session.user?.email,
        auth_token
      }
    });

    if (error) {
      console.error('[userStorage] Error loading from cloud:', error);
      return null;
    }

    if (data?.success && data?.exists) {
      console.log(`☁️ Loaded cloud data for ${username}`);
      return {
        email: data.data.email,
        isEmailLocked: !!data.data.email,
        daysRemaining: data.data.daysRemaining || 365,
        profileSessions: data.data.profileSessions || [],
        archivedProfiles: data.data.archivedProfiles || []
      };
    }

    return null;
  } catch (error) {
    console.error('[userStorage] Error loading from cloud:', error);
    return null;
  }
};

export const saveUserToCloud = async (
  username: string,
  email: string | undefined,
  daysRemaining: number,
  profileSessions: ProfileSession[],
  archivedProfiles: ProfileSession[]
): Promise<boolean> => {
  try {
    const auth_token = getOrCreateAuthToken(username);
    
    const { data, error } = await supabase.functions.invoke('user-cloud-storage', {
      body: {
        action: 'save',
        username: username.toLowerCase(),
        email,
        auth_token,
        daysRemaining,
        profileSessions,
        archivedProfiles
      }
    });

    if (error) {
      console.error('[userStorage] Error saving to cloud:', error);
      return false;
    }

    console.log(`☁️ Saved cloud data for ${username}: ${profileSessions.length} profiles`);
    return data?.success || false;
  } catch (error) {
    console.error('[userStorage] Error saving to cloud:', error);
    return false;
  }
};

export const checkEmailLocked = async (username: string): Promise<{ email: string | null; isLocked: boolean }> => {
  try {
    const { data, error } = await supabase.functions.invoke('user-cloud-storage', {
      body: {
        action: 'get_email',
        username: username.toLowerCase()
      }
    });

    if (error) {
      console.error('[userStorage] Error checking email:', error);
      return { email: null, isLocked: false };
    }

    return {
      email: data?.email || null,
      isLocked: data?.isLocked || false
    };
  } catch (error) {
    console.error('[userStorage] Error checking email:', error);
    return { email: null, isLocked: false };
  }
};

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

// Load profiles from database for a SquareCloud user (legacy support)
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

// Save a single profile to database (legacy support)
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
  // Check if user already exists locally to preserve creativesUnlocked status
  const existingSession = getUserSession();
  const existingUser = existingSession.user?.username === username ? existingSession.user : null;
  
  // Try to load from cloud first
  const cloudData = await loadUserFromCloud(username);
  
  // Load profiles from legacy database as fallback
  const dbProfiles = await loadProfilesFromDatabase(username);
  
  // Use cloud email if available (locked), otherwise use provided email
  const finalEmail = cloudData?.email || email;
  const isEmailLocked = cloudData?.isEmailLocked || false;
  
  // Merge profiles - local profiles + database profiles
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
      email: finalEmail,
      daysRemaining: cloudData?.daysRemaining || daysRemaining,
      loginAt: new Date().toISOString(),
      registeredIGs: mergedIGs,
      creativesUnlocked: existingUser?.creativesUnlocked || false,
      isEmailLocked
    },
    isAuthenticated: true,
    lastSync: new Date().toISOString(),
    cloudData: cloudData ? {
      profileSessions: cloudData.profileSessions,
      archivedProfiles: cloudData.archivedProfiles
    } : undefined
  };
  
  saveUserSession(session);
  
  console.log(`[userStorage] Logged in ${username}: ${mergedIGs.length} registered IGs, email locked: ${isEmailLocked}`);
  
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
  // Clear auth token on logout
  const session = getUserSession();
  if (session.user?.username) {
    sessionStorage.removeItem(`mro_auth_token_${session.user.username.toLowerCase()}`);
  }
  localStorage.removeItem(USER_STORAGE_KEY);
};

export const updateUserEmail = async (email: string): Promise<void> => {
  const session = getUserSession();
  if (session.user && !session.user.isEmailLocked) {
    session.user.email = email;
    session.user.isEmailLocked = true; // Lock email after first set
    saveUserSession(session);
    
    // Save to cloud to persist the email
    await saveUserToCloud(
      session.user.username,
      email,
      session.user.daysRemaining,
      session.cloudData?.profileSessions || [],
      session.cloudData?.archivedProfiles || []
    );
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

// Get cloud data from session
export const getCloudData = () => {
  const session = getUserSession();
  return session.cloudData;
};

// Update cloud data in session
export const updateCloudData = (profileSessions: ProfileSession[], archivedProfiles: ProfileSession[]) => {
  const session = getUserSession();
  session.cloudData = { profileSessions, archivedProfiles };
  saveUserSession(session);
};
