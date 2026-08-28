/**
 * Cliente da API interna de controle de acessos — Ferramenta MRO.
 * Endpoint único (POST JSON) `mro-tool-api`, o campo `action` define a operação.
 *
 * Substitui a antiga API da SquareCloud para:
 *  - listar/cadastrar contas do Instagram (área /instagram)
 *  - gerar testes (6h) na área /estruturarendaextra
 */
import { supabase } from '@/integrations/supabase/client';

export interface MroToolAccount {
  instagram_username: string;
  is_trial?: boolean;
  trial_expires_at?: string | null;
  created_at?: string;
}

export interface MroToolTrials {
  limit: number;
  used: number;
  remaining: number;
  duration_days?: number;
}

export interface MroToolSlots {
  total: number;
  used: number;
  available: number;
}

export interface MroToolResponse {
  success: boolean;
  error?: string;
  limit_reached?: boolean;
  trials_exhausted?: boolean;
  needs_renewal?: boolean;
  instagram_not_registered?: boolean;
  allowed?: boolean;
  registered?: boolean;
  source?: string | null;
  is_trial?: boolean;
  trial?: boolean;
  trial_hours?: number;
  trial_expires_at?: string | null;
  user?: Record<string, unknown> & {
    username?: string;
    email?: string | null;
    plan_type?: string;
    lifetime?: boolean;
    days_remaining?: number;
    access_allowed?: boolean;
  };
  accounts?: MroToolAccount[];
  trial_accounts?: MroToolAccount[];
  trials?: MroToolTrials;
  slots?: MroToolSlots;
  [key: string]: unknown;
}

/** Normaliza o @instagram (aceita URL, @handle ou nome puro). */
export const normalizeIG = (input: string): string => {
  const value = String(input || '').trim();
  const urlMatch = value.match(/(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9._]+)/i);
  const raw = urlMatch ? urlMatch[1] : value;
  return raw.replace(/^@/, '').split('/')[0].split('?')[0].split('#')[0].toLowerCase();
};

/** Chamada genérica ao endpoint único. */
export const mroToolApi = async (
  body: Record<string, unknown>,
): Promise<MroToolResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('mro-tool-api', { body });
    if (error) {
      console.error('[mroToolApi] invoke error:', error);
      return { success: false, error: 'Erro ao conectar com o servidor' };
    }
    return (data || { success: false, error: 'Resposta inválida' }) as MroToolResponse;
  } catch (err) {
    console.error('[mroToolApi] unexpected error:', err);
    return { success: false, error: 'Erro ao conectar com o servidor' };
  }
};

/** Login pela API interna (substitui a antiga SquareCloud). */
export const mroLogin = (username: string, password: string, instagram?: string) =>
  mroToolApi({
    action: 'login',
    username: String(username || '').trim().toLowerCase(),
    password: String(password || ''),
    ...(instagram ? { instagram: normalizeIG(instagram) } : {}),
  });

/** Dados completos do usuário (plano, contas fixas, testes e slots). */
export const mroVerifyUser = (username: string) =>
  mroToolApi({ action: 'verify_user', username: String(username || '').trim().toLowerCase() });

/** Verifica se um @instagram está liberado para esse usuário. */
export const mroVerifyInstagram = (username: string, instagram: string) =>
  mroToolApi({
    action: 'verify_instagram',
    username: String(username || '').trim().toLowerCase(),
    instagram: normalizeIG(instagram),
  });

/** Cadastra uma conta FIXA do plano. */
export const mroAddAccount = (username: string, instagram: string) =>
  mroToolApi({
    action: 'add_account',
    username: String(username || '').trim().toLowerCase(),
    instagram: normalizeIG(instagram),
  });

/** Cadastra uma conta de TESTE (padrão 6 horas). */
export const mroAddTrialAccount = (username: string, instagram: string, trialHours = 6) =>
  mroToolApi({
    action: 'add_account',
    username: String(username || '').trim().toLowerCase(),
    instagram: normalizeIG(instagram),
    trial: true,
    trial_hours: trialHours,
  });
