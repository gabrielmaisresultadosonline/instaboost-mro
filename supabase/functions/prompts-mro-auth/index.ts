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

const INFINITEPAY_HANDLE = "paguemro";

const generateNSU = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `PROMPTS${timestamp}${random}`.toUpperCase();
};

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

      // Check password
      let passwordMatch = false;
      const hashedInput = await hashPassword(password);
      
      if (user.password === hashedInput) {
        passwordMatch = true;
      } else if (user.password === password) {
        passwordMatch = true;
        await supabase.from('prompts_mro_users').update({ password: hashedInput }).eq('id', user.id);
      }

      if (!passwordMatch) {
        return new Response(JSON.stringify({ error: 'Senha incorreta' }), { 
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      await supabase.from('prompts_mro_users').update({ last_access: new Date().toISOString() }).eq('id', user.id);

      return new Response(JSON.stringify({ 
        success: true, 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          copies_count: user.copies_count || 0, 
          copies_limit: user.copies_limit || 5, 
          is_paid: user.is_paid || false 
        }
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

      const hashedPassword = await hashPassword(password);

      const { data: newUser, error: insertError } = await supabase
        .from('prompts_mro_users')
        .insert({
          name: name.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          status: 'active',
          last_access: new Date().toISOString(),
          copies_count: 0,
          copies_limit: 5,
          is_paid: false,
        })
        .select('id, name, email, copies_count, copies_limit, is_paid')
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        return new Response(JSON.stringify({ error: 'Erro ao criar conta' }), { 
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        user: { id: newUser.id, name: newUser.name, email: newUser.email, copies_count: newUser.copies_count, copies_limit: newUser.copies_limit, is_paid: newUser.is_paid }
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

    // Track copy action
    if (action === 'track-copy') {
      const { user_id } = await req.json();
      
      if (!user_id) {
        return new Response(JSON.stringify({ error: 'user_id é obrigatório' }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Get current user
      const { data: user, error } = await supabase
        .from('prompts_mro_users')
        .select('id, copies_count, copies_limit, is_paid')
        .eq('id', user_id)
        .single();

      if (error || !user) {
        return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), { 
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // If already paid, no limit
      if (user.is_paid) {
        return new Response(JSON.stringify({ success: true, copies_count: user.copies_count, copies_limit: user.copies_limit, is_paid: true, blocked: false }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const newCount = (user.copies_count || 0) + 1;
      const blocked = newCount >= (user.copies_limit || 5);

      await supabase.from('prompts_mro_users').update({ copies_count: newCount }).eq('id', user_id);

      return new Response(JSON.stringify({ 
        success: true, 
        copies_count: newCount, 
        copies_limit: user.copies_limit || 5, 
        is_paid: false, 
        blocked 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get user status (copies count, blocked, etc)
    if (action === 'user-status') {
      const { user_id } = await req.json();
      
      const { data: user } = await supabase
        .from('prompts_mro_users')
        .select('id, copies_count, copies_limit, is_paid')
        .eq('id', user_id)
        .single();

      if (!user) {
        return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), { 
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const blocked = !user.is_paid && (user.copies_count || 0) >= (user.copies_limit || 5);

      return new Response(JSON.stringify({ 
        copies_count: user.copies_count || 0, 
        copies_limit: user.copies_limit || 5, 
        is_paid: user.is_paid || false, 
        blocked 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Create payment checkout for blocked user
    if (action === 'create-payment') {
      const { user_id } = await req.json();
      
      const { data: user } = await supabase
        .from('prompts_mro_users')
        .select('id, email, name')
        .eq('id', user_id)
        .single();

      if (!user) {
        return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), { 
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const orderNsu = generateNSU();
      const amount = 67;
      const priceInCents = amount * 100;
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const redirectUrl = `https://maisresultadosonline.com.br/prompts/dashboard`;
      const webhookUrl = `${supabaseUrl}/functions/v1/infinitepay-webhook`;
      const productDescription = `PROMPTS_${user.email}`;

      const lineItems = [{
        description: productDescription,
        quantity: 1,
        price: priceInCents,
      }];

      const infinitepayPayload = {
        handle: INFINITEPAY_HANDLE,
        items: lineItems,
        itens: lineItems,
        order_nsu: orderNsu,
        redirect_url: redirectUrl,
        webhook_url: webhookUrl,
        customer: { email: user.email },
      };

      const infinitepayResponse = await fetch(
        "https://api.infinitepay.io/invoices/public/checkout/links",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(infinitepayPayload),
        }
      );

      const infinitepayData = await infinitepayResponse.json();

      let paymentLink: string;
      if (!infinitepayResponse.ok) {
        const itemData = [{ name: productDescription, price: priceInCents, quantity: 1 }];
        const itemsEncoded = encodeURIComponent(JSON.stringify(itemData));
        paymentLink = `https://checkout.infinitepay.io/${INFINITEPAY_HANDLE}?items=${itemsEncoded}&redirect_url=${encodeURIComponent(redirectUrl)}&webhook_url=${encodeURIComponent(webhookUrl)}`;
      } else {
        paymentLink = infinitepayData.checkout_url || infinitepayData.link || infinitepayData.url;
      }

      // Save payment order
      await supabase.from('prompts_mro_payment_orders').insert({
        user_id: user.id,
        email: user.email,
        amount,
        nsu_order: orderNsu,
        status: 'pending',
        infinitepay_link: paymentLink,
        expired_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });

      // Save NSU to user
      await supabase.from('prompts_mro_users').update({ payment_nsu: orderNsu }).eq('id', user.id);

      return new Response(JSON.stringify({ 
        success: true, 
        payment_link: paymentLink, 
        nsu_order: orderNsu 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check payment status
    if (action === 'check-payment') {
      const { user_id } = await req.json();

      const { data: user } = await supabase
        .from('prompts_mro_users')
        .select('id, email, payment_nsu, is_paid')
        .eq('id', user_id)
        .single();

      if (!user) {
        return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), { 
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      if (user.is_paid) {
        return new Response(JSON.stringify({ success: true, is_paid: true }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      if (!user.payment_nsu) {
        return new Response(JSON.stringify({ success: true, is_paid: false }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Check payment order
      const { data: order } = await supabase
        .from('prompts_mro_payment_orders')
        .select('*')
        .eq('nsu_order', user.payment_nsu)
        .maybeSingle();

      if (!order) {
        return new Response(JSON.stringify({ success: true, is_paid: false }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      if (order.status === 'paid' || order.status === 'completed') {
        // Unlock user
        await supabase.from('prompts_mro_users').update({ 
          is_paid: true, 
          paid_at: new Date().toISOString() 
        }).eq('id', user.id);

        await supabase.from('prompts_mro_payment_orders').update({ 
          status: 'completed', 
          updated_at: new Date().toISOString() 
        }).eq('id', order.id);

        return new Response(JSON.stringify({ success: true, is_paid: true }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Try InfiniPay verification
      let paid = false;
      try {
        const res = await fetch("https://api.infinitepay.io/invoices/public/checkout/payment_check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: INFINITEPAY_HANDLE, order_nsu: user.payment_nsu }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.paid) paid = true;
        }
      } catch (e) { console.error('InfiniPay check error:', e); }

      // Also try with lenc from link
      if (!paid && order.infinitepay_link) {
        try {
          const linkUrl = new URL(order.infinitepay_link);
          const lenc = linkUrl.searchParams.get('lenc');
          if (lenc) {
            const res = await fetch("https://api.infinitepay.io/invoices/public/checkout/payment_check", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ handle: INFINITEPAY_HANDLE, order_nsu: user.payment_nsu, slug: lenc }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.paid) paid = true;
            }
          }
        } catch (e) { console.error('lenc check error:', e); }
      }

      if (paid) {
        await supabase.from('prompts_mro_payment_orders').update({ 
          status: 'paid', 
          paid_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        }).eq('id', order.id);

        await supabase.from('prompts_mro_users').update({ 
          is_paid: true, 
          paid_at: new Date().toISOString() 
        }).eq('id', user.id);

        return new Response(JSON.stringify({ success: true, is_paid: true }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      return new Response(JSON.stringify({ success: true, is_paid: false }), { 
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