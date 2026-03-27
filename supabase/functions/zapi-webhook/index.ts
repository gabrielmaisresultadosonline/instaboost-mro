import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    const isMessage = payload.phone && (payload.text || payload.image || payload.audio || payload.document);
    const isStatus = payload.type === 'DeliveryCallback' || payload.type === 'MessageStatusCallback';
    const isConnection = payload.connected !== undefined;

    if (isMessage) {
      // Incoming message
      const phone = payload.phone?.replace(/\D/g, '');
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

      // Determine direction
      const direction = payload.fromMe ? 'outgoing' : 'incoming';

      // Save message
      await supabase.from('zapi_messages').insert({
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

      // Upsert contact
      const contactData: Record<string, unknown> = {
        phone,
        name: senderName,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (direction === 'incoming') {
        // Get current unread count
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
      // Update message status
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
        .neq('id', '00000000-0000-0000-0000-000000000000'); // update all rows
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
