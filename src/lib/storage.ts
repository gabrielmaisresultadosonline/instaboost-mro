import { MROSession, InstagramProfile, ProfileAnalysis, Strategy, Creative } from '@/types/instagram';

const STORAGE_KEY = 'mro_session';

export const getSession = (): MROSession => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return createEmptySession();
};

export const createEmptySession = (): MROSession => ({
  profile: null,
  analysis: null,
  strategies: [],
  creatives: [],
  creativesRemaining: 6,
  lastUpdated: new Date().toISOString(),
});

export const saveSession = (session: MROSession): void => {
  session.lastUpdated = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export const updateProfile = (profile: InstagramProfile): void => {
  const session = getSession();
  session.profile = profile;
  saveSession(session);
};

export const updateAnalysis = (analysis: ProfileAnalysis): void => {
  const session = getSession();
  session.analysis = analysis;
  saveSession(session);
};

export const addStrategy = (strategy: Strategy): void => {
  const session = getSession();
  session.strategies.push(strategy);
  saveSession(session);
};

export const addCreative = (creative: Creative): void => {
  const session = getSession();
  if (session.creativesRemaining > 0) {
    // Add expiration date (1 month from now)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    creative.expiresAt = expiresAt.toISOString();
    
    session.creatives.push(creative);
    session.creativesRemaining--;
    saveSession(session);
  }
};

export const cleanExpiredCreatives = (): void => {
  const session = getSession();
  const now = new Date();
  const validCreatives = session.creatives.filter(c => {
    if (!c.expiresAt) return true;
    return new Date(c.expiresAt) > now;
  });
  
  // Recover credits for expired creatives
  const expiredCount = session.creatives.length - validCreatives.length;
  session.creatives = validCreatives;
  session.creativesRemaining = Math.min(6, session.creativesRemaining + expiredCount);
  saveSession(session);
};

export const markCreativeAsDownloaded = (creativeId: string): void => {
  const session = getSession();
  const creative = session.creatives.find(c => c.id === creativeId);
  if (creative) {
    creative.downloaded = true;
    saveSession(session);
  }
};

export const resetSession = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const hasExistingSession = (): boolean => {
  const session = getSession();
  return session.profile !== null;
};
