// Sync storage for SquareCloud users and Instagram profiles

export interface SquareCloudUser {
  ID: string;
  numero: string;
  dataDeExpiracao: number | string;
  blackList: boolean;
  igInstagram: string[];
}

export interface SyncedInstagramProfile {
  username: string;
  followers: number;
  following: number;
  posts: number;
  profilePicUrl: string;
  fullName: string;
  bio: string;
  ownerUserId: string;
  ownerUserName: string;
  syncedAt: string;
  lastUpdated: string;
  isConnectedToDashboard: boolean;
  growthHistory: {
    date: string;
    followers: number;
  }[];
  // Admin control fields
  isBlocked?: boolean;
  blockedAt?: string;
  blockedReason?: string;
  lastStrategyReset?: string;
  creativesUsed?: number;
  creativesLimit?: number;
}

export interface SyncData {
  lastSyncDate: string | null;
  lastFullSyncDate: string | null;
  lastAutoSyncDate: string | null;
  isSyncComplete: boolean;
  users: SquareCloudUser[];
  profiles: SyncedInstagramProfile[];
  syncQueue: string[]; // usernames waiting to be synced
  currentlySyncing: string | null;
  isPaused: boolean;
  isStopped: boolean;
  totalProfilesCount: number;
}

const SYNC_STORAGE_KEY = 'mro_sync_data';

const DEFAULT_SYNC_DATA: SyncData = {
  lastSyncDate: null,
  lastFullSyncDate: null,
  lastAutoSyncDate: null,
  isSyncComplete: false,
  users: [],
  profiles: [],
  syncQueue: [],
  currentlySyncing: null,
  isPaused: false,
  isStopped: false,
  totalProfilesCount: 0
};

