import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeEmailSubject, htmlToPlainText } from "../_shared/email-encode.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ---------- SquareCloud validation ----------
async function validateSquareCloud(username: string, password: string) {
  try {
    const { data, error } = await supabase.functions.invoke("square-proxy", {
      body: {
        endpoint: "/verificar-numero",
        method: "POST",
        contentType: "form",
        body: `numero=${encodeURIComponent(password)}&nome=${encodeURIComponent(username)}`,
      },
    });
    if (error) return { ok: false, error: "Erro ao validar usuário" };
    const r = data as { senhaCorrespondente?: boolean };
    if (!r?.senhaCorrespondente) return { ok: false, error: "Usuário MRO ou senha incorretos" };
    return { ok: true };
  } catch (_e) {
    return { ok: false, error: "Erro de conexão SquareCloud" };
  }
}

// ---------- Slug ----------
function makeSlug(firstName: string): string {
  const base = firstName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 16) || "afiliado";
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

// ---------- Email ----------
async function sendEmail(to: string, subject: string, html: string) {
  const password = Deno.env.get("SMTP_PASSWORD");
  if (!password) {
    console.error("[afiliadosx] SMTP_PASSWORD ausente");
    return { ok: false };
  }
  const client = new SMTPClient({
    connection: {
      hostname: "smtp.hostinger.com",
      port: 465,
      tls: true,
      auth: { username: "contato@maisresultadosonline.com.br", password },
    },
  });
  try {
    await client.send({
      from: "MRO Afiliados <contato@maisresultadosonline.com.br>",
      to,
      subject: sanitizeEmailSubject(subject),
      content: htmlToPlainText(html),
      html,
    });
    await client.close();
    return { ok: true };
  } catch (e) {
    console.error("[afiliadosx] email error", e);
    try { await client.close(); } catch {}
    return { ok: false };
  }
}

