/**
 * MRO INSTAGRAM (/IG) — Worker da fila Postgres (substitui Redis + BullMQ).
 *
 * Retira lotes de ig_jobs pendentes, processa, aplica retry com backoff
 * exponencial e move para dead-letter ao esgotar as tentativas.
 * Pode ser acionado por cron ou manualmente.
 */
import { corsHeaders, json, serviceClient } from "../_shared/ig-core.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const BATCH_SIZE = 25;

async function bumpUsage(db: SupabaseClient, tenantId: string | null, metric: string) {
  if (!tenantId) return;
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  const period = periodStart.toISOString().slice(0, 10);

  const { data: existing } = await db
    .from("ig_usage")
    .select("id, value")
    .eq("tenant_id", tenantId)
    .eq("metric", metric)
    .eq("period_start", period)
    .maybeSingle();

  if (existing) {
    await db
      .from("ig_usage")
      .update({ value: Number(existing.value) + 1, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await db.from("ig_usage").insert({ tenant_id: tenantId, metric, period_start: period, value: 1 });
  }
}

/**
 * Processa um job. Na Fase 1 os handlers de webhook apenas contabilizam
 * métricas reais e marcam o evento — Direct/comentários/automações entram
 * nas fases seguintes, sem mudar o contrato da fila.
 */
async function handleJob(
  db: SupabaseClient,
  job: { id: string; type: string; tenant_id: string | null; payload: Record<string, unknown> },
): Promise<void> {
  if (job.type.startsWith("webhook.")) {
    const eventId = job.payload.event_id as string | undefined;
    const field = job.type.slice("webhook.".length);

    if (field === "messages") await bumpUsage(db, job.tenant_id, "messages_received");
    if (field === "comments") await bumpUsage(db, job.tenant_id, "comments_processed");

    if (eventId) {
      await db
        .from("ig_webhook_events")
        .update({ status: "processed", processed_at: new Date().toISOString() })
        .eq("id", eventId);
    }
    return;
  }

  throw new Error(`unknown job type: ${job.type}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const db = serviceClient();

  const { data: jobs } = await db
    .from("ig_jobs")
    .select("id, type, tenant_id, payload, attempts, max_attempts")
    .eq("status", "pending")
    .lte("run_after", new Date().toISOString())
    .order("run_after", { ascending: true })
    .limit(BATCH_SIZE);

  let processed = 0;
  let failed = 0;

  for (const job of jobs ?? []) {
    // Claim otimista: só assume o job se ele ainda estiver pendente.
    const { data: claimed } = await db
      .from("ig_jobs")
      .update({ status: "running", attempts: job.attempts + 1 })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (!claimed) continue;

    try {
      await handleJob(db, job as never);
      await db.from("ig_jobs").update({ status: "done", last_error: null }).eq("id", job.id);
      processed++;
    } catch (error) {
      failed++;
      const attempts = job.attempts + 1;
      const isDead = attempts >= job.max_attempts;
      const backoffSeconds = Math.min(3600, 2 ** attempts * 10);
      const message = (error as Error).message.slice(0, 500);

      await db
        .from("ig_jobs")
        .update({
          status: isDead ? "dead" : "pending",
          last_error: message,
          run_after: new Date(Date.now() + backoffSeconds * 1000).toISOString(),
        })
        .eq("id", job.id);

      if (isDead && job.payload?.event_id) {
        await db
          .from("ig_webhook_events")
          .update({ status: "failed", error: message })
          .eq("id", job.payload.event_id as string);
      }
      console.error(`[ig-worker] job ${job.id} failed:`, message);
    }
  }

  return json({ success: true, picked: (jobs ?? []).length, processed, failed });
});
