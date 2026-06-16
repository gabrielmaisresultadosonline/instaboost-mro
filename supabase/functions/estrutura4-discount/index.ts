import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "mro@gmail.com";
const ADMIN_PASSWORD = "Ga145523@";
const DISCOUNT_PATH = "/descontoalunosrendaextrasss";
const VIDEO_DISCOUNT_PATH = "/rendaextradesconto";
const buildDiscountLink = (token: string, source?: string | null) => {
  const path = String(source || "").toLowerCase().includes("rendaextradesconto")
    ? VIDEO_DISCOUNT_PATH
    : DISCOUNT_PATH;
  return `${SITE_URL}${path}?token=${token}`;
};
const SITE_URL = "https://maisresultadosonline.com.br";
const CRON_SECRET = "est4-cron-2026-secure";

// Follow-up schedule offsets in hours (from each prior send)
// Stage 1 = initial. Stage 2 = +8h. Stage 3 = +10h after stage2. Stage 4 = +14h after stage3.
const FOLLOWUP_OFFSETS_H = [8, 10, 14];

const log = (msg: string, data?: unknown) =>
  console.log(`[ESTRUTURA4-DISCOUNT] ${msg}`, data ? JSON.stringify(data) : "");

const encodeSubject = (s: string) => {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(s)));
  return `=?UTF-8?B?${b64}?=`;
};
const htmlToText = (h: string) => h.replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

const sendEmail = async (to: string, subject: string, html: string) => {
  const pwd = Deno.env.get("SMTP_PASSWORD");
  if (!pwd) {
    log("No SMTP_PASSWORD set");
    return false;
  }
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
      from: "MRO Renda Extra <suporte@maisresultadosonline.com.br>",
      to,
      subject: encodeSubject(subject),
      content: htmlToText(html),
      html,
    });
    await client.close();
    return true;
  } catch (e) {
    log("smtp error", { error: e instanceof Error ? e.message : String(e) });
    return false;
  }
};

const buildEmailHtml = (nome: string, link: string, hoursLeft: number) => `<!DOCTYPE html>
<html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;color:#222;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;">
<tr><td style="background:linear-gradient(135deg,#FFD700,#FFA500);padding:30px;text-align:center;">
<div style="background:#000;color:#fff;display:inline-block;padding:10px 25px;border-radius:8px;font-size:30px;font-weight:bold;letter-spacing:2px;">MRO</div>
<h1 style="color:#000;margin:15px 0 0;font-size:24px;">🔥 Seu Desconto Foi Liberado!</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;">Olá <strong>${nome}</strong>,</p>
<p style="font-size:16px;">Parabéns pelo interesse na <strong>Ferramenta MRO</strong> — você foi aprovado para receber um desconto exclusivo:</p>

<div style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:20px;border-radius:10px;text-align:center;margin:25px 0;">
  <p style="margin:0;font-size:14px;opacity:.9;text-decoration:line-through;">De R$ 397,00 anual</p>
  <p style="margin:8px 0 0;font-size:32px;font-weight:bold;">Por R$ 300,00 anual</p>
  <p style="margin:8px 0 0;font-size:14px;">Economize R$ 97 — acesso liberado por <strong>1 ano completo</strong></p>
</div>

<div style="background:#fff3cd;border-left:4px solid #ffc107;padding:15px;border-radius:6px;margin:20px 0;">
<p style="margin:0;font-size:14px;color:#856404;"><strong>⏰ Atenção:</strong> esse desconto fica disponível APENAS pelas próximas <strong>${hoursLeft} horas</strong>. Depois disso o valor volta ao normal.</p>
</div>

<h2 style="font-size:18px;color:#000;margin:30px 0 10px;">💰 Por que isso é uma oportunidade real de renda extra?</h2>
<p style="font-size:15px;line-height:1.6;">Com a Ferramenta MRO você pode prestar serviço como <strong>agência de marketing</strong> para empresas locais — fechando contratos mensais de R$ 500 a R$ 1.500 cada.</p>
<p style="font-size:15px;line-height:1.6;">Vamos te ensinar TUDO: como abordar clientes, fechar contratos, usar a ferramenta e entregar resultado. Nossos alunos faturam <strong>R$ 5 MIL+ por mês</strong> aplicando o método.</p>

<div style="text-align:center;margin:35px 0;">
<a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#FFD700,#FFA500);color:#000;text-decoration:none;padding:18px 45px;border-radius:30px;font-size:18px;font-weight:bold;box-shadow:0 4px 15px rgba(255,165,0,.4);">
🔓 ACESSAR MEU DESCONTO AGORA
</a>
<p style="margin:15px 0 0;font-size:12px;color:#666;">Esse link é exclusivo para o email <strong>${nome ? "" : ""}</strong> deste cadastro.</p>
</div>

<p style="font-size:13px;color:#666;text-align:center;margin-top:30px;">Não perca essa chance. Comece a aplicar HOJE mesmo.</p>
</td></tr>
<tr><td style="background:#1a1a1a;padding:20px;text-align:center;color:#999;font-size:12px;">© 2026 MRO - Mais Resultados Online</td></tr>
</table></body></html>`;

