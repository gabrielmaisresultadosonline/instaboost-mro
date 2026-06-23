import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const smtpPassword = Deno.env.get("SMTP_PASSWORD");

const supabase = createClient(supabaseUrl, serviceKey);

const SITE = "https://maisresultadosonline.com.br";
const WPP_URL = `${SITE}/whatsapp`;
const accessUrl = (email: string) => `${SITE}/descontoalunosrendaextrames?email=${encodeURIComponent(email)}`;

const escapeHtml = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

const ctaButton = (url: string, label: string, color = "#10b981") =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:24px auto;">
     <tr><td align="center" bgcolor="${color}" style="border-radius:30px;">
       <a href="${url}" target="_blank" style="display:inline-block;padding:14px 36px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:30px;">${label}</a>
     </td></tr>
   </table>`;

const emailShell = (title: string, body: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f4;">
<tr><td align="center" style="padding:20px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td align="center" style="background:#10b981;padding:30px;">
<div style="background:#000;color:#fff;display:inline-block;padding:10px 25px;border-radius:8px;font-size:32px;font-weight:bold;font-family:Arial,sans-serif;">MRO</div>
<h1 style="color:#ffffff;margin:15px 0 0 0;font-size:22px;font-family:Arial,sans-serif;">${title}</h1>
</td></tr>
<tr><td style="padding:30px;color:#333333;font-size:15px;line-height:1.6;font-family:Arial,sans-serif;">${body}</td></tr>
<tr><td style="background:#1a1a1a;padding:18px;text-align:center;color:#999999;font-size:12px;font-family:Arial,sans-serif;">© 2026 MRO - Mais Resultados Online</td></tr>
</table></td></tr></table></body></html>`;

const tplOffer = (name: string, email: string) => emailShell(
  "🎯 Você assistiu tudo - sua oferta especial",
  `<p>Olá <strong>${escapeHtml(name)}</strong>!</p>
   <p>Vejo que você assistiu o vídeo por <strong>completo</strong>. Deve ter entendido toda a proposta.</p>
   <p>Nossa ideia é fazer você montar uma <strong>EUGÊNCIA DE MARKETING</strong> e faturar em casa prestando serviço com a ferramenta MRO e nosso passo a passo completo.</p>
   <div style="background:#fff8e1;border-left:4px solid #f59e0b;padding:16px;margin:18px 0;border-radius:8px;">
     <p style="margin:0;font-size:18px;"><strong>30 DIAS POR APENAS R$97</strong></p>
     <p style="margin:6px 0 0 0;font-size:13px;color:#666666;">Esse valor é válido APENAS HOJE - 24 horas para aproveitar.</p>
   </div>
   ${ctaButton(accessUrl(email), "✅ APROVEITAR POR R$97")}
   <p style="font-size:13px;color:#666666;">Esse desconto é imperdível para você testar e ver se vai se adaptar.</p>`
);

const tplReminder1 = (name: string, email: string) => emailShell(
  "⏰ Faltam poucas horas - R$97 encerra hoje",
  `<p>Olá <strong>${escapeHtml(name)}</strong>!</p>
   <p>Só passando para te lembrar: seu desconto especial de <strong>R$97 por 30 dias</strong> encerra <strong>HOJE</strong>.</p>
   <p>Depois disso o valor volta ao normal e você perde a chance de testar.</p>
   ${ctaButton(accessUrl(email), "APROVEITAR POR R$97")}`
);

const tplReminder2 = (name: string, email: string) => emailShell(
  "🚨 ÚLTIMAS HORAS - oferta R$97 encerrando",
  `<p>Olá <strong>${escapeHtml(name)}</strong>!</p>
   <p>Esse é o <strong>último aviso</strong>. Em poucas horas seu acesso à oferta de <strong>R$97 por 30 dias</strong> será encerrado e o link não funcionará mais.</p>
   <p>Se você quer realmente testar a MRO e montar sua Eugência de Marketing em casa, esse é o momento.</p>
   ${ctaButton(accessUrl(email), "GARANTIR R$97 AGORA", "#dc2626")}`
);

