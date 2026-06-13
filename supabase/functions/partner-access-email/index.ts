import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, slug, password, origin } = await req.json();

    if (!email || !slug) {
      return new Response(
        JSON.stringify({ success: false, error: "Email e slug são obrigatórios" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const baseUrl = origin || "https://maisresultadosonline.com.br";
    const promoLink = `${baseUrl}/promo/${slug}`;
    const rendaExtraLink = `${baseUrl}/promorendaextra/${slug}`;
    const resumoLink = `${baseUrl}/dash/${slug}`;

    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    if (!smtpPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "SMTP não configurado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
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

    const subject = `🎉 Seus acessos de afiliado MRO - ${name || "Parceiro"}`;
    const partnerName = name || "Parceiro";

    const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#1a1a1a;color:#fff;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#1a1a1a;">
<tr><td style="background:linear-gradient(135deg,#1a1a1a,#2d2d2d);padding:40px 30px;text-align:center;border-bottom:3px solid #FFD700;">
<div style="background:#000;color:#FFD700;display:inline-block;padding:15px 35px;border-radius:12px;font-size:32px;font-weight:bold;letter-spacing:3px;border:2px solid #FFD700;">MRO</div>
<h1 style="color:#fff;margin:20px 0 0 0;font-size:28px;">🎉 Bem-vindo(a), ${partnerName}!</h1>
<p style="color:#FFD700;margin:10px 0 0 0;font-size:14px;font-weight:bold;">SEUS ACESSOS DE AFILIADO</p>
</td></tr>

<tr><td style="padding:30px;background:#1a1a1a;">

<div style="background:linear-gradient(135deg,#FFD700,#FFA500);padding:25px;border-radius:15px;margin-bottom:25px;text-align:center;">
<p style="margin:0;color:#000;font-size:18px;font-weight:bold;">🤝 Parceria confirmada!</p>
<p style="margin:10px 0 0 0;color:#000;font-size:14px;">Aqui estão todos os seus links e acessos.</p>
</div>

<!-- LINKS DE DIVULGAÇÃO -->
<div style="background:#2d2d2d;border:2px solid #10b981;border-radius:15px;padding:25px;margin-bottom:25px;">
<h2 style="color:#10b981;margin:0 0 20px 0;font-size:18px;">🔗 Seus Links de Divulgação</h2>

<p style="margin:0 0 8px 0;color:#FFD700;font-size:13px;font-weight:bold;">📱 Instagram Nova (Ferramenta MRO):</p>
<div style="background:#000;padding:12px 15px;border-radius:8px;margin-bottom:18px;word-break:break-all;">
<a href="${promoLink}" style="color:#10b981;font-family:monospace;font-size:13px;text-decoration:none;">${promoLink}</a>
</div>

<p style="margin:0 0 8px 0;color:#FFD700;font-size:13px;font-weight:bold;">💸 Renda Extra:</p>
<div style="background:#000;padding:12px 15px;border-radius:8px;word-break:break-all;">
<a href="${rendaExtraLink}" style="color:#10b981;font-family:monospace;font-size:13px;text-decoration:none;">${rendaExtraLink}</a>
</div>

<p style="margin:18px 0 0 0;color:#9ca3af;font-size:12px;">Use estes links em suas divulgações. Toda venda feita por eles gera comissão para você!</p>
</div>

<!-- PAINEL DE RESUMO -->
<div style="background:#2d2d2d;border:2px solid #FFD700;border-radius:15px;padding:25px;margin-bottom:25px;">
<h2 style="color:#FFD700;margin:0 0 15px 0;font-size:18px;">📊 Seu Painel de Resumo (Tempo Real)</h2>
<p style="margin:0 0 15px 0;color:#fff;font-size:14px;line-height:1.7;">
Acompanhe em tempo real <strong style="color:#FFD700;">todas as tentativas de compra</strong>, <strong style="color:#10b981;">todas as vendas aprovadas</strong> e <strong style="color:#FFD700;">comissões a receber</strong>.
</p>

<p style="margin:15px 0 8px 0;color:#FFD700;font-size:13px;font-weight:bold;">🔗 Link do Painel:</p>
<div style="background:#000;padding:12px 15px;border-radius:8px;margin-bottom:15px;word-break:break-all;">
<a href="${resumoLink}" style="color:#10b981;font-family:monospace;font-size:13px;text-decoration:none;">${resumoLink}</a>
</div>

${password ? `
<p style="margin:15px 0 8px 0;color:#FFD700;font-size:13px;font-weight:bold;">🔑 Sua Senha de Acesso:</p>
<div style="background:#000;padding:15px 20px;border-radius:8px;text-align:center;border:1px dashed #FFD700;">
<span style="color:#FFD700;font-family:monospace;font-size:20px;font-weight:bold;letter-spacing:2px;">${password}</span>
</div>
<p style="margin:12px 0 0 0;color:#9ca3af;font-size:12px;">Guarde esta senha em local seguro. Ela é necessária para acessar seu painel.</p>
` : ""}
</div>

<!-- O QUE VOCÊ VAI VER -->
<div style="background:#2d2d2d;border-left:4px solid #10b981;padding:20px;border-radius:0 12px 12px 0;margin-bottom:25px;">
<p style="margin:0 0 12px 0;color:#10b981;font-size:15px;font-weight:bold;">✨ No painel você acompanha:</p>
<ul style="margin:0;padding-left:20px;color:#fff;font-size:14px;line-height:1.9;">
<li>📈 Todas as <strong>tentativas de compra</strong> dos seus leads</li>
<li>✅ Todas as <strong>vendas aprovadas</strong> com nome e email do cliente</li>
<li>💰 Total de <strong>comissões a receber</strong> em tempo real</li>
<li>🎯 Histórico completo e atualizado automaticamente</li>
</ul>
</div>

<!-- CTA -->
<div style="text-align:center;margin:30px 0;">
<a href="${resumoLink}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;">📊 Acessar Meu Painel</a>
</div>

<div style="text-align:center;padding:25px 0 10px 0;border-top:2px solid #4b5563;margin-top:20px;">
<p style="margin:0;color:#fff;font-size:16px;">Vamos pra cima! 🚀</p>
<p style="margin:15px 0 0 0;color:#9ca3af;font-size:14px;">Atenciosamente,</p>
<p style="margin:5px 0 0 0;color:#FFD700;font-size:20px;font-weight:bold;">Gabriel - MRO</p>
</div>

</td></tr>

<tr><td style="background:#000;padding:20px;text-align:center;border-top:3px solid #FFD700;">
<p style="color:#FFD700;margin:0 0 5px 0;font-weight:bold;">MRO - Programa de Afiliados 💛</p>
<p style="color:#6b7280;margin:0;font-size:12px;">© ${new Date().getFullYear()} MRO - Mais Resultados Online</p>
</td></tr>
</table></body></html>`;

    await client.send({
      from: "MRO Afiliados <suporte@maisresultadosonline.com.br>",
      to: email,
      subject,
      html: htmlContent,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[PARTNER-ACCESS-EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
