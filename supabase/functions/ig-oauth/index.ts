/**
 * MRO INSTAGRAM (/IG) — OAuth oficial da Meta / Instagram.
 *
 * O App Secret e o access token nunca saem do backend.
 * Ações: get-config | exchange-code | refresh-status
 */
import {
  assertTenantMember,
  audit,
  clientIp,
  corsHeaders,
  fail,
  friendlyMetaError,
  getAuthUser,
  json,
  metaAppCredentials,
  rateLimit,
  serviceClient,
} from "../_shared/ig-core.ts";

/** Scopes base do produto — ajustar somente conforme o App Review aprovado na Meta. */
const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
  "instagram_business_content_publish",
  "instagram_business_manage_insights",
].join(",");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const db = serviceClient();

  try {
    const user = await getAuthUser(req);
    if (!user) return fail("Sessão inválida. Faça login novamente.", 401);

    if (!(await rateLimit(db, `ig-oauth:${user.id}`, 20, 60))) {
      return fail("Muitas tentativas de conexão. Aguarde um instante.", 429);
    }

    const { action, code, redirect_uri, tenant_id } = (await req.json().catch(() => ({}))) as {
      action?: string;
      code?: string;
      redirect_uri?: string;
      tenant_id?: string;
    };

    const { appId, appSecret } = metaAppCredentials();
    if (!appId || !appSecret) {
      return fail("Integração com a Meta ainda não está configurada.", 503, "meta_not_configured");
    }

    if (action === "get-config") {
      // Somente dados públicos: app id e scopes.
      return json({ success: true, app_id: appId, scopes: SCOPES });
    }

    if (action === "exchange-code") {
      if (!code || !redirect_uri || !tenant_id) {
        return fail("Dados incompletos para concluir a conexão.", 400);
      }
      if (!(await assertTenantMember(db, tenant_id, user.id, ["owner", "admin", "manager"]))) {
        return fail("Você não tem permissão para conectar contas neste workspace.", 403);
      }

      // Limite de contas do plano.
      const [{ data: tenant }, { count: accountCount }] = await Promise.all([
        db.from("ig_tenants").select("plan_id").eq("id", tenant_id).maybeSingle(),
        db
          .from("ig_accounts")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant_id)
          .is("deleted_at", null),
      ]);
      const { data: plan } = await db
        .from("ig_plans")
        .select("max_accounts")
        .eq("id", tenant?.plan_id ?? "solo")
        .maybeSingle();

      if (plan && (accountCount ?? 0) >= plan.max_accounts) {
        return fail("Limite de contas do seu plano atingido.", 402, "plan_limit");
      }

      // 1) Código -> token de curta duração
      const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          grant_type: "authorization_code",
          redirect_uri,
          code,
        }),
      });
      const tokenData = await tokenRes.json().catch(() => ({}));

      if (!tokenRes.ok || tokenData.error_type || tokenData.error_message || !tokenData.access_token) {
        const { userMessage, technical } = friendlyMetaError(tokenData);
        console.error("[ig-oauth] token exchange failed:", technical.slice(0, 300));
        await audit(db, {
          tenant_id,
          actor_user_id: user.id,
          actor_type: "meta",
          action: "instagram.connect",
          result: "failure",
          ip: clientIp(req),
          metadata: { stage: "token_exchange" },
        });
        return fail(userMessage, 400, "meta_error");
      }

      // 2) Token de longa duração
      const longRes = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${tokenData.access_token}`,
      );
      const longData = await longRes.json().catch(() => ({}));
      const accessToken: string = longData.access_token ?? tokenData.access_token;
      const expiresAt = longData.expires_in
        ? new Date(Date.now() + Number(longData.expires_in) * 1000).toISOString()
        : null;

      // 3) Perfil da conta
      const profileRes = await fetch(
        `https://graph.instagram.com/v21.0/me?fields=user_id,username,name,profile_picture_url,followers_count,media_count,account_type&access_token=${accessToken}`,
      );
      const profile = await profileRes.json().catch(() => ({}));

      if (!profileRes.ok || profile.error) {
        const { userMessage, technical } = friendlyMetaError(profile);
        console.error("[ig-oauth] profile fetch failed:", technical.slice(0, 300));
        return fail(userMessage, 400, "meta_error");
      }

      const instagramAccountId = String(profile.id ?? profile.user_id ?? "");
      if (!instagramAccountId) return fail("Não foi possível identificar sua conta do Instagram.", 400);

      // 4) Persistência (conta + token separados)
      const { data: account, error: accountError } = await db
        .from("ig_accounts")
        .upsert(
          {
            tenant_id,
            instagram_account_id: instagramAccountId,
            instagram_user_id: profile.user_id ? String(profile.user_id) : null,
            username: profile.username ?? null,
            name: profile.name ?? null,
            profile_picture_url: profile.profile_picture_url ?? null,
            followers_count: profile.followers_count ?? null,
            media_count: profile.media_count ?? null,
            account_type: profile.account_type ?? null,
            connection_state: "connected",
            is_active: true,
            deleted_at: null,
            last_synced_at: new Date().toISOString(),
            last_error: null,
          },
          { onConflict: "tenant_id,instagram_account_id" },
        )
        .select("id")
        .single();

      if (accountError || !account) {
        console.error("[ig-oauth] account persist failed:", accountError?.message);
        return fail("Não foi possível salvar sua conta. Tente novamente.", 500);
      }

      await db.from("ig_tokens").upsert(
        {
          tenant_id,
          ig_account_id: account.id,
          access_token: accessToken,
          token_type: "long_lived",
          expires_at: expiresAt,
        },
        { onConflict: "ig_account_id,token_type" },
      );

      await db.from("ig_tenants").update({ onboarding_done: true }).eq("id", tenant_id);

      await audit(db, {
        tenant_id,
        actor_user_id: user.id,
        action: "instagram.connected",
        target: instagramAccountId,
        ip: clientIp(req),
        metadata: { username: profile.username ?? null },
      });

      return json({
        success: true,
        account: {
          id: account.id,
          username: profile.username ?? null,
          name: profile.name ?? null,
          profile_picture_url: profile.profile_picture_url ?? null,
          followers_count: profile.followers_count ?? null,
          media_count: profile.media_count ?? null,
        },
      });
    }

    return fail("Ação não reconhecida.", 400);
  } catch (error) {
    console.error("[ig-oauth] unexpected error:", (error as Error).message);
    return fail("Não foi possível concluir a conexão. Tente novamente.", 500);
  }
});