async function sendMail(to: string, subject: string, html: string, type: string) {
  if (!smtpPassword) {
    console.error("[renda-extrass-offer] SMTP_PASSWORD missing");
    return false;
  }
  try {
    const client = new SMTPClient({
      connection: { hostname: "smtp.hostinger.com", port: 465, tls: true,
        auth: { username: "suporte@maisresultadosonline.com.br", password: smtpPassword } },
    });
    await client.send({ from: "MRO <suporte@maisresultadosonline.com.br>", to, subject, content: "auto", html });
    await client.close();
    await supabase.from("rendaext_email_logs").insert({ email_to: to, email_type: type, subject, status: "sent" });
    return true;
  } catch (e) {
    console.error("[renda-extrass-offer] send err", e);
    await supabase.from("rendaext_email_logs").insert({ email_to: to, email_type: type, subject, status: "error", error_message: String(e) });
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "track_progress") {
      const { lead_id, milestone } = body as { lead_id: string; milestone: 25 | 50 | 100 };
      if (!lead_id || ![25, 50, 100].includes(milestone)) {
        return new Response(JSON.stringify({ error: "invalid" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const col = `video_${milestone}_at`;
      const { data: lead } = await supabase.from("renda_extrass_leads").select("id,name,email," + col + ",offer_email_sent_at").eq("id", lead_id).maybeSingle();
      if (!lead) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const patch: Record<string, unknown> = {};
      if (!(lead as any)[col]) patch[col] = new Date().toISOString();

      if (milestone === 100 && !lead.offer_email_sent_at) {
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        patch.offer_email_sent_at = new Date().toISOString();
        patch.offer_expires_at = expires;
        patch.video_completed = true;
        await sendMail(lead.email, "🎯 Você assistiu tudo - oferta especial R$97 (24h)", tplOffer(lead.name), "offer_24h");
      }
      if (Object.keys(patch).length) await supabase.from("renda_extrass_leads").update(patch).eq("id", lead_id);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "check_access") {
      const email = String(body.email || "").toLowerCase().trim();
      if (!email) return new Response(JSON.stringify({ expired: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: lead } = await supabase.from("renda_extrass_leads").select("offer_email_sent_at,offer_expires_at,offer_expired").eq("email", email).maybeSingle();
      const expired = !!lead && (lead.offer_expired || (lead.offer_expires_at && new Date(lead.offer_expires_at) < new Date()));
      return new Response(JSON.stringify({ expired: !!expired }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "process_reminders") {
      const now = new Date();
      const { data: leads } = await supabase.from("renda_extrass_leads")
        .select("id,name,email,offer_email_sent_at,reminder1_sent_at,reminder2_sent_at,offer_expires_at,offer_expired")
        .not("offer_email_sent_at", "is", null)
        .eq("offer_expired", false);
      let r1 = 0, r2 = 0, exp = 0;
      for (const l of leads || []) {
        const sent = new Date(l.offer_email_sent_at as string);
        const hours = (now.getTime() - sent.getTime()) / 36e5;
        if (hours >= 24 && !l.offer_expired) {
          await supabase.from("renda_extrass_leads").update({ offer_expired: true }).eq("id", l.id);
          exp++;
          continue;
        }
        if (hours >= 16 && !l.reminder2_sent_at) {
          await sendMail(l.email as string, "🚨 ÚLTIMAS HORAS - oferta R$97 encerrando", tplReminder2(l.name as string), "offer_reminder2");
          await supabase.from("renda_extrass_leads").update({ reminder2_sent_at: now.toISOString() }).eq("id", l.id);
          r2++;
        } else if (hours >= 8 && !l.reminder1_sent_at) {
          await sendMail(l.email as string, "⏰ Faltam poucas horas - R$97 encerra hoje", tplReminder1(l.name as string), "offer_reminder1");
          await supabase.from("renda_extrass_leads").update({ reminder1_sent_at: now.toISOString() }).eq("id", l.id);
          r1++;
        }
      }
      return new Response(JSON.stringify({ ok: true, reminder1: r1, reminder2: r2, expired: exp }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown_action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[renda-extrass-offer]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
