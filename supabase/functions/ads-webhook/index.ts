import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (step: string, details?: unknown) => {
  console.log(`[ADS-WEBHOOK] ${step}:`, details ? JSON.stringify(details, null, 2) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    log('Webhook received', payload);

    // Extract payment info from InfiniPay webhook
    const { 
      status, 
      nsu, 
      amount, 
      items,
      payment_status,
      transaction_status 
    } = payload;

    // Check if payment is confirmed
    const isPaid = status === 'approved' || 
                   status === 'paid' || 
                   payment_status === 'approved' ||
                   transaction_status === 'approved';

    if (!isPaid) {
      log('Payment not confirmed yet', { status, payment_status, transaction_status });
      return new Response(
        JSON.stringify({ success: true, message: 'Payment not yet confirmed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract email from product description (anun_EMAIL format)
    let customerEmail = '';
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const description = item.description || item.name || '';
        if (description.startsWith('anun_')) {
          customerEmail = description.replace('anun_', '');
          break;
        }
      }
    }

    if (!customerEmail) {
      log('Could not extract email from items', items);
      // Try to find by NSU
      if (nsu) {
        const { data: orderByNsu } = await supabase
          .from('ads_orders')
          .select('email')
          .eq('nsu_order', nsu)
          .single();
        
        if (orderByNsu) {
          customerEmail = orderByNsu.email;
        }
      }
    }

    if (!customerEmail) {
      log('No email found in webhook');
      return new Response(
        JSON.stringify({ success: false, error: 'No email found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log('Processing payment for email', customerEmail);

    // Check if this is a balance order or initial order
    // First check balance orders
    const { data: balanceOrder, error: balanceError } = await supabase
      .from('ads_balance_orders')
      .select('*, ads_users!inner(email)')
      .eq('status', 'pending')
      .eq('ads_users.email', customerEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (balanceOrder && !balanceError) {
      log('Found pending balance order', balanceOrder);
      
      const { error: updateError } = await supabase
        .from('ads_balance_orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', balanceOrder.id);

      if (updateError) {
        log('Error updating balance order', updateError);
      } else {
        log('Balance order marked as paid');
      }

      return new Response(
        JSON.stringify({ success: true, type: 'balance', orderId: balanceOrder.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check initial subscription orders
    const { data: order, error: orderError } = await supabase
      .from('ads_orders')
      .select('*')
      .eq('email', customerEmail)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (order && !orderError) {
      log('Found pending order', order);
      
      // Update order status
      const { error: updateOrderError } = await supabase
        .from('ads_orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateOrderError) {
        log('Error updating order', updateOrderError);
      }

      // Update user status and subscription dates
      const subscriptionStart = new Date();
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);

      const { error: updateUserError } = await supabase
        .from('ads_users')
        .update({
          status: 'active',
          subscription_start: subscriptionStart.toISOString(),
          subscription_end: subscriptionEnd.toISOString()
        })
        .eq('email', customerEmail);

      if (updateUserError) {
        log('Error updating user', updateUserError);
      } else {
        log('User activated with 30-day subscription');
      }

      return new Response(
        JSON.stringify({ success: true, type: 'initial', orderId: order.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log('No pending order found for email', customerEmail);
    return new Response(
      JSON.stringify({ success: true, message: 'No pending order found' }),
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
