import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { action, data } = await req.json();

    // Get Z-API settings
    const { data: settings, error: settingsError } = await supabase
      .from('zapi_settings')
      .select('*')
      .limit(1)
      .single();

    // For save-settings action, we don't need existing settings
    if (action === 'save-settings') {
      const { instance_id, token, client_token } = data;
      
      // Upsert settings
      const { data: existing } = await supabase
        .from('zapi_settings')
        .select('id')
        .limit(1)
        .single();

      if (existing) {
        await supabase
          .from('zapi_settings')
          .update({ instance_id, token, client_token, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('zapi_settings')
          .insert({ instance_id, token, client_token });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get-settings') {
      return new Response(JSON.stringify({ settings: settings || null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!settings || !settings.instance_id || !settings.token) {
      return new Response(JSON.stringify({ error: 'Z-API não configurado. Configure Instance ID e Token.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = `https://api.z-api.io/instances/${settings.instance_id}/token/${settings.token}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (settings.client_token) {
      headers['Client-Token'] = settings.client_token;
    }

    let response;

    switch (action) {
      case 'get-status': {
        response = await fetch(`${baseUrl}/status`, { headers });
        const statusData = await response.json();
        
        // Update connection status
        await supabase
          .from('zapi_settings')
          .update({ 
            is_connected: statusData?.connected === true,
            phone_number: statusData?.smartphoneConnected || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id);

        return new Response(JSON.stringify(statusData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-qrcode': {
        response = await fetch(`${baseUrl}/qr-code`, { headers });
        const qrData = await response.json();
        return new Response(JSON.stringify(qrData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-chats': {
        response = await fetch(`${baseUrl}/chats`, { headers });
        const chatsData = await response.json();
        return new Response(JSON.stringify(chatsData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-messages': {
        const { phone } = data;
        response = await fetch(`${baseUrl}/get-messages/${phone}`, { headers });
        const messagesData = await response.json();
        return new Response(JSON.stringify(messagesData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send-text': {
        const { phone, message } = data;
        response = await fetch(`${baseUrl}/send-text`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ phone, message }),
        });
        const sendResult = await response.json();

        // Save outgoing message
        await supabase.from('zapi_messages').insert({
          message_id: sendResult?.messageId || null,
          phone,
          direction: 'outgoing',
          message_type: 'text',
          content: message,
          status: 'sent',
          timestamp: Date.now(),
        });

        // Update contact last message
        await supabase.from('zapi_contacts').upsert({
          phone,
          last_message_at: new Date().toISOString(),
        }, { onConflict: 'phone' });

        return new Response(JSON.stringify(sendResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send-image': {
        const { phone: imgPhone, image, caption } = data;
        response = await fetch(`${baseUrl}/send-image`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ phone: imgPhone, image, caption }),
        });
        const imgResult = await response.json();

        await supabase.from('zapi_messages').insert({
          message_id: imgResult?.messageId || null,
          phone: imgPhone,
          direction: 'outgoing',
          message_type: 'image',
          content: caption || '',
          media_url: image,
          status: 'sent',
          timestamp: Date.now(),
        });

        return new Response(JSON.stringify(imgResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send-audio': {
        const { phone: audioPhone, audio } = data;
        response = await fetch(`${baseUrl}/send-audio`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ phone: audioPhone, audio }),
        });
        const audioResult = await response.json();

        await supabase.from('zapi_messages').insert({
          message_id: audioResult?.messageId || null,
          phone: audioPhone,
          direction: 'outgoing',
          message_type: 'audio',
          media_url: audio,
          status: 'sent',
          timestamp: Date.now(),
        });

        return new Response(JSON.stringify(audioResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send-document': {
        const { phone: docPhone, document: docUrl, fileName } = data;
        response = await fetch(`${baseUrl}/send-document/pdf`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ phone: docPhone, document: docUrl, fileName }),
        });
        const docResult = await response.json();

        await supabase.from('zapi_messages').insert({
          message_id: docResult?.messageId || null,
          phone: docPhone,
          direction: 'outgoing',
          message_type: 'document',
          content: fileName || '',
          media_url: docUrl,
          status: 'sent',
          timestamp: Date.now(),
        });

        return new Response(JSON.stringify(docResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-profile-picture': {
        const { phone: picPhone } = data;
        response = await fetch(`${baseUrl}/profile-picture/${picPhone}`, { headers });
        const picData = await response.json();
        return new Response(JSON.stringify(picData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-contacts': {
        response = await fetch(`${baseUrl}/contacts`, { headers });
        const contactsData = await response.json();
        return new Response(JSON.stringify(contactsData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'disconnect': {
        response = await fetch(`${baseUrl}/disconnect`, {
          method: 'POST',
          headers,
        });
        const disconnectData = await response.json();

        await supabase
          .from('zapi_settings')
          .update({ is_connected: false, updated_at: new Date().toISOString() })
          .eq('id', settings.id);

        return new Response(JSON.stringify(disconnectData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'set-webhook': {
        const { webhookUrl } = data;
        
        // Set all webhooks
        const webhookEndpoints = [
          'update-webhook-received',
          'update-webhook-delivery', 
          'update-webhook-message-status',
          'update-webhook-connected',
          'update-webhook-disconnected',
        ];

        for (const endpoint of webhookEndpoints) {
          await fetch(`${baseUrl}/${endpoint}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ value: webhookUrl }),
          });
        }

        await supabase
          .from('zapi_settings')
          .update({ webhook_url: webhookUrl, updated_at: new Date().toISOString() })
          .eq('id', settings.id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Z-API proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
