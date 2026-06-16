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
const SITE_URL = "https://maisresultadosonline.com.br";
const PAGE_PATH = "/instagrammnew";
const CRON_SECRET = "instagrammnew-cron-2026-secure";

// Follow-up offsets in hours from previous send.
// Stage 1 = welcome (initial). 2..6 = sequence
//   2: +4h  benefit
//   3: +8h  sales call
//   4: +8h  sales call 2  (cumulative ~20h since welcome → "dentro de 24h")
//   5: +144h (6d) reinforcement (~1 week)
//   6: +192h (8d) discount (~15 days)
const FOLLOWUP_OFFSETS_H = [4, 8, 8, 144, 192];

const log = (m: string, d?: unknown) =>
  console.log(`[INSTAGRAMMNEW] ${m}`, d ? JSON.stringify(d) : "");

const sendEmail = async (to: string, subject: string, html: string) => {
  const pwd = Deno.env.get("SMTP_PASSWORD");
  if (!pwd) { log("no SMTP_PASSWORD"); return false; }
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
      from: "MRO Sistema <suporte@maisresultadosonline.com.br>",
      to, subject, content: "auto", html,
    });
    await client.close();
    return true;
  } catch (e) {
    log("smtp error", { error: e instanceof Error ? e.message : String(e) });
    return false;
  }
};

const buildLink = (token: string) => `${SITE_URL}${PAGE_PATH}?token=${token}`;

const baseHtml = (title: string, bodyHtml: string, ctaLabel: string, link: string, color = "#7c3aed") => `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;color:#222;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;">
<tr><td style="background:linear-gradient(135deg,${color},#111);padding:30px;text-align:center;">
<div style="background:#000;color:#fff;display:inline-block;padding:10px 25px;border-radius:8px;font-size:28px;font-weight:bold;letter-spacing:2px;">MRO</div>
<h1 style="color:#fff;margin:15px 0 0;font-size:22px;">${title}</h1>
</td></tr>
<tr><td style="padding:30px;font-size:15px;line-height:1.6;">${bodyHtml}
<div style="text-align:center;margin:35px 0;">
<a href="${link}" style="display:inline-block;background:linear-gradient(135deg,${color},#111);color:#fff;text-decoration:none;padding:16px 40px;border-radius:30px;font-size:17px;font-weight:bold;">${ctaLabel}</a>
</div></td></tr>
<tr><td style="background:#1a1a1a;padding:18px;text-align:center;color:#999;font-size:12px;">© 2026 MRO - Sistema de Prospecção</td></tr>
</table></body></html>`;

const WELCOME = (nome: string, link: string) => baseHtml(
  "🚀 Acesso liberado — Sistema MRO",
  `<p>Olá <strong>${nome}</strong>,</p>
   <p>Seu acesso ao <strong>Sistema MRO</strong> foi liberado. Com ele você consegue mais vendas, clientes e engajamento usando <strong>prospecção ativa</strong> — sem precisar gastar nenhum real com anúncios.</p>
   <p>Assista a aula completa pelo botão abaixo e veja como nossos clientes estão escalando o Instagram puxando público diretamente do concorrente.</p>`,
  "▶️ ASSISTIR AGORA", link, "#7c3aed",
);

