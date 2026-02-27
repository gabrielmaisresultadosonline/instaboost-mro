import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ── WEBHOOK VERIFICATION (GET) ──
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("[mro-direct-webhook] Verification request:", { mode, token });

    if (mode === "subscribe") {
      // Get stored verify token
      const { data: settings } = await supabase
        .from("mro_direct_settings")
        .select("webhook_verify_token")
        .limit(1)
        .single();

      if (settings && token === settings.webhook_verify_token) {
        console.log("[mro-direct-webhook] Verification successful");
        return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
      }
    }

    return new Response("Forbidden", { status: 403 });
  }

  // ── WEBHOOK EVENTS (POST) ──
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("[mro-direct-webhook] Received:", JSON.stringify(body));

      const { data: settings } = await supabase
        .from("mro_direct_settings")
        .select("*")
        .limit(1)
        .single();

      if (!settings?.is_active || !settings?.page_access_token) {
        console.log("[mro-direct-webhook] Not active or no token, skipping");
        return new Response("OK", { status: 200 });
      }

      // Process each entry
      for (const entry of body.entry || []) {
        // ── MESSAGING (DMs) ──
        for (const messaging of entry.messaging || []) {
          if (messaging.message && !messaging.message.is_echo) {
            await handleDirectMessage(supabase, settings, messaging);
          }
        }

        // ── CHANGES (Comments, Follows) ──
        for (const change of entry.changes || []) {
          if (change.field === "comments") {
            await handleComment(supabase, settings, change.value);
          }
          if (change.field === "mentions") {
            // Could handle mentions too
          }
        }
      }

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("[mro-direct-webhook] Error:", error);
      return new Response("OK", { status: 200 }); // Always return 200 to Instagram
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

async function handleDirectMessage(supabase: any, settings: any, messaging: any) {
  const senderId = messaging.sender.id;
  const messageText = messaging.message.text || "";

  console.log("[mro-direct-webhook] DM from:", senderId, "Text:", messageText);

  // Get active DM automations
  const { data: automations } = await supabase
    .from("mro_direct_automations")
    .select("*")
    .eq("automation_type", "dm_reply")
    .eq("is_active", true);

  for (const auto of automations || []) {
    // Check keywords (if empty = match all)
    const keywords = auto.trigger_keywords || [];
    const shouldReply =
      keywords.length === 0 ||
      keywords.some((kw: string) => messageText.toLowerCase().includes(kw.toLowerCase()));

    if (shouldReply) {
      // Delay if configured
      if (auto.delay_seconds > 0) {
        await new Promise((r) => setTimeout(r, auto.delay_seconds * 1000));
      }

      await sendInstagramMessage(supabase, settings, senderId, auto.reply_message, auto.id, "dm_reply", messageText);
      break; // Only send one reply per message
    }
  }
}

async function handleComment(supabase: any, settings: any, commentData: any) {
  const commenterId = commentData.from?.id;
  const commentText = commentData.text || "";
  const mediaId = commentData.media?.id;

  if (!commenterId) return;

  console.log("[mro-direct-webhook] Comment from:", commenterId, "on media:", mediaId);

  // Get active comment automations
  const { data: automations } = await supabase
    .from("mro_direct_automations")
    .select("*")
    .eq("automation_type", "comment_reply")
    .eq("is_active", true);

  for (const auto of automations || []) {
    // Check if targeting specific post or all
    if (auto.target_post_id && auto.target_post_id !== mediaId) continue;

    // Check keywords
    const keywords = auto.trigger_keywords || [];
    const shouldReply =
      keywords.length === 0 ||
      keywords.some((kw: string) => commentText.toLowerCase().includes(kw.toLowerCase()));

    if (shouldReply) {
      if (auto.delay_seconds > 0) {
        await new Promise((r) => setTimeout(r, auto.delay_seconds * 1000));
      }

      await sendInstagramMessage(supabase, settings, commenterId, auto.reply_message, auto.id, "comment_reply", commentText);
      break;
    }
  }
}

async function sendInstagramMessage(
  supabase: any,
  settings: any,
  recipientId: string,
  message: string,
  automationId: string | null,
  eventType: string,
  triggerContent: string
) {
  try {
    const res = await fetch(
      `https://graph.instagram.com/v21.0/${settings.instagram_account_id}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: message },
          access_token: settings.page_access_token,
        }),
      }
    );

    const result = await res.json();

    await supabase.from("mro_direct_logs").insert({
      automation_id: automationId,
      event_type: eventType,
      sender_id: recipientId,
      message_sent: message,
      trigger_content: triggerContent,
      status: res.ok ? "sent" : "error",
      error_message: res.ok ? null : (result.error?.message || "Unknown error"),
    });

    if (!res.ok) {
      console.error("[mro-direct-webhook] Send error:", result);
    } else {
      console.log("[mro-direct-webhook] Message sent to:", recipientId);
    }
  } catch (error) {
    console.error("[mro-direct-webhook] Send error:", error);
    await supabase.from("mro_direct_logs").insert({
      automation_id: automationId,
      event_type: eventType,
      sender_id: recipientId,
      message_sent: message,
      trigger_content: triggerContent,
      status: "error",
      error_message: error.message,
    });
  }
}
