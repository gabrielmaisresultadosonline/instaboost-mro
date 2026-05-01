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
            if (value.statuses) {
              for (const statusUpdate of value.statuses) {
                const { id: meta_message_id, status, errors } = statusUpdate
                console.log(`Status update for ${meta_message_id}: ${status}`)
                
                let updateData: any = { status }
                if (errors && errors.length > 0) {
                  console.error(`Message ${meta_message_id} failed with errors:`, JSON.stringify(errors))
                  updateData.error_code = errors[0].code?.toString();
                  updateData.error_message = errors[0].message || errors[0].details;
                }

                await supabase
                  .from('crm_messages')
                  .update(updateData)
                  .eq('meta_message_id', meta_message_id)
              }
            }

            if (value.messages) {
              for (const message of value.messages) {
                const wa_id = message.from
                const contact_name = value.contacts?.[0]?.profile?.name || wa_id
                
                const { data: contactBeforeUpdate } = await supabase
                  .from('crm_contacts')
                  .select('*')
                  .eq('wa_id', wa_id)
                  .single()
                
                const now = new Date();
                const lastIntDate = contactBeforeUpdate?.last_interaction ? new Date(contactBeforeUpdate.last_interaction) : null;
                const isFirstMessageOfDay = !lastIntDate || 
                  lastIntDate.getUTCDate() !== now.getUTCDate() || 
                  lastIntDate.getUTCMonth() !== now.getUTCMonth() || 
                  lastIntDate.getUTCFullYear() !== now.getUTCFullYear();

                let contact = contactBeforeUpdate;
                
                if (!contact) {
                  const { data: newContact } = await supabase
                    .from('crm_contacts')
                    .insert({ 
                      wa_id, 
                      name: contact_name, 
                      last_interaction: now.toISOString(),
                      total_messages_received: 1,
                      status: 'new',
                      ai_active: true
                    })
                    .select('*')
                    .single()
                  contact = newContact
                } else {
                  const { data: updatedContact } = await supabase
                    .from('crm_contacts')
                    .update({ 
                      last_interaction: now.toISOString(), 
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
                  let media_url = null
                  
                  // Get Meta settings for media download
                  const { data: settings } = await supabase
                    .from('crm_settings')
                    .select('*')
                    .eq('id', '00000000-0000-0000-0000-000000000001')
                    .single()
                  
                  const meta_access_token = settings?.meta_access_token

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
                    if (meta_access_token) {
                      media_url = await downloadAndUploadMedia(supabase, meta_access_token, message.audio.id, 'audio')
                    }
                  } else if (message.type === 'image') {
                    content = message.image.caption || `[Image Message]`
                    if (meta_access_token) {
                      media_url = await downloadAndUploadMedia(supabase, meta_access_token, message.image.id, 'image')
                    }
                  } else if (message.type === 'video') {
                    content = message.video.caption || `[Video Message]`
                    if (meta_access_token) {
                      media_url = await downloadAndUploadMedia(supabase, meta_access_token, message.video.id, 'video')
                    }
                  } else if (message.type === 'document') {
                    content = message.document.filename || `[Document]`
                    if (meta_access_token) {
                      media_url = await downloadAndUploadMedia(supabase, meta_access_token, message.document.id, 'document', message.document.filename)
                    }
                  } else if (message.type === 'sticker') {
                    content = `[Sticker]`
                    if (meta_access_token) {
                      media_url = await downloadAndUploadMedia(supabase, meta_access_token, message.sticker.id, 'image')
                    }
                  } else if (message.type === 'location') {
                    content = `[Localização] Lat: ${message.location.latitude}, Long: ${message.location.longitude}`
                    if (message.location.name) content += ` (${message.location.name})`
                  } else if (message.type === 'contacts') {
                    const contactNames = message.contacts.map((c: any) => c.name.formatted_name).join(', ')
                    content = `[Contato] ${contactNames}`
                  } else if (message.type === 'reaction') {
                    content = `[Reação] ${message.reaction.emoji}`
                  } else {
                    content = `[Mensagem: ${message.type}]`
                  }

                  await supabase.from('crm_messages').insert({
                    contact_id: contact.id,
                    direction: 'inbound',
                    message_type: message_type,
                    content: content,
                    media_url: media_url,
                    meta_message_id: message.id,
                    status: 'received',
                    metadata: message // Store raw payload for debugging
                  })

                  await supabase.rpc('increment_crm_metric', { metric_column: 'responded_count' })

                  // --- FLOW LOGIC ---
                  
                  // 1. Check if waiting for response in current flow
                  if (contact.flow_state === 'waiting_response' && contact.current_flow_id) {
                    let buttonId = null;
                    if (message.type === 'interactive' && message.interactive.type === 'button_reply') {
                      buttonId = message.interactive.button_reply.id;
                    }

                    // Cancel any scheduled followups for this flow/contact BEFORE continuing
                    await supabase.from('crm_scheduled_messages')
                      .update({ status: 'cancelled' })
                      .eq('contact_id', contact.id)
                      .eq('status', 'pending');

                    await supabase.functions.invoke('meta-whatsapp-crm', {
                      body: { 
                        action: 'continueFlow', 
                        contactId: contact.id, 
                        waId: wa_id, 
                        buttonId,
                        text: content 
                      }
                    })
                    
                    return new Response('OK - Flow Continued', { status: 200 })
                  }

                  // 2. Check for triggers (Keywords, New Contact, 24h Inactivity)
                  const isNewContact = contact.total_messages_received === 1;
                  const lastInteraction = contact.last_interaction ? new Date(contact.last_interaction).getTime() : 0;
                  const isAfter24h = lastInteraction > 0 && (new Date().getTime() - lastInteraction) > 24 * 60 * 60 * 1000;

                  if (message.type === 'text') {
                    const text = message.text.body.toLowerCase().trim();
                    
                    // Search for flows with matching keywords or type
                    const { data: flows } = await supabase
                      .from('crm_flows')
                      .select('*')
                      .eq('is_active', true);
                    
                    let triggeredFlow = null;

                    if (flows) {
                      triggeredFlow = flows.find(f => 
                        f.trigger_type === 'keyword' && 
                        (f.trigger_keywords?.some((k: string) => k.toLowerCase() === text) || 
                         f.trigger_keyword?.toLowerCase() === text)
                      );

                      if (!triggeredFlow && isFirstMessageOfDay) {
                        triggeredFlow = flows.find(f => f.trigger_type === 'first_message_day');
                      }

                      if (!triggeredFlow && isAfter24h) {
                        triggeredFlow = flows.find(f => f.trigger_type === '24h_inactivity');
                      }

                      if (!triggeredFlow && isNewContact) {
                        triggeredFlow = flows.find(f => f.trigger_type === 'new_contact' || f.trigger_type === 'first_message');
                      }
                    }

                    if (triggeredFlow) {
                      console.log(`Triggering flow ${triggeredFlow.name} for contact ${wa_id}`);
                      await supabase.functions.invoke('meta-whatsapp-crm', {
                        body: { action: 'startFlow', flowId: triggeredFlow.id, contactId: contact.id, waId: wa_id }
                      })
                      return new Response('OK - Flow Triggered', { status: 200 })
                    }
                  }

                  // 3. AI Agent Logic
                  console.log('Checking AI Agent conditions:', { 
                    enabled: settings?.ai_agent_enabled, 
                    hasKey: !!settings?.openai_api_key, 
                    contactAiActive: contact.ai_active,
                    trigger: settings?.ai_agent_trigger,
                    isNewContact
                  });

                  if (settings?.ai_agent_enabled && settings?.openai_api_key && contact.ai_active) {
                    let shouldTriggerAI = false;
                    if (settings.ai_agent_trigger === 'all') shouldTriggerAI = true;
                    else if (settings.ai_agent_trigger === 'first_message' && isNewContact) shouldTriggerAI = true;
                    else if (settings.ai_agent_trigger === 'manual' && contact.ai_active) shouldTriggerAI = true;

                    console.log(`AI Agent should trigger: ${shouldTriggerAI}`);
                    
                    if (shouldTriggerAI) {
                      const { data: history } = await supabase
                        .from('crm_messages')
                        .select('content, direction, message_type, media_url')
                        .eq('contact_id', contact.id)
                        .order('created_at', { ascending: false })
                        .limit(15);

                      const { data: templates } = await supabase.from('crm_templates').select('name, components, knowledge_description');
                      const { data: flows } = await supabase.from('crm_flows').select('id, name').eq('is_active', true);

                      const systemPrompt = `
${settings.ai_system_prompt || 'Você é um assistente de vendas profissional.'}

TEMPLATES DISPONÍVEIS (IMPORTANTE: Use [SEND_TEMPLATE: nome] em uma linha isolada para enviar um template oficial):
${templates?.map(t => {
  const body = t.components?.find((c: any) => c.type === 'BODY')?.text || '';
  const buttonsComponent = t.components?.find((c: any) => c.type === 'BUTTONS');
  const buttonsList = buttonsComponent?.buttons?.map((b: any, idx: number) => {
    let info = `[${b.type || 'BUTTON'}]: "${b.text}"`;
    if (b.url) info += ` (Link: ${b.url})`;
    if (b.phone_number) info += ` (Tel: ${b.phone_number})`;
    return info;
  }).join(' | ') || 'Nenhum';
  
  const knowledge = t.knowledge_description ? `\n   - QUANDO USAR: ${t.knowledge_description}` : '';
  return `- NOME: ${t.name}\n   - O QUE ENVIA: "${body}"\n   - BOTÕES: ${buttonsList}${knowledge}`;
}).join('\n')}

FLUXOS DISPONÍVEIS:
${flows?.map(f => `- ${f.name} (ID: ${f.id})`).join('\n')}

DIRETRIZES DE RESPOSTA (Siga rigorosamente):
1. Se o usuário pedir o SITE ou catálogos, você DEVE enviar: 
   Uma frase curta de confirmação e, na linha de baixo, APENAS [SEND_TEMPLATE: acesse_site]
2. Se o usuário pedir o INSTAGRAM ou seguir redes sociais, você DEVE enviar:
   Uma frase curta de confirmação e, na linha de baixo, APENAS [SEND_TEMPLATE: segue_nosso_insta]
3. NUNCA escreva o conteúdo do template ou o link no texto, use a tag [SEND_TEMPLATE: nome].
4. Sempre responda em mensagens separadas: o texto primeiro e o template logo abaixo.
5. Se não houver template para o que foi pedido, responda normalmente em texto.
6. Mantenha as mensagens de confirmação curtas e gentis.
`;

                      const openaiMessages: any[] = [{ role: 'system', content: systemPrompt }];
                      
                      // Process history for OpenAI
                      for (const msg of (history || []).reverse()) {
                        const role = msg.direction === 'inbound' ? 'user' : 'assistant';
                        
                        if (msg.message_type === 'image' && msg.media_url) {
                          openaiMessages.push({
                            role,
                            content: [
                              { type: 'text', text: msg.content || 'Imagem enviada pelo usuário.' },
                              { type: 'image_url', image_url: { url: msg.media_url } }
                            ]
                          });
                        } else if (msg.message_type === 'audio' && msg.media_url && msg.direction === 'inbound') {
                          // For audio, we'll try to transcribe it using Whisper
                          try {
                            const transcription = await transcribeAudio(settings.openai_api_key, msg.media_url);
                            openaiMessages.push({ role, content: `[Transcrição de Áudio]: ${transcription}` });
                          } catch (err) {
                            openaiMessages.push({ role, content: `[Áudio enviado, mas não foi possível transcrever]` });
                          }
                        } else {
                          openaiMessages.push({ role, content: msg.content });
                        }
                      }

                      try {
                        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${settings.openai_api_key}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            model: 'gpt-4o-mini', // Switched to gpt-4o-mini for better cost/quota management while maintaining vision support
                            messages: openaiMessages,
                            max_tokens: 500
                          })
                        });

                        const aiData = await aiResponse.json();
                        if (aiData.error) {
                          console.error('OpenAI API Error:', aiData.error);
                          // If it's a quota error, we should log it specifically
                          if (aiData.error.code === 'insufficient_quota') {
                             console.error('CRITICAL: OpenAI Quota Exceeded. Please check billing.');
                          }
                          throw new Error(aiData.error.message);
                        }

                        let aiText = aiData.choices[0].message.content.trim();
                        console.log('Raw AI Response:', aiText);
                        
                        // Parse status update tags (side-effect, can be anywhere)
                        const statusMatches = aiText.matchAll(/\[SET_STATUS: (\w+)\]/g);
                        for (const match of statusMatches) {
                          const newStatus = match[1];
                          console.log(`AI setting status to: ${newStatus}`);
                          await supabase.from('crm_contacts').update({ status: newStatus }).eq('id', contact.id);
                        }
                        aiText = aiText.replace(/\[SET_STATUS: \w+\]/g, '').trim();

                        // Parse flow trigger (side-effect, can be anywhere)
                        const flowMatches = aiText.matchAll(/\[START_FLOW: ([\w-]+)\]/g);
                        for (const match of flowMatches) {
                          const flowId = match[1];
                          console.log(`AI suggested starting flow: ${flowId}`);
                          await supabase.functions.invoke('meta-whatsapp-crm', {
                            body: { 
                              action: 'startFlow', 
                              contactId: contact.id, 
                              waId: wa_id, 
                              flowId: flowId
                            }
                          });
                        }
                        aiText = aiText.replace(/\[START_FLOW: [\w-]+\]/g, '').trim();

                        // Now split the text by special tags (QUICK_REPLY or SEND_TEMPLATE)
                        // Using a more robust regex that ensures the tag is handled as a separate part
                        const parts = aiText.split(/(\[QUICK_REPLY:.*?\]|\[SEND_TEMPLATE:.*?\])/i).filter(p => p.trim() !== '');
                        console.log('AI Response parts:', JSON.stringify(parts));

                        for (const part of parts) {
                          const trimmedPart = part.trim();
                          
                          // 1. Handle Template tag (Case-Insensitive)
                          const templateMatch = trimmedPart.match(/\[SEND_TEMPLATE:\s*([\w_-]+)\]/i);
                          if (templateMatch) {
                            const templateName = templateMatch[1].trim();
                            console.log(`AI matched template tag: ${templateName}`);
                            
                            const { data: templateExists } = await supabase
                              .from('crm_templates')
                              .select('name, language')
                              .eq('name', templateName)
                              .maybeSingle();

                            if (templateExists) {
                              console.log(`Sending template: ${templateName}`);
                              // Send the template FIRST if it's detected, or keep the order
                              // User wants: "clear I will send yes. and below in a new message only the site template."
                              const templateResp = await supabase.functions.invoke('meta-whatsapp-crm', {
                                body: { 
                                  action: 'sendTemplate', 
                                  to: wa_id, 
                                  templateName: templateName,
                                  languageCode: templateExists.language || 'pt_BR',
                                  contactId: contact.id
                                }
                              });
                              
                              const templateResult = await templateResp.json();
                              console.log(`Template send result:`, JSON.stringify(templateResult));
                              
                              // Check if template failed due to approval and fallback to manual rich message
                              if (!templateResult.success && templateResult.error?.toLowerCase().includes('approved')) {
                                console.log('Template not approved, attempting manual rich message send...');
                                // Re-invoke sendTemplate which has the fallback logic inside internalSendTemplate
                                // (Internal logic in meta-whatsapp-crm already handles fallback if window is open)
                              }
                            } else {
                              console.warn(`Template ${templateName} not found in database. Sending as text fallback.`);
                              await supabase.functions.invoke('meta-whatsapp-crm', {
                                body: { action: 'sendMessage', to: wa_id, text: `[Template: ${templateName}]` }
                              });
                            }
                            continue;
                          }

                          // 2. Handle Quick Reply tag
                          const quickReplyMatch = trimmedPart.match(/\[QUICK_REPLY:\s*["']?([^"']+)["']?\s*\|\s*["']?([^"']+)["']?\s*\|\s*["']?([^"']+)["']?\s*(?:\|\s*["']?([^"']+)["']?\s*)?\]/i);
                          if (quickReplyMatch) {
                            const question = quickReplyMatch[1].trim();
                            const buttons = [quickReplyMatch[2].trim()];
                            if (quickReplyMatch[3]) buttons.push(quickReplyMatch[3].trim());
                            if (quickReplyMatch[4]) buttons.push(quickReplyMatch[4].trim());
                            
                            console.log(`Sending quick reply: ${question}`);
                            await supabase.functions.invoke('meta-whatsapp-crm', {
                              body: { 
                                action: 'sendMessage', 
                                to: wa_id, 
                                text: question,
                                buttons: buttons.map((text, idx) => ({ id: `qr_${idx}`, text: text.substring(0, 20) }))
                              }
                            });
                            continue;
                          }

                          // 3. Normal text
                          if (trimmedPart) {
                            console.log(`Sending text part: ${trimmedPart.substring(0, 50)}...`);
                            await supabase.functions.invoke('meta-whatsapp-crm', {
                              body: { action: 'sendMessage', to: wa_id, text: trimmedPart }
                            });
                            // Small delay between confirmation text and template
                            await new Promise(resolve => setTimeout(resolve, 1500));
                          }
                        }

                        return new Response('OK - AI Responded', { status: 200 });
                      } catch (err) {
                        console.error('AI Error:', err);
                      }
                    }
                  }

                  // 4. Default Auto-Responder (if AI didn't trigger)
                  if (isNewContact) {
                    if (settings?.initial_flow_id) {
                      await supabase.functions.invoke('meta-whatsapp-crm', {
                        body: { action: 'startFlow', flowId: settings.initial_flow_id, contactId: contact.id, waId: wa_id }
                      });
                    } else if (settings?.initial_auto_response_enabled) {
                      if (message.type === 'text') {
                         await supabase.functions.invoke('meta-whatsapp-crm', {
                           body: {
                             action: 'sendMessage',
                             to: wa_id,
                             text: settings.initial_response_text || `Olá ${contact_name}! Como posso te ajudar hoje?`,
                             buttons: settings.initial_response_buttons
                           }
                         });
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Trigger scheduled messages processing
      try {
        await supabase.functions.invoke('meta-whatsapp-crm', { body: { action: 'processScheduled' } });
      } catch (e) {
        console.error('Error triggering scheduled messages:', e);
      }

      return new Response('OK', { status: 200 })
    } catch (error) {
      console.error('Webhook processing error:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  }

  return new Response('Method Not Allowed', { status: 405 })
})

async function transcribeAudio(apiKey: string, audioUrl: string) {
  try {
    const audioRes = await fetch(audioUrl);
    const audioBlob = await audioRes.blob();
    
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.ogg');
    formData.append('model', 'whisper-1');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData
    });

    const data = await res.json();
    return data.text;
  } catch (err) {
    console.error('Transcription error:', err);
    throw err;
  }
}

async function downloadAndUploadMedia(supabase: any, token: string, mediaId: string, type: string, fileName?: string) {
  try {
    console.log(`Fetching media info for ${mediaId}...`);
    const infoRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!infoRes.ok) throw new Error('Failed to get media info');
    const info = await infoRes.json();
    
    if (!info.url) throw new Error('No media URL found');
    
    console.log(`Downloading media from ${info.url}...`);
    const mediaRes = await fetch(info.url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!mediaRes.ok) throw new Error('Failed to download media');
    const blob = await mediaRes.blob();
    
    const ext = info.mime_type?.split('/')?.[1] || 'bin';
    const name = fileName || `${mediaId}.${ext}`;
    const filePath = `inbound/${type}/${Date.now()}_${name}`;
    
    console.log(`Uploading to Supabase Storage: ${filePath}...`);
    const { error: uploadError } = await supabase.storage
      .from('crm-media')
      .upload(filePath, blob, {
        contentType: info.mime_type,
        upsert: true
      });
      
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('crm-media')
      .getPublicUrl(filePath);
      
    return publicUrl;
  } catch (err) {
    console.error('Error downloading/uploading media:', err);
    return null;
  }
}
