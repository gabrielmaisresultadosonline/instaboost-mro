import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (step: string, details?: unknown) => {
  console.log(`[ADS-AUTH] ${step}:`, details ? JSON.stringify(details, null, 2) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, email, password, name, phone } = await req.json();
    log('Request received', { action, email });

    if (action === 'login') {
      // Login user
      const { data: user, error } = await supabase
        .from('ads_users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (error || !user) {
        log('Login failed', { error });
        return new Response(
          JSON.stringify({ success: false, error: 'Email ou senha inválidos' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (user.status !== 'active') {
        log('User not active', user);
        return new Response(
          JSON.stringify({ success: false, error: 'Sua conta ainda não está ativa. Aguarde a confirmação do pagamento.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get client data if exists
      const { data: clientData } = await supabase
        .from('ads_client_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Get balance orders
      const { data: balanceOrders } = await supabase
        .from('ads_balance_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      log('Login successful', { userId: user.id });
      return new Response(
        JSON.stringify({ 
          success: true, 
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            status: user.status,
            subscription_start: user.subscription_start,
            subscription_end: user.subscription_end
          },
          clientData,
          balanceOrders: balanceOrders || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'admin-login') {
      // Admin login
      const { data: admin, error } = await supabase
        .from('ads_admins')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (error || !admin) {
        log('Admin login failed', { error });
        return new Response(
          JSON.stringify({ success: false, error: 'Credenciais inválidas' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      log('Admin login successful', { adminId: admin.id });
      return new Response(
        JSON.stringify({ 
          success: true, 
          admin: {
            id: admin.id,
            name: admin.name,
            email: admin.email
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'check-payment') {
      // Check if user's payment is confirmed
      const { data: user } = await supabase
        .from('ads_users')
        .select('status')
        .eq('email', email)
        .single();

      return new Response(
        JSON.stringify({ 
          success: true, 
          isPaid: user?.status === 'active'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'save-client-data') {
      // Save client campaign data
      const { userId, niche, region, instagram, whatsapp, telegramGroup, logoUrl, observations } = await req.json();

      const { data: existing } = await supabase
        .from('ads_client_data')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('ads_client_data')
          .update({
            niche,
            region,
            instagram,
            whatsapp,
            telegram_group: telegramGroup,
            logo_url: logoUrl,
            observations
          })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('ads_client_data')
          .insert({
            user_id: userId,
            niche,
            region,
            instagram,
            whatsapp,
            telegram_group: telegramGroup,
            logo_url: logoUrl,
            observations
          });

        if (error) throw error;
      }

      log('Client data saved', { userId });
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'get-all-users') {
      // Admin: Get all users with their data
      const { data: users, error } = await supabase
        .from('ads_users')
        .select(`
          *,
          ads_client_data (*),
          ads_orders (*),
          ads_balance_orders (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, users }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'get-all-orders') {
      // Admin: Get all orders
      const { data: orders, error } = await supabase
        .from('ads_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, orders }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'update-user-status') {
      // Admin: Update user status
      const { userId, status } = await req.json();

      const { error } = await supabase
        .from('ads_users')
        .update({ status })
        .eq('id', userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'update-order-status') {
      // Admin: Update order status
      const { orderId, status } = await req.json();

      const updateData: Record<string, unknown> = { status };
      if (status === 'paid') {
        updateData.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('ads_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      // If marked as paid, also activate the user
      if (status === 'paid') {
        const { data: order } = await supabase
          .from('ads_orders')
          .select('email')
          .eq('id', orderId)
          .single();

        if (order) {
          const subscriptionStart = new Date();
          const subscriptionEnd = new Date();
          subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);

          await supabase
            .from('ads_users')
            .update({
              status: 'active',
              subscription_start: subscriptionStart.toISOString(),
              subscription_end: subscriptionEnd.toISOString()
            })
            .eq('email', order.email);
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'save-sales-page') {
      // Admin: Save sales page URL for user
      const { userId, salesPageUrl } = await req.json();

      const { error } = await supabase
        .from('ads_client_data')
        .update({ sales_page_url: salesPageUrl })
        .eq('user_id', userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'enable-renewal') {
      // Admin: Enable renewal payment for user
      const { userId } = await req.json();

      const { error } = await supabase
        .from('ads_users')
        .update({ status: 'renewal_pending' })
        .eq('id', userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Ação inválida' }),
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
