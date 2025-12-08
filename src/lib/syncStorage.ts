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
}

export interface SyncData {
  lastSyncDate: string | null;
  lastFullSyncDate: string | null;
  users: SquareCloudUser[];
  profiles: SyncedInstagramProfile[];
  syncQueue: string[]; // usernames waiting to be synced
  currentlySyncing: string | null;
  isPaused: boolean;
  totalProfilesCount: number;
}

const SYNC_STORAGE_KEY = 'mro_sync_data';

const DEFAULT_SYNC_DATA: SyncData = {
  lastSyncDate: null,
  lastFullSyncDate: null,
  users: [],
  profiles: [],
  syncQueue: [],
  currentlySyncing: null,
  isPaused: false,
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
  if (!data.lastFullSyncDate) return true;
  
  const lastSync = new Date(data.lastFullSyncDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60 * 60 * 24));
  
  return diffDays >= 2; // Sync every 2 days
};

export const wasProfileSyncedToday = (username: string): boolean => {
  const data = getSyncData();
  const profile = data.profiles.find(p => p.username.toLowerCase() === username.toLowerCase());
  
  if (!profile) return false;
  
  const lastUpdated = new Date(profile.lastUpdated);
  const today = new Date();
  
  return lastUpdated.toDateString() === today.toDateString();
};

export const updateProfile = (profile: SyncedInstagramProfile): void => {
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
    
    data.profiles[existingIndex] = profile;
  } else {
    // Add new
    profile.growthHistory = [
      { date: new Date().toISOString(), followers: profile.followers }
    ];
    data.profiles.push(profile);
  }
  
  saveSyncData(data);
};

export const getTopGrowingProfiles = (limit: number = 5): SyncedInstagramProfile[] => {
  const data = getSyncData();
  
  return data.profiles
    .filter(p => p.growthHistory.length >= 2)
    .map(p => {
      const first = p.growthHistory[0].followers;
      const last = p.growthHistory[p.growthHistory.length - 1].followers;
      return { ...p, growth: last - first };
    })
    .sort((a, b) => (b as any).growth - (a as any).growth)
    .slice(0, limit);
};
