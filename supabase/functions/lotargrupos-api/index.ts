import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { action, admin_token } = body;

    // Verify admin token if it's an admin action
    if (action.startsWith("admin_")) {
      const { data: adminSettings, error: adminErr } = await supabaseClient
        .from("lovablack_settings")
        .select("value")
        .eq("key", "admin_session_token")
        .maybeSingle();

      if (adminErr || !adminSettings || adminSettings.value !== admin_token) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "admin_list_lessons") {
      const { data, error } = await supabaseClient
        .from("lotargrupos_lessons")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, lessons: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "admin_save_lesson") {
      const { lesson } = body;
      const { data, error } = await supabaseClient
        .from("lotargrupos_lessons")
        .upsert(lesson)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, lesson: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "admin_delete_lesson") {
      const { id } = body;
      const { error } = await supabaseClient.from("lotargrupos_lessons").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "admin_list_users") {
      const { data, error } = await supabaseClient
        .from("lotargrupos_users")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, users: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "admin_update_user") {
      const { id, updates } = body;
      const { data, error } = await supabaseClient
        .from("lotargrupos_users")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, user: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
