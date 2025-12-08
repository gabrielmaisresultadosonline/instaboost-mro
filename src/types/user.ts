// User and SquareCloud API Types

export interface MROUser {
  username: string;
  email?: string;
  daysRemaining: number; // 999999 = lifetime, otherwise actual days
  loginAt: string;
  registeredIGs: RegisteredIG[];
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

export interface UserSession {
  user: MROUser | null;
  isAuthenticated: boolean;
  lastSync: string;
}

// Normalize Instagram username from URL or handle
export const normalizeInstagramUsername = (input: string): string => {
  let username = input.trim().toLowerCase();
  
  // Remove @ if present
  username = username.replace(/^@/, '');
  
  // Extract from full URL
  // Handles: https://instagram.com/username, https://www.instagram.com/username/, etc.
  const urlMatch = username.match(/(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9._]+)/i);
  if (urlMatch) {
    username = urlMatch[1].toLowerCase();
  }
  
  // Remove trailing slashes or query params
  username = username.split('/')[0].split('?')[0];
  
  return username;
};

// Check if days indicate lifetime access
export const isLifetimeAccess = (days: number): boolean => {
  return days >= 9999;
};

// Format days display
export const formatDaysRemaining = (days: number): string => {
  if (isLifetimeAccess(days)) {
    return 'Vitalício';
  }
  if (days <= 30) {
    return `${days} dias (recente)`;
  }
  return `${days} dias`;
};
