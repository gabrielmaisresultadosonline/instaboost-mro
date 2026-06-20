import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function generateLicenseKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const parts: string[] = [];
  for (let i = 0; i < 4; i++) {
    let part = "";
    for (let j = 0; j < 5; j++) part += chars[Math.floor(Math.random() * chars.length)];
    parts.push(part);
  }
  return "LVB-" + parts.join("-");
}

function planToExpiry(plan: string): { expires_at: string | null; credits: number } {
  const now = Date.now();
  switch (plan) {
    case "teste":
      return { expires_at: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(), credits: 10 };
    case "30d":
      return { expires_at: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(), credits: 1000 };
    case "90d":
      return { expires_at: new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString(), credits: 5000 };
    case "vitalicio":
      return { expires_at: null, credits: 999999 };
    default:
      return { expires_at: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(), credits: 1000 };
  }
}

const ADMIN_TOKEN = Deno.env.get("LOVABLE_EXT_ADMIN_TOKEN") || "lvb-admin-2026-mro";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ============ PUBLIC: VALIDATE (used by extension) ============
    if (action === "validate") {
      const { license_key, session_id, consume_credit } = body;
      if (!license_key) {
        return json({ status: "chave_inexistente", valid: false }, 200);
      }

      const { data: user } = await supabase
        .from("lovable_extension_users")
        .select("*")
        .eq("license_key", String(license_key).trim().toUpperCase())
        .maybeSingle();

      if (!user) return json({ status: "chave_inexistente", valid: false }, 200);
      if (user.is_banned) return json({ status: "usuario_banido", valid: false }, 200);

      if (user.expires_at && new Date(user.expires_at).getTime() < Date.now()) {
        return json({ status: "tempo_esgotado", valid: false, expires_at: user.expires_at }, 200);
      }

      if (user.credits !== null && user.credits <= 0) {
        return json({ status: "creditos_esgotados", valid: false, credits: 0 }, 200);
      }

      // Session lock
      if (session_id) {
        if (user.current_session_id && user.current_session_id !== session_id) {
          // If last validation > 5 min ago, allow takeover
          const last = user.last_validated_at ? new Date(user.last_validated_at).getTime() : 0;
          if (Date.now() - last < 5 * 60 * 1000) {
            return json({ status: "sessao_duplicada", valid: false }, 200);
          }
        }
      }

      const updates: Record<string, unknown> = {
        last_validated_at: new Date().toISOString(),
      };
      if (session_id) updates.current_session_id = session_id;
      if (consume_credit && user.plan_type !== "vitalicio") {
        updates.credits = Math.max(0, (user.credits ?? 0) - 1);
      }

      await supabase.from("lovable_extension_users").update(updates).eq("id", user.id);

      return json({
        status: "ok",
        valid: true,
        email: user.email,
        plan_type: user.plan_type,
        credits: (updates.credits as number | undefined) ?? user.credits,
        expires_at: user.expires_at,
      });
    }

    // ============ ADMIN ACTIONS ============
    const authToken = req.headers.get("x-admin-token") || body.admin_token;
    if (authToken !== ADMIN_TOKEN) {
      return json({ error: "Não autorizado" }, 401);
    }

    if (action === "list") {
      const { data, error } = await supabase
        .from("lovable_extension_users")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json({ users: data });
    }

    if (action === "create") {
      const { email, plan_type, notes } = body;
      if (!email) return json({ error: "Email obrigatório" }, 400);
      const plan = ["teste", "30d", "90d", "vitalicio"].includes(plan_type) ? plan_type : "30d";
      const { expires_at, credits } = planToExpiry(plan);

      let license_key = generateLicenseKey();
      for (let i = 0; i < 5; i++) {
        const { data: dup } = await supabase
          .from("lovable_extension_users")
          .select("id").eq("license_key", license_key).maybeSingle();
        if (!dup) break;
        license_key = generateLicenseKey();
      }

      const { data, error } = await supabase
        .from("lovable_extension_users")
        .insert({ email: String(email).toLowerCase().trim(), license_key, plan_type: plan, credits, expires_at, notes: notes || null })
        .select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ user: data });
    }

    if (action === "update") {
      const { id, plan_type, credits, expires_at, is_banned, notes } = body;
      if (!id) return json({ error: "id obrigatório" }, 400);
      const updates: Record<string, unknown> = {};
      if (plan_type !== undefined) updates.plan_type = plan_type;
      if (credits !== undefined) updates.credits = credits;
      if (expires_at !== undefined) updates.expires_at = expires_at;
      if (is_banned !== undefined) updates.is_banned = is_banned;
      if (notes !== undefined) updates.notes = notes;
      const { error } = await supabase.from("lovable_extension_users").update(updates).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "renew") {
      const { id, plan_type } = body;
      if (!id) return json({ error: "id obrigatório" }, 400);
      const { expires_at, credits } = planToExpiry(plan_type || "30d");
      const { error } = await supabase
        .from("lovable_extension_users")
        .update({ plan_type, expires_at, credits, is_banned: false })
        .eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "reset_session") {
      const { id } = body;
      const { error } = await supabase
        .from("lovable_extension_users")
        .update({ current_session_id: null })
        .eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "delete") {
      const { id } = body;
      const { error } = await supabase.from("lovable_extension_users").delete().eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
