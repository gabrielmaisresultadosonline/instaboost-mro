import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INFINITEPAY_HANDLE = 'paguemro';
const REDIRECT_URL = 'https://pay.maisresultadosonline.com.br/anuncios/dash';

const log = (step: string, details?: unknown) => {
  console.log(`[ADS-CHECKOUT] ${step}:`, details ? JSON.stringify(details, null, 2) : '');
};

const generateNSU = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `ADS${timestamp}${randomPart}`.toUpperCase();
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { name, email, password, phone, amount = 1, type = 'initial' } = await req.json();
    log('Request received', { name, email, type, amount });

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nsuOrder = generateNSU();
    const priceInCents = Math.round(amount * 100);
    
    // Product name format: anun_EMAIL
    const productName = `anun_${email}`;
    
    log('Creating InfiniPay Link Integrado', { nsuOrder, productName, priceInCents });

    // Create Link Integrado format (without URL encoding for the items parameter)
    const items = [{ name: productName, price: priceInCents, quantity: 1 }];
    const itemsJson = JSON.stringify(items);
    
    // Build the Link Integrado URL
    const paymentLink = `https://checkout.infinitepay.io/${INFINITEPAY_HANDLE}?items=${itemsJson}&redirect_url=${REDIRECT_URL}`;
    
    log('Payment link created', { paymentLink });

    if (type === 'initial') {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('ads_users')
        .select('id')
        .eq('email', email)
        .single();

      if (!existingUser && name && password) {
        // Create new user
        const { data: newUser, error: userError } = await supabase
          .from('ads_users')
          .insert({
            name,
            email,
            password,
            phone,
            status: 'pending'
          })
          .select('id')
          .single();

        if (userError) {
          log('Error creating user', userError);
        } else {
          log('User created', newUser);
        }
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('ads_orders')
        .insert({
          email,
          name: name || email.split('@')[0],
          amount,
          nsu_order: nsuOrder,
          infinitepay_link: paymentLink,
          status: 'pending',
          expired_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
        })
        .select()
        .single();

      if (orderError) {
        log('Error creating order', orderError);
        throw orderError;
      }

      log('Order created', order);

      return new Response(
        JSON.stringify({
          success: true,
          paymentLink,
          nsuOrder,
          orderId: order.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (type === 'balance') {
      // Balance order for Meta Ads
      const { userId, leadsQuantity } = await req.json();

      const { data: balanceOrder, error: balanceError } = await supabase
        .from('ads_balance_orders')
        .insert({
          user_id: userId,
          amount,
          leads_quantity: leadsQuantity,
          nsu_order: nsuOrder,
          infinitepay_link: paymentLink,
          status: 'pending'
        })
        .select()
        .single();

      if (balanceError) {
        log('Error creating balance order', balanceError);
        throw balanceError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          paymentLink,
          nsuOrder,
          orderId: balanceOrder.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Tipo de operação inválido' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log('Error', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
