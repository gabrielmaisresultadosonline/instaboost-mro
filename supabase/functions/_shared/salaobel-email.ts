import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sanitizeEmailSubject, htmlToPlainText } from "./email-encode.ts";

export const buildSalaoBelEmail = (name: string, groupLink: string, aulaData: string) => `<!DOCTYPE html>
<html><body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#0a0a0a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px 0;">
<tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1f2937;">
    <tr><td style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:32px 24px;text-align:center;">
      <div style="display:inline-block;background:#000;color:#fff;padding:10px 22px;border-radius:10px;font-size:22px;font-weight:900;letter-spacing:2px;">MRO</div>
      <h1 style="color:#fff;font-size:26px;margin:18px 0 6px;font-weight:900;">🎉 Acesso Confirmado!</h1>
      <p style="color:#fef3c7;margin:0;font-size:15px;">Salão de beleza — aumente seus clientes sem investir em anúncios</p>
    </td></tr>
    <tr><td style="padding:32px 28px;color:#e5e7eb;">
      <p style="font-size:16px;margin:0 0 16px;">Olá <strong style="color:#fff;">${name}</strong>,</p>
      <p style="font-size:15px;line-height:1.6;color:#d1d5db;margin:0 0 20px;">
        Sua vaga está confirmada! No dia <strong style="color:#fbbf24;">${aulaData}</strong> vamos te mostrar, passo a passo, como a <strong style="color:#fff;">MRO</strong> ajuda salões de beleza a atrair mais clientes <strong>sem precisar investir em anúncios</strong>.
      </p>
      <div style="background:#0f172a;border-left:4px solid #fbbf24;padding:18px 20px;border-radius:10px;margin:20px 0;">
        <p style="margin:0;font-size:15px;color:#f1f5f9;line-height:1.6;">
          👉 <strong>Entre agora no grupo do WhatsApp</strong> — é lá que vamos apresentar tudo e tirar suas dúvidas.
        </p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${groupLink}" style="display:inline-block;padding:18px 44px;background:linear-gradient(135deg,#25d366 0%,#128c7e 100%);color:#fff;font-weight:900;text-decoration:none;border-radius:14px;font-size:16px;letter-spacing:1px;">📱 ENTRAR NO GRUPO DO WHATSAPP</a>
      </div>
      <p style="font-size:14px;color:#9ca3af;line-height:1.6;margin:20px 0 0;">
        Prepare-se: você vai descobrir uma estratégia simples e prática para encher a agenda do seu salão com clientes de verdade.
      </p>
      <p style="font-size:13px;color:#6b7280;margin:24px 0 0;text-align:center;">Nos vemos no grupo! 🚀</p>
    </td></tr>
    <tr><td style="background:#000;padding:18px;text-align:center;color:#6b7280;font-size:12px;">© 2026 MRO - Mais Resultados Online</td></tr>
  </table>
</td></tr></table>
</body></html>`;


export const sendSalaoBelEmail = async (
  to: string,
  name: string,
  groupLink: string,
  aulaData: string
): Promise<boolean> => {
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  if (!smtpPassword) {
    console.error("[SALAOBEL-EMAIL] SMTP_PASSWORD not set");
    return false;
  }

  const subject = sanitizeEmailSubject("🎉 Acesso confirmado! Entre no grupo da aula ao vivo");
  const html = buildSalaoBelEmail(name || "cliente", groupLink || "#", aulaData || "em breve");

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
      from: "Salão Bel <suporte@maisresultadosonline.com.br>",
      to,
      subject,
      content: htmlToPlainText(html),
      html,
    });
    await client.close();

    if (supabase) {
      await supabase.from("salaobel_email_logs").insert({
        email_to: to, email_type: "acesso_liberado", subject, status: "sent",
      });
    }
    return true;
  } catch (e) {
    const errorMsg = String(e);
    console.error("[SALAOBEL-EMAIL] Error:", errorMsg);
    if (supabase) {
      await supabase.from("salaobel_email_logs").insert({
        email_to: to, email_type: "acesso_liberado", subject, status: "error", error_message: errorMsg,
      });
    }
    return false;
  }
};
