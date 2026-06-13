import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "mro@gmail.com";
const ADMIN_PASSWORD = "Ga145523@";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, email, password, openai_api_key } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (action === "login") {
      const ok = email?.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD;
      return new Response(JSON.stringify({ success: ok }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // All other actions require admin credentials in body
    if (email?.trim().toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "get") {
      const { data } = await supabase.from("postsprompts_settings").select("openai_api_key").limit(1).maybeSingle();
      const key = data?.openai_api_key || "";
      const masked = key ? key.slice(0, 7) + "..." + key.slice(-4) : "";
      return new Response(JSON.stringify({ hasKey: !!key, masked }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "save") {
      const { data: existing } = await supabase.from("postsprompts_settings").select("id").limit(1).maybeSingle();
      if (existing?.id) {
        await supabase.from("postsprompts_settings").update({ openai_api_key, updated_at: new Date().toISOString() }).eq("id", existing.id);
      } else {
        await supabase.from("postsprompts_settings").insert({ openai_api_key });
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
