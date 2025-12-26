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
          JSON.stringify({ success: false, error: 'Email nao configurado' }),
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
          JSON.stringify({ success: false, error: 'Usuario nao encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: clientData } = await supabase
        .from('ads_client_data')
        .select('sales_page_url')
        .eq('user_id', userId)
        .single();

      const endDate = user.subscription_end ? new Date(user.subscription_end).toLocaleDateString('pt-BR') : 'Nao definida';
      const year = new Date().getFullYear();
      const dashboardUrl = 'https://pay.maisresultadosonline.com.br/anuncios/dash';

      const salesPageSection = clientData?.sales_page_url ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f9ff; border-radius: 10px; margin-bottom: 20px;">
<tr>
<td style="padding: 15px;">
<p style="margin: 0 0 10px 0; color: #1d4ed8; font-weight: bold; font-size: 14px;">Sua pagina de vendas:</p>
<a href="${clientData.sales_page_url}" style="color: #1d4ed8; word-break: break-all; font-size: 14px;">${clientData.sales_page_url}</a>
</td>
</tr>
</table>` : '';

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dados de Acesso - Ads News</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f4f4;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px 0;">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

<tr>
<td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
<img src="https://pay.maisresultadosonline.com.br/ads-news-full.png" alt="Ads News" style="height: 50px; margin-bottom: 15px;">
<h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Seus Dados de Acesso</h1>
</td>
</tr>

<tr>
<td style="padding: 30px;">

<p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">Ola <strong>${user.name}</strong>!</p>

<p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">Aqui estao seus dados de acesso ao painel Ads News:</p>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 2px solid #3b82f6; border-radius: 10px; margin-bottom: 25px;">
<tr>
<td style="padding: 20px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="padding: 10px; background-color: #ffffff; border-radius: 5px;">
<span style="font-size: 12px; color: #666666; display: block; margin-bottom: 5px;">Email:</span>
<span style="font-size: 16px; color: #1e40af; font-weight: bold;">${user.email}</span>
</td>
</tr>
<tr><td style="height: 10px;"></td></tr>
<tr>
<td style="padding: 10px; background-color: #ffffff; border-radius: 5px;">
<span style="font-size: 12px; color: #666666; display: block; margin-bottom: 5px;">Senha:</span>
<span style="font-size: 16px; color: #1e40af; font-weight: bold;">${user.password}</span>
</td>
</tr>
<tr><td style="height: 10px;"></td></tr>
<tr>
<td style="padding: 12px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 5px; text-align: center;">
<span style="font-size: 14px; font-weight: bold; color: #ffffff;">Assinatura ate: ${endDate}</span>
</td>
</tr>
</table>
</td>
</tr>
</table>

${salesPageSection}

<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="text-align: center; padding: 10px 0 25px 0;">
<a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Acessar Painel</a>
</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fff7ed; border-left: 4px solid #f97316; border-radius: 0 8px 8px 0;">
<tr>
<td style="padding: 15px;">
<p style="margin: 0; color: #9a3412; font-size: 14px;"><strong>Duvidas?</strong> Entre em contato pelo WhatsApp: <a href="https://wa.me/5551920356540" style="color: #9a3412;">+55 51 9203-6540</a></p>
</td>
</tr>
</table>

</td>
</tr>

<tr>
<td style="background-color: #1a1a1a; padding: 20px; text-align: center;">
<p style="color: #3b82f6; margin: 0 0 10px 0; font-weight: bold; font-size: 14px;">Ads News - Leads no seu WhatsApp</p>
<p style="color: #888888; margin: 0; font-size: 12px;">${year} Ads News - Todos os direitos reservados</p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;

      await sendEmailViaSMTP(user.email, 'Seus dados de acesso - Ads News', html);

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