const FOLLOWUP_TEMPLATES: Array<{ subject: (h: number) => string; build: (nome: string, link: string, hoursLeft: number) => string }> = [
  {
    subject: (h) => `⏳ Faltam ${h}h do seu desconto MRO — não perca`,
    build: (nome, link, hoursLeft) => `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;color:#222;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;"><tr><td style="background:linear-gradient(135deg,#FFD700,#FFA500);padding:30px;text-align:center;"><div style="background:#000;color:#fff;display:inline-block;padding:10px 25px;border-radius:8px;font-size:28px;font-weight:bold;letter-spacing:2px;">MRO</div><h1 style="color:#000;margin:15px 0 0;font-size:22px;">⏳ Seu desconto ainda está ativo</h1></td></tr><tr><td style="padding:30px;"><p style="font-size:16px;">Olá <strong>${nome}</strong>,</p><p style="font-size:16px;">Só lembrando: seu desconto exclusivo na <strong>Ferramenta MRO</strong> ainda está liberado, mas <strong>faltam apenas ${hoursLeft} horas</strong>.</p><div style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:20px;border-radius:10px;text-align:center;margin:25px 0;"><p style="margin:0;font-size:14px;text-decoration:line-through;opacity:.9;">De R$ 397/ano</p><p style="margin:8px 0 0;font-size:30px;font-weight:bold;">Por R$ 300/ano</p></div><p style="font-size:15px;">Não deixe pra última hora — alunos que entram cedo começam a faturar antes.</p><div style="text-align:center;margin:35px 0;"><a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#FFD700,#FFA500);color:#000;text-decoration:none;padding:18px 45px;border-radius:30px;font-size:18px;font-weight:bold;">🔓 ACESSAR MEU DESCONTO</a></div></td></tr><tr><td style="background:#1a1a1a;padding:20px;text-align:center;color:#999;font-size:12px;">© 2026 MRO</td></tr></table></body></html>`,
  },
  {
    subject: (h) => `🚨 Restam só ${h}h — seu desconto MRO está acabando`,
    build: (nome, link, hoursLeft) => `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;color:#222;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;"><tr><td style="background:linear-gradient(135deg,#dc2626,#f59e0b);padding:30px;text-align:center;"><div style="background:#000;color:#fff;display:inline-block;padding:10px 25px;border-radius:8px;font-size:28px;font-weight:bold;letter-spacing:2px;">MRO</div><h1 style="color:#fff;margin:15px 0 0;font-size:22px;">🚨 Últimas horas do seu desconto</h1></td></tr><tr><td style="padding:30px;"><p style="font-size:16px;"><strong>${nome}</strong>, este é um aviso importante.</p><p style="font-size:16px;">Restam apenas <strong style="color:#dc2626;">${hoursLeft} horas</strong> para você garantir a Ferramenta MRO por R$ 300 (em vez de R$ 397). Depois disso o valor volta ao normal e <strong>não vamos liberar de novo</strong>.</p><div style="background:#fee2e2;border-left:4px solid #dc2626;padding:15px;border-radius:6px;margin:20px 0;"><p style="margin:0;font-size:14px;color:#991b1b;"><strong>Por que agir agora?</strong> Nossos alunos faturam R$ 5 mil+/mês prestando serviço de tráfego para empresas locais.</p></div><div style="text-align:center;margin:35px 0;"><a href="${link}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:18px 45px;border-radius:30px;font-size:18px;font-weight:bold;">⚡ GARANTIR DESCONTO AGORA</a></div></td></tr><tr><td style="background:#1a1a1a;padding:20px;text-align:center;color:#999;font-size:12px;">© 2026 MRO</td></tr></table></body></html>`,
  },
  {
    subject: (h) => `⛔ ÚLTIMO AVISO — desconto MRO expira em ${h}h`,
    build: (nome, link, hoursLeft) => `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;color:#222;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;"><tr><td style="background:#000;padding:30px;text-align:center;"><div style="background:#dc2626;color:#fff;display:inline-block;padding:10px 25px;border-radius:8px;font-size:28px;font-weight:bold;letter-spacing:2px;">⛔ ÚLTIMO AVISO</div><h1 style="color:#fff;margin:15px 0 0;font-size:22px;">Seu desconto MRO expira em ${hoursLeft}h</h1></td></tr><tr><td style="padding:30px;"><p style="font-size:16px;"><strong>${nome}</strong>, esta é a última vez que enviamos esse email.</p><p style="font-size:16px;">Depois que o cronômetro zerar, <strong>o desconto some</strong> e o valor volta para R$ 397 — sem exceções.</p><p style="font-size:16px;">Se você quer mesmo aprender a faturar R$ 5 mil+/mês, <strong>essa é sua última chance</strong>.</p><div style="text-align:center;margin:35px 0;"><a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#dc2626,#000);color:#fff;text-decoration:none;padding:18px 45px;border-radius:30px;font-size:18px;font-weight:bold;border:2px solid #FFD700;">🔥 ENTRAR ANTES QUE ACABE</a><p style="margin:15px 0 0;font-size:12px;color:#666;">Após expirar, só será possível contratar pelo valor cheio via WhatsApp.</p></div></td></tr><tr><td style="background:#1a1a1a;padding:20px;text-align:center;color:#999;font-size:12px;">© 2026 MRO</td></tr></table></body></html>`,
  },
];

