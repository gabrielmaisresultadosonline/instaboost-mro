/**
 * MRO INSTAGRAM (/IG) — camada de acesso ao backend.
 *
 * Toda comunicação passa por Edge Functions. O frontend nunca vê
 * App Secret, access token da Meta, service role key ou senha de admin.
 */
import { supabase } from "@/integrations/supabase/client";

export type IgRole = "owner" | "admin" | "manager" | "agent" | "analyst";

export interface IgTenant {
  id: string;
  name: string;
  plan_id: string;
  onboarding_done: boolean;
  is_blocked: boolean;
}

export interface IgAccount {
  id: string;
  tenant_id: string;
  instagram_account_id?: string | null;
  username: string | null;
  name: string | null;
  profile_picture_url: string | null;
  followers_count: number | null;
  media_count: number | null;
  connection_state: "connected" | "needs_reconnect" | "disconnected";
  webhook_subscribed: boolean;
  last_synced_at: string | null;
}

export interface IgPlan {
  id: string;
  name: string;
  price_cents: number;
  max_accounts: number;
  max_automations: number;
  max_messages_month: number;
  max_ai_calls_month: number;
  max_members: number;
  history_days: number;
  features: Record<string, boolean>;
}

export interface IgMe {
  profile: { user_id: string; full_name: string | null; company: string | null; email: string | null } | null;
  memberships: Array<{ tenant_id: string; role: IgRole }>;
  tenants: IgTenant[];
  accounts: IgAccount[];
  plans: IgPlan[];
  is_super_admin: boolean;
}

export interface IgDashboard {
  period_days: number;
  has_account: boolean;
  accounts: Array<Pick<IgAccount, "id" | "username" | "followers_count" | "media_count" | "connection_state" | "last_synced_at">>;
  metrics: Record<string, number | null>;
}

/** Erro de negócio já traduzido para o usuário final. */
export class IgApiError extends Error {
  readonly code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "IgApiError";
    this.code = code;
  }
}

async function invoke<T>(fn: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body: payload });

  if (error) {
    const fallback = (data as { error?: string } | null)?.error;
    throw new IgApiError(fallback ?? "Não foi possível concluir a operação. Tente novamente.");
  }
  const result = data as { success?: boolean; error?: string; code?: string } & T;
  if (result?.success === false) {
    throw new IgApiError(result.error ?? "Operação não permitida.", result.code);
  }
  return result as T;
}

export const igApi = {
  bootstrap: (input: { full_name?: string; company?: string }) =>
    invoke<{ success: true }>("ig-api", { action: "bootstrap", ...input }),

  me: () => invoke<IgMe>("ig-api", { action: "me" }),

  dashboard: (tenantId: string, period: string) =>
    invoke<IgDashboard>("ig-api", { action: "dashboard", tenant_id: tenantId, period }),

  disconnect: (tenantId: string, accountId: string) =>
    invoke<{ success: true }>("ig-api", { action: "disconnect", tenant_id: tenantId, account_id: accountId }),

  notifications: (tenantId: string) =>
    invoke<{ notifications: Array<{ id: string; type: string; title: string; body: string | null; created_at: string }> }>(
      "ig-api",
      { action: "notifications", tenant_id: tenantId },
    ),

  oauthConfig: () => invoke<{ app_id: string; scopes: string }>("ig-oauth", { action: "get-config" }),

  exchangeCode: (input: { code: string; redirect_uri: string; tenant_id: string }) =>
    invoke<{ account: IgAccount }>("ig-oauth", { action: "exchange-code", ...input }),
};

/** URL de callback do OAuth — deve estar cadastrada no App da Meta. */
export const IG_REDIRECT_URI = `${window.location.origin}/IG/auth/instagram/callback`;

/** Monta a URL de autorização da Meta usando somente dados públicos. */
export function buildInstagramAuthUrl(appId: string, scopes: string, state: string): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: IG_REDIRECT_URI,
    response_type: "code",
    scope: scopes,
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}
