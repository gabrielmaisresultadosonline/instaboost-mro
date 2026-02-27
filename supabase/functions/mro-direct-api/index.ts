import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, ...data } = await req.json();

    // ── SETTINGS ──
    if (action === "get-settings") {
      const { data: settings } = await supabase
        .from("mro_direct_settings")
        .select("*")
        .limit(1)
        .single();
      return json({ settings });
    }

    if (action === "save-settings") {
      const { instagram_account_id, page_access_token, is_active } = data;

      // Check if settings exist
      const { data: existing } = await supabase.from("mro_direct_settings").select("id").limit(1).single();

      if (existing) {
        const { error } = await supabase
          .from("mro_direct_settings")
          .update({ instagram_account_id, page_access_token, is_active, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("mro_direct_settings")
          .insert({ instagram_account_id, page_access_token, is_active });
        if (error) throw error;
      }
      return json({ success: true });
    }

    // ── AUTOMATIONS ──
    if (action === "list-automations") {
      const { data: automations } = await supabase
        .from("mro_direct_automations")
        .select("*")
        .order("created_at", { ascending: false });
      return json({ automations: automations || [] });
    }

    if (action === "create-automation") {
      const { automation_type, reply_message, trigger_keywords, target_post_id, delay_seconds } = data;
      const { error } = await supabase.from("mro_direct_automations").insert({
        automation_type,
        reply_message,
        trigger_keywords: trigger_keywords || [],
        target_post_id: target_post_id || null,
        delay_seconds: delay_seconds || 0,
      });
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "update-automation") {
      const { id, ...fields } = data;
      fields.updated_at = new Date().toISOString();
      const { error } = await supabase.from("mro_direct_automations").update(fields).eq("id", id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "delete-automation") {
      const { error } = await supabase.from("mro_direct_automations").delete().eq("id", data.id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "toggle-automation") {
      const { error } = await supabase
        .from("mro_direct_automations")
        .update({ is_active: data.is_active, updated_at: new Date().toISOString() })
        .eq("id", data.id);
      if (error) throw error;
      return json({ success: true });
    }

    // ── LOGS ──
    if (action === "get-logs") {
      const { data: logs } = await supabase
        .from("mro_direct_logs")
        .select("*, mro_direct_automations(automation_type, reply_message)")
        .order("created_at", { ascending: false })
        .limit(100);
      return json({ logs: logs || [] });
    }

    // ── SEND TEST MESSAGE ──
    if (action === "send-test-message") {
      const { data: settings } = await supabase.from("mro_direct_settings").select("*").limit(1).single();
      if (!settings?.page_access_token || !settings?.instagram_account_id) {
        throw new Error("Configure o token e ID do Instagram primeiro");
      }

      const { recipient_id, message } = data;

      const igResponse = await fetch(
        `https://graph.instagram.com/v21.0/${settings.instagram_account_id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: recipient_id },
            message: { text: message },
            access_token: settings.page_access_token,
          }),
        }
      );

      const result = await igResponse.json();

      if (!igResponse.ok) {
        throw new Error(result.error?.message || "Erro ao enviar mensagem");
      }

      // Log it
      await supabase.from("mro_direct_logs").insert({
        event_type: "test_message",
        sender_id: recipient_id,
        message_sent: message,
        status: "sent",
      });

      return json({ success: true, result });
    }

    // ── GET INSTAGRAM PROFILE INFO ──
    if (action === "get-ig-info") {
      const { data: settings } = await supabase.from("mro_direct_settings").select("*").limit(1).single();
      if (!settings?.page_access_token) {
        throw new Error("Token não configurado");
      }

      const res = await fetch(
        `https://graph.instagram.com/v21.0/me?fields=id,name,username,profile_picture_url,followers_count&access_token=${settings.page_access_token}`
      );
      const info = await res.json();
      if (!res.ok) throw new Error(info.error?.message || "Erro ao buscar perfil");

      return json({ info });
    }

    // ── DASHBOARD STATS ──
    if (action === "get-stats") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { count: totalSent } = await supabase
        .from("mro_direct_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "sent");

      const { count: todaySent } = await supabase
        .from("mro_direct_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "sent")
        .gte("created_at", today);

      const { count: weekSent } = await supabase
        .from("mro_direct_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "sent")
        .gte("created_at", weekAgo);

      const { count: errors } = await supabase
        .from("mro_direct_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "error");

      const { count: activeAutomations } = await supabase
        .from("mro_direct_automations")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      return json({
        stats: {
          totalSent: totalSent || 0,
          todaySent: todaySent || 0,
          weekSent: weekSent || 0,
          errors: errors || 0,
          activeAutomations: activeAutomations || 0,
        },
      });
    }

    return json({ error: "Ação não reconhecida" }, 400);
  } catch (error) {
    console.error("[mro-direct-api] Error:", error);
    return json({ error: error.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
