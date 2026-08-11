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

    const { action, email, password } = await req.json()

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

      if (user.blocked) {
        return new Response(JSON.stringify({ success: false, error: 'Usuário bloqueado' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        })
      }

      // Check trial expiration
      if (user.plan_type === 'trial') {
        const expires = new Date(user.trial_expires_at)
        if (expires < new Date()) {
          return new Response(JSON.stringify({ success: false, error: 'Período de teste expirado' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403
          })
        }
      }

      return new Response(JSON.stringify({
        success: true,
        user: {
          name: user.name,
          email: user.email,
          plan_type: user.plan_type,
          is_active: true,
          expires_at: user.plan_type === 'trial' ? user.trial_expires_at : null
        }
      }), {
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
