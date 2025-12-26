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
    log('Webhook received - FULL PAYLOAD', payload);

    // Extract payment info from InfiniPay webhook - support multiple formats
    const { 
      status, 
      nsu,
      order_nsu,
      amount, 
      items,
      payment_status,
      transaction_status,
      payment,
      transaction,
      data
    } = payload;

    // Try to get nested data
    const nestedStatus = payment?.status || transaction?.status || data?.status;
    const nestedNsu = payment?.nsu || transaction?.nsu || data?.nsu || data?.order_nsu;
    const nestedItems = payment?.items || transaction?.items || data?.items;

    // Check if payment is confirmed - support all possible formats
    const isPaid = status === 'approved' || 
                   status === 'paid' ||
                   status === 'confirmed' ||
                   status === 'completed' ||
                   payment_status === 'approved' ||
                   payment_status === 'paid' ||
                   transaction_status === 'approved' ||
                   transaction_status === 'paid' ||
                   nestedStatus === 'approved' ||
                   nestedStatus === 'paid' ||
                   nestedStatus === 'confirmed';

    log('Payment status check', { 
      status, 
      payment_status, 
      transaction_status, 
      nestedStatus,
      isPaid 
    });

    if (!isPaid) {
      log('Payment not confirmed yet');
      return new Response(
        JSON.stringify({ success: true, message: 'Payment not yet confirmed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract email from product description (anun_EMAIL format)
    let customerEmail = '';
    const allItems = items || nestedItems || [];
    
    if (Array.isArray(allItems)) {
      for (const item of allItems) {
        const description = item.description || item.name || item.product_name || '';
        log('Checking item', { description });
        if (description.startsWith('anun_')) {
          customerEmail = description.replace('anun_', '');
          break;
        }
      }
    }

    // Try to extract from other payload fields
    if (!customerEmail) {
      const payloadStr = JSON.stringify(payload);
      const emailMatch = payloadStr.match(/anun_([^"]+@[^"]+)/);
      if (emailMatch) {
        customerEmail = emailMatch[1];
        log('Found email via regex', customerEmail);
      }
    }

    // Try to find by NSU if email not found
    const orderNsu = nsu || order_nsu || nestedNsu;
    if (!customerEmail && orderNsu) {
      log('Trying to find by NSU', orderNsu);
      const { data: orderByNsu } = await supabase
        .from('ads_orders')
        .select('email')
        .eq('nsu_order', orderNsu)
        .single();
      
      if (orderByNsu) {
        customerEmail = orderByNsu.email;
        log('Found email by NSU', customerEmail);
      }
    }

    if (!customerEmail) {
      log('No email found in webhook - cannot process');
      return new Response(
        JSON.stringify({ success: false, error: 'No email found in webhook' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log('Processing payment for email', customerEmail);

    // Check initial subscription orders first
    const { data: order, error: orderError } = await supabase
      .from('ads_orders')
      .select('*')
      .eq('email', customerEmail)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (order && !orderError) {
      log('Found pending initial order', order);
      
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
      } else {
        log('Order marked as paid');
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
        log('User activated with 30-day subscription', { 
          email: customerEmail,
          subscriptionEnd: subscriptionEnd.toISOString()
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          type: 'initial', 
          orderId: order.id,
          message: 'User activated successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check balance orders
    const { data: balanceOrders } = await supabase
      .from('ads_balance_orders')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (balanceOrders && balanceOrders.length > 0) {
      // Find the balance order for this user by checking user_id
      const { data: user } = await supabase
        .from('ads_users')
        .select('id')
        .eq('email', customerEmail)
        .single();

      if (user) {
        const balanceOrder = balanceOrders.find(bo => bo.user_id === user.id);
        
        if (balanceOrder) {
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
            JSON.stringify({ 
              success: true, 
              type: 'balance', 
              orderId: balanceOrder.id,
              message: 'Balance order paid successfully'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    log('No pending order found for email', customerEmail);
    return new Response(
      JSON.stringify({ success: true, message: 'No pending order found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log('Error processing webhook', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