const scheduleNext = (stageJustSent: number): string | null => {
  const idx = stageJustSent - 1;
  if (idx < 0 || idx >= FOLLOWUP_OFFSETS_H.length) return null;
  return new Date(Date.now() + FOLLOWUP_OFFSETS_H[idx] * 3600000).toISOString();
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "create_lead") {
      const nome = String(body.nome || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const whatsapp = String(body.whatsapp || "").trim();
      if (!nome || !email || !whatsapp) {
        return new Response(JSON.stringify({ success: false, error: "Campos obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const { data: existing } = await supabase
        .from("estrutura4_discount_leads")
        .select("id, token, expires_at, emails_sent_count, source")
        .eq("email", email)
        .maybeSingle();

      let leadId: string;
      let finalToken: string;
      let finalExpires: string;
      const incomingSource = String(body.source || "estruturarendaextra4");
      let finalSource = incomingSource;

      if (existing) {
        finalToken = existing.token;
        finalExpires = existing.expires_at;
        const expired = new Date(existing.expires_at).getTime() < Date.now();
        if (expired) {
          finalToken = token;
          finalExpires = expiresAt;
        }
        // If lead is now coming from /rendaextradesconto, persist that source
        // so future emails point back to that page.
        finalSource = incomingSource.toLowerCase().includes("rendaextradesconto")
          ? incomingSource
          : (existing.source || incomingSource);
        const { error: upErr } = await supabase
          .from("estrutura4_discount_leads")
          .update({
            nome,
            whatsapp,
            token: finalToken,
            expires_at: finalExpires,
            source: finalSource,
            emails_sent_count: (existing.emails_sent_count || 0) + 1,
            last_email_sent_at: new Date().toISOString(),
            auto_remarketing_enabled: true,
            remarketing_stage: 1,
            next_send_at: scheduleNext(1),
          })
          .eq("id", existing.id);
        if (upErr) throw upErr;
        leadId = existing.id;
      } else {
        finalToken = token;
        finalExpires = expiresAt;
        const { data: ins, error: insErr } = await supabase
          .from("estrutura4_discount_leads")
          .insert({
            nome,
            email,
            whatsapp,
            token: finalToken,
            expires_at: finalExpires,
            emails_sent_count: 1,
            last_email_sent_at: new Date().toISOString(),
            source: finalSource,
            auto_remarketing_enabled: true,
            remarketing_stage: 1,
            next_send_at: scheduleNext(1),
          })
          .select("id")
          .single();
        if (insErr) throw insErr;
        leadId = ins.id;
      }

      const hoursLeft = Math.max(1, Math.floor((new Date(finalExpires).getTime() - Date.now()) / 3600000));
      const link = buildDiscountLink(finalToken, finalSource);
      const html = buildEmailHtml(nome, link, hoursLeft);
      const sent = await sendEmail(email, "🔥 Seu desconto MRO foi liberado — R$ 397 por R$ 300", html);

      return new Response(JSON.stringify({ success: true, leadId, sent, link }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify_token") {
      const token = String(body.token || "");
      if (!token) return new Response(JSON.stringify({ valid: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data } = await supabase
        .from("estrutura4_discount_leads")
        .select("email, nome, expires_at")
        .eq("token", token)
        .maybeSingle();
      if (!data) return new Response(JSON.stringify({ valid: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const expired = new Date(data.expires_at).getTime() < Date.now();
      if (expired) return new Response(JSON.stringify({ valid: false, expired: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await supabase.from("estrutura4_discount_leads").update({ accessed_discount_at: new Date().toISOString() }).eq("token", token);
      return new Response(JSON.stringify({ valid: true, email: data.email, nome: data.nome, expires_at: data.expires_at }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify_email") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!email) return new Response(JSON.stringify({ valid: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      let { data } = await supabase
        .from("estrutura4_discount_leads")
        .select("token, nome, expires_at")
        .eq("email", email)
        .maybeSingle();

      // Fallback: aceitar emails cadastrados em /rendaextra/admin (renda_extra_v2_leads)
      if (!data) {
        const { data: extLead } = await supabase
          .from("renda_extra_v2_leads")
          .select("nome, email")
          .ilike("email", email)
          .maybeSingle();
        if (extLead) {
          const token = crypto.randomUUID().replace(/-/g, "");
          const expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
          const { data: created } = await supabase
            .from("estrutura4_discount_leads")
            .insert({
              email,
              nome: extLead.nome || "",
              token,
              expires_at,
              source: "rendaextra_admin",
              send_count: 1,
            })
            .select("token, nome, expires_at")
            .maybeSingle();
          data = created || { token, nome: extLead.nome || "", expires_at };
        }
      }

      if (!data) return new Response(JSON.stringify({ valid: false, notfound: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const expired = new Date(data.expires_at).getTime() < Date.now();
      if (expired) return new Response(JSON.stringify({ valid: false, expired: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await supabase.from("estrutura4_discount_leads").update({ accessed_discount_at: new Date().toISOString() }).eq("email", email);
      return new Response(JSON.stringify({ valid: true, token: data.token, nome: data.nome, expires_at: data.expires_at }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "track_visit") {
      const page = String(body.page || "unknown");
      const email = body.email ? String(body.email).toLowerCase() : null;
      const ua = req.headers.get("user-agent") || null;
      const ip = req.headers.get("x-forwarded-for") || null;
      await supabase.from("estrutura4_discount_visits").insert({ page, email, ip, user_agent: ua });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "admin_login") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ success: true, token: btoa(`${email}:${Date.now()}`) }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: false, error: "Credenciais inválidas" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "admin_list") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ success: false, error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: leads } = await supabase
        .from("estrutura4_discount_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      const { data: visits } = await supabase
        .from("estrutura4_discount_visits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);

      // Cross-reference: which lead emails are now paid users (purchases via discount)
      const leadEmails = (leads || []).map((l: any) => String(l.email).toLowerCase()).filter(Boolean);
      let purchases: any[] = [];
      if (leadEmails.length > 0) {
        const { data: paid } = await supabase
          .from("paid_users")
          .select("email, username, subscription_status, subscription_end, created_at")
          .in("email", leadEmails);
        purchases = (paid || []).filter((p: any) =>
          ["active", "paid", "approved", "confirmed"].includes(String(p.subscription_status || "").toLowerCase()) ||
          (p.subscription_end && new Date(p.subscription_end).getTime() > Date.now())
        );
      }

      return new Response(JSON.stringify({ success: true, leads: leads || [], visits: visits || [], purchases }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_video") {
      const { data } = await supabase
        .from("desconto_alunos_settings")
        .select("video_url, hls_url, video_title")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return new Response(JSON.stringify({
        video_url: data?.video_url || null,
        hls_url: data?.hls_url || null,
        video_title: data?.video_title || null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "set_video") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ success: false, error: "Não autorizado" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const video_url = body.video_url ? String(body.video_url) : null;
      const hls_url = body.hls_url ? String(body.hls_url) : null;
      const video_title = body.video_title ? String(body.video_title) : null;

      const { data: existing } = await supabase
        .from("desconto_alunos_settings")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase.from("desconto_alunos_settings")
          .update({ video_url, hls_url, video_title, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("desconto_alunos_settings")
          .insert({ video_url, hls_url, video_title, is_active: true });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "admin_remarketing_data") {
      const emailIn = String(body.email || "").trim().toLowerCase();
      const passIn = String(body.password || "");
      if (emailIn !== ADMIN_EMAIL || passIn !== ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ success: false, error: "Não autorizado" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: rendaLeads } = await supabase
        .from("renda_extra_leads")
        .select("id, nome_completo, email, whatsapp, tipo_computador, media_salarial, trabalha_atualmente, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);

      const emails = (rendaLeads || []).map((l: any) => String(l.email || "").toLowerCase()).filter(Boolean);

      const cleanEmail = (raw: string) => {
        const s = String(raw || "").toLowerCase().trim();
        return s.includes(":") ? s.split(":").pop()!.trim() : s;
      };

      const paidEmailsSet = new Set<string>();
      if (emails.length > 0) {
        const { data: paid } = await supabase
          .from("paid_users")
          .select("email, subscription_status, subscription_end")
          .in("email", emails);
        (paid || [])
          .filter((p: any) =>
            ["active", "paid", "approved", "confirmed"].includes(String(p.subscription_status || "").toLowerCase()) ||
            (p.subscription_end && new Date(p.subscription_end).getTime() > Date.now())
          )
          .forEach((p: any) => { const e = cleanEmail(p.email); if (e) paidEmailsSet.add(e); });
      }

      // Instagram Nova clients: mro_orders (paid/completed) + created_accesses
      const { data: mroOrders } = await supabase
        .from("mro_orders")
        .select("email")
        .in("status", ["paid", "completed"]);
      (mroOrders || []).forEach((o: any) => { const e = cleanEmail(o.email); if (e) paidEmailsSet.add(e); });

      const { data: createdAccesses } = await supabase
        .from("created_accesses")
        .select("customer_email");
      (createdAccesses || []).forEach((a: any) => { const e = cleanEmail(a.customer_email); if (e) paidEmailsSet.add(e); });

      const paidEmails = Array.from(paidEmailsSet);

      const { data: discountLeads } = await supabase
        .from("estrutura4_discount_leads")
        .select("email, expires_at, emails_sent_count, last_email_sent_at, accessed_discount_at, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);

      const { data: remarketingLogs } = await supabase
        .from("estrutura4_remarketing_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(2000);

      return new Response(JSON.stringify({
        success: true,
        renda_leads: rendaLeads || [],
        paid_emails: paidEmails,
        discount_leads: discountLeads || [],
        remarketing_logs: remarketingLogs || [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "admin_send_remarketing") {
      const emailIn = String(body.email || "").trim().toLowerCase();
      const passIn = String(body.password || "");
      if (emailIn !== ADMIN_EMAIL || passIn !== ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ success: false, error: "Não autorizado" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const targetEmail = String(body.target_email || "").trim().toLowerCase();
      const nome = String(body.nome || "Aluno").trim();
      const whatsapp = String(body.whatsapp || "").trim();
      const tipo = String(body.tipo_computador || "").trim();
      if (!targetEmail) {
        return new Response(JSON.stringify({ success: false, error: "Email obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const { data: existing } = await supabase
        .from("estrutura4_discount_leads")
        .select("id, token, expires_at, emails_sent_count")
        .eq("email", targetEmail)
        .maybeSingle();

      let finalToken = token;
      let finalExpires = expiresAt;

      if (existing) {
        const expired = new Date(existing.expires_at).getTime() < Date.now();
        finalToken = expired ? token : existing.token;
        finalExpires = expired ? expiresAt : existing.expires_at;
        await supabase
          .from("estrutura4_discount_leads")
          .update({
            nome,
            whatsapp: whatsapp || undefined,
            token: finalToken,
            expires_at: finalExpires,
            emails_sent_count: (existing.emails_sent_count || 0) + 1,
            last_email_sent_at: new Date().toISOString(),
            auto_remarketing_enabled: true,
            remarketing_stage: 1,
            next_send_at: scheduleNext(1),
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("estrutura4_discount_leads")
          .insert({
            nome,
            email: targetEmail,
            whatsapp: whatsapp || "—",
            token: finalToken,
            expires_at: finalExpires,
            emails_sent_count: 1,
            last_email_sent_at: new Date().toISOString(),
            source: "remarketing-admin",
            auto_remarketing_enabled: true,
            remarketing_stage: 1,
            next_send_at: scheduleNext(1),
          });
      }

      const hoursLeft = Math.max(1, Math.floor((new Date(finalExpires).getTime() - Date.now()) / 3600000));
      const link = `${SITE_URL}${DISCOUNT_PATH}?token=${finalToken}`;
      const html = buildEmailHtml(nome, link, hoursLeft);
      const sent = await sendEmail(targetEmail, "🔥 Seu desconto MRO foi liberado — R$ 397 por R$ 300", html);

      await supabase.from("estrutura4_remarketing_logs").insert({
        email: targetEmail,
        nome,
        whatsapp,
        tipo_computador: tipo,
        source_page: "rendaextra-admin",
        link,
        success: sent,
        notes: sent ? null : "SMTP falhou",
      });

      return new Response(JSON.stringify({ success: true, sent, link }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "process_remarketing_queue") {
      if (String(body.cron_secret || "") !== CRON_SECRET) {
        return new Response(JSON.stringify({ success: false, error: "Não autorizado" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const nowIso = new Date().toISOString();
      const { data: due } = await supabase
        .from("estrutura4_discount_leads")
        .select("id, email, nome, token, expires_at, remarketing_stage, accessed_discount_at, source")
        .eq("auto_remarketing_enabled", true)
        .lte("next_send_at", nowIso)
        .lt("remarketing_stage", 4)
        .order("next_send_at", { ascending: true })
        .limit(50);

      const leads = due || [];
      if (leads.length === 0) {
        return new Response(JSON.stringify({ success: true, processed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Filter out leads that already bought
      const emails = leads.map((l: any) => String(l.email).toLowerCase());
      const paidSet = new Set<string>();
      const { data: paid } = await supabase
        .from("paid_users")
        .select("email, subscription_status, subscription_end")
        .in("email", emails);
      (paid || []).forEach((p: any) => {
        const active = ["active","paid","approved","confirmed"].includes(String(p.subscription_status||"").toLowerCase())
          || (p.subscription_end && new Date(p.subscription_end).getTime() > Date.now());
        if (active) paidSet.add(String(p.email).toLowerCase());
      });
      const { data: mroOrders } = await supabase.from("mro_orders").select("email").in("status", ["paid","completed"]).in("email", emails);
      (mroOrders || []).forEach((o: any) => paidSet.add(String(o.email).toLowerCase()));
      const { data: createdAcc } = await supabase.from("created_accesses").select("customer_email").in("customer_email", emails);
      (createdAcc || []).forEach((a: any) => paidSet.add(String(a.customer_email).toLowerCase()));

      let processed = 0;
      let skipped = 0;
      for (const lead of leads) {
        const emailLower = String(lead.email).toLowerCase();
        if (paidSet.has(emailLower)) {
          // Lead already bought — stop auto remarketing
          await supabase.from("estrutura4_discount_leads")
            .update({ auto_remarketing_enabled: false, next_send_at: null })
            .eq("id", lead.id);
          skipped++;
          continue;
        }

        const currentStage: number = lead.remarketing_stage || 1;
        const nextStage = currentStage + 1; // 2, 3 or 4
        const tplIdx = nextStage - 2; // 0,1,2
        const tpl = FOLLOWUP_TEMPLATES[tplIdx];
        if (!tpl) {
          await supabase.from("estrutura4_discount_leads")
            .update({ auto_remarketing_enabled: false, next_send_at: null })
            .eq("id", lead.id);
          continue;
        }

        const hoursLeft = Math.max(1, Math.floor((new Date(lead.expires_at).getTime() - Date.now()) / 3600000));
        const link = buildDiscountLink(lead.token, (lead as any).source);
        const html = tpl.build(lead.nome || "Aluno", link, hoursLeft);
        const sent = await sendEmail(emailLower, tpl.subject(hoursLeft), html);

        const newNext = scheduleNext(nextStage);
        await supabase.from("estrutura4_discount_leads")
          .update({
            emails_sent_count: nextStage,
            remarketing_stage: nextStage,
            last_email_sent_at: new Date().toISOString(),
            next_send_at: newNext,
            auto_remarketing_enabled: newNext !== null,
          })
          .eq("id", lead.id);

        await supabase.from("estrutura4_remarketing_logs").insert({
          email: emailLower,
          nome: lead.nome,
          source_page: `auto-stage-${nextStage}`,
          link,
          success: sent,
          notes: sent ? `Follow-up automático estágio ${nextStage}` : "SMTP falhou",
        });

        processed++;
        // Small delay to avoid SMTP burst
        await new Promise((r) => setTimeout(r, 1500));
      }

      return new Response(JSON.stringify({ success: true, processed, skipped, total: leads.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== VIDEO ACCESS TRACKING (/rendaextradesconto) ==========
    const VIDEO_EMAIL_TEMPLATES: Record<string, { subject: string; html: (nome: string, link: string) => string }> = {
      access: {
        subject: "👀 Vi que você acessou seu desconto MRO",
        html: (nome, link) => `<!DOCTYPE html><html><body style="margin:0;font-family:Arial,sans-serif;background:#f4f4f4;color:#222;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;"><tr><td style="background:linear-gradient(135deg,#FFD700,#FFA500);padding:30px;text-align:center;"><div style="background:#000;color:#fff;display:inline-block;padding:10px 25px;border-radius:8px;font-size:28px;font-weight:bold;letter-spacing:2px;">MRO</div><h1 style="color:#000;margin:15px 0 0;font-size:22px;">Vi que você acessou a página 👀</h1></td></tr><tr><td style="padding:30px;"><p style="font-size:16px;">Olá <strong>${nome || ""}</strong>,</p><p style="font-size:16px;">Notei que você acabou de acessar a página do seu desconto MRO. Que bom te ver por aqui!</p><p style="font-size:16px;">Assista o vídeo até o final — em poucos minutos você vai entender como nossos alunos faturam <strong>R$ 5 mil+/mês</strong> prestando serviço de tráfego para empresas locais.</p><div style="text-align:center;margin:30px 0;"><a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#FFD700,#FFA500);color:#000;text-decoration:none;padding:16px 40px;border-radius:30px;font-size:17px;font-weight:bold;">▶️ VOLTAR PRO VÍDEO</a></div><p style="font-size:13px;color:#666;">Seu desconto está liberado por 48h. Não deixe passar.</p></td></tr><tr><td style="background:#1a1a1a;padding:18px;text-align:center;color:#999;font-size:12px;">© 2026 MRO</td></tr></table></body></html>`,
      },
      "25": {
        subject: "🎬 Continua o vídeo — a melhor parte é depois dos 50%",
        html: (nome, link) => `<!DOCTYPE html><html><body style="margin:0;font-family:Arial,sans-serif;background:#f4f4f4;color:#222;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;"><tr><td style="background:#0ea5e9;padding:28px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:22px;">Você assistiu 25% — continue!</h1></td></tr><tr><td style="padding:30px;"><p style="font-size:16px;">Olá <strong>${nome || ""}</strong>,</p><p style="font-size:16px;">Você começou a assistir o vídeo do seu desconto, mas parou cedo. A parte mais importante (o passo a passo de como faturar R$ 5 mil/mês) vem <strong>depois dos 50%</strong>.</p><p style="font-size:16px;">Se você ainda não fatura R$ 5 mil/mês como prestador de serviço, esses minutos podem virar o jogo pra você.</p><div style="text-align:center;margin:30px 0;"><a href="${link}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:16px 40px;border-radius:30px;font-size:17px;font-weight:bold;">▶️ CONTINUAR ASSISTINDO</a></div><p style="font-size:13px;color:#666;">Seu desconto de R$ 397 → R$ 300 expira em 48h.</p></td></tr><tr><td style="background:#1a1a1a;padding:18px;text-align:center;color:#999;font-size:12px;">© 2026 MRO</td></tr></table></body></html>`,
      },
      "50": {
        subject: "🔥 Você passou da metade — vai garantir seu desconto?",
        html: (nome, link) => `<!DOCTYPE html><html><body style="margin:0;font-family:Arial,sans-serif;background:#f4f4f4;color:#222;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;"><tr><td style="background:linear-gradient(135deg,#f59e0b,#dc2626);padding:28px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:22px;">Metade do vídeo concluída 🔥</h1></td></tr><tr><td style="padding:30px;"><p style="font-size:16px;"><strong>${nome || ""}</strong>, você passou dos 50% — sinal que tá curtindo o conteúdo.</p><p style="font-size:16px;">A oferta é simples: a Ferramenta MRO de <strong>R$ 397/ano por R$ 300/ano</strong>, liberada por <strong>48 horas</strong> apenas pra quem acessou essa página.</p><p style="font-size:16px;">Se você não fatura ainda R$ 5 mil/mês, esse desconto faz total diferença — você economiza e ainda recebe o método completo de prestação de serviço para empresas.</p><div style="text-align:center;margin:30px 0;"><a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#dc2626);color:#fff;text-decoration:none;padding:16px 40px;border-radius:30px;font-size:17px;font-weight:bold;">🔓 GARANTIR DESCONTO</a></div></td></tr><tr><td style="background:#1a1a1a;padding:18px;text-align:center;color:#999;font-size:12px;">© 2026 MRO</td></tr></table></body></html>`,
      },
      "100": {
        subject: "✅ Você assistiu tudo — agora é hora de garantir",
        html: (nome, link) => `<!DOCTYPE html><html><body style="margin:0;font-family:Arial,sans-serif;background:#f4f4f4;color:#222;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;"><tr><td style="background:linear-gradient(135deg,#10b981,#059669);padding:28px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:22px;">Você assistiu 100% do vídeo ✅</h1></td></tr><tr><td style="padding:30px;"><p style="font-size:16px;"><strong>${nome || ""}</strong>, mostrou interesse real — assistiu o vídeo inteiro.</p><p style="font-size:16px;">Esse é o momento de agir. Seu desconto exclusivo de <strong>R$ 397 → R$ 300/ano</strong> está liberado por <strong>48 horas</strong> e não vamos abrir de novo.</p><p style="font-size:16px;">Nossos alunos que pagam o valor cheio também faturam — mas quem entra pelo desconto começa com vantagem. Aproveite.</p><div style="text-align:center;margin:30px 0;"><a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;text-decoration:none;padding:16px 40px;border-radius:30px;font-size:17px;font-weight:bold;">💸 GARANTIR MEU DESCONTO</a></div></td></tr><tr><td style="background:#1a1a1a;padding:18px;text-align:center;color:#999;font-size:12px;">© 2026 MRO</td></tr></table></body></html>`,
      },
      abandon: {
        subject: "⏰ Você saiu sem terminar — seu desconto ainda tá ativo",
        html: (nome, link) => `<!DOCTYPE html><html><body style="margin:0;font-family:Arial,sans-serif;background:#f4f4f4;color:#222;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;"><tr><td style="background:#1f2937;padding:28px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:22px;">Você saiu sem terminar o vídeo</h1></td></tr><tr><td style="padding:30px;"><p style="font-size:16px;">Olá <strong>${nome || ""}</strong>,</p><p style="font-size:16px;">Reparei que você não terminou de assistir — sem problema, acontece. Mas se você ainda não fatura R$ 5 mil/mês prestando serviço, vale muito a pena terminar.</p><p style="font-size:16px;">Seu desconto de <strong>R$ 397 → R$ 300/ano</strong> foi liberado por <strong>48 horas</strong> e ainda está válido. Quando passar, o valor volta ao normal.</p><div style="text-align:center;margin:30px 0;"><a href="${link}" style="display:inline-block;background:#FFD700;color:#000;text-decoration:none;padding:16px 40px;border-radius:30px;font-size:17px;font-weight:bold;">▶️ TERMINAR O VÍDEO</a></div></td></tr><tr><td style="background:#1a1a1a;padding:18px;text-align:center;color:#999;font-size:12px;">© 2026 MRO</td></tr></table></body></html>`,
      },
    };

    const sendVideoMilestoneEmail = async (kind: string, email: string, nome: string) => {
      const tpl = VIDEO_EMAIL_TEMPLATES[kind];
      if (!tpl) return false;
      const { data: lead } = await supabase
        .from("estrutura4_discount_leads")
        .select("token, source")
        .eq("email", email)
        .maybeSingle();
      const link = lead?.token
        ? buildDiscountLink(lead.token, lead.source)
        : `${SITE_URL}${VIDEO_DISCOUNT_PATH}`;
      return await sendEmail(email, tpl.subject, tpl.html(nome || "", link));
    };

    // After the first video-trigger email is sent (inactivity OR 100%),
    // start the 3 standard followups by enabling remarketing on the lead.
    const startLeadFollowups = async (email: string) => {
      const { data: lead } = await supabase
        .from("estrutura4_discount_leads")
        .select("id, auto_remarketing_enabled, remarketing_stage")
        .eq("email", email)
        .maybeSingle();
      if (!lead) return;
      // Already in the followup flow → don't reset.
      if (lead.auto_remarketing_enabled && (lead.remarketing_stage || 0) >= 1) return;
      await supabase
        .from("estrutura4_discount_leads")
        .update({
          auto_remarketing_enabled: true,
          remarketing_stage: 1,
          next_send_at: scheduleNext(1),
          last_email_sent_at: new Date().toISOString(),
        })
        .eq("id", lead.id);
    };


    if (action === "track_video_access") {
      const email = String(body.email || "").trim().toLowerCase();
      const nome = String(body.nome || "").trim();
      if (!email) return new Response(JSON.stringify({ ok: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: existing } = await supabase
        .from("estrutura4_discount_video_log")
        .select("id, milestones_sent")
        .eq("email", email)
        .maybeSingle();
      const now = new Date().toISOString();
      if (!existing) {
        await supabase.from("estrutura4_discount_video_log").insert({
          email, nome: nome || null, accessed_at: now, last_progress_at: now,
          last_milestone: "access", milestones_sent: { access: now },
        });
        await sendVideoMilestoneEmail("access", email, nome);
      } else {
        const sent = (existing.milestones_sent as any) || {};
        await supabase.from("estrutura4_discount_video_log")
          .update({ last_progress_at: now, accessed_at: now, abandoned_email_sent_at: null })
          .eq("id", existing.id);
        if (!sent.access) {
          await supabase.from("estrutura4_discount_video_log")
            .update({ milestones_sent: { ...sent, access: now } })
            .eq("id", existing.id);
          await sendVideoMilestoneEmail("access", email, nome);
        }
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "track_video_milestone") {
      const email = String(body.email || "").trim().toLowerCase();
      const milestone = String(body.milestone || ""); // "25" | "50" | "75" | "100"
      const nome = String(body.nome || "").trim();
      if (!email || !["25", "50", "75", "100"].includes(milestone)) {
        return new Response(JSON.stringify({ ok: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: existing } = await supabase
        .from("estrutura4_discount_video_log")
        .select("id, milestones_sent, nome, last_milestone")
        .eq("email", email)
        .maybeSingle();
      const now = new Date().toISOString();
      const useNome = nome || existing?.nome || "";

      // Only "100" sends email immediately (user finished). 25/50/75 are recorded
      // but the email only fires from the abandon queue (after inactivity).
      const shouldSendNow = milestone === "100";

      if (!existing) {
        const milestonesSent: Record<string, string> = { [milestone]: now };
        await supabase.from("estrutura4_discount_video_log").insert({
          email, nome: useNome || null,
          accessed_at: now, last_progress_at: now,
          last_milestone: milestone, milestones_sent: milestonesSent,
          abandoned_email_sent_at: shouldSendNow ? now : null,
        });
        if (shouldSendNow) {
          await sendVideoMilestoneEmail("100", email, useNome);
          await startLeadFollowups(email);
        }

      } else {
        const sent = (existing.milestones_sent as any) || {};
        const newSent = { ...sent, [milestone]: sent[milestone] || now };
        const alreadySent100 = !!sent["100"];
        await supabase.from("estrutura4_discount_video_log")
          .update({
            last_progress_at: now,
            last_milestone: milestone,
            milestones_sent: newSent,
            // Reset abandon flag only when user is still progressing (not 100%)
            ...(shouldSendNow
              ? (alreadySent100 ? {} : { abandoned_email_sent_at: now })
              : { abandoned_email_sent_at: null }),
          })
          .eq("id", existing.id);
        if (shouldSendNow && !alreadySent100) {
          await sendVideoMilestoneEmail("100", email, useNome);
          await startLeadFollowups(email);
        }

      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "process_video_abandon_queue") {
      const provided = String(body.cron_secret || "");
      if (provided !== CRON_SECRET) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // 15min of inactivity AND no inactivity email sent yet AND didn't complete.
      const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: rows } = await supabase
        .from("estrutura4_discount_video_log")
        .select("id, email, nome, milestones_sent, last_milestone")
        .lt("last_progress_at", cutoff)
        .is("abandoned_email_sent_at", null)
        .neq("last_milestone", "100")
        .limit(50);
      let sentCount = 0;
      for (const r of rows || []) {
        // Pick template based on the furthest milestone actually reached.
        const sent = (r.milestones_sent as any) || {};
        let kind = "abandon";
        if (sent["75"] || r.last_milestone === "75") kind = "50";
        else if (sent["50"] || r.last_milestone === "50") kind = "50";
        else if (sent["25"] || r.last_milestone === "25") kind = "25";
        // If they only accessed (no milestone) → "abandon"
        const ok = await sendVideoMilestoneEmail(kind, r.email, r.nome || "");
        if (ok) await startLeadFollowups(r.email);

        await supabase.from("estrutura4_discount_video_log")
          .update({
            abandoned_email_sent_at: new Date().toISOString(),
            milestones_sent: { ...sent, [`inactivity_${kind}`]: new Date().toISOString() },
          })
          .eq("id", r.id);
        if (ok) sentCount++;
        await new Promise((res) => setTimeout(res, 1200));
      }
      return new Response(JSON.stringify({ ok: true, processed: rows?.length || 0, sent: sentCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    if (action === "admin_video_access_list") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ success: false, error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data } = await supabase
        .from("estrutura4_discount_video_log")
        .select("*")
        .order("last_progress_at", { ascending: false })
        .limit(500);
      const rows = data || [];
      const emails = Array.from(new Set(rows.map((r: any) => String(r.email || "").toLowerCase()).filter(Boolean)));
      let whatsappMap: Record<string, string> = {};
      if (emails.length > 0) {
        const { data: leads } = await supabase
          .from("estrutura4_discount_leads")
          .select("email, whatsapp")
          .in("email", emails);
        for (const l of (leads || []) as any[]) {
          if (l?.email && l?.whatsapp) whatsappMap[String(l.email).toLowerCase()] = l.whatsapp;
        }
      }
      const enriched = rows.map((r: any) => ({ ...r, whatsapp: whatsappMap[String(r.email || "").toLowerCase()] || null }));
      return new Response(JSON.stringify({ success: true, rows: enriched }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log("error", { error: e instanceof Error ? e.message : String(e) });
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
