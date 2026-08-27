import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { sanitizeEmailSubject, htmlToPlainText } from "../_shared/email-encode.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clean = (v: unknown) => String(v ?? "").replace(/[<>]/g, "").trim();

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
      from: "ZapZap MRO <suporte@maisresultadosonline.com.br>",
      to,
      subject: sanitizeEmailSubject(subject),
      content: htmlToPlainText(html),
      html,
    });
    await client.close();
    return true;
  } catch (e) {
    console.error("[ZAPZAP] smtp err", e);
    return false;
  }
}

function buildHtml(nome: string, link: string) {
  const cta = link
    ? `<div style="text-align:center;margin:28px 0;">
         <a href="${link}" style="display:inline-block;background:#25D366;color:#062e15;text-decoration:none;font-weight:bold;font-size:17px;padding:16px 34px;border-radius:999px;">ENTRAR NO GRUPO DO WHATSAPP</a>
       </div>
       <p style="font-size:13px;color:#94a3b8;text-align:center;word-break:break-all;">${link}</p>`
    : `<p style="font-size:15px;color:#cbd5e1;">Em instantes enviaremos o link do grupo para você.</p>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#0b141a;color:#e9edef;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#111b21;">
<tr><td style="background:linear-gradient(135deg,#075E54,#25D366);padding:28px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:26px;">WhatsApp API Oficial</h1>
<p style="color:#e6fff0;margin:8px 0 0;font-size:14px;">Zero risco de banimento • Teste 02 dias grátis</p>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;">Olá <strong style="color:#25D366;">${nome}</strong>, seu acesso ao grupo está liberado!</p>
${cta}
<h2 style="font-size:17px;color:#25D366;margin:26px 0 10px;">Resumo da ferramenta</h2>
<ul style="font-size:15px;line-height:1.7;color:#cbd5e1;padding-left:20px;margin:0;">
<li>Atendimento pela <strong>API Oficial do WhatsApp</strong> (Meta) — sem risco de bloqueio.</li>
<li>Vários atendentes no mesmo número, com CRM e histórico das conversas.</li>
<li>Chatbot e automações de mensagens, funis e respostas rápidas.</li>
<li>Disparos e campanhas dentro das regras oficiais da Meta.</li>
<li>Relatórios de atendimento e etiquetas de organização.</li>
<li><strong>Teste 02 dias grátis</strong> para validar com o seu time.</li>
</ul>
<div style="margin:26px 0 0;padding:16px;background:#0b141a;border-left:4px solid #25D366;">
<p style="margin:0;font-size:14px;color:#cbd5e1;">As maiores empresas do Brasil (Vivo, Claro, Magazine Luiza, Havan) usam a API Oficial. Entre para a turma dos gigantes.</p>
</div>
</td></tr>
<tr><td style="background:#0b141a;padding:18px;text-align:center;">
<p style="margin:0;color:#64748b;font-size:12px;">© MRO • Mais Resultados Online</p>
</td></tr></table></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = String((body as any)?.action ?? "register");
    const isAdmin = (t: unknown) => typeof t === "string" && t.startsWith("zapzap-admin-");

    if (action === "login") {
      const { email, password } = body as any;
      if (email === "mro@gmail.com" && password === "Ga145523@") {
        return json({ success: true, token: "zapzap-admin-" + Date.now() });
      }
      return json({ success: false, error: "Credenciais inválidas" }, 401);
    }

    if (action === "get_settings") {
      const { data } = await supabase
        .from("zapzap_settings")
        .select("grupo_link")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return json({ success: true, grupo_link: data?.grupo_link ?? "" });
    }

    if (action === "save_settings") {
      const { token, grupo_link } = body as any;
      if (!isAdmin(token)) return json({ success: false, error: "Unauthorized" }, 401);
      const link = clean(grupo_link);
      if (link.length > 500) return json({ success: false, error: "Link inválido" }, 400);
      const { data: existing } = await supabase
        .from("zapzap_settings")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        await supabase
          .from("zapzap_settings")
          .update({ grupo_link: link, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("zapzap_settings").insert({ grupo_link: link });
      }
      return json({ success: true });
    }

    if (action === "list") {
      const { token } = body as any;
      if (!isAdmin(token)) return json({ success: false, error: "Unauthorized" }, 401);
      const { data, error } = await supabase
        .from("zapzap_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, leads: data ?? [] });
    }

    // register
    const nome = clean((body as any)?.nome);
    const email = clean((body as any)?.email).toLowerCase();
    const whatsapp = clean((body as any)?.whatsapp);

    if (!nome || !email || !whatsapp) return json({ success: false, error: "Campos obrigatórios faltando" }, 400);
    if (nome.length > 200 || email.length > 255 || whatsapp.length > 40) {
      return json({ success: false, error: "Dados inválidos" }, 400);
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ success: false, error: "E-mail inválido" }, 400);

    const { data: settings } = await supabase
      .from("zapzap_settings")
      .select("grupo_link")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const grupoLink = settings?.grupo_link ?? "";

    const { data: lead, error: insErr } = await supabase
      .from("zapzap_leads")
      .insert({ nome, email, whatsapp })
      .select("id")
      .single();

    if (insErr) return json({ success: false, error: insErr.message }, 400);

    const ok = await sendEmail(
      email,
      "Participe do Grupo no WhatsApp - API Oficial",
      buildHtml(nome, grupoLink),
    );
    if (ok) await supabase.from("zapzap_leads").update({ email_enviado: true }).eq("id", lead.id);

    return json({ success: true, leadId: lead.id, emailSent: ok, grupo_link: grupoLink });
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
