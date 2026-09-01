/**
 * MRO INSTAGRAM (/IG) — Worker da fila Postgres (substitui Redis + BullMQ).
 *
 * Retira lotes de ig_jobs pendentes, processa, aplica retry com backoff
 * exponencial e move para dead-letter ao esgotar as tentativas.
 * Pode ser acionado por cron ou manualmente.
 */
import { corsHeaders, json, serviceClient } from "../_shared/ig-core.ts";
import { autoRespondDirect } from "../_shared/ig-ai.ts";
import { igLog } from "../_shared/ig-log.ts";
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

/** Busca o perfil público do participante (best-effort, nunca derruba o job). */
async function fetchParticipant(
  db: SupabaseClient,
  accountRowId: string,
  participantId: string,
): Promise<{ username: string | null; name: string | null; picture: string | null }> {
  try {
    const { data: token } = await db
      .from("ig_tokens")
      .select("access_token")
      .eq("ig_account_id", accountRowId)
      .maybeSingle();
    if (!token?.access_token) return { username: null, name: null, picture: null };

    const res = await fetch(
      `https://graph.instagram.com/v21.0/${participantId}?fields=username,name,profile_pic&access_token=${token.access_token}`,
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) return { username: null, name: null, picture: null };
    return {
      username: data.username ?? null,
      name: data.name ?? null,
      picture: data.profile_pic ?? null,
    };
  } catch {
    return { username: null, name: null, picture: null };
  }
}

/** Grava um evento de Direct como conversa + mensagem do Inbox. */
async function persistDirect(
  db: SupabaseClient,
  tenantId: string,
  accountRowId: string,
  value: Record<string, unknown>,
): Promise<boolean> {
  const sender = (value.sender as { id?: string } | undefined)?.id ?? null;
  const recipient = (value.recipient as { id?: string } | undefined)?.id ?? null;
  const message = value.message as
    | { mid?: string; text?: string; is_echo?: boolean; is_deleted?: boolean; attachments?: unknown[] }
    | undefined;

  if (!message || !sender || !recipient || message.is_deleted) return false;

  const isEcho = Boolean(message.is_echo);
  const direction: "in" | "out" = isEcho ? "out" : "in";
  const participantId = isEcho ? recipient : sender;
  const sentAt = value.timestamp ? new Date(Number(value.timestamp)).toISOString() : new Date().toISOString();
  const text = message.text ?? null;
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];

  const { data: existing } = await db
    .from("ig_conversations")
    .select("id")
    .eq("ig_account_id", accountRowId)
    .eq("participant_id", participantId)
    .maybeSingle();
  const profile = existing ? null : await fetchParticipant(db, accountRowId, participantId);
  const { data: conversation, error: conversationError } = existing
    ? { data: existing, error: null }
    : await db
        .from("ig_conversations")
        .upsert(
          {
            tenant_id: tenantId,
            ig_account_id: accountRowId,
            participant_id: participantId,
            participant_username: profile?.username ?? null,
            participant_name: profile?.name ?? null,
            participant_picture_url: profile?.picture ?? null,
          },
          { onConflict: "ig_account_id,participant_id", ignoreDuplicates: true },
        )
        .select("id")
        .maybeSingle();

  // Em uma corrida, outro worker pode criar a conversa entre a leitura e o
  // upsert. Nesse caso, buscamos a linha vencedora sem perder a mensagem.
  let conversationId = conversation?.id as string | undefined;
  if (!conversationId && !conversationError) {
    const { data: racedConversation } = await db
      .from("ig_conversations")
      .select("id")
      .eq("ig_account_id", accountRowId)
      .eq("participant_id", participantId)
      .maybeSingle();
    conversationId = racedConversation?.id as string | undefined;
  }
  if (conversationError || !conversationId) throw new Error(conversationError?.message ?? "conversation persist failed");

  const { error: insertError } = await db.from("ig_messages").insert({
    tenant_id: tenantId,
    conversation_id: conversationId,
    ig_account_id: accountRowId,
    mid: message.mid ?? null,
    direction,
    text,
    attachments,
    sender_id: sender,
    recipient_id: recipient,
    sent_at: sentAt,
  });

  // Mensagem duplicada (mesmo mid) → nada a fazer.
  if (insertError && insertError.code !== "23505") throw new Error(insertError.message);
  if (insertError) return false;

  const preview = text ?? (attachments.length > 0 ? "[anexo]" : null);

  if (direction === "in") {
    const { data: conv } = await db
      .from("ig_conversations")
      .select("unread_count")
      .eq("id", conversationId)
      .maybeSingle();
    await db
      .from("ig_conversations")
      .update({
        last_message_text: preview,
        last_message_at: sentAt,
        last_direction: direction,
        unread_count: Number(conv?.unread_count ?? 0) + 1,
      })
      .eq("id", conversationId);
  } else {
    await db
      .from("ig_conversations")
      .update({ last_message_text: preview, last_message_at: sentAt, last_direction: direction })
      .eq("id", conversationId);
  }

  return direction === "in";
}


