import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sanitizeEmailSubject, htmlToPlainText } from "./email-encode.ts";

/**
 * Builds the HTML content for the Renddx Welcome Email.
 * Focuses on Member Area (/dashboard), Support number, and Credentials.
 * No WhatsApp group link.
 */
export const buildRenddxWelcomeEmail = (name: string, username: string, password_plain: string) => `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;line-height:1.6;color:#333;background-color:#f4f4f4;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
<tr>
<td style="background:linear-gradient(135deg,#FFD700 0%,#FFA500 100%);padding:30px;text-align:center;">
<div style="background:#000;color:#fff;display:inline-block;padding:10px 25px;border-radius:8px;font-size:32px;font-weight:bold;letter-spacing:2px;margin-bottom:10px;">MRO</div>
<h1 style="color:#000;margin:15px 0 0 0;font-size:24px;">🎉 Acesso Liberado!</h1>
</td>
</tr>
<tr>
<td style="padding:30px;background:#ffffff;">

<div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:20px;border-radius:10px;margin-bottom:25px;text-align:center;">
<p style="margin:0;color:#fff;font-size:18px;font-weight:bold;">✨ Sua ferramenta está pronta para uso!</p>
</div>

<p style="margin:0 0 20px 0;font-size:16px;">Olá <strong>${name}</strong>!</p>
<p style="margin:0 0 15px 0;font-size:16px;">Reconhecemos seu pagamento e seu acesso à ferramenta <strong>MRO</strong> já está ativo! 🚀</p>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:2px solid #FFD700;border-radius:10px;margin:20px 0;">
<tr>
<td style="padding:20px;">
<h3 style="color:#333;margin:0 0 15px 0;font-size:16px;">📋 Seus Dados de Acesso:</h3>
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:12px;background:#f8f9fa;border-radius:5px;margin-bottom:10px;">
<span style="font-size:12px;color:#666;display:block;">Usuário:</span>
<span style="font-size:18px;color:#000;font-family:monospace;font-weight:bold;">${username}</span>
</td>
</tr>
<tr>
<td style="padding:12px;background:#f8f9fa;border-radius:5px;">
<span style="font-size:12px;color:#666;display:block;">Senha:</span>
<span style="font-size:18px;color:#000;font-family:monospace;font-weight:bold;">${password_plain}</span>
</td>
</tr>
</table>
</td>
</tr>
</table>

<div style="background:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin:20px 0;border-radius:0 8px 8px 0;">
<p style="margin:0;color:#856404;font-size:15px;"><strong>💡 Importante:</strong> Guarde seus dados. Você usará eles para acessar sua área de membros e configurar a ferramenta.</p>
</div>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:10px;margin:20px 0;">
<tr>
<td style="padding:20px;">
<h3 style="color:#333;margin:0 0 15px 0;font-size:16px;">📝 Como começar:</h3>
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:10px 0;border-bottom:1px solid #e0e0e0;"><span style="display:inline-block;background:#FFD700;color:#000;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-weight:bold;margin-right:10px;">1</span><span style="color:#333;">Acesse o <strong>Dashboard</strong></span></td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid #e0e0e0;"><span style="display:inline-block;background:#FFD700;color:#000;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-weight:bold;margin-right:10px;">2</span><span style="color:#333;">Configure suas contas</span></td></tr>
<tr><td style="padding:10px 0;"><span style="display:inline-block;background:#FFD700;color:#000;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-weight:bold;margin-right:10px;">3</span><span style="color:#333;">Deixe a ferramenta rodar!</span></td></tr>
</table>
</td>
</tr>
</table>

<!-- CTA Buttons -->
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="text-align:center;padding:20px 0 10px 0;">
<a href="https://maisresultadosonline.com.br/dashboard" style="display:inline-block;background:linear-gradient(135deg,#FFD700 0%,#FFA500 100%);color:#000;text-decoration:none;padding:18px 45px;border-radius:8px;font-weight:bold;font-size:18px;box-shadow: 0 4px 6px rgba(0,0,0,0.1);">🚀 ACESSAR DASHBOARD AGORA</a>
</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
<tr>
<td style="text-align:center;padding:12px;background:#25D366;border-radius:8px;">
<a href="https://maisresultadosonline.com.br/whatsapp" style="color:#fff;text-decoration:none;font-weight:bold;font-size:16px;">📱 Suporte via WhatsApp</a>
</td>
</tr>
</table>

</td>
</tr>
<tr>
<td style="background:#1a1a1a;padding:20px;text-align:center;">
<p style="color:#FFD700;margin:0 0 10px 0;font-weight:bold;">Boas vendas com MRO! 💛</p>
<p style="color:#888;margin:0;font-size:12px;">© ${new Date().getFullYear()} MRO - Mais Resultados Online</p>
</td>
</tr>
</table>
</body>
</html>`;

export const sendRenddxWelcomeEmail = async (to: string, name: string, username: string, password_plain: string): Promise<boolean> => {
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = (supabaseUrl && supabaseKey) 
    ? createClient(supabaseUrl, supabaseKey)
    : null;

  if (!smtpPassword) {
    console.error("[RENDDX-EMAIL] SMTP_PASSWORD not set");
    return false;
  }
  
  const html = buildRenddxWelcomeEmail(name, username, password_plain);
  const subject = sanitizeEmailSubject("🎉 Seu acesso à MRO está liberado! Veja seus dados");

  try {
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.hostinger.com",
        port: 465,
        tls: true,
        auth: { username: "suporte@maisresultadosonline.com.br", password: smtpPassword },
      },
    });
    
    await client.send({
      from: "MRO <suporte@maisresultadosonline.com.br>",
      to,
      subject,
      content: htmlToPlainText(html),
      html,
    });
    
    await client.close();

    if (supabase) {
      await supabase.from("rendaext_email_logs").insert({
        email_to: to,
        email_type: "renddx_welcome",
        subject,
        status: "sent"
      });
    }

    return true;
  } catch (e) {
    const errorMsg = String(e);
    console.error("[RENDDX-EMAIL] Error sending email:", errorMsg);
    
    if (supabase) {
      await supabase.from("rendaext_email_logs").insert({
        email_to: to,
        email_type: "renddx_welcome",
        subject,
        status: "error",
        error_message: errorMsg
      });
    }

    return false;
  }
};