const FOLLOWUPS: Array<{ subject: string; build: (n: string, l: string) => string }> = [
  // stage 2 — benefit 2
  {
    subject: "💡 Por que o MRO bate qualquer estratégia de anúncio",
    build: (n, l) => baseHtml(
      "Pare de gastar com anúncios",
      `<p><strong>${n}</strong>, lembra do sistema MRO que você liberou?</p>
       <p>Enquanto anúncios pagos sobem cada vez mais de preço, com o MRO você faz <strong>prospecção ativa</strong> 24h por dia — curte, segue e interage com a audiência certa do seu concorrente.</p>
       <p>Resultado: clientes chegam no seu Direct sem você pagar nada por isso.</p>`,
      "▶️ VER A AULA", l, "#0ea5e9",
    ),
  },
  // stage 3 — sales 1
  {
    subject: "🔥 Vai aumentar suas vendas: pega o sistema agora",
    build: (n, l) => baseHtml(
      "Hora de virar a chave",
      `<p><strong>${n}</strong>, você já viu a proposta do MRO.</p>
       <p>Quem usa começa a colher clientes <strong>na primeira semana</strong> — porque a ferramenta puxa público qualificado direto do concorrente para o seu perfil.</p>
       <p>Garanta seu acesso e comece hoje:</p>`,
      "🚀 QUERO ACESSAR O SISTEMA", l, "#f59e0b",
    ),
  },
  // stage 4 — sales 2
  {
    subject: "⚡ Roubando o público do concorrente — você dentro?",
    build: (n, l) => baseHtml(
      "Seu concorrente está perdendo seguidores pra você",
      `<p><strong>${n}</strong>, o MRO trabalha pra você enquanto dorme.</p>
       <p>Imagina acordar com <strong>perfis novos</strong> falando contigo no Direct todos os dias — alunos que já usam relatam isso.</p>
       <p>Aproveita e libera seu acesso agora mesmo:</p>`,
      "💼 LIBERAR MEU ACESSO", l, "#dc2626",
    ),
  },
  // stage 5 — reinforcement (~1 week)
  {
    subject: "📈 Investindo pouco, vendendo muito — case real",
    build: (n, l) => baseHtml(
      "Mais vendas, com pouco investimento",
      `<p><strong>${n}</strong>, faz uma semana que liberamos pra você o acesso ao MRO.</p>
       <p>Com um <strong>investimento muito pequeno</strong> (menor que 1 anúncio patrocinado de R$ 200), você tem o sistema rodando o ano inteiro trazendo público qualificado.</p>
       <p>Se aumentar suas vendas é prioridade, esse é o caminho.</p>`,
      "💸 ATIVAR MEU MRO", l, "#10b981",
    ),
  },
  // stage 6 — discount (~15 days)
  {
    subject: "🎁 Liberei um desconto exclusivo pra você",
    build: (n, l) => baseHtml(
      "Última chamada — desconto pra fechar",
      `<p><strong>${n}</strong>, vi que você ainda não pegou o MRO.</p>
       <p>Como você está na nossa base, vou liberar um <strong>desconto especial</strong> hoje. É a oportunidade pra entrar e parar de depender de anúncios pagos pra vender.</p>
       <p>Fala comigo pelo botão abaixo pra eu te passar o cupom:</p>`,
      "🎟️ QUERO MEU DESCONTO", l, "#ec4899",
    ),
  },
];

const scheduleNext = (stageJustSent: number): string | null => {
  const idx = stageJustSent - 1;
  if (idx < 0 || idx >= FOLLOWUP_OFFSETS_H.length) return null;
  return new Date(Date.now() + FOLLOWUP_OFFSETS_H[idx] * 3600000).toISOString();
};

