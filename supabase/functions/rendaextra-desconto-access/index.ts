import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

import { sanitizeEmailSubject, htmlToPlainText } from "../_shared/email-encode.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const log = (m: string, d?: unknown) =>
  console.log(`[RENDAEXTRA-DESCONTO-ACCESS] ${m}`, d ? JSON.stringify(d) : "");

const PROMO_URL = "https://maisresultadosonline.com.br/rendaextra/desconto/promo";

const sendDiscountEmail = async (to: string, nome: string) => {
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  if (!smtpPassword) {
    log("SMTP not configured");
    return false;
  }
  const link = `${PROMO_URL}?email=${encodeURIComponent(to)}`;
  const firstName = (nome || "").split(" ")[0] || "amigo(a)";
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f4;color:#333;line-height:1.6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;font-size:1px;line-height:1px;">Seu desconto da ferramenta MRO foi liberado. Acesse agora pelo link pessoal.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f4;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#FFD700 0%,#FFA500 100%);padding:28px;text-align:center;">
<div style="display:inline-block;background:#000000;color:#ffffff;padding:10px 24px;border-radius:8px;font-size:28px;font-weight:bold;letter-spacing:2px;">MRO</div>
<h1 style="margin:14px 0 0 0;color:#000000;font-size:22px;">Sua Renda Extra com a MRO</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="margin:0 0 16px 0;font-size:16px;">Ola <strong>${firstName}</strong>,</p>
<p style="margin:0 0 16px 0;font-size:16px;">Voce assistiu mais de 60% da nossa apresentacao &mdash; e por isso liberamos seu acesso direto ao desconto exclusivo da ferramenta MRO.</p>
<p style="margin:0 0 16px 0;font-size:16px;">A MRO e uma ferramenta <strong>automatica</strong>: ensinamos voce todo o passo a passo para gerar renda extra prestando servico em casa, usando apenas seu notebook. Voce pode deixar a ferramenta trabalhando ate enquanto dorme.</p>
<div style="text-align:center;margin:30px 0;">
<a href="${link}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:30px;font-size:17px;font-weight:bold;">ACESSAR MEU DESCONTO</a>
<p style="margin:14px 0 0 0;font-size:13px;color:#666;">Link pessoal, abre direto com seu email ja validado.</p>
</div>
<p style="margin:0 0 8px 0;font-size:14px;color:#555;">Qualquer duvida, responda este email que nossa equipe te ajuda.</p>
</td></tr>
<tr><td style="background:#1a1a1a;padding:18px;text-align:center;">
<p style="margin:0;color:#999;font-size:12px;">&copy; 2026 MRO &mdash; Mais Resultados Online</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

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
      from: "MRO Renda Extra <suporte@maisresultadosonline.com.br>",
      replyTo: "suporte@maisresultadosonline.com.br",
      to,
      subject: sanitizeEmailSubject("Seu desconto liberado - MRO Renda Extra"),
      content: htmlToPlainText(html),
      html,
      headers: {
        "List-Unsubscribe": "<mailto:suporte@maisresultadosonline.com.br?subject=unsubscribe>, <https://maisresultadosonline.com.br/unsubscribe>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        "X-Entity-Ref-ID": crypto.randomUUID(),
        "X-Mailer": "MRO-Mailer",
        "Precedence": "bulk",
      },
    });
    await client.close();
    return true;
  } catch (e) {
    log("send error", { e: e instanceof Error ? e.message : String(e) });
    return false;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const emailRaw = String(body.email || "").trim().toLowerCase();

    if (!action) {
      return new Response(JSON.stringify({ success: false, error: "missing action" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!emailRaw || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailRaw)) {
      return new Response(JSON.stringify({ success: false, error: "email invalido" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data: lead } = await supabase
      .from("renda_extra_lead_leads")
      .select("id, nome_completo, email, desconto_video_percent, desconto_unlocked_at, desconto_email_sent_at, promo_video_percent")
      .ilike("email", emailRaw)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lead) {
      return new Response(
        JSON.stringify({ success: false, error: "not_registered", message: "Email nao encontrado. Faca o cadastro em /rendaextra primeiro." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 },
      );
    }

    if (action === "verify_email") {
      await supabase
        .from("renda_extra_lead_leads")
        .update({ desconto_last_access_at: new Date().toISOString() })
        .eq("id", lead.id);
      return new Response(
        JSON.stringify({
          success: true,
          name: lead.nome_completo,
          email: lead.email,
          percent_watched: lead.desconto_video_percent || 0,
          unlocked: !!lead.desconto_unlocked_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "track_progress") {
      const pct = Math.max(0, Math.min(100, Math.floor(Number(body.percent) || 0)));
      const newPct = Math.max(pct, lead.desconto_video_percent || 0);
      const patch: Record<string, unknown> = {
        desconto_video_percent: newPct,
        desconto_last_access_at: new Date().toISOString(),
      };
      let emailJustSent = false;
      if (newPct >= 60 && !lead.desconto_unlocked_at) {
        patch.desconto_unlocked_at = new Date().toISOString();
      }
      if (newPct >= 60 && !(lead as any).desconto_email_sent_at) {
        patch.desconto_email_sent_at = new Date().toISOString();
        emailJustSent = true;
      }
      await supabase.from("renda_extra_lead_leads").update(patch).eq("id", lead.id);
      if (emailJustSent) {
        try { await sendDiscountEmail(lead.email, lead.nome_completo); } catch (e) { log("auto email error", { e: e instanceof Error ? e.message : String(e) }); }
      }
      return new Response(JSON.stringify({ success: true, percent_watched: newPct, unlocked: newPct >= 75, email_sent: emailJustSent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "unlock_and_send") {
      const patch: Record<string, unknown> = {
        desconto_video_percent: Math.max(60, lead.desconto_video_percent || 0),
        desconto_last_access_at: new Date().toISOString(),
      };
      if (!lead.desconto_unlocked_at) patch.desconto_unlocked_at = new Date().toISOString();
      patch.desconto_email_sent_at = new Date().toISOString();
      await supabase.from("renda_extra_lead_leads").update(patch).eq("id", lead.id);
      const sent = await sendDiscountEmail(lead.email, lead.nome_completo);
      return new Response(JSON.stringify({ success: true, email_sent: sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "track_promo_progress") {
      const pct = Math.max(0, Math.min(100, Math.floor(Number(body.percent) || 0)));
      const newPct = Math.max(pct, (lead as any).promo_video_percent || 0);
      await supabase
        .from("renda_extra_lead_leads")
        .update({
          promo_video_percent: newPct,
          promo_video_last_watched_at: new Date().toISOString(),
        })
        .eq("id", lead.id);
      return new Response(JSON.stringify({ success: true, percent_watched: newPct }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check_access") {
      const allowed = !!lead.desconto_unlocked_at || (lead.desconto_video_percent || 0) >= 60;
      return new Response(
        JSON.stringify({ success: true, allowed, name: lead.nome_completo, email: lead.email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: false, error: "unknown action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (e) {
    log("error", { e: e instanceof Error ? e.message : String(e) });
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
