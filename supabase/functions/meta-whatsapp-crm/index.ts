import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { executeVisualNode, processStep } from "../_shared/flow-executor.ts"

async function processAiAgentResponse(supabase: any, contact: any, waId: string, text?: string) {
  console.log(`[AI-AGENT] Processing response for contact ${waId}. Flow AI Agent.`);
  
  // 1. Obter texto se não fornecido (pegar última mensagem do cliente)
  let messageText = text;
  if (!messageText) {
    const { data: lastMessage } = await supabase
      .from('crm_messages')
      .select('content')
      .eq('contact_id', contact.id)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    messageText = lastMessage?.content || "";
  }

  // 2. Obter contexto da conversa (histórico)
  const { data: recentMessages } = await supabase
    .from('crm_messages')
    .select('content, direction')
    .eq('contact_id', contact.id)
    .order('created_at', { ascending: false })
    .limit(10);
    
  const history = (recentMessages || [])
    .reverse()
    .map((m: any) => `${m.direction === 'inbound' ? 'Cliente' : 'Assistente'}: ${m.content}`)
    .join('\n');
    
  let aiPrompt = contact.metadata?.ai_agent_prompt || "";
  let labelOnTransfer = contact.metadata?.ai_agent_label_on_transfer || "";

  // Fallback essencial: se o contato ficou preso no nó de IA sem metadata,
  // busca o prompt diretamente do nó salvo no fluxo visual.
  if ((!aiPrompt || !labelOnTransfer) && contact.current_flow_id && contact.current_node_id) {
    const { data: flowConfig } = await supabase
      .from('crm_flows')
      .select('nodes')
      .eq('id', contact.current_flow_id)
      .maybeSingle();

    const aiNode = flowConfig?.nodes?.find((n: any) => n.id === contact.current_node_id && n.type === 'aiAgent');
    if (aiNode?.data) {
      aiPrompt = aiPrompt || aiNode.data.prompt || "";
      labelOnTransfer = labelOnTransfer || aiNode.data.labelOnHumanTransfer || "";
    }
  }

  if (!aiPrompt) aiPrompt = "Você é um assistente prestativo.";
  
  // 3. Obter configurações e chave OpenAI
  const { data: settings } = await supabase.from('crm_settings').select('openai_api_key, meta_phone_number_id, meta_access_token, vps_transcoder_url').single();
  const OPENAI_API_KEY = settings?.openai_api_key || Deno.env.get('OPENAI_API_KEY');

  if (!OPENAI_API_KEY) {
    console.error("OpenAI API Key não configurada");
    return { success: false, error: "AI logic missing key" };
  }
  
  const systemPrompt = `${aiPrompt}
  
  REGRAS ADICIONAIS:
  1. Responda de forma curta e direta no WhatsApp.
  2. IMPORTANTE: Você deve interagir com o cliente primeiro. Somente transfira se o cliente explicitamente pedir para falar com um humano OU se você já tiver coletado informações suficientes para o atendimento humano.
  3. Se você identificar que DEVE transferir (conforme regra 2), responda APENAS com a palavra-chave: [[TRANSFER_TO_HUMAN]].
  4. Nunca saia do personagem.`;
  
  try {
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Histórico da conversa:\n${history}\n\nNova mensagem do cliente: ${messageText || "(Nenhuma mensagem recente - inicie o atendimento)"}` }
        ],
        temperature: 0.7
      }),
    });
    
    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content || "";
    
    if (reply.includes('[[TRANSFER_TO_HUMAN]]') && history.split('\n').filter(line => line.startsWith('Assistente:')).length >= 2) {
      console.log(`[AI-AGENT] AI decided to transfer contact ${waId} to human.`);
      
      const { data: flow } = await supabase.from('crm_flows').select('*').eq('id', contact.current_flow_id).single();
      if (flow) {
        const currentNodeId = contact.current_node_id;
        const transferEdge = flow.edges?.find((e: any) => e.source === currentNodeId && e.sourceHandle === 'human_transfer');
        
        if (transferEdge) {
          const nextNode = flow.nodes?.find((n: any) => n.id === transferEdge.target);
          if (nextNode) {
            const updateData: any = {
              flow_state: 'running',
              current_node_id: nextNode.id,
              last_flow_interaction: new Date().toISOString(),
              ai_active: false
            };
            
            if (labelOnTransfer) {
              updateData.status = labelOnTransfer;
            }
            
            await supabase.from('crm_contacts').update(updateData).eq('id', contact.id);
            await executeVisualNode(supabase, flow, nextNode, contact.id, waId);
            return { success: true, action: 'transferred' };
          }
        }
      }
      
      await supabase.from('crm_contacts').update({ 
        flow_state: 'idle', 
        ai_active: false,
        status: labelOnTransfer || 'human',
        current_flow_id: null,
        current_node_id: null,
        next_execution_time: null
      }).eq('id', contact.id);
      
    } else if (reply) {
      if (settings) {
        // MODIFICAÇÃO: Verifica se a resposta da IA é igual à última mensagem enviada para evitar duplicidade
        const { data: lastOutbound } = await supabase
          .from('crm_messages')
          .select('content')
          .eq('contact_id', contact.id)
          .eq('direction', 'outbound')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastOutbound?.content === reply) {
          console.log(`[AI-AGENT] Duplicated response detected for contact ${waId}. Skipping send.`);
        } else {
          await handleInternalSendMessage(
            supabase, 
            settings.meta_phone_number_id, 
            settings.meta_access_token, 
            { to: waId, text: reply }, 
            contact,
            settings.vps_transcoder_url
          );
        }
      }
      
      console.log(`[AI-AGENT] Updating contact ${waId} to ensure continued AI interaction.`);
      await supabase.from('crm_contacts').update({ 
        flow_state: 'ai_handling',
        ai_active: true,
        last_interaction: new Date().toISOString()
      }).eq('id', contact.id);
    }
    
    return { success: true };
  } catch (err: any) {
    console.error("[AI-AGENT] Error processing AI response:", err);
    return { success: false, error: err.message };
  }
}

async function handleProcessWebhook(supabase: any, entry: any, skipSave = false) {
  if (!entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
    return jsonResponse({ success: true });
  }

  const message = entry[0].changes[0].value.messages[0];
  const waId = message.from;
  let text = '';
  let buttonId = '';

  if (!skipSave && message.id) {
    const { data: existingInbound } = await supabase
      .from('crm_messages')
      .select('id')
      .eq('meta_message_id', message.id)
      .maybeSingle();

    if (existingInbound) {
      console.log(`[WEBHOOK] Duplicate inbound message ${message.id} ignored before save for ${waId}`);
      return jsonResponse({ success: true, message: 'Duplicate inbound ignored' });
    }
  }

  if (message.type === 'text') {
    text = message.text.body;
  } else if (message.type === 'interactive') {
    if (message.interactive.type === 'button_reply') {
      buttonId = message.interactive.button_reply.id;
      text = message.interactive.button_reply.title;
    }
  }

  const { data: contactForSave } = await supabase
    .from('crm_contacts')
    .select('id')
    .eq('wa_id', waId)
    .single();

  if (contactForSave && !skipSave) {
    await supabase.from('crm_messages').insert({
      contact_id: contactForSave.id,
      direction: 'inbound',
      message_type: message.type,
      content: text || `[${message.type}]`,
      status: 'received',
      meta_message_id: message.id,
      metadata: { raw: message }
    });
    await supabase.from('crm_contacts').update({ last_interaction: new Date().toISOString() }).eq('id', contactForSave.id);
  }

  const { data: contact } = await supabase
    .from('crm_contacts')
    .select('*')
    .eq('wa_id', waId)
    .single();

  // CRITICAL: Ensure we capture messages for AI processing if the contact is in any AI-related state
  const isInAiNode = contact?.current_node_id?.includes('aiAgent');
  const isAiHandling = contact?.flow_state === 'ai_handling';
  const isAiActive = contact?.ai_active === true;
  const hasActiveFlow = !!contact?.current_flow_id;

  if (contact && (isAiHandling || (hasActiveFlow && (isInAiNode || isAiActive)))) {
    // Proteção contra reprocessamento quando a função receber payload duplicado sem salvar de novo.
    const { data: alreadyProcessed } = await supabase
      .from('crm_messages')
      .select('id')
      .eq('meta_message_id', message.id)
      .limit(1)
      .maybeSingle();

    if (alreadyProcessed && !skipSave) {
      console.log(`[WEBHOOK] Message ${message.id} already processed. Skipping AI trigger.`);
      return jsonResponse({ success: true, message: 'Already processed' });
    }

    console.log(`[WEBHOOK] CAPTURING message from ${waId} for AI Agent. State: ${contact.flow_state}, Node: ${contact.current_node_id}, AI Active: ${contact.ai_active}`);
    const result = await processAiAgentResponse(supabase, contact, waId, text);
    return jsonResponse(result);
  } else if (contact && contact.ai_active && contact.flow_state === 'idle') {
    console.log(`[WEBHOOK] Contact ${waId} has AI active and is idle. Calling Global AI Agent...`);
    
    const { data: recentMessages } = await supabase
      .from('crm_messages')
      .select('content, direction')
      .eq('contact_id', contact.id)
      .order('created_at', { ascending: false })
      .limit(10);
      
    const history = (recentMessages || [])
      .reverse()
      .map((m: any) => `${m.direction === 'inbound' ? 'Cliente' : 'Assistente'}: ${m.content}`)
      .join('\n');
      
    const { data: settings } = await supabase.from('crm_settings').select('*').single();
    if (settings && settings.ai_agent_enabled) {
      const OPENAI_API_KEY = settings.openai_api_key || Deno.env.get('OPENAI_API_KEY');
      if (OPENAI_API_KEY) {
        const systemPrompt = settings.ai_system_prompt || "Você é um assistente prestativo.";
        
        try {
          const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Histórico:\n${history}\n\nCliente: ${text}` }
              ],
              temperature: 0.7
            }),
          });
          
          const aiData = await aiResponse.json();
          const reply = aiData.choices?.[0]?.message?.content || "";
          
          if (reply) {
            await handleInternalSendMessage(
              supabase, 
              settings.meta_phone_number_id, 
              settings.meta_access_token, 
              { to: waId, text: reply }, 
              contact,
              settings.vps_transcoder_url
            );
          }
        } catch (aiErr) {
          console.error("Erro na resposta da IA Global:", aiErr);
        }
      }
    }
    return jsonResponse({ success: true });
  }
  return jsonResponse({ success: true });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const jsonResponse = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

