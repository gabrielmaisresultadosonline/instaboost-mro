import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (m: string, d?: unknown) =>
  console.log(`[EMPRESAS-BROADCAST] ${m}`, d ? JSON.stringify(d) : "");

function buildHtml(campaign: string, nome: string, groupLink: string) {
  const safeName = String(nome || "").replace(/[<>]/g, "") || "amigo(a)";

  if (campaign === "link_corrigido") {
    return {
      subject: "✅ Link Corrigido - Acesse o GRUPO MRO",
      html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;color:#333;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;">
<tr><td style="background:linear-gradient(135deg,#facc15,#eab308);padding:30px;text-align:center;">
<div style="background:#000;color:#facc15;display:inline-block;padding:10px 25px;border-radius:8px;font-size:32px;font-weight:bold;letter-spacing:2px;">MRO</div>
<h1 style="color:#000;margin:15px 0 0;font-size:24px;">✅ Link Corrigido!</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;">Olá <strong>${safeName}</strong>,</p>
<p style="font-size:16px;"><strong>Link corrigido!</strong> Identificamos um problema com o link anterior do nosso Grupo Especial de empresas.</p>
<p style="font-size:16px;">Agora está tudo funcionando. <strong>Acesse o GRUPO</strong> agora mesmo pelo botão abaixo:</p>
<div style="text-align:center;margin:30px 0;">
<a href="${groupLink}" style="display:inline-block;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;text-decoration:none;padding:16px 40px;border-radius:30px;font-size:18px;font-weight:bold;">📲 ACESSAR O GRUPO</a>
</div>
<p style="font-size:14px;color:#666;text-align:center;">Te esperamos lá dentro!</p>
</td></tr>
<tr><td style="background:#1a1a1a;padding:20px;text-align:center;">
<p style="margin:0;color:#999;font-size:12px;">© MRO - Mais Resultados Online</p>
</td></tr></table></body></html>`,
    };
  }

  // remarketing
  return {
    subject: "🔥 Não deixe de participar do nosso Grupo!",
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;color:#333;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;">
<tr><td style="background:linear-gradient(135deg,#facc15,#eab308);padding:30px;text-align:center;">
<div style="background:#000;color:#facc15;display:inline-block;padding:10px 25px;border-radius:8px;font-size:32px;font-weight:bold;letter-spacing:2px;">MRO</div>
<h1 style="color:#000;margin:15px 0 0;font-size:24px;">🔥 Não fique de fora!</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;">Olá <strong>${safeName}</strong>,</p>
<p style="font-size:16px;"><strong>Não deixe de participar do nosso Grupo!</strong></p>
<p style="font-size:16px;">Estamos compartilhando conteúdos exclusivos para empresas, pequenos negócios, vendedores e prestadores de serviço que querem crescer no digital de forma real.</p>
<p style="font-size:16px;">Sua vaga ainda está garantida. Entre agora:</p>
<div style="text-align:center;margin:30px 0;">
<a href="${groupLink}" style="display:inline-block;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;text-decoration:none;padding:16px 40px;border-radius:30px;font-size:18px;font-weight:bold;">📲 PARTICIPAR DO GRUPO</a>
</div>
<p style="font-size:14px;color:#666;text-align:center;">Conteúdo 100% gratuito. Te esperamos!</p>
</td></tr>
<tr><td style="background:#1a1a1a;padding:20px;text-align:center;">
<p style="margin:0;color:#999;font-size:12px;">© MRO - Mais Resultados Online</p>
</td></tr></table></body></html>`,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const { campaign, only_failed, test_email, test_name } = body ?? {};

    if (!["link_corrigido", "remarketing"].includes(campaign)) {
      return new Response(JSON.stringify({ success: false, error: "Campanha inválida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const pwd = Deno.env.get("SMTP_PASSWORD");
    if (!pwd) {
      return new Response(JSON.stringify({ success: false, error: "SMTP não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: settings } = await supabase
      .from("empresas_settings").select("whatsapp_group_link").limit(1).maybeSingle();
    const groupLink = settings?.whatsapp_group_link || "https://chat.whatsapp.com/example";

    let targets: Array<{ id: string | null; nome_completo: string; email: string }> = [];
    const isTest = typeof test_email === "string" && test_email.trim().length > 0;

    if (isTest) {
      const emailTrim = String(test_email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
        return new Response(JSON.stringify({ success: false, error: "Email de teste inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      targets = [{
        id: null,
        nome_completo: String(test_name || "Teste").slice(0, 100),
        email: emailTrim,
      }];
    } else {
      let query = supabase.from("empresas_leads").select("id, nome_completo, email").limit(5000);
      if (only_failed) query = query.eq("email_confirmacao_enviado", false);
      const { data: leads, error: lerr } = await query;
      if (lerr) {
        return new Response(JSON.stringify({ success: false, error: lerr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const seen = new Set<string>();
      targets = (leads || []).filter((l) => {
        const e = (l.email || "").toLowerCase().trim();
        if (!e || seen.has(e)) return false;
        seen.add(e);
        return true;
      });
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.hostinger.com",
        port: 465,
        tls: true,
        auth: { username: "suporte@maisresultadosonline.com.br", password: pwd },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const lead of targets) {
      const { subject, html } = buildHtml(campaign, lead.nome_completo, groupLink);
      try {
        await client.send({
          from: "MRO Empresas <suporte@maisresultadosonline.com.br>",
          to: lead.email,
          subject,
          content: "auto",
          html,
        });
        sent++;
        await supabase.from("empresas_email_logs").insert({
          lead_id: lead.id,
          email_to: lead.email,
          email_type: campaign,
          subject,
          status: "sent",
        });
      } catch (e) {
        failed++;
        await supabase.from("empresas_email_logs").insert({
          lead_id: lead.id,
          email_to: lead.email,
          email_type: campaign,
          subject,
          status: "failed",
          error_message: e instanceof Error ? e.message : String(e),
        });
      }
      // small anti-spam delay
      await new Promise((r) => setTimeout(r, 600));
    }

    try { await client.close(); } catch (_) { /* noop */ }

    log("done", { campaign, sent, failed, total: targets.length });

    return new Response(
      JSON.stringify({ success: true, total: targets.length, sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("err", msg);
    return new Response(JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
