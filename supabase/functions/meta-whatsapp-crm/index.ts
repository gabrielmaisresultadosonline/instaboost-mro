import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { action, ...params } = await req.json()

    // Get Meta Settings
    const { data: settings } = await supabase
      .from('crm_settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single()

    if (!settings?.meta_access_token) {
      throw new Error('Meta API credentials not configured')
    }

    const { meta_access_token, meta_phone_number_id } = settings

    if (action === 'getTemplates') {
      const { meta_waba_id } = settings
      const response = await fetch(
        `https://graph.facebook.com/v17.0/${meta_waba_id}/message_templates`,
        {
          headers: { 'Authorization': `Bearer ${meta_access_token}` },
        }
      )
      const data = await response.json()
      
      if (data.data) {
        // Sync to database
        for (const template of data.data) {
          await supabase.from('crm_templates').upsert({
            id: template.id,
            name: template.name,
            category: template.category,
            language: template.language,
            status: template.status,
            components: template.components,
            updated_at: new Date().toISOString()
          })
        }
      }
      
      return new Response(JSON.stringify({ success: true, templates: data.data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'sendTemplate') {
      const { to, templateName, languageCode, components } = params
      const response = await fetch(
        `https://graph.facebook.com/v17.0/${meta_phone_number_id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${meta_access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
              name: templateName,
              language: { code: languageCode },
              components: components || []
            }
          }),
        }
      )
      const result = await response.json()
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'sendMessage') {
      const { to, text, buttons, audioUrl } = params
      
      let body: any = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
      }

      if (audioUrl) {
        body.type = "audio"
        body.audio = { link: audioUrl }
      } else if (buttons && buttons.length > 0) {
        body.type = "interactive"
        body.interactive = {
          type: "button",
          body: { text: text },
          action: {
            buttons: buttons.map((b: any) => ({
              type: "reply",
              reply: {
                id: b.id || Math.random().toString(36).substr(2, 9),
                title: b.text.substring(0, 20)
              }
            }))
          }
        }
      } else {
        body.type = "text"
        body.text = { body: text }
      }

      const response = await fetch(
        `https://graph.facebook.com/v17.0/${meta_phone_number_id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${meta_access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      )

      const result = await response.json()
      
      // Log outbound message and update stats
      if (result.messages && result.messages[0]) {
        const { data: contact } = await supabase
          .from('crm_contacts')
          .select('id, total_messages_sent')
          .eq('wa_id', to)
          .single()

        if (contact) {
          await supabase.from('crm_messages').insert({
            contact_id: contact.id,
            direction: 'outbound',
            content: audioUrl ? '[Mensagem de Áudio]' : text,
            message_type: audioUrl ? 'audio' : 'text',
            meta_message_id: result.messages[0].id,
            status: 'sent'
          })

          await supabase
            .from('crm_contacts')
            .update({ total_messages_sent: (contact.total_messages_sent || 0) + 1 })
            .eq('id', contact.id)
          
          // Increment sent metric
          await supabase.rpc('increment_crm_metric', { metric_column: 'sent_count' }).catch(() => {})
        }
      }

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'broadcast') {
      const { name, text, contactIds } = params
      
      const { data: broadcast } = await supabase
        .from('crm_broadcasts')
        .insert({
          name,
          message_text: text,
          total_contacts: contactIds.length,
          status: 'sending'
        })
        .select('id')
        .single()

      if (!broadcast) throw new Error('Failed to create broadcast record')
      
      const { data: contacts } = await supabase
        .from('crm_contacts')
        .select('wa_id')
        .in('id', contactIds)

      let sent = 0
      let failed = 0

      for (const contact of contacts || []) {
        try {
          const response = await fetch(
            `https://graph.facebook.com/v17.0/${meta_phone_number_id}/messages`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${meta_access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: contact.wa_id,
                type: "text",
                text: { body: text }
              }),
            }
          )
          
          if (response.ok) sent++
          else failed++
        } catch (e) {
          failed++
        }
      }

      await supabase
        .from('crm_broadcasts')
        .update({ status: 'completed', sent_count: sent, failed_count: failed })
        .eq('id', broadcast.id)

      return new Response(JSON.stringify({ success: true, sent, failed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
