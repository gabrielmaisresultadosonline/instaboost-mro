/**
 * MRO INSTAGRAM (/IG) — diagnóstico técnico das conexões com a Meta.
 *
 * Protegido por header `x-diag-key` (segredo IG_DIAG_KEY). Nunca devolve
 * tokens: apenas status HTTP, mensagens de erro da Graph API e contagens.
 */
import { corsHeaders, serviceClient } from "../_shared/ig-core.ts";

const GRAPH = "https://graph.instagram.com/v21.0";

interface Probe {
  step: string;
  ok: boolean;
  http: number;
  count?: number;
  error?: string;
  sample?: unknown;
}

async function probe(step: string, url: string): Promise<Probe> {
  try {
    const response = await fetch(url);
    const payload = (await response.json().catch(() => ({}))) as {
      data?: unknown[];
      error?: { message?: string; code?: number; error_subcode?: number; type?: string };
    } & Record<string, unknown>;

    const error = payload.error
      ? `${payload.error.type ?? "error"} ${payload.error.code ?? ""}/${payload.error.error_subcode ?? ""}: ${payload.error.message ?? ""}`
      : undefined;

    const list = Array.isArray(payload.data) ? payload.data : null;
    const result: Probe = {
      step,
      ok: response.ok && !payload.error,
      http: response.status,
      count: list ? list.length : undefined,
      error,
      sample: list ? list.slice(0, 1) : payload,
    };
    console.log(`[ig-diag] ${step} → HTTP ${result.http} ok=${result.ok} count=${result.count ?? "-"} ${error ?? ""}`);
    return result;
  } catch (err) {
    const message = (err as Error).message;
    console.error(`[ig-diag] ${step} → exception: ${message}`);
    return { step, ok: false, http: 0, error: message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get("IG_DIAG_KEY") ?? "";
  if (!expected || req.headers.get("x-diag-key") !== expected) {
    return new Response(JSON.stringify({ success: false, error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const db = serviceClient();
  const { data: accounts } = await db
    .from("ig_accounts")
    .select("id, tenant_id, username, instagram_account_id, instagram_user_id, connection_state, last_synced_at")
    .is("deleted_at", null);

  const report: unknown[] = [];

  for (const account of accounts ?? []) {
    const { data: token } = await db
      .from("ig_tokens")
      .select("access_token, expires_at")
      .eq("ig_account_id", account.id)
      .maybeSingle();

    if (!token?.access_token) {
      report.push({ account: account.username, error: "sem token salvo" });
      continue;
    }

    const t = token.access_token as string;
    const probes: Probe[] = [];

    probes.push(await probe("me", `${GRAPH}/me?fields=id,user_id,username,followers_count,media_count&access_token=${t}`));
    probes.push(await probe("me/media", `${GRAPH}/me/media?fields=id,media_type,media_product_type,permalink,timestamp&limit=5&access_token=${t}`));
    probes.push(
      await probe(
        "me/conversations",
        `${GRAPH}/me/conversations?platform=instagram&fields=id,updated_time,participants,messages.limit(5){id,created_time,from,message}&limit=5&access_token=${t}`,
      ),
    );
    probes.push(await probe("subscribed_apps", `${GRAPH}/me/subscribed_apps?access_token=${t}`));

    // Comentários da mídia mais recente (se houver).
    const mediaProbe = probes[1];
    const firstMedia = Array.isArray(mediaProbe.sample) ? (mediaProbe.sample[0] as { id?: string } | undefined) : undefined;
    if (firstMedia?.id) {
      probes.push(
        await probe("media/comments", `${GRAPH}/${firstMedia.id}/comments?fields=id,text,timestamp,username,from&limit=5&access_token=${t}`),
      );
      probes.push(await probe("media/insights", `${GRAPH}/${firstMedia.id}/insights?metric=reach,saved,shares&access_token=${t}`));
    }

    const counts: Record<string, number | null> = {};
    for (const table of ["ig_media", "ig_comments", "ig_conversations", "ig_messages", "ig_contacts"]) {
      const { count } = await db.from(table).select("id", { count: "exact", head: true }).eq("ig_account_id", account.id);
      counts[table] = count ?? 0;
    }

    report.push({
      account: { username: account.username, connection_state: account.connection_state, last_synced_at: account.last_synced_at },
      token_expires_at: token.expires_at,
      db_counts: counts,
      probes,
    });
  }

  return new Response(JSON.stringify({ success: true, report }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
