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
const SITE_URL = "https://maisresultadosonline.com.br";

const log = (msg: string, data?: unknown) =>
  console.log(`[ESTRUTURA4-DISCOUNT] ${msg}`, data ? JSON.stringify(data) : "");

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
      subject,
      content: "auto",
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
        .select("id, token, expires_at, emails_sent_count")
        .eq("email", email)
        .maybeSingle();

      let leadId: string;
      let finalToken: string;
      let finalExpires: string;

      if (existing) {
        finalToken = existing.token;
        finalExpires = existing.expires_at;
        const expired = new Date(existing.expires_at).getTime() < Date.now();
        if (expired) {
          finalToken = token;
          finalExpires = expiresAt;
        }
        const { error: upErr } = await supabase
          .from("estrutura4_discount_leads")
          .update({
            nome,
            whatsapp,
            token: finalToken,
            expires_at: finalExpires,
            emails_sent_count: (existing.emails_sent_count || 0) + 1,
            last_email_sent_at: new Date().toISOString(),
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
            source: body.source || "estruturarendaextra4",
          })
          .select("id")
          .single();
        if (insErr) throw insErr;
        leadId = ins.id;
      }

      const hoursLeft = Math.max(1, Math.floor((new Date(finalExpires).getTime() - Date.now()) / 3600000));
      const link = `${SITE_URL}${DISCOUNT_PATH}?token=${finalToken}`;
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
      const { data } = await supabase
        .from("estrutura4_discount_leads")
        .select("token, nome, expires_at")
        .eq("email", email)
        .maybeSingle();
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
