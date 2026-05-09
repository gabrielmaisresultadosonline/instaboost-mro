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
    

      const { google_client_id } = settings;
      if (!google_client_id) {
        throw new Error('Google Client ID não configurado nas configurações');
      }

      const origin = req.headers.get('origin') || 'https://ia-mro.lovable.app';
      const redirectPath = params.redirectPath || '/google-callback';
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
      const origin = req.headers.get('origin') || 'https://ia-mro.lovable.app';
      const redirectUri = `${origin}${redirectPath || '/google-callback'}`;

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


    // Handle Body Variables
    if (bodyComponent && bodyComponent.text) {
      let text = bodyComponent.text;
      const varCount = (text.match(/\{\{\d+\}\}/g) || []).length;
      
      if (varCount > 0) {
        const manualBodyParams = manualComponents?.find((c: any) => c.type === 'body')?.parameters || [];
        const bodyParams = [];
        for (let i = 1; i <= varCount; i++) {
          const manualParam = manualBodyParams[i-1]?.text;
          const val = manualParam || (i === 1 ? (contact?.name || 'Cliente') : "-");
          bodyParams.push({ type: "text", text: val });
          text = text.replace(`{{${i}}}`, val);
        }
        finalComponents.push({ type: "body", parameters: bodyParams });
        messageContent = text;
      } else {
        messageContent = text;
      }
    }

    // Handle Buttons
    if (buttonsComponent && buttonsComponent.buttons) {
      const buttonParams: any[] = [];
      buttonsComponent.buttons.forEach((b: any, index: number) => {
        if (b.type === 'URL' && b.url?.includes('{{1}}')) {
          const manualBtn = manualComponents?.find((c: any) => c.type === 'button' && (c.index === index || index === 0));
          const btnParam = manualBtn?.parameters?.[0]?.text || contact?.id || '1';
          
          buttonParams.push({
            type: "button",
            sub_type: "url",
            index: index.toString(),
            parameters: [{ type: "text", text: btnParam }]
          });
        } else if (b.type === 'COPY_CODE' && b.example?.[0]) {
          const manualBtn = manualComponents?.find((c: any) => c.type === 'button' && (c.index === index || index === 0));
          const btnParam = manualBtn?.parameters?.[0]?.text || b.example[0];
          
          buttonParams.push({
            type: "button",
            sub_type: "copy_code",
            index: index.toString(),
            parameters: [{ type: "text", text: btnParam }]
          });
        }
      });
      
      if (buttonParams.length > 0) {
        finalComponents.push(...buttonParams);
      }
    }
  }

  const metaRequestBody = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components: finalComponents
    }
  };

  console.log('Sending Template to Meta:', JSON.stringify(metaRequestBody, null, 2));

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${metaPhoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${metaAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metaRequestBody),
    }
  );

  const result = await response.json();
  
  if (!response.ok) {
    console.error('Meta API Error (internalSendTemplate):', JSON.stringify(result, null, 2));
    return new Response(JSON.stringify({ 
      success: false, 
      error: result.error?.message || 'Meta API returned an error',
      details: result 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Save to message history
  if (result.messages && result.messages[0]) {
    const headerParams = finalComponents.find((c: any) => c.type === "header")?.parameters?.[0];
    let mediaUrl = null;
    
    if (headerParams) {
      const type = headerParams.type;
      // First check for a link in headerParams itself
      mediaUrl = headerParams[type]?.link;
      
      // If no link, check manualComponents for original URL
      if (!mediaUrl || /^\d+$/.test(mediaUrl.toString())) {
        const manualUrl = manualComponents?.find((c: any) => c.type === 'header')?.parameters?.[0]?.[type]?.link;
        if (manualUrl) {
          mediaUrl = manualUrl;
        }
      }
      
      // If still no link, check template data examples
      if (!mediaUrl || /^\d+$/.test(mediaUrl.toString())) {
        const headerComponent = templateData.components?.find((c: any) => c.type === 'HEADER');
        const exampleUrl = headerComponent?.example?.header_handle?.[0];
        if (exampleUrl) {
          mediaUrl = exampleUrl;
        }
      }

      // If it's a Meta temporary URL, it might be the reason for "broken images" in chat history
      // We already try to use the permanent stored URL above if it exists
    }

    // Ensure content has the [Template: name] prefix for the frontend to recognize it
    const finalContent = `[Template: ${templateName}] ${messageContent}`;

    // Improve mediaUrl capture: if it was a numeric ID, try to get the original URL from finalComponents
    let finalMediaUrl = mediaUrl;
    if (!finalMediaUrl || /^\d+$/.test(finalMediaUrl.toString())) {
      const headerParam = finalComponents.find((c: any) => c.type === "header")?.parameters?.[0];
      const type = headerParam?.type;
      if (type && headerParam[type]?.link) {
        finalMediaUrl = headerParam[type].link;
      }
    }

    await supabase.from('crm_messages').insert({
      contact_id: contact.id,
      direction: 'outbound',
      content: finalContent,
      message_type: 'template',
      media_url: finalMediaUrl,
      meta_message_id: result.messages[0].id,
      status: 'sent'
    });


    await supabase.from('crm_contacts').update({ 
      total_messages_sent: (contact.total_messages_sent || 0) + 1,
      last_interaction: new Date().toISOString()
    }).eq('id', contact.id);
    
    await supabase.rpc('increment_crm_metric', { metric_column: 'sent_count' });
  }

  return new Response(JSON.stringify({ success: true, result }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function executeVisualNode(supabase: any, flow: any, node: any, contactId: string, waId: string) {
  const settings = await getSettings(supabase)
  const { meta_access_token, meta_phone_number_id, vps_transcoder_url } = settings
  
  const { data: contact } = await supabase
    .from('crm_contacts')
    .select('*')
    .eq('id', contactId)
    .single()

  console.log(`Executing node ${node.id} (${node.type}) for contact ${contactId}`);

  // Clear any existing next_execution_time when starting a new node
  await supabase.from('crm_contacts').update({ next_execution_time: null }).eq('id', contactId)

  // Handle Action/Content Nodes
  let sendResult = null;
  
  if (node.type === 'message') {
    const response = await handleInternalSendMessage(supabase, meta_phone_number_id, meta_access_token, {
      to: waId,
      text: node.data.text
    }, contact, vps_transcoder_url)
    sendResult = await response.json();
  } 
  else if (node.type === 'audio') {
    if (node.data.audioUrl) {
      const response = await handleInternalSendMessage(supabase, meta_phone_number_id, meta_access_token, {
        to: waId,
        audioUrl: node.data.audioUrl,
        isVoice: node.data.isPTT ?? true
      }, contact, vps_transcoder_url)
      sendResult = await response.json();
    } else {
      console.error('Audio node missing URL');
      sendResult = { success: false, error: 'Missing audio URL' };
    }
  }
  else if (node.type === 'video') {
    const response = await handleInternalSendMessage(supabase, meta_phone_number_id, meta_access_token, {
      to: waId,
      videoUrl: node.data.videoUrl
    }, contact, vps_transcoder_url)
    sendResult = await response.json();
  }
  else if (node.type === 'image') {
    const response = await handleInternalSendMessage(supabase, meta_phone_number_id, meta_access_token, {
      to: waId,
      imageUrl: node.data.imageUrl
    }, contact, vps_transcoder_url)
    sendResult = await response.json();
  }
  else if (node.type === 'question') {
    const response = await handleInternalSendMessage(supabase, meta_phone_number_id, meta_access_token, {
      to: waId,
      text: node.data.text,
      buttons: node.data.buttons.map((b: any, idx: number) => ({
        id: b.id || `btn-${idx}`,
        text: b.text
      }))
    }, contact, vps_transcoder_url)
    sendResult = await response.json();
    
    if (sendResult?.success) {
      await supabase.from('crm_contacts').update({ flow_state: 'waiting_response' }).eq('id', contactId)
      
      const timeoutEdge = flow.edges.find((e: any) => e.source === node.id && e.sourceHandle === 'timeout')
      if (timeoutEdge) {
        const timeoutMin = parseInt(node.data.timeout) || 20
        const scheduledFor = new Date(Date.now() + timeoutMin * 60000).toISOString()
        
        await supabase.from('crm_scheduled_messages').insert({
          contact_id: contactId,
          flow_id: flow.id,
          node_id: timeoutEdge.target,
          scheduled_for: scheduledFor,
          message_data: { action: 'continueFlow' }
        })
        
        // Store timeout as next_execution_time
        await supabase.from('crm_contacts').update({ next_execution_time: scheduledFor }).eq('id', contactId)
      }
      return new Response(JSON.stringify({ success: true, node: node.id, state: 'waiting_response' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }
  else if (node.type === 'waitResponse') {
    await supabase.from('crm_contacts').update({ flow_state: 'waiting_response' }).eq('id', contactId)
    
    const timeoutEdge = flow.edges.find((e: any) => e.source === node.id && e.sourceHandle === 'timeout')
    if (timeoutEdge) {
      const timeoutMin = parseInt(node.data.timeout) || 20
      const scheduledFor = new Date(Date.now() + timeoutMin * 60000).toISOString()
      
      await supabase.from('crm_scheduled_messages').insert({
        contact_id: contactId,
        flow_id: flow.id,
        node_id: timeoutEdge.target,
        scheduled_for: scheduledFor,
        message_data: { action: 'continueFlow' }
      })
      
      await supabase.from('crm_contacts').update({ next_execution_time: scheduledFor }).eq('id', contactId)
    }
    return new Response(JSON.stringify({ success: true, node: node.id, state: 'waiting_response' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  else if (node.type === 'delay') {
    const delay = parseInt(node.data.delay) || 5
    const unit = node.data.unit || 'segundos'
    let delayMs = delay * 1000
    if (unit === 'minutos') delayMs *= 60000
    if (unit === 'horas') delayMs *= 3600000

    const scheduledFor = new Date(Date.now() + delayMs).toISOString()
    await supabase.from('crm_contacts').update({ next_execution_time: scheduledFor }).eq('id', contactId)

    // Process delay in real-time for any delay up to 60 seconds to ensure exact timing
    // Any delay longer than 60s will be scheduled via database to avoid function timeout
    if (delayMs <= 60000) {
      if (delayMs > 0) {
        console.log(`Waiting ${delayMs}ms for flow delay...`);
        // If it's a small delay, just wait.
        // For delays > 10s, we might want to update the contact's next_execution_time immediately
        await sleep(delayMs);
      }
      const nextEdge = flow.edges.find((e: any) => e.source === node.id)
      if (nextEdge) {
        const nextNode = flow.nodes.find((n: any) => n.id === nextEdge.target)
        if (nextNode) {
          console.log(`Delay finished, proceeding to node: ${nextNode.id}`);
          await supabase.from('crm_contacts').update({ 
            current_node_id: nextNode.id, 
            next_execution_time: null,
            last_flow_interaction: new Date().toISOString()
          }).eq('id', contactId)
          return executeVisualNode(supabase, flow, nextNode, contactId, waId)
        }
      }
    } else {
      const nextEdge = flow.edges.find((e: any) => e.source === node.id)
      if (nextEdge) {
        await supabase.from('crm_scheduled_messages').insert({
          contact_id: contactId,
          flow_id: flow.id,
          node_id: nextEdge.target,
          scheduled_for: scheduledFor,
          message_data: { action: 'continueFlow' }
        })
        await supabase.from('crm_contacts').update({ flow_state: 'waiting_delay' }).eq('id', contactId)
      }
    }
  }
  else if (node.type === 'crmAction') {
    const action = node.data.action || 'Notificar Agente'
    if (action === 'Finalizar Atendimento' || action === 'Mudar Status: Ganho') {
      await supabase.from('crm_contacts').update({ status: 'closed' }).eq('id', contactId)
    } else if (action === 'Mudar Status: Perdido') {
      await supabase.from('crm_contacts').update({ status: 'lost' }).eq('id', contactId)
    } else if (action === 'Adicionar Etiqueta' && node.data.statusValue) {
      const updateData: any = { status: node.data.statusValue };
      if (node.data.statusValue === 'human') updateData.ai_active = false;
      await supabase.from('crm_contacts').update(updateData).eq('id', contactId)
    } else if (action === 'Humanizar Atendimento') {
      await supabase.from('crm_contacts').update({ status: 'human', ai_active: false }).eq('id', contactId)
    }
    sendResult = { success: true };
  }
  else if (node.type === 'template') {
    if (node.data.templateName) {
      const templateName = node.data.templateName
      const languageCode = node.data.language || 'pt_BR'
      const manualComponents = node.data.imageUrl ? [{
        type: "header",
        parameters: [{
          type: "image",
          image: { link: node.data.imageUrl }
        }]
      }] : [];

      console.log(`Executing template node ${templateName} to ${waId}...`);

      const response = await internalSendTemplate(
        supabase,
        meta_phone_number_id,
        meta_access_token,
        waId,
        templateName,
        languageCode,
        manualComponents,
        contact,
        node.id // Pass node ID to save to message history correctly if needed
      );

      sendResult = await response.json();
      
      // internalSendTemplate returns a Response, we check success from the JSON
      if (!response.ok || !sendResult.success) {
        console.error('Template node send failed:', JSON.stringify(sendResult, null, 2));
      }
    } else {
      sendResult = { success: false, error: 'Missing template name' };
    }
  }

  else if (node.type === 'jump') {
    if (node.data.targetFlowId) {
      console.log(`Jumping from flow ${flow.id} to flow ${node.data.targetFlowId} for contact ${contactId}`);
      
      // Stop current flow by deleting scheduled messages
      await supabase.from('crm_scheduled_messages').delete().eq('contact_id', contactId);
      
      let { data: targetFlow } = await supabase
        .from('crm_flows')
        .select('*')
        .eq('id', node.data.targetFlowId)
        .single()
      
      // Fallback: search by name if ID not found
      if (!targetFlow && node.data.targetFlowName) {
        console.log(`Flow ID ${node.data.targetFlowId} not found, searching by name: ${node.data.targetFlowName}`);
        const { data: flowsByName } = await supabase
          .from('crm_flows')
          .select('*')
          .eq('name', node.data.targetFlowName)
          .eq('is_active', true)
          .limit(1);
        
        if (flowsByName && flowsByName.length > 0) {
          targetFlow = flowsByName[0];
          console.log(`Found matching flow by name with ID: ${targetFlow.id}`);
        }
      }
      
      if (targetFlow && targetFlow.nodes && targetFlow.nodes.length > 0) {
        const nodeIdsWithTarget = new Set(targetFlow.edges.map((e: any) => e.target))
        const startNode = targetFlow.nodes.find((n: any) => !nodeIdsWithTarget.has(n.id)) || targetFlow.nodes[0]
        
        await supabase
          .from('crm_contacts')
          .update({
            current_flow_id: targetFlow.id,
            current_node_id: startNode.id,
            flow_state: 'running',
            last_flow_interaction: new Date().toISOString(),
            next_execution_time: null
          })
          .eq('id', contactId)
        
        return executeVisualNode(supabase, targetFlow, startNode, contactId, waId)
      } else if (targetFlow) {
        // Fallback to old steps system
        await supabase
          .from('crm_contacts')
          .update({
            current_flow_id: targetFlow.id,
            current_step_index: 0,
            flow_state: 'running',
            last_flow_interaction: new Date().toISOString()
          })
          .eq('id', contactId)
        
        const { data: step } = await supabase
          .from('crm_flow_steps')
          .select('*')
          .eq('flow_id', targetFlow.id)
          .eq('step_order', 0)
          .single()
        
        if (step) return processStep(supabase, step, contactId, waId)
        
        return new Response(JSON.stringify({ success: true, message: 'Jumped to step-based flow' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } else {
        console.error('Target flow not found');
        sendResult = { success: false, error: 'Target flow not found' };
      }
    } else {
      sendResult = { success: false, error: 'Missing target flow ID' };
    }
  }

  // AUTO-CONTINUE for non-waiting nodes
  const autoContinueTypes = ['message', 'audio', 'video', 'image', 'crmAction', 'followup', 'template']
  if (autoContinueTypes.includes(node.type)) {
    // Only continue if the action was successful
    if (sendResult?.success) {
      const nextEdge = flow.edges.find((e: any) => e.source === node.id && !e.sourceHandle)
      if (nextEdge) {
        const nextNode = flow.nodes.find((n: any) => n.id === nextEdge.target)
        if (nextNode) {
          await supabase.from('crm_contacts').update({ 
            current_node_id: nextNode.id,
            last_flow_interaction: new Date().toISOString()
          }).eq('id', contactId)
          
          return executeVisualNode(supabase, flow, nextNode, contactId, waId)
        }
      } else {
        // No more nodes, finish flow
        console.log(`No more nodes after ${node.id}, finishing flow.`);
        await supabase.from('crm_contacts').update({ 
          flow_state: 'idle', 
          current_flow_id: null, 
          current_node_id: null 
        }).eq('id', contactId);
      }
    } else {
      console.error(`Node ${node.id} failed, stopping flow:`, sendResult?.error);
      await supabase.from('crm_contacts').update({ 
        flow_state: 'error',
        metadata: { ...contact?.metadata, last_flow_error: sendResult?.error }
      }).eq('id', contactId)
    }
  }

  return new Response(JSON.stringify({ success: true, node: node.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function getSettings(supabase: any) {
  const { data: settings } = await supabase
    .from('crm_settings')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single()
  return settings
}

async function processStep(supabase: any, step: any, contactId: string, waId: string) {
  if (step.step_type === 'delay') {
    const scheduledFor = new Date(Date.now() + (step.delay_seconds || 5) * 1000).toISOString()
    await supabase
      .from('crm_contacts')
      .update({ 
        flow_state: 'waiting_delay', 
        last_flow_interaction: new Date().toISOString(),
        next_execution_time: scheduledFor
      })
      .eq('id', contactId)
    
    return new Response(JSON.stringify({ success: true, action: 'wait', seconds: step.delay_seconds }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  
  if (step.step_type === 'wait_response') {
    await supabase
      .from('crm_contacts')
      .update({ flow_state: 'waiting_response', last_flow_interaction: new Date().toISOString() })
      .eq('id', contactId)
    
    return new Response(JSON.stringify({ success: true, action: 'wait_response' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true, message: 'Step processed' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function getAppId(accessToken: string) {
  try {
    const response = await fetch(`https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`);
    const data = await response.json();
    return data.data?.app_id;
  } catch (error) {
    console.error('Error getting App ID:', error);
    return null;
  }
}

async function getMetaHeaderHandle(accessToken: string, appId: string, mediaUrl: string) {
  try {
    console.log(`Getting Meta header handle for: ${mediaUrl}`);
    
    // 1. Fetch the file content
    const fileResponse = await fetch(mediaUrl);
    if (!fileResponse.ok) throw new Error(`Failed to fetch media from URL: ${mediaUrl}`);
    const blob = await fileResponse.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const fileSize = arrayBuffer.byteLength;
    const fileType = blob.type || 'image/png';

    // 2. Start Resumable Upload
    const uploadStartResponse = await fetch(
      `https://graph.facebook.com/v20.0/${appId}/uploads?file_length=${fileSize}&file_type=${fileType}&access_token=${accessToken}`,
      { method: 'POST' }
    );
    const uploadStartData = await uploadStartResponse.json();
    if (!uploadStartResponse.ok) throw new Error(`Failed to start upload: ${JSON.stringify(uploadStartData)}`);
    const uploadSessionId = uploadStartData.id;

    // 3. Upload the file content
    const uploadResponse = await fetch(
      `https://graph.facebook.com/v20.0/${uploadSessionId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `OAuth ${accessToken}`,
          'file_offset': '0'
        },
        body: arrayBuffer
      }
    );
    const uploadData = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error(`Failed to upload content: ${JSON.stringify(uploadData)}`);
    
    return uploadData.h; // The handle
  } catch (error) {
    console.error('Error getting Meta header handle:', error);
    return null;
  }
}

async function uploadMediaToMeta(accessToken: string, phoneNumberId: string, mediaUrl: string, type: string) {
  try {
    console.log(`Uploading media to Meta from URL: ${mediaUrl} (Type: ${type})`);
    const fileResponse = await fetch(mediaUrl);
    if (!fileResponse.ok) throw new Error(`Failed to fetch media: ${mediaUrl}`);
    let blob = await fileResponse.blob();
    
    // Determine MIME type and filename
    let mimeType = fileResponse.headers.get('content-type') || blob.type;
    let filename = 'file';
    
    const urlPath = new URL(mediaUrl).pathname;
    const extension = urlPath.split('.').pop()?.toLowerCase();

    if (type === 'audio') {
      // Logic for audio delivery to Meta
      // Meta has strict requirements for audio/ogg; codecs=opus for voice messages
      if (extension === 'ogg' || mimeType.includes('ogg')) {
        mimeType = 'audio/ogg; codecs=opus';
        filename = 'voice.ogg';
      } else if (extension === 'mp3' || mimeType.includes('mpeg')) {
        mimeType = 'audio/mpeg';
        filename = 'voice.mp3';
      } else if (extension === 'm4a' || extension === 'mp4' || mimeType.includes('mp4')) {
        mimeType = 'audio/mp4';
        filename = 'voice.m4a';
      } else if (extension === 'webm' || mimeType.includes('webm')) {
        // Transcodificar para OGG Opus é necessário para Chrome/WebM
        // Por enquanto, forçamos o tipo para a Meta aceitar o upload
        mimeType = 'audio/ogg; codecs=opus'; 
        filename = 'voice.ogg';
        console.log(`WORKAROUND: WebM detectado, rotulando como OGG Opus para a Meta.`);
      } else {
        mimeType = 'audio/ogg; codecs=opus';
        filename = 'voice.ogg';
      }
      console.log(`Audio upload config - Mime: ${mimeType}, File: ${filename}, Extension: ${extension}`);
    } else {
      filename = type === 'image' ? 'image.jpg' : 
                 type === 'video' ? 'video.mp4' : 'document.pdf';
    }

    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', type);
    
    // Create a file object with the correct name and type
    const file = new File([blob], filename, { type: mimeType });
    formData.append('file', file);

    const response = await fetch(
      `https://graph.facebook.com/v20.0/${phoneNumberId}/media`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: formData
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('Meta Media Upload Error response:', JSON.stringify(data, null, 2));
      throw new Error(`Meta media upload failed: ${data.error?.message || JSON.stringify(data)}`);
    }
    
    console.log(`Media uploaded successfully to Meta. ID: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error('Error uploading media to Meta:', error);
    return null;
  }
}

async function downloadAndStoreMetaMedia(supabase: any, token: string, mediaUrl: string, type: string, baseName: string) {
  try {
    const response = await fetch(mediaUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error(`Failed to fetch media from Meta: ${response.statusText}`);
    
    const blob = await response.blob();
    const ext = blob.type.split('/')[1] || 'bin';
    const filePath = `templates/${type}/${Date.now()}_${baseName}.${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from('crm-media')
      .upload(filePath, blob, {
        contentType: blob.type,
        upsert: true
      });
      
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('crm-media')
      .getPublicUrl(filePath);
      
    return publicUrl;
  } catch (error) {
    console.error('Error in downloadAndStoreMetaMedia:', error);
    return null;
  }
}
