import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sanitizeEmailSubject, htmlToPlainText } from "./email-encode.ts";

const WHATSAPP_URL = "https://wa.me/555192835863?text=" + encodeURIComponent("Vim pelo site, gostaria de saber mais !");

export const buildLocalVppEmail = (name: string, _groupLink?: string) => `<!DOCTYPE html>
<html><body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#0a0a0a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px 0;">
<tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1f2937;">
    <tr><td style="background:linear-gradient(135deg,#facc15 0%,#eab308 100%);padding:32px 24px;text-align:center;">
      <div style="display:inline-block;background:#000;color:#facc15;padding:10px 22px;border-radius:10px;font-size:22px;font-weight:900;letter-spacing:2px;">MRO</div>
      <h1 style="color:#000;font-size:26px;margin:18px 0 6px;font-weight:900;">Entre em contato conosco no WhatsApp!</h1>
      <p style="color:#1f2937;margin:0;font-size:15px;font-weight:600;">Vamos te mostrar como vender mais sem gastar com anúncios</p>
    </td></tr>
    <tr><td style="padding:32px 28px;color:#e5e7eb;">
      <p style="font-size:16px;margin:0 0 16px;">Olá <strong style="color:#fff;">${name}</strong>,</p>
      <p style="font-size:15px;line-height:1.6;color:#d1d5db;margin:0 0 20px;">
        Recebemos seu cadastro! Aprenda como a <strong style="color:#facc15;">MRO</strong> pode te ajudar a
        <strong style="color:#fff;">vender mais</strong>, ter <strong style="color:#fff;">mais clientes</strong> e
        <strong style="color:#fff;">mais engajamento</strong> — sem precisar investir em anúncios.
      </p>

      <div style="background:#0f172a;border-left:4px solid #facc15;padding:18px 20px;border-radius:10px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#cbd5e1;line-height:1.7;">
          Já ajudamos <strong style="color:#facc15;">mais de 1.800 empresas</strong> a crescer com esse método.
          Clique no botão abaixo e fale com nosso time agora mesmo.
        </p>
      </div>

      <div style="text-align:center;margin:28px 0;">
        <a href="${WHATSAPP_URL}" style="display:inline-block;padding:18px 44px;background:linear-gradient(135deg,#25d366 0%,#128c7e 100%);color:#fff;font-weight:900;text-decoration:none;border-radius:14px;font-size:16px;letter-spacing:1px;">📱 FALAR NO WHATSAPP AGORA</a>
      </div>

      <p style="font-size:13px;color:#6b7280;margin:24px 0 0;text-align:center;">Estamos te esperando! 🚀</p>
    </td></tr>
    <tr><td style="background:#000;padding:18px;text-align:center;color:#6b7280;font-size:12px;">© 2026 MRO - Mais Resultados Online</td></tr>
  </table>
</td></tr></table>
</body></html>`;

export const sendLocalVppEmail = async (
  to: string,
  name: string,
  _groupLink?: string,
  _aulaData?: string
): Promise<boolean> => {
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  if (!smtpPassword) {
    console.error("[LOCALVPP-EMAIL] SMTP_PASSWORD not set");
    return false;
  }

  const subject = sanitizeEmailSubject("MRO - Entre em contato conosco no WhatsApp!");
  const html = buildLocalVppEmail(name || "cliente");

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
      await supabase.from("localvpp_email_logs").insert({
        email_to: to, email_type: "contato_whatsapp", subject, status: "sent",
      });
    }
    return true;
  } catch (e) {
    const errorMsg = String(e);
    console.error("[LOCALVPP-EMAIL] Error:", errorMsg);
    if (supabase) {
      await supabase.from("localvpp_email_logs").insert({
        email_to: to, email_type: "contato_whatsapp", subject, status: "error", error_message: errorMsg,
      });
    }
    return false;
  }
};
