import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const isGroupId = (value: string): boolean => {
  return value.includes("@g.us") || value.includes("-");
};

const normalizePhone = (value: string): string => {
  const trimmed = value.trim();
  if (isGroupId(trimmed)) {
    return trimmed.split("@")[0] ?? "";
  }
  const base = trimmed.split("@")[0] ?? "";
  return base.replace(/\D/g, "") || base;
};

const normalizeBrazilianPhone = (phone: string): string => {
  if (phone.includes("-")) return phone;
  const d = phone.replace(/\D/g, "");
  // 13 digits starting with 55 + DDD + 9xxxx -> remove the extra 9
  if (d.length === 13 && d.startsWith("55")) {
    const ddd = d.slice(2, 4);
    const rest = d.slice(4);
    if (rest.startsWith("9") && rest.length === 9) {
      return `55${ddd}${rest.slice(1)}`;
    }
  }
  return d;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload = await req.json();
    console.log('Z-API Webhook received:', JSON.stringify(payload));

    // Determine event type
    const isMessage = payload.phone && (payload.text || payload.image || payload.audio || payload.document || payload.video || payload.buttonsResponseMessage || payload.listResponseMessage || payload.buttonMessage);
    const isStatus = payload.type === 'DeliveryCallback' || payload.type === 'MessageStatusCallback';
    const isConnection = payload.connected !== undefined;

    if (isMessage) {
      const rawPhone = payload.phone || '';
      const chatIsGroup = isGroupId(rawPhone);
      // Normalize phone consistently with zapi-proxy
      const phone = chatIsGroup
        ? normalizePhone(rawPhone)
        : normalizeBrazilianPhone(normalizePhone(rawPhone));
      const senderName = payload.senderName || payload.chatName || phone;
      
      let messageType = 'text';
      let content = payload.text?.message || payload.text || '';
      let mediaUrl = null;
      let metadata = null;

      if (payload.image) {
        messageType = 'image';
        mediaUrl = payload.image.imageUrl || payload.image.url;
        content = payload.image.caption || '';
      } else if (payload.audio) {
        messageType = 'audio';
        mediaUrl = payload.audio.audioUrl || payload.audio.url;
      } else if (payload.document) {
        messageType = 'document';
        mediaUrl = payload.document.documentUrl || payload.document.url;
        content = payload.document.fileName || '';
      } else if (payload.video) {
        messageType = 'video';
        mediaUrl = payload.video.videoUrl || payload.video.url;
        content = payload.video.caption || '';
      } else if (payload.buttonsResponseMessage) {
        messageType = 'button_response';
        content = payload.buttonsResponseMessage.selectedButtonId || '';
        metadata = {
          selectedButtonId: payload.buttonsResponseMessage.selectedButtonId,
          selectedButtonText: payload.buttonsResponseMessage.selectedDisplayText || content,
        };
      } else if (payload.listResponseMessage) {
        messageType = 'button_response';
        content = payload.listResponseMessage.title || '';
        metadata = {
          selectedButtonId: payload.listResponseMessage.listType?.toString(),
          selectedButtonText: payload.listResponseMessage.title || content,
        };
      } else if (payload.buttonMessage) {
        messageType = 'buttons';
        content = payload.buttonMessage.message || payload.buttonMessage.contentText || '';
        metadata = {
          buttons: (payload.buttonMessage.buttons || []).map((b: any) => ({
            id: b.buttonId || b.id || '',
            label: b.buttonText?.displayText || b.label || b.buttonId || '',
          })),
          title: payload.buttonMessage.title || null,
          footer: payload.buttonMessage.footerText || null,
        };
      }

      // If content is an object (e.g. {message: "text"}), extract the string
      if (typeof content === 'object' && content !== null) {
        content = (content as any).message || JSON.stringify(content);
      }

      const direction = payload.fromMe ? 'outgoing' : 'incoming';

      // Save message
      const { error: msgError } = await supabase.from('zapi_messages').insert({
        message_id: payload.messageId || payload.zaapId || null,
        phone,
        contact_name: senderName,
        direction,
        message_type: messageType,
        content,
        media_url: mediaUrl,
        metadata,
        status: direction === 'incoming' ? 'received' : 'sent',
        is_read: direction === 'outgoing',
        timestamp: payload.momment || payload.timestamp || Date.now(),
      });

      if (msgError) {
        console.error('Error saving message:', msgError);
      }

      // Upsert contact
      const contactData: Record<string, unknown> = {
        phone,
        name: senderName,
        is_group: chatIsGroup,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (direction === 'incoming') {
        const { data: existingContact } = await supabase
          .from('zapi_contacts')
          .select('unread_count')
          .eq('phone', phone)
          .single();

        contactData.unread_count = (existingContact?.unread_count || 0) + 1;
      }

      await supabase.from('zapi_contacts').upsert(contactData, { onConflict: 'phone' });
    }

    if (isStatus && payload.messageId) {
      let status = 'sent';
      if (payload.status === 'RECEIVED' || payload.status === 'DELIVERED') status = 'delivered';
      if (payload.status === 'READ') status = 'read';

      await supabase
        .from('zapi_messages')
        .update({ status })
        .eq('message_id', payload.messageId);
    }

    if (isConnection) {
      await supabase
        .from('zapi_settings')
        .update({ 
          is_connected: payload.connected,
          updated_at: new Date().toISOString()
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Z-API webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
