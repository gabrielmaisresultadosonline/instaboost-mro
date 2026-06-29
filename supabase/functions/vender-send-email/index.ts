import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

import { sanitizeEmailSubject, htmlToPlainText } from "../_shared/email-encode.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOGIN_URL = "https://maisresultadosonline.com.br/vendernainternet/login";

const esc = (s: string) =>
  String(s ?? "").replace(/[<>&"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!)
  );

function buildHtml(nome: string, email: string, senha: string, grupoLink: string) {
  const firstName = (nome || "").split(" ")[0] || "";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;color:#1a1a1a;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
  <tr><td style="background:#000;padding:30px;text-align:center;border-bottom:4px solid #eab308;">
    <div style="display:inline-block;background:#eab308;color:#000;padding:8px 22px;border-radius:8px;font-size:26px;font-weight:900;letter-spacing:2px;">MRO</div>
    <h1 style="color:#fff;margin:18px 0 0;font-size:22px;font-weight:900;text-transform:uppercase;">Pagamento Aprovado ✅</h1>
  </td></tr>
  <tr><td style="padding:32px;">
    <h2 style="margin:0 0 12px;font-size:22px;">Olá, <span style="color:#ca8a04;">${esc(firstName)}!</span></h2>
    <p style="font-size:16px;line-height:1.6;color:#333;">Seu pagamento de <strong>R$ 25,00</strong> foi confirmado. Bem-vindo(a) à <strong>MRO - Vender na Internet</strong>!</p>

    <div style="background:#f4f4f5;border-left:4px solid #eab308;padding:22px;border-radius:14px;margin:24px 0;">
      <p style="margin:0 0 10px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#71717a;">Seus dados de acesso</p>
      <p style="margin:8px 0;font-size:15px;"><strong>Login (e-mail):</strong> ${esc(email)}</p>
      <p style="margin:8px 0;font-size:15px;"><strong>Senha:</strong> ${esc(senha)}</p>
    </div>

    <div style="text-align:center;margin:30px 0;">
      <a href="${LOGIN_URL}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:16px 36px;border-radius:14px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">🔐 Acessar Área de Membros</a>
    </div>

    ${grupoLink ? `
    <div style="text-align:center;margin:18px 0 8px;">
      <a href="${esc(grupoLink)}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:16px 36px;border-radius:14px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">📲 Entrar no Grupo VIP</a>
    </div>
    <p style="text-align:center;font-size:12px;color:#71717a;margin:0 0 18px;">Participe do grupo exclusivo no WhatsApp.</p>
    ` : ""}

    <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;">
    <p style="font-size:13px;color:#71717a;text-align:center;margin:0;">Qualquer dúvida, responda este e-mail.<br><strong>Equipe MRO</strong></p>
  </td></tr>
  <tr><td style="background:#0a0a0a;padding:14px;text-align:center;">
    <p style="margin:0;color:#888;font-size:11px;">© ${new Date().getFullYear()} MRO - Mais Resultados Online</p>
  </td></tr>
</table></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { user_id } = await req.json().catch(() => ({}));
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: user, error: uErr } = await supabase
      .from("vender_usuarios").select("*").eq("id", user_id).maybeSingle();
    if (uErr || !user) throw new Error("Usuário não encontrado");

    const { data: settings } = await supabase
      .from("vender_settings").select("grupo_vip_link")
      .order("created_at", { ascending: true }).limit(1).maybeSingle();
    const grupoLink = settings?.grupo_vip_link || "";

    const pwd = Deno.env.get("SMTP_PASSWORD");
    if (!pwd) throw new Error("SMTP_PASSWORD não configurado");

    const html = buildHtml(user.nome, user.email, user.senha, grupoLink);

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.hostinger.com", port: 465, tls: true,
        auth: { username: "suporte@maisresultadosonline.com.br", password: pwd },
      },
    });
    await client.send({
      from: "MRO Vender Na Internet <suporte@maisresultadosonline.com.br>",
      to: user.email,
      subject: sanitizeEmailSubject("✅ Acesso liberado - MRO Vender na Internet"),
      content: htmlToPlainText(html),
      html,
    });
    await client.close();

    await supabase.from("vender_usuarios").update({
      email_enviado: true,
      email_enviado_at: new Date().toISOString(),
    }).eq("id", user_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[VENDER-SEND-EMAIL]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
