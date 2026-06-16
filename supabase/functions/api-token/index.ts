// Public token store: GET /api-token?key=deepseek returns { value }
// POST { key, value, admin_password } upserts (admin only)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const ADMIN_PASSWORD = "Ga145523@";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const key = (url.searchParams.get("key") || "").trim();
      if (!key) {
        return new Response(JSON.stringify({ error: "missing key" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase
        .from("api_tokens")
        .select("key, value, description, updated_at")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return new Response(JSON.stringify({ error: "not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { key, value, description, admin_password, action } = body || {};
      if (admin_password !== ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "list") {
        const { data, error } = await supabase
          .from("api_tokens")
          .select("key, value, description, updated_at")
          .order("key");
        if (error) throw error;
        return new Response(JSON.stringify({ tokens: data || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "delete") {
        if (!key) throw new Error("missing key");
        const { error } = await supabase.from("api_tokens").delete().eq("key", key);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!key || !value) {
        return new Response(JSON.stringify({ error: "missing key or value" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("api_tokens")
        .upsert({ key: key.trim(), value: value.trim(), description: description || null }, { onConflict: "key" });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
