import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Vitalício threshold — qualquer valor >= 999999 é considerado acesso vitalício. */
const LIFETIME_DAYS = 999999;
/** Testes gratuitos por mês, cada um com duração de 1 dia. */
const MONTHLY_TRIALS = 5;
const DEFAULT_PLAN_ACCOUNTS = 4;
const PAGE_SIZE = 1000;

/** SHA-256 (Web Crypto) — mesmo padrão usado nas demais APIs do projeto. */
async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface MroUserRow {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  password_hash: string | null;
  plan_accounts: number;
  /** Contas liberadas além do plano (extras concedidos pelo admin). */
  extra_accounts?: number | null;
  expiration_days: number;
  is_active: boolean;
  trials_used: number;
  trials_period_start: string;
  last_access: string | null;
  created_at: string;
}

interface MroAccountRow {
  id: string;
  user_id: string;
  instagram_username: string;
  is_trial: boolean;
  trial_expires_at: string | null;
  created_at: string;
}

interface ProfileScreenshotRow {
  squarecloud_username: string | null;
  instagram_username: string | null;
  profile_screenshot_url: string | null;
  updated_at: string | null;
}

async function fetchAllRows<Row>(
  queryFactory: () => { range: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }> },
): Promise<{ data: Row[]; error: string | null }> {
  const rows: Row[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await queryFactory().range(from, to);

    if (error) return { data: rows, error: error.message };

    const page = data || [];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
  }

  return { data: rows, error: null };
}

const monthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
};

/**
 * Normaliza os dias de acesso:
 * - valores inválidos/negativos viram 0
 * - qualquer valor >= 9999 é tratado como vitalício (LIFETIME_DAYS = 999999)
 * Isso evita o erro "out of range for type integer" na importação.
 */
function normalizeExpiration(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n >= 9999 ? LIFETIME_DAYS : n;
}

function planInfo(user: MroUserRow) {
  const lifetime = user.expiration_days >= LIFETIME_DAYS;
  return {
    plan_type: lifetime ? "vitalicio" : user.expiration_days > 365 ? "anual+" : user.expiration_days > 31 ? "anual" : "mensal",
    lifetime,
    days_remaining: lifetime ? LIFETIME_DAYS : user.expiration_days,
    access_allowed: user.is_active && (lifetime || user.expiration_days > 0),
  };
}

/**
 * Limite real de contas fixas do usuário.
 * Soma as contas do plano com os extras liberados manualmente pelo admin.
 */
