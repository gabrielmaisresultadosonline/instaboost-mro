import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AFFILIATE-COMMISSION-EMAIL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      type, // 'commission' | 'summary'
      affiliateEmail, 
      affiliateName,
      affiliateId,
      customerEmail,
      customerName,
      commission,
      // For summary
      totalSales,
      totalCommission,
      salesList
    } = await req.json();
    
    logStep("Request received", { type, affiliateEmail, affiliateName, affiliateId });

    // Se não temos o email do afiliado mas temos o ID, tentar buscar do storage
    let finalAffiliateEmail = affiliateEmail;
    let finalAffiliateName = affiliateName;
    
    if (!finalAffiliateEmail && affiliateId) {
      // Tentar buscar dados do afiliado do Supabase Storage
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          // Buscar do storage o arquivo de afiliados
          const { data, error } = await supabase.storage
            .from('user-data')
            .download('admin/affiliates.json');
          
          if (!error && data) {
            const text = await data.text();
            const affiliates = JSON.parse(text);
            const affiliate = affiliates.find((a: any) => a.id === affiliateId);
            
            if (affiliate) {
              finalAffiliateEmail = affiliate.email;
              finalAffiliateName = affiliate.name;
              logStep("Found affiliate from storage", { affiliateId, email: finalAffiliateEmail });
            }
          }
        }
      } catch (e) {
        logStep("Could not load affiliate from storage", { error: String(e) });
      }
    }

    if (!finalAffiliateEmail) {
      logStep("No affiliate email found, skipping");
      return new Response(
        JSON.stringify({ success: false, error: 'Affiliate email not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!finalAffiliateName) {
      finalAffiliateName = affiliateId || "Afiliado";
    }

    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    if (!smtpPassword) {
      logStep("SMTP password not configured");
      return new Response(
        JSON.stringify({ success: false, error: 'SMTP not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
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

    let subject = '';
    let htmlContent = '';

    if (type === 'commission') {
      // Email de comissão por venda individual
      subject = `💰 Temos uma comissão para você, ${finalAffiliateName}!`;
      htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;line-height:1.6;color:#333;background-color:#f4f4f4;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
<tr>
<td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:30px;text-align:center;">
<div style="background:#000;color:#FFD700;display:inline-block;padding:10px 25px;border-radius:8px;font-size:32px;font-weight:bold;letter-spacing:2px;margin-bottom:10px;">MRO</div>
<h1 style="color:#fff;margin:15px 0 0 0;font-size:28px;">💰 Comissão Confirmada!</h1>
</td>
</tr>
<tr>
<td style="padding:30px;background:#ffffff;">

<div style="background:linear-gradient(135deg,#FFD700 0%,#FFA500 100%);padding:25px;border-radius:15px;margin-bottom:25px;text-align:center;">
<p style="margin:0;color:#000;font-size:16px;font-weight:bold;">🎉 PARABÉNS, ${finalAffiliateName.toUpperCase()}!</p>
<p style="margin:10px 0 0 0;color:#000;font-size:14px;">Você tem uma nova comissão!</p>
</div>

<div style="background:#f0fdf4;border:2px solid #10b981;border-radius:15px;padding:25px;text-align:center;margin-bottom:25px;">
<p style="margin:0;color:#666;font-size:14px;">Valor da sua comissão:</p>
<p style="margin:10px 0;color:#10b981;font-size:48px;font-weight:bold;">R$ ${commission || '97'},00</p>
<p style="margin:0;color:#059669;font-size:16px;font-weight:bold;">🚀 Vamos para cima!</p>
</div>

<div style="background:#f8f9fa;border-radius:10px;padding:20px;margin-bottom:25px;">
<h3 style="color:#333;margin:0 0 15px 0;font-size:16px;">📋 Detalhes da Venda:</h3>
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:10px;background:#fff;border-radius:5px;margin-bottom:5px;">
<span style="font-size:12px;color:#666;display:block;">Cliente:</span>
<span style="font-size:16px;color:#000;font-weight:bold;">${customerName || 'Novo cliente'}</span>
</td>
</tr>
<tr><td style="height:10px;"></td></tr>
<tr>
<td style="padding:10px;background:#fff;border-radius:5px;">
<span style="font-size:12px;color:#666;display:block;">Email do cliente:</span>
<span style="font-size:14px;color:#000;font-family:monospace;">${customerEmail}</span>
</td>
</tr>
</table>
</div>

<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin:20px 0;border-radius:0 8px 8px 0;">
<p style="margin:0;color:#92400e;font-size:14px;">
<strong>💡 Continue indicando!</strong><br>
Cada venda através do seu link gera comissão. Quanto mais indicações, mais você ganha!
</p>
</div>

<p style="margin:20px 0;font-size:16px;color:#666;text-align:center;">
Continue assim! Você está no caminho certo! 🔥
</p>

</td>
</tr>
<tr>
<td style="background:#1a1a1a;padding:20px;text-align:center;">
<p style="color:#FFD700;margin:0 0 10px 0;font-weight:bold;">MRO - Programa de Afiliados 💛</p>
<p style="color:#888;margin:0;font-size:12px;">© ${new Date().getFullYear()} MRO - Mais Resultados Online</p>
</td>
</tr>
</table>
</body>
</html>`;

    } else if (type === 'summary') {
      // Email de resumo final
      subject = `📊 Resumo Final das suas Vendas - ${finalAffiliateName}`;
      
      // Build sales table rows
      let salesRows = '';
      if (salesList && salesList.length > 0) {
        salesList.forEach((sale: any, index: number) => {
          salesRows += `
<tr style="border-bottom:1px solid #e5e7eb;">
<td style="padding:12px;font-size:14px;">${index + 1}</td>
<td style="padding:12px;font-size:14px;">${sale.customerEmail}</td>
<td style="padding:12px;font-size:14px;">${sale.customerName || '-'}</td>
<td style="padding:12px;font-size:14px;">R$ ${Number(sale.amount).toFixed(2)}</td>
<td style="padding:12px;font-size:14px;">${sale.date}</td>
</tr>`;
        });
      }

      htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;line-height:1.6;color:#333;background-color:#f4f4f4;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;margin:0 auto;background:#ffffff;">
<tr>
<td style="background:linear-gradient(135deg,#8b5cf6 0%,#6366f1 100%);padding:30px;text-align:center;">
<div style="background:#000;color:#FFD700;display:inline-block;padding:10px 25px;border-radius:8px;font-size:32px;font-weight:bold;letter-spacing:2px;margin-bottom:10px;">MRO</div>
<h1 style="color:#fff;margin:15px 0 0 0;font-size:28px;">📊 Resumo Final de Vendas</h1>
</td>
</tr>
<tr>
<td style="padding:30px;background:#ffffff;">

<div style="background:linear-gradient(135deg,#FFD700 0%,#FFA500 100%);padding:25px;border-radius:15px;margin-bottom:25px;text-align:center;">
<p style="margin:0;color:#000;font-size:18px;font-weight:bold;">🎉 PARABÉNS, ${finalAffiliateName.toUpperCase()}!</p>
<p style="margin:10px 0 0 0;color:#000;font-size:14px;">Aqui está o resumo completo das suas vendas!</p>
</div>

<!-- Stats Cards -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:25px;">
<tr>
<td width="50%" style="padding-right:10px;">
<div style="background:#f0fdf4;border:2px solid #10b981;border-radius:15px;padding:20px;text-align:center;">
<p style="margin:0;color:#666;font-size:12px;">Total de Vendas</p>
<p style="margin:5px 0;color:#10b981;font-size:36px;font-weight:bold;">${totalSales || 0}</p>
</div>
</td>
<td width="50%" style="padding-left:10px;">
<div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:15px;padding:20px;text-align:center;">
<p style="margin:0;color:#666;font-size:12px;">Comissão Total</p>
<p style="margin:5px 0;color:#f59e0b;font-size:36px;font-weight:bold;">R$ ${totalCommission || '0'},00</p>
</div>
</td>
</tr>
</table>

<!-- Sales Table -->
<div style="background:#f8f9fa;border-radius:10px;padding:20px;margin-bottom:25px;overflow-x:auto;">
<h3 style="color:#333;margin:0 0 15px 0;font-size:16px;">📋 Lista de Vendas Realizadas:</h3>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;border-collapse:collapse;">
<thead>
<tr style="background:#1a1a1a;color:#fff;">
<th style="padding:12px;text-align:left;font-size:12px;border-radius:8px 0 0 0;">#</th>
<th style="padding:12px;text-align:left;font-size:12px;">Email</th>
<th style="padding:12px;text-align:left;font-size:12px;">Cliente</th>
<th style="padding:12px;text-align:left;font-size:12px;">Valor</th>
<th style="padding:12px;text-align:left;font-size:12px;border-radius:0 8px 0 0;">Data</th>
</tr>
</thead>
<tbody>
${salesRows || '<tr><td colspan="5" style="padding:20px;text-align:center;color:#666;">Nenhuma venda registrada</td></tr>'}
</tbody>
</table>
</div>

<div style="background:#ede9fe;border:2px solid #8b5cf6;border-radius:15px;padding:20px;text-align:center;margin-bottom:25px;">
<p style="margin:0;color:#6366f1;font-size:16px;font-weight:bold;">
🙏 Obrigado por fazer parte da família MRO!
</p>
<p style="margin:10px 0 0 0;color:#666;font-size:14px;">
Seu pagamento será processado em breve.
</p>
</div>

<div style="background:#f0f9ff;border-left:4px solid #3b82f6;padding:15px;margin:20px 0;border-radius:0 8px 8px 0;">
<p style="margin:0;color:#1e40af;font-size:14px;">
<strong>📧 Dúvidas?</strong><br>
Entre em contato conosco pelo suporte que teremos prazer em ajudar!
</p>
</div>

</td>
</tr>
<tr>
<td style="background:#1a1a1a;padding:20px;text-align:center;">
<p style="color:#FFD700;margin:0 0 10px 0;font-weight:bold;">MRO - Programa de Afiliados 💛</p>
<p style="color:#888;margin:0;font-size:12px;">© ${new Date().getFullYear()} MRO - Mais Resultados Online</p>
<p style="color:#666;margin:10px 0 0 0;font-size:11px;">Este é um resumo automático das suas vendas como afiliado.</p>
</td>
</tr>
</table>
</body>
</html>`;
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    await client.send({
      from: "MRO - Afiliados <suporte@maisresultadosonline.com.br>",
      to: finalAffiliateEmail,
      subject: subject,
      html: htmlContent,
    });

    await client.close();

    logStep("Email sent successfully", { type, affiliateEmail: finalAffiliateEmail });

    return new Response(
      JSON.stringify({ success: true, message: `${type} email sent to ${finalAffiliateEmail}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logStep('Error sending email', { error: error instanceof Error ? error.message : 'Unknown' });
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
