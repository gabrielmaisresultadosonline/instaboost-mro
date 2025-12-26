import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (step: string, details?: unknown) => {
  console.log(`[ADS-WEBHOOK] ${step}:`, details ? JSON.stringify(details, null, 2) : '');
};

const sendWelcomeEmail = async (email: string, name: string, password: string) => {
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

    const dashboardUrl = 'https://pay.maisresultadosonline.com.br/anuncios/dash';

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;line-height:1.6;color:#333;background-color:#f4f4f4;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
<tr>
<td style="background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);padding:30px;text-align:center;">
<img src="https://pay.maisresultadosonline.com.br/ads-news-full.png" alt="Ads News" style="height:60px;margin-bottom:15px;">
<h1 style="color:#fff;margin:15px 0 0 0;font-size:24px;">🎉 Pagamento Confirmado!</h1>
</td>
</tr>
<tr>
<td style="padding:30px;background:#ffffff;">

<!-- Welcome Message -->
<div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:20px;border-radius:10px;margin-bottom:25px;text-align:center;">
<p style="margin:0;color:#fff;font-size:18px;font-weight:bold;">✨ Seu acesso foi liberado com sucesso!</p>
</div>

<p style="margin:0 0 20px 0;font-size:16px;">Olá <strong>${name}</strong>!</p>

<p style="margin:0 0 15px 0;font-size:16px;">Recebemos seu pagamento e seu acesso ao <strong>Ads News</strong> já está liberado! 🚀</p>

<p style="margin:0 0 15px 0;font-size:16px;">Agora vamos trabalhar juntos para gerar leads no seu WhatsApp:</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
<tr>
<td style="padding:8px 0;">
<span style="display:inline-block;background:#3b82f6;color:#fff;padding:3px 10px;border-radius:15px;font-size:14px;margin-right:8px;">📱</span>
<span style="color:#333;">Leads diretos no seu <strong>WhatsApp</strong></span>
</td>
</tr>
<tr>
<td style="padding:8px 0;">
<span style="display:inline-block;background:#3b82f6;color:#fff;padding:3px 10px;border-radius:15px;font-size:14px;margin-right:8px;">🎨</span>
<span style="color:#333;">Criativos <strong>profissionais</strong> para suas campanhas</span>
</td>
</tr>
<tr>
<td style="padding:8px 0;">
<span style="display:inline-block;background:#3b82f6;color:#fff;padding:3px 10px;border-radius:15px;font-size:14px;margin-right:8px;">📊</span>
<span style="color:#333;">Campanhas no <strong>Facebook, Instagram e WhatsApp</strong></span>
</td>
</tr>
</table>

<!-- Access Credentials -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:2px solid #3b82f6;border-radius:10px;margin:20px 0;">
<tr>
<td style="padding:20px;">
<h3 style="color:#333;margin:0 0 15px 0;font-size:16px;">📋 Seus Dados de Acesso:</h3>
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:12px;background:#f8f9fa;border-radius:5px;margin-bottom:10px;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td>
<span style="font-size:12px;color:#666;display:block;">Email:</span>
<span style="font-size:18px;color:#000;font-family:monospace;font-weight:bold;">${email}</span>
</td>
<td width="40" style="text-align:right;vertical-align:middle;">
<span style="font-size:18px;" title="Copie o email">📋</span>
</td>
</tr>
</table>
</td>
</tr>
<tr><td style="height:10px;"></td></tr>
<tr>
<td style="padding:12px;background:#f8f9fa;border-radius:5px;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td>
<span style="font-size:12px;color:#666;display:block;">Senha:</span>
<span style="font-size:18px;color:#000;font-family:monospace;font-weight:bold;">${password}</span>
</td>
<td width="40" style="text-align:right;vertical-align:middle;">
<span style="font-size:18px;" title="Copie a senha">📋</span>
</td>
</tr>
</table>
</td>
</tr>
<tr><td style="height:10px;"></td></tr>
<tr>
<td style="padding:12px;background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);border-radius:5px;text-align:center;">
<span style="font-size:14px;font-weight:bold;color:#fff;">⏱️ 30 dias de acesso</span>
</td>
</tr>
</table>
</td>
</tr>
</table>

<!-- Steps -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:10px;margin:20px 0;">
<tr>
<td style="padding:20px;">
<h3 style="color:#333;margin:0 0 15px 0;font-size:16px;">📝 Próximos Passos:</h3>
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:10px 0;border-bottom:1px solid #e0e0e0;">
<span style="display:inline-block;background:#3b82f6;color:#fff;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-weight:bold;margin-right:10px;">1</span>
<span style="color:#333;">Acesse o <strong>Dashboard</strong> com seu email e senha</span>
</td>
</tr>
<tr>
<td style="padding:10px 0;border-bottom:1px solid #e0e0e0;">
<span style="display:inline-block;background:#3b82f6;color:#fff;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-weight:bold;margin-right:10px;">2</span>
<span style="color:#333;">Preencha as informações do seu <strong>negócio</strong></span>
</td>
</tr>
<tr>
<td style="padding:10px 0;border-bottom:1px solid #e0e0e0;">
<span style="display:inline-block;background:#3b82f6;color:#fff;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-weight:bold;margin-right:10px;">3</span>
<span style="color:#333;">Adicione saldo para suas <strong>campanhas</strong></span>
</td>
</tr>
<tr>
<td style="padding:10px 0;">
<span style="display:inline-block;background:#10b981;color:#fff;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-weight:bold;margin-right:10px;">✓</span>
<span style="color:#333;font-weight:bold;">Pronto! Começaremos a gerar seus leads!</span>
</td>
</tr>
</table>
</td>
</tr>
</table>

<!-- CTA Button -->
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="text-align:center;padding:20px 0;">
<a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);color:#fff;text-decoration:none;padding:15px 40px;border-radius:8px;font-weight:bold;font-size:16px;">🚀 Acessar Meu Dashboard</a>
</td>
</tr>
</table>

