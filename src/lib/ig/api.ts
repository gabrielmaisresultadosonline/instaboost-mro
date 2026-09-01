/**
 * MRO INSTAGRAM (/IG) — camada de acesso ao backend.
 *
 * Toda comunicação passa por Edge Functions. O frontend nunca vê
 * App Secret, access token da Meta, service role key ou senha de admin.
 */
import { supabase } from "@/integrations/supabase/client";
import { IG_OAUTH_REDIRECT_URI } from "@/lib/ig/constants";

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

export interface IgConversation {
  id: string;
  participant_id: string;
  participant_username: string | null;
  participant_name: string | null;
  participant_picture_url: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  last_direction: "in" | "out" | null;
  unread_count: number;
  ai_paused?: boolean;
}

/** Configuração do agente de IA que atende o Direct. */
export interface IgAiSettings {
  id: string;
  tenant_id: string;
  enabled: boolean;
  auto_reply: boolean;
  model: string;
  tone: string;
  persona: string;
  business_context: string | null;
  knowledge: string | null;
  greeting: string | null;
  handoff_keywords: string[];
  max_replies_per_conversation: number;
  reply_delay_seconds: number;
}

export interface IgAutomation {
  id: string;
  name: string;
  channel: "direct" | "comment";
  match_type: "contains" | "exact" | "any" | "starts_with";
  keywords: string[];
  reply_text: string;
  is_active: boolean;
  priority: number;
  triggered_count: number;
  last_triggered_at: string | null;
}

export interface IgDiagLog {
  id: string;
  scope: string;
  step: string;
  level: "debug" | "info" | "warn" | "error";
  http_status: number | null;
  duration_ms: number | null;
  message: string | null;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface IgDiagReport {
  account:
    | {
        username: string | null;
        connection_state: string;
        webhook_subscribed: boolean;
        last_synced_at: string | null;
      }
    | string
    | null;
  token_expires_at?: string | null;
  db_counts?: Record<string, number>;
  pending_jobs?: number;
  probes: Array<{ step: string; ok: boolean; http: number; count: number | null; error: string | null }>;
}

export interface IgMessage {
  id: string;
  direction: "in" | "out";
  text: string | null;
  attachments: unknown[];
  sent_at: string;
}


export interface IgMediaItem {
  id: string;
  media_id: string;
  media_type: string | null;
  media_product_type: string | null;
  caption: string | null;
  permalink: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  like_count: number | null;
  comments_count: number | null;
  views_count: number | null;
  reach: number | null;
  saved: number | null;
  shares: number | null;
  published_at: string | null;
}

export interface IgComment {
  id: string;
  comment_id: string;
  media_id: string | null;
  media_row_id: string | null;
  from_username: string | null;
  text: string | null;
  is_own: boolean;
  replied: boolean;
  hidden: boolean;
  commented_at: string | null;
}

export type IgContactStage = "novo" | "contato" | "qualificado" | "negociacao" | "cliente" | "perdido";

export interface IgContact {
  id: string;
  participant_id: string;
  username: string | null;
  name: string | null;
  picture_url: string | null;
  stage: IgContactStage;
  source: "direct" | "comment" | "manual";
  notes: string | null;
  last_interaction_at: string | null;
  created_at: string;
}

export interface IgSyncSummary {
  profile: number;
  media: number;
  comments: number;
  conversations: number;
  messages: number;
  contacts: number;
  errors: string[];
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

  conversations: (tenantId: string) =>
    invoke<{ conversations: IgConversation[] }>("ig-api", { action: "conversations", tenant_id: tenantId }),

  messages: (tenantId: string, conversationId: string) =>
    invoke<{ messages: IgMessage[] }>("ig-api", {
      action: "messages",
      tenant_id: tenantId,
      conversation_id: conversationId,
    }),

  sendMessage: (tenantId: string, conversationId: string, text: string) =>
    invoke<{ sent_at: string }>("ig-api", {
      action: "send_message",
      tenant_id: tenantId,
      conversation_id: conversationId,
      text,
    }),

