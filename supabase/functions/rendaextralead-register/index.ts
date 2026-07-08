import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

import { sanitizeEmailSubject, htmlToPlainText } from "../_shared/email-encode.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (message: string, data?: any) => {
  console.log(`[RENDAEXTRALEAD-REGISTER] ${message}`, data ? JSON.stringify(data) : '');
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
      from: "Gabriel MRO <suporte@maisresultadosonline.com.br>",
      replyTo: "suporte@maisresultadosonline.com.br",
      to: to,
      subject: sanitizeEmailSubject(subject),
      content: htmlToPlainText(html),
      html: html,
      headers: {
        "List-Unsubscribe": "<mailto:suporte@maisresultadosonline.com.br?subject=unsubscribe>, <https://maisresultadosonline.com.br/unsubscribe>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        "X-Entity-Ref-ID": crypto.randomUUID(),
        "X-Mailer": "MRO-Mailer",
        "Precedence": "bulk",
      },
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

    // Insert lead into database
    const { data: lead, error: insertError } = await supabase
      .from("renda_extra_lead_leads")
      .insert({
        nome_completo: data.nome_completo,
        email: data.email,
        whatsapp: data.whatsapp,
        trabalha_atualmente: data.trabalha_atualmente,
        media_salarial: data.media_salarial,
        tipo_computador: data.tipo_computador,
        instagram_username: data.instagram_username,
        lead_source: data.lead_source === "social_midia" ? "social_midia" : "renda_extra",
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

    // Get settings for WhatsApp direct link
    const { data: settings } = await supabase
      .from("renda_extra_lead_settings")
      .select("whatsapp_number, whatsapp_message, whatsapp_group_link, launch_date, launch_date_enabled")
      .single();

    // Permanent short link — always redirects to the current WhatsApp number/message saved in /rendaextralead/admin.
    const SHORT_WHATSAPP_LINK = "https://maisresultadosonline.com.br/r/rxl-wa";
    const groupLink = (settings?.whatsapp_group_link || "").trim();
    const launchDateEnabled = !!settings?.launch_date_enabled;
    const launchDate = settings?.launch_date ? new Date(settings.launch_date).toLocaleDateString('pt-BR') : "21/01/2026";


    // Send confirmation email via SMTP — as Gabriel, with free class link + discount mention
    const freeClassLink = `https://maisresultadosonline.com.br/rendaextra/desconto?email=${encodeURIComponent(data.email)}`;
    const emailHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;line-height:1.6;color:#333;background-color:#f4f4f4;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;font-size:1px;line-height:1px;">Entre no grupo do WhatsApp para receber a aula da MRO.</div>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
<tr>
<td style="background:linear-gradient(135deg,#25D366 0%,#128C7E 100%);padding:30px;text-align:center;">
<div style="background:#000;color:#fff;display:inline-block;padding:10px 25px;border-radius:8px;font-size:32px;font-weight:bold;letter-spacing:2px;margin-bottom:10px;">MRO</div>
<h1 style="color:#fff;margin:15px 0 0 0;font-size:24px;">Entre no grupo do WhatsApp</h1>
</td>
</tr>
<tr>
<td style="padding:30px;background:#ffffff;">

<p style="margin:0 0 20px 0;font-size:16px;">Olá <strong>${data.nome_completo}</strong>,</p>

<p style="margin:0 0 20px 0;font-size:16px;line-height:1.6;">Aqui é o <strong>Gabriel</strong>! Para você receber a <strong>aula gratuita</strong>, entre agora no nosso grupo exclusivo do WhatsApp.</p>

<div style="background:#e8f5e9;border-left:4px solid #25D366;padding:15px 20px;margin:20px 0;border-radius:8px;">
<p style="margin:0;font-size:15px;color:#333;"><strong>💬 A aula será liberada em privado no grupo.</strong></p>
<p style="margin:8px 0 0 0;font-size:14px;color:#555;">Entre agora para não perder o aviso e receber materiais exclusivos.</p>
</div>

${groupLink ? `<div style="text-align:center;margin:30px 0;">
<a href="${groupLink}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:18px 48px;border-radius:30px;font-size:18px;font-weight:bold;font-family:Arial,sans-serif;">
PARTICIPAR DO GRUPO NO WHATSAPP
</a>
</div>` : `<p style="text-align:center;margin:20px 0;font-size:14px;color:#666;">Em instantes enviaremos o link do grupo por aqui.</p>`}

<p style="margin:20px 0 0 0;font-size:14px;color:#666;line-height:1.6;">Um abraço,<br/><strong>Gabriel — MRO</strong></p>

</td>
</tr>
<tr>
<td style="background:#1a1a1a;padding:20px;text-align:center;">
<p style="margin:0;color:#999;font-size:12px;">© 2026 MRO - Mais Resultados Online</p>
<p style="margin:10px 0 0 0;color:#666;font-size:11px;">Este email foi enviado porque você se cadastrou na página de Renda Extra.</p>
</td>
</tr>
</table>
</body>
</html>`;

    const emailSent = await sendEmailViaSMTP(
      data.email,
      "Entre no grupo do WhatsApp - Gabriel MRO",

      emailHtml
    );

    // Log email in database
    await supabase
      .from("renda_extra_lead_email_logs")
      .insert({
        lead_id: lead.id,
        email_to: data.email,
        email_type: "confirmacao",
        subject: sanitizeEmailSubject("Recebemos seu interesse! - MRO Renda Extra"),
        status: emailSent ? "sent" : "failed",
        error_message: emailSent ? null : "SMTP not configured or send failed",
      });

    // Update lead with email sent status
    if (emailSent) {
      await supabase
        .from("renda_extra_lead_leads")
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
        freeClassLink,
        whatsappGroupLink: SHORT_WHATSAPP_LINK,
        groupLink: groupLink || null,
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
