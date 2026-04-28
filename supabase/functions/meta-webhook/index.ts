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
                  .select('*')
                  .eq('wa_id', wa_id)
                  .single()
                
                if (!contact) {
                  const { data: newContact } = await supabase
                    .from('crm_contacts')
                    .insert({ 
                      wa_id, 
                      name: contact_name, 
                      last_interaction: new Date().toISOString(),
                      total_messages_received: 1,
                      status: 'new'
                    })
                    .select('*')
                    .single()
                  contact = newContact
                } else {
                  const { data: updatedContact } = await supabase
                    .from('crm_contacts')
                    .update({ 
                      last_interaction: new Date().toISOString(), 
                      name: contact_name,
                      total_messages_received: (contact.total_messages_received || 0) + 1,
                      status: contact.status === 'new' ? 'responded' : contact.status
                    })
                    .eq('id', contact.id)
                    .select('*')
                    .single()
                  contact = updatedContact
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
                  } else if (message.type === 'audio') {
                    content = `[Audio Message]`
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

                  // Update metrics
                  await supabase.rpc('increment_crm_metric', { metric_column: 'responded_count' }).catch(() => {
                    // Fallback if RPC doesn't exist
                    supabase.from('crm_metrics')
                      .upsert({ date: new Date().toISOString().split('T')[0] }, { onConflict: 'date' })
                      .then(({ data }) => {
                         // We'll handle metrics better in a real app, for now this is a placeholder
                      })
                  })

                  // 3. AI Agent or Auto-Responder logic
                  const { data: settings } = await supabase
                    .from('crm_settings')
                    .select('*')
                    .eq('id', '00000000-0000-0000-0000-000000000001')
                    .single()

                  if (settings?.ai_agent_enabled && settings?.openai_api_key && message.type === 'text') {
                    let shouldTrigger = false
                    if (settings.ai_agent_trigger === 'all') shouldTrigger = true
                    else if (settings.ai_agent_trigger === 'first_message' && contact.total_messages_received === 1) shouldTrigger = true
                    
                    if (shouldTrigger) {
                      // Fetch context
                      const { data: history } = await supabase
                        .from('crm_messages')
                        .select('content, direction')
                        .eq('contact_id', contact.id)
                        .order('created_at', { ascending: false })
                        .limit(5)
                      
                      const messages = [
                        { role: 'system', content: 'Você é um assistente de vendas profissional para a empresa Mais Resultados Online. Seja prestativo, direto e use uma linguagem amigável mas profissional.' },
                        ...history!.reverse().map(m => ({ 
                          role: m.direction === 'inbound' ? 'user' : 'assistant', 
                          content: m.content 
                        }))
                      ]

                      try {
                        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${settings.openai_api_key}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            model: 'gpt-3.5-turbo',
                            messages: messages
                          })
                        })
                        const aiData = await aiResponse.json()
                        const aiText = aiData.choices[0].message.content

                        // Send AI response
                        await supabase.functions.invoke('meta-whatsapp-crm', {
                          body: {
                            action: 'sendMessage',
                            to: wa_id,
                            text: aiText
                          }
                        })
                        return new Response('OK with AI', { status: 200 })
                      } catch (err) {
                        console.error('AI Error:', err)
                      }
                    }
                  }

                  // 4. Initial Auto-Responder logic (only if AI didn't trigger)
                  if (settings?.initial_auto_response_enabled && contact.total_messages_received === 1) {
                    if (message.type === 'text') {
                       await supabase.functions.invoke('meta-whatsapp-crm', {
                         body: {
                           action: 'sendMessage',
                           to: wa_id,
                           text: settings.initial_response_text || `Olá ${contact_name}! Como posso te ajudar hoje?`,
                           buttons: settings.initial_response_buttons
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
