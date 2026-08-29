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

type Action =
  | "bootstrap"
  | "me"
  | "dashboard"
  | "disconnect"
  | "notifications"
  | "conversations"
  | "messages"
  | "send_message"
  | "subscribe_webhook";


const PERIODS: Record<string, number> = { today: 1, "7d": 7, "30d": 30, "90d": 90 };

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

      const [{ data: accounts }, { data: usage }, { count: eventCount }] = await Promise.all([
        db
          .from("ig_accounts")
          .select("id, username, followers_count, media_count, connection_state, last_synced_at")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null),
        db.from("ig_usage").select("metric, value, period_start").eq("tenant_id", tenantId),
        db
          .from("ig_webhook_events")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .gte("received_at", since),
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
          media: accounts?.[0]?.media_count ?? null,
          messages_received: metrics.messages_received ?? null,
          messages_sent: metrics.messages_sent ?? null,
          comments_processed: metrics.comments_processed ?? null,
          automations_executed: metrics.automations_executed ?? null,
          leads: metrics.leads ?? null,
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
          "id, participant_id, participant_username, participant_name, participant_picture_url, last_message_text, last_message_at, last_direction, unread_count",
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
        .select("id")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      let subscribed = 0;
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
      }

      return json({ success: true, subscribed });
    }

    return fail("Ação não reconhecida.", 400);

  } catch (error) {
    console.error("[ig-api] unexpected error:", (error as Error).message);
    return fail("Erro interno. Tente novamente em instantes.", 500);
  }
});
