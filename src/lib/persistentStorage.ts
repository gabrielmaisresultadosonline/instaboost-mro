// PERSISTENT STORAGE - Dados NUNCA se perdem após serem carregados
// Só busca novos dados após 30 dias para economizar requisições

import { MROSession, ProfileSession, InstagramProfile, ProfileAnalysis } from '@/types/instagram';
import { getSession, saveSession as baseSaveSession, addProfile as baseAddProfile, createSnapshot } from '@/lib/storage';
import { getSyncData, saveSyncData, SyncedInstagramProfile, updateProfile as updateSyncProfile } from '@/lib/syncStorage';

// Keys for persistent storage
const PERSISTENT_PROFILES_KEY = 'mro_persistent_profiles';
const LAST_FETCH_DATES_KEY = 'mro_last_fetch_dates';

// 30 days in milliseconds
const REFRESH_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

interface PersistentProfileData {
  username: string;
  profile: InstagramProfile;
  analysis: ProfileAnalysis;
  strategies: any[];
  creatives: any[];
  creativesRemaining: number;
  growthHistory: any[];
  growthInsights: any[];
  lastFetchDate: string;
  syncedAt: string;
  lastUpdated: string;
}

interface LastFetchDates {
  [username: string]: string;
}

// Get all persistently stored profiles
export const getPersistentProfiles = (): Record<string, PersistentProfileData> => {
  try {
    const stored = localStorage.getItem(PERSISTENT_PROFILES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save persistent profiles
export const savePersistentProfiles = (profiles: Record<string, PersistentProfileData>): void => {
  localStorage.setItem(PERSISTENT_PROFILES_KEY, JSON.stringify(profiles));
};

// Get last fetch dates
export const getLastFetchDates = (): LastFetchDates => {
  try {
    const stored = localStorage.getItem(LAST_FETCH_DATES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save last fetch dates
export const saveLastFetchDates = (dates: LastFetchDates): void => {
  localStorage.setItem(LAST_FETCH_DATES_KEY, JSON.stringify(dates));
};

// Check if profile needs refresh (30 days since last fetch)
export const needsRefresh = (username: string): boolean => {
  const dates = getLastFetchDates();
  const normalizedUsername = username.toLowerCase();
  const lastFetch = dates[normalizedUsername];
  
  if (!lastFetch) return true;
  
  const lastFetchDate = new Date(lastFetch);
  const now = new Date();
  const diffMs = now.getTime() - lastFetchDate.getTime();
  
  return diffMs >= REFRESH_INTERVAL_MS;
};

// Get days until next refresh
export const getDaysUntilRefresh = (username: string): number => {
  const dates = getLastFetchDates();
  const normalizedUsername = username.toLowerCase();
  const lastFetch = dates[normalizedUsername];
  
  if (!lastFetch) return 0;
  
  const lastFetchDate = new Date(lastFetch);
  const nextRefresh = new Date(lastFetchDate.getTime() + REFRESH_INTERVAL_MS);
  const now = new Date();
  const diffMs = nextRefresh.getTime() - now.getTime();
  
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

// Mark profile as fetched today
export const markProfileFetched = (username: string): void => {
  const dates = getLastFetchDates();
  dates[username.toLowerCase()] = new Date().toISOString();
  saveLastFetchDates(dates);
};

// Check if profile data exists in persistent storage
export const hasPersistedProfileData = (username: string): boolean => {
  const profiles = getPersistentProfiles();
  return !!profiles[username.toLowerCase()];
};

// Get persisted profile data
export const getPersistedProfile = (username: string): PersistentProfileData | null => {
  const profiles = getPersistentProfiles();
  return profiles[username.toLowerCase()] || null;
};

// Save profile data persistently
export const persistProfileData = (
  username: string,
  profile: InstagramProfile,
  analysis: ProfileAnalysis,
  existingData?: Partial<PersistentProfileData>
): void => {
  const profiles = getPersistentProfiles();
  const normalizedUsername = username.toLowerCase();
  const now = new Date().toISOString();
  
  // Get existing data to preserve strategies, creatives, etc.
  const existing = profiles[normalizedUsername];
  
  profiles[normalizedUsername] = {
    username: normalizedUsername,
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
  
  savePersistentProfiles(profiles);
  markProfileFetched(normalizedUsername);
  
  console.log(`💾 Perfil @${normalizedUsername} salvo permanentemente`);
};

// Update only profile metrics (used for growth tracking)
export const updatePersistedProfileMetrics = (
  username: string,
  profile: InstagramProfile
): void => {
  const profiles = getPersistentProfiles();
  const normalizedUsername = username.toLowerCase();
  const existing = profiles[normalizedUsername];
  
  if (existing) {
    const now = new Date().toISOString();
    
    // Add to growth history if followers changed
    if (existing.profile.followers !== profile.followers) {
      existing.growthHistory.push(createSnapshot(profile));
    }
    
    existing.profile = profile;
    existing.lastFetchDate = now;
    existing.lastUpdated = now;
    
    savePersistentProfiles(profiles);
    markProfileFetched(normalizedUsername);
    
    console.log(`📊 Métricas de @${normalizedUsername} atualizadas`);
  }
};

// Sync persistent storage with session storage
export const syncPersistentToSession = (): void => {
  const persistentProfiles = getPersistentProfiles();
  const session = getSession();
  
  Object.values(persistentProfiles).forEach(persistedData => {
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
  console.log(`🔄 Sessão sincronizada com ${Object.keys(persistentProfiles).length} perfis persistentes`);
};

// Sync session storage to persistent (call after any session update)
export const syncSessionToPersistent = (): void => {
  const session = getSession();
  const persistentProfiles = getPersistentProfiles();
  
  session.profiles.forEach(profileSession => {
    const normalizedUsername = profileSession.profile.username.toLowerCase();
    
    persistentProfiles[normalizedUsername] = {
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
  
  savePersistentProfiles(persistentProfiles);
};

// Load all persisted data on login
export const loadPersistedDataOnLogin = (registeredUsernames: string[]): void => {
  const persistentProfiles = getPersistentProfiles();
  const session = getSession();
  
  console.log(`🔐 Carregando dados persistentes para ${registeredUsernames.length} perfis...`);
  
  registeredUsernames.forEach(username => {
    const normalizedUsername = username.toLowerCase();
    const persistedData = persistentProfiles[normalizedUsername];
    
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
        console.log(`✅ Perfil @${normalizedUsername} restaurado do armazenamento persistente`);
      }
    }
  });
  
  if (session.profiles.length > 0 && !session.activeProfileId) {
    session.activeProfileId = session.profiles[0].id;
  }
  
  baseSaveSession(session);
};

// Check if data needs to be fetched or can use cached
export const shouldFetchProfile = (username: string): { shouldFetch: boolean; reason: string } => {
  const normalizedUsername = username.toLowerCase();
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
  return { shouldFetch: false, reason: `Usando dados em cache. Próxima atualização em ${daysUntil} dias.` };
};

// Get profile summary for admin/debug
export const getStorageSummary = (): { 
  totalProfiles: number; 
  profiles: Array<{ username: string; lastFetch: string; daysUntilRefresh: number }>;
} => {
  const profiles = getPersistentProfiles();
  const dates = getLastFetchDates();
  
  const profileSummary = Object.keys(profiles).map(username => ({
    username,
    lastFetch: dates[username] || 'Nunca',
    daysUntilRefresh: getDaysUntilRefresh(username)
  }));
  
  return {
    totalProfiles: profileSummary.length,
    profiles: profileSummary
  };
};