function totalSlots(user: MroUserRow): number {
  const plan = Math.max(0, Number(user.plan_accounts) || 0);
  const extra = Math.max(0, Number(user.extra_accounts) || 0);
  return plan + extra;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const raw = await req.text();
    let body: Record<string, any> = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return json({ success: false, error: "Corpo da requisição inválido" }, 400);
    }

    const action = String(body.action || "");

    /** Busca usuário por username OU email. */
    async function findUser(identifier: string): Promise<MroUserRow | null> {
      const id = identifier.trim().toLowerCase();
      if (!id) return null;
      const { data } = await supabase
        .from("mro_tool_users")
        .select("*")
        .or(`username.eq.${id},email.eq.${id}`)
        .limit(1);
      return (data?.[0] as MroUserRow) || null;
    }

    /** Remove contas de teste expiradas e devolve as contas válidas. */
    async function getAccounts(userId: string): Promise<MroAccountRow[]> {
      await supabase
        .from("mro_tool_accounts")
        .delete()
        .eq("user_id", userId)
        .eq("is_trial", true)
        .lt("trial_expires_at", new Date().toISOString());

      const { data } = await supabase
        .from("mro_tool_accounts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      return (data || []) as MroAccountRow[];
    }

    /**
     * Resolve onde um @instagram está cadastrado para o usuário informado.
     * Fontes verificadas:
     *  1. mro_tool_accounts       -> contas do plano (fixas) e contas de teste (1 dia)
     *  2. free_trial_registrations-> perfis do teste grátis (ainda válidos)
     *  3. squarecloud_user_profiles-> perfis já cadastrados na área /instagram
     */
    async function resolveInstagram(user: MroUserRow, instagram: string) {
      const ig = instagram.trim().toLowerCase().replace(/^@/, "");

      const accounts = await getAccounts(user.id);
      const match = accounts.find((a) => a.instagram_username.toLowerCase().replace(/^@/, "") === ig);
      if (match) {
        return {
          registered: true,
          source: match.is_trial ? "trial_account" : "plan_account",
          is_trial: match.is_trial,
          trial_expires_at: match.trial_expires_at,
        };
      }

      // Teste grátis (free_trial_registrations)
      const { data: freeTrials } = await supabase
        .from("free_trial_registrations")
        .select("instagram_username, expires_at, instagram_removed, generated_username, email")
        .ilike("instagram_username", ig)
        .limit(5);

      const validTrial = (freeTrials || []).find((t: any) => {
        if (t.instagram_removed) return false;
        if (t.expires_at && new Date(t.expires_at).getTime() < Date.now()) return false;
        const owner = String(t.generated_username || "").toLowerCase();
        const mail = String(t.email || "").toLowerCase();
        return owner === user.username?.toLowerCase() || (!!user.email && mail === user.email.toLowerCase());
      });

      if (validTrial) {
        return {
          registered: true,
          source: "free_trial",
          is_trial: true,
          trial_expires_at: (validTrial as any).expires_at || null,
        };
      }

      // Perfis já cadastrados na área /instagram
      const { data: profiles } = await supabase
        .from("squarecloud_user_profiles")
        .select("instagram_username, squarecloud_username")
        .ilike("instagram_username", ig)
        .limit(10);

      const profileMatch = (profiles || []).find(
        (p: any) => String(p.squarecloud_username || "").toLowerCase() === user.username?.toLowerCase(),
      );
      if (profileMatch) {
        return { registered: true, source: "instagram_area", is_trial: false, trial_expires_at: null };
      }

      return { registered: false, source: null, is_trial: false, trial_expires_at: null };
    }


    /** Reinicia o contador de testes quando muda o mês. */
    async function ensureTrialPeriod(user: MroUserRow): Promise<MroUserRow> {
      const start = monthStart();
      if (user.trials_period_start >= start) return user;
      await supabase
        .from("mro_tool_users")
        .update({ trials_used: 0, trials_period_start: start })
        .eq("id", user.id);
      return { ...user, trials_used: 0, trials_period_start: start };
    }

    async function fullPayload(user: MroUserRow) {
      const accounts = await getAccounts(user.id);
      const fixed = accounts.filter((a) => !a.is_trial);
      const trials = accounts.filter((a) => a.is_trial);
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          is_active: user.is_active,
          plan_accounts: user.plan_accounts,
          extra_accounts: Math.max(0, Number(user.extra_accounts) || 0),
          total_accounts: totalSlots(user),
          expiration_days: user.expiration_days,
          last_access: user.last_access,
          created_at: user.created_at,
          ...planInfo(user),
        },
        accounts: fixed,
        trial_accounts: trials,
        trials: {
          limit: MONTHLY_TRIALS,
          used: user.trials_used,
          remaining: Math.max(0, MONTHLY_TRIALS - user.trials_used),
          duration_days: 1,
          period_start: user.trials_period_start,
        },
        slots: {
          total: totalSlots(user),
          used: fixed.length,
          available: Math.max(0, totalSlots(user) - fixed.length),
        },
      };
    }

    // ---------------- PÚBLICO ----------------
    if (action === "login") {
      const identifier = String(body.username || body.email || body.identifier || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!identifier || !password) return json({ success: false, error: "Usuário/email e senha são obrigatórios" }, 400);
      if (identifier.length > 255 || password.length > 255) return json({ success: false, error: "Credenciais inválidas" }, 400);

      let user = await findUser(identifier);
      if (!user || !user.password_hash) return json({ success: false, error: "Usuário ou senha incorretos" });

      const hash = await sha256(password);
      if (hash !== user.password_hash) return json({ success: false, error: "Usuário ou senha incorretos" });

      const info = planInfo(user);
      if (!info.access_allowed) return json({ success: false, error: "Acesso expirado ou desativado", needs_renewal: true });

      user = await ensureTrialPeriod(user);

      // Verificação opcional do @instagram que está logado na extensão.
      // Se o instagram for enviado e NÃO estiver cadastrado, o login é negado.
      const loginInstagram = String(body.instagram || body.instagram_username || "").trim().toLowerCase().replace(/^@/, "");
      if (loginInstagram) {
        const check = await resolveInstagram(user, loginInstagram);
        if (!check.registered) {
          return json({
            success: false,
            instagram_not_registered: true,
            instagram: loginInstagram,
            error: `O Instagram @${loginInstagram} não está cadastrado na sua conta. Cadastre o perfil na área /instagram antes de usar a ferramenta.`,
          });
        }
        await supabase.from("mro_tool_users").update({ last_access: new Date().toISOString() }).eq("id", user.id);
        return json({
          success: true,
          instagram_verified: true,
          instagram: { username: loginInstagram, ...check },
          ...(await fullPayload(user)),
        });
      }

      await supabase.from("mro_tool_users").update({ last_access: new Date().toISOString() }).eq("id", user.id);

      return json({ success: true, ...(await fullPayload(user)) });
    }

    if (action === "verify_user") {
      const identifier = String(body.username || body.email || body.identifier || "").trim().toLowerCase();
      if (!identifier) return json({ success: false, error: "Usuário ou email é obrigatório" }, 400);
      let user = await findUser(identifier);
      if (!user) return json({ success: false, error: "Usuário não encontrado" });
      user = await ensureTrialPeriod(user);
      return json({ success: true, ...(await fullPayload(user)) });
    }

    /** Verifica se o @instagram está cadastrado (plano, teste de 1 dia, teste grátis ou área /instagram). */
    if (action === "verify_instagram" || action === "check_instagram") {
      const identifier = String(body.username || body.email || body.identifier || "").trim().toLowerCase();
      const instagram = String(body.instagram || body.instagram_username || "").trim().toLowerCase().replace(/^@/, "");
      if (!identifier || !instagram) return json({ success: false, error: "Usuário e conta do Instagram são obrigatórios" }, 400);

      const user = await findUser(identifier);
      if (!user) return json({ success: false, error: "Usuário não encontrado" });
      const info = planInfo(user);
      if (!info.access_allowed) return json({ success: false, allowed: false, error: "Acesso expirado ou desativado", needs_renewal: true });

      const check = await resolveInstagram(user, instagram);
      if (!check.registered) {
        return json({
          success: true,
          allowed: false,
          registered: false,
          instagram,
          error: `O Instagram @${instagram} não está cadastrado nessa conta.`,
        });
      }
      return json({ success: true, allowed: true, registered: true, instagram, ...check, plan: info });
    }

    /** Verifica se uma conta do Instagram pode ser usada por esse usuário. */
    if (action === "check_account") {
      const identifier = String(body.username || body.email || body.identifier || "").trim().toLowerCase();
      const instagram = String(body.instagram || body.instagram_username || "").trim().toLowerCase().replace(/^@/, "");
      if (!identifier || !instagram) return json({ success: false, error: "Usuário e conta do Instagram são obrigatórios" }, 400);

      const user = await findUser(identifier);
      if (!user) return json({ success: false, error: "Usuário não encontrado" });
      if (!planInfo(user).access_allowed) return json({ success: false, error: "Acesso expirado ou desativado" });

      const check = await resolveInstagram(user, instagram);
      if (!check.registered) {
        return json({ success: false, allowed: false, registered: false, error: "Conta não cadastrada no plano" });
      }
      return json({ success: true, allowed: true, registered: true, source: check.source, is_trial: check.is_trial, trial_expires_at: check.trial_expires_at });
    }


    /** Cadastra conta fixa do plano (respeitando o limite) — usado pela extensão. */
    if (action === "add_account") {
      const identifier = String(body.username || body.email || body.identifier || "").trim().toLowerCase();
      const instagram = String(body.instagram || body.instagram_username || "").trim().toLowerCase();
      if (!identifier || !instagram) return json({ success: false, error: "Usuário e conta do Instagram são obrigatórios" }, 400);
      if (instagram.length > 120) return json({ success: false, error: "Conta inválida" }, 400);

      let user = await findUser(identifier);
      if (!user) return json({ success: false, error: "Usuário não encontrado" });
      if (!planInfo(user).access_allowed) return json({ success: false, error: "Acesso expirado ou desativado" });

      user = await ensureTrialPeriod(user);
      const isTrial = !!body.trial;
      const accounts = await getAccounts(user.id);

      if (accounts.some((a) => a.instagram_username.toLowerCase() === instagram)) {
        return json({ success: false, error: "Essa conta já está cadastrada" });
      }

      if (isTrial) {
        if (user.trials_used >= MONTHLY_TRIALS) {
          return json({ success: false, error: `Você já usou seus ${MONTHLY_TRIALS} testes deste mês`, trials_exhausted: true });
        }
        // Duração do teste: padrão 24h; a extensão pode pedir 6h (trial_hours: 6)
        const rawHours = Number(body.trial_hours ?? body.hours ?? 24);
        const trialHours = Number.isFinite(rawHours) ? Math.min(Math.max(rawHours, 1), 24) : 24;
        const expires = new Date(Date.now() + trialHours * 60 * 60 * 1000).toISOString();
        await supabase.from("mro_tool_accounts").insert({
          user_id: user.id, instagram_username: instagram, is_trial: true, trial_expires_at: expires,
        });
        await supabase.from("mro_tool_users").update({ trials_used: user.trials_used + 1 }).eq("id", user.id);
        user = { ...user, trials_used: user.trials_used + 1 };
        return json({ success: true, trial: true, trial_hours: trialHours, trial_expires_at: expires, ...(await fullPayload(user)) });
      }

      const fixedCount = accounts.filter((a) => !a.is_trial).length;
      if (fixedCount >= totalSlots(user)) {
        return json({
          success: false,
          limit_reached: true,
          error: `Você não pode cadastrar mais nenhum perfil: o limite de ${totalSlots(user)} conta(s) já foi excedido. Entre em contato com o administrador para liberar contas extras.`,
        });
      }


      await supabase.from("mro_tool_accounts").insert({ user_id: user.id, instagram_username: instagram });
      return json({ success: true, ...(await fullPayload(user)) });
    }

    // ---------------- ADMIN ----------------
    if (action === "list_users") {
      const nowIso = new Date().toISOString();
      await supabase.from("mro_tool_accounts").delete().eq("is_trial", true).lt("trial_expires_at", nowIso);

      const { data: users, error: usersError } = await fetchAllRows<MroUserRow>(() =>
        supabase
          .from("mro_tool_users")
          .select("*")
          .order("created_at", { ascending: true }),
      );
      if (usersError) return json({ success: false, error: usersError }, 500);

      const { data: accounts, error: accountsError } = await fetchAllRows<MroAccountRow>(() =>
        supabase
          .from("mro_tool_accounts")
          .select("*")
          .order("created_at", { ascending: true }),
      );
      if (accountsError) return json({ success: false, error: accountsError }, 500);

      // Prints capturados na área /instagram (squarecloud_user_profiles)
      const { data: profiles, error: profilesError } = await fetchAllRows<ProfileScreenshotRow>(() =>
        supabase
          .from("squarecloud_user_profiles")
          .select("squarecloud_username, instagram_username, profile_screenshot_url, updated_at")
          .order("updated_at", { ascending: false }),
      );
      if (profilesError) return json({ success: false, error: profilesError }, 500);

      const shotKey = (user: string, ig: string) =>
        `${String(user || "").toLowerCase().trim()}::${String(ig || "").toLowerCase().replace("@", "").trim()}`;
      const shots = new Map<string, string>();
      const shotsByIg = new Map<string, string>();
      for (const p of profiles) {
        if (!p.profile_screenshot_url) continue;
        shots.set(shotKey(p.squarecloud_username || "", p.instagram_username || ""), p.profile_screenshot_url);
        shotsByIg.set(
          String(p.instagram_username || "").toLowerCase().replace("@", "").trim(),
          p.profile_screenshot_url,
        );
      }

      const byUser = new Map<string, MroAccountRow[]>();
      for (const a of accounts) {
        const list = byUser.get(a.user_id) || [];
        list.push(a);
        byUser.set(a.user_id, list);
      }

      const result = users.map((u) => {
        const list = byUser.get(u.id) || [];
        const { password_hash, ...rest } = u as any;
        const withShots = list.map((a) => {
          const ig = String(a.instagram_username || "").toLowerCase().replace("@", "").trim();
          return {
            ...a,
            screenshot_url: shots.get(shotKey(u.username, ig)) || shotsByIg.get(ig) || null,
          };
        });
        return {
          ...rest,
          ...planInfo(u),
          has_password: !!password_hash || !!(u as any).password_plain,
          accounts: withShots.filter((a) => !a.is_trial),
          trial_accounts: withShots.filter((a) => a.is_trial),
          trials_remaining: Math.max(0, MONTHLY_TRIALS - u.trials_used),
        };
      });


      return json({ success: true, users: result, trials_limit: MONTHLY_TRIALS });
    }

    /**
     * Vincula automaticamente os emails (created_accesses e mro_orders) e as senhas
     * já cadastradas na área /instagram aos usuários da ferramenta MRO.
     * Assim o cliente consegue logar por usuário ou email e o admin consegue reenviar o acesso.
     */
    if (action === "sync_emails" || action === "sync_credentials") {
      const emailByUsername = new Map<string, string>();
      const passwordByUsername = new Map<string, string>();

      const { data: accesses } = await fetchAllRows<{
        username: string;
        customer_email: string | null;
        password: string | null;
      }>(() =>
        supabase
          .from("created_accesses")
          .select("username, customer_email, password")
          .order("created_at", { ascending: false }),
      );
      for (const row of accesses) {
        const u = String(row.username || "").trim().toLowerCase();
        const e = String(row.customer_email || "").trim().toLowerCase();
        const p = String(row.password || "").trim();
        if (!u) continue;
        if (e && !emailByUsername.has(u)) emailByUsername.set(u, e);
        if (p && !passwordByUsername.has(u)) passwordByUsername.set(u, p);
      }

      const { data: orders } = await fetchAllRows<{ username: string | null; email: string | null }>(() =>
        supabase
          .from("mro_orders")
          .select("username, email")
          .order("created_at", { ascending: false }),
      );
      for (const row of orders) {
        const u = String(row.username || "").trim().toLowerCase();
        const e = String(row.email || "").trim().toLowerCase();
        if (u && e && !emailByUsername.has(u)) emailByUsername.set(u, e);
      }

      const { data: allUsers } = await fetchAllRows<MroUserRow>(() =>
        supabase
          .from("mro_tool_users")
          .select("id, username, email, password_plain")
          .order("created_at", { ascending: true }),
      );

      const overwrite = body.overwrite === true;
      let updated = 0;
      let passwords = 0;
      for (const u of allUsers) {
        const key = String(u.username || "").trim().toLowerCase();
        const patch: Record<string, unknown> = {};

        const email = emailByUsername.get(key);
        if (email && email !== u.email && (!u.email || overwrite)) patch.email = email;

        const currentPlain = (u as any).password_plain as string | null;
        const password = passwordByUsername.get(key);
        if (password && password !== currentPlain && (!currentPlain || overwrite)) {
          patch.password_plain = password;
          patch.password_hash = await sha256(password);
        }

        if (!Object.keys(patch).length) continue;
        const { error } = await supabase.from("mro_tool_users").update(patch).eq("id", u.id);
        if (!error) {
          updated += 1;
          if (patch.password_plain) passwords += 1;
        }
      }

      return json({ success: true, updated, passwords, total: allUsers.length });
    }

    /**
     * Envia (ou reenvia) o acesso do cliente por email, reaproveitando o template
     * oficial de boas-vindas. Só funciona se o usuário tiver email e senha visível.
     */
    if (action === "send_access") {
      const id = String(body.id || "");
      if (!id) return json({ success: false, error: "ID é obrigatório" }, 400);

      const { data: user } = await supabase
        .from("mro_tool_users")
        .select("id, username, email, password_plain, expiration_days")
        .eq("id", id)
        .maybeSingle();

      if (!user) return json({ success: false, error: "Usuário não encontrado" }, 404);
      if (!user.email) return json({ success: false, error: "Usuário sem email cadastrado" }, 400);
      if (!user.password_plain) {
        return json({ success: false, error: "Senha não disponível — edite o usuário e defina uma nova senha" }, 400);
      }

      const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-welcome-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          email: user.email,
          username: user.username,
          password: user.password_plain,
          daysRemaining: user.expiration_days,
        }),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok || result?.success === false) {
        return json({ success: false, error: result?.error || "Falha ao enviar email" }, 500);
      }

      return json({ success: true, email: user.email });
    }



    if (action === "upsert_user") {
      const username = String(body.username || "").trim().toLowerCase();
      if (!username) return json({ success: false, error: "Usuário é obrigatório" }, 400);

      const payload: Record<string, unknown> = {
        username,
        email: body.email ? String(body.email).trim().toLowerCase() : null,
        name: body.name ? String(body.name).trim() : null,
      };
      if (body.is_active !== undefined) payload.is_active = !!body.is_active;
      if (body.plan_accounts !== undefined && body.plan_accounts !== null && body.plan_accounts !== "") {
        payload.plan_accounts = Math.max(0, Number(body.plan_accounts) || 0);
      }
      if (body.extra_accounts !== undefined && body.extra_accounts !== null && body.extra_accounts !== "") {
        payload.extra_accounts = Math.max(0, Number(body.extra_accounts) || 0);
      }
      if (body.expiration_days !== undefined && body.expiration_days !== null && body.expiration_days !== "") {
        payload.expiration_days = normalizeExpiration(body.expiration_days);
      }
      if (body.password) {
        payload.password_hash = await sha256(String(body.password));
        // Cópia visível para o admin conseguir reenviar/copiar o acesso do cliente.
        payload.password_plain = String(body.password);
      }

      const { data: existing } = await supabase
        .from("mro_tool_users").select("id").eq("username", username).maybeSingle();

      const query = existing
        ? supabase.from("mro_tool_users").update(payload).eq("id", existing.id)
        : supabase.from("mro_tool_users").insert(payload);

      const { error } = await query;
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true });
    }

    /** Admin define/soma contas extras (além do plano) para um usuário. */
    if (action === "set_extras") {
      const id = String(body.id || "");
      if (!id) return json({ success: false, error: "ID é obrigatório" }, 400);

      const { data: user } = await supabase
        .from("mro_tool_users").select("id, extra_accounts").eq("id", id).maybeSingle();
      if (!user) return json({ success: false, error: "Usuário não encontrado" });

      const current = Math.max(0, Number((user as { extra_accounts?: number }).extra_accounts) || 0);
      const next =
        body.delta !== undefined && body.delta !== null && body.delta !== ""
          ? current + Number(body.delta)
          : Number(body.extra_accounts);
      const value = Math.max(0, Math.min(999, Number.isFinite(next) ? Math.trunc(next) : current));

      const { error } = await supabase.from("mro_tool_users").update({ extra_accounts: value }).eq("id", id);
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, extra_accounts: value });
    }

    if (action === "delete_user") {
      if (!body.id) return json({ success: false, error: "ID é obrigatório" }, 400);
      const { error } = await supabase.from("mro_tool_users").delete().eq("id", body.id);
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true });
    }

    /** Admin adiciona conta ignorando o limite quando force=true. */
    if (action === "admin_add_account") {
      const userId = String(body.user_id || "");
      const instagram = String(body.instagram || "").trim().toLowerCase();
      if (!userId || !instagram) return json({ success: false, error: "Usuário e conta são obrigatórios" }, 400);

      const { data: user } = await supabase.from("mro_tool_users").select("*").eq("id", userId).maybeSingle();
      if (!user) return json({ success: false, error: "Usuário não encontrado" });

      const accounts = await getAccounts(userId);
      const fixedCount = accounts.filter((a) => !a.is_trial).length;
      if (!body.force && fixedCount >= totalSlots(user as MroUserRow)) {
        return json({
          success: false,
          limit_reached: true,
          error: `Limite atingido (${totalSlots(user as MroUserRow)} contas). Adicione contas extras para liberar mais.`,
        });
      }

      const { error } = await supabase.from("mro_tool_accounts").insert({ user_id: userId, instagram_username: instagram });
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true });
    }

    /**
     * Remove uma conta do Instagram.
     * REGRA: remover NÃO devolve a vaga. O slot é consumido definitivamente,
     * ou seja 22/22 -> 21/21 (e não 21/22). Primeiro consome o extra, depois o plano.
     */
    if (action === "remove_account") {
      if (!body.id) return json({ success: false, error: "ID é obrigatório" }, 400);

      const { data: account } = await supabase
        .from("mro_tool_accounts")
        .select("id, user_id, is_trial")
        .eq("id", body.id)
        .maybeSingle();

      const { error } = await supabase.from("mro_tool_accounts").delete().eq("id", body.id);
      if (error) return json({ success: false, error: error.message }, 500);

      // Contas de teste não ocupam slot fixo, então não reduzem o limite.
      if (account && !account.is_trial && account.user_id) {
        const { data: user } = await supabase
          .from("mro_tool_users")
          .select("id, plan_accounts, extra_accounts")
          .eq("id", account.user_id)
          .maybeSingle();

        if (user) {
          const extra = Math.max(0, Number(user.extra_accounts) || 0);
          const plan = Math.max(0, Number(user.plan_accounts) || 0);
          const patch = extra > 0
            ? { extra_accounts: extra - 1 }
            : { plan_accounts: Math.max(0, plan - 1) };
          await supabase.from("mro_tool_users").update(patch).eq("id", user.id);
        }
      }

      return json({ success: true });
    }


    if (action === "reset_trials") {
      if (!body.id) return json({ success: false, error: "ID é obrigatório" }, 400);
      const { error } = await supabase
        .from("mro_tool_users")
        .update({ trials_used: 0, trials_period_start: monthStart() })
        .eq("id", body.id);
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true });
    }

    /**
     * Importa em massa: [{ username, password, expiration_days, accounts: [] }]
     * Estratégia set-based (poucas queries) para não estourar o timeout de 150s
     * da edge function quando há centenas de usuários.
     */
    if (action === "bulk_import") {
      const rawItems = Array.isArray(body.users) ? body.users : [];
      if (!rawItems.length) return json({ success: false, error: "Nenhum usuário para importar" }, 400);
      if (rawItems.length > 500) {
        return json({ success: false, error: "Máximo de 500 usuários por lote" }, 400);
      }

      const errors: string[] = [];

      // 1) Normaliza + deduplica por username (mantém a última ocorrência).
      const byUsername = new Map<string, { username: string; email: string | null; password: string | null; expiration: number; igs: string[] }>();
      for (const item of rawItems) {
        const username = String(item?.username || "").trim().toLowerCase();
        if (!username || username.length > 255) continue;
        const igs = Array.isArray(item?.accounts)
          ? Array.from(new Set(
              item.accounts
                .map((a: unknown) => String(a ?? "").trim().toLowerCase())
                .filter((a: string) => !!a && a.length <= 120),
            )) as string[]
          : [];
        byUsername.set(username, {
          username,
          email: item?.email ? String(item.email).trim().toLowerCase() : null,
          password: item?.password ? String(item.password) : null,
          expiration: normalizeExpiration(item?.expiration_days),
          igs,
        });
      }

      const items = Array.from(byUsername.values());
      if (!items.length) return json({ success: false, error: "Nenhum usuário válido encontrado" }, 400);

      const usernames = items.map((i) => i.username);

      // 2) Uma única leitura dos usuários já existentes.
      const { data: existingUsers, error: exErr } = await supabase
        .from("mro_tool_users")
        .select("id, username, password_hash, password_plain, plan_accounts")
        .in("username", usernames);
      if (exErr) return json({ success: false, error: exErr.message }, 500);

      const existingMap = new Map<
        string,
        { id: string; password_hash: string | null; password_plain: string | null; plan_accounts: number | null }
      >();
      for (const u of (existingUsers || []) as any[]) {
        existingMap.set(String(u.username).toLowerCase(), {
          id: u.id,
          password_hash: u.password_hash,
          password_plain: u.password_plain ?? null,
          plan_accounts: u.plan_accounts ?? null,
        });
      }

      // 3) Monta as linhas do upsert (hash calculado em paralelo).
      const rows = await Promise.all(items.map(async (item) => {
        const prev = existingMap.get(item.username);
        const password_hash = item.password
          ? await sha256(item.password)
          : prev?.password_hash ?? null;
        const password_plain = item.password ? item.password : (prev as any)?.password_plain ?? null;
        return {
          username: item.username,
          email: item.email,
          expiration_days: item.expiration,
          // Nunca reduz o plano já configurado para o usuário.
          plan_accounts: Math.max(DEFAULT_PLAN_ACCOUNTS, item.igs.length, prev?.plan_accounts ?? 0),
          is_active: true,
          password_hash,
          password_plain,
        };
      }));

      // 4) Upsert único por username.
      const { data: upserted, error: upErr } = await supabase
        .from("mro_tool_users")
        .upsert(rows, { onConflict: "username" })
        .select("id, username");
      if (upErr) return json({ success: false, error: upErr.message }, 500);

      const idByUsername = new Map<string, string>();
      for (const u of (upserted || []) as any[]) {
        idByUsername.set(String(u.username).toLowerCase(), u.id);
      }

      const created = items.filter((i) => !existingMap.has(i.username)).length;
      const updated = items.length - created;

      // 5) Uma leitura de todas as contas já vinculadas + um insert em lote.
      const userIds = Array.from(idByUsername.values());
      const alreadyLinked = new Set<string>();
      if (userIds.length) {
        const { data: currentAccounts } = await supabase
          .from("mro_tool_accounts")
          .select("user_id, instagram_username")
          .in("user_id", userIds)
          .eq("is_trial", false);
        for (const a of (currentAccounts || []) as any[]) {
          alreadyLinked.add(`${a.user_id}::${String(a.instagram_username).toLowerCase()}`);
        }
      }

      const toInsert: { user_id: string; instagram_username: string }[] = [];
      for (const item of items) {
        const userId = idByUsername.get(item.username);
        if (!userId) {
          errors.push(`${item.username}: usuário não pôde ser gravado`);
          continue;
        }
        for (const ig of item.igs) {
          const key = `${userId}::${ig}`;
          if (alreadyLinked.has(key)) continue;
          alreadyLinked.add(key);
          toInsert.push({ user_id: userId, instagram_username: ig });
        }
      }

      let accountsAdded = 0;
      const CHUNK = 500;
      for (let i = 0; i < toInsert.length; i += CHUNK) {
        const chunk = toInsert.slice(i, i + CHUNK);
        const { error: accErr } = await supabase.from("mro_tool_accounts").insert(chunk);
        if (!accErr) {
          accountsAdded += chunk.length;
          continue;
        }
        // Fallback: se o lote falhar (ex.: 1 conta duplicada), insere uma a uma
        // para que as contas válidas não sejam perdidas.
        for (const row of chunk) {
          const { error: oneErr } = await supabase.from("mro_tool_accounts").insert(row);
          if (oneErr) errors.push(`${row.instagram_username}: ${oneErr.message}`);
          else accountsAdded += 1;
        }
      }

      return json({ success: true, created, updated, accounts_added: accountsAdded, errors: errors.slice(0, 20) });
    }


    return json({ success: false, error: "Ação inválida" }, 400);
  } catch (error) {
    console.error("[MRO-TOOL-API]", error instanceof Error ? error.message : "Unknown");
    return json({ success: false, error: "Erro interno" }, 500);
  }
});
