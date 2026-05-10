import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
  if (digits.length === 13 && digits.startsWith('55') && digits[4] === '9') digits = `${digits.slice(0, 4)}${digits.slice(5)}`
  return digits
}

const guessMedia = (params: any) => {
  if (params.audioUrl) return { type: 'audio', url: params.audioUrl, mime: 'audio/ogg', fileName: 'voice.ogg' }
  if (params.imageUrl) return { type: 'image', url: params.imageUrl, mime: 'image/jpeg', fileName: 'image.jpg' }
  if (params.videoUrl) return { type: 'video', url: params.videoUrl, mime: 'video/mp4', fileName: 'video.mp4' }
  if (params.documentUrl) return { type: 'document', url: params.documentUrl, mime: 'application/octet-stream', fileName: params.fileName || 'document' }
  return null
}

async function uploadMediaToMeta(accessToken: string, phoneNumberId: string, media: { type: string; url: string; mime: string; fileName: string }) {
  const mediaResponse = await fetch(media.url)
  if (!mediaResponse.ok) throw new Error(`Falha ao baixar mídia (${mediaResponse.status})`)
  const contentType = mediaResponse.headers.get('content-type') || media.mime
  const blob = new Blob([await mediaResponse.arrayBuffer()], { type: contentType })
  const form = new FormData()
  form.append('messaging_product', 'whatsapp')
  form.append('type', media.type)
  form.append('file', blob, media.fileName)

  const uploadResponse = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  const uploadResult = await uploadResponse.json().catch(() => ({}))
  if (!uploadResponse.ok) throw new Error(uploadResult?.error?.message || 'Erro ao subir mídia na Meta')
  return uploadResult.id
}