<div style="background:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin:20px 0;border-radius:0 8px 8px 0;">
<p style="margin:0;color:#856404;font-size:15px;">
<strong>💡 Dúvidas?</strong><br>
Entre em contato pelo WhatsApp: <a href="https://wa.me/5551920356540" style="color:#856404;">+55 51 9203-6540</a>
</p>
</div>

</td>
</tr>
<tr>
<td style="background:#1a1a1a;padding:20px;text-align:center;">
<p style="color:#3b82f6;margin:0 0 10px 0;font-weight:bold;">Bem-vindo ao Ads News! 🚀</p>
<p style="color:#888;margin:0;font-size:12px;">© ${new Date().getFullYear()} Ads News - Anúncios para WhatsApp</p>
<p style="color:#666;margin:10px 0 0 0;font-size:11px;">Este email foi enviado porque você contratou nossos serviços de anúncios.</p>
</td>
</tr>
</table>
</body>
</html>`;

    await client.send({
      from: "Ads News <suporte@maisresultadosonline.com.br>",
      to: email,
      subject: "🎉 Pagamento Confirmado - Seu acesso ao Ads News está liberado!",
      html: htmlContent,
    });

    await client.close();
    log("Welcome email sent successfully", { email });
    return true;
  } catch (error) {
    log("Error sending welcome email", error);
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    log('Webhook received - FULL PAYLOAD', payload);

    // Extract payment info from InfiniPay webhook - support multiple formats
    const {
      status,
      nsu,
      order_nsu,
      amount,
      paid_amount,
      receipt_url,
      transaction_nsu,
      invoice_slug,
      items,
      payment_status,
      transaction_status,
      payment,
      transaction,
      data,
    } = payload;

    // Try to get nested data
    const nestedStatus = payment?.status || transaction?.status || data?.status;
    const nestedNsu = payment?.nsu || transaction?.nsu || data?.nsu || data?.order_nsu;
    const nestedItems = payment?.items || transaction?.items || data?.items;

    // Evidence-based fields (common in InfiniPay payloads)
    const totalAmount =
      typeof amount === "number"
        ? amount
        : typeof data?.amount === "number"
          ? data.amount
          : undefined;

    const paidAmount =
      typeof paid_amount === "number"
        ? paid_amount
        : typeof data?.paid_amount === "number"
          ? data.paid_amount
          : undefined;

    const receiptUrl =
      typeof receipt_url === "string"
        ? receipt_url
        : typeof data?.receipt_url === "string"
          ? data.receipt_url
          : undefined;

    const transactionNsu =
      typeof transaction_nsu === "string"
        ? transaction_nsu
        : typeof data?.transaction_nsu === "string"
          ? data.transaction_nsu
          : undefined;

    // Check if payment is confirmed - support all possible formats
    const evidencePaid =
      (typeof paidAmount === "number" && typeof totalAmount === "number" && paidAmount >= totalAmount && paidAmount > 0) ||
      Boolean(receiptUrl) ||
      Boolean(transactionNsu) ||
      (typeof invoice_slug === "string" && typeof paidAmount === "number" && paidAmount > 0);

    const isPaid =
      status === "approved" ||
      status === "paid" ||
      status === "confirmed" ||
      status === "completed" ||
      payment_status === "approved" ||
      payment_status === "paid" ||
      transaction_status === "approved" ||
      transaction_status === "paid" ||
      nestedStatus === "approved" ||
      nestedStatus === "paid" ||
      nestedStatus === "confirmed" ||
      evidencePaid;

    log("Payment status check", {
      status,
      payment_status,
      transaction_status,
      nestedStatus,
      totalAmount,
      paidAmount,
      hasReceiptUrl: Boolean(receiptUrl),
      hasTransactionNsu: Boolean(transactionNsu),
      isPaid,
    });

    if (!isPaid) {
      log("Payment not confirmed yet");
      return new Response(
        JSON.stringify({ success: true, message: "Payment not yet confirmed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract email from product name (anun_EMAIL format)
    let customerEmail = '';
    const allItems = items || nestedItems || [];
    
    if (Array.isArray(allItems)) {
      for (const item of allItems) {
        const itemName = item.name || item.description || item.product_name || '';
        log('Checking item', { itemName });
        if (itemName.startsWith('anun_')) {
          customerEmail = itemName.replace('anun_', '');
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
      log("Trying to find by NSU", orderNsu);
      const { data: orderByNsu } = await supabase
        .from("ads_orders")
        .select("email")
        .eq("nsu_order", orderNsu)
        .maybeSingle();

      if (orderByNsu?.email) {
        customerEmail = orderByNsu.email;
        log("Found email by NSU", customerEmail);
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

    // Check initial subscription orders first (prioriza o NSU do webhook)

    const { data: order, error: orderError } = orderNsu
      ? await supabase
          .from("ads_orders")
          .select("*")
          .eq("nsu_order", orderNsu)
          .eq("status", "pending")
          .maybeSingle()
      : await supabase
          .from("ads_orders")
          .select("*")
          .ilike("email", customerEmail)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

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

      // Get user details for email
      const { data: user } = await supabase
        .from("ads_users")
        .select("*")
        .ilike("email", customerEmail)
        .maybeSingle();

      // Update user status and subscription dates
      const subscriptionStart = new Date();
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);

      const { error: updateUserError } = await supabase
        .from("ads_users")
        .update({
          status: "active",
          subscription_start: subscriptionStart.toISOString(),
          subscription_end: subscriptionEnd.toISOString(),
        })
        .ilike("email", customerEmail);

      if (updateUserError) {
        log('Error updating user', updateUserError);
      } else {
        log('User activated with 30-day subscription', { 
          email: customerEmail,
          subscriptionEnd: subscriptionEnd.toISOString()
        });
      }

      // Send welcome email with credentials
      if (user) {
        await sendWelcomeEmail(customerEmail, user.name || order.name, user.password);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          type: 'initial', 
          orderId: order.id,
          message: 'User activated successfully and email sent'
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