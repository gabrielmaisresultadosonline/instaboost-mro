// User and SquareCloud API Types
import { ProfileSession } from './instagram';

export interface MROUser {
  username: string;
  email?: string;
  daysRemaining: number; // >365 = lifetime, otherwise actual days
  loginAt: string;
  registeredIGs: RegisteredIG[];
  creativesUnlocked?: boolean; // Only for lifetime users - admin can unlock
  isEmailLocked?: boolean; // True if email has been set and locked
  lifetimeCreativeUsedAt?: string; // ISO date when lifetime user used their monthly creative
}

export interface RegisteredIG {
  username: string; // always lowercase, no @
  registeredAt: string;
  email: string;
  printSent: boolean;
  syncedFromSquare: boolean;
}

export interface SquareLoginResponse {
  senhaCorrespondente: boolean;
  diasRestantes?: number;
}

export interface SquareVerifyIGResponse {
  success: boolean;
  igInstagram?: string[];
  igTesteUserMro?: string[];
}

export interface SquareAddIGResponse {
  success: boolean;
  message?: string;
}

export interface CloudData {
  profileSessions: ProfileSession[];
  archivedProfiles: ProfileSession[];
  daysRemaining?: number; // Days from cloud storage (synced by admin)
}

export interface UserSession {
  user: MROUser | null;
  isAuthenticated: boolean;
  lastSync: string;
  cloudData?: CloudData; // Data loaded from cloud storage
}

export type { UserSession as UserSessionType };

// Normalize Instagram username from URL or handle
// Handles all formats:
// - https://www.instagram.com/maisresultadosonline/
// - https://www.instagram.com/maisresultadosonline?igsh=xxx&utm_source=qr
// - @maisresultadosonline
// - maisresultadosonline
// - MaisResultadosOnline (converts to lowercase)
export const normalizeInstagramUsername = (input: string): string => {
  let username = input.trim();
  
  // First, check if it's a URL and extract the username
  // Handles URLs with query params like ?igsh=xxx&utm_source=qr
  const urlMatch = username.match(/(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9._]+)/i);
  if (urlMatch) {
    username = urlMatch[1];
  }
  
  // Remove @ if present at the start
  username = username.replace(/^@/, '');
  
  // Remove any remaining path segments or query params
  username = username.split('/')[0].split('?')[0].split('#')[0];
  
  // Always return lowercase
  return username.toLowerCase();
};

// Check if days indicate lifetime access (> 365 days)
export const isLifetimeAccess = (days: number): boolean => {
  return days > 365;
};

// Format days display
export const formatDaysRemaining = (days: number): string => {
  if (isLifetimeAccess(days)) {
    return 'Vitalício';
  }
  if (days <= 30) {
    return `${days} dias`;
  }
  return `${days} dias`;
};

// Check if lifetime user has used their monthly creative
export const hasLifetimeUsedMonthlyCreative = (user: MROUser): boolean => {
  if (!user.lifetimeCreativeUsedAt) return false;
  
  const usedDate = new Date(user.lifetimeCreativeUsedAt);
  const now = new Date();
  
  // Check if it's the same month and year
  return usedDate.getMonth() === now.getMonth() && 
         usedDate.getFullYear() === now.getFullYear();
};

// Check if user can use creatives generator
export const canUseCreatives = (user: MROUser | null): { allowed: boolean; reason?: string; isLifetimeLimit?: boolean } => {
  if (!user) {
    return { allowed: false, reason: 'Usuário não autenticado' };
  }
  
  // Lifetime users special handling
  if (isLifetimeAccess(user.daysRemaining)) {
    // If admin has unlocked, allow full access
    if (user.creativesUnlocked) {
      return { allowed: true };
    }
    
    // Check if already used this month's FREE creative
    if (hasLifetimeUsedMonthlyCreative(user)) {
      return { 
        allowed: false, 
        reason: 'Você já utilizou seu criativo gratuito deste mês. Para liberar acesso completo ao gerador de criativos, entre em contato com o suporte.',
        isLifetimeLimit: true
      };
    }
    
    // Lifetime user can generate 1 free creative per month
    return { allowed: true };
  }
  
  // Regular users (365 days or less) can use normally
  return { allowed: true };
};