  subscribeWebhook: (tenantId: string) =>
    invoke<{
      subscribed: number;
      synced_conversations: number;
      synced_messages: number;
      sync_error: string | null;
    }>("ig-api", { action: "subscribe_webhook", tenant_id: tenantId }),

  syncNow: (tenantId: string) => invoke<IgSyncSummary>("ig-api", { action: "sync_now", tenant_id: tenantId }),

  media: (tenantId: string, only?: "reels" | "posts") =>
    invoke<{ media: IgMediaItem[] }>("ig-api", { action: "media", tenant_id: tenantId, only }),

  comments: (tenantId: string) =>
    invoke<{ comments: IgComment[]; media: Array<Pick<IgMediaItem, "id" | "permalink" | "thumbnail_url" | "media_url" | "caption">> }>(
      "ig-api",
      { action: "comments", tenant_id: tenantId },
    ),

  replyComment: (tenantId: string, commentId: string, text: string) =>
    invoke<{ success: true }>("ig-api", {
      action: "reply_comment",
      tenant_id: tenantId,
      comment_id: commentId,
      text,
    }),

  contacts: (tenantId: string) =>
    invoke<{ contacts: IgContact[] }>("ig-api", { action: "contacts", tenant_id: tenantId }),

  updateContact: (tenantId: string, contactId: string, patch: { stage?: IgContactStage; notes?: string }) =>
    invoke<{ success: true }>("ig-api", {
      action: "update_contact",
      tenant_id: tenantId,
      contact_id: contactId,
      ...patch,
    }),

  aiSettings: (tenantId: string) =>
    invoke<{ settings: IgAiSettings }>("ig-api", { action: "ai_settings", tenant_id: tenantId }),

  saveAiSettings: (tenantId: string, settings: Partial<IgAiSettings>) =>
    invoke<{ settings: IgAiSettings }>("ig-api", { action: "save_ai_settings", tenant_id: tenantId, settings }),

  aiSuggest: (tenantId: string, conversationId: string, text?: string) =>
    invoke<{ draft: string }>("ig-api", {
      action: "ai_suggest",
      tenant_id: tenantId,
      conversation_id: conversationId,
      text,
    }),

  setAiPause: (tenantId: string, conversationId: string, paused: boolean) =>
    invoke<{ ai_paused: boolean }>("ig-api", {
      action: "set_ai_pause",
      tenant_id: tenantId,
      conversation_id: conversationId,
      paused,
    }),

  automations: (tenantId: string) =>
    invoke<{ automations: IgAutomation[] }>("ig-api", { action: "automations", tenant_id: tenantId }),

  saveAutomation: (tenantId: string, automation: Partial<IgAutomation>) =>
    invoke<{ success: true }>("ig-api", { action: "save_automation", tenant_id: tenantId, automation }),

  deleteAutomation: (tenantId: string, automationId: string) =>
    invoke<{ success: true }>("ig-api", {
      action: "delete_automation",
      tenant_id: tenantId,
      automation_id: automationId,
    }),

  logs: (tenantId: string) => invoke<{ logs: IgDiagLog[] }>("ig-api", { action: "logs", tenant_id: tenantId }),

  diag: (tenantId: string) =>
    invoke<{ report: IgDiagReport[]; hint?: string }>("ig-api", { action: "diag", tenant_id: tenantId }),


  oauthConfig: () => invoke<{ app_id: string; scopes: string }>("ig-oauth", { action: "get-config" }),

  exchangeCode: (input: { code: string; redirect_uri: string; tenant_id: string }) =>
    invoke<{ account: IgAccount }>("ig-oauth", { action: "exchange-code", ...input }),
};


/** URL de callback do OAuth — deve estar cadastrada no App da Meta. */
export const IG_REDIRECT_URI = IG_OAUTH_REDIRECT_URI;

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
