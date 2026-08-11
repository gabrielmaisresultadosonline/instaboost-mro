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

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, email, password, session_id } = await req.json()

    if (action === 'login') {
      if (!email || !password) {
        return new Response(JSON.stringify({ success: false, error: 'Email e senha obrigatórios' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      const { data: user, error } = await supabaseClient
        .from('lovablack_users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single()

      if (error || !user) {
        return new Response(JSON.stringify({ success: false, error: 'Credenciais inválidas' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        })
      }

      // Fetch global settings
      const { data: settingsData } = await supabaseClient
        .from('lovablack_settings')
        .select('*');
      
      const settings: any = {};
      settingsData?.forEach((s: any) => {
        settings[s.key] = s.value;
      });

      // Check for multi-login block
      if (settings.multi_login_block === 'true' && user.session_id && session_id && user.session_id !== session_id) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Já existe uma sessão ativa em outro dispositivo. Deslogue lá para entrar aqui.',
          code: 'MULTI_LOGIN'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        })
      }

      // Update last access and session_id
      const updateData: any = { last_access: new Date().toISOString() };
      if (session_id) {
        updateData.session_id = session_id;
      }

      await supabaseClient
        .from('lovablack_users')
        .update(updateData)
        .eq('id', user.id);

      if (user.blocked) {
        return new Response(JSON.stringify({ success: false, error: 'Usuário bloqueado' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        })
      }

      // Check trial expiration
      let is_expired = false;
      let expires_at = null;
      if (user.plan_type === 'trial') {
        expires_at = user.trial_expires_at;
        const expires = new Date(user.trial_expires_at)
        if (expires < new Date()) {
          is_expired = true;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        user: {
          name: user.name,
          email: user.email,
          plan_type: user.plan_type,
          is_active: !is_expired && !user.blocked,
          is_expired: is_expired,
          blocked: user.blocked,
          expires_at: expires_at,
          last_access: user.last_access,
          custom_message: user.custom_message,
          global_announcement: settings.global_announcement || "",
          min_version: settings.min_extension_version || "1.0.0"
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    if (action === 'create_user') {
      const { name, email, password, plan_type, whatsapp } = await req.json()
      
      if (!email || !password || !name) {
        return new Response(JSON.stringify({ success: false, error: 'Dados incompletos' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      const { data, error } = await supabaseClient
        .from('lovablack_users')
        .insert([{
          name,
          email,
          password,
          plan_type: plan_type || 'monthly',
          whatsapp
        }])
        .select()
        .single()

      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      return new Response(JSON.stringify({ success: true, user: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    return new Response(JSON.stringify({ success: false, error: 'Ação inválida' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
