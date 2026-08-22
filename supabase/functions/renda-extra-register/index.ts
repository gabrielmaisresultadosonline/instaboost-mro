import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

import { sanitizeEmailSubject, htmlToPlainText } from "../_shared/email-encode.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (message: string, data?: any) => {
  console.log(`[RENDA-EXTRA-REGISTER] ${message}`, data ? JSON.stringify(data) : '');
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
      from: "MRO Renda Extra <suporte@maisresultadosonline.com.br>",
      to: to,
      subject: sanitizeEmailSubject(subject),
      content: htmlToPlainText(html),
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const data = await req.json();
    log("Registration request received", { email: data.email, nome: data.nome_completo });

    // Fetch dynamic WhatsApp group link
    const { data: settings } = await supabase
      .from("renda_extra_v2_settings")
      .select("whatsapp_group_link")
      .limit(1)
      .single();
    
    const groupLink = settings?.whatsapp_group_link || "https://maisresultadosonline.com.br/grupo-rendaextra";

    // Insert lead into database
    const { data: lead, error: insertError } = await supabase
      .from("renda_extra_leads")
      .insert({
        nome_completo: data.nome_completo,
        email: data.email,
        whatsapp: data.whatsapp,
        trabalha_atualmente: data.trabalha_atualmente,
        media_salarial: data.media_salarial,
        tipo_computador: data.tipo_computador,
        instagram_username: data.instagram_username,
      })
      .select()
      .single();

    if (insertError) {
      log("Error inserting lead", { error: insertError });
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    log("Lead inserted successfully", { leadId: lead.id });

    const RENDDX_URL = "https://maisresultadosonline.com.br/renddx";

    // Send confirmation email via SMTP
    const emailHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;line-height:1.6;color:#333;background-color:#f4f4f4;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-collapse:collapse;">
<tr>
<td style="background:linear-gradient(135deg,#FFD700 0%,#FFA500 100%);padding:40px 20px;text-align:center;">
<div style="background:#000;color:#fff;display:inline-block;padding:12px 30px;border-radius:8px;font-size:32px;font-weight:bold;letter-spacing:2px;margin-bottom:15px;font-family:Arial,sans-serif;">MRO</div>
<h1 style="color:#000;margin:0;font-size:26px;font-family:Arial,sans-serif;">🔥 Oportunidade Única Liberada!</h1>
</td>
</tr>
<tr>
<td style="padding:40px 30px;background:#ffffff;">

<div style="background:#f0fff4;border:1px solid #c6f6d5;padding:25px;border-radius:12px;margin-bottom:30px;text-align:center;">
<p style="margin:0;color:#2f855a;font-size:18px;font-weight:bold;font-family:Arial,sans-serif;">✨ Parabéns por dar o primeiro passo!</p>
</div>

<p style="margin:0 0 20px 0;font-size:16px;font-family:Arial,sans-serif;">Olá <strong>${data.nome_completo}</strong>!</p>

<p style="margin:0 0 25px 0;font-size:17px;line-height:1.6;font-family:Arial,sans-serif;">
Você recebeu uma <strong>oportunidade de renda extra real</strong>, e o valor disponível é irrisório perto do resultado que você pode alcançar.
</p>

<div style="background:#fffaf0;border-left:5px solid #ed8936;padding:20px;margin:30px 0;border-radius:0 10px 10px 0;">
<p style="margin:0;font-size:16px;font-weight:bold;color:#7b341e;font-family:Arial,sans-serif;">⚡ Aproveite enquanto duram nossas vagas!</p>
</div>

<div style="text-align:center;margin:40px 0;">
<a href="${groupLink}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:20px 45px;border-radius:50px;font-size:18px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">
PARTICIPE DO GRUPO GRÁTIS AGORA!
</a>
</div>

<div style="background:#e6fffa;border:1px solid #38b2ac;padding:20px;margin:30px 0;border-radius:12px;text-align:center;">
<p style="margin:0 0 15px 0;font-size:16px;font-weight:bold;color:#234e52;font-family:Arial,sans-serif;">🚀 Entre no grupo oficial abaixo:</p>
<a href="${groupLink}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:15px 30px;border-radius:30px;font-size:16px;font-weight:bold;font-family:Arial,sans-serif;">
📲 PARTICIPE DO GRUPO DO WHATSAPP
</a>
</div>

<p style="margin:30px 0 0 0;font-size:14px;color:#718096;text-align:center;font-family:Arial,sans-serif;">
Clique no botão acima para acessar os detalhes agora mesmo.
</p>

</td>
</tr>
<tr>
<td style="background:#1a202c;padding:30px;text-align:center;">
<p style="margin:0;color:#a0aec0;font-size:12px;font-family:Arial,sans-serif;">© 2026 MRO - Mais Resultados Online</p>
<p style="margin:10px 0 0 0;color:#718096;font-size:11px;font-family:Arial,sans-serif;">Este email foi enviado porque você demonstrou interesse em nossas soluções de renda extra.</p>
</td>
</tr>
</table>
</body>
</html>`;

    const emailSent = await sendEmailViaSMTP(
      data.email,
      "🔥 Oportunidade Única de Renda Extra liberada!",
      emailHtml
    );

    // Log email in database
    await supabase
      .from("renda_extra_email_logs")
      .insert({
        lead_id: lead.id,
        email_to: data.email,
        email_type: "confirmacao",
        subject: sanitizeEmailSubject("🔥 Oportunidade Única de Renda Extra liberada!"),
        status: emailSent ? "sent" : "failed",
        error_message: emailSent ? null : "SMTP not configured or send failed",
      });

    // Update lead with email sent status
    if (emailSent) {
      await supabase
        .from("renda_extra_leads")
        .update({
          email_confirmacao_enviado: true,
          email_confirmacao_enviado_at: new Date().toISOString(),
        })
        .eq("id", lead.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        leadId: lead.id,
        redirectUrl: RENDDX_URL,
        groupLink,
        emailSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log("Error processing registration", { error: errMsg });
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});