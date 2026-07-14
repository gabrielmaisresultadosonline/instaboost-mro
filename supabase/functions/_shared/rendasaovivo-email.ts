import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sanitizeEmailSubject, htmlToPlainText } from "./email-encode.ts";

export const buildRendaSaoVivoEmail = (name: string, groupLink: string, aulaData: string) => `<!DOCTYPE html>
<html><body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#0a0a0a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px 0;">
<tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1f2937;">
    <tr><td style="background:linear-gradient(135deg,#16a34a 0%,#059669 100%);padding:32px 24px;text-align:center;">
      <div style="display:inline-block;background:#000;color:#fff;padding:10px 22px;border-radius:10px;font-size:22px;font-weight:900;letter-spacing:2px;">MRO</div>
      <h1 style="color:#fff;font-size:26px;margin:18px 0 6px;font-weight:900;">🎉 Pagamento Confirmado!</h1>
      <p style="color:#dcfce7;margin:0;font-size:15px;">Seu acesso à aula ao vivo está garantido</p>
    </td></tr>
    <tr><td style="padding:32px 28px;color:#e5e7eb;">
      <p style="font-size:16px;margin:0 0 16px;">Olá <strong style="color:#fff;">${name}</strong>,</p>
      <p style="font-size:15px;line-height:1.6;color:#d1d5db;margin:0 0 20px;">
        Bem-vindo(a) à <strong style="color:#4ade80;">Renda Ao Vivo</strong>! Sua vaga na aula do dia <strong style="color:#fff;">${aulaData}</strong> está confirmada.
      </p>
      <div style="background:#0f172a;border-left:4px solid #4ade80;padding:18px 20px;border-radius:10px;margin:20px 0;">
        <p style="margin:0;font-size:15px;color:#f1f5f9;line-height:1.6;">
          👉 <strong>Entre agora no grupo do WhatsApp</strong> para receber o link da transmissão e não perder nada.
        </p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${groupLink}" style="display:inline-block;padding:18px 44px;background:linear-gradient(135deg,#25d366 0%,#128c7e 100%);color:#fff;font-weight:900;text-decoration:none;border-radius:14px;font-size:16px;letter-spacing:1px;">📱 ENTRAR NO GRUPO DO WHATSAPP</a>
      </div>
      <p style="font-size:14px;color:#9ca3af;line-height:1.6;margin:20px 0 0;">
        Fique ligado, você vai conhecer uma <strong style="color:#fbbf24;">novidade nunca vista antes</strong> e muito fácil de aplicar em casa. Prepare-se para transformar seu resultado.
      </p>
      <p style="font-size:13px;color:#6b7280;margin:24px 0 0;text-align:center;">Nos vemos na aula ao vivo! 🚀</p>
    </td></tr>
    <tr><td style="background:#000;padding:18px;text-align:center;color:#6b7280;font-size:12px;">© 2026 MRO - Mais Resultados Online</td></tr>
  </table>
</td></tr></table>
</body></html>`;

export const sendRendaSaoVivoEmail = async (
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
    console.error("[RENDASAOVIVO-EMAIL] SMTP_PASSWORD not set");
    return false;
  }

  const subject = sanitizeEmailSubject("🎉 Acesso confirmado! Entre no grupo da aula ao vivo");
  const html = buildRendaSaoVivoEmail(name || "cliente", groupLink || "#", aulaData || "em breve");

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
      from: "MRO Ao Vivo <suporte@maisresultadosonline.com.br>",
      to,
      subject,
      content: htmlToPlainText(html),
      html,
    });
    await client.close();

    if (supabase) {
      await supabase.from("rendasaovivo_email_logs").insert({
        email_to: to, email_type: "acesso_liberado", subject, status: "sent",
      });
    }
    return true;
  } catch (e) {
    const errorMsg = String(e);
    console.error("[RENDASAOVIVO-EMAIL] Error:", errorMsg);
    if (supabase) {
      await supabase.from("rendasaovivo_email_logs").insert({
        email_to: to, email_type: "acesso_liberado", subject, status: "error", error_message: errorMsg,
      });
    }
    return false;
  }
};

