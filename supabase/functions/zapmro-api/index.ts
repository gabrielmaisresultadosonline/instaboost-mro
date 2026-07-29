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

const log = (step: string, details?: unknown) => {
  console.log(`[ZAPMRO-API] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

/** SHA-256 hashing (Web Crypto) — same standard used elsewhere in the project. */
async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface ZapmroUserRow {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  is_active: boolean | null;
  days_remaining: number | null;
  expires_at: string | null;
  password_hash: string | null;
  last_access: string | null;
  created_at: string;
}

/** Computes whether a user still has valid access. */
function computeAccess(user: ZapmroUserRow): { active: boolean; reason: string | null } {
  if (user.is_active === false) return { active: false, reason: "Acesso desativado" };
  if (user.expires_at && new Date(user.expires_at).getTime() < Date.now()) {
    return { active: false, reason: "Acesso expirado" };
  }
  if (typeof user.days_remaining === "number" && user.days_remaining <= 0) {
    return { active: false, reason: "Acesso expirado" };
  }
  return { active: true, reason: null };
}

function publicUser(user: ZapmroUserRow) {
  const { active, reason } = computeAccess(user);
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    is_active: active,
    access_denied_reason: reason,
    days_remaining: user.days_remaining ?? 0,
    expires_at: user.expires_at,
    last_access: user.last_access,
    created_at: user.created_at,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resilient body parsing (some clients/extensions send text/plain).
    const raw = await req.text();
    let body: Record<string, any> = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return json({ success: false, error: "Corpo da requisição inválido" }, 400);
    }

    const action = String(body.action || "");
    log("Request", { action });

    /** Client IP from proxy headers. */
    const clientIp =
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "";

    /** Checks if an IP is blocked (globally or for that username). */
    async function isIpBlocked(username: string, ip: string) {
      const { data } = await supabase
        .from("zapmro_blocked_ips")
        .select("id")
        .eq("ip", ip)
        .or(`username.is.null,username.eq.${username}`)
        .limit(1);
      return !!(data && data.length);
    }

    /** Creates/updates the session row for a user + IP pair. */
    async function touchSession(user: ZapmroUserRow, ip: string, ua: string) {
      const nowIso = new Date().toISOString();
      const { data: existing } = await supabase
        .from("zapmro_user_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("ip", ip)
        .maybeSingle();

      const deviceLabel = /mobile|android|iphone/i.test(ua)
        ? "Mobile"
        : /chrome/i.test(ua)
        ? "Chrome / Desktop"
        : "Desktop";

      if (existing) {
        await supabase
          .from("zapmro_user_sessions")
          .update({ last_seen: nowIso, is_active: true, revoked_at: null, user_agent: ua, device_label: deviceLabel })
          .eq("id", existing.id);
      } else {
        await supabase.from("zapmro_user_sessions").insert({
          user_id: user.id,
          username: user.username,
          ip,
          user_agent: ua,
          device_label: deviceLabel,
          is_active: true,
          first_seen: nowIso,
          last_seen: nowIso,
        });
      }
    }

    // ---------------------------------------------------------------
    // PUBLIC: login (username OR email + senha)
    // ---------------------------------------------------------------
    if (action === "login") {
      const identifier = String(body.username || body.email || body.identifier || "").trim().toLowerCase();
      const password = String(body.password || "");

      if (!identifier || !password) {
        return json({ success: false, error: "Usuário/email e senha são obrigatórios" }, 400);
      }
      if (identifier.length > 255 || password.length > 255) {
        return json({ success: false, error: "Credenciais inválidas" }, 400);
      }

      const { data: users } = await supabase
        .from("zapmro_users")
        .select("*")
        .or(`username.eq.${identifier},email.eq.${identifier}`)
        .limit(1);

      const user = (users?.[0] || null) as ZapmroUserRow | null;
      if (!user || !user.password_hash) {
        return json({ success: false, error: "Usuário ou senha incorretos" }, 200);
      }

      const hash = await sha256(password);
      if (hash !== user.password_hash) {
        return json({ success: false, error: "Usuário ou senha incorretos" }, 200);
      }

      const { active, reason } = computeAccess(user);
      if (!active) {
        return json({ success: false, error: reason, needs_renewal: true }, 200);
      }

      await supabase
        .from("zapmro_users")
        .update({ last_access: new Date().toISOString() })
        .eq("id", user.id);

      return json({ success: true, user: publicUser(user) });
    }

    // ---------------------------------------------------------------
    // PUBLIC: verify_user (checagem de acesso sem senha)
    // ---------------------------------------------------------------
    if (action === "verify_user") {
      const identifier = String(body.username || body.email || body.identifier || "").trim().toLowerCase();
      if (!identifier) return json({ success: false, error: "Usuário ou email é obrigatório" }, 400);

      const { data: users } = await supabase
        .from("zapmro_users")
        .select("*")
        .or(`username.eq.${identifier},email.eq.${identifier}`)
        .limit(1);

      const user = (users?.[0] || null) as ZapmroUserRow | null;
      if (!user) return json({ success: false, error: "Usuário não encontrado" }, 200);

      return json({ success: true, user: publicUser(user) });
    }

    // ---------------------------------------------------------------
    // PUBLIC: avisos ativos (tutoriais dos alunos + ferramenta externa)
    // ---------------------------------------------------------------
    if (action === "get_announcements") {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("zapmro_announcements")
        .select("*")
        .eq("is_active", true)
        .or(`start_date.is.null,start_date.lte.${nowIso}`)
        .order("created_at", { ascending: false });

      if (error) return json({ success: false, error: error.message }, 500);

      const announcements = (data || []).filter(
        (a: any) => !a.end_date || new Date(a.end_date).getTime() > Date.now(),
      );

      return json({ success: true, announcements });
    }

    // ---------------------------------------------------------------
    // ADMIN: usuários
    // ---------------------------------------------------------------
    if (action === "list_users") {
      const { data, error } = await supabase
        .from("zapmro_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) return json({ success: false, error: error.message }, 500);

      const users = (data || []).map((u: any) => {
        const { password_hash, ...rest } = u;
        return { ...rest, has_password: !!password_hash };
      });

      return json({ success: true, users });
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
      if (body.days_remaining !== undefined && body.days_remaining !== null && body.days_remaining !== "") {
        payload.days_remaining = Number(body.days_remaining);
      }
      if (body.expires_at !== undefined) payload.expires_at = body.expires_at || null;
      if (body.password) payload.password_hash = await sha256(String(body.password));

      const { data: existing } = await supabase
        .from("zapmro_users")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      const query = existing
        ? supabase.from("zapmro_users").update(payload).eq("id", existing.id)
        : supabase.from("zapmro_users").insert(payload);

      const { error } = await query;
      if (error) return json({ success: false, error: error.message }, 500);

      return json({ success: true });
    }

    if (action === "delete_user") {
      if (!body.id) return json({ success: false, error: "ID é obrigatório" }, 400);
      const { error } = await supabase.from("zapmro_users").delete().eq("id", body.id);
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true });
    }

    // ---------------------------------------------------------------
    // ADMIN: avisos
    // ---------------------------------------------------------------
    if (action === "list_announcements") {
      const { data, error } = await supabase
        .from("zapmro_announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, announcements: data || [] });
    }

    if (action === "save_announcement") {
      const title = String(body.title || "").trim();
      if (!title) return json({ success: false, error: "Título é obrigatório" }, 400);

      const payload = {
        title,
        content: body.content ? String(body.content) : null,
        image_url: body.image_url || null,
        video_url: body.video_url || null,
        is_active: body.is_active !== false,
        is_blocking: !!body.is_blocking,
        display_duration: Number(body.display_duration || 0),
        end_date: body.end_date || null,
      };

      const query = body.id
        ? supabase.from("zapmro_announcements").update(payload).eq("id", body.id)
        : supabase.from("zapmro_announcements").insert(payload);

      const { error } = await query;
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "delete_announcement") {
      if (!body.id) return json({ success: false, error: "ID é obrigatório" }, 400);
      const { error } = await supabase.from("zapmro_announcements").delete().eq("id", body.id);
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true });
    }

    return json({ success: false, error: "Ação inválida" }, 400);
  } catch (error) {
    log("Error", { error: error instanceof Error ? error.message : "Unknown" });
    return json({ success: false, error: "Erro interno" }, 500);
  }
});
