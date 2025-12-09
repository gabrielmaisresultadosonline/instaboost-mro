import { 
  MROSession, 
  InstagramProfile, 
  ProfileAnalysis, 
  Strategy, 
  Creative,
  ProfileSession,
  GrowthSnapshot,
  GrowthInsight
} from '@/types/instagram';

const STORAGE_KEY = 'mro_session';
const ARCHIVE_KEY = 'mro_archived_profiles';

export const getSession = (): MROSession => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    // Migrate old session format to new multi-profile format
    if (parsed.profile && !parsed.profiles) {
      return migrateOldSession(parsed);
    }
    return parsed;
  }
  return createEmptySession();
};

const migrateOldSession = (oldSession: any): MROSession => {
  if (!oldSession.profile) {
    return createEmptySession();
  }
  
  const profileId = `profile_${Date.now()}`;
  const now = new Date().toISOString();
  
  const profileSession: ProfileSession = {
    id: profileId,
    profile: oldSession.profile,
    analysis: oldSession.analysis,
    strategies: oldSession.strategies || [],
    creatives: oldSession.creatives || [],
    creativesRemaining: oldSession.creativesRemaining ?? 6,
    initialSnapshot: createSnapshot(oldSession.profile),
    growthHistory: [createSnapshot(oldSession.profile)],
    growthInsights: [],
    startedAt: oldSession.lastUpdated || now,
    lastUpdated: now,
  };

  return {
    profiles: [profileSession],
    activeProfileId: profileId,
    lastUpdated: now,
  };
};

export const createEmptySession = (): MROSession => ({
  profiles: [],
  activeProfileId: null,
  lastUpdated: new Date().toISOString(),
});

export const createSnapshot = (profile: InstagramProfile): GrowthSnapshot => ({
  date: new Date().toISOString(),
  followers: profile.followers,
  following: profile.following,
  posts: profile.posts,
  avgLikes: profile.avgLikes,
  avgComments: profile.avgComments,
  engagement: profile.engagement,
});

export const saveSession = (session: MROSession): void => {
  session.lastUpdated = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export const getActiveProfile = (): ProfileSession | null => {
  const session = getSession();
  if (!session.activeProfileId) return null;
  return session.profiles.find(p => p.id === session.activeProfileId) || null;
};

export const addProfile = (profile: InstagramProfile, analysis: ProfileAnalysis): ProfileSession => {
  const session = getSession();
  
  // Check if this profile was previously archived (removed then re-synced)
  const archivedProfile = getArchivedByUsername(profile.username);
  
  if (archivedProfile) {
    // Restore from archive - keeps strategies, creatives, credits used, etc.
    const restoredProfile: ProfileSession = {
      ...archivedProfile,
      id: `profile_${Date.now()}`, // New ID
      profile, // Update with fresh profile data
      analysis, // Update with fresh analysis
      lastUpdated: new Date().toISOString(),
    };
    
    // Add new growth snapshot with current data
    restoredProfile.growthHistory.push(createSnapshot(profile));
    
    session.profiles.push(restoredProfile);
    session.activeProfileId = restoredProfile.id;
    saveSession(session);
    
    // Remove from archive since it's now active again
    removeFromArchive(profile.username);
    
    return restoredProfile;
  }
  
  // New profile - create fresh session
  const profileId = `profile_${Date.now()}`;
  const now = new Date().toISOString();
  
  const newProfileSession: ProfileSession = {
    id: profileId,
    profile,
    analysis,
    strategies: [],
    creatives: [],
    creativesRemaining: 6,
    initialSnapshot: createSnapshot(profile),
    growthHistory: [createSnapshot(profile)],
    growthInsights: [],
    startedAt: now,
    lastUpdated: now,
  };

  session.profiles.push(newProfileSession);
  session.activeProfileId = profileId;
  saveSession(session);
  
  return newProfileSession;
};

export const setActiveProfile = (profileId: string): void => {
  const session = getSession();
  if (session.profiles.find(p => p.id === profileId)) {
    session.activeProfileId = profileId;
    saveSession(session);
  }
};

// Archive management - keeps removed profiles for restoration
export const getArchivedProfiles = (): ProfileSession[] => {
  const stored = localStorage.getItem(ARCHIVE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
};

export const saveArchivedProfiles = (archived: ProfileSession[]): void => {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archived));
};

