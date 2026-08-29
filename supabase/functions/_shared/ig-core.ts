/**
 * MRO INSTAGRAM (/IG) — utilitários compartilhados das Edge Functions.
 *
 * Regras invioláveis deste módulo:
 * - Tokens da Meta, service role key e senhas NUNCA são retornados ao cliente.
 * - Nenhum segredo é escrito em log (apenas identificadores e códigos de erro).
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ig-admin-token",
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** Erro seguro: mensagem amigável para o cliente, detalhe técnico só no log/banco. */
export function fail(message: string, status = 400, code?: string): Response {
  return json({ success: false, error: message, code }, status);
}

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

/** Resolve o usuário autenticado a partir do header Authorization. */
export async function getAuthUser(req: Request): Promise<{ id: string; email: string | null } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const anon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) return null;

  return { id: data.user.id, email: data.user.email ?? null };
}

/** Confirma que o usuário pertence ao tenant (defesa em profundidade além do RLS). */
export async function assertTenantMember(
  db: SupabaseClient,
  tenantId: string,
  userId: string,
  roles?: string[],
): Promise<boolean> {
  const { data } = await db
    .from("ig_tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return false;
  if (roles && roles.length > 0) return roles.includes(data.role as string);
  return true;
}

export async function isSuperAdmin(db: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await db.from("ig_super_admins").select("user_id").eq("user_id", userId).maybeSingle();
  return Boolean(data);
}

export async function rateLimit(
  db: SupabaseClient,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await db.rpc("ig_rate_limit_hit", {
    _bucket: bucket,
    _limit: limit,
    _window_seconds: windowSeconds,
  });
  if (error) return true; // Falha do limitador não deve derrubar a operação legítima.
  return data === true;
}

export function clientIp(req: Request): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function audit(
  db: SupabaseClient,
  entry: {
    tenant_id?: string | null;
    actor_user_id?: string | null;
    actor_type?: "user" | "super_admin" | "system" | "meta";
    action: string;
    target?: string | null;
    result?: "success" | "failure";
    ip?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await db.from("ig_audit_logs").insert({
      tenant_id: entry.tenant_id ?? null,
      actor_user_id: entry.actor_user_id ?? null,
      actor_type: entry.actor_type ?? "user",
      action: entry.action,
      target: entry.target ?? null,
      result: entry.result ?? "success",
      ip: entry.ip ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (error) {
    console.error("[ig-core] audit insert failed:", (error as Error).message);
  }
}

/** Enfileira job idempotente na fila Postgres (substituta do Redis). */
export async function enqueue(
  db: SupabaseClient,
  job: { type: string; tenant_id?: string | null; payload?: Record<string, unknown>; dedupe_key?: string },
): Promise<void> {
  const { error } = await db.from("ig_jobs").insert({
    type: job.type,
    tenant_id: job.tenant_id ?? null,
    payload: job.payload ?? {},
    dedupe_key: job.dedupe_key ?? null,
  });
  // 23505 = unique_violation → job já enfileirado (idempotência), não é erro.
  if (error && error.code !== "23505") {
    console.error("[ig-core] enqueue failed:", error.message);
  }
}

/** Hash de senha com PBKDF2-SHA512 (210k iterações) — equivalente seguro ao Argon2id no runtime Deno. */
export async function hashPassword(password: string, saltHex?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltHex
    ? hexToBytes(saltHex)
    : crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-512", salt, iterations: 210_000 },
    key,
    512,
  );

  return { hash: bytesToHex(new Uint8Array(bits)), salt: bytesToHex(salt) };
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

/** Assina/valida tokens de sessão do admin do módulo (HMAC-SHA256). */
export async function signAdminToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const body = btoa(JSON.stringify(payload));
  const signature = await hmacHex(body, secret);
  return `${body}.${signature}`;
}

export async function verifyAdminToken(
  token: string | null,
  secret: string,
): Promise<Record<string, unknown> | null> {
  if (!token || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  const expected = await hmacHex(body, secret);
  if (!timingSafeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(atob(body)) as Record<string, unknown>;
    if (typeof payload.exp === "number" && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function hmacHex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return bytesToHex(new Uint8Array(sig));
}

/** Credenciais do App da Meta. Reaproveita FACEBOOK_* quando META_* não existir. */
export function metaAppCredentials(): { appId: string; appSecret: string } {
  return {
    appId: Deno.env.get("META_APP_ID") ?? Deno.env.get("FACEBOOK_APP_ID") ?? "",
    appSecret: Deno.env.get("META_APP_SECRET") ?? Deno.env.get("FACEBOOK_APP_SECRET") ?? "",
  };
}

/**
 * Credenciais efetivas: o que o super admin salvou no painel tem prioridade;
 * na ausência, cai para os secrets do ambiente. O secret nunca é retornado ao cliente.
 */
export async function resolveMetaCredentials(
  db: SupabaseClient,
): Promise<{ appId: string; appSecret: string; scopes: string | null; source: "database" | "secrets" | "none" }> {
  const env = metaAppCredentials();
  try {
    const { data } = await db
      .from("ig_app_config")
      .select("app_id, app_secret, scopes")
      .eq("id", "default")
      .maybeSingle();

    if (data?.app_id && data?.app_secret) {
      return {
        appId: String(data.app_id),
        appSecret: String(data.app_secret),
        scopes: (data.scopes as string | null) ?? null,
        source: "database",
      };
    }
  } catch (error) {
    console.error("[ig-core] app config read failed:", (error as Error).message);
  }

  if (env.appId && env.appSecret) return { ...env, scopes: null, source: "secrets" };
  return { appId: "", appSecret: "", scopes: null, source: "none" };
}


/** Traduz erro da Meta em mensagem amigável, preservando o detalhe técnico para o log. */
export function friendlyMetaError(raw: unknown): { userMessage: string; technical: string } {
  const technical = typeof raw === "string" ? raw : JSON.stringify(raw ?? {});
  return {
    userMessage: "Não foi possível conectar seu Instagram. Tente novamente.",
    technical,
  };
}
