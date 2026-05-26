import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (m: string, d?: unknown) => console.log(`[EMPRESAS-REGISTER] ${m}`, d ? JSON.stringify(d) : "");

async function sendEmail(to: string, subject: string, html: string) {
  const pwd = Deno.env.get("SMTP_PASSWORD");
  if (!pwd) return false;
  try {
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.hostinger.com",
        port: 465,
        tls: true,
        auth: { username: "suporte@maisresultadosonline.com.br", password: pwd },
      },
    });
    await client.send({
      from: "MRO Empresas <suporte@maisresultadosonline.com.br>",
      to, subject, content: "auto", html,
    });
    await client.close();
    return true;
  } catch (e) {
    log("smtp err", e instanceof Error ? e.message : String(e));
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const {
      nome_completo, whatsapp, email, dispositivo,
      tem_empresa, vende_produto, presta_servico,
      iniciando_digital, marca_e_passa,
    } = body ?? {};

    if (!nome_completo || !whatsapp || !email) {
      return new Response(JSON.stringify({ success: false, error: "Campos obrigatórios faltando" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (String(email).length > 255 || String(nome_completo).length > 200 || String(whatsapp).length > 30) {
      return new Response(JSON.stringify({ success: false, error: "Dados inválidos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const allowedDisp = ["sim", "nao", "celular", "computador", "notebook", "nenhum"];
    const dispClean = typeof dispositivo === "string" && allowedDisp.includes(dispositivo) ? dispositivo : null;

    const { data: lead, error: insErr } = await supabase
      .from("empresas_leads")
      .insert({
        nome_completo, whatsapp, email,
        dispositivo: dispClean,
        tem_empresa, vende_produto, presta_servico,
        iniciando_digital, marca_e_passa,
      })
      .select()
      .single();

    if (insErr) {
      log("insert err", insErr);
      return new Response(JSON.stringify({ success: false, error: insErr.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: settings } = await supabase
      .from("empresas_settings").select("whatsapp_group_link").limit(1).maybeSingle();
    const groupLink = settings?.whatsapp_group_link || "https://chat.whatsapp.com/example";

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;color:#333;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;">
<tr><td style="background:linear-gradient(135deg,#10b981,#059669);padding:30px;text-align:center;">
<div style="background:#000;color:#fff;display:inline-block;padding:10px 25px;border-radius:8px;font-size:32px;font-weight:bold;letter-spacing:2px;">MRO</div>
<h1 style="color:#fff;margin:15px 0 0;font-size:24px;">🎉 Recebemos seu interesse!</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;">Olá <strong>${String(nome_completo).replace(/[<>]/g, "")}</strong>,</p>
<p style="font-size:16px;">Recebemos seu interesse em crescer na internet investindo muito pouco. A <strong>MRO</strong> pode ajudar você!</p>
<p style="font-size:16px;">Você foi convidado(a) para o nosso <strong>Grupo Especial gratuito</strong> para empresas, pequenos negócios, vendedores e prestadores de serviço que querem crescer no digital de forma real e constante.</p>
<div style="text-align:center;margin:30px 0;">
<a href="${groupLink}" style="display:inline-block;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;text-decoration:none;padding:16px 40px;border-radius:30px;font-size:18px;font-weight:bold;">📲 PARTICIPAR DO GRUPO GRÁTIS</a>
</div>
<p style="font-size:14px;color:#666;text-align:center;">Clique no botão acima para entrar no grupo do WhatsApp.</p>
</td></tr>
<tr><td style="background:#1a1a1a;padding:20px;text-align:center;">
<p style="margin:0;color:#999;font-size:12px;">© MRO - Mais Resultados Online</p>
</td></tr></table></body></html>`;

    const ok = await sendEmail(email, "🎉 Participe do Grupo Grátis - MRO Empresas", html);

    await supabase.from("empresas_email_logs").insert({
      lead_id: lead.id,
      email_to: email,
      email_type: "confirmacao",
      subject: "Participe do Grupo Grátis - MRO Empresas",
      status: ok ? "sent" : "failed",
      error_message: ok ? null : "SMTP not configured or failed",
    });

    if (ok) {
      await supabase.from("empresas_leads").update({
        email_confirmacao_enviado: true,
        email_confirmacao_enviado_at: new Date().toISOString(),
      }).eq("id", lead.id);
    }

    return new Response(JSON.stringify({ success: true, leadId: lead.id, whatsappGroupLink: groupLink, emailSent: ok }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("err", msg);
    return new Response(JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
