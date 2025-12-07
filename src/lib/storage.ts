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
    session.creatives.push(creative);
    session.creativesRemaining--;
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
