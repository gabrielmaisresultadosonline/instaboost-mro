import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (msg: string, data?: any) => {
  console.log(`[RENDAEXTRALIGACAO] ${msg}`, data ? JSON.stringify(data) : '');
};

const sendEmailViaSMTP = async (to: string, nome: string, groupLink: string) => {
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  if (!smtpPassword) {
    log("SMTP password not configured, skipping email");
    return false;
  }

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

    const htmlContent = `<!DOCTYPE html>
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
<h1 style="color:#000;margin:15px 0 0 0;font-size:24px;">🎉 Parabéns! Seu acesso foi liberado!</h1>
</td>
</tr>
<tr>
<td style="padding:30px;background:#ffffff;">

<div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:20px;border-radius:10px;margin-bottom:25px;text-align:center;">
<p style="margin:0;color:#fff;font-size:18px;font-weight:bold;">✨ Você está no caminho certo para faturar com a MRO!</p>
</div>

<p style="margin:0 0 20px 0;font-size:16px;">Olá <strong>${nome}</strong>!</p>

<p style="margin:0 0 15px 0;font-size:16px;">Ficamos muito felizes em receber seu cadastro! Agora você tem acesso ao nosso grupo exclusivo da <strong>Live de Sexta-Feira</strong>. 🚀</p>

<p style="margin:0 0 15px 0;font-size:16px;">Nessa live, você vai aprender:</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
<tr><td style="padding:8px 0;"><span style="display:inline-block;background:#FFD700;color:#000;padding:3px 10px;border-radius:15px;font-size:14px;margin-right:8px;">💰</span><span style="color:#333;">Como faturar <strong>5k ou mais</strong> de renda extra</span></td></tr>
<tr><td style="padding:8px 0;"><span style="display:inline-block;background:#FFD700;color:#000;padding:3px 10px;border-radius:15px;font-size:14px;margin-right:8px;">🤖</span><span style="color:#333;">Como a ferramenta <strong>automática MRO</strong> funciona</span></td></tr>
<tr><td style="padding:8px 0;"><span style="display:inline-block;background:#FFD700;color:#000;padding:3px 10px;border-radius:15px;font-size:14px;margin-right:8px;">📈</span><span style="color:#333;">Resultados reais de nossos <strong>membros</strong></span></td></tr>
<tr><td style="padding:8px 0;"><span style="display:inline-block;background:#FFD700;color:#000;padding:3px 10px;border-radius:15px;font-size:14px;margin-right:8px;">🎯</span><span style="color:#333;">Passo a passo para <strong>começar hoje</strong></span></td></tr>
</table>

<div style="background:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin:20px 0;border-radius:0 8px 8px 0;">
<p style="margin:0;color:#856404;font-size:15px;"><strong>⚠️ Importante!</strong><br>Entre no grupo do WhatsApp agora para não perder a live. As vagas são limitadas!</p>
</div>

<div style="text-align:center;margin:30px 0;">
<a href="${groupLink}" style="display:inline-block;background:linear-gradient(135deg,#25D366 0%,#128C7E 100%);color:#fff;text-decoration:none;padding:18px 50px;border-radius:30px;font-size:18px;font-weight:bold;">
👥 ENTRAR NO GRUPO DA LIVE
</a>
</div>

<p style="margin:20px 0;font-size:14px;color:#666;text-align:center;">
Fique atento ao grupo, é por lá que avisaremos quando a live começar!
</p>

</td>
</tr>
<tr>
<td style="background:#1a1a1a;padding:20px;text-align:center;">
<p style="color:#FFD700;margin:0 0 10px 0;font-weight:bold;">Bem-vindo à família MRO! 💛</p>
<p style="color:#888;margin:0;font-size:12px;">© ${new Date().getFullYear()} MRO - Mais Resultados Online</p>
<p style="color:#666;margin:10px 0 0 0;font-size:11px;">Este email foi enviado porque você se cadastrou na nossa página de Renda Extra.</p>
</td>
</tr>
</table>
</body>
</html>`;

    await client.send({
      from: "MRO Renda Extra <suporte@maisresultadosonline.com.br>",
      to: to,
      subject: "🎉 Parabéns! Seu acesso ao Grupo da Live foi liberado! - MRO",
      content: "auto",
      html: htmlContent,
    });

    await client.close();
    log('Email sent successfully', { to });
    return true;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log('Email send error', { error: errMsg });
    return false;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, settings, lead } = await req.json();
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const BUCKET = "user-data";
    const FILE_PATH = "rendaextraligacao/settings.json";
    const LEADS_PATH = "rendaextraligacao/leads.json";
    const STATS_PATH = "rendaextraligacao/stats.json";

    if (action === "load") {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .download(FILE_PATH);

      if (error || !data) {
        return new Response(
          JSON.stringify({ success: true, data: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const text = await data.text();
      const parsed = JSON.parse(text);

      return new Response(
        JSON.stringify({ success: true, data: parsed }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "save") {
      const jsonStr = JSON.stringify(settings);
      const blob = new Blob([jsonStr], { type: "application/json" });

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(FILE_PATH, blob, { upsert: true, contentType: "application/json" });

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "track_no_notebook") {
      let stats = { no_notebook_count: 0 };
      try {
        const { data: statsData } = await supabase.storage.from(BUCKET).download(STATS_PATH);
        if (statsData) {
          const text = await statsData.text();
          stats = JSON.parse(text);
        }
      } catch (_) {}

      stats.no_notebook_count = (stats.no_notebook_count || 0) + 1;

      const blob = new Blob([JSON.stringify(stats)], { type: "application/json" });
      await supabase.storage.from(BUCKET).upload(STATS_PATH, blob, { upsert: true, contentType: "application/json" });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "register_lead") {
      let existingLeads: any[] = [];
      
      try {
        const { data: leadsData } = await supabase.storage.from(BUCKET).download(LEADS_PATH);
        if (leadsData) {
          const text = await leadsData.text();
          existingLeads = JSON.parse(text);
        }
      } catch (_) {}

      existingLeads.push({
        ...lead,
        created_at: new Date().toISOString(),
      });

      const leadsBlob = new Blob([JSON.stringify(existingLeads)], { type: "application/json" });
      await supabase.storage.from(BUCKET).upload(LEADS_PATH, leadsBlob, { upsert: true, contentType: "application/json" });

      // Load settings to get group link
      let groupLink = "https://chat.whatsapp.com/KIDNoL8cBlnFrHlifBqU7X";
      try {
        const { data: settingsData } = await supabase.storage.from(BUCKET).download(FILE_PATH);
        if (settingsData) {
          const text = await settingsData.text();
          const s = JSON.parse(text);
          if (s.groupLink) groupLink = s.groupLink;
        }
      } catch (_) {}

      // Send welcome email via SMTP
      const emailSent = await sendEmailViaSMTP(lead.email, lead.nome || "Participante", groupLink);
      log("Lead registered", { email: lead.email, emailSent });

      return new Response(
        JSON.stringify({ success: true, emailSent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "load_leads") {
      let leads: any[] = [];
      let stats = { no_notebook_count: 0 };

      try {
        const { data: leadsData } = await supabase.storage.from(BUCKET).download(LEADS_PATH);
        if (leadsData) {
          const text = await leadsData.text();
          leads = JSON.parse(text);
        }
      } catch (_) {}

      try {
        const { data: statsData } = await supabase.storage.from(BUCKET).download(STATS_PATH);
        if (statsData) {
          const text = await statsData.text();
          stats = JSON.parse(text);
        }
      } catch (_) {}

      return new Response(
        JSON.stringify({ success: true, leads, stats }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});