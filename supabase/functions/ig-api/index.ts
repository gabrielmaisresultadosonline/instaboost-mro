/**
 * MRO INSTAGRAM (/IG) — API principal do cliente.
 *
 * Ações:
 *  - bootstrap        : garante perfil + tenant (owner) para o usuário autenticado
 *  - me               : perfil, tenants, papel, plano, limites e contas conectadas
 *  - dashboard        : métricas reais do tenant no período (sem números fictícios)
 *  - disconnect       : remove conta do Instagram e seus tokens
 *  - notifications    : leitura das notificações do tenant
 */
import {
  assertTenantMember,
  audit,
  clientIp,
  corsHeaders,
  fail,
  getAuthUser,
  json,
  rateLimit,
  serviceClient,
} from "../_shared/ig-core.ts";
import {
  rebuildContacts,
  replyToComment,
  syncComments,
  syncMedia,
  syncProfile,
  type IgAccountRow,
} from "../_shared/ig-sync.ts";

import { generateAiReply, loadAiSettings } from "../_shared/ig-ai.ts";
import { igLog, loggedGraphFetch } from "../_shared/ig-log.ts";

type Action =
  | "bootstrap"
  | "me"
  | "dashboard"
  | "disconnect"
  | "notifications"
  | "conversations"
  | "messages"
  | "send_message"
  | "subscribe_webhook"
  | "sync_now"
  | "media"
  | "comments"
  | "reply_comment"
  | "contacts"
  | "update_contact"
  | "ai_settings"
  | "save_ai_settings"
  | "ai_suggest"
  | "set_ai_pause"
  | "automations"
  | "save_automation"
  | "delete_automation"
  | "logs"
  | "diag";

const GRAPH = "https://graph.instagram.com/v21.0";

const PERIODS: Record<string, number> = { today: 1, "7d": 7, "30d": 30, "90d": 90 };

interface MetaMessage {
  id?: string;
  created_time?: string;
  from?: { id?: string; username?: string; name?: string };
  to?: { data?: Array<{ id?: string; username?: string; name?: string }> };
  message?: string;
  attachments?: { data?: unknown[] };
}

interface MetaConversation {
  id?: string;
  updated_time?: string;
  participants?: { data?: Array<{ id?: string; username?: string; name?: string }> };
  messages?: { data?: MetaMessage[] };
}

/**
 * Importa conversas já existentes pela Conversations API oficial. Isso cobre
 * mensagens enviadas antes da assinatura do webhook e também recupera o Inbox
 * quando a Meta entrega apenas eventos auxiliares, como confirmações de leitura.
 */
