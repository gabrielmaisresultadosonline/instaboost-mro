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
  | "notifications";

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

    return fail("Ação não reconhecida.", 400);
  } catch (error) {
    console.error("[ig-api] unexpected error:", (error as Error).message);
    return fail("Erro interno. Tente novamente em instantes.", 500);
  }
});