const normalizePhone = (raw: string) => {
  let digits = String(raw || '').replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`
  // Handle Brazilian numbers specifically: ensure they have the 13 digit format correctly (55 + DDD + 9? + number)
  // Meta sometimes requires removing the extra '9' for some regions, or keeping it.
  // Standardizing to ensure it's at least 12-13 digits for Meta.
  return digits
}

const guessMedia = (params: any) => {
  if (params.audioUrl) return { type: 'audio', url: params.audioUrl, mime: 'audio/ogg; codecs=opus', fileName: 'audio.ogg' }
  if (params.imageUrl) return { type: 'image', url: params.imageUrl, mime: 'image/jpeg', fileName: 'image.jpg' }
  if (params.videoUrl) return { type: 'video', url: params.videoUrl, mime: 'video/mp4', fileName: 'video.mp4' }
  if (params.documentUrl) return { type: 'document', url: params.documentUrl, mime: 'application/octet-stream', fileName: params.fileName || 'document' }
  return null
}

async function uploadMediaToMeta(accessToken: string, phoneNumberId: string, media: { type: string; url: string; mime: string; fileName: string }) {
  console.log(`[UPLOAD] Baixando mídia: ${media.url}`);
  const mediaResponse = await fetch(media.url)
  if (!mediaResponse.ok) throw new Error(`Falha ao baixar mídia (${mediaResponse.status})`)
  
  const arrayBuffer = await mediaResponse.arrayBuffer();
  // Para áudio, forçamos o tipo e nome que a Meta espera para PTT (Push To Talk)
  const contentType = media.type === 'audio' ? 'audio/ogg; codecs=opus' : (mediaResponse.headers.get('content-type') || media.mime);
  const fileName = media.type === 'audio' ? 'audio.ogg' : media.fileName;
  
  const blob = new Blob([arrayBuffer], { type: contentType })
  const form = new FormData()
  form.append('messaging_product', 'whatsapp')
  form.append('file', blob, fileName)
  form.append('type', media.type)

  console.log(`[UPLOAD] Enviando para Meta PTT: type=${media.type}, contentType=${contentType}, size=${arrayBuffer.byteLength}, fileName=${fileName}`);
  // Para mensagens de voz, a Meta recomenda enviar sem o parâmetro 'type' no FormData se o Blob já tem o tipo correto e fileName é voice.ogg
  // ou garantir que o campo 'type' seja o primeiro.
  if (media.type === 'audio') {
    // Re-build FormData for PTT (Push-to-Talk)
    const pttForm = new FormData();
    pttForm.append('messaging_product', 'whatsapp');
    pttForm.append('file', blob, 'audio.ogg');
    
    const pttResponse = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: pttForm,
    });
    const pttResult = await pttResponse.json().catch(() => ({}));
    if (!pttResponse.ok) {
      console.error(`[UPLOAD-PTT] Erro Meta:`, JSON.stringify(pttResult));
      throw new Error(pttResult?.error?.message || 'Erro ao subir PTT na Meta');
    }
    return pttResult.id;
  }

  console.log(`[UPLOAD] Enviando mídia comum: type=${media.type}, contentType=${media.mime}, fileName=${media.fileName}`);
  const uploadResponse = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  const uploadResult = await uploadResponse.json().catch(() => ({}))
  console.log(`[UPLOAD] Resposta Meta (${uploadResponse.status}):`, JSON.stringify(uploadResult));
  
  if (!uploadResponse.ok) {
    console.error(`[UPLOAD] Erro Meta detalhado:`, JSON.stringify(uploadResult));
    throw new Error(uploadResult?.error?.message || `Erro ${uploadResponse.status} ao subir mídia na Meta`);
  }
  return uploadResult.id
}

async function handleInternalSendMessage(supabase: any, phoneNumberId: string, accessToken: string, params: any, contact: any, vpsTranscoderUrl?: string) {
  if (!phoneNumberId || !accessToken) throw new Error('Credenciais Meta não configuradas')
  const to = normalizePhone(params.to)
  if (!to) throw new Error('Telefone inválido')

  const media = guessMedia(params)
  const isVoice = params.isVoice === true || media?.type === 'audio';
  const payload: any = { messaging_product: 'whatsapp', recipient_type: 'individual', to }
  
  if (params.interactive) {
    payload.type = 'interactive';
    payload.interactive = params.interactive;
  } else if (media) {
    if (media.type === 'audio' && vpsTranscoderUrl) {
      console.log(`[AUDIO-VPS] Usando Transcoder para enviar como gravado: ${vpsTranscoderUrl}`);
      try {
        const vpsUrl = vpsTranscoderUrl.replace(/\/$/, '');
        const vpsResponse = await fetch(`${vpsUrl}/send-voice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: normalizePhone(params.to),
            audioUrl: media.url,
            metaToken: accessToken,
            phoneId: phoneNumberId,
            sendAsVoice: true
          })
        });
        
        const vpsResult = await vpsResponse.json().catch(() => ({}));
        if (vpsResponse.ok) {
          console.log(`[AUDIO-VPS] Sucesso via VPS:`, JSON.stringify(vpsResult));
          const msgId = vpsResult?.messageId || vpsResult?.messages?.[0]?.id || null;
          
          if (contact && !params.skipLocalSave) {
            await supabase.from('crm_messages').insert({
              contact_id: contact.id,
              direction: 'outbound',
              message_type: 'audio',
              content: '[Mensagem de Áudio]',
              media_url: media.url,
              status: 'sent',
              meta_message_id: msgId,
              metadata: { source: 'vps_flow', is_voice: true }
            });
            await supabase.from('crm_contacts').update({ last_interaction: new Date().toISOString() }).eq('id', contact.id);
          }
          return jsonResponse({ success: true, messageId: msgId, result: vpsResult });
        }
        console.error(`[AUDIO-VPS] VPS retornou erro, tentando envio padrão:`, vpsResult);
      } catch (vpsErr) {
        console.error(`[AUDIO-VPS] Erro ao conectar com VPS, tentando envio padrão:`, vpsErr);
      }
    }

    console.log(`[MEDIA] Iniciando upload de ${media.type} para Meta. URL: ${media.url}`);
    let mediaId;
    try {
      mediaId = await uploadMediaToMeta(accessToken, phoneNumberId, media);
      console.log(`[MEDIA] Upload concluído com sucesso. ID: ${mediaId}`);
    } catch (uploadError: any) {
      console.error(`[MEDIA] ERRO CRÍTICO NO UPLOAD: ${uploadError.message}`);
      throw uploadError;
    }
    
    payload.type = media.type;
    if (media.type === 'audio') {
      // Para enviar como mensagem de voz (gravado na hora), usamos o objeto "audio"
      payload.audio = { id: mediaId };
      console.log(`[MEDIA] Enviando ID ${mediaId} como áudio PTT.`);
    } else if (media.type === 'document') {
      payload.document = { id: mediaId, filename: media.fileName };
    } else {
      payload[media.type] = { id: mediaId };
    }
  } else {
    payload.type = 'text'
    payload.text = { preview_url: true, body: String(params.text || '') }
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  console.log(`[META-SEND] Payload enviado para Meta:`, JSON.stringify(payload));
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result?.error?.message || 'Erro ao enviar mensagem pela Meta')

  if (contact && !params.skipLocalSave) {
    await supabase.from('crm_messages').insert({
      contact_id: contact.id,
      direction: 'outbound',
      message_type: params.interactive ? 'interactive' : (media?.type || 'text'),
      content: media ? (params.text || `[${media.type}]`) : (params.interactive?.body?.text || params.text),
      media_url: media?.url || null,
      status: 'sent',
      meta_message_id: result?.messages?.[0]?.id || null,
      metadata: { 
        ...(media?.type === 'audio' ? { is_voice: !!params.isVoice } : {}),
        ...(params.interactive ? { interactive: params.interactive } : {})
      },
    })
    await supabase.from('crm_contacts').update({ last_interaction: new Date().toISOString() }).eq('id', contact.id)
  }

  return jsonResponse({ success: true, result, messageId: result?.messages?.[0]?.id || null })
}

