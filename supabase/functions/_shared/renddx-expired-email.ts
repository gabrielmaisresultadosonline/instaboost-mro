import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

/**
 * E-mail de aviso de expiração do plano de 30 dias (/renddx).
 *
 * O HTML é construído com tabelas e estilos inline (sem <style>, sem flex/grid,
 * sem media queries obrigatórias) para renderizar corretamente em Gmail, Outlook,
 * Apple Mail, Yahoo e clientes mobile — evitando quebra de layout/CSS.
 */

export const RENDDX_WHATSAPP_NUMBER = "555192835863";
export const RENDDX_WHATSAPP_MESSAGE =
  "Olá vim pelo renda extra, já usei 30 dias gostaria de saber sobre o desconto.";

export const renddxWhatsAppLink = () =>
  `https://wa.me/${RENDDX_WHATSAPP_NUMBER}?text=${encodeURIComponent(RENDDX_WHATSAPP_MESSAGE)}`;

export const buildRenddxExpiredEmail = (name: string, username: string) => {
  const waLink = renddxWhatsAppLink();
  const safeName = (name || "Cliente").trim();
  const safeUser = (username || "").trim();

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Seu acesso expirou</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:24px 12px;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:10px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">

<tr>
<td align="center" style="background-color:#111111;padding:28px 20px;">
<table cellpadding="0" cellspacing="0" border="0" align="center">
<tr><td style="background-color:#FFD700;color:#111111;padding:8px 18px;border-radius:6px;font-size:24px;font-weight:bold;letter-spacing:2px;font-family:Arial,Helvetica,sans-serif;">MRO</td></tr>
</table>
<p style="margin:16px 0 0 0;color:#ffffff;font-size:20px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">Seu acesso expirou</p>
</td>
</tr>

<tr>
<td style="padding:28px 24px;">

<p style="margin:0 0 16px 0;font-size:16px;color:#333333;line-height:24px;">Olá <strong>${safeName}</strong>,</p>

<p style="margin:0 0 16px 0;font-size:16px;color:#333333;line-height:24px;">
O seu plano de <strong>30 dias</strong> da Ferramenta MRO chegou ao fim. A partir de agora o login
${safeUser ? `<strong>${safeUser}</strong> ` : ""}não tem mais permissão de uso na ferramenta e no painel de membros.
</p>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">
<tr>
<td style="background-color:#fff4e5;border-left:4px solid #f59e0b;padding:14px 16px;">
<p style="margin:0;font-size:15px;color:#7c4a03;line-height:22px;">
Para continuar utilizando normalmente, é necessário contratar um novo plano. Fale com a nossa equipe pelo WhatsApp e confira as condições disponíveis para você.
</p>
</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">
<tr>
<td align="center">
<a href="${waLink}" target="_blank" style="display:inline-block;background-color:#25D366;color:#ffffff;text-decoration:none;padding:16px 28px;border-radius:8px;font-size:16px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">FALAR NO WHATSAPP</a>
</td>
</tr>
</table>

<p style="margin:0 0 8px 0;font-size:14px;color:#666666;line-height:22px;text-align:center;">
Ou copie e cole este link no navegador:
</p>
<p style="margin:0 0 20px 0;font-size:13px;color:#0f766e;line-height:20px;text-align:center;word-break:break-all;">
<a href="${waLink}" target="_blank" style="color:#0f766e;text-decoration:underline;">${waLink}</a>
</p>

<p style="margin:0;font-size:14px;color:#666666;line-height:22px;">
Obrigado por ter usado a Ferramenta MRO nesses 30 dias. Estamos à disposição para te ajudar a continuar.
</p>

</td>
</tr>

<tr>
<td align="center" style="background-color:#111111;padding:20px;">
<p style="margin:0 0 6px 0;color:#FFD700;font-size:13px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">MRO - Mais Resultados Online</p>
<p style="margin:0;color:#888888;font-size:11px;font-family:Arial,Helvetica,sans-serif;">Você recebeu este e-mail porque possui um cadastro na Ferramenta MRO.</p>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>`;
};

export const buildRenddxExpiredText = (name: string) =>
  `Ola ${name || "Cliente"},\n\nSeu plano de 30 dias da Ferramenta MRO expirou e o acesso foi bloqueado.\n` +
  `Para contratar um novo plano, fale com a nossa equipe no WhatsApp: ${renddxWhatsAppLink()}\n\nMRO - Mais Resultados Online`;

/** Envia o aviso de expiração. Retorna true quando o SMTP aceita a mensagem. */
export async function sendRenddxExpiredEmail(
  to: string,
  name: string,
  username: string,
): Promise<boolean> {
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  if (!smtpPassword || !to || !to.includes("@")) return false;

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
      from: "MRO - Mais Resultados Online <suporte@maisresultadosonline.com.br>",
      to,
      subject: "Seu acesso de 30 dias expirou - renove agora",
      content: buildRenddxExpiredText(name),
      html: buildRenddxExpiredEmail(name, username),
    });

    await client.close();
    return true;
  } catch (error) {
    console.error("[RENDDX-EXPIRED-EMAIL] send error", String(error));
    return false;
  }
}