async function syncInboxHistory(
  db: ReturnType<typeof serviceClient>,
  tenantId: string,
  account: { id: string; instagram_account_id: string | null; instagram_user_id: string | null },
  accessToken: string,
): Promise<{ conversations: number; messages: number }> {
  const params = new URLSearchParams({
    platform: "instagram",
    fields: "id,updated_time,participants,messages.limit(50){id,created_time,from,to,message,attachments}",
    limit: "50",
    access_token: accessToken,
  });
  const response = await fetch(`https://graph.instagram.com/v21.0/me/conversations?${params.toString()}`);
  const payload = (await response.json().catch(() => ({}))) as {
    data?: MetaConversation[];
    error?: { message?: string; code?: number };
  };

  if (!response.ok || payload.error) {
    const detail = payload.error?.message ?? `HTTP ${response.status}`;
    console.error(`[ig-api] inbox sync failed: ${detail.slice(0, 240)}`);
    throw new Error("Não foi possível sincronizar as conversas do Instagram.");
  }

  const ownIds = new Set(
    [account.instagram_account_id, account.instagram_user_id].filter((value): value is string => Boolean(value)),
  );
  let conversationCount = 0;
  let messageCount = 0;

  for (const conversation of payload.data ?? []) {
    const participants = conversation.participants?.data ?? [];
    const participant = participants.find((item) => item.id && !ownIds.has(String(item.id)));
    const fallbackMessage = conversation.messages?.data?.[0];
    const fallbackSender = fallbackMessage?.from?.id ? String(fallbackMessage.from.id) : null;
    const participantId = participant?.id
      ? String(participant.id)
      : fallbackSender && !ownIds.has(fallbackSender)
        ? fallbackSender
        : null;
    if (!participantId) continue;

    const { data: savedConversation, error: conversationError } = await db
      .from("ig_conversations")
      .upsert(
        {
          tenant_id: tenantId,
          ig_account_id: account.id,
          participant_id: participantId,
          participant_username: participant?.username ?? null,
          participant_name: participant?.name ?? null,
        },
        { onConflict: "ig_account_id,participant_id" },
      )
      .select("id")
      .single();

    if (conversationError || !savedConversation) {
      console.error("[ig-api] conversation sync persist failed:", conversationError?.message ?? "missing row");
      continue;
    }
    conversationCount++;

    const orderedMessages = [...(conversation.messages?.data ?? [])].reverse();
    let latest: { text: string | null; sentAt: string; direction: "in" | "out" } | null = null;

    for (const message of orderedMessages) {
      if (!message.id) continue;
      const senderId = message.from?.id ? String(message.from.id) : null;
      const recipientId = message.to?.data?.[0]?.id ? String(message.to.data[0].id) : null;
      const direction: "in" | "out" = senderId && ownIds.has(senderId) ? "out" : "in";
      const sentAt = message.created_time ?? conversation.updated_time ?? new Date().toISOString();
      const text = message.message ?? null;
      const attachments = message.attachments?.data ?? [];
      const { error: messageError } = await db.from("ig_messages").upsert(
        {
          tenant_id: tenantId,
          conversation_id: savedConversation.id,
          ig_account_id: account.id,
          mid: message.id,
          direction,
          text,
          attachments,
          sender_id: senderId,
          recipient_id: recipientId,
          sent_at: sentAt,
        },
        { onConflict: "mid" },
      );
      if (!messageError) {
        messageCount++;
        latest = { text: text ?? (attachments.length > 0 ? "[anexo]" : null), sentAt, direction };
      }
    }

    if (latest) {
      await db
        .from("ig_conversations")
        .update({
          last_message_text: latest.text,
          last_message_at: latest.sentAt,
          last_direction: latest.direction,
        })
        .eq("id", savedConversation.id);
    }
  }

  return { conversations: conversationCount, messages: messageCount };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const db = serviceClient();

  try {
    const user = await getAuthUser(req);
    if (!user) return fail("Sessão inválida. Faça login novamente.", 401, "unauthenticated");

    const allowed = await rateLimit(db, `ig-api:${user.id}`, 120, 60);
    if (!allowed) return fail("Muitas requisições. Aguarde alguns segundos.", 429, "rate_limited");

    const body = (await req.json().catch(() => ({}))) as {
      action?: Action;
      tenant_id?: string;
      account_id?: string;
      period?: string;
      full_name?: string;
      company?: string;
      conversation_id?: string;
      text?: string;
      comment_id?: string;
      contact_id?: string;
      stage?: string;
      notes?: string;
      only?: "reels" | "posts";
      settings?: Record<string, unknown>;
      automation?: Record<string, unknown>;
      automation_id?: string;
      paused?: boolean;
    };



    const action = body.action;
    if (!action) return fail("Ação não informada.", 400);

    // ---------------- BOOTSTRAP ----------------
    if (action === "bootstrap") {
      await db.from("ig_profiles").upsert(
        {
          user_id: user.id,
          email: user.email,
          full_name: body.full_name ?? null,
          company: body.company ?? null,
          last_login_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      const { data: membership } = await db
        .from("ig_tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!membership) {
        const tenantName = body.company?.trim() || body.full_name?.trim() || user.email || "Meu workspace";
        const { data: tenant, error: tenantError } = await db
          .from("ig_tenants")
          .insert({ name: tenantName, created_by: user.id, plan_id: "solo" })
          .select("id")
          .single();

        if (tenantError || !tenant) return fail("Não foi possível criar seu workspace.", 500);

        await db.from("ig_tenant_members").insert({
          tenant_id: tenant.id,
          user_id: user.id,
          role: "owner",
        });
        await db.from("ig_subscriptions").insert({
          tenant_id: tenant.id,
          plan_id: "solo",
          status: "trialing",
        });
        await db.from("ig_notification_settings").insert({ tenant_id: tenant.id });

        await audit(db, {
          tenant_id: tenant.id,
          actor_user_id: user.id,
          action: "tenant.created",
          ip: clientIp(req),
        });
      }

      return json({ success: true });
    }

    // ---------------- ME ----------------
    if (action === "me") {
      const [{ data: profile }, { data: memberships }] = await Promise.all([
        db.from("ig_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        db.from("ig_tenant_members").select("tenant_id, role").eq("user_id", user.id),
      ]);

      const tenantIds = (memberships ?? []).map((m) => m.tenant_id);

      const [{ data: tenants }, { data: accounts }, { data: superAdmin }] = await Promise.all([
        tenantIds.length
          ? db.from("ig_tenants").select("id, name, plan_id, onboarding_done, is_blocked").in("id", tenantIds)
          : Promise.resolve({ data: [] as unknown[] }),
        tenantIds.length
          ? db
              .from("ig_accounts")
              .select(
                "id, tenant_id, username, name, profile_picture_url, followers_count, media_count, connection_state, last_synced_at, webhook_subscribed, instagram_account_id",
              )
              .in("tenant_id", tenantIds)
              .is("deleted_at", null)
          : Promise.resolve({ data: [] as unknown[] }),
        db.from("ig_super_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
      ]);

      const { data: plans } = await db.from("ig_plans").select("*").eq("is_active", true);

      return json({
        success: true,
        profile: profile ?? null,
        memberships: memberships ?? [],
        tenants: tenants ?? [],
        accounts: accounts ?? [],
        plans: plans ?? [],
        is_super_admin: Boolean(superAdmin),
      });
    }

    // Ações seguintes exigem tenant válido do usuário.
    const tenantId = body.tenant_id;
    if (!tenantId) return fail("Workspace não informado.", 400);
    if (!(await assertTenantMember(db, tenantId, user.id))) {
      return fail("Você não tem acesso a este workspace.", 403, "forbidden");
    }

    // ---------------- DASHBOARD ----------------
    if (action === "dashboard") {
      const days = PERIODS[body.period ?? "30d"] ?? 30;
      const since = new Date(Date.now() - days * 86_400_000).toISOString();

      const countIn = (table: string, column: string) =>
        db
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .gte(column, since);

      const [
        { data: accounts },
        { data: usage },
        { count: eventCount },
        { count: receivedCount },
        { count: sentCount },
        { count: commentCount },
        { count: contactCount },
        { count: mediaCount },
      ] = await Promise.all([
        db
          .from("ig_accounts")
          .select("id, username, followers_count, media_count, connection_state, last_synced_at")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null),
        db.from("ig_usage").select("metric, value, period_start").eq("tenant_id", tenantId),
        countIn("ig_webhook_events", "received_at"),
        db
          .from("ig_messages")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("direction", "in")
          .gte("sent_at", since),
        db
          .from("ig_messages")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("direction", "out")
          .gte("sent_at", since),
        countIn("ig_comments", "commented_at"),
        countIn("ig_contacts", "created_at"),
        db
          .from("ig_media")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId),
      ]);

      const metrics = Object.fromEntries((usage ?? []).map((u) => [u.metric, Number(u.value)]));

      return json({
        success: true,
        period_days: days,
        has_account: (accounts ?? []).length > 0,
        accounts: accounts ?? [],
        // Somente dados reais. Ausência de dado retorna null → UI mostra "Sem dados disponíveis".
        metrics: {
          followers: accounts?.[0]?.followers_count ?? null,
          media: accounts?.[0]?.media_count ?? mediaCount ?? null,
          messages_received: receivedCount ?? 0,
          messages_sent: sentCount ?? 0,
          comments_processed: commentCount ?? 0,
          automations_executed: metrics.automations_executed ?? null,
          leads: contactCount ?? 0,
          ai_calls: metrics.ai_calls ?? null,
          webhook_events: eventCount ?? 0,

        },
      });
    }

    // ---------------- DISCONNECT ----------------
    if (action === "disconnect") {
      if (!body.account_id) return fail("Conta não informada.", 400);
      if (!(await assertTenantMember(db, tenantId, user.id, ["owner", "admin"]))) {
        return fail("Apenas o proprietário ou administrador pode desconectar contas.", 403);
      }

      await db.from("ig_tokens").delete().eq("ig_account_id", body.account_id).eq("tenant_id", tenantId);
      await db
        .from("ig_accounts")
        .update({ connection_state: "disconnected", is_active: false, deleted_at: new Date().toISOString() })
        .eq("id", body.account_id)
        .eq("tenant_id", tenantId);

      await audit(db, {
        tenant_id: tenantId,
        actor_user_id: user.id,
        action: "instagram.disconnected",
        target: body.account_id,
        ip: clientIp(req),
      });

      return json({ success: true });
    }

    // ---------------- NOTIFICATIONS ----------------
    if (action === "notifications") {
      const { data } = await db
        .from("ig_notifications")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(50);

      return json({ success: true, notifications: data ?? [] });
    }

    // ---------------- INBOX: LISTA DE CONVERSAS ----------------
    if (action === "conversations") {
      const { data } = await db
        .from("ig_conversations")
        .select(
          "id, participant_id, participant_username, participant_name, participant_picture_url, last_message_text, last_message_at, last_direction, unread_count, ai_paused",
        )
        .eq("tenant_id", tenantId)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(100);

      return json({ success: true, conversations: data ?? [] });
    }

    // ---------------- INBOX: MENSAGENS DE UMA CONVERSA ----------------
    if (action === "messages") {
      if (!body.conversation_id) return fail("Conversa não informada.", 400);

      const { data } = await db
        .from("ig_messages")
        .select("id, direction, text, attachments, sent_at")
        .eq("tenant_id", tenantId)
        .eq("conversation_id", body.conversation_id)
        .order("sent_at", { ascending: true })
        .limit(300);

      await db
        .from("ig_conversations")
        .update({ unread_count: 0 })
        .eq("id", body.conversation_id)
        .eq("tenant_id", tenantId);

      return json({ success: true, messages: data ?? [] });
    }

    // ---------------- INBOX: RESPONDER ----------------
    if (action === "send_message") {
      const text = (body.text ?? "").trim();
      if (!body.conversation_id) return fail("Conversa não informada.", 400);
      if (!text) return fail("Escreva uma mensagem antes de enviar.", 400);
      if (text.length > 950) return fail("A mensagem excede o limite do Instagram (950 caracteres).", 400);

      const { data: conversation } = await db
        .from("ig_conversations")
        .select("id, participant_id, ig_account_id")
        .eq("id", body.conversation_id)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (!conversation) return fail("Conversa não encontrada.", 404);

      const { data: token } = await db
        .from("ig_tokens")
        .select("access_token")
        .eq("ig_account_id", conversation.ig_account_id)
        .maybeSingle();

      if (!token?.access_token) {
        return fail("Conta do Instagram sem autorização válida. Reconecte em Configurações.", 400, "needs_reconnect");
      }

      const res = await fetch("https://graph.instagram.com/v21.0/me/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: conversation.participant_id },
          message: { text },
          access_token: token.access_token,
        }),
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok || result.error) {
        console.error("[ig-api] send_message failed:", JSON.stringify(result).slice(0, 300));
        const metaMessage = (result?.error?.error_user_msg as string | undefined) ?? null;
        return fail(
          metaMessage ??
            "O Instagram não aceitou o envio. Só é possível responder dentro de 24h após a última mensagem do usuário.",
          400,
          "meta_error",
        );
      }

      const sentAt = new Date().toISOString();
      await db.from("ig_messages").insert({
        tenant_id: tenantId,
        conversation_id: conversation.id,
        ig_account_id: conversation.ig_account_id,
        mid: (result.message_id as string | undefined) ?? null,
        direction: "out",
        text,
        sender_id: null,
        recipient_id: conversation.participant_id,
        sent_at: sentAt,
      });

      await db
        .from("ig_conversations")
        .update({ last_message_text: text, last_message_at: sentAt, last_direction: "out", unread_count: 0 })
        .eq("id", conversation.id);

      return json({ success: true, sent_at: sentAt });
    }

    // ---------------- ASSINAR WEBHOOK DA CONTA ----------------
    if (action === "subscribe_webhook") {
      const { data: accounts } = await db
        .from("ig_accounts")
        .select("id, instagram_account_id, instagram_user_id")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      let subscribed = 0;
      let syncedConversations = 0;
      let syncedMessages = 0;
      let syncError: string | null = null;
      for (const account of accounts ?? []) {
        const { data: token } = await db
          .from("ig_tokens")
          .select("access_token")
          .eq("ig_account_id", account.id)
          .maybeSingle();
        if (!token?.access_token) continue;

        const res = await fetch(
          `https://graph.instagram.com/v21.0/me/subscribed_apps?subscribed_fields=messages,comments,live_comments,message_reactions&access_token=${token.access_token}`,
          { method: "POST" },
        );
        const result = await res.json().catch(() => ({}));
        const ok = res.ok && result.success !== false && !result.error;
        if (!ok) console.error("[ig-api] subscribe failed:", JSON.stringify(result).slice(0, 300));
        await db.from("ig_accounts").update({ webhook_subscribed: ok }).eq("id", account.id);
        if (ok) subscribed++;

        try {
          const synced = await syncInboxHistory(db, tenantId, account, token.access_token);
          syncedConversations += synced.conversations;
          syncedMessages += synced.messages;
        } catch (error) {
          syncError = error instanceof Error ? error.message : "Falha ao sincronizar o histórico.";
        }
      }

      return json({
        success: true,
        subscribed,
        synced_conversations: syncedConversations,
        synced_messages: syncedMessages,
        sync_error: syncError,
      });
    }

    // ---------------- SINCRONIZAÇÃO COMPLETA (perfil, mídias, comentários, inbox, CRM) ----------------
    if (action === "sync_now") {
      const { data: accounts } = await db
        .from("ig_accounts")
        .select("id, tenant_id, instagram_account_id, instagram_user_id")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      if (!accounts || accounts.length === 0) {
        return fail("Nenhuma conta do Instagram conectada neste workspace.", 400, "no_account");
      }

      const summary = {
        profile: 0,
        media: 0,
        comments: 0,
        conversations: 0,
        messages: 0,
        contacts: 0,
        errors: [] as string[],
      };

      for (const account of accounts as IgAccountRow[]) {
        const { data: token } = await db
          .from("ig_tokens")
          .select("access_token")
          .eq("ig_account_id", account.id)
          .maybeSingle();

        if (!token?.access_token) {
          summary.errors.push("Conta sem autorização válida. Reconecte em Configurações.");
          await db.from("ig_accounts").update({ connection_state: "needs_reconnect" }).eq("id", account.id);
          continue;
        }

        const t0 = Date.now();
        const profile = await syncProfile(db, account, token.access_token);
        if (profile.ok) summary.profile += profile.count;
        else if (profile.error) summary.errors.push(`Perfil: ${profile.error}`);
        console.log(`[ig-api] sync profile ok=${profile.ok} (${Date.now() - t0}ms)`);

        const t1 = Date.now();
        const media = await syncMedia(db, account, token.access_token);
        if (media.ok) summary.media += media.count;
        else if (media.error) summary.errors.push(`Mídias: ${media.error}`);
        console.log(`[ig-api] sync media=${media.count} ok=${media.ok} (${Date.now() - t1}ms)`);

        const t2 = Date.now();
        const comments = await syncComments(db, account, token.access_token);
        summary.comments += comments.count;
        if (comments.error) summary.errors.push(`Comentários: ${comments.error}`);
        console.log(`[ig-api] sync comments=${comments.count} (${Date.now() - t2}ms)`);

        try {
          const t3 = Date.now();
          const inbox = await syncInboxHistory(db, tenantId, account, token.access_token);
          summary.conversations += inbox.conversations;
          summary.messages += inbox.messages;
          console.log(
            `[ig-api] sync inbox conversations=${inbox.conversations} messages=${inbox.messages} (${Date.now() - t3}ms)`,
          );
        } catch (error) {
          summary.errors.push(`Directs: ${(error as Error).message}`);
        }

        const contacts = await rebuildContacts(db, account);
        summary.contacts += contacts.count;
        console.log(`[ig-api] sync contacts=${contacts.count}; total ${Date.now() - t0}ms`);
      }


      await audit(db, {
        tenant_id: tenantId,
        actor_user_id: user.id,
        action: "instagram.synced",
        ip: clientIp(req),
        metadata: { ...summary, errors: summary.errors.length },
      });

      return json({ success: true, ...summary });
    }

    // ---------------- MÍDIAS / REELS ----------------
    if (action === "media") {
      let query = db
        .from("ig_media")
        .select(
          "id, media_id, media_type, media_product_type, caption, permalink, media_url, thumbnail_url, like_count, comments_count, views_count, reach, saved, shares, published_at",
        )
        .eq("tenant_id", tenantId)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(100);

      if (body.only === "reels") query = query.eq("media_product_type", "REELS");
      if (body.only === "posts") query = query.neq("media_product_type", "REELS");

      const { data } = await query;
      return json({ success: true, media: data ?? [] });
    }

    // ---------------- COMENTÁRIOS ----------------
    if (action === "comments") {
      const { data } = await db
        .from("ig_comments")
        .select(
          "id, comment_id, media_id, from_username, text, is_own, replied, hidden, commented_at, media_row_id",
        )
        .eq("tenant_id", tenantId)
        .eq("is_own", false)
        .order("commented_at", { ascending: false, nullsFirst: false })
        .limit(200);

      const mediaIds = [...new Set((data ?? []).map((c) => c.media_row_id).filter(Boolean))] as string[];
      const { data: media } = mediaIds.length
        ? await db.from("ig_media").select("id, permalink, thumbnail_url, media_url, caption").in("id", mediaIds)
        : { data: [] as unknown[] };

      return json({ success: true, comments: data ?? [], media: media ?? [] });
    }

    // ---------------- RESPONDER COMENTÁRIO ----------------
    if (action === "reply_comment") {
      const text = (body.text ?? "").trim();
      if (!body.comment_id) return fail("Comentário não informado.", 400);
      if (!text) return fail("Escreva uma resposta antes de enviar.", 400);
      if (text.length > 2200) return fail("A resposta excede o limite do Instagram.", 400);

      const { data: comment } = await db
        .from("ig_comments")
        .select("id, comment_id, ig_account_id")
        .eq("id", body.comment_id)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (!comment) return fail("Comentário não encontrado.", 404);

      const { data: token } = await db
        .from("ig_tokens")
        .select("access_token")
        .eq("ig_account_id", comment.ig_account_id)
        .maybeSingle();

      if (!token?.access_token) {
        return fail("Conta sem autorização válida. Reconecte em Configurações.", 400, "needs_reconnect");
      }

      try {
        await replyToComment(comment.comment_id, text, token.access_token);
      } catch (error) {
        return fail((error as Error).message, 400, "meta_error");
      }

      await db.from("ig_comments").update({ replied: true }).eq("id", comment.id);
      return json({ success: true });
    }

    // ---------------- CONTATOS / CRM ----------------
    if (action === "contacts") {
      const { data } = await db
        .from("ig_contacts")
        .select("id, participant_id, username, name, picture_url, stage, source, notes, last_interaction_at, created_at")
        .eq("tenant_id", tenantId)
        .order("last_interaction_at", { ascending: false, nullsFirst: false })
        .limit(500);

      return json({ success: true, contacts: data ?? [] });
    }

    if (action === "update_contact") {
      if (!body.contact_id) return fail("Contato não informado.", 400);
      const stages = ["novo", "contato", "qualificado", "negociacao", "cliente", "perdido"];
      const patch: Record<string, unknown> = {};
      if (body.stage !== undefined) {
        if (!stages.includes(body.stage)) return fail("Etapa inválida.", 400);
        patch.stage = body.stage;
      }
      if (body.notes !== undefined) patch.notes = body.notes.slice(0, 2000);
      if (Object.keys(patch).length === 0) return fail("Nada para atualizar.", 400);

      const { error } = await db
        .from("ig_contacts")
        .update(patch)
        .eq("id", body.contact_id)
        .eq("tenant_id", tenantId);

      if (error) return fail("Não foi possível atualizar o contato.", 500);
      return json({ success: true });
    }

    // ---------------- AGENTE DE IA ----------------
    if (action === "ai_settings") {
      const settings = await loadAiSettings(db, tenantId);
      return json({ success: true, settings });
    }

    if (action === "save_ai_settings") {
      if (!(await assertTenantMember(db, tenantId, user.id, ["owner", "admin"]))) {
        return fail("Apenas o proprietário ou administrador pode configurar a IA.", 403);
      }
      await loadAiSettings(db, tenantId);

      const input = (body.settings ?? {}) as Record<string, unknown>;
      const allowedModels = ["google/gemini-2.5-flash", "google/gemini-2.5-pro", "google/gemini-2.5-flash-lite"];
      const patch: Record<string, unknown> = {};

      if (typeof input.enabled === "boolean") patch.enabled = input.enabled;
      if (typeof input.auto_reply === "boolean") patch.auto_reply = input.auto_reply;
      if (typeof input.model === "string") {
        if (!allowedModels.includes(input.model)) return fail("Modelo de IA não suportado.", 400);
        patch.model = input.model;
      }
      for (const field of ["tone", "persona", "business_context", "knowledge", "greeting"]) {
        if (typeof input[field] === "string") patch[field] = String(input[field]).slice(0, 6000);
      }
      if (Array.isArray(input.handoff_keywords)) {
        patch.handoff_keywords = input.handoff_keywords
          .map((value) => String(value).trim().slice(0, 80))
          .filter(Boolean)
          .slice(0, 30);
      }
      if (input.max_replies_per_conversation !== undefined) {
        const value = Number(input.max_replies_per_conversation);
        if (!Number.isFinite(value) || value < 1 || value > 50) return fail("Limite de respostas inválido (1 a 50).", 400);
        patch.max_replies_per_conversation = Math.round(value);
      }
      if (Object.keys(patch).length === 0) return fail("Nada para atualizar.", 400);

      const { error } = await db.from("ig_ai_settings").update(patch).eq("tenant_id", tenantId);
      if (error) return fail("Não foi possível salvar as configurações da IA.", 500);

      await audit(db, {
        tenant_id: tenantId,
        actor_user_id: user.id,
        action: "ai.settings_updated",
        ip: clientIp(req),
        metadata: { fields: Object.keys(patch) },
      });
      const settings = await loadAiSettings(db, tenantId);
      return json({ success: true, settings });
    }

    if (action === "ai_suggest") {
      if (!body.conversation_id) return fail("Conversa não informada.", 400);
      const settings = await loadAiSettings(db, tenantId);
      if (!settings.enabled) return fail("Ative o agente de IA em /IG/ai antes de gerar sugestões.", 400, "ai_disabled");

      const { data: conversation } = await db
        .from("ig_conversations")
        .select("id, participant_username, participant_id, last_message_text")
        .eq("id", body.conversation_id)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!conversation) return fail("Conversa não encontrada.", 404);

      const draft = await generateAiReply(db, {
        settings,
        conversationId: conversation.id,
        participant: conversation.participant_username ?? "cliente",
        incomingText: (body.text ?? conversation.last_message_text ?? null) as string | null,
        tenantId,
      });
      if (!draft) return fail("A IA não conseguiu gerar a resposta agora. Veja os detalhes em /IG/diagnostico.", 400, "ai_error");
      return json({ success: true, draft });
    }

    if (action === "set_ai_pause") {
      if (!body.conversation_id) return fail("Conversa não informada.", 400);
      const paused = Boolean(body.paused);
      const { error } = await db
        .from("ig_conversations")
        .update({ ai_paused: paused, ...(paused ? {} : { ai_replies_count: 0 }) })
        .eq("id", body.conversation_id)
        .eq("tenant_id", tenantId);
      if (error) return fail("Não foi possível alterar o modo de atendimento.", 500);
      return json({ success: true, ai_paused: paused });
    }

    // ---------------- AUTOMAÇÕES ----------------
    if (action === "automations") {
      const { data } = await db
        .from("ig_automations")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("priority", { ascending: true });
      return json({ success: true, automations: data ?? [] });
    }

    if (action === "save_automation") {
      if (!(await assertTenantMember(db, tenantId, user.id, ["owner", "admin", "manager"]))) {
        return fail("Você não tem permissão para editar automações.", 403);
      }
      const input = (body.automation ?? {}) as Record<string, unknown>;
      const name = String(input.name ?? "").trim();
      const replyText = String(input.reply_text ?? "").trim();
      const channel = String(input.channel ?? "direct");
      const matchType = String(input.match_type ?? "contains");

      if (!name) return fail("Dê um nome para a automação.", 400);
      if (!replyText) return fail("Escreva a resposta automática.", 400);
      if (replyText.length > 900) return fail("A resposta excede 900 caracteres.", 400);
      if (!["direct", "comment"].includes(channel)) return fail("Canal inválido.", 400);
      if (!["contains", "exact", "any", "starts_with"].includes(matchType)) return fail("Tipo de gatilho inválido.", 400);

      const keywords = Array.isArray(input.keywords)
        ? input.keywords.map((value) => String(value).trim().slice(0, 80)).filter(Boolean).slice(0, 50)
        : [];
      if (matchType !== "any" && keywords.length === 0) return fail("Informe ao menos uma palavra-chave.", 400);

      const payload = {
        tenant_id: tenantId,
        name: name.slice(0, 120),
        channel,
        match_type: matchType,
        keywords,
        reply_text: replyText,
        is_active: input.is_active === undefined ? true : Boolean(input.is_active),
        priority: Number.isFinite(Number(input.priority)) ? Math.round(Number(input.priority)) : 100,
      };

      if (input.id) {
        const { error } = await db
          .from("ig_automations")
          .update(payload)
          .eq("id", String(input.id))
          .eq("tenant_id", tenantId);
        if (error) return fail("Não foi possível salvar a automação.", 500);
      } else {
        const { error } = await db.from("ig_automations").insert({ ...payload, created_by: user.id });
        if (error) return fail("Não foi possível criar a automação.", 500);
      }
      return json({ success: true });
    }

    if (action === "delete_automation") {
      if (!body.automation_id) return fail("Automação não informada.", 400);
      const { error } = await db
        .from("ig_automations")
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq("id", body.automation_id)
        .eq("tenant_id", tenantId);
      if (error) return fail("Não foi possível remover a automação.", 500);
      return json({ success: true });
    }

    // ---------------- LOGS TÉCNICOS ----------------
    if (action === "logs") {
      const { data } = await db
        .from("ig_diag_logs")
        .select("id, scope, step, level, http_status, duration_ms, message, detail, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(200);
      return json({ success: true, logs: data ?? [] });
    }

    // ---------------- DIAGNÓSTICO DA CONEXÃO COM A META ----------------
    if (action === "diag") {
      const { data: accounts } = await db
        .from("ig_accounts")
        .select("id, username, connection_state, webhook_subscribed, last_synced_at, instagram_account_id")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      if (!accounts || accounts.length === 0) {
        return json({ success: true, report: [], hint: "Nenhuma conta do Instagram conectada neste workspace." });
      }

      const report: unknown[] = [];
      for (const account of accounts) {
        const { data: token } = await db
          .from("ig_tokens")
          .select("access_token, expires_at")
          .eq("ig_account_id", account.id)
          .maybeSingle();

        if (!token?.access_token) {
          await igLog(db, {
            scope: "ig-diag",
            step: "token.missing",
            level: "error",
            tenant_id: tenantId,
            ig_account_id: account.id,
            message: "Conta sem token salvo — refaça a conexão do Instagram.",
          });
          report.push({ account: account.username, token: null, probes: [] });
          continue;
        }

        const t = token.access_token as string;
        const probes = [];
        for (const [step, url] of [
          ["me", `${GRAPH}/me?fields=id,user_id,username,followers_count,media_count&access_token=${t}`],
          ["me/media", `${GRAPH}/me/media?fields=id,media_type,permalink,timestamp&limit=3&access_token=${t}`],
          [
            "me/conversations",
            `${GRAPH}/me/conversations?platform=instagram&fields=id,updated_time,participants&limit=5&access_token=${t}`,
          ],
          ["subscribed_apps", `${GRAPH}/me/subscribed_apps?access_token=${t}`],
        ] as Array<[string, string]>) {
          const result = await loggedGraphFetch(
            db,
            { scope: "ig-diag", step, tenant_id: tenantId, ig_account_id: account.id },
            url,
          );
          probes.push({
            step,
            ok: result.ok,
            http: result.status,
            count: Array.isArray(result.payload.data) ? (result.payload.data as unknown[]).length : null,
            error: result.error ?? null,
          });
        }

        const counts: Record<string, number> = {};
        for (const table of ["ig_media", "ig_comments", "ig_conversations", "ig_messages", "ig_contacts"]) {
          const { count } = await db
            .from(table)
            .select("id", { count: "exact", head: true })
            .eq("ig_account_id", account.id);
          counts[table] = count ?? 0;
        }

        const { count: pendingJobs } = await db
          .from("ig_jobs")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "pending");

        report.push({
          account: {
            username: account.username,
            connection_state: account.connection_state,
            webhook_subscribed: account.webhook_subscribed,
            last_synced_at: account.last_synced_at,
          },
          token_expires_at: token.expires_at,
          db_counts: counts,
          pending_jobs: pendingJobs ?? 0,
          probes,
        });
      }

      return json({ success: true, report });
    }

    return fail("Ação não reconhecida.", 400);


  } catch (error) {
    console.error("[ig-api] unexpected error:", (error as Error).message);
    return fail("Erro interno. Tente novamente em instantes.", 500);
  }
});
