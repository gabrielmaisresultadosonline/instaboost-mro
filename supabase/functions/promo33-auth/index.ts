import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, email, password, name, phone, instagram_username, instagram_data } = await req.json();

    console.log(`[promo33-auth] Action: ${action}, Email: ${email}`);

    switch (action) {
      case 'register': {
        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('promo33_users')
          .select('*')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (existingUser) {
          return new Response(
            JSON.stringify({ success: false, message: 'Email já cadastrado. Faça login.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create new user
        const { data: newUser, error: createError } = await supabase
          .from('promo33_users')
          .insert({
            email: email.toLowerCase(),
            password,
            name,
            phone,
            subscription_status: 'pending'
          })
          .select()
          .single();

        if (createError) {
          console.error('[promo33-auth] Create error:', createError);
          throw createError;
        }

        return new Response(
          JSON.stringify({ success: true, user: newUser }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'login': {
        const { data: user, error: loginError } = await supabase
          .from('promo33_users')
          .select('*')
          .eq('email', email.toLowerCase())
          .eq('password', password)
          .maybeSingle();

        if (loginError || !user) {
          return new Response(
            JSON.stringify({ success: false, message: 'Email ou senha incorretos' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if subscription expired
        if (user.subscription_status === 'active' && user.subscription_end) {
          const endDate = new Date(user.subscription_end);
          if (endDate < new Date()) {
            await supabase
              .from('promo33_users')
              .update({ subscription_status: 'expired' })
              .eq('id', user.id);
            user.subscription_status = 'expired';
          }
        }

        return new Response(
          JSON.stringify({ success: true, user }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_user': {
        const { data: user } = await supabase
          .from('promo33_users')
          .select('*')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (!user) {
          return new Response(
            JSON.stringify({ success: false, message: 'Usuário não encontrado' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if subscription expired
        if (user.subscription_status === 'active' && user.subscription_end) {
          const endDate = new Date(user.subscription_end);
          if (endDate < new Date()) {
            await supabase
              .from('promo33_users')
              .update({ subscription_status: 'expired' })
              .eq('id', user.id);
            user.subscription_status = 'expired';
          }
        }

        return new Response(
          JSON.stringify({ success: true, user }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'activate_subscription': {
        const subscriptionEnd = new Date();
        subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);

        const { data: user, error: updateError } = await supabase
          .from('promo33_users')
          .update({
            subscription_status: 'active',
            subscription_start: new Date().toISOString(),
            subscription_end: subscriptionEnd.toISOString()
          })
          .eq('email', email.toLowerCase())
          .select()
          .single();

        if (updateError) {
          console.error('[promo33-auth] Activation error:', updateError);
          throw updateError;
        }

        return new Response(
          JSON.stringify({ success: true, user }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_instagram': {
        const { data: user, error: updateError } = await supabase
          .from('promo33_users')
          .update({
            instagram_username,
            instagram_data
          })
          .eq('email', email.toLowerCase())
          .select()
          .single();

        if (updateError) {
          console.error('[promo33-auth] Instagram update error:', updateError);
          throw updateError;
        }

        return new Response(
          JSON.stringify({ success: true, user }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, message: 'Ação não reconhecida' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('[promo33-auth] Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
