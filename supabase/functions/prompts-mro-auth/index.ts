import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple hash using Web Crypto API (works in edge runtime)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_prompts_mro_salt_2025");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Login
    if (action === 'login') {
      const { email, password } = await req.json();
      
      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Email e senha são obrigatórios' }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const { data: user, error } = await supabase
        .from('prompts_mro_users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('status', 'active')
        .maybeSingle();

      if (error || !user) {
        return new Response(JSON.stringify({ error: 'E-mail não encontrado ou conta inativa' }), { 
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Check password - support plain text, bcrypt prefix, and sha256 hash
      let passwordMatch = false;
      const hashedInput = await hashPassword(password);
      
      if (user.password === hashedInput) {
        passwordMatch = true;
      } else if (user.password === password) {
        // Plain text match - upgrade to hash
        passwordMatch = true;
        await supabase.from('prompts_mro_users').update({ password: hashedInput }).eq('id', user.id);
      }

      if (!passwordMatch) {
        return new Response(JSON.stringify({ error: 'Senha incorreta' }), { 
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Update last access
      await supabase.from('prompts_mro_users').update({ last_access: new Date().toISOString() }).eq('id', user.id);

      return new Response(JSON.stringify({ 
        success: true, 
        user: { id: user.id, name: user.name, email: user.email }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Register new user
    if (action === 'register') {
      const { name, email, password } = await req.json();
      
      if (!name || !email || !password) {
        return new Response(JSON.stringify({ error: 'Nome, email e senha são obrigatórios' }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const { data: existing } = await supabase
        .from('prompts_mro_users')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: 'Este e-mail já está cadastrado. Faça login.' }), { 
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      const { data: newUser, error: insertError } = await supabase
        .from('prompts_mro_users')
        .insert({
          name: name.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          status: 'active',
          last_access: new Date().toISOString(),
        })
        .select('id, name, email')
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        return new Response(JSON.stringify({ error: 'Erro ao criar conta' }), { 
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        user: { id: newUser.id, name: newUser.name, email: newUser.email }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get prompts for member area
    if (action === 'get-prompts') {
      const { data: prompts, error } = await supabase
        .from('prompts_mro_items')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('order_index', { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify({ prompts: prompts || [] }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ error: 'Ação não encontrada' }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