// Video-access templates (mirror of estrutura4)
const VIDEO_TPL: Record<string, { subject: string; html: (n: string, l: string) => string }> = {
  access: {
    subject: "👀 Vi que você acessou o sistema MRO",
    html: (n, l) => baseHtml("Você acabou de entrar 👀",
      `<p>Olá <strong>${n}</strong>, notei que você acessou a aula do <strong>Sistema MRO</strong>.</p>
       <p>Assista até o final — em poucos minutos você vai entender como nossos clientes batem mais vendas <strong>sem gastar com anúncios</strong>.</p>`,
      "▶️ VOLTAR PRO VÍDEO", l, "#7c3aed"),
  },
  "25": {
    subject: "🎬 Continue assistindo — a parte boa começa agora",
    html: (n, l) => baseHtml("Você assistiu 25% — continue!",
      `<p><strong>${n}</strong>, você começou a aula mas parou cedo. A parte que mostra o passo a passo da prospecção ativa vem depois dos 50%.</p>`,
      "▶️ CONTINUAR ASSISTINDO", l, "#0ea5e9"),
  },
  "50": {
    subject: "🔥 Passou da metade — vai garantir seu MRO?",
    html: (n, l) => baseHtml("Metade do vídeo concluída 🔥",
      `<p><strong>${n}</strong>, você passou dos 50% — sinal que tá curtindo o conteúdo. Libera teu acesso ao sistema MRO e começa hoje a trazer público do concorrente.</p>`,
      "🔓 LIBERAR ACESSO", l, "#f59e0b"),
  },
  "100": {
    subject: "✅ Assistiu tudo — bora ativar o sistema?",
    html: (n, l) => baseHtml("Você assistiu 100% ✅",
      `<p><strong>${n}</strong>, você mostrou interesse real — assistiu a aula inteira. Esse é o momento certo pra ativar o MRO e começar a vender mais sem depender de anúncios.</p>`,
      "💸 ATIVAR MEU MRO", l, "#10b981"),
  },
  abandon: {
    subject: "⏰ Você saiu sem terminar — o acesso ainda tá ativo",
    html: (n, l) => baseHtml("Você não terminou a aula",
      `<p>Olá <strong>${n}</strong>, sem problema — acontece. Mas se você quer mesmo aumentar suas vendas sem gastar com anúncios, vale terminar de assistir.</p>`,
      "▶️ TERMINAR AULA", l, "#1f2937"),
  },
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
    const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const requireAdmin = () => {
      const e = String(body.email || "").trim().toLowerCase();
      const p = String(body.password || "");
      return e === ADMIN_EMAIL && p === ADMIN_PASSWORD;
    };

    if (action === "create_lead") {
      const nome = String(body.nome || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const whatsapp = String(body.whatsapp || "").trim();
      if (!nome || !email || !whatsapp) return json({ success: false, error: "Campos obrigatórios" }, 400);

      const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const expiresAt = new Date(Date.now() + 30 * 24 * 3600000).toISOString(); // 30d access
      const source = String(body.source || "instagrammnew");

      const { data: existing } = await supabase
        .from("instagrammnew_leads")
        .select("id, token, expires_at, emails_sent_count")
        .eq("email", email)
        .maybeSingle();

      let finalToken = token, finalExpires = expiresAt, leadId: string;
      if (existing) {
        finalToken = existing.token;
        finalExpires = existing.expires_at;
        if (new Date(existing.expires_at).getTime() < Date.now()) { finalToken = token; finalExpires = expiresAt; }
        await supabase.from("instagrammnew_leads").update({
          nome, whatsapp, token: finalToken, expires_at: finalExpires,
          source, emails_sent_count: (existing.emails_sent_count || 0) + 1,
          last_email_sent_at: new Date().toISOString(),
          auto_remarketing_enabled: true, remarketing_stage: 1,
          next_send_at: scheduleNext(1),
        }).eq("id", existing.id);
        leadId = existing.id;
      } else {
        const { data: ins, error } = await supabase.from("instagrammnew_leads").insert({
          nome, email, whatsapp, token: finalToken, expires_at: finalExpires,
          emails_sent_count: 1, last_email_sent_at: new Date().toISOString(),
          source, auto_remarketing_enabled: true, remarketing_stage: 1,
          next_send_at: scheduleNext(1),
        }).select("id").single();
        if (error) throw error;
        leadId = ins.id;
      }

      const link = buildLink(finalToken);
      const sent = await sendEmail(email, "🚀 Acesso liberado — Sistema MRO", WELCOME(nome, link));
      return json({ success: true, leadId, sent, link });
    }

    if (action === "verify_token") {
      const token = String(body.token || "");
      if (!token) return json({ valid: false });
      const { data } = await supabase.from("instagrammnew_leads")
        .select("email, nome, whatsapp, expires_at").eq("token", token).maybeSingle();
      if (!data) return json({ valid: false });
      if (new Date(data.expires_at).getTime() < Date.now()) return json({ valid: false, expired: true });
      await supabase.from("instagrammnew_leads").update({ accessed_page_at: new Date().toISOString() }).eq("token", token);
      return json({ valid: true, email: data.email, nome: data.nome, whatsapp: data.whatsapp });
    }

    if (action === "verify_email") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!email) return json({ valid: false });
      const { data } = await supabase.from("instagrammnew_leads")
        .select("token, nome, whatsapp, expires_at").eq("email", email).maybeSingle();
      if (!data) return json({ valid: false, notfound: true });
      if (new Date(data.expires_at).getTime() < Date.now()) return json({ valid: false, expired: true });
      await supabase.from("instagrammnew_leads").update({ accessed_page_at: new Date().toISOString() }).eq("email", email);
      return json({ valid: true, token: data.token, nome: data.nome, whatsapp: data.whatsapp });
    }

    if (action === "get_video") {
      const { data } = await supabase.from("instagrammnew_settings")
        .select("video_url, hls_url, video_title")
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();
      return json({ video_url: data?.video_url || null, hls_url: data?.hls_url || null, video_title: data?.video_title || null });
    }

    if (action === "set_video") {
      if (!requireAdmin()) return json({ success: false, error: "Não autorizado" }, 401);
      const video_url = body.video_url ? String(body.video_url) : null;
      const hls_url = body.hls_url ? String(body.hls_url) : null;
      const video_title = body.video_title ? String(body.video_title) : null;
      const { data: existing } = await supabase.from("instagrammnew_settings")
        .select("id").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (existing) {
        await supabase.from("instagrammnew_settings").update({ video_url, hls_url, video_title, updated_at: new Date().toISOString() }).eq("id", existing.id);
      } else {
        await supabase.from("instagrammnew_settings").insert({ video_url, hls_url, video_title, is_active: true });
      }
      return json({ success: true });
    }

    if (action === "admin_list") {
      if (!requireAdmin()) return json({ success: false, error: "Não autorizado" }, 401);
      const { data: leads } = await supabase.from("instagrammnew_leads")
        .select("*").order("created_at", { ascending: false }).limit(1000);
      const { data: videoLog } = await supabase.from("instagrammnew_video_log")
        .select("*").order("last_progress_at", { ascending: false }).limit(1000);
      const emails = (leads || []).map((l: any) => String(l.email).toLowerCase()).filter(Boolean);
      let purchases: any[] = [];
      if (emails.length > 0) {
        const { data: paid } = await supabase.from("paid_users")
          .select("email, username, subscription_status, subscription_end, created_at").in("email", emails);
        purchases = (paid || []).filter((p: any) =>
          ["active", "paid", "approved", "confirmed"].includes(String(p.subscription_status || "").toLowerCase())
          || (p.subscription_end && new Date(p.subscription_end).getTime() > Date.now()));
      }
      // enrich video log with whatsapp
      const waMap: Record<string, string> = {};
      for (const l of (leads || []) as any[]) if (l?.email && l?.whatsapp) waMap[String(l.email).toLowerCase()] = l.whatsapp;
      const videoEnriched = (videoLog || []).map((r: any) => ({ ...r, whatsapp: waMap[String(r.email || "").toLowerCase()] || null }));
      return json({ success: true, leads: leads || [], video_log: videoEnriched, purchases });
    }

    if (action === "admin_login") {
      if (!requireAdmin()) return json({ success: false, error: "Credenciais inválidas" }, 401);
      return json({ success: true, token: btoa(`${ADMIN_EMAIL}:${Date.now()}`) });
    }

    if (action === "track_video_access") {
      const email = String(body.email || "").trim().toLowerCase();
      const nome = String(body.nome || "").trim();
      if (!email) return json({ ok: false });
      const { data: existing } = await supabase.from("instagrammnew_video_log")
        .select("id, milestones_sent").eq("email", email).maybeSingle();
      const now = new Date().toISOString();
      if (!existing) {
        await supabase.from("instagrammnew_video_log").insert({
          email, nome: nome || null, accessed_at: now, last_progress_at: now,
          last_milestone: "access", milestones_sent: { access: now },
        });
        const link = await buildLinkForEmail(supabase, email);
        await sendEmail(email, VIDEO_TPL.access.subject, VIDEO_TPL.access.html(nome, link));
      } else {
        const sent = (existing.milestones_sent as any) || {};
        await supabase.from("instagrammnew_video_log")
          .update({ last_progress_at: now, accessed_at: now, abandoned_email_sent_at: null }).eq("id", existing.id);
        if (!sent.access) {
          await supabase.from("instagrammnew_video_log")
            .update({ milestones_sent: { ...sent, access: now } }).eq("id", existing.id);
          const link = await buildLinkForEmail(supabase, email);
          await sendEmail(email, VIDEO_TPL.access.subject, VIDEO_TPL.access.html(nome, link));
        }
      }
      return json({ ok: true });
    }

    if (action === "track_video_milestone") {
      const email = String(body.email || "").trim().toLowerCase();
      const milestone = String(body.milestone || "");
      const nome = String(body.nome || "").trim();
      if (!email || !["25", "50", "75", "100"].includes(milestone)) return json({ ok: false });
      const { data: existing } = await supabase.from("instagrammnew_video_log")
        .select("id, milestones_sent, nome").eq("email", email).maybeSingle();
      const now = new Date().toISOString();
      const useNome = nome || existing?.nome || "";
      const shouldSendNow = milestone === "100";
      if (!existing) {
        await supabase.from("instagrammnew_video_log").insert({
          email, nome: useNome || null,
          accessed_at: now, last_progress_at: now,
          last_milestone: milestone, milestones_sent: { [milestone]: now },
          abandoned_email_sent_at: shouldSendNow ? now : null,
        });
        if (shouldSendNow) {
          const link = await buildLinkForEmail(supabase, email);
          await sendEmail(email, VIDEO_TPL["100"].subject, VIDEO_TPL["100"].html(useNome, link));
        }
      } else {
        const sent = (existing.milestones_sent as any) || {};
        const newSent = { ...sent, [milestone]: sent[milestone] || now };
        const already100 = !!sent["100"];
        await supabase.from("instagrammnew_video_log").update({
          last_progress_at: now, last_milestone: milestone, milestones_sent: newSent,
          ...(shouldSendNow ? (already100 ? {} : { abandoned_email_sent_at: now }) : { abandoned_email_sent_at: null }),
        }).eq("id", existing.id);
        if (shouldSendNow && !already100) {
          const link = await buildLinkForEmail(supabase, email);
          await sendEmail(email, VIDEO_TPL["100"].subject, VIDEO_TPL["100"].html(useNome, link));
        }
      }
      return json({ ok: true });
    }

    if (action === "process_video_abandon_queue") {
      if (String(body.cron_secret || "") !== CRON_SECRET) return json({ error: "Unauthorized" }, 401);
      const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: rows } = await supabase.from("instagrammnew_video_log")
        .select("id, email, nome, milestones_sent, last_milestone")
        .lt("last_progress_at", cutoff).is("abandoned_email_sent_at", null).neq("last_milestone", "100").limit(50);
      let count = 0;
      for (const r of rows || []) {
        const sent = (r.milestones_sent as any) || {};
        let kind = "abandon";
        if (sent["75"] || r.last_milestone === "75") kind = "50";
        else if (sent["50"] || r.last_milestone === "50") kind = "50";
        else if (sent["25"] || r.last_milestone === "25") kind = "25";
        const link = await buildLinkForEmail(supabase, r.email);
        const tpl = VIDEO_TPL[kind];
        const ok = await sendEmail(r.email, tpl.subject, tpl.html(r.nome || "", link));
        await supabase.from("instagrammnew_video_log").update({
          abandoned_email_sent_at: new Date().toISOString(),
          milestones_sent: { ...sent, [`inactivity_${kind}`]: new Date().toISOString() },
        }).eq("id", r.id);
        if (ok) count++;
        await new Promise((r) => setTimeout(r, 1200));
      }
      return json({ ok: true, processed: rows?.length || 0, sent: count });
    }

    if (action === "process_remarketing_queue") {
      if (String(body.cron_secret || "") !== CRON_SECRET) return json({ error: "Unauthorized" }, 401);
      const nowIso = new Date().toISOString();
      const { data: due } = await supabase.from("instagrammnew_leads")
        .select("id, email, nome, token, expires_at, remarketing_stage")
        .eq("auto_remarketing_enabled", true).lte("next_send_at", nowIso).lt("remarketing_stage", 6)
        .order("next_send_at", { ascending: true }).limit(50);
      const leads = due || [];
      if (leads.length === 0) return json({ success: true, processed: 0 });

      // skip buyers
      const emails = leads.map((l: any) => String(l.email).toLowerCase());
      const paidSet = new Set<string>();
      const { data: paid } = await supabase.from("paid_users").select("email, subscription_status, subscription_end").in("email", emails);
      (paid || []).forEach((p: any) => {
        const active = ["active","paid","approved","confirmed"].includes(String(p.subscription_status||"").toLowerCase())
          || (p.subscription_end && new Date(p.subscription_end).getTime() > Date.now());
        if (active) paidSet.add(String(p.email).toLowerCase());
      });

      let processed = 0;
      for (const lead of leads) {
        const e = String(lead.email).toLowerCase();
        if (paidSet.has(e)) {
          await supabase.from("instagrammnew_leads").update({ auto_remarketing_enabled: false, next_send_at: null }).eq("id", lead.id);
          continue;
        }
        const cur = lead.remarketing_stage || 1;
        const next = cur + 1;
        const tpl = FOLLOWUPS[next - 2];
        if (!tpl) {
          await supabase.from("instagrammnew_leads").update({ auto_remarketing_enabled: false, next_send_at: null }).eq("id", lead.id);
          continue;
        }
        const link = buildLink(lead.token);
        const ok = await sendEmail(e, tpl.subject, tpl.build(lead.nome || "Cliente", link));
        const newNext = scheduleNext(next);
        await supabase.from("instagrammnew_leads").update({
          emails_sent_count: next, remarketing_stage: next,
          last_email_sent_at: new Date().toISOString(),
          next_send_at: newNext, auto_remarketing_enabled: newNext !== null,
        }).eq("id", lead.id);
        if (ok) processed++;
        await new Promise((r) => setTimeout(r, 1500));
      }
      return json({ success: true, processed });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    log("error", { error: e instanceof Error ? e.message : String(e) });
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function buildLinkForEmail(supabase: any, email: string): Promise<string> {
  const { data } = await supabase.from("instagrammnew_leads").select("token").eq("email", email).maybeSingle();
  return data?.token ? buildLink(data.token) : `${SITE_URL}${PAGE_PATH}`;
}
