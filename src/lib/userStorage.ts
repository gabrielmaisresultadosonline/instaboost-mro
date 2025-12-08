// User session storage (local JSON)
import { MROUser, UserSession, RegisteredIG, normalizeInstagramUsername } from '@/types/user';

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

export const loginUser = (
  username: string, 
  daysRemaining: number,
  email?: string
): UserSession => {
  const session: UserSession = {
    user: {
      username,
      email,
      daysRemaining,
      loginAt: new Date().toISOString(),
      registeredIGs: []
    },
    isAuthenticated: true,
    lastSync: new Date().toISOString()
  };
  saveUserSession(session);
  return session;
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

export const addRegisteredIG = (
  instagram: string,
  email: string,
  syncedFromSquare: boolean = false
): void => {
  const session = getUserSession();
  if (session.user) {
    const normalizedIG = normalizeInstagramUsername(instagram);
    
    // Check if already registered
    if (!session.user.registeredIGs.find(ig => ig.username === normalizedIG)) {
      session.user.registeredIGs.push({
        username: normalizedIG,
        registeredAt: new Date().toISOString(),
        email,
        printSent: !syncedFromSquare, // synced ones don't need print
        syncedFromSquare
      });
      saveUserSession(session);
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

export const syncIGsFromSquare = (instagrams: string[], email: string): void => {
  const session = getUserSession();
  if (session.user) {
    instagrams.forEach(ig => {
      const normalizedIG = normalizeInstagramUsername(ig);
      if (!session.user!.registeredIGs.find(r => r.username === normalizedIG)) {
        session.user!.registeredIGs.push({
          username: normalizedIG,
          registeredAt: new Date().toISOString(),
          email,
          printSent: true, // already in system
          syncedFromSquare: true
        });
      }
    });
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
