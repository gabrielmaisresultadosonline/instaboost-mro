/**
 * Configuração pública do backend próprio (VPS + PostgreSQL) usada pelas
 * documentações do /admin.
 *
 * Por que existe: o admin não deve precisar procurar a `ANON_KEY` em nenhum
 * lugar. O `atualizar.sh` grava `VITE_API_URL` e `VITE_API_ANON_KEY` no `.env`
 * do frontend antes do build, então a chave já vem embutida aqui. Só quando
 * essas variáveis faltam (ex.: preview do Lovable) caímos no valor salvo
 * manualmente no navegador.
 *
 * Segurança: `ANON_KEY` é chave publicável (claim `role: anon`), exatamente
 * como a anon key do Supabase — nunca a `SERVICE_ROLE_KEY`.
 */

/** Origem padrão da API na VPS. */
export const DEFAULT_VPS_API_URL = 'https://api.maisresultadosonline.com.br';

/** Onde guardamos a chave informada manualmente (fallback do preview). */
export const VPS_ANON_KEY_STORAGE = 'mro-docs-vps-anon-key';

/** URL da API na VPS, vinda do build ou do padrão. */
export function vpsApiUrl(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
  return (fromEnv.trim() || DEFAULT_VPS_API_URL).replace(/\/+$/, '');
}

/**
 * ANON_KEY da VPS. Ordem de resolução:
 * 1. variável do build (`VITE_API_ANON_KEY`) — o caminho normal na VPS;
 * 2. valor colado pelo admin e salvo no navegador;
 * 3. string vazia (a UI mostra um aviso em vez de um exemplo inválido).
 */
export function vpsAnonKey(): string {
  const fromEnv = (import.meta.env.VITE_API_ANON_KEY as string | undefined) ?? '';
  if (fromEnv.trim()) return fromEnv.trim();
  if (typeof window === 'undefined') return '';
  return (window.localStorage.getItem(VPS_ANON_KEY_STORAGE) ?? '').trim();
}

/** True quando a chave veio do build (o admin não precisa colar nada). */
export function vpsAnonKeyFromBuild(): boolean {
  return Boolean(((import.meta.env.VITE_API_ANON_KEY as string | undefined) ?? '').trim());
}

/** Salva a chave informada manualmente. */
export function saveVpsAnonKey(value: string): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(VPS_ANON_KEY_STORAGE, value.trim());
  }
}

/** Chave anon do backend atual (Supabase) — também publicável. */
export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? '';

/** URL do backend atual (Supabase). */
export const SUPABASE_API_URL =
  ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
    'https://adljdeekwifwcdcgbpit.supabase.co').replace(/\/+$/, '');

/** Marcador usado nos exemplos quando a chave ainda não está disponível. */
export const ANON_KEY_PLACEHOLDER = 'COLE_AQUI_A_ANON_KEY_DA_VPS';