async function internalSendTemplate(
  supabase: any,
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  languageCode: string,
  manualComponents: any[],
  contact: any,
  vpsTranscoderUrl?: string,
  providedContactId?: string
) {
  const normalizedTo = normalizePhone(to)
  
  const payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedTo,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: manualComponents || []
    }
  }

  // Se não houver componentes manuais, tentamos buscar no banco de dados para ver se há mídia salva (HEADER)
  if (!manualComponents || manualComponents.length === 0) {
    const { data: dbTemplate } = await supabase
      .from('crm_templates')
      .select('components')
      .eq('name', templateName)
      .single();

    if (dbTemplate?.components) {
      const header = dbTemplate.components.find((c: any) => c.type === 'HEADER');
      if (header && (header.format === 'IMAGE' || header.format === 'VIDEO' || header.format === 'DOCUMENT')) {
        const mediaUrl = header.example?.header_handle?.[0];
        if (mediaUrl) {
          payload.template.components = [{
            type: 'header',
            parameters: [{
              type: header.format.toLowerCase(),
              [header.format.toLowerCase()]: { link: mediaUrl }
            }]
          }];
        }
      }
    }
  }

  console.log(`[TEMPLATE] Sending template ${templateName} to ${normalizedTo}`);

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    console.error(`[TEMPLATE] Error sending template:`, JSON.stringify(result));
    throw new Error(result?.error?.message || 'Erro ao enviar template pela Meta')
  }

  if (contact) {
    await supabase.from('crm_messages').insert({
      contact_id: contact.id,
      direction: 'outbound',
      message_type: 'template',
      content: `[Template: ${templateName}]`,
      status: 'sent',
      meta_message_id: result?.messages?.[0]?.id || null,
      metadata: { template_name: templateName }
    })
    await supabase.from('crm_contacts').update({ last_interaction: new Date().toISOString() }).eq('id', contact.id)
  }

  return jsonResponse({ success: true, result, messageId: result?.messages?.[0]?.id || null })
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
    if (action === 'processScheduled') {
      console.log('Processing scheduled flow nodes...');
      const now = new Date().toISOString();
      
      // Select only what's needed and use a more strict query
      const { data: contactsToProcess, error: fetchError } = await supabase
        .from('crm_contacts')
        .select('id, wa_id, current_flow_id, current_node_id, flow_timeout_minutes, flow_timeout_node_id, last_flow_interaction, flow_state, next_execution_time')
        .neq('flow_state', 'idle')
        .limit(50);
        
      if (fetchError) throw fetchError;
      
      const results = [];
      if (contactsToProcess) {
        for (const contact of contactsToProcess) {
          // 1. Process Timeout (se aplicável)
          if (contact.flow_state === 'waiting_response') {
            const timeoutMinutes = contact.flow_timeout_minutes || 20;
            const lastInteraction = new Date(contact.last_flow_interaction || new Date().toISOString());
            const timeoutThreshold = new Date(lastInteraction.getTime() + timeoutMinutes * 60000);
            
            if (new Date() >= timeoutThreshold) {
              console.log(`[TIMEOUT-EXPIRED] Contact ${contact.wa_id} timed out.`);
              if (contact.flow_timeout_node_id) {
                // Tenta atualizar de forma atômica para evitar duplicidade
                const { data: updated } = await supabase.from('crm_contacts').update({ 
                  flow_state: 'running',
                  current_node_id: contact.flow_timeout_node_id,
                  next_execution_time: null,
                  flow_timeout_node_id: null
                }).eq('id', contact.id).eq('flow_state', 'waiting_response').select();

                if (updated && updated.length > 0) {
                  const { data: flow } = await supabase.from('crm_flows').select('*').eq('id', contact.current_flow_id).single();
                  const nextNode = flow?.nodes?.find((n: any) => n.id === contact.flow_timeout_node_id);
                  if (nextNode) {
                    const res = await executeVisualNode(supabase, flow, nextNode, contact.id, contact.wa_id);
                    results.push({ contactId: contact.id, result: res });
                  }
                }
              } else {
                await supabase.from('crm_contacts').update({ flow_state: 'idle', current_flow_id: null, current_node_id: null }).eq('id', contact.id);
              }
            }
            continue; // Importante: se era waiting_response, já processamos (ou ignoramos se ainda estiver esperando)
          }

          // 2. Process Scheduled Delays
          if (contact.next_execution_time && new Date(contact.next_execution_time) <= new Date()) {
            console.log(`[DELAY-READY] Contato ${contact.wa_id} pronto para execução.`);
            
            // Tenta atualizar de forma atômica para garantir que APENAS UM processo execute este nó
            const { data: updated, error: updateError } = await supabase.from('crm_contacts').update({ 
              next_execution_time: null,
              flow_state: 'running'
            })
            .eq('id', contact.id)
            .eq('next_execution_time', contact.next_execution_time) // Garante atomicidade baseada no timestamp exato
            .select();

            if (updateError || !updated || updated.length === 0) {
               console.log(`[DUPLICATION-PREVENTED] Contact ${contact.wa_id} already being processed.`);
               continue;
            }

            const { data: flow } = await supabase.from('crm_flows').select('*').eq('id', contact.current_flow_id).single();
            const currentNode = flow?.nodes?.find((n: any) => n.id === contact.current_node_id);
            
            if (flow && currentNode) {
              const res: any = await executeVisualNode(supabase, flow, currentNode, contact.id, contact.wa_id);
              results.push({ contactId: contact.id, result: res });

              // Se o nó executado foi um Agente IA, processamos a resposta imediatamente
              if (res?.message?.includes('AI handling state')) {
                console.log(`[SCHEDULED] Node resulted in AI handling state. Triggering AI response for ${contact.wa_id}`);
                // Re-fetch contact to get updated flow_state and metadata from executeVisualNode
                const { data: updatedContact } = await supabase.from('crm_contacts').select('*').eq('id', contact.id).single();
                if (updatedContact) {
                  await processAiAgentResponse(supabase, updatedContact, contact.wa_id);
                }
              }
            } else {
              await supabase.from('crm_contacts').update({ flow_state: 'idle' }).eq('id', contact.id);
            }
          }
        }
      }
      
      return jsonResponse({ success: true, processed: results.length });
    }

    if (action === 'updateSettings') {
      const { ...newSettings } = params
      const { error } = await supabase
        .from('crm_settings')
        .update(newSettings)
        .eq('id', '00000000-0000-0000-0000-000000000001')
      
      return new Response(JSON.stringify({ success: !error, error }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get Meta Settings
    const { data: settings } = await supabase
      .from('crm_settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single()

    const { meta_access_token, meta_phone_number_id } = settings || {}

    if (action === 'getTemplates') {
      if (!meta_access_token) throw new Error('Meta API credentials not configured');
      const { meta_waba_id } = settings
      console.log(`Fetching templates for WABA ${meta_waba_id}...`);
      
      const response = await fetch(
        `https://graph.facebook.com/v20.0/${meta_waba_id}/message_templates?limit=1000`,
        {
          headers: { 'Authorization': `Bearer ${meta_access_token}` },
        }
      )
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Meta API Error fetching templates:', errorData);
        throw new Error(`Meta API error: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json()
      
      if (data.data) {
        console.log(`Found ${data.data.length} templates on Meta.`);
        const metaTemplateIds = data.data.map((t: any) => t.id);
        
        for (const template of data.data) {
          // Process components to find and store media permanently
          const processedComponents = [...template.components];
          for (const component of processedComponents) {
            if (component.type === 'HEADER' && (component.format === 'IMAGE' || component.format === 'VIDEO')) {
              const mediaUrl = component.example?.header_handle?.[0];
              if (mediaUrl && mediaUrl.includes('scontent.whatsapp.net')) {
                console.log(`Storing template media permanently: ${template.name} - ${component.format}`);
                const permanentUrl = await downloadAndStoreMetaMedia(supabase, meta_access_token, mediaUrl, component.format.toLowerCase(), `${template.name}_header`);
                if (permanentUrl) {
                  component.example.header_handle = [permanentUrl];
                }
              }
            }
          }

          await supabase.from('crm_templates').upsert({
            id: template.id,
            name: template.name,
            category: template.category,
            language: template.language,
            status: template.status,
            components: processedComponents,
            updated_at: new Date().toISOString()
          })
        }
        
        // Remove local templates that are no longer on Meta
        if (metaTemplateIds.length > 0) {
          await supabase.from('crm_templates').delete().not('id', 'in', metaTemplateIds)
        }
      }
      
      return new Response(JSON.stringify({ success: true, templates: data.data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'createTemplate') {
      const { meta_waba_id } = settings
      const { name, category, language, components, contactId, waId } = params;
      
      // Auto-save contact to Google if enabled
      if (action === 'sendMessage' || action === 'sendTemplate') {
        // Logic to sync back would go here, but focusing on the requested parts first
      }

      console.log(`Creating template ${name}...`);

      // 1. Process components to get Meta handles for media examples
      const processedComponents = [...components];
      
      let appId = settings.meta_app_id;
      if (!appId && meta_access_token) {
        console.log('App ID not found in settings, attempting to debug token...');
        appId = await getAppId(meta_access_token);
      }

      for (const component of processedComponents) {
        // Handle standard Header media
        if (component.type === 'HEADER' && (component.format === 'IMAGE' || component.format === 'VIDEO' || component.format === 'DOCUMENT')) {
          const mediaUrl = component.example?.header_handle?.[0];
          
          if (mediaUrl && (mediaUrl.startsWith('http') || mediaUrl.startsWith('https'))) {
            console.log(`Processing media header example for ${name}...`);
            if (appId) {
              const handle = await getMetaHeaderHandle(meta_access_token, appId, mediaUrl);
              if (handle) {
                console.log(`Generated Meta handle for ${name}: ${handle}`);
                component.example.header_handle = [handle];
              }
            } else {
              console.warn('Could not determine Meta App ID. Media upload might fail.');
            }
          }
        }
        
        // Handle Carousel cards media
        if (component.type === 'CAROUSEL' && component.cards) {
          console.log(`Processing carousel cards for ${name}...`);
          for (const card of component.cards) {
            const headerComp = card.components?.find((c: any) => c.type === 'HEADER');
            if (headerComp && headerComp.format === 'IMAGE') {
              const mediaUrl = headerComp.example?.header_handle?.[0];
              if (mediaUrl && (mediaUrl.startsWith('http') || mediaUrl.startsWith('https'))) {
                console.log(`Processing carousel card media example for ${name}...`);
                if (appId) {
                  const handle = await getMetaHeaderHandle(meta_access_token, appId, mediaUrl);
                  if (handle) {
                    console.log(`Generated Meta handle for carousel card: ${handle}`);
                    headerComp.example.header_handle = [handle];
                  }
                }
              }
            }
          }
        }
      }
      
      const response = await fetch(
        `https://graph.facebook.com/v20.0/${meta_waba_id}/message_templates`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${meta_access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, category, language, components: processedComponents }),
        }
      )
      
      const result = await response.json()
      
      if (!response.ok) {
        console.error('Meta API Error:', JSON.stringify(result, null, 2));
        return new Response(JSON.stringify({ 
          success: false, 
          error: result.error?.message || 'Meta API returned an error',
          details: result 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      if (result.id) {
        const { is_pix, pix_code, is_carousel } = params;
        await supabase.from('crm_templates').upsert({
          id: result.id,
          name,
          category,
          language,
          status: 'PENDING',
          components: processedComponents,
          is_pix: is_pix || false,
          pix_code: pix_code || null,
          is_carousel: is_carousel || false,
          updated_at: new Date().toISOString()
        })
      }
      
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'deleteTemplate') {
      const { meta_waba_id } = settings
      const { name } = params
      
      console.log(`Deleting template ${name} from Meta WABA ${meta_waba_id}...`);
      
      const response = await fetch(
        `https://graph.facebook.com/v20.0/${meta_waba_id}/message_templates?name=${name}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${meta_access_token}` },
        }
      )
      
      const result = await response.json()
      console.log('Meta Deletion Result:', JSON.stringify(result));
      
      // Even if Meta returns an error (like template not found), we should allow deleting it locally
      // if it's no longer on Meta or if there's a mismatch.
      // Meta returns { success: true } on success.
      
      if (result.success || (result.error && (result.error.code === 100 || result.error.error_subcode === 2388044))) {
        console.log(`Template ${name} deleted from Meta or not found. Removing from local database...`);
        const { error: dbError } = await supabase.from('crm_templates').delete().eq('name', name)
        if (dbError) {
          console.error('Local DB Deletion Error:', dbError);
        }
      }
      
      if (!result.success && !result.error) {
        // Fallback for unexpected response format
        await supabase.from('crm_templates').delete().eq('name', name)
      }
      
      return new Response(JSON.stringify({ 
        success: result.success || (result.error?.code === 100), 
        result 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'sendTemplate') {
      const { to, templateName, languageCode, components: manualComponents } = params
      
      const { data: contact } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('wa_id', to)
        .single();

      if (!contact) throw new Error('Contact not found');

      const { contactId: providedContactId } = params;
      const response = await internalSendTemplate(
        supabase, 
        meta_phone_number_id, 
        meta_access_token, 
        to, 
        templateName, 
        languageCode || 'pt_BR', 
        manualComponents, 
        contact,
        null,
        providedContactId
      );


      return response;
    }

    if (action === 'sendMessage') {
      console.log(`[ACTION] sendMessage iniciado para: ${params.to}`);
      const { data: contact } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('wa_id', params.to)
        .single();
        
      const response = await handleInternalSendMessage(supabase, meta_phone_number_id, meta_access_token, params, contact, settings?.vps_transcoder_url);
      console.log(`[ACTION] sendMessage finalizado para ${params.to}. Status: ${response.status}`);
      return response;
    }

    if (action === 'startFlow') {
      const { flowId, contactId, waId } = params
      
      const { data: currentContact } = await supabase
        .from('crm_contacts')
        .select('flow_state, current_flow_id')
        .eq('id', contactId)
        .single();
        
      if (currentContact?.flow_state === 'running' || currentContact?.flow_state === 'waiting_response' || currentContact?.flow_state === 'ai_handling') {
        return new Response(JSON.stringify({ success: true, message: 'Flow already active' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: flow } = await supabase
        .from('crm_flows')
        .select('*')
        .eq('id', flowId)
        .single()
      
      if (!flow) throw new Error('Flow not found')
      await supabase.from('crm_scheduled_messages').delete().eq('contact_id', contactId);

      if (flow.nodes && flow.nodes.length > 0) {
        const nodeIdsWithTarget = new Set(flow.edges?.map((e: any) => e.target) || [])
        const startNode = flow.nodes.find((n: any) => !nodeIdsWithTarget.has(n.id)) || flow.nodes[0]
        
        await supabase.from('crm_contacts').update({
          current_flow_id: flowId,
          current_node_id: startNode.id,
          flow_state: 'running',
          last_flow_interaction: new Date().toISOString(),
          next_execution_time: null,
          status: (flow.trigger_tag && flow.trigger_tag !== 'none') ? flow.trigger_tag : undefined
        }).eq('id', contactId)
        
        const res: any = await executeVisualNode(supabase, flow, startNode, contactId, waId);
        
        // Se o fluxo começou em um nó de Agente IA, processamos a resposta imediatamente
        if (res?.message?.includes('AI handling state') && params.text) {
          console.log(`[START-FLOW] Started in AI handling state. Triggering AI response for ${waId}`);
          const { data: updatedContact } = await supabase.from('crm_contacts').select('*').eq('id', contactId).single();
          if (updatedContact) {
            await processAiAgentResponse(supabase, updatedContact, waId, params.text);
          }
        }
        
        return jsonResponse(res)
      } else {
        await supabase.from('crm_contacts').update({
          current_flow_id: flowId,
          current_step_index: 0,
          flow_state: 'running',
          last_flow_interaction: new Date().toISOString()
        }).eq('id', contactId)
        
        const { data: step } = await supabase
          .from('crm_flow_steps')
          .select('*')
          .eq('flow_id', flowId)
          .eq('step_order', 0)
          .single()
        
        if (step) return await processStep(supabase, step, contactId, waId)
      }
      
      return new Response(JSON.stringify({ success: true, message: 'Flow started' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'continueFlow') {
      const { contactId, waId, buttonId, nextNodeId, text } = params
      
      const { data: contact } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('id', contactId)
        .single()
      
      if (!contact || !contact.current_flow_id) {
        return new Response(JSON.stringify({ success: false, message: 'No active flow' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: flow } = await supabase
        .from('crm_flows')
        .select('*')
        .eq('id', contact.current_flow_id)
        .single()

      if (flow && flow.nodes && flow.nodes.length > 0) {
        let nextNode = null;

        if (nextNodeId) {
          nextNode = flow.nodes.find((n: any) => n.id === nextNodeId)
        } else {
          const currentNode = flow.nodes.find((n: any) => n.id === contact.current_node_id)
          if (!currentNode) return new Response(JSON.stringify({ error: 'Current node not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

          // Find next node based on buttonId or standard connection
          let nextEdge = null;
          if (buttonId) {
            // Priority 1: Match specific button ID
            nextEdge = flow.edges.find((e: any) => e.source === currentNode.id && e.sourceHandle === buttonId)
          }
          
          // Priority 1.5: Match text against button labels if no buttonId matched
          if (!nextEdge && text && currentNode.data?.buttons) {
            const matchedButtonIdx = currentNode.data.buttons.findIndex((b: any) => 
              b.text?.toLowerCase().trim() === text.toLowerCase().trim() ||
              (text.toLowerCase().includes('[button reply]') && text.toLowerCase().includes(b.text?.toLowerCase().trim()))
            );
            
            if (matchedButtonIdx !== -1) {
              const handleId = currentNode.data.buttons[matchedButtonIdx].id || `btn-${matchedButtonIdx}`;
              nextEdge = flow.edges.find((e: any) => e.source === currentNode.id && e.sourceHandle === handleId);
              console.log(`Matched text "${text}" to button index ${matchedButtonIdx} (handle: ${handleId})`);
            }
          }
          if (!nextEdge) {
            // Priority 2: Match generic "responded" or the new "any_response" handle
            nextEdge = flow.edges.find((e: any) => e.source === currentNode.id && (e.sourceHandle === 'responded' || e.sourceHandle === 'any_response'))
          }

          // Priority 3: Match standard transition (no handle)
          if (!nextEdge) {
            nextEdge = flow.edges.find((e: any) => e.source === currentNode.id && !e.sourceHandle)
          }

          if (nextEdge) {
            nextNode = flow.nodes.find((n: any) => n.id === nextEdge.target)
          }
        }

        if (nextNode) {
          await supabase
            .from('crm_contacts')
            .update({ 
              current_node_id: nextNode.id, 
              last_flow_interaction: new Date().toISOString(),
              flow_state: 'running'
            })
            .eq('id', contactId)
          
          const res: any = await executeVisualNode(supabase, flow, nextNode, contactId, waId);
          
          // Se o próximo nó é um Agente IA, processamos a resposta imediatamente
          if (res?.message?.includes('AI handling state') && text) {
            console.log(`[CONTINUE-FLOW] Moved to AI handling state. Triggering AI response for ${waId}`);
            const { data: updatedContact } = await supabase.from('crm_contacts').select('*').eq('id', contactId).single();
            if (updatedContact) {
              await processAiAgentResponse(supabase, updatedContact, waId, text);
            }
          }
          
          return jsonResponse(res)
        }

        // No more nodes, finish flow
        await supabase.from('crm_contacts').update({ 
          flow_state: 'idle', 
          current_flow_id: null, 
          current_node_id: null 
        }).eq('id', contactId)

        return new Response(JSON.stringify({ success: true, message: 'Flow completed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }
    

    if (action === 'getGoogleAuthUrl') {
      const { google_client_id } = settings;
      if (!google_client_id) {
        throw new Error('Google Client ID não configurado nas configurações');
      }

      const origin = req.headers.get('origin') || 'https://maisresultadosonline.com.br';
      // Priorizar o redirectPath enviado pelo frontend, mas garantir que bata com o domínio
      const redirectPath = params.redirectPath || (origin.includes('maisresultadosonline.com.br') ? '/google-callback2' : '/google-callback');
      const redirectUri = `${origin}${redirectPath}`;
      const scope = 'https://www.googleapis.com/auth/contacts.readonly';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${google_client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;

      return new Response(JSON.stringify({ success: true, authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'exchangeGoogleCode') {
      const { code, redirectPath } = params;
      const { google_client_id, google_client_secret } = settings;
      const origin = req.headers.get('origin') || 'https://maisresultadosonline.com.br';
      const redirectUri = `${origin}${redirectPath || (origin.includes('maisresultadosonline.com.br') ? '/google-callback2' : '/google-callback')}`;

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: google_client_id,
          client_secret: google_client_secret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await response.json();
      if (!response.ok) throw new Error(`Google OAuth error: ${tokens.error_description || tokens.error}`);

      // Get user info to identify the account
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      });
      const userInfo = await userResponse.json();
      const email = userInfo.email;

      // Store in crm_google_accounts
      const { data: account, error: accError } = await supabase
        .from('crm_google_accounts')
        .upsert({
          email,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: Date.now() + (tokens.expires_in * 1000),
          updated_at: new Date().toISOString()
        }, { onConflict: 'email' })
        .select()
        .single();

      if (accError) throw accError;

      return new Response(JSON.stringify({ success: true, account }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'syncGoogleContacts') {
      const { accountId } = params;
      let account;
      
      console.log(`[SYNC] Invocando syncGoogleContacts. accountId: ${accountId || 'recente'}`);
      
      if (accountId) {
        const { data } = await supabase.from('crm_google_accounts').select('*').eq('id', accountId).single();
        account = data;
      } else {
        const { data } = await supabase.from('crm_google_accounts').select('*').order('updated_at', { ascending: false }).limit(1).single();
        account = data;
      }

      if (!account) {
        console.error('[SYNC] Nenhuma conta Google conectada encontrada.');
        throw new Error('Nenhuma conta Google conectada');
      }

      console.log(`[SYNC] Usando conta: ${account.email}`);

      // Refresh token if expired
      let accessToken = account.access_token;
      if (Date.now() >= (account.expiry_date || 0)) {
        console.log("[SYNC] Refreshing Google token...");
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: settings.google_client_id,
            client_secret: settings.google_client_secret,
            refresh_token: account.refresh_token,
            grant_type: 'refresh_token',
          }),
        });
        const refreshTokens = await refreshResponse.json();
        if (refreshResponse.ok) {
          accessToken = refreshTokens.access_token;
          console.log("[SYNC] Token atualizado com sucesso.");
          await supabase.from('crm_google_accounts').update({
            access_token: accessToken,
            expiry_date: Date.now() + (refreshTokens.expires_in * 1000),
            updated_at: new Date().toISOString()
          }).eq('id', account.id);
        } else {
          console.error("[SYNC] Falha ao atualizar token:", refreshTokens);
        }
      }

      let count = 0;
      let totalFetched = 0;
      let nextPageToken = null;
      
      console.log("[SYNC] Iniciando busca de contatos na People API...");
      
      do {
        const url = new URL('https://people.googleapis.com/v1/people/me/connections');
        url.searchParams.set('personFields', 'names,phoneNumbers');
        url.searchParams.set('pageSize', '1000');
        if (nextPageToken) url.searchParams.set('pageToken', nextPageToken);

        const contactsResponse = await fetch(url.toString(), {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        
        if (!contactsResponse.ok) {
          const err = await contactsResponse.json().catch(() => ({}));
          console.error('[SYNC] People API Error:', err);
          break;
        }

        const contactsData = await contactsResponse.json();
        nextPageToken = contactsData.nextPageToken;

        const connections = contactsData.connections || [];
        totalFetched += connections.length;
        console.log(`[SYNC] Página buscada: ${connections.length} conexões. Total até agora: ${totalFetched}`);

        if (connections.length > 0) {
          const upsertBatch = [];
          const seenWaIds = new Set();
          
          for (const person of connections) {
            const name = person.names?.[0]?.displayName;
            const phoneNumbers = person.phoneNumbers || [];
            
            for (const p of phoneNumbers) {
              let phone = p.value?.replace(/\D/g, '');
              if (!phone) continue;
              
              // Basic validation for WhatsApp format (at least 10 digits)
              if (phone.length < 10) continue;
              
              // Normalize Brazilian numbers
              if (phone.length === 10 || phone.length === 11) {
                if (!phone.startsWith('55')) phone = `55${phone}`;
              }

              // Check for duplicates within the same batch to avoid "ON CONFLICT DO UPDATE command cannot affect row a second time"
              if (seenWaIds.has(phone)) {
                console.log(`[SYNC] Skipping duplicate phone in batch: ${phone}`);
                continue;
              }
              seenWaIds.add(phone);

              upsertBatch.push({
                wa_id: phone,
                name: name || null,
                google_sync_account_id: account.id,
                updated_at: new Date().toISOString()
              });
            }
          }

          if (upsertBatch.length > 0) {
            console.log(`[SYNC] Tentando upsert de batch com ${upsertBatch.length} registros únicos...`);
            const { error: upsertError } = await supabase.from('crm_contacts').upsert(upsertBatch, { onConflict: 'wa_id' });
            if (!upsertError) {
              count += upsertBatch.length;
            } else {
              console.error('[SYNC] Upsert Error:', upsertError);
            }
          }
        }
      } while (nextPageToken);

      console.log(`[SYNC] Finalizado. Total de conexões People API: ${totalFetched}. Total de registros/upserts em crm_contacts: ${count}`);

      return new Response(JSON.stringify({ success: true, count, totalFetched }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'processAiAgent') {
      const { data: contact } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('id', params.contactId)
        .single();
        
      if (!contact) return jsonResponse({ success: false, error: 'Contact not found' });
      
      const result = await processAiAgentResponse(supabase, contact, params.to || params.waId, params.text);
      return jsonResponse(result);
    }

    if (action === 'saveToGoogle') {
        const { contactId, accountId } = params;
        const { data: contact } = await supabase.from('crm_contacts').select('*').eq('id', contactId).single();
        if (!contact) throw new Error('Contato não encontrado');

        let account;
        if (accountId || contact.google_sync_account_id) {
            const { data } = await supabase.from('crm_google_accounts').select('*').eq('id', accountId || contact.google_sync_account_id).single();
            account = data;
        }

        if (!account) throw new Error('Nenhuma conta Google vinculada a este contato');

        // Refresh token logic (simplified for briefness, would normally reuse the refresh logic above)
        let accessToken = account.access_token;

        const createResponse = await fetch('https://people.googleapis.com/v1/people:createContact', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                names: [{ givenName: contact.name || contact.wa_id }],
                phoneNumbers: [{ value: contact.wa_id, type: 'mobile' }]
            })
        });

        const result = await createResponse.json();
        return new Response(JSON.stringify({ success: createResponse.ok, result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    // Legacy action block removed to prevent duplication with main processScheduled at line 332

    if (action === 'processWebhook') {
      const { entry, skipSave } = params;
      return await handleProcessWebhook(supabase, entry, skipSave);
    }


    if (action === 'processInactivity') {
      console.log('Checking for inactive contacts in flows...');
      const { data: inactiveContacts } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('flow_state', 'waiting_response')
        .not('flow_timeout_node_id', 'is', null);

      if (inactiveContacts) {
        for (const contact of inactiveContacts) {
          const lastInteraction = new Date(contact.last_flow_interaction || contact.updated_at).getTime();
          const timeoutMs = (contact.flow_timeout_minutes || 20) * 60 * 1000;
          
          if (Date.now() - lastInteraction > timeoutMs) {
            console.log(`Contact ${contact.wa_id} timed out. Moving to node ${contact.flow_timeout_node_id}`);
            const { data: flow } = await supabase.from('crm_flows').select('*').eq('id', contact.current_flow_id).single();
            if (flow) {
              const nextNode = flow.nodes?.find((n: any) => n.id === contact.flow_timeout_node_id);
              if (nextNode) {
                await supabase.from('crm_contacts').update({
                  current_node_id: nextNode.id,
                  flow_state: 'running',
                  flow_timeout_node_id: null,
                  last_flow_interaction: new Date().toISOString()
                }).eq('id', contact.id);
                await executeVisualNode(supabase, flow, nextNode, contact.id, contact.wa_id);
              }
            }
          }
        }
      }
      return jsonResponse({ success: true });
    }

    throw new Error(`Unhandled action: ${action}`);
  } catch (error: any) {
    console.error('Error in Edge Function:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});