export const getSyncData = (): SyncData => {
  try {
    const data = localStorage.getItem(SYNC_STORAGE_KEY);
    if (data) {
      return { ...DEFAULT_SYNC_DATA, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('Error reading sync data:', e);
  }
  return DEFAULT_SYNC_DATA;
};

export const saveSyncData = (data: SyncData): void => {
  localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(data));
};

export const shouldAutoSync = (): boolean => {
  const data = getSyncData();
  if (!data.lastAutoSyncDate) return true;
  
  const lastSync = new Date(data.lastAutoSyncDate);
  const now = new Date();
  
  // Check if it's a new day (after midnight)
  return lastSync.toDateString() !== now.toDateString();
};

export const wasProfileSyncedToday = (username: string): boolean => {
  const data = getSyncData();
  const profile = data.profiles.find(p => p.username.toLowerCase() === username.toLowerCase());
  
  if (!profile) return false;
  
  const lastUpdated = new Date(profile.lastUpdated);
  const today = new Date();
  
  return lastUpdated.toDateString() === today.toDateString();
};

// Check if profile exists in dashboard session
export const isProfileInDashboard = (username: string): boolean => {
  try {
    const session = localStorage.getItem('mro_session');
    if (!session) return false;
    
    const parsed = JSON.parse(session);
    return parsed.profiles?.some((p: any) => 
      p.profile?.username?.toLowerCase() === username.toLowerCase()
    ) || false;
  } catch {
    return false;
  }
};

// Check if profile already exists in sync data
export const isProfileAlreadySynced = (username: string): boolean => {
  const data = getSyncData();
  return data.profiles.some(p => p.username.toLowerCase() === username.toLowerCase());
};

// Get all profiles (merged from dashboard + synced, no duplicates)
export const getAllMergedProfiles = (): SyncedInstagramProfile[] => {
  const syncData = getSyncData();
  
  // Start with synced profiles
  const mergedProfiles: SyncedInstagramProfile[] = syncData.profiles.map(p => ({ ...p }));
  
  console.log(`getAllMergedProfiles: ${syncData.profiles.length} perfis sincronizados encontrados`);
  
  // Get dashboard profiles
  try {
    const session = localStorage.getItem('mro_session');
    if (session) {
      const parsed = JSON.parse(session);
      const dashboardProfiles = parsed.profiles || [];
      
      console.log(`getAllMergedProfiles: ${dashboardProfiles.length} perfis do dashboard encontrados`);
      
      dashboardProfiles.forEach((dp: any) => {
        const username = dp.profile?.username?.toLowerCase();
        if (!username) return;
        
        // Check if already in merged list
        const existingIndex = mergedProfiles.findIndex(
          p => p.username.toLowerCase() === username
        );
        
        if (existingIndex >= 0) {
          // Update existing with dashboard connection status
          mergedProfiles[existingIndex].isConnectedToDashboard = true;
          // Update with latest data from dashboard
          mergedProfiles[existingIndex].followers = dp.profile.followers || mergedProfiles[existingIndex].followers;
          mergedProfiles[existingIndex].following = dp.profile.following || mergedProfiles[existingIndex].following;
          mergedProfiles[existingIndex].posts = dp.profile.posts || mergedProfiles[existingIndex].posts;
          mergedProfiles[existingIndex].profilePicUrl = dp.profile.profilePicUrl || mergedProfiles[existingIndex].profilePicUrl;
          mergedProfiles[existingIndex].fullName = dp.profile.fullName || mergedProfiles[existingIndex].fullName;
          mergedProfiles[existingIndex].bio = dp.profile.bio || mergedProfiles[existingIndex].bio;
        } else {
          // Add new from dashboard
          mergedProfiles.push({
            username: dp.profile.username,
            followers: dp.profile.followers || 0,
            following: dp.profile.following || 0,
            posts: dp.profile.posts || 0,
            profilePicUrl: dp.profile.profilePicUrl || '',
            fullName: dp.profile.fullName || '',
            bio: dp.profile.bio || '',
            ownerUserId: 'dashboard',
            ownerUserName: 'Dashboard',
            syncedAt: dp.startedAt || new Date().toISOString(),
            lastUpdated: dp.lastUpdated || new Date().toISOString(),
            isConnectedToDashboard: true,
            growthHistory: dp.growthHistory || []
          });
        }
      });
    }
  } catch (e) {
    console.error('Error merging dashboard profiles:', e);
  }
  
  console.log(`getAllMergedProfiles: Total ${mergedProfiles.length} perfis mesclados`);
  
  return mergedProfiles;
};

export const updateProfile = (profile: SyncedInstagramProfile): void => {
  try {
    const data = getSyncData();
    const existingIndex = data.profiles.findIndex(
      p => p.username.toLowerCase() === profile.username.toLowerCase()
    );
    
    if (existingIndex >= 0) {
      // Update existing
      const existing = data.profiles[existingIndex];
      
      // Add to growth history if followers changed
      if (existing.followers !== profile.followers) {
        profile.growthHistory = [
          ...existing.growthHistory,
          { date: new Date().toISOString(), followers: profile.followers }
        ];
      } else {
        profile.growthHistory = existing.growthHistory;
      }
      
      // Manter dados existentes que não vieram na atualização
      profile.syncedAt = existing.syncedAt || profile.syncedAt;
      
      data.profiles[existingIndex] = profile;
    } else {
      // Add new profile
      profile.growthHistory = [
        { date: new Date().toISOString(), followers: profile.followers }
      ];
      data.profiles.push(profile);
    }
    
    // SALVAR IMEDIATAMENTE - Garantir persistência
    saveSyncData(data);
    
    // Verificar se salvou corretamente
    const verification = getSyncData();
    const saved = verification.profiles.find(
      p => p.username.toLowerCase() === profile.username.toLowerCase()
    );
    
    if (!saved) {
      console.error(`❌ ERRO: Perfil @${profile.username} não foi salvo!`);
      // Tentar salvar novamente
      const retryData = getSyncData();
      retryData.profiles.push(profile);
      saveSyncData(retryData);
    } else {
      console.log(`💾 Perfil @${profile.username} salvo com sucesso (${saved.followers} seguidores)`);
    }
  } catch (error) {
    console.error('Erro ao salvar perfil:', error);
  }
};

export const getTopGrowingProfiles = (limit: number = 5): SyncedInstagramProfile[] => {
  const allProfiles = getAllMergedProfiles();
  
  return allProfiles
    .filter(p => p.growthHistory.length >= 2)
    .map(p => {
      const first = p.growthHistory[0].followers;
      const last = p.growthHistory[p.growthHistory.length - 1].followers;
      return { ...p, growth: last - first };
    })
    .sort((a, b) => (b as any).growth - (a as any).growth)
    .slice(0, limit);
};

export const markSyncComplete = (): void => {
  const data = getSyncData();
  data.isSyncComplete = true;
  data.lastFullSyncDate = new Date().toISOString();
  data.lastAutoSyncDate = new Date().toISOString();
  data.syncQueue = [];
  data.currentlySyncing = null;
  data.isPaused = false;
  data.isStopped = false;
  saveSyncData(data);
};

export const stopSync = (): void => {
  const data = getSyncData();
  data.isStopped = true;
  data.isPaused = false;
  data.currentlySyncing = null;
  data.lastSyncDate = new Date().toISOString();
  saveSyncData(data);
};

export const pauseSync = (): void => {
  const data = getSyncData();
  data.isPaused = true;
  saveSyncData(data);
};

export const resumeSync = (): void => {
  const data = getSyncData();
  data.isPaused = false;
  data.isStopped = false;
  saveSyncData(data);
};

// Admin profile management functions
export const blockProfile = (username: string, reason?: string): void => {
  const data = getSyncData();
  const profile = data.profiles.find(p => p.username.toLowerCase() === username.toLowerCase());
  if (profile) {
    profile.isBlocked = true;
    profile.blockedAt = new Date().toISOString();
    profile.blockedReason = reason || 'Bloqueado pelo administrador';
    saveSyncData(data);
  }
};

export const unblockProfile = (username: string): void => {
  const data = getSyncData();
  const profile = data.profiles.find(p => p.username.toLowerCase() === username.toLowerCase());
  if (profile) {
    profile.isBlocked = false;
    profile.blockedAt = undefined;
    profile.blockedReason = undefined;
    saveSyncData(data);
  }
};

export const removeProfileFromSync = (username: string): void => {
  const data = getSyncData();
  data.profiles = data.profiles.filter(p => p.username.toLowerCase() !== username.toLowerCase());
  saveSyncData(data);
};

export const resetProfileStrategy = (username: string): void => {
  const data = getSyncData();
  const profile = data.profiles.find(p => p.username.toLowerCase() === username.toLowerCase());
  if (profile) {
    profile.lastStrategyReset = new Date().toISOString();
    saveSyncData(data);
  }
};

export const getStrategyDaysRemaining = (profile: SyncedInstagramProfile): number => {
  // Check last strategy reset or syncedAt date
  const lastReset = profile.lastStrategyReset || profile.syncedAt;
  if (!lastReset) return 0;
  
  const lastDate = new Date(lastReset);
  const nextMonth = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 1);
  const now = new Date();
  
  const diff = nextMonth.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const canGenerateStrategy = (profile: SyncedInstagramProfile): boolean => {
  return getStrategyDaysRemaining(profile) === 0;
};

export const getCreativesInfo = (profile: SyncedInstagramProfile): { used: number; available: number; limit: number } => {
  const limit = profile.creativesLimit || 6;
  const used = profile.creativesUsed || 0;
  return {
    used,
    available: Math.max(0, limit - used),
    limit
  };
};

export const updateCreativesUsed = (username: string, count: number): void => {
  const data = getSyncData();
  const profile = data.profiles.find(p => p.username.toLowerCase() === username.toLowerCase());
  if (profile) {
    profile.creativesUsed = count;
    saveSyncData(data);
  }
};
