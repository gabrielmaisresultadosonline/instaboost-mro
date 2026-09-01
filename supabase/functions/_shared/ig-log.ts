/**
 * MRO INSTAGRAM (/IG) — trilha de log técnica.
 *
 * Cada passo relevante vai para DOIS destinos:
 *  1. `console.log` da Edge Function (visível no terminal / logs de funções);
 *  2. tabela `ig_diag_logs`, para o cliente ver em /IG/diagnostico.
 *
 * Nunca gravamos access token, App Secret ou service role key — apenas
 * identificadores, códigos HTTP e mensagens de erro da própria Meta.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export type IgLogLevel = "debug" | "info" | "warn" | "error";

export interface IgLogEntry {
  scope: string;
  step: string;
  level?: IgLogLevel;
  tenant_id?: string | null;
  ig_account_id?: string | null;
  http_status?: number | null;
  duration_ms?: number | null;
  message?: string | null;
  detail?: Record<string, unknown>;
}

/** Remove qualquer resquício de segredo antes de persistir/loggar. */
export function scrub(value: unknown): unknown {
  const raw = JSON.stringify(value ?? null);
  if (!raw) return null;
  const clean = raw
    .replace(/"access_token":"[^"]*"/g, '"access_token":"[oculto]"')
    .replace(/access_token=[^&"\\]*/g, "access_token=[oculto]");
  try {
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

export async function igLog(db: SupabaseClient, entry: IgLogEntry): Promise<void> {
  const level = entry.level ?? "info";
  const line = [
    `[${entry.scope}]`,
    entry.step,
    entry.http_status != null ? `http=${entry.http_status}` : "",
    entry.duration_ms != null ? `${entry.duration_ms}ms` : "",
    entry.message ? `- ${entry.message}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);

  try {
    await db.from("ig_diag_logs").insert({
      tenant_id: entry.tenant_id ?? null,
      ig_account_id: entry.ig_account_id ?? null,
      scope: entry.scope,
      step: entry.step.slice(0, 200),
      level,
      http_status: entry.http_status ?? null,
      duration_ms: entry.duration_ms ?? null,
      message: entry.message ? String(entry.message).slice(0, 800) : null,
      detail: (scrub(entry.detail ?? {}) as Record<string, unknown>) ?? {},
    });
  } catch (error) {
    console.error("[ig-log] falha ao persistir log:", (error as Error).message);
  }
}

/** Executa uma chamada à Graph API já com log de entrada/saída. */
export async function loggedGraphFetch(
  db: SupabaseClient,
  entry: Omit<IgLogEntry, "http_status" | "duration_ms" | "message" | "level">,
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; payload: Record<string, unknown>; error?: string }> {
  const started = Date.now();
  try {
    const response = await fetch(url, init);
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown> & {
      error?: { message?: string; code?: number; error_subcode?: number; type?: string; error_user_msg?: string };
    };
    const metaError = payload.error
      ? `${payload.error.type ?? "error"} ${payload.error.code ?? ""}/${payload.error.error_subcode ?? ""}: ${
          payload.error.error_user_msg ?? payload.error.message ?? ""
        }`
      : undefined;
    const ok = response.ok && !payload.error;

    await igLog(db, {
      ...entry,
      level: ok ? "info" : "error",
      http_status: response.status,
      duration_ms: Date.now() - started,
      message: metaError ?? "ok",
      detail: { ...(entry.detail ?? {}), response: scrub(payload) },
    });

    return { ok, status: response.status, payload, error: metaError };
  } catch (error) {
    const message = (error as Error).message;
    await igLog(db, {
      ...entry,
      level: "error",
      http_status: 0,
      duration_ms: Date.now() - started,
      message,
    });
    return { ok: false, status: 0, payload: {}, error: message };
  }
}
