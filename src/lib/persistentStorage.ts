// PERSISTENT STORAGE - Dados salvos no SERVIDOR por usuário
// Cada usuário tem seus dados em JSON no servidor
// Só busca novos dados após 30 dias para economizar requisições

import { MROSession, ProfileSession, InstagramProfile, ProfileAnalysis, GrowthSnapshot } from '@/types/instagram';
import { getSession, saveSession as baseSaveSession, createSnapshot } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';

// 30 days in milliseconds
const REFRESH_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

// Local cache key (backup while server syncs)
const LOCAL_CACHE_KEY = 'mro_server_cache';

export interface PersistentProfileData {
  username: string;
  profile: InstagramProfile;
  analysis: ProfileAnalysis;
  strategies: any[];
  creatives: any[];
  creativesRemaining: number;
  growthHistory: GrowthSnapshot[];
  growthInsights: any[];
  lastFetchDate: string;
  syncedAt: string;
  lastUpdated: string;
}

export interface UserServerData {
  username: string;
  profiles: Record<string, PersistentProfileData>;
  lastFetchDates: Record<string, string>;
  lastSyncedAt: string;
}

// Local cache for faster access (syncs with server)
let localCache: UserServerData | null = null;

// Get local cache (for offline/fast access)
const getLocalCache = (): UserServerData | null => {
  try {
    const stored = localStorage.getItem(LOCAL_CACHE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Save to local cache
const saveLocalCache = (data: UserServerData): void => {
  localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(data));
  localCache = data;
};

// Clear local cache (on logout)
export const clearLocalCache = (): void => {
  localStorage.removeItem(LOCAL_CACHE_KEY);
  localCache = null;
};

// Load user data from server
export const loadUserDataFromServer = async (username: string): Promise<UserServerData | null> => {
  try {
    console.log(`🔄 Carregando dados do servidor para: ${username}`);
    
    const { data, error } = await supabase.functions.invoke('user-data-storage', {
      body: { action: 'load', username }
    });

    if (error) {
      console.error('Erro ao carregar do servidor:', error);
      // Fallback to local cache
      return getLocalCache();
    }

    if (data?.success && data?.data) {
      console.log(`✅ Dados carregados do servidor para: ${username}`);
      saveLocalCache(data.data);
      return data.data;
    }

    // No data on server - check local cache
    const localData = getLocalCache();
    if (localData && localData.username === username) {
      console.log(`📦 Usando cache local para: ${username}`);
      return localData;
    }

    // Initialize new user data
    const newUserData: UserServerData = {
      username,
      profiles: {},
      lastFetchDates: {},
      lastSyncedAt: new Date().toISOString()
    };
    
    return newUserData;
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    return getLocalCache();
  }
};

// Save user data to server
export const saveUserDataToServer = async (data: UserServerData): Promise<boolean> => {
  try {
    // Always save locally first (fast)
    saveLocalCache(data);
    
    console.log(`💾 Salvando dados no servidor para: ${data.username}`);
    
    const { data: response, error } = await supabase.functions.invoke('user-data-storage', {
      body: { action: 'save', username: data.username, data }
    });

    if (error) {
      console.error('Erro ao salvar no servidor:', error);
      return false;
    }

    if (response?.success) {
      console.log(`✅ Dados salvos no servidor para: ${data.username}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
    return false;
  }
};

// Initialize user data on login
export const initializeUserData = async (username: string): Promise<void> => {
  const serverData = await loadUserDataFromServer(username);
  if (serverData) {
    localCache = serverData;
  }
};

// Get current user data (from cache or server)
export const getCurrentUserData = (): UserServerData | null => {
  if (localCache) return localCache;
  return getLocalCache();
};

// Check if profile needs refresh (30 days since last fetch)
export const needsRefresh = (username: string): boolean => {
  const userData = getCurrentUserData();
  if (!userData) return true;
  
  const normalizedUsername = username.toLowerCase();
  const lastFetch = userData.lastFetchDates[normalizedUsername];
  
  if (!lastFetch) return true;
  
  const lastFetchDate = new Date(lastFetch);
  const now = new Date();
  const diffMs = now.getTime() - lastFetchDate.getTime();
  
  return diffMs >= REFRESH_INTERVAL_MS;
};

// Get days until next refresh
export const getDaysUntilRefresh = (username: string): number => {
  const userData = getCurrentUserData();
  if (!userData) return 0;
  
  const normalizedUsername = username.toLowerCase();
  const lastFetch = userData.lastFetchDates[normalizedUsername];
  
  if (!lastFetch) return 0;
  
  const lastFetchDate = new Date(lastFetch);
  const nextRefresh = new Date(lastFetchDate.getTime() + REFRESH_INTERVAL_MS);
  const now = new Date();
  const diffMs = nextRefresh.getTime() - now.getTime();
  
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

// Mark profile as fetched
export const markProfileFetched = (igUsername: string): void => {
  const userData = getCurrentUserData();
  if (userData) {
    userData.lastFetchDates[igUsername.toLowerCase()] = new Date().toISOString();
    saveLocalCache(userData);
    // Don't await - save in background
    saveUserDataToServer(userData);
  }
};

// Check if profile data exists
export const hasPersistedProfileData = (igUsername: string): boolean => {
  const userData = getCurrentUserData();
  if (!userData) return false;
  return !!userData.profiles[igUsername.toLowerCase()];
};

// Get persisted profile data
export const getPersistedProfile = (igUsername: string): PersistentProfileData | null => {
  const userData = getCurrentUserData();
  if (!userData) return null;
  return userData.profiles[igUsername.toLowerCase()] || null;
};

// Save profile data persistently (to cache and server)
export const persistProfileData = async (
  loggedInUsername: string,
  igUsername: string,
  profile: InstagramProfile,
  analysis: ProfileAnalysis,
  existingData?: Partial<PersistentProfileData>
): Promise<void> => {
  const normalizedIG = igUsername.toLowerCase();
  const now = new Date().toISOString();
  
  // Get or create user data
  let userData = getCurrentUserData();
  if (!userData) {
    userData = {
      username: loggedInUsername,
      profiles: {},
      lastFetchDates: {},
      lastSyncedAt: now
    };
  }
  
  // Get existing data to preserve strategies, creatives, etc.
  const existing = userData.profiles[normalizedIG];
  
  userData.profiles[normalizedIG] = {
    username: normalizedIG,
    profile,
    analysis,
    strategies: existingData?.strategies || existing?.strategies || [],
    creatives: existingData?.creatives || existing?.creatives || [],
    creativesRemaining: existingData?.creativesRemaining ?? existing?.creativesRemaining ?? 6,
    growthHistory: existingData?.growthHistory || existing?.growthHistory || [createSnapshot(profile)],
    growthInsights: existingData?.growthInsights || existing?.growthInsights || [],
    lastFetchDate: now,
    syncedAt: existing?.syncedAt || now,
    lastUpdated: now
  };
  
  userData.lastFetchDates[normalizedIG] = now;
  userData.lastSyncedAt = now;
  
  // Save locally first (fast)
  saveLocalCache(userData);
  
  // Save to server in background
  await saveUserDataToServer(userData);
  
  console.log(`💾 Perfil @${normalizedIG} salvo permanentemente no servidor`);
};

// Update profile in persistent storage
export const updatePersistedProfile = async (
  loggedInUsername: string,
  igUsername: string,
  updates: Partial<PersistentProfileData>
): Promise<void> => {
  const normalizedIG = igUsername.toLowerCase();
  const userData = getCurrentUserData();
  
  if (!userData || !userData.profiles[normalizedIG]) {
    console.warn(`Perfil @${igUsername} não encontrado para atualização`);
    return;
  }
  
  const now = new Date().toISOString();
  userData.profiles[normalizedIG] = {
    ...userData.profiles[normalizedIG],
    ...updates,
    lastUpdated: now
  };
  userData.lastSyncedAt = now;
  
  saveLocalCache(userData);
  await saveUserDataToServer(userData);
};

// Sync persistent storage with session storage
export const syncPersistentToSession = (): void => {
  const userData = getCurrentUserData();
  if (!userData) return;
  
  const session = getSession();
  
  Object.values(userData.profiles).forEach(persistedData => {
    // Check if profile exists in session
    const existingInSession = session.profiles.find(
      p => p.profile.username.toLowerCase() === persistedData.username.toLowerCase()
    );
    
    if (!existingInSession) {
      // Add to session from persistent storage
      const profileSession: ProfileSession = {
        id: `profile_${Date.now()}_${persistedData.username}`,
        profile: persistedData.profile,
        analysis: persistedData.analysis,
        strategies: persistedData.strategies,
        creatives: persistedData.creatives,
        creativesRemaining: persistedData.creativesRemaining,
        initialSnapshot: persistedData.growthHistory[0] || createSnapshot(persistedData.profile),
        growthHistory: persistedData.growthHistory,
        growthInsights: persistedData.growthInsights,
        startedAt: persistedData.syncedAt,
        lastUpdated: persistedData.lastUpdated
      };
      
      session.profiles.push(profileSession);
      if (!session.activeProfileId) {
        session.activeProfileId = profileSession.id;
      }
    } else {
      // Update existing session with any missing data from persistent storage
      existingInSession.strategies = existingInSession.strategies.length > 0 
        ? existingInSession.strategies 
        : persistedData.strategies;
      existingInSession.creatives = existingInSession.creatives.length > 0 
        ? existingInSession.creatives 
        : persistedData.creatives;
      existingInSession.creativesRemaining = Math.min(
        existingInSession.creativesRemaining,
        persistedData.creativesRemaining
      );
      existingInSession.growthHistory = existingInSession.growthHistory.length >= persistedData.growthHistory.length
        ? existingInSession.growthHistory
        : persistedData.growthHistory;
      existingInSession.growthInsights = existingInSession.growthInsights.length >= persistedData.growthInsights.length
        ? existingInSession.growthInsights
        : persistedData.growthInsights;
    }
  });
  
  baseSaveSession(session);
  console.log(`🔄 Sessão sincronizada com ${Object.keys(userData.profiles).length} perfis do servidor`);
};

// Sync session storage to persistent (call after any session update)
export const syncSessionToPersistent = async (loggedInUsername: string): Promise<void> => {
  const session = getSession();
  let userData = getCurrentUserData();
  
  if (!userData) {
    userData = {
      username: loggedInUsername,
      profiles: {},
      lastFetchDates: {},
      lastSyncedAt: new Date().toISOString()
    };
  }
  
  session.profiles.forEach(profileSession => {
    const normalizedUsername = profileSession.profile.username.toLowerCase();
    
    userData!.profiles[normalizedUsername] = {
      username: normalizedUsername,
      profile: profileSession.profile,
      analysis: profileSession.analysis,
      strategies: profileSession.strategies,
      creatives: profileSession.creatives,
      creativesRemaining: profileSession.creativesRemaining,
      growthHistory: profileSession.growthHistory,
      growthInsights: profileSession.growthInsights,
      lastFetchDate: profileSession.lastUpdated || new Date().toISOString(),
      syncedAt: profileSession.startedAt,
      lastUpdated: profileSession.lastUpdated
    };
  });
  
  userData.lastSyncedAt = new Date().toISOString();
  
  saveLocalCache(userData);
  await saveUserDataToServer(userData);
};

// Load all persisted data on login
export const loadPersistedDataOnLogin = async (loggedInUsername: string, registeredUsernames: string[]): Promise<void> => {
  console.log(`🔐 Carregando dados do servidor para: ${loggedInUsername}`);
  
  // Load from server
  await initializeUserData(loggedInUsername);
  
  const userData = getCurrentUserData();
  if (!userData) {
    console.log('⚠️ Nenhum dado encontrado no servidor');
    return;
  }
  
  const session = getSession();
  
  registeredUsernames.forEach(username => {
    const normalizedUsername = username.toLowerCase();
    const persistedData = userData.profiles[normalizedUsername];
    
    if (persistedData) {
      // Check if already in session
      const existsInSession = session.profiles.some(
        p => p.profile.username.toLowerCase() === normalizedUsername
      );
      
      if (!existsInSession) {
        const profileSession: ProfileSession = {
          id: `profile_${Date.now()}_${normalizedUsername}`,
          profile: persistedData.profile,
          analysis: persistedData.analysis,
          strategies: persistedData.strategies,
          creatives: persistedData.creatives,
          creativesRemaining: persistedData.creativesRemaining,
          initialSnapshot: persistedData.growthHistory[0] || createSnapshot(persistedData.profile),
          growthHistory: persistedData.growthHistory,
          growthInsights: persistedData.growthInsights,
          startedAt: persistedData.syncedAt,
          lastUpdated: persistedData.lastUpdated
        };
        
        session.profiles.push(profileSession);
        console.log(`✅ Perfil @${normalizedUsername} restaurado do servidor`);
      }
    }
  });
  
  if (session.profiles.length > 0 && !session.activeProfileId) {
    session.activeProfileId = session.profiles[0].id;
  }
  
  baseSaveSession(session);
};

// Check if data needs to be fetched or can use cached
export const shouldFetchProfile = (igUsername: string): { shouldFetch: boolean; reason: string } => {
  const normalizedUsername = igUsername.toLowerCase();
  const hasData = hasPersistedProfileData(normalizedUsername);
  const needsUpdate = needsRefresh(normalizedUsername);
  
  if (!hasData) {
    return { shouldFetch: true, reason: 'Nenhum dado armazenado' };
  }
  
  if (needsUpdate) {
    const daysUntil = getDaysUntilRefresh(normalizedUsername);
    return { shouldFetch: true, reason: `Dados desatualizados (próxima atualização em ${daysUntil} dias)` };
  }
  
  const daysUntil = getDaysUntilRefresh(normalizedUsername);
  return { shouldFetch: false, reason: `Usando dados do servidor. Próxima atualização em ${daysUntil} dias.` };
};

// Get profile summary for admin/debug
export const getStorageSummary = (): { 
  totalProfiles: number; 
  profiles: Array<{ username: string; lastFetch: string; daysUntilRefresh: number }>;
} => {
  const userData = getCurrentUserData();
  if (!userData) {
    return { totalProfiles: 0, profiles: [] };
  }
  
  const profileSummary = Object.keys(userData.profiles).map(username => ({
    username,
    lastFetch: userData.lastFetchDates[username] || 'Nunca',
    daysUntilRefresh: getDaysUntilRefresh(username)
  }));
  
  return {
    totalProfiles: profileSummary.length,
    profiles: profileSummary
  };
};