/** Cria/atualiza o contato do CRM a partir de uma interação real. */
async function upsertContact(
  db: SupabaseClient,
  tenantId: string,
  accountRowId: string,
  participantId: string,
  source: "direct" | "comment",
  interactionAt: string,
  username?: string | null,
  name?: string | null,
  picture?: string | null,
): Promise<void> {
  const { data: existing } = await db
    .from("ig_contacts")
    .select("id")
    .eq("ig_account_id", accountRowId)
    .eq("participant_id", participantId)
    .maybeSingle();

  if (existing) {
    await db
      .from("ig_contacts")
      .update({
        last_interaction_at: interactionAt,
        ...(username ? { username } : {}),
        ...(name ? { name } : {}),
        ...(picture ? { picture_url: picture } : {}),
      })
      .eq("id", existing.id);
    return;
  }

  await db.from("ig_contacts").insert({
    tenant_id: tenantId,
    ig_account_id: accountRowId,
    participant_id: participantId,
    username: username ?? null,
    name: name ?? null,
    picture_url: picture ?? null,
    source,
    last_interaction_at: interactionAt,
  });
}

/** Persiste um comentário recebido via webhook. */
async function persistComment(
  db: SupabaseClient,
  tenantId: string,
  accountRowId: string,
  value: Record<string, unknown>,
): Promise<boolean> {
  const commentId = (value.id as string | undefined) ?? null;
  if (!commentId) return false;

  const from = value.from as { id?: string; username?: string } | undefined;
  const media = value.media as { id?: string } | undefined;
  const mediaId = media?.id ?? null;
  const commentedAt = value.timestamp
    ? new Date(typeof value.timestamp === "number" ? Number(value.timestamp) * 1000 : String(value.timestamp)).toISOString()
    : new Date().toISOString();

  const { data: mediaRow } = mediaId
    ? await db
        .from("ig_media")
        .select("id")
        .eq("ig_account_id", accountRowId)
        .eq("media_id", mediaId)
        .maybeSingle()
    : { data: null };

  const { error } = await db.from("ig_comments").upsert(
    {
      tenant_id: tenantId,
      ig_account_id: accountRowId,
      media_row_id: mediaRow?.id ?? null,
      comment_id: commentId,
      media_id: mediaId,
      parent_comment_id: (value.parent_id as string | undefined) ?? null,
      from_id: from?.id ?? null,
      from_username: from?.username ?? null,
      text: (value.text as string | undefined) ?? null,
      commented_at: commentedAt,
    },
    { onConflict: "ig_account_id,comment_id" },
  );
  if (error) throw new Error(error.message);

  if (from?.id) {
    await upsertContact(db, tenantId, accountRowId, from.id, "comment", commentedAt, from.username ?? null);
  }
  return true;
}

/**
 * Processa um job. Eventos de Direct alimentam o Inbox em tempo real;
 * demais campos apenas contabilizam métricas reais.
 */
async function handleJob(
  db: SupabaseClient,
  job: { id: string; type: string; tenant_id: string | null; payload: Record<string, unknown> },
): Promise<void> {
  if (job.type.startsWith("webhook.")) {
    const eventId = job.payload.event_id as string | undefined;
    const accountRowId = job.payload.ig_account_id as string | undefined;
    const field = job.type.slice("webhook.".length);

    if (field === "messages" && eventId && accountRowId && job.tenant_id) {
      const { data: event } = await db
        .from("ig_webhook_events")
        .select("payload")
        .eq("id", eventId)
        .maybeSingle();

      const inbound = event?.payload
        ? await persistDirect(db, job.tenant_id, accountRowId, event.payload as Record<string, unknown>)
        : false;

      if (inbound) await bumpUsage(db, job.tenant_id, "messages_received");

      const sender = (event?.payload as { sender?: { id?: string } } | undefined)?.sender?.id;
      if (inbound && sender) {
        const { data: conv } = await db
          .from("ig_conversations")
          .select("id, participant_username, participant_name, participant_picture_url, last_message_at")
          .eq("ig_account_id", accountRowId)
          .eq("participant_id", sender)
          .maybeSingle();
        await upsertContact(
          db,
          job.tenant_id,
          accountRowId,
          sender,
          "direct",
          conv?.last_message_at ?? new Date().toISOString(),
          conv?.participant_username,
          conv?.participant_name,
          conv?.participant_picture_url,
        );

        // Atendimento automático: automações por palavra-chave e agente de IA.
        if (conv?.id) {
          const incomingText =
            ((event?.payload as { message?: { text?: string } } | undefined)?.message?.text ?? null) || null;
          try {
            await autoRespondDirect(db, {
              tenantId: job.tenant_id,
              conversationId: conv.id as string,
              incomingText,
            });
          } catch (error) {
            await igLog(db, {
              scope: "ig-agent",
              step: "auto_respond.exception",
              level: "error",
              tenant_id: job.tenant_id,
              ig_account_id: accountRowId,
              message: (error as Error).message,
            });
          }
        }
      }
    }

    if (field === "comments" && eventId && accountRowId && job.tenant_id) {
      const { data: event } = await db
        .from("ig_webhook_events")
        .select("payload")
        .eq("id", eventId)
        .maybeSingle();
      if (event?.payload) {
        await persistComment(db, job.tenant_id, accountRowId, event.payload as Record<string, unknown>);
      }
      await bumpUsage(db, job.tenant_id, "comments_processed");
    }

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
