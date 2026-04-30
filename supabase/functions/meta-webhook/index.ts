import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  const url = new URL(req.url)

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

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      console.log('Webhook received payload:', JSON.stringify(body, null, 2))

      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            const value = change.value
            if (value.messages) {
              for (const message of value.messages) {
                const wa_id = message.from
                const contact_name = value.contacts?.[0]?.profile?.name || wa_id
                
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
                      name: (!contact.name || contact.name === contact.wa_id) ? contact_name : contact.name,
                      total_messages_received: (contact.total_messages_received || 0) + 1,
                      status: contact.status === 'new' ? 'responded' : contact.status
                    })
                    .eq('id', contact.id)
                    .select('*')
                    .single()
                  contact = updatedContact
                }

                if (contact) {
                  let content = ''
                  let message_type = message.type
                  
                  if (message.type === 'text') {
                    content = message.text.body
                  } else if (message.type === 'button') {
                    content = `[Button Click] ${message.button.text}`
                  } else if (message.type === 'interactive') {
                    if (message.interactive.type === 'button_reply') {
                      content = `[Button Reply] ${message.interactive.button_reply.title}`
                    } else if (message.interactive.type === 'list_reply') {
                      content = `[List Reply] ${message.interactive.list_reply.title}`
                    }
                  } else if (message.type === 'audio') {
                    content = `[Audio Message]`
                  } else if (message.type === 'image') {
                    content = `[Image Message] ${message.image.caption || ''}`
                  } else if (message.type === 'video') {
                    content = `[Video Message] ${message.video.caption || ''}`
                  } else if (message.type === 'document') {
                    content = `[Document] ${message.document.filename || ''}`
                  } else {
                    content = `[${message.type}]`
                  }

                  await supabase.from('crm_messages').insert({
                    contact_id: contact.id,
                    direction: 'inbound',
                    message_type: message_type,
                    content: content,
                    meta_message_id: message.id,
                    status: 'received'
                  })

                  await supabase.rpc('increment_crm_metric', { metric_column: 'responded_count' })

                  // --- FLOW LOGIC ---
                  
                  // 1. Check if waiting for response in current flow
                  if (contact.flow_state === 'waiting_response' && contact.current_flow_id) {
                    let buttonId = null;
                    if (message.type === 'interactive' && message.interactive.type === 'button_reply') {
                      buttonId = message.interactive.button_reply.id;
                    }

                    await supabase.functions.invoke('meta-whatsapp-crm', {
                      body: { action: 'continueFlow', contactId: contact.id, waId: wa_id, buttonId }
                    })
                    
                    // Cancel any scheduled followups for this flow/contact
                    await supabase.from('crm_scheduled_messages')
                      .update({ status: 'cancelled' })
                      .eq('contact_id', contact.id)
                      .eq('status', 'pending');

                    return new Response('OK - Flow Continued', { status: 200 })
                  }

                  // 2. Check for trigger keywords
                  if (message.type === 'text') {
                    const text = message.text.body.toLowerCase().trim()
                    
                    const { data: triggeredFlow } = await supabase
                      .from('crm_flows')
                      .select('*')
                      .eq('is_active', true)
                      .contains('trigger_keywords', [text])
                      .maybeSingle()
                    
                    if (triggeredFlow) {
                      await supabase.functions.invoke('meta-whatsapp-crm', {
                        body: { action: 'startFlow', flowId: triggeredFlow.id, contactId: contact.id, waId: wa_id }
                      })
                      return new Response('OK - Flow Started', { status: 200 })
                    }
                  }

                  // 3. Fallback to AI Agent or Auto-Responder
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
                      const { data: history } = await supabase
                        .from('crm_messages')
                        .select('content, direction')
                        .eq('contact_id', contact.id)
                        .order('created_at', { ascending: false })
                        .limit(10)
                      
                      const messages = [
                        { role: 'system', content: 'Você é um assistente de vendas profissional para a empresa Mais Resultados Online. Responda em Português do Brasil.' },
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
                            model: 'gpt-4o-mini',
                            messages: messages
                          })
                        })
                        const aiData = await aiResponse.json()
                        const aiText = aiData.choices[0].message.content

                        await supabase.functions.invoke('meta-whatsapp-crm', {
                          body: { action: 'sendMessage', to: wa_id, text: aiText }
                        })
                        return new Response('OK with AI', { status: 200 })
                      } catch (err) {
                        console.error('AI Error:', err)
                      }
                    }
                  }

                  if (contact.total_messages_received === 1) {
                    if (settings?.initial_flow_id) {
                      await supabase.functions.invoke('meta-whatsapp-crm', {
                        body: {
                          action: 'startFlow',
                          flowId: settings.initial_flow_id,
                          contactId: contact.id,
                          waId: wa_id
                        }
                      })
                    } else if (settings?.initial_auto_response_enabled) {
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
      }

      return new Response('OK', { status: 200 })
    } catch (error) {
      console.error('Webhook processing error:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  }

  return new Response('Method Not Allowed', { status: 405 })
})
