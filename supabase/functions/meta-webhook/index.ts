import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  const url = new URL(req.url)

  // Webhook verification (GET)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    // Get verify token from settings
    const { data: settings } = await supabase
      .from('crm_settings')
      .select('webhook_verify_token')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single()

    if (mode === 'subscribe' && token === (settings?.webhook_verify_token || 'mro_token_verification')) {
      return new Response(challenge, { status: 200 })
    } else {
      return new Response('Forbidden', { status: 403 })
    }
  }

  // Handle incoming notifications (POST)
  if (req.method === 'POST') {
    try {
      const body = await req.json()

      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            const value = change.value
            if (value.messages) {
              for (const message of value.messages) {
                const wa_id = message.from
                const contact_name = value.contacts?.[0]?.profile?.name || wa_id
                
                // 1. Find or create contact
                let { data: contact } = await supabase
                  .from('crm_contacts')
                  .select('id')
                  .eq('wa_id', wa_id)
                  .single()
                
                if (!contact) {
                  const { data: newContact } = await supabase
                    .from('crm_contacts')
                    .insert({ wa_id, name: contact_name, last_interaction: new Date().toISOString() })
                    .select('id')
                    .single()
                  contact = newContact
                } else {
                  await supabase
                    .from('crm_contacts')
                    .update({ last_interaction: new Date().toISOString(), name: contact_name })
                    .eq('id', contact.id)
                }

                // 2. Save incoming message
                if (contact) {
                  let content = ''
                  if (message.type === 'text') {
                    content = message.text.body
                  } else if (message.type === 'button') {
                    content = `[Button Click] ${message.button.text}`
                  } else if (message.type === 'interactive' && message.interactive.type === 'button_reply') {
                    content = `[Button Reply] ${message.interactive.button_reply.title}`
                  } else {
                    content = `[${message.type}]`
                  }

                  await supabase.from('crm_messages').insert({
                    contact_id: contact.id,
                    direction: 'inbound',
                    message_type: message.type,
                    content: content,
                    meta_message_id: message.id,
                    status: 'received'
                  })

                  // 3. Initial Auto-Responder logic
                  const { data: settings } = await supabase
                    .from('crm_settings')
                    .select('*')
                    .eq('id', '00000000-0000-0000-0000-000000000001')
                    .single()

                  if (settings?.initial_auto_response_enabled) {
                    // Check if this is the first interaction or a keyword trigger
                    // For now, let's just respond with a "Welcome" button message if enabled
                    // and it's a text message
                    if (message.type === 'text') {
                       // Invoke our meta-whatsapp-crm function to send response
                       await supabase.functions.invoke('meta-whatsapp-crm', {
                         body: {
                           action: 'sendMessage',
                           to: wa_id,
                           text: settings.initial_response_text || `Olá ${contact_name}! Como posso te ajudar hoje?`,
                           buttons: settings.initial_response_buttons || [
                             { id: 'opt_1', text: 'Quero saber mais' },
                             { id: 'opt_2', text: 'Falar com atendente' }
                           ]
                         }
                       })
                    }
                  }
                }
              }
            }
          }
        }
      }

      return new Response('OK', { status: 200 })
    } catch (error) {
      console.error('Webhook processing error:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  }

  return new Response('Method Not Allowed', { status: 405 })
})
