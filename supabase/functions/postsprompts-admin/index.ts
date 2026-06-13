import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "mro@gmail.com";
const ADMIN_PASSWORD = "Ga145523@";

const KIWIFY_TOKEN = Deno.env.get("KIWIFY_WEBHOOK_TOKEN") || "mroposts2026";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sendAccessEmail(email: string, name?: string | null) {
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  if (!smtpPassword) {
    console.error("SMTP_PASSWORD not configured");
    return { ok: false, error: "SMTP não configurado" };
  }

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

  const accessUrl = "https://ig-mro-boost.lovable.app/postsprompts";
  const greeting = name ? `Olá ${name},` : "Olá,";

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;color:#e2e8f0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#1e293b;border-radius:12px;padding:36px;border:1px solid #334155;">
<tr><td align="center" style="padding-bottom:24px;">
<h1 style="margin:0;color:#fff;font-size:28px;">MRO<span style="color:#a78bfa;">IMAGEM PRO</span></h1>
<p style="color:#94a3b8;margin:8px 0 0;">Inteligência Criadora de Posts</p>
</td></tr>
<tr><td>
<h2 style="color:#fff;font-size:22px;">${greeting}</h2>
<p style="color:#cbd5e1;font-size:16px;line-height:1.6;">Seu pagamento foi confirmado! Você agora tem acesso <strong style="color:#a78bfa;">VITALÍCIO</strong> ao MROIMAGEM PRO.</p>
<p style="color:#cbd5e1;font-size:16px;line-height:1.6;">Para acessar, basta entrar na área de membros com o e-mail desta compra:</p>
<div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
<div style="color:#94a3b8;font-size:13px;">SEU E-MAIL DE ACESSO</div>
<div style="color:#a78bfa;font-size:18px;font-weight:bold;margin-top:6px;">${email}</div>
</div>
<div style="text-align:center;margin:30px 0;">
<a href="${accessUrl}" style="display:inline-block;background:linear-gradient(90deg,#9333ea,#db2777);color:#fff;padding:16px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;">Acessar Área de Membros</a>
</div>
<p style="color:#94a3b8;font-size:14px;">Ou copie o link: <a href="${accessUrl}" style="color:#a78bfa;">${accessUrl}</a></p>
<hr style="border:none;border-top:1px solid #334155;margin:28px 0;"/>
<p style="color:#64748b;font-size:13px;">Dúvidas? Responda este e-mail. Suporte: suporte@maisresultadosonline.com.br</p>
</td></tr>
</table>
</td></tr></table></body></html>`;

  try {
    await client.send({
      from: "MRO - Mais Resultados Online <suporte@maisresultadosonline.com.br>",
      to: email,
      subject: "✅ Seu acesso ao MROIMAGEM PRO está liberado!",
      content: "Acesse: " + accessUrl,
      html,
    });
    await client.close();
    return { ok: true };
  } catch (e) {
    try { await client.close(); } catch {}
    console.error("SMTP send failed", e);
    return { ok: false, error: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ===== PUBLIC ACTIONS =====
    if (action === "check_access") {
      const email = (body.email || "").toString().trim().toLowerCase();
      if (!email) return json({ allowed: false, error: "Email obrigatório" });
      const { data } = await supabase
        .from("postsprompts_buyers")
        .select("email,status,name")
        .eq("email", email)
        .maybeSingle();
      return json({ allowed: !!data && data.status === "active", buyer: data || null });
    }

    // Internal: invoked by kiwify-webhook (uses service role)
    if (action === "send_access_internal") {
      const email = (body.email || "").toString().trim().toLowerCase();
      const result = await sendAccessEmail(email, body.name);
      return json({ success: result.ok, error: result.error });
    }

    // ===== ADMIN AUTH =====
    if (action === "login") {
      const ok =
        body.email?.trim().toLowerCase() === ADMIN_EMAIL && body.password === ADMIN_PASSWORD;
      return json({ success: ok });
    }

    if (body.email?.trim().toLowerCase() !== ADMIN_EMAIL || body.password !== ADMIN_PASSWORD) {
      return json({ error: "Unauthorized" }, 401);
    }

    // ===== ADMIN-ONLY ACTIONS =====
    if (action === "get") {
      const { data } = await supabase
        .from("postsprompts_settings")
        .select("openai_api_key")
        .limit(1)
        .maybeSingle();
      const key = data?.openai_api_key || "";
      const masked = key ? key.slice(0, 7) + "..." + key.slice(-4) : "";
      return json({ hasKey: !!key, masked });
    }

    if (action === "save") {
      const { data: existing } = await supabase
        .from("postsprompts_settings")
        .select("id")
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        await supabase
          .from("postsprompts_settings")
          .update({ openai_api_key: body.openai_api_key, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("postsprompts_settings").insert({ openai_api_key: body.openai_api_key });
      }
      return json({ success: true });
    }

    if (action === "list_buyers") {
      const { data } = await supabase
        .from("postsprompts_buyers")
        .select("*")
        .order("created_at", { ascending: false });
      return json({ buyers: data || [] });
    }

    if (action === "add_buyer") {
      const email = (body.buyer_email || "").toString().trim().toLowerCase();
      if (!email) return json({ error: "Email obrigatório" }, 400);
      const { error } = await supabase.from("postsprompts_buyers").upsert(
        {
          email,
          name: body.buyer_name || null,
          status: "active",
          source: "manual",
          kiwify_event: "manual_add",
          last_event_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      );
      if (error) return json({ error: error.message }, 500);
      if (body.send_email) {
        const r = await sendAccessEmail(email, body.buyer_name);
        return json({ success: true, email_sent: r.ok, email_error: r.error });
      }
      return json({ success: true });
    }

    if (action === "remove_buyer") {
      const email = (body.buyer_email || "").toString().trim().toLowerCase();
      await supabase.from("postsprompts_buyers").delete().eq("email", email);
      return json({ success: true });
    }

    if (action === "send_access") {
      const email = (body.buyer_email || "").toString().trim().toLowerCase();
      const { data: buyer } = await supabase
        .from("postsprompts_buyers")
        .select("name")
        .eq("email", email)
        .maybeSingle();
      const r = await sendAccessEmail(email, buyer?.name);
      return json({ success: r.ok, error: r.error });
    }

    if (action === "webhook_info") {
      const projectRef = "adljdeekwifwcdcgbpit";
      const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/kiwify-webhook?token=${KIWIFY_TOKEN}`;
      return json({ url: webhookUrl, token: KIWIFY_TOKEN });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