export const archiveProfile = (profileSession: ProfileSession): void => {
  const archived = getArchivedProfiles();
  // Remove any existing archive for this username
  const username = profileSession.profile.username.toLowerCase();
  const filtered = archived.filter(p => p.profile.username.toLowerCase() !== username);
  filtered.push(profileSession);
  saveArchivedProfiles(filtered);
};

export const getArchivedByUsername = (username: string): ProfileSession | null => {
  const archived = getArchivedProfiles();
  const normalizedUsername = username.toLowerCase();
  return archived.find(p => p.profile.username.toLowerCase() === normalizedUsername) || null;
};

export const removeFromArchive = (username: string): void => {
  const archived = getArchivedProfiles();
  const normalizedUsername = username.toLowerCase();
  const filtered = archived.filter(p => p.profile.username.toLowerCase() !== normalizedUsername);
  saveArchivedProfiles(filtered);
};

// Restore a synced profile from archive (without full profile/analysis data)
export const restoreProfileFromArchive = (username: string): ProfileSession | null => {
  const archivedProfile = getArchivedByUsername(username);
  if (!archivedProfile) return null;
  
  const session = getSession();
  
  // Check if already active
  const existingProfile = session.profiles.find(
    p => p.profile.username.toLowerCase() === username.toLowerCase()
  );
  if (existingProfile) {
    session.activeProfileId = existingProfile.id;
    saveSession(session);
    return existingProfile;
  }
  
  // Restore from archive
  const restoredProfile: ProfileSession = {
    ...archivedProfile,
    id: `profile_${Date.now()}`,
    lastUpdated: new Date().toISOString(),
  };
  
  session.profiles.push(restoredProfile);
  session.activeProfileId = restoredProfile.id;
  saveSession(session);
  
  // Remove from archive
  removeFromArchive(username);
  
  return restoredProfile;
};

export const removeProfile = (profileId: string): void => {
  const session = getSession();
  const profileToRemove = session.profiles.find(p => p.id === profileId);
  
  // Archive the profile before removing (keeps strategies, creatives, etc.)
  if (profileToRemove) {
    archiveProfile(profileToRemove);
  }
  
  session.profiles = session.profiles.filter(p => p.id !== profileId);
  if (session.activeProfileId === profileId) {
    session.activeProfileId = session.profiles[0]?.id || null;
  }
  saveSession(session);
};

export const updateProfile = (profile: InstagramProfile): void => {
  const session = getSession();
  const activeProfile = session.profiles.find(p => p.id === session.activeProfileId);
  if (activeProfile) {
    activeProfile.profile = profile;
    activeProfile.lastUpdated = new Date().toISOString();
    saveSession(session);
  }
};

export const updateAnalysis = (analysis: ProfileAnalysis): void => {
  const session = getSession();
  const activeProfile = session.profiles.find(p => p.id === session.activeProfileId);
  if (activeProfile) {
    activeProfile.analysis = analysis;
    activeProfile.lastUpdated = new Date().toISOString();
    saveSession(session);
  }
};

export const addStrategy = (strategy: Strategy): void => {
  const session = getSession();
  const activeProfile = session.profiles.find(p => p.id === session.activeProfileId);
  if (activeProfile) {
    activeProfile.strategies.push(strategy);
    activeProfile.lastStrategyGeneratedAt = new Date().toISOString();
    activeProfile.lastUpdated = new Date().toISOString();
    saveSession(session);
  }
};

