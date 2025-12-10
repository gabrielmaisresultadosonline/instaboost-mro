// User session storage (local JSON + Supabase cloud persistence)
import { MROUser, UserSession, RegisteredIG, normalizeInstagramUsername } from '@/types/user';
import { supabase } from '@/integrations/supabase/client';
import { ProfileSession } from '@/types/instagram';

const USER_STORAGE_KEY = 'mro_user_session';
const CACHE_VERSION_KEY = 'mro_cache_version';
const CURRENT_CACHE_VERSION = '3.0'; // v3.0 - Complete data isolation fix

// Clear ALL user-related data from localStorage
export const clearAllUserData = (): void => {
  console.log('[userStorage] Clearing ALL user-related data...');
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem('mro_session');
  localStorage.removeItem('mro_archived_profiles');
  localStorage.removeItem('mro_server_cache');
  localStorage.removeItem('mro_sync_data'); // Admin sync data
  // Clear session storage too
  sessionStorage.clear();
};

// Check and clear stale cache on load
const validateCache = (): void => {
  try {
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    if (storedVersion !== CURRENT_CACHE_VERSION) {
      console.log(`[userStorage] Cache version mismatch (${storedVersion} vs ${CURRENT_CACHE_VERSION}), clearing ALL stale data...`);
      clearAllUserData();
      localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
    }
  } catch (e) {
    console.error('[userStorage] Error validating cache:', e);
  }
};

// Run cache validation on module load
validateCache();

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
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate session structure - if corrupted, return empty session
      if (parsed.user && typeof parsed.user.username !== 'string') {
        console.warn('[userStorage] Corrupted session detected, returning empty session');
        localStorage.removeItem(USER_STORAGE_KEY);
        return {
          user: null,
          isAuthenticated: false,
          lastSync: new Date().toISOString()
        };
      }
      return parsed;
    }
  } catch (e) {
    console.error('[userStorage] Error parsing session, clearing:', e);
    localStorage.removeItem(USER_STORAGE_KEY);
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
  const normalizedUsername = username.toLowerCase();
  
  // Get existing session to check if same user
  const existingSession = getUserSession();
  const existingUsername = existingSession.user?.username?.toLowerCase();
  const isSameUser = existingUsername === normalizedUsername;
  
  // CRITICAL: ALWAYS clear ALL data if different user OR no existing user
  // This prevents ANY data mixing between users
  if (!isSameUser) {
    console.log(`[userStorage] 🔐 Different/new user login (${existingUsername || 'none'} -> ${normalizedUsername}), clearing ALL data...`);
    clearAllUserData();
  } else {
    console.log(`[userStorage] Same user re-login: ${normalizedUsername}`);
  }
  
  // Preserve creativesUnlocked ONLY if same user
  const creativesUnlocked = isSameUser ? existingSession.user?.creativesUnlocked : false;
  
  // Try to load from cloud first - this is the ONLY source of truth for this user
  console.log(`[userStorage] ☁️ Loading cloud data for ${normalizedUsername}...`);
  const cloudData = await loadUserFromCloud(normalizedUsername);
  
  // Load profiles from legacy database as fallback
  const dbProfiles = await loadProfilesFromDatabase(normalizedUsername);
  
  // Use cloud email if available (locked), otherwise use provided email
  const finalEmail = cloudData?.email || email;
  const isEmailLocked = cloudData?.isEmailLocked || false;
  
  // Only use database profiles (cloud-linked) - no local merging for new users
  const mergedIGs: RegisteredIG[] = [...dbProfiles];
  
  // Only add existing local IGs if same user (to preserve local changes during same session)
  if (isSameUser && existingSession.user?.registeredIGs) {
    existingSession.user.registeredIGs.forEach(localIG => {
      if (!mergedIGs.find(ig => ig.username === localIG.username)) {
        mergedIGs.push(localIG);
      }
    });
  }
  
  const session: UserSession = {
    user: {
      username: normalizedUsername,
      email: finalEmail,
      daysRemaining: cloudData?.daysRemaining || daysRemaining,
      loginAt: new Date().toISOString(),
      registeredIGs: mergedIGs,
      creativesUnlocked: creativesUnlocked || false,
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
  
  const cloudProfileCount = cloudData?.profileSessions?.length || 0;
  console.log(`[userStorage] ✅ Logged in ${normalizedUsername}: ${cloudProfileCount} cloud profiles, ${mergedIGs.length} registered IGs`);
  
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
  console.log('[userStorage] 🚪 Logging out - clearing ALL user data...');
  // CRITICAL: Clear ALL user-related data to prevent data mixing between users
  clearAllUserData();
  console.log('[userStorage] ✅ Logged out and cleared all session data');
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
