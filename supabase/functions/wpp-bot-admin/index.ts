import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SESSION_ID = "renda_extra";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // ===== Endpoints chamados pelo BOT da VPS =====
    // (autenticação básica via header X-Bot-Token comparado com BOT_TOKEN secret se existir)
    const botToken = Deno.env.get("WPP_BOT_TOKEN");
    const headerToken = req.headers.get("x-bot-token");
    const isBotCaller = !!botToken && headerToken === botToken;

    // Bot reporta status (status, qr_code, phone, heartbeat)
    if (action === "botHeartbeat" && isBotCaller) {
      const update: Record<string, unknown> = {
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (body.status) update.status = body.status;
      if (body.qr_code !== undefined) update.qr_code = body.qr_code;
      if (body.phone_number !== undefined) update.phone_number = body.phone_number;
      if (body.status === "connected") {
        update.request_qr = false;
        update.qr_code = null;
      }
      await supabase.from("wpp_bot_session").update(update).eq("id", SESSION_ID);
      return json({ success: true });
    }

    // Bot busca tarefas pendentes
    if (action === "botFetchPending" && isBotCaller) {
      const { data } = await supabase
        .from("wpp_bot_messages")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_for", new Date().toISOString())
        .order("scheduled_for", { ascending: true })
        .limit(10);

      const { data: session } = await supabase
        .from("wpp_bot_session")
        .select("request_qr, request_logout")
        .eq("id", SESSION_ID)
        .single();

      return json({ success: true, messages: data || [], commands: session || {} });
    }

    // Bot atualiza resultado do envio
    if (action === "botUpdateMessage" && isBotCaller) {
      const update: Record<string, unknown> = {
        status: body.status,
        error_message: body.error_message || null,
        updated_at: new Date().toISOString(),
      };
      if (body.status === "sent") update.sent_at = new Date().toISOString();
      await supabase.from("wpp_bot_messages").update(update).eq("id", body.message_id);
      return json({ success: true });
    }

    // Bot confirma comandos consumidos
    if (action === "botAckCommand" && isBotCaller) {
      const update: Record<string, unknown> = {};
      if (body.cleared === "qr") update.request_qr = false;
      if (body.cleared === "logout") {
        update.request_logout = false;
        update.status = "disconnected";
        update.qr_code = null;
        update.phone_number = null;
      }
      await supabase.from("wpp_bot_session").update(update).eq("id", SESSION_ID);
      return json({ success: true });
    }

    // ===== Endpoints chamados pelo PAINEL ADMIN =====
    if (action === "getStatus") {
      const [{ data: session }, { data: settings }, { data: messages }] = await Promise.all([
        supabase.from("wpp_bot_session").select("*").eq("id", SESSION_ID).maybeSingle(),
        supabase.from("wpp_bot_settings").select("*").eq("id", SESSION_ID).maybeSingle(),
        supabase
          .from("wpp_bot_messages")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      return json({ success: true, session, settings, messages: messages || [] });
    }

    if (action === "requestQr") {
      await supabase
        .from("wpp_bot_session")
        .update({
          request_qr: true,
          status: "connecting",
          qr_code: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", SESSION_ID);
      return json({ success: true });
    }

    if (action === "logout") {
      await supabase
        .from("wpp_bot_session")
        .update({ request_logout: true, updated_at: new Date().toISOString() })
        .eq("id", SESSION_ID);
      return json({ success: true });
    }

    if (action === "saveSettings") {
      await supabase
        .from("wpp_bot_settings")
        .update({
          message_template: body.message_template,
          delay_minutes: body.delay_minutes,
          enabled: body.enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", SESSION_ID);
      return json({ success: true });
    }

    if (action === "enqueueLead") {
      // Chamado quando um lead é cadastrado em /rendaextra2
      const { data: settings } = await supabase
        .from("wpp_bot_settings")
        .select("*")
        .eq("id", SESSION_ID)
        .maybeSingle();
      if (!settings?.enabled) return json({ success: true, skipped: true });

      const scheduled = new Date(Date.now() + (settings.delay_minutes || 30) * 60_000);
      await supabase.from("wpp_bot_messages").insert({
        lead_id: body.lead_id || null,
        lead_name: body.lead_name || null,
        phone: body.phone,
        message: settings.message_template,
        scheduled_for: scheduled.toISOString(),
        status: "pending",
      });
      return json({ success: true });
    }

    if (action === "retryMessage") {
      await supabase
        .from("wpp_bot_messages")
        .update({
          status: "pending",
          error_message: null,
          scheduled_for: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.message_id);
      return json({ success: true });
    }

    if (action === "deleteMessage") {
      await supabase.from("wpp_bot_messages").delete().eq("id", body.message_id);
      return json({ success: true });
    }

    return json({ success: false, error: "Ação inválida" }, 400);
  } catch (err: any) {
    console.error("wpp-bot-admin error", err);
    return json({ success: false, error: err.message }, 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(handler);
