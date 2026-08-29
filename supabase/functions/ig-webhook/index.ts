/**
 * MRO INSTAGRAM (/IG) — Webhook oficial da Meta.
 *
 * GET  → verificação do endpoint (hub.challenge)
 * POST → recebe evento, valida assinatura X-Hub-Signature-256, grava com
 *        idempotência, enfileira em ig_jobs e responde 200 imediatamente.
 *
 * Nenhum processamento pesado acontece aqui: quem processa é o ig-worker.
 */
import { audit, corsHeaders, enqueue, hmacHex, resolveMetaCredentials, serviceClient, timingSafeEqual } from "../_shared/ig-core.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const db = serviceClient();
  const url = new URL(req.url);

  // ---------- Verificação (GET) ----------
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    // Aceita o token salvo no painel (/IG/admin/app) ou, na ausência, o secret do ambiente.
    let saved: string | null = null;
    try {
      const { data } = await db
        .from("ig_app_config")
        .select("webhook_verify_token")
        .eq("id", "default")
        .maybeSingle();
      saved = (data?.webhook_verify_token as string | null) ?? null;
    } catch (error) {
      console.error("[ig-webhook] config read failed:", (error as Error).message);
    }

    const candidates = [saved, Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") ?? null]
      .map((v) => v?.trim())
      .filter((v): v is string => Boolean(v));

    if (mode === "subscribe" && token && candidates.some((c) => timingSafeEqual(token.trim(), c))) {
      return new Response(challenge ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    console.error("[ig-webhook] verification rejected");
    return new Response("Forbidden", { status: 403 });
  }


  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const rawBody = await req.text();

  // ---------- Validação de assinatura ----------
  const { appSecret } = await resolveMetaCredentials(db);
  const signatureHeader = req.headers.get("x-hub-signature-256");

  if (!appSecret || !signatureHeader?.startsWith("sha256=")) {
    console.error("[ig-webhook] rejected: missing signature or app secret");
    return new Response("Unauthorized", { status: 401 });
  }

  const expected = await hmacHex(rawBody, appSecret);
  if (!timingSafeEqual(signatureHeader.slice(7), expected)) {
    console.error("[ig-webhook] rejected: invalid signature");
    return new Response("Unauthorized", { status: 401 });
  }

  // ---------- Registro idempotente + enfileiramento ----------
  try {
    const payload = JSON.parse(rawBody) as {
      object?: string;
      entry?: Array<{ id?: string; time?: number; changes?: unknown[]; messaging?: unknown[] }>;
    };

    for (const entry of payload.entry ?? []) {
      const instagramAccountId = entry.id ? String(entry.id) : null;

      // A Meta envia o ID da conta profissional (instagram_user_id) no entry.id,
      // que pode ser diferente do id retornado pelo /me na conexão.
      const { data: account } = instagramAccountId
        ? await db
            .from("ig_accounts")
            .select("id, tenant_id")
            .or(`instagram_account_id.eq.${instagramAccountId},instagram_user_id.eq.${instagramAccountId}`)
            .is("deleted_at", null)
            .maybeSingle()
        : { data: null };


      const items: Array<{ field: string; value: unknown }> = [
        ...((entry.changes ?? []) as Array<{ field?: string; value?: unknown }>).map((c) => ({
          field: c.field ?? "unknown",
          value: c.value,
        })),
        ...((entry.messaging ?? []) as unknown[]).map((m) => ({ field: "messages", value: m })),
      ];

      for (const [index, item] of items.entries()) {
        const eventKey = await hmacHex(
          `${instagramAccountId}:${entry.time ?? ""}:${item.field}:${index}:${JSON.stringify(item.value)}`,
          appSecret,
        );

        const { data: inserted, error } = await db
          .from("ig_webhook_events")
          .insert({
            event_key: eventKey,
            object: payload.object ?? null,
            field: item.field,
            instagram_account_id: instagramAccountId,
            tenant_id: account?.tenant_id ?? null,
            payload: item.value as Record<string, unknown>,
            status: account ? "queued" : "ignored",
          })
          .select("id")
          .maybeSingle();

        // Evento duplicado (unique_violation) → já processado, ignorar silenciosamente.
        if (error) continue;

        if (account && inserted) {
          await enqueue(db, {
            type: `webhook.${item.field}`,
            tenant_id: account.tenant_id,
            payload: { event_id: inserted.id, ig_account_id: account.id },
            dedupe_key: `event:${inserted.id}`,
          });
          queued = true;
        }
      }
    }

    // Processamento imediato (tempo real). Fire-and-forget: a Meta recebe 200 na hora.
    if (queued) {
      const workerUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ig-worker`;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      fetch(workerUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: "{}",
      }).catch((error) => console.error("[ig-webhook] worker trigger failed:", (error as Error).message));
    }

  } catch (error) {
    // Nunca devolver erro para a Meta: isso causa reenvio em massa.
    console.error("[ig-webhook] processing error:", (error as Error).message);
    await audit(db, { actor_type: "meta", action: "webhook.error", result: "failure" });
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
});
