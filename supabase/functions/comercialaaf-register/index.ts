import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

import { sanitizeEmailSubject, htmlToPlainText } from "../_shared/email-encode.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      from: "Projeto AAF <suporte@maisresultadosonline.com.br>",
      to, subject, content: htmlToPlainText(html), html,
    });
    await client.close();
    return true;
  } catch (e) {
    console.error("[AAF] smtp err", e);
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
    const action = body?.action;

    // Admin login
    if (action === "login") {
      const { email, password } = body;
      if (email === "mro@gmail.com" && password === "Ga145523@") {
        return new Response(JSON.stringify({ success: true, token: "aaf-admin-" + Date.now() }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: false, error: "Credenciais inválidas" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Admin list
    if (action === "list") {
      const { token } = body;
      if (!token || !String(token).startsWith("aaf-admin-")) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data, error } = await supabase
        .from("comercialaaf_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true, leads: data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Default: register lead
    const { nome, email, whatsapp, empresa, o_que_vende, faturamento } = body ?? {};

    if (!nome || !email || !whatsapp || !empresa || !faturamento) {
      return new Response(JSON.stringify({ success: false, error: "Campos obrigatórios faltando" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (String(email).length > 255 || String(nome).length > 200) {
      return new Response(JSON.stringify({ success: false, error: "Dados inválidos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: lead, error: insErr } = await supabase
      .from("comercialaaf_leads")
      .insert({ nome, email, whatsapp, empresa, o_que_vende: o_que_vende || null, faturamento })
      .select()
      .single();

    if (insErr) {
      return new Response(JSON.stringify({ success: false, error: insErr.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const safeNome = String(nome).replace(/[<>]/g, "");
    const safeEmpresa = String(empresa).replace(/[<>]/g, "");
    const message = `Identificamos seu interesse em alavancar o seu negócio <strong>${safeEmpresa}</strong>. Em breve nossa equipe entrará em contato com você pelo seu WhatsApp.`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#111;">
<tr><td style="background:linear-gradient(135deg,#d4af37,#b8860b);padding:30px;text-align:center;">
<h1 style="color:#000;margin:0;font-size:28px;letter-spacing:3px;">PROJETO AAF</h1>
<p style="color:#000;margin:8px 0 0;font-size:13px;letter-spacing:2px;">ANÚNCIO • ABORDAGEM • FECHAMENTO</p>
</td></tr>
<tr><td style="padding:32px;color:#e5e5e5;">
<p style="font-size:16px;">Olá <strong style="color:#d4af37;">${safeNome}</strong>,</p>
<p style="font-size:16px;line-height:1.6;">${message}</p>
<p style="font-size:15px;line-height:1.6;color:#aaa;">Nosso método une marketing, tecnologia e gestão comercial para transformar oportunidades em vendas reais e previsíveis.</p>
<div style="margin:24px 0;padding:16px;background:#1a1a1a;border-left:4px solid #d4af37;">
<p style="margin:0;font-size:14px;color:#ccc;">Em breve um especialista entrará em contato pelo WhatsApp <strong style="color:#fff;">${String(whatsapp).replace(/[<>]/g,'')}</strong>.</p>
</div>
</td></tr>
<tr><td style="background:#000;padding:18px;text-align:center;">
<p style="margin:0;color:#666;font-size:12px;">© Projeto AAF - MRO</p>
</td></tr></table></body></html>`;

    const ok = await sendEmail(email, "Recebemos seu interesse - Projeto AAF", html);
    if (ok) {
      await supabase.from("comercialaaf_leads").update({ email_enviado: true }).eq("id", lead.id);
    }

    return new Response(JSON.stringify({ success: true, leadId: lead.id, emailSent: ok, message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
