import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { sanitizeEmailSubject, htmlToPlainText } from "../_shared/email-encode.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DASHBOARD_URL = "https://maisresultadosonline.com.br/dashboard";
const SUPPORT_WHATSAPP = "https://maisresultadosonline.com.br/whatsapp";

interface AccountItem {
  tool?: string;
  username?: string;
  password?: string;
}

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (d: unknown, status = 200) =>
    new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const primaryUsername = String(body.primaryUsername || "").trim();
    const primaryPassword = String(body.primaryPassword || "").trim();
    const accounts: AccountItem[] = Array.isArray(body.accounts) ? body.accounts.slice(0, 20) : [];

    if (!email.includes("@") || !primaryPassword) {
      return json({ success: false, error: "Dados insuficientes para enviar o e-mail" }, 400);
    }

    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    if (!smtpPassword) return json({ success: false, error: "SMTP não configurado" }, 500);

    const rows = accounts
      .map(
        (a) => `
      <tr>
        <td style="padding:14px 16px;border-bottom:1px solid #2a2a2a;color:#FFD700;font-size:13px;font-weight:bold;">${esc(a.tool)}</td>
        <td style="padding:14px 16px;border-bottom:1px solid #2a2a2a;color:#ffffff;font-size:13px;">${esc(a.username)}</td>
        <td style="padding:14px 16px;border-bottom:1px solid #2a2a2a;color:#cfcfcf;font-size:13px;">${esc(a.password)}</td>
      </tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Seus acessos foram unificados</title>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#141414;border:1px solid #262626;border-radius:16px;overflow:hidden;">
    <tr>
      <td style="background:linear-gradient(135deg,#000000,#1a1a1a);padding:32px 24px;text-align:center;border-bottom:3px solid #FFD700;">
        <h1 style="margin:0;color:#FFD700;font-size:22px;letter-spacing:1px;text-transform:uppercase;">Acessos unificados</h1>
        <p style="margin:8px 0 0;color:#bdbdbd;font-size:13px;">Mais Resultados Online</p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 24px;">
        <p style="margin:0 0 14px;color:#ffffff;font-size:16px;">Olá${name ? `, <strong>${esc(name)}</strong>` : ""}!</p>
        <p style="margin:0 0 20px;color:#b5b5b5;font-size:14px;line-height:1.7;">
          Tudo pronto: unificamos os seus acessos neste e-mail. Agora você entra na sua área de membros
          <strong style="color:#fff;">pelo e-mail e senha</strong> ou <strong style="color:#fff;">pelo nome de usuário e senha</strong> — os dois abrem tudo o que você tem liberado.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1c1c1c;border:1px solid #FFD700;border-radius:12px;margin-bottom:20px;">
          <tr><td style="padding:18px 20px;">
            <p style="margin:0 0 10px;color:#FFD700;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">Acesso pelo e-mail</p>
            <p style="margin:0;color:#ffffff;font-size:14px;line-height:1.8;">
              E-mail: <strong>${esc(email)}</strong><br>
              Senha: <strong>${esc(primaryPassword)}</strong>
            </p>
          </td></tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1c1c1c;border:1px solid #333;border-radius:12px;margin-bottom:24px;">
          <tr><td style="padding:18px 20px;">
            <p style="margin:0 0 10px;color:#FFD700;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">Acesso pelo usuário</p>
            <p style="margin:0;color:#ffffff;font-size:14px;line-height:1.8;">
              Usuário: <strong>${esc(primaryUsername)}</strong><br>
              Senha: <strong>${esc(primaryPassword)}</strong>
            </p>
          </td></tr>
        </table>

        ${
          rows
            ? `<p style="margin:0 0 10px;color:#ffffff;font-size:14px;font-weight:bold;">Tudo o que ficou vinculado a você</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;margin-bottom:24px;">
          <tr>
            <td style="padding:12px 16px;background:#000;color:#8a8a8a;font-size:11px;text-transform:uppercase;">Produto</td>
            <td style="padding:12px 16px;background:#000;color:#8a8a8a;font-size:11px;text-transform:uppercase;">Usuário</td>
            <td style="padding:12px 16px;background:#000;color:#8a8a8a;font-size:11px;text-transform:uppercase;">Senha</td>
          </tr>
          ${rows}
        </table>`
            : ""
        }

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="padding:6px 0 22px;">
            <a href="${DASHBOARD_URL}" style="display:inline-block;background:#FFD700;color:#000;text-decoration:none;font-weight:bold;font-size:15px;padding:16px 30px;border-radius:10px;">ACESSAR MINHA ÁREA DE MEMBROS</a>
            <p style="margin:12px 0 0;color:#6f6f6f;font-size:12px;">${DASHBOARD_URL}</p>
          </td></tr>
        </table>

        <p style="margin:0;color:#8a8a8a;font-size:12px;line-height:1.7;">
          Guarde este e-mail. Se precisar de ajuda, fale com o nosso suporte no
          <a href="${SUPPORT_WHATSAPP}" style="color:#FFD700;text-decoration:none;">WhatsApp</a>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#000;padding:18px 24px;text-align:center;border-top:1px solid #262626;">
        <p style="margin:0;color:#5c5c5c;font-size:11px;">© Mais Resultados Online — todos os direitos reservados.</p>
      </td>
    </tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

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
      to: email,
      subject: sanitizeEmailSubject("Seus acessos foram unificados - entre pelo e-mail ou usuario"),
      content: htmlToPlainText(html),
      html,
    });
    await client.close();

    return json({ success: true });
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
