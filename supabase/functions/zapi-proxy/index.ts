import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const normalizePhone = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const base = value.trim().split("@")[0] ?? "";
  const digits = base.replace(/\D/g, "");
  return digits || base;
};

const normalizeBrazilianPhone = (phone: string): string => {
  const d = phone.replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("55")) {
    const ddd = d.slice(2, 4);
    const rest = d.slice(4);
    if (rest.startsWith("9") && rest.length === 9) {
      return `55${ddd}${rest.slice(1)}`;
    }
  }
  return d;
};

const isRealPhone = (phone: string): boolean => {
  const d = phone.replace(/\D/g, "");
  // Real phone numbers: 10-13 digits. Z-API lids are typically 15+ digits
  return d.length >= 10 && d.length <= 13;
};

const safeJson = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const data = body?.data ?? {};

    if (!action || typeof action !== "string") {
      return new Response(JSON.stringify({ error: "Ação inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For save-settings action, we don't need existing settings
    if (action === "save-settings") {
      const instance_id = typeof data.instance_id === "string" ? data.instance_id.trim() : "";
      const token = typeof data.token === "string" ? data.token.trim() : "";
      const client_token = typeof data.client_token === "string" ? data.client_token.trim() : null;

      if (!instance_id || !token) {
        return new Response(JSON.stringify({ error: "Instance ID e Token são obrigatórios." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await supabase
        .from("zapi_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from("zapi_settings")
          .update({ instance_id, token, client_token, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("zapi_settings")
          .insert({ instance_id, token, client_token });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase
      .from("zapi_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (action === "get-settings") {
      return new Response(JSON.stringify({ settings: settings || null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-db-contacts") {
      const { data: contacts, error } = await supabase
        .from("zapi_contacts")
        .select("*")
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ contacts: contacts ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-db-messages") {
      const rawPhone = normalizePhone(data.phone);
      const phone = normalizeBrazilianPhone(rawPhone);
      if (!phone) {
        return new Response(JSON.stringify({ messages: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const phonesToQuery = [phone];
      if (rawPhone && rawPhone !== phone) phonesToQuery.push(rawPhone);

      const { data: messages, error } = await supabase
        .from("zapi_messages")
        .select("*")
        .in("phone", phonesToQuery)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify({ messages: messages ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "mark-read") {
      const phone = normalizeBrazilianPhone(normalizePhone(data.phone));
      if (phone) {
        await supabase
          .from("zapi_contacts")
          .update({ unread_count: 0, updated_at: new Date().toISOString() })
          .eq("phone", phone);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!settings?.instance_id || !settings?.token) {
      return new Response(JSON.stringify({ error: "Z-API não configurado. Configure Instance ID e Token." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = `https://api.z-api.io/instances/${settings.instance_id}/token/${settings.token}`;
    const zapiHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (settings.client_token) {
      zapiHeaders["Client-Token"] = settings.client_token;
    }

    const callZapi = async (
      path: string,
      init?: RequestInit,
    ) => {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          ...zapiHeaders,
          ...(init?.headers || {}),
        },
      });
      const payload = await safeJson(response);
      return { response, payload };
    };

    switch (action) {
      case "sync-chats": {
        const { payload } = await callZapi("/chats");
        const chatList = Array.isArray(payload)
          ? payload
          : (payload?.chats || payload?.data || []);

        if (!Array.isArray(chatList)) {
          return new Response(JSON.stringify({ synced: 0, contacts: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let synced = 0;
        const seenPhones = new Set<string>();

        for (const chat of chatList) {
          const rawPhone = normalizePhone(chat?.phone || chat?.chatId || chat?.waId || chat?.id);
          if (!rawPhone || !isRealPhone(rawPhone)) continue;
          const phone = normalizeBrazilianPhone(rawPhone);
          if (seenPhones.has(phone)) continue;
          seenPhones.add(phone);

          const lastMessageRaw = Number(chat?.lastMessageTimestamp ?? chat?.lastMessageTime ?? chat?.last_message_at ?? Date.now());
          const lastMessageAt = Number.isFinite(lastMessageRaw)
            ? new Date(lastMessageRaw > 1e12 ? lastMessageRaw : lastMessageRaw * 1000).toISOString()
            : new Date().toISOString();

          const unreadCount = Number(chat?.unreadMessages ?? chat?.messagesUnread ?? chat?.unread ?? 0) || 0;

          const { error } = await supabase
            .from("zapi_contacts")
            .upsert({
              phone,
              name: chat?.name || chat?.chatName || chat?.pushName || phone,
              profile_pic_url: chat?.profileThumbnail || chat?.imgUrl || chat?.profilePicUrl || null,
              last_message_at: lastMessageAt,
              unread_count: unreadCount,
              updated_at: new Date().toISOString(),
            }, { onConflict: "phone" });

          if (!error) synced += 1;
        }

        // Clean up invalid contacts (internal IDs / duplicates)
        const { data: allContacts } = await supabase
          .from("zapi_contacts")
          .select("id, phone");
        if (allContacts) {
          for (const c of allContacts) {
            if (!isRealPhone(c.phone)) {
              await supabase.from("zapi_contacts").delete().eq("id", c.id);
            } else {
              const normalized = normalizeBrazilianPhone(c.phone);
              if (normalized !== c.phone) {
                const { data: existing } = await supabase
                  .from("zapi_contacts")
                  .select("id")
                  .eq("phone", normalized)
                  .maybeSingle();
                if (existing) {
                  await supabase.from("zapi_messages").update({ phone: normalized }).eq("phone", c.phone);
                  await supabase.from("zapi_contacts").delete().eq("id", c.id);
                } else {
                  await supabase.from("zapi_contacts").update({ phone: normalized, updated_at: new Date().toISOString() }).eq("id", c.id);
                }
              }
            }
          }
        }

        const { data: contacts } = await supabase
          .from("zapi_contacts")
          .select("*")
          .order("last_message_at", { ascending: false });

        return new Response(JSON.stringify({ synced, contacts: contacts ?? [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get-status": {
        const { payload: statusData } = await callZapi("/status");

        await supabase
          .from("zapi_settings")
          .update({
            is_connected: statusData?.connected === true,
            phone_number: statusData?.smartphoneConnected || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", settings.id);

        return new Response(JSON.stringify(statusData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get-qrcode": {
        const { payload: qrData } = await callZapi("/qr-code");
        return new Response(JSON.stringify(qrData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get-chats": {
        const { payload: chatsData } = await callZapi("/chats");
        return new Response(JSON.stringify(chatsData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get-messages": {
        const phone = normalizePhone(data.phone);
        if (!phone) {
          return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { payload: messagesData } = await callZapi(`/get-messages/${phone}`);
        return new Response(JSON.stringify(messagesData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sync-messages": {
        const rawSyncPhone = normalizePhone(data.phone);
        const phone = normalizeBrazilianPhone(rawSyncPhone);
        if (!phone) {
          return new Response(JSON.stringify({ inserted: 0 }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { payload } = await callZapi(`/get-messages/${rawSyncPhone || phone}`);
        const messages = Array.isArray(payload)
          ? payload
          : (payload?.messages || payload?.data || []);

        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response(JSON.stringify({ inserted: 0 }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const ids = messages
          .map((msg) => msg?.messageId || msg?.zaapId)
          .filter((id): id is string => typeof id === "string" && id.length > 0);

        let existingIds = new Set<string>();
        if (ids.length > 0) {
          const { data: existing } = await supabase
            .from("zapi_messages")
            .select("message_id")
            .in("message_id", ids);

          existingIds = new Set((existing ?? []).map((row: { message_id: string | null }) => row.message_id).filter(Boolean) as string[]);
        }

        let inserted = 0;

        for (const msg of messages.slice(-100)) {
          const messageId = msg?.messageId || msg?.zaapId || null;
          if (messageId && existingIds.has(messageId)) continue;

          const direction = msg?.fromMe ? "outgoing" : "incoming";
          const messageType = msg?.image
            ? "image"
            : msg?.audio
            ? "audio"
            : msg?.document
            ? "document"
            : msg?.video
            ? "video"
            : "text";

          const content =
            msg?.text?.message ||
            msg?.text ||
            msg?.image?.caption ||
            msg?.video?.caption ||
            msg?.document?.fileName ||
            "";

          const mediaUrl =
            msg?.image?.imageUrl ||
            msg?.image?.url ||
            msg?.audio?.audioUrl ||
            msg?.audio?.url ||
            msg?.video?.videoUrl ||
            msg?.video?.url ||
            msg?.document?.documentUrl ||
            msg?.document?.url ||
            null;

          const messagePhone = normalizeBrazilianPhone(normalizePhone(msg?.phone || phone));

          const { error } = await supabase.from("zapi_messages").insert({
            message_id: messageId,
            phone: messagePhone,
            contact_name: msg?.senderName || msg?.chatName || null,
            direction,
            message_type: messageType,
            content,
            media_url: mediaUrl,
            status: direction === "incoming" ? "received" : "sent",
            is_read: direction === "outgoing",
            timestamp: Number(msg?.momment || msg?.timestamp || Date.now()),
          });

          if (!error) inserted += 1;
        }

        if (inserted > 0) {
          await supabase
            .from("zapi_contacts")
            .upsert({
              phone,
              last_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: "phone" });
        }

        return new Response(JSON.stringify({ inserted }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "send-text": {
        const phone = normalizeBrazilianPhone(normalizePhone(data.phone));
        const message = typeof data.message === "string" ? data.message : "";

        if (!phone || !message.trim()) {
          return new Response(JSON.stringify({ error: "Telefone e mensagem são obrigatórios." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { payload: sendResult } = await callZapi("/send-text", {
          method: "POST",
          body: JSON.stringify({ phone, message }),
        });

        await supabase.from("zapi_messages").insert({
          message_id: sendResult?.messageId || null,
          phone,
          direction: "outgoing",
          message_type: "text",
          content: message,
          status: "sent",
          timestamp: Date.now(),
        });

        await supabase.from("zapi_contacts").upsert({
          phone,
          name: phone,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "phone" });

        return new Response(JSON.stringify(sendResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "send-image": {
        const phone = normalizeBrazilianPhone(normalizePhone(data.phone));
        const image = typeof data.image === "string" ? data.image : "";
        const caption = typeof data.caption === "string" ? data.caption : "";

        const { payload: imgResult } = await callZapi("/send-image", {
          method: "POST",
          body: JSON.stringify({ phone, image, caption }),
        });

        await supabase.from("zapi_messages").insert({
          message_id: imgResult?.messageId || null,
          phone,
          direction: "outgoing",
          message_type: "image",
          content: caption || "",
          media_url: image,
          status: "sent",
          timestamp: Date.now(),
        });

        return new Response(JSON.stringify(imgResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "send-audio": {
        const phone = normalizeBrazilianPhone(normalizePhone(data.phone));
        const audio = typeof data.audio === "string" ? data.audio : "";

        const { payload: audioResult } = await callZapi("/send-audio", {
          method: "POST",
          body: JSON.stringify({ phone, audio }),
        });

        await supabase.from("zapi_messages").insert({
          message_id: audioResult?.messageId || null,
          phone,
          direction: "outgoing",
          message_type: "audio",
          media_url: audio,
          status: "sent",
          timestamp: Date.now(),
        });

        return new Response(JSON.stringify(audioResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "send-document": {
        const phone = normalizeBrazilianPhone(normalizePhone(data.phone));
        const docUrl = typeof data.document === "string" ? data.document : "";
        const fileName = typeof data.fileName === "string" ? data.fileName : "";

        const { payload: docResult } = await callZapi("/send-document/pdf", {
          method: "POST",
          body: JSON.stringify({ phone, document: docUrl, fileName }),
        });

        await supabase.from("zapi_messages").insert({
          message_id: docResult?.messageId || null,
          phone,
          direction: "outgoing",
          message_type: "document",
          content: fileName || "",
          media_url: docUrl,
          status: "sent",
          timestamp: Date.now(),
        });

        return new Response(JSON.stringify(docResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get-profile-picture": {
        const picPhone = normalizeBrazilianPhone(normalizePhone(data.phone));
        const { payload: picData } = await callZapi(`/profile-picture/${picPhone}`);
        return new Response(JSON.stringify(picData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get-contacts": {
        const { payload: contactsData } = await callZapi("/contacts");
        return new Response(JSON.stringify(contactsData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "disconnect": {
        const { payload: disconnectData } = await callZapi("/disconnect", {
          method: "POST",
        });

        await supabase
          .from("zapi_settings")
          .update({ is_connected: false, updated_at: new Date().toISOString() })
          .eq("id", settings.id);

        return new Response(JSON.stringify(disconnectData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "set-webhook": {
        const webhookUrl = typeof data.webhookUrl === "string" ? data.webhookUrl.trim() : "";
        if (!webhookUrl) {
          return new Response(JSON.stringify({ error: "webhookUrl é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const webhookEndpoints = [
          "update-webhook-received",
          "update-webhook-delivery",
          "update-webhook-message-status",
          "update-webhook-connected",
          "update-webhook-disconnected",
        ];

        for (const endpoint of webhookEndpoints) {
          await callZapi(`/${endpoint}`, {
            method: "PUT",
            body: JSON.stringify({ value: webhookUrl }),
          });
        }

        await supabase
          .from("zapi_settings")
          .update({ webhook_url: webhookUrl, updated_at: new Date().toISOString() })
          .eq("id", settings.id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Z-API proxy error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