export const buildRemarketingEmail = (name: string, checkoutLink: string) => `<!DOCTYPE html>
<html><body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#0a0a0a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px 0;">
<tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1f2937;">
    <tr><td style="background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);padding:32px 24px;text-align:center;">
      <div style="display:inline-block;background:#000;color:#fff;padding:10px 22px;border-radius:10px;font-size:22px;font-weight:900;letter-spacing:2px;">MRO</div>
      <h1 style="color:#fff;font-size:26px;margin:18px 0 6px;font-weight:900;">Por R$10 você vai deixar de faturar 5K mensais?</h1>
      <p style="color:#fecaca;margin:0;font-size:15px;">Não perca essa oportunidade por tão pouco</p>
    </td></tr>
    <tr><td style="padding:32px 28px;color:#e5e7eb;">
      <p style="font-size:16px;margin:0 0 16px;">Olá <strong style="color:#fff;">${name}</strong>,</p>
      <p style="font-size:15px;line-height:1.7;color:#d1d5db;margin:0 0 18px;">
        Você chegou perto, mas não finalizou sua entrada no grupo. Aqui vai a real:
      </p>
      <div style="background:#0f172a;border-left:4px solid #ef4444;padding:18px 20px;border-radius:10px;margin:20px 0;">
        <p style="margin:0 0 10px;font-size:16px;color:#fff;font-weight:700;">
          Por causa de R$10, você vai deixar de faturar R$5.000 por mês?
        </p>
        <p style="margin:0;font-size:14px;color:#cbd5e1;line-height:1.6;">
          Aprenda agora, de uma vez por todas, o método que já está mudando o resultado de várias pessoas com a ferramenta MRO.
        </p>
      </div>
      <p style="font-size:15px;line-height:1.7;color:#d1d5db;margin:0 0 14px;">
        <strong style="color:#fff;">Participe do grupo</strong> e tire todas as suas dúvidas sobre o método.
        Depois, <strong style="color:#fff;">você mesmo decide</strong> se vai aplicar ou não. Sem enrolação.
      </p>
      <p style="font-size:15px;line-height:1.7;color:#d1d5db;margin:0 0 14px;">
        Lembrando: isso <strong style="color:#fbbf24;">não é para qualquer um</strong>. Muitos não vão querer investir nem R$10 para aprender — e acabam se perdendo. <strong style="color:#fff;">Não seja um desses.</strong>
      </p>
      <p style="font-size:15px;line-height:1.7;color:#d1d5db;margin:0 0 22px;">
        Mude seu futuro. Se você ainda não está faturando seus R$5 mil por mês, <strong style="color:#4ade80;">isso é para você</strong>.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${checkoutLink}" style="display:inline-block;padding:18px 44px;background:linear-gradient(135deg,#16a34a 0%,#059669 100%);color:#fff;font-weight:900;text-decoration:none;border-radius:14px;font-size:16px;letter-spacing:1px;">🚀 GARANTIR MINHA VAGA AGORA</a>
      </div>
      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:16px 0 0;line-height:1.6;">
        R$10 hoje pode ser o divisor de águas do seu próximo mês.
      </p>
    </td></tr>
    <tr><td style="background:#000;padding:18px;text-align:center;color:#6b7280;font-size:12px;">© 2026 MRO - Mais Resultados Online</td></tr>
  </table>
</td></tr></table>
</body></html>`;

export const sendRemarketingEmail = async (
  to: string,
  name: string,
  checkoutLink: string,
): Promise<boolean> => {
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  if (!smtpPassword) {
    console.error("[RENDASAOVIVO-REMARKETING] SMTP_PASSWORD not set");
    return false;
  }

  const subject = sanitizeEmailSubject("Por R$10 você vai deixar de faturar 5K mensais?");
  const html = buildRemarketingEmail(name || "amigo(a)", checkoutLink || "https://maisresultadosonline.com.br/rendasaovivo");

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
      from: "MRO Ao Vivo <suporte@maisresultadosonline.com.br>",
      to,
      subject,
      content: htmlToPlainText(html),
      html,
    });
    await client.close();

    if (supabase) {
      await supabase.from("rendasaovivo_email_logs").insert({
        email_to: to, email_type: "remarketing", subject, status: "sent",
      });
    }
    return true;
  } catch (e) {
    const errorMsg = String(e);
    console.error("[RENDASAOVIVO-REMARKETING] Error:", errorMsg);
    if (supabase) {
      await supabase.from("rendasaovivo_email_logs").insert({
        email_to: to, email_type: "remarketing", subject, status: "error", error_message: errorMsg,
      });
    }
    return false;
  }
};
