import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INFINITEPAY_HANDLE = 'mro_instagram';
const REDIRECT_URL = 'https://adljdeekwifwcdcgbpit.lovableproject.com/anuncios/dash';

const log = (step: string, details?: unknown) => {
  console.log(`[ADS-BALANCE-CHECKOUT] ${step}:`, details ? JSON.stringify(details, null, 2) : '');
};

const generateNSU = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `ADSBAL${timestamp}${randomPart}`.toUpperCase();
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, email, amount, leadsQuantity } = await req.json();
    log('Request received', { userId, email, amount, leadsQuantity });

    if (!userId || !email || !amount || !leadsQuantity) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados incompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nsuOrder = generateNSU();
    const priceInCents = Math.round(amount * 100);
    
    // Product name format: anun_EMAIL (same format for webhook recognition)
    const productName = `anun_${email}`;
    
    const webhookUrl = `${supabaseUrl}/functions/v1/ads-webhook`;
    
    log('Creating InfiniPay balance checkout', { nsuOrder, productName, priceInCents });

    const infinitePayPayload = {
      handle: INFINITEPAY_HANDLE,
      redirect_url: REDIRECT_URL,
      items: [
        {
          description: productName,
          quantity: 1,
          amount: priceInCents
        }
      ],
      webhook_url: webhookUrl
    };

    let paymentLink = '';
    let fallbackUsed = false;

    try {
      const infinitePayResponse = await fetch('https://api.infinitepay.io/v2/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(infinitePayPayload)
      });

      if (infinitePayResponse.ok) {
        const infinitePayData = await infinitePayResponse.json();
        log('InfiniPay response', infinitePayData);
        paymentLink = infinitePayData.paymentLink || infinitePayData.payment_link || infinitePayData.url || '';
      }
    } catch (apiError) {
      log('InfiniPay API error', apiError);
    }

    if (!paymentLink) {
      paymentLink = `https://infinitepay.io/${INFINITEPAY_HANDLE}?amount=${priceInCents}&description=${encodeURIComponent(productName)}`;
      fallbackUsed = true;
      log('Using fallback link', { paymentLink });
    }

    // Create balance order
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

    log('Balance order created', balanceOrder);

    return new Response(
      JSON.stringify({
        success: true,
        paymentLink,
        nsuOrder,
        orderId: balanceOrder.id,
        fallbackUsed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log('Error', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
