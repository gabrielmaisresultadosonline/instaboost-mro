import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (step: string, details?: unknown) => {
  console.log(`[ADS-AUTH] ${step}:`, details ? JSON.stringify(details, null, 2) : '');
};

const sendEmailViaSMTP = async (to: string, subject: string, html: string) => {
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  if (!smtpPassword) {
    log("SMTP password not configured, skipping email");
    return false;
  }

  try {
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.hostinger.com",
        port: 465,
        tls: true,
        auth: {
          username: "suporte@maisresultadosonline.com.br",
          password: smtpPassword,
        },
      },
    });

    await client.send({
      from: "Ads News <suporte@maisresultadosonline.com.br>",
      to: to,
      subject: subject,
      content: "auto",
      html: html,
    });

    await client.close();
    log('Email sent successfully', { to, subject });
    return true;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log('Email send error', { error: errMsg });
    return false;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, email, password } = body;
    log('Request received', { action, email });

    if (action === 'login') {
      // Login user - use ilike for case-insensitive email match
      const cleanEmail = email?.toLowerCase()?.trim();
      const allowPending = body.allowPending === true; // Allow pending users when checking payment
      
      const { data: user, error } = await supabase
        .from('ads_users')
        .select('*')
        .ilike('email', cleanEmail)
        .eq('password', password)
        .single();

      if (error || !user) {
        log('Login failed', { error });
        return new Response(
          JSON.stringify({ success: false, error: 'Email ou senha inválidos' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Block only if not active AND not allowing pending users
      if (user.status !== 'active' && !allowPending) {
        log('User not active', user);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Sua conta ainda não está ativa. Aguarde a confirmação do pagamento.',
            isPending: user.status === 'pending',
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              status: user.status
            }
          }),
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

      log('Login successful', { userId: user.id, status: user.status });
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
      const { userId, niche, region, instagram, whatsapp, telegramGroup, logoUrl, observations } = body;

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
      // Admin: Get all orders with user data
      const { data: orders, error } = await supabase
        .from('ads_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For paid orders, get user client data
      const ordersWithData = await Promise.all(orders.map(async (order) => {
        if (order.status === 'paid') {
          const { data: user } = await supabase
            .from('ads_users')
            .select('id, status, subscription_end')
            .ilike('email', order.email)
            .single();

          if (user) {
            const { data: clientData } = await supabase
              .from('ads_client_data')
              .select('*')
              .eq('user_id', user.id)
              .single();

            return { ...order, user, clientData };
          }
        }
        return order;
      }));

      return new Response(
        JSON.stringify({ success: true, orders: ordersWithData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'update-user-status') {
      // Admin: Update user status
      const { userId, status } = body;

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
      const { orderId, status } = body;

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
            .ilike('email', order.email);
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'save-sales-page') {
      // Admin: Save sales page URL for user
      const { userId, salesPageUrl } = body;

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
      const { userId } = body;

      const { error } = await supabase
        .from('ads_users')
        .update({ status: 'renewal_pending' })
        .eq('id', userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'expire-user') {
      // Admin: Expire user subscription
      const { userId } = body;

      const { error } = await supabase
        .from('ads_users')
        .update({ status: 'expired' })
        .eq('id', userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'activate-ads') {
      // Admin: Activate ads for user with end date and page URL
      const { userId, subscriptionEnd, salesPageUrl, sendEmail } = body;

      // Update user status and subscription end
      const { error: userError } = await supabase
        .from('ads_users')
        .update({
          status: 'active',
          subscription_end: new Date(subscriptionEnd).toISOString()
        })
        .eq('id', userId);

      if (userError) throw userError;

      // Save sales page URL if provided
      if (salesPageUrl) {
        // Check if client data exists
        const { data: existing } = await supabase
          .from('ads_client_data')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (existing) {
          await supabase
            .from('ads_client_data')
            .update({ sales_page_url: salesPageUrl })
            .eq('user_id', userId);
        } else {
          await supabase
            .from('ads_client_data')
            .insert({
              user_id: userId,
              sales_page_url: salesPageUrl
            });
        }
      }

      // Send activation email if requested
      if (sendEmail && smtpPassword) {
        const { data: user } = await supabase
          .from('ads_users')
          .select('name, email')
          .eq('id', userId)
          .single();

        if (user) {
          const endDate = new Date(subscriptionEnd).toLocaleDateString('pt-BR');

          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <img src="https://adljdeekwifwcdcgbpit.supabase.co/storage/v1/object/public/assets/ads-news-full.png" alt="Ads News" style="max-width: 200px; margin-bottom: 20px;" />
              
              <h1 style="color: #1d4ed8;">Olá, ${user.name}! 🎉</h1>
              
              <p style="font-size: 18px; color: #333;">Temos uma ótima notícia: <strong>seus anúncios estão ativos!</strong></p>
              
              <div style="background: linear-gradient(135deg, #1d4ed8, #3b82f6); color: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px;">📅 <strong>Anúncios ativos até:</strong></p>
                <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold;">${endDate}</p>
              </div>
              
              ${salesPageUrl ? `
              <div style="background: #f0f9ff; padding: 15px; border-radius: 10px; margin: 20px 0;">
                <p style="margin: 0; color: #1d4ed8;"><strong>🔗 Sua página de vendas:</strong></p>
                <a href="${salesPageUrl}" style="color: #1d4ed8; word-break: break-all;">${salesPageUrl}</a>
              </div>
              ` : ''}
              
              <p style="color: #666;">Acesse seu painel para acompanhar os resultados:</p>
              <a href="https://mrodigital.site/anuncios/dash" style="display: inline-block; background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Acessar Painel</a>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
              
              <p style="color: #999; font-size: 12px;">Ads News - Leads no seu WhatsApp o dia todo</p>
            </div>
          `;

          await sendEmailViaSMTP(user.email, '🚀 Seus anúncios estão ATIVOS!', html);
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'resend-access-email') {
      // Admin: Resend access email to user
      const { userId } = body;

      if (!smtpPassword) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email não configurado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: user } = await supabase
        .from('ads_users')
        .select('name, email, password, subscription_end')
        .eq('id', userId)
        .single();

      if (!user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Usuário não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: clientData } = await supabase
        .from('ads_client_data')
        .select('sales_page_url')
        .eq('user_id', userId)
        .single();

      const endDate = user.subscription_end ? new Date(user.subscription_end).toLocaleDateString('pt-BR') : 'Não definida';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <img src="https://adljdeekwifwcdcgbpit.supabase.co/storage/v1/object/public/assets/ads-news-full.png" alt="Ads News" style="max-width: 200px; margin-bottom: 20px;" />
          
          <h1 style="color: #1d4ed8;">Olá, ${user.name}!</h1>
          
          <p>Aqui estão seus dados de acesso ao painel Ads News:</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p><strong>📧 Email:</strong> ${user.email}</p>
            <p><strong>🔑 Senha:</strong> ${user.password}</p>
            <p><strong>📅 Assinatura até:</strong> ${endDate}</p>
          </div>
          
          ${clientData?.sales_page_url ? `
          <div style="background: #f0f9ff; padding: 15px; border-radius: 10px; margin: 20px 0;">
            <p style="margin: 0; color: #1d4ed8;"><strong>🔗 Sua página de vendas:</strong></p>
            <a href="${clientData.sales_page_url}" style="color: #1d4ed8; word-break: break-all;">${clientData.sales_page_url}</a>
          </div>
          ` : ''}
          
          <a href="https://mrodigital.site/anuncios/dash" style="display: inline-block; background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Acessar Painel</a>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          
          <p style="color: #999; font-size: 12px;">Ads News - Leads no seu WhatsApp o dia todo</p>
        </div>
      `;

      await sendEmailViaSMTP(user.email, '📧 Seus dados de acesso - Ads News', html);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'upload-logo') {
      // Upload logo for client
      const { userId, logoBase64, fileName } = body;

      // Convert base64 to blob
      const base64Data = logoBase64.split(',')[1] || logoBase64;
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      const filePath = `ads-logos/${userId}/${Date.now()}-${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, binaryData, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      // Update client data with logo URL
      const { data: existing } = await supabase
        .from('ads_client_data')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        await supabase
          .from('ads_client_data')
          .update({ logo_url: publicUrl })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('ads_client_data')
          .insert({
            user_id: userId,
            logo_url: publicUrl
          });
      }

      return new Response(
        JSON.stringify({ success: true, logoUrl: publicUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'verify-payment') {
      // Admin: Manually verify payment via InfiniPay API
      const { orderId } = body;
      log('Verifying payment for order', orderId);

      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('ads_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ success: false, error: 'Pedido não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      log('Order found', { nsu: order.nsu_order, email: order.email, status: order.status });

      // Check InfiniPay API for payment status using product name format
      const productName = `anun_${order.email}`;
      
      try {
        // Try to check payment using InfiniPay API
        const infinitePayToken = Deno.env.get('INFINITEPAY_TOKEN') || '';
        
        if (infinitePayToken) {
          // If we have token, try direct API check
          const checkResponse = await fetch('https://api.infinitepay.io/v2/orders', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${infinitePayToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (checkResponse.ok) {
            const ordersData = await checkResponse.json();
            log('InfiniPay orders response', ordersData);
            
            // Look for matching order by product name or NSU
            const matchingOrder = ordersData?.data?.find((o: { items?: { name?: string }[], nsu?: string, status?: string }) => {
              const hasMatchingProduct = o.items?.some((item: { name?: string }) => 
                item.name?.includes(order.email) || item.name?.includes(productName)
              );
              const hasMatchingNsu = o.nsu === order.nsu_order;
              return (hasMatchingProduct || hasMatchingNsu) && 
                     (o.status === 'approved' || o.status === 'paid' || o.status === 'confirmed');
            });

            if (matchingOrder) {
              log('Found paid order in InfiniPay', matchingOrder);
              
              // Update order as paid
              const subscriptionStart = new Date();
              const subscriptionEnd = new Date();
              subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);

              await supabase
                .from('ads_orders')
                .update({
                  status: 'paid',
                  paid_at: new Date().toISOString(),
                  invoice_slug: matchingOrder.invoice_slug || null,
                  transaction_nsu: matchingOrder.transaction_nsu || matchingOrder.nsu || null
                })
                .eq('id', orderId);

              await supabase
                .from('ads_users')
                .update({
                  status: 'active',
                  subscription_start: subscriptionStart.toISOString(),
                  subscription_end: subscriptionEnd.toISOString()
                })
                .ilike('email', order.email);

              return new Response(
                JSON.stringify({ 
                  success: true, 
                  paid: true, 
                  message: 'Pagamento confirmado e usuário ativado!'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        }

        // If no token or API check didn't find payment, return not paid
        return new Response(
          JSON.stringify({ 
            success: true, 
            paid: false, 
            message: 'Pagamento ainda não confirmado no InfiniPay'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (apiError) {
        log('Error checking InfiniPay API', apiError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Erro ao verificar pagamento na API InfiniPay'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Ação não reconhecida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    log('Error', { message: errMsg, stack: errStack });
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
