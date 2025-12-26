import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (message: string, data?: any) => {
  console.log(`[${new Date().toISOString()}] ${message}`, data ? JSON.stringify(data) : '');
};

// Send welcome email to customer
async function sendWelcomeEmail(email: string, name: string, password: string): Promise<boolean> {
  try {
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    if (!smtpPassword) {
      log('SMTP_PASSWORD not configured');
      return false;
    }

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

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .credentials { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .credential-item { margin: 10px 0; }
    .label { color: #666; font-size: 14px; }
    .value { color: #333; font-size: 18px; font-weight: bold; }
    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Pagamento Confirmado!</h1>
      <p>Bem-vindo ao Ads News</p>
    </div>
    <div class="content">
      <p>Olá${name ? ` ${name}` : ''},</p>
      <p>Seu pagamento foi confirmado com sucesso! Agora você tem acesso completo à nossa plataforma de gestão de anúncios.</p>
      
      <div class="credentials">
        <h3>📧 Seus dados de acesso:</h3>
        <div class="credential-item">
          <div class="label">Email:</div>
          <div class="value">${email}</div>
        </div>
        <div class="credential-item">
          <div class="label">Senha:</div>
          <div class="value">${password}</div>
        </div>
      </div>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}" class="button">Acessar Meu Dashboard</a>
      </p>
      
      <h3>📋 Próximos passos:</h3>
      <ol>
        <li>Acesse o dashboard com seus dados</li>
        <li>Preencha as informações do seu negócio</li>
        <li>Faça upload da sua logo</li>
        <li>Adicione saldo para suas campanhas</li>
        <li>Aguarde seus leads chegarem!</li>
      </ol>
      
      <p>Sua assinatura está ativa por 30 dias. Após esse período, você poderá renovar.</p>
    </div>
    <div class="footer">
      <p>Ads News - Gestão Profissional de Anúncios</p>
      <p>Em caso de dúvidas, entre em contato: suporte@maisresultadosonline.com.br</p>
    </div>
  </div>
</body>
</html>`;

    await client.send({
      from: "Ads News <suporte@maisresultadosonline.com.br>",
      to: email,
      subject: "🎉 Pagamento Confirmado - Bem-vindo ao Ads News!",
      html: htmlContent,
    });

    await client.close();
    log('Welcome email sent successfully to:', email);
    return true;
  } catch (error) {
    log('Error sending welcome email:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { order_nsu, email } = await req.json();
    log('Checking payment for:', { order_nsu, email });

    if (!order_nsu || !email) {
      return new Response(
        JSON.stringify({ success: false, error: 'order_nsu and email are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // First check if order exists and is still pending
    const { data: order, error: orderError } = await supabase
      .from('ads_orders')
      .select('*')
      .eq('nsu_order', order_nsu)
      .eq('email', email)
      .single();

    if (orderError || !order) {
      log('Order not found:', { order_nsu, email });
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found', paid: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already paid, return success
    if (order.status === 'paid') {
      log('Order already paid:', order_nsu);
      return new Response(
        JSON.stringify({ success: true, paid: true, message: 'Order already paid' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if order expired (10 minutes)
    const createdAt = new Date(order.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (diffMinutes > 10) {
      // Mark as expired
      await supabase
        .from('ads_orders')
        .update({ 
          status: 'expired',
          expired_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      log('Order expired:', order_nsu);
      return new Response(
        JSON.stringify({ success: false, paid: false, expired: true, message: 'Order expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check payment status with InfiniPay API
    const handle = 'paguemro';
    const checkUrl = 'https://api.infinitepay.io/invoices/public/checkout/payment_check';
    
    log('Checking InfiniPay API for payment:', { handle, order_nsu });

    const checkResponse = await fetch(checkUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        handle: handle,
        order_nsu: order_nsu
      })
    });

    const checkResult = await checkResponse.json();
    log('InfiniPay check result:', checkResult);

    // Check if payment is confirmed
    if (checkResult.success && checkResult.paid) {
      log('Payment confirmed via InfiniPay API!', { order_nsu });

      // Update order to paid
      await supabase
        .from('ads_orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      // Check if user exists
      const { data: existingUser } = await supabase
        .from('ads_users')
        .select('*')
        .eq('email', email)
        .single();

      const subscriptionStart = new Date();
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);

      if (existingUser) {
        // Update existing user
        await supabase
          .from('ads_users')
          .update({
            status: 'active',
            subscription_start: subscriptionStart.toISOString(),
            subscription_end: subscriptionEnd.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id);

        // Link order to user
        await supabase
          .from('ads_orders')
          .update({ user_id: existingUser.id })
          .eq('id', order.id);

        // Send welcome email
        await sendWelcomeEmail(email, existingUser.name, existingUser.password);

        log('User updated and email sent:', email);
      } else {
        // This shouldn't happen as user should be created during checkout
        log('User not found for email:', email);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          paid: true, 
          message: 'Payment confirmed!',
          capture_method: checkResult.capture_method,
          amount: checkResult.amount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Payment not yet confirmed
    return new Response(
      JSON.stringify({ 
        success: true, 
        paid: false, 
        message: 'Payment pending',
        timeRemaining: Math.max(0, 10 - diffMinutes)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    log('Error checking payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
