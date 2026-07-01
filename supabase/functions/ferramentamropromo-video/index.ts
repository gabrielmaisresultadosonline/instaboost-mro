import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "mro@gmail.com";
const ADMIN_PASSWORD = "Ga145523@";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const json = (d: unknown, status = 200) =>
      new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const requireAdmin = () => {
      const e = String(body.email || "").trim().toLowerCase();
      const p = String(body.password || "");
      return e === ADMIN_EMAIL && p === ADMIN_PASSWORD;
    };

    if (action === "admin_login") {
      if (!requireAdmin()) return json({ success: false, error: "Credenciais inválidas" }, 401);
      return json({ success: true });
    }

    if (action === "get_video") {
      const { data } = await supabase.from("ferramentamropromo_settings")
        .select("video_url, hls_url, video_title")
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();
      return json({
        video_url: data?.video_url || null,
        hls_url: data?.hls_url || null,
        video_title: data?.video_title || null,
      });
    }

    if (action === "set_video") {
      if (!requireAdmin()) return json({ success: false, error: "Não autorizado" }, 401);
      const video_url = body.video_url ? String(body.video_url) : null;
      const hls_url = body.hls_url ? String(body.hls_url) : null;
      const video_title = body.video_title ? String(body.video_title) : null;
      const { data: existing } = await supabase.from("ferramentamropromo_settings")
        .select("id").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (existing) {
        await supabase.from("ferramentamropromo_settings")
          .update({ video_url, hls_url, video_title, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("ferramentamropromo_settings")
          .insert({ video_url, hls_url, video_title, is_active: true });
      }
      return json({ success: true });
    }

    return json({ success: false, error: "Ação desconhecida" }, 400);
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