export const getStrategyDaysRemaining = (profileId?: string): number => {
  const session = getSession();
  const profile = profileId 
    ? session.profiles.find(p => p.id === profileId)
    : session.profiles.find(p => p.id === session.activeProfileId);
  
  if (!profile?.lastStrategyGeneratedAt) return 0; // Can generate now
  
  const lastGenerated = new Date(profile.lastStrategyGeneratedAt);
  const nextAvailable = new Date(lastGenerated);
  nextAvailable.setDate(nextAvailable.getDate() + 30);
  
  const now = new Date();
  const diffTime = nextAvailable.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
};

export const canGenerateStrategy = (profileId?: string): boolean => {
  return getStrategyDaysRemaining(profileId) === 0;
};

export const resetProfileStrategy = (profileId: string): void => {
  const session = getSession();
  const profile = session.profiles.find(p => p.id === profileId);
  if (profile) {
    profile.lastStrategyGeneratedAt = undefined;
    profile.lastUpdated = new Date().toISOString();
    saveSession(session);
  }
};

export const addCreative = (creative: Creative): void => {
  const session = getSession();
  const activeProfile = session.profiles.find(p => p.id === session.activeProfileId);
  if (activeProfile && activeProfile.creativesRemaining > 0) {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    creative.expiresAt = expiresAt.toISOString();
    
    activeProfile.creatives.push(creative);
    activeProfile.creativesRemaining--;
    activeProfile.lastUpdated = new Date().toISOString();
    saveSession(session);
  }
};

export const cleanExpiredCreatives = (): void => {
  const session = getSession();
  const now = new Date();
  
  session.profiles.forEach(profile => {
    const validCreatives = profile.creatives.filter(c => {
      if (!c.expiresAt) return true;
      return new Date(c.expiresAt) > now;
    });
    
    const expiredCount = profile.creatives.length - validCreatives.length;
    profile.creatives = validCreatives;
    profile.creativesRemaining = Math.min(6, profile.creativesRemaining + expiredCount);
  });
  
  saveSession(session);
};

export const markCreativeAsDownloaded = (creativeId: string): void => {
  const session = getSession();
  session.profiles.forEach(profile => {
    const creative = profile.creatives.find(c => c.id === creativeId);
    if (creative) {
      creative.downloaded = true;
    }
  });
  saveSession(session);
};

export const addGrowthSnapshot = (profileId: string, profile: InstagramProfile): void => {
  const session = getSession();
  const profileSession = session.profiles.find(p => p.id === profileId);
  if (profileSession) {
    const snapshot = createSnapshot(profile);
    profileSession.growthHistory.push(snapshot);
    profileSession.profile = profile;
    profileSession.lastUpdated = new Date().toISOString();
    saveSession(session);
  }
};

export const addGrowthInsight = (profileId: string, insight: GrowthInsight): void => {
  const session = getSession();
  const profileSession = session.profiles.find(p => p.id === profileId);
  if (profileSession) {
    profileSession.growthInsights.push(insight);
    profileSession.lastUpdated = new Date().toISOString();
    saveSession(session);
  }
};

export const resetSession = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const hasExistingSession = (): boolean => {
  const session = getSession();
  return session.profiles.length > 0;
};

// Legacy compatibility helpers
export const getLegacySessionFormat = (session: MROSession): any => {
  const activeProfile = session.profiles.find(p => p.id === session.activeProfileId);
  if (!activeProfile) {
    return {
      profile: null,
      analysis: null,
      strategies: [],
      creatives: [],
      creativesRemaining: 6,
      lastUpdated: session.lastUpdated,
    };
  }
  return {
    profile: activeProfile.profile,
    analysis: activeProfile.analysis,
    strategies: activeProfile.strategies,
    creatives: activeProfile.creatives,
    creativesRemaining: activeProfile.creativesRemaining,
    lastUpdated: activeProfile.lastUpdated,
  };
};