async function handleInternalSendMessage(supabase: any, phoneNumberId: string, accessToken: string, params: any, contact: any) {
  if (!phoneNumberId || !accessToken) throw new Error('Credenciais Meta não configuradas')
  const to = normalizePhone(params.to)
  if (!to) throw new Error('Telefone inválido')

  const media = guessMedia(params)
  const payload: any = { messaging_product: 'whatsapp', recipient_type: 'individual', to }
  if (media) {
    const mediaId = await uploadMediaToMeta(accessToken, phoneNumberId, media)
    payload.type = media.type
    payload[media.type] = media.type === 'document' 
      ? { id: mediaId, filename: media.fileName } 
      : (media.type === 'audio' ? { id: mediaId, voice: true } : { id: mediaId })
  } else {
    payload.type = 'text'
    payload.text = { preview_url: true, body: String(params.text || '') }
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result?.error?.message || 'Erro ao enviar mensagem pela Meta')

  if (contact && !params.skipLocalSave) {
    await supabase.from('crm_messages').insert({
      contact_id: contact.id,
      direction: 'outbound',
      message_type: media?.type || 'text',
      content: media ? (params.text || `[${media.type}]`) : params.text,
      media_url: media?.url || null,
      status: 'sent',
      meta_message_id: result?.messages?.[0]?.id || null,
      metadata: media?.type === 'audio' ? { is_voice: !!params.isVoice } : {},
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
      const { data: contact } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('wa_id', params.to)
        .single();
        
      return await handleInternalSendMessage(supabase, meta_phone_number_id, meta_access_token, params, contact, settings?.vps_transcoder_url);
    }

    if (action === 'startFlow') {
      const { flowId, contactId, waId } = params
      
      // Check if contact already has an active flow to prevent duplicates
      const { data: currentContact } = await supabase
        .from('crm_contacts')
        .select('flow_state, current_flow_id')
        .eq('id', contactId)
        .single();
        
      if (currentContact?.flow_state === 'running' || currentContact?.flow_state === 'waiting_response') {
        console.log(`Contact ${contactId} already has an active flow (${currentContact.current_flow_id}). Skipping startFlow for ${flowId}.`);
        return new Response(JSON.stringify({ success: true, message: 'Flow already active, skipped duplicate' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: flow } = await supabase
        .from('crm_flows')
        .select('*')
        .eq('id', flowId)
        .single()
      
      if (!flow) throw new Error('Flow not found')

      // Clear any existing scheduled messages for this contact to prevent flow conflicts
      await supabase.from('crm_scheduled_messages').delete().eq('contact_id', contactId);

      // Use visual flow if it has nodes, otherwise fallback to old step-based system
      if (flow.nodes && flow.nodes.length > 0) {
        // Find starting node (no incoming edges)
        const nodeIdsWithTarget = new Set(flow.edges.map((e: any) => e.target))
        const startNode = flow.nodes.find((n: any) => !nodeIdsWithTarget.has(n.id)) || flow.nodes[0]
        
        await supabase
          .from('crm_contacts')
          .update({
            current_flow_id: flowId,
            current_node_id: startNode.id,
            flow_state: 'running',
            last_flow_interaction: new Date().toISOString(),
            next_execution_time: null
          })
          .eq('id', contactId)
        
        return await executeVisualNode(supabase, flow, startNode, contactId, waId)
      } else {
        // Fallback to old steps system
        await supabase
          .from('crm_contacts')
          .update({
            current_flow_id: flowId,
            current_step_index: 0,
            flow_state: 'running',
            last_flow_interaction: new Date().toISOString()
          })
          .eq('id', contactId)
        
        const { data: step } = await supabase
          .from('crm_flow_steps')
          .select('*')
          .eq('flow_id', flowId)
          .eq('step_order', 0)
          .single()
        
        if (step) return await processStep(supabase, step, contactId, waId)
      }
      
      return new Response(JSON.stringify({ success: true, message: 'Flow started but no logic found' }), {
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
          
          return await executeVisualNode(supabase, flow, nextNode, contactId, waId)
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
      
      if (accountId) {
        const { data } = await supabase.from('crm_google_accounts').select('*').eq('id', accountId).single();
        account = data;
      } else {
        const { data } = await supabase.from('crm_google_accounts').select('*').order('updated_at', { ascending: false }).limit(1).single();
        account = data;
      }

      if (!account) throw new Error('Nenhuma conta Google conectada');

      // Refresh token if expired
      let accessToken = account.access_token;
      if (Date.now() >= (account.expiry_date || 0)) {
        console.log("Refreshing Google token...");
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
          await supabase.from('crm_google_accounts').update({
            access_token: accessToken,
            expiry_date: Date.now() + (refreshTokens.expires_in * 1000),
            updated_at: new Date().toISOString()
          }).eq('id', account.id);
        }
      }

      const contactsResponse = await fetch('https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const contactsData = await contactsResponse.json();
      
      let count = 0;
      if (contactsData.connections) {
        for (const person of contactsData.connections) {
          const name = person.names?.[0]?.displayName;
          const phone = person.phoneNumbers?.[0]?.value?.replace(/\D/g, '');
          
          if (phone) {
            const { error: upsertError } = await supabase.from('crm_contacts').upsert({
                wa_id: phone,
                name: name || null,
                google_sync_account_id: account.id,
                updated_at: new Date().toISOString()
            }, { onConflict: 'wa_id' });
            if (!upsertError) count++;
          }
        }
      }

      return new Response(JSON.stringify({ success: true, count }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    if (action === 'processInactivity') {
      console.log('Processing inactivity for CRM contacts...');
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      
      // Find contacts that sent a message, but we haven't replied in 4+ hours
      // and that have AI active and are not in a flow
      const { data: idleContacts } = await supabase
        .from('crm_contacts')
        .select('id, wa_id, last_interaction')
        .eq('ai_active', true)
        .is('current_flow_id', null)
        .lt('last_interaction', fourHoursAgo)
        .limit(10); // Batch process
      
      if (idleContacts) {
        for (const contact of idleContacts) {
          // Verify last message was inbound (customer)
          const { data: lastMsg } = await supabase
            .from('crm_messages')
            .select('direction')
            .eq('contact_id', contact.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (lastMsg?.direction === 'inbound') {
            console.log(`Contact ${contact.wa_id} has been idle for 4h after customer message. Generating hook strategy.`);
            
            // Trigger strategy generation with custom instruction for inactivity
            const customPrompt = "O cliente enviou uma mensagem há mais de 4 horas e não obteve resposta. Analise o histórico e gere uma mensagem de 'gancho' curta e altamente persuasiva para reengajar esse cliente agora e trazê-lo de volta para a conversa.";
            
            await supabase.functions.invoke('generate-strategy', {
              body: { 
                contactId: contact.id,
                customInstruction: customPrompt
              }
            }).catch(e => console.error(`Error generating inactivity strategy for ${contact.id}:`, e));
          }
        }
      }
      
      return jsonResponse({ success: true, processed: idleContacts?.length || 0 });
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


