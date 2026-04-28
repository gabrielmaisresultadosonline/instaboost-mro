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

    if (action === 'createTemplate') {
      const { meta_waba_id } = settings
      const { name, category, language, components } = params
      
      const response = await fetch(
        `https://graph.facebook.com/v17.0/${meta_waba_id}/message_templates`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${meta_access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, category, language, components }),
        }
      )
      
      const result = await response.json()
      
      if (!response.ok) {
        console.error('Meta API Error:', result)
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
        await supabase.from('crm_templates').upsert({
          id: result.id,
          name,
          category,
          language,
          status: 'PENDING',
          components,
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
      
      const response = await fetch(
        `https://graph.facebook.com/v17.0/${meta_waba_id}/message_templates?name=${name}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${meta_access_token}` },
        }
      )
      
      const result = await response.json()
      
      if (result.success) {
        await supabase.from('crm_templates').delete().eq('name', name)
      }
      
      return new Response(JSON.stringify({ success: result.success, result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'sendTemplate') {
      const { to, templateName, languageCode, components } = params
      
      console.log(`Sending template ${templateName} to ${to}...`);

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
      
      if (!response.ok) {
        console.error('Meta API Error (Template):', JSON.stringify(result, null, 2));
        return new Response(JSON.stringify({ 
          success: false, 
          error: result.error?.message || 'Meta API returned an error',
          details: result 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      console.log('Template sent successfully:', JSON.stringify(result));


    if (action === 'sendMessage') {
      const { to, text, audioUrl, imageUrl, videoUrl, documentUrl, fileName, buttons } = params
      
      let body: any = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
      }

      if (audioUrl) {
        body.type = "audio"
        body.audio = { link: audioUrl }
      } else if (imageUrl) {
        body.type = "image"
        body.image = { link: imageUrl, caption: text }
      } else if (videoUrl) {
        body.type = "video"
        body.video = { link: videoUrl, caption: text }
      } else if (documentUrl) {
        body.type = "document"
        body.document = { link: documentUrl, caption: text, filename: fileName || "document.pdf" }
      } else if (buttons && buttons.length > 0) {
        body.type = "interactive"
        body.interactive = {
          type: "button",
          body: { text: text || "Selecione uma opção:" },
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
      
      if (!response.ok) {
        console.error('Meta API Error:', result)
        return new Response(JSON.stringify({ 
          success: false, 
          error: result.error?.message || 'Meta API returned an error',
          details: result 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
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
            content: text || `[${body.type}]`,
            message_type: body.type,
            meta_message_id: result.messages[0].id,
            status: 'sent'
          })

          await supabase
            .from('crm_contacts')
            .update({ 
              total_messages_sent: (contact.total_messages_sent || 0) + 1,
              last_interaction: new Date().toISOString()
            })
            .eq('id', contact.id)
          
          await supabase.rpc('increment_crm_metric', { metric_column: 'sent_count' })
        }
      }

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'startFlow') {
      const { flowId, contactId, waId } = params
      
      // Update contact to point to flow
      await supabase
        .from('crm_contacts')
        .update({
          current_flow_id: flowId,
          current_step_index: 0,
          flow_state: 'running',
          last_flow_interaction: new Date().toISOString()
        })
        .eq('id', contactId)
      
      // Fetch first step
      const { data: step } = await supabase
        .from('crm_flow_steps')
        .select('*')
        .eq('flow_id', flowId)
        .eq('step_order', 0)
        .single()
      
      if (step) {
        // Run the step
        return await processStep(supabase, step, contactId, waId)
      }
      
      return new Response(JSON.stringify({ success: true, message: 'Flow started but no steps found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'continueFlow') {
      const { contactId, waId } = params
      
      const { data: contact } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('id', contactId)
        .single()
      
      if (!contact || contact.flow_state === 'idle' || !contact.current_flow_id) {
        return new Response(JSON.stringify({ success: false, message: 'No active flow' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const nextIndex = (contact.current_step_index || 0) + 1
      
      const { data: step } = await supabase
        .from('crm_flow_steps')
        .select('*')
        .eq('flow_id', contact.current_flow_id)
        .eq('step_order', nextIndex)
        .single()
      
      if (step) {
        // Update index
        await supabase
          .from('crm_contacts')
          .update({ current_step_index: nextIndex })
          .eq('id', contactId)
        
        return await processStep(supabase, step, contactId, waId)
      } else {
        // Flow completed
        await supabase
          .from('crm_contacts')
          .update({ flow_state: 'idle', current_flow_id: null, current_step_index: null })
          .eq('id', contactId)
        
        return new Response(JSON.stringify({ success: true, message: 'Flow completed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
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

async function processStep(supabase: any, step: any, contactId: string, waId: string) {
  // If it's a delay, we might need a background process or just tell the client/webhook to wait
  // For simplicity here, if it's a delay, we update state and return.
  // Real delay would need a CRON or a delayed trigger.
  
  if (step.step_type === 'delay') {
    await supabase
      .from('crm_contacts')
      .update({ flow_state: 'waiting_delay', last_flow_interaction: new Date().toISOString() })
      .eq('id', contactId)
    
    // In a real scenario, we'd schedule a trigger. 
    // Here we'll just log it.
    return new Response(JSON.stringify({ success: true, action: 'wait', seconds: step.delay_seconds }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  
  if (step.step_type === 'wait_response') {
    await supabase
      .from('crm_contacts')
      .update({ flow_state: 'waiting_response', last_flow_interaction: new Date().toISOString() })
      .eq('id', contactId)
    
    return new Response(JSON.stringify({ success: true, action: 'wait_response' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Send message for other types
  const params: any = {
    action: 'sendMessage',
    to: waId,
    text: step.message_text,
    buttons: step.buttons
  }
  
  if (step.step_type === 'audio') params.audioUrl = step.media_url
  if (step.step_type === 'image') params.imageUrl = step.media_url
  if (step.step_type === 'video') params.videoUrl = step.media_url
  if (step.step_type === 'document') {
    params.documentUrl = step.media_url
    params.fileName = step.media_type // reusing for filename
  }

  // Invoke self to send message
  const { data: sendResult } = await supabase.functions.invoke('meta-whatsapp-crm', {
    body: params
  })

  // After sending, immediately try next step if it's not a wait
  const { data: nextResult } = await supabase.functions.invoke('meta-whatsapp-crm', {
    body: { action: 'continueFlow', contactId, waId }
  })

  return new Response(JSON.stringify({ success: true, sendResult, nextResult }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