function welcomeEmailHtml(partner: {
  name: string; slug: string; email: string;
}) {
  const base = "https://maisresultadosonline.com.br";
  const linkPromo = `${base}/instagram-nova-promo?ref=${partner.slug}`;
  const linkRenda = `${base}/renda-extra?ref=${partner.slug}`;
  const linkDash  = `${base}/afiliadosx/resumo`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif;color:#fff;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px 0;">
<tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#111;border:1px solid #262626;border-radius:16px;overflow:hidden;">
    <tr><td style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:32px 32px 24px;text-align:center;">
      <h1 style="margin:0;color:#000;font-size:28px;font-weight:900;letter-spacing:-0.5px;">Bem-vindo(a) ao Programa de Afiliados MRO 🎉</h1>
      <p style="margin:8px 0 0;color:#111;font-size:14px;font-weight:600;">R$ 97 de comissão por venda PRO aprovada</p>
    </td></tr>
    <tr><td style="padding:28px 32px;color:#e5e5e5;font-size:15px;line-height:1.6;">
      <p style="margin:0 0 16px;">Olá <strong style="color:#fbbf24;">${partner.name}</strong>, seu cadastro como afiliado(a) foi ativado com sucesso.</p>
      <p style="margin:0 0 16px;">Como você já é cliente MRO Instagram, agora pode divulgar a ferramenta e ganhar <strong style="color:#fbbf24;">R$ 97,00</strong> a cada venda aprovada do plano PRO.</p>

      <div style="background:#0a0a0a;border:1px solid #262626;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 12px;font-size:11px;color:#a3a3a3;text-transform:uppercase;letter-spacing:2px;font-weight:800;">🔗 Seus links de venda</p>
        <p style="margin:0 0 10px;font-size:13px;color:#e5e5e5;"><strong>Link principal (Instagram PRO):</strong><br>
          <a href="${linkPromo}" style="color:#fbbf24;word-break:break-all;">${linkPromo}</a></p>
        <p style="margin:0;font-size:13px;color:#e5e5e5;"><strong>Link Renda Extra:</strong><br>
          <a href="${linkRenda}" style="color:#fbbf24;word-break:break-all;">${linkRenda}</a></p>
      </div>

      <div style="background:#0a0a0a;border:1px solid #262626;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 12px;font-size:11px;color:#a3a3a3;text-transform:uppercase;letter-spacing:2px;font-weight:800;">📊 Painel Dashboard</p>
        <p style="margin:0 0 12px;font-size:14px;color:#e5e5e5;">Acompanhe suas vendas aprovadas, tentativas em tempo real e comissões:</p>
        <p style="margin:0 0 12px;text-align:center;">
          <a href="${linkDash}" style="display:inline-block;background:#fbbf24;color:#000;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:900;text-transform:uppercase;font-size:13px;letter-spacing:1px;">Acessar Dashboard</a>
        </p>
        <p style="margin:12px 0 0;font-size:13px;color:#a3a3a3;">
          <strong style="color:#fbbf24;">Sua senha de acesso é a mesma que você usa hoje no /instagram</strong> (SquareCloud). Basta informar seu email de afiliado <code style="background:#171717;padding:2px 6px;border-radius:4px;color:#fbbf24;">${partner.email}</code> e a mesma senha.
        </p>
      </div>

      <div style="background:#0a0a0a;border:1px solid #262626;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 8px;font-size:11px;color:#a3a3a3;text-transform:uppercase;letter-spacing:2px;font-weight:800;">🔎 100% Transparente</p>
        <p style="margin:0;font-size:13px;color:#e5e5e5;line-height:1.6;">Toda tentativa de compra no seu link aparece em tempo real no seu painel — inclusive as que ainda não foram pagas. Você pode inclusive fazer um teste de compra e ver a tentativa surgindo no dashboard.</p>
      </div>

      <p style="margin:16px 0 0;font-size:13px;color:#a3a3a3;">Este programa é válido apenas para clientes ativos MRO Instagram, pois somente quem já usa a ferramenta consegue divulgar com propriedade. Bom trabalho!</p>
    </td></tr>
    <tr><td style="background:#0a0a0a;padding:20px 32px;text-align:center;color:#525252;font-size:11px;border-top:1px solid #262626;">
      © MRO — Mais Resultados Online · contato@maisresultadosonline.com.br
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

function commissionEmailHtml(name: string, buyerEmail: string, amount: number) {
  const base = "https://maisresultadosonline.com.br";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;color:#fff;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#111;border:1px solid #262626;border-radius:16px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#10b981,#059669);padding:32px;text-align:center;">
  <h1 style="margin:0;color:#fff;font-size:26px;font-weight:900;">💰 Nova comissão aprovada!</h1>
  <p style="margin:10px 0 0;color:#d1fae5;font-size:14px;">Você acaba de receber <strong>R$ ${amount.toFixed(2)}</strong> de comissão</p>
</td></tr>
<tr><td style="padding:28px 32px;color:#e5e5e5;font-size:15px;line-height:1.6;">
  <p>Olá <strong style="color:#10b981;">${name}</strong>, uma venda foi aprovada no seu link de afiliado.</p>
  <div style="background:#0a0a0a;border:1px solid #262626;border-radius:12px;padding:16px;margin:16px 0;">
    <p style="margin:0 0 6px;font-size:12px;color:#a3a3a3;">Cliente</p>
    <p style="margin:0 0 12px;font-size:14px;color:#fff;">${buyerEmail}</p>
    <p style="margin:0 0 6px;font-size:12px;color:#a3a3a3;">Comissão</p>
    <p style="margin:0;font-size:20px;color:#10b981;font-weight:900;">R$ ${amount.toFixed(2)}</p>
  </div>
  <p style="text-align:center;margin:20px 0;">
    <a href="${base}/afiliadosx/resumo" style="display:inline-block;background:#10b981;color:#000;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:900;text-transform:uppercase;font-size:13px;">Ver Dashboard</a>
  </p>
</td></tr>
<tr><td style="background:#0a0a0a;padding:16px;text-align:center;color:#525252;font-size:11px;border-top:1px solid #262626;">© MRO Afiliados</td></tr>
</table></td></tr></table></body></html>`;
}

// ---------- Actions ----------
async function actionRegister(body: any) {
  const first = String(body.first_name || "").trim();
  const last = String(body.last_name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const squarecloud_username = String(body.squarecloud_username || "").trim().toLowerCase();
  const password = String(body.password || "");
  const photo_url = body.photo_url ? String(body.photo_url) : null;
  const show_promo_banner = !!body.show_promo_banner;

  if (!first || !last) return json({ success: false, error: "Nome e sobrenome são obrigatórios" }, 400);
  if (!email.includes("@")) return json({ success: false, error: "Email inválido" }, 400);
  if (!squarecloud_username) return json({ success: false, error: "Usuário MRO é obrigatório" }, 400);
  if (!password || password.length < 3) return json({ success: false, error: "Senha inválida" }, 400);

  const v = await validateSquareCloud(squarecloud_username, password);
  if (!v.ok) return json({ success: false, error: v.error }, 401);

  const { data: existingEmail } = await supabase
    .from("partners").select("id").eq("email", email).maybeSingle();
  if (existingEmail) return json({ success: false, error: "Já existe um afiliado com este email" }, 400);

  const { data: existingSc } = await supabase
    .from("partners").select("id").eq("squarecloud_username", squarecloud_username)
    .eq("source", "afiliadosx").maybeSingle();
  if (existingSc) return json({ success: false, error: "Este usuário MRO já é afiliado" }, 400);

  // Generate unique slug
  let slug = "";
  for (let i = 0; i < 5; i++) {
    slug = makeSlug(first);
    const { data: hit } = await supabase.from("partners").select("id").eq("slug", slug).maybeSingle();
    if (!hit) break;
  }

  const { data: inserted, error: insErr } = await supabase.from("partners").insert({
    name: first,
    last_name: last,
    email,
    slug,
    squarecloud_username,
    password, // stored for legacy; auth uses squarecloud validation
    photo_url,
    show_promo_banner,
    source: "afiliadosx",
    commission_rate: 97, // fixed BRL commission
    status: "active",
  }).select().single();

  if (insErr) {
    console.error("[afiliadosx] insert error", insErr);
    return json({ success: false, error: "Erro ao criar cadastro" }, 500);
  }

  await sendEmail(email, "Bem-vindo(a) ao Programa de Afiliados MRO", welcomeEmailHtml({
    name: first, slug, email,
  }));

  return json({ success: true, partner: inserted });
}

async function actionLogin(body: any) {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) return json({ success: false, error: "Email e senha obrigatórios" }, 400);

  const { data: partner } = await supabase
    .from("partners").select("*").eq("email", email).eq("source", "afiliadosx").maybeSingle();
  if (!partner) return json({ success: false, error: "Afiliado não encontrado" }, 404);

  const v = await validateSquareCloud(partner.squarecloud_username, password);
  if (!v.ok) return json({ success: false, error: v.error }, 401);

  return json({ success: true, partner });
}

async function actionUpdate(body: any) {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const partnerId = String(body.partner_id || "");

  const { data: partner } = await supabase
    .from("partners").select("*").eq("id", partnerId).eq("email", email).eq("source", "afiliadosx").maybeSingle();
  if (!partner) return json({ success: false, error: "Não autorizado" }, 401);

  const v = await validateSquareCloud(partner.squarecloud_username, password);
  if (!v.ok) return json({ success: false, error: v.error }, 401);

  const updates: Record<string, any> = {};
  if (typeof body.first_name === "string") updates.name = body.first_name.trim();
  if (typeof body.last_name === "string") updates.last_name = body.last_name.trim();
  if (typeof body.photo_url === "string" || body.photo_url === null) updates.photo_url = body.photo_url;
  if (typeof body.show_promo_banner === "boolean") updates.show_promo_banner = body.show_promo_banner;

  const { data: updated, error } = await supabase.from("partners").update(updates).eq("id", partnerId).select().single();
  if (error) return json({ success: false, error: error.message }, 500);
  return json({ success: true, partner: updated });
}

async function actionStats(body: any) {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  const { data: partner } = await supabase
    .from("partners").select("*").eq("email", email).eq("source", "afiliadosx").maybeSingle();
  if (!partner) return json({ success: false, error: "Afiliado não encontrado" }, 404);

  const v = await validateSquareCloud(partner.squarecloud_username, password);
  if (!v.ok) return json({ success: false, error: v.error }, 401);

  const [visitsRes, ordersRes] = await Promise.all([
    supabase.from("partner_visits").select("id,created_at,referer,user_agent").eq("partner_id", partner.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("mro_orders").select("id,email,amount,status,created_at,payment_status").eq("partner_id", partner.id).order("created_at", { ascending: false }).limit(100),
  ]);

  const orders = ordersRes.data || [];
  const approved = orders.filter((o: any) => o.status === "paid" || o.payment_status === "paid");
  const attempts = orders.filter((o: any) => !(o.status === "paid" || o.payment_status === "paid"));
  const totalCommission = approved.length * 97;

  return json({
    success: true,
    partner,
    visits: visitsRes.data || [],
    approved,
    attempts,
    total_commission: totalCommission,
    approved_count: approved.length,
    attempts_count: attempts.length,
  });
}

async function actionPublicBanner(body: any) {
  // Public — no auth. Fetch minimal display data by slug for banners.
  const slug = String(body.slug || "").trim().toLowerCase();
  if (!slug) return json({ success: false }, 400);
  const { data } = await supabase
    .from("partners")
    .select("name,last_name,photo_url,show_promo_banner,slug,id,source")
    .eq("slug", slug)
    .maybeSingle();
  if (!data || data.source !== "afiliadosx" || !data.show_promo_banner) {
    return json({ success: false });
  }
  // Fire a visit
  await supabase.from("partner_visits").insert({
    partner_id: data.id,
    referer: body.referer || null,
    user_agent: body.user_agent || null,
    visitor_ip: null,
  });
  return json({
    success: true,
    partner: {
      id: data.id,
      slug: data.slug,
      name: data.name,
      last_name: data.last_name,
      photo_url: data.photo_url,
    },
  });
}

async function actionNotifyCommission(body: any) {
  // Called by admin or webhook — trusted internal use
  const partnerId = String(body.partner_id || "");
  const buyerEmail = String(body.buyer_email || "");
  const amount = Number(body.amount || 97);
  const { data: partner } = await supabase.from("partners").select("*").eq("id", partnerId).maybeSingle();
  if (!partner) return json({ success: false, error: "Partner not found" }, 404);
  await sendEmail(partner.email, "Nova comissao aprovada - R$ 97", commissionEmailHtml(partner.name, buyerEmail, amount));
  return json({ success: true });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    switch (action) {
      case "register": return await actionRegister(body);
      case "login": return await actionLogin(body);
      case "update": return await actionUpdate(body);
      case "stats": return await actionStats(body);
      case "public_banner": return await actionPublicBanner(body);
      case "notify_commission": return await actionNotifyCommission(body);
      default: return json({ success: false, error: "Ação inválida" }, 400);
    }
  } catch (e) {
    console.error("[afiliadosx] fatal", e);
    return json({ success: false, error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});
