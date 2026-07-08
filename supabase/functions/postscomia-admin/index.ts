import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "mro@gmail.com";
const ADMIN_PASSWORD = "Ga145523@";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function genPassword() {
  return Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

async function sendCredentialsEmail(email: string, name: string, password: string) {
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  if (!smtpPassword) return false;
  try {
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.hostinger.com",
        port: 465,
        tls: true,
        auth: { username: "suporte@maisresultadosonline.com.br", password: smtpPassword },
      },
    });
    const loginUrl = "https://maisresultadosonline.com.br/postscomia/login";
    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#0a0a0a;color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#0a0a0a;">
<tr><td style="padding:32px;text-align:center;background:linear-gradient(135deg,#000 0%,#1a1a1a 100%);border-bottom:2px solid #eab308;">
<h1 style="color:#eab308;font-size:28px;margin:0;font-weight:900;letter-spacing:1px;">POSTS COM I.A</h1>
<p style="color:#a1a1aa;margin:8px 0 0;font-size:13px;">Área de Membros liberada</p>
</td></tr>
<tr><td style="padding:32px;">
<p style="font-size:16px;margin:0 0 16px;">Olá <strong>${name || "cliente"}</strong>,</p>
<p style="font-size:15px;color:#d4d4d8;margin:0 0 24px;">Sua compra foi confirmada e o acesso à Área de Membros está liberado. Use os dados abaixo para entrar:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #eab308;border-radius:12px;">
<tr><td style="padding:20px;">
<div style="font-size:12px;color:#a1a1aa;text-transform:uppercase;letter-spacing:2px;">E-mail</div>
<div style="font-size:16px;color:#fff;font-weight:bold;margin-bottom:16px;">${email}</div>
<div style="font-size:12px;color:#a1a1aa;text-transform:uppercase;letter-spacing:2px;">Senha</div>
<div style="font-size:20px;color:#eab308;font-weight:900;letter-spacing:2px;font-family:monospace;">${password}</div>
</td></tr></table>
<div style="text-align:center;margin:32px 0;">
<a href="${loginUrl}" style="display:inline-block;padding:16px 40px;background:#eab308;color:#000;font-weight:900;text-decoration:none;border-radius:10px;letter-spacing:1px;">ACESSAR ÁREA DE MEMBROS</a>
</div>
<p style="font-size:13px;color:#71717a;text-align:center;margin:16px 0 0;">Guarde este e-mail. Se perder a senha, você pode recuperá-la na tela de login.</p>
</td></tr></table></body></html>`;
    await client.send({
      from: "Posts com I.A <suporte@maisresultadosonline.com.br>",
      to: email,
      subject: "🎉 Seu acesso à Área de Membros Posts com I.A",
      html,
    });
    await client.close();
    return true;
  } catch (e) {
    console.error("SMTP error", e);
    return false;
  }
}

async function ensureAccess(supabase: any, orderId: string) {
  const { data: order } = await supabase.from("postscomia_orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return null;
  let password = order.password;
  if (!password || !order.access_granted) {
    password = order.password || genPassword();
    await supabase.from("postscomia_orders")
      .update({ password, access_granted: true })
      .eq("id", orderId);
    // grant postsprompts access
    try {
      await supabase.from("postsprompts_buyers").upsert(
        { email: order.email, name: order.name, source: "postscomia", status: "active" },
        { onConflict: "email" }
      );
    } catch (e) { console.error("postsprompts upsert", e); }
    await sendCredentialsEmail(order.email, order.name, password);
  }
  return { ...order, password };
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

    // Public: check paid
    if (action === "check_paid") {
      const email = (body.email || "").toString().trim().toLowerCase();
      const nsu = (body.nsu || "").toString().trim();
      let q = supabase.from("postscomia_orders").select("*").eq("status", "paid");
      if (nsu) q = q.eq("nsu_order", nsu);
      else if (email) q = q.eq("email", email);
      else return json({ paid: false });
      const { data } = await q.order("paid_at", { ascending: false }).limit(1).maybeSingle();
      if (data) {
        // ensure credentials exist on first check after payment
        await ensureAccess(supabase, data.id);
      }
      return json({ paid: !!data, order: data || null });
    }

    // Public: grant access (called after payment redirect)
    if (action === "grant_access") {
      const nsu = (body.nsu || "").toString().trim();
      const email = (body.email || "").toString().trim().toLowerCase();
      let q = supabase.from("postscomia_orders").select("*").eq("status", "paid");
      if (nsu) q = q.eq("nsu_order", nsu);
      else if (email) q = q.eq("email", email);
      else return json({ success: false });
      const { data } = await q.limit(1).maybeSingle();
      if (!data) return json({ success: false });
      await ensureAccess(supabase, data.id);
      return json({ success: true });
    }

    // Public: user login
    if (action === "user_login") {
      const email = (body.email || "").toString().trim().toLowerCase();
      const password = (body.password || "").toString();
      if (!email || !password) return json({ success: false, error: "Dados inválidos" });
      const { data } = await supabase
        .from("postscomia_orders")
        .select("*")
        .eq("email", email)
        .eq("status", "paid")
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return json({ success: false, error: "Compra não encontrada" });
      const granted = await ensureAccess(supabase, data.id);
      if (!granted || granted.password !== password) {
        return json({ success: false, error: "Senha incorreta" });
      }
      return json({ success: true, user: { email: data.email, name: data.name } });
    }

    // Public: recover password (regenerate + email)
    if (action === "user_recover") {
      const email = (body.email || "").toString().trim().toLowerCase();
      if (!email) return json({ success: false, error: "E-mail obrigatório" });
      const { data } = await supabase
        .from("postscomia_orders")
        .select("*")
        .eq("email", email)
        .eq("status", "paid")
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return json({ success: false, error: "E-mail não encontrado nas compras" });
      const newPassword = genPassword();
      await supabase.from("postscomia_orders")
        .update({ password: newPassword, access_granted: true })
        .eq("id", data.id);
      try {
        await supabase.from("postsprompts_buyers").upsert(
          { email: data.email, name: data.name, source: "postscomia", status: "active" },
          { onConflict: "email" }
        );
      } catch {}
      await sendCredentialsEmail(data.email, data.name, newPassword);
      return json({ success: true });
    }

    // Public: list modules
    if (action === "list_modules_public") {
      const { data } = await supabase
        .from("postscomia_modules")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true });
      return json({ modules: data || [] });
    }

    // Public: provision Prompts MRO bonus access for a paid PostsComIA member
    if (action === "bonus_prompts_provision") {
      const email = (body.email || "").toString().trim().toLowerCase();
      if (!email) return json({ success: false, error: "E-mail obrigatório" });
      // Verify buyer
      const { data: order } = await supabase
        .from("postscomia_orders")
        .select("*")
        .eq("email", email)
        .eq("status", "paid")
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!order) return json({ success: false, error: "Acesso não encontrado" });

      // Hash helper (matches prompts-mro-auth)
      async function hashPassword(p: string): Promise<string> {
        const buf = new TextEncoder().encode(p + "_prompts_mro_salt_2025");
        const digest = await crypto.subtle.digest("SHA-256", buf);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
      }

      const nowISO = new Date().toISOString();
      const subEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      let { data: user } = await supabase
        .from("prompts_mro_users")
        .select("id, name, email, copies_count, copies_limit, is_paid, subscription_end")
        .eq("email", email)
        .maybeSingle();

      if (!user) {
        const pwd = await hashPassword(genPassword());
        const insertRes = await supabase
          .from("prompts_mro_users")
          .insert({
            name: order.name || email.split("@")[0],
            email,
            password: pwd,
            status: "active",
            copies_count: 0,
            copies_limit: 5,
            is_paid: true,
            paid_at: nowISO,
            subscription_end: subEnd,
            payment_nsu: `POSTSCOMIA_BONUS_${order.id}`,
          })
          .select("id, name, email, copies_count, copies_limit, is_paid, subscription_end")
          .single();
        user = insertRes.data;
      } else if (!user.is_paid || !user.subscription_end || new Date(user.subscription_end) < new Date()) {
        const upd = await supabase
          .from("prompts_mro_users")
          .update({ is_paid: true, paid_at: nowISO, subscription_end: subEnd })
          .eq("id", user.id)
          .select("id, name, email, copies_count, copies_limit, is_paid, subscription_end")
          .single();
        user = upd.data || user;
      }

      if (!user) return json({ success: false, error: "Falha ao provisionar bônus" });

      const daysRemaining = user.subscription_end
        ? Math.max(0, Math.ceil((new Date(user.subscription_end).getTime() - Date.now()) / 86400000))
        : null;

      return json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          copies_count: user.copies_count || 0,
          copies_limit: user.copies_limit || 5,
          is_paid: true,
          days_remaining: daysRemaining,
        },
      });
    }

    // Public: get settings (hero video + pixel)
    if (action === "get_settings") {
      const { data } = await supabase
        .from("postscomia_settings")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return json({ settings: data || {} });
    }

    // Public: log analytics event
    if (action === "track") {
      const event_type = (body.event_type || "").toString();
      const allowed = ["page_visit","video_start","video_25","video_50","video_75","video_100"];
      if (!allowed.includes(event_type)) return json({ success: false });
      await supabase.from("postscomia_analytics").insert({
        event_type,
        video_id: body.video_id || null,
        video_title: body.video_title || null,
        session_id: body.session_id || null,
        user_agent: (req.headers.get("user-agent") || "").slice(0, 300),
      });
      return json({ success: true });
    }

    // Admin login
    if (action === "login") {
      const ok =
        (body.email || "").toString().trim().toLowerCase() === ADMIN_EMAIL &&
        body.password === ADMIN_PASSWORD;
      return json({ success: ok });
    }

    // Admin gate
    if (
      (body.email || "").toString().trim().toLowerCase() !== ADMIN_EMAIL ||
      body.password !== ADMIN_PASSWORD
    ) {
      return json({ error: "Unauthorized" }, 401);
    }

    if (action === "list_orders") {
      const { data } = await supabase
        .from("postscomia_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return json({ orders: data || [] });
    }

    if (action === "mark_paid") {
      const id = body.id;
      if (!id) return json({ error: "id obrigatório" }, 400);
      await supabase
        .from("postscomia_orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", id);
      await ensureAccess(supabase, id);
      return json({ success: true });
    }

    if (action === "delete_order") {
      const id = body.id;
      if (!id) return json({ error: "id obrigatório" }, 400);
      await supabase.from("postscomia_orders").delete().eq("id", id);
      return json({ success: true });
    }

    if (action === "resend_credentials") {
      const id = body.id;
      if (!id) return json({ error: "id obrigatório" }, 400);
      const { data: order } = await supabase.from("postscomia_orders").select("*").eq("id", id).maybeSingle();
      if (!order) return json({ error: "Pedido não encontrado" }, 404);
      const newPassword = genPassword();
      await supabase.from("postscomia_orders").update({ password: newPassword, access_granted: true }).eq("id", id);
      try {
        await supabase.from("postsprompts_buyers").upsert(
          { email: order.email, name: order.name, source: "postscomia", status: "active" },
          { onConflict: "email" }
        );
      } catch {}
      await sendCredentialsEmail(order.email, order.name, newPassword);
      return json({ success: true });
    }

    if (action === "stats") {
      const { data } = await supabase.from("postscomia_orders").select("status,amount,orderbump");
      const orders = data || [];
      const paid = orders.filter((o: any) => o.status === "paid");
      const pending = orders.filter((o: any) => o.status === "pending");
      const revenue = paid.reduce((s: number, o: any) => s + Number(o.amount || 0), 0);
      const bumpCount = paid.filter((o: any) => o.orderbump).length;
      return json({
        total: orders.length,
        paid: paid.length,
        pending: pending.length,
        revenue,
        bumpCount,
      });
    }

    // Modules CRUD
    if (action === "list_modules") {
      const { data } = await supabase
        .from("postscomia_modules")
        .select("*")
        .order("order_index", { ascending: true });
      return json({ modules: data || [] });
    }

    if (action === "save_module") {
      const m = body.module || {};
      if (m.id) {
        await supabase.from("postscomia_modules").update({
          title: m.title,
          description: m.description,
          cover_url: m.cover_url,
          video_url: m.video_url,
          order_index: m.order_index ?? 0,
          is_active: m.is_active ?? true,
        }).eq("id", m.id);
      } else {
        await supabase.from("postscomia_modules").insert({
          title: m.title,
          description: m.description,
          cover_url: m.cover_url,
          video_url: m.video_url,
          order_index: m.order_index ?? 0,
          is_active: m.is_active ?? true,
        });
      }
      return json({ success: true });
    }

    if (action === "delete_module") {
      const id = body.id;
      if (!id) return json({ error: "id obrigatório" }, 400);
      await supabase.from("postscomia_modules").delete().eq("id", id);
      return json({ success: true });
    }

    // Admin: save settings (hero video + pixel)
    if (action === "save_settings") {
      const patch: any = {
        hero_video_url: body.hero_video_url ?? null,
        hero_video_poster: body.hero_video_poster ?? null,
        fb_pixel_id: body.fb_pixel_id ?? null,
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase
        .from("postscomia_settings")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        await supabase.from("postscomia_settings").update(patch).eq("id", existing.id);
      } else {
        await supabase.from("postscomia_settings").insert(patch);
      }
      return json({ success: true });
    }

    // Admin: signed upload URL for videos/covers
    if (action === "sign_upload") {
      const filename = (body.filename || "").toString().replace(/[^a-zA-Z0-9._-]/g, "_");
      const kind = (body.kind || "video").toString();
      if (!filename) return json({ error: "filename obrigatório" }, 400);
      const path = `postscomia/${kind}s/${Date.now()}-${filename}`;
      const { data, error } = await supabase.storage
        .from("assets")
        .createSignedUploadUrl(path);
      if (error) return json({ error: error.message }, 500);
      const { data: pub } = supabase.storage.from("assets").getPublicUrl(path);
      return json({ token: data.token, path: data.path, public_url: pub.publicUrl });
    }

    // Admin: manual grant access
    if (action === "manual_grant") {
      const email = (body.email || "").toString().trim().toLowerCase();
      const name = (body.name || "Cliente").toString().trim();
      if (!email || !email.includes("@")) return json({ error: "email inválido" }, 400);
      const { data: existing } = await supabase
        .from("postscomia_orders").select("*").eq("email", email)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      let orderId = existing?.id;
      if (!orderId) {
        const { data: inserted } = await supabase.from("postscomia_orders").insert({
          name, email, amount: 97, orderbump: false,
          nsu_order: `MANUAL-${Date.now()}`,
          status: "paid", paid_at: new Date().toISOString(),
        }).select("id").maybeSingle();
        orderId = inserted?.id;
      } else {
        await supabase.from("postscomia_orders").update({
          status: "paid",
          paid_at: existing.paid_at || new Date().toISOString(),
        }).eq("id", orderId);
      }
      if (!orderId) return json({ error: "Não foi possível criar acesso" }, 500);
      await ensureAccess(supabase, orderId);
      return json({ success: true });
    }

    // Admin: analytics
    if (action === "analytics") {
      const days = Math.max(1, Math.min(90, Number(body.days) || 30));
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data: visits } = await supabase
        .from("postscomia_analytics")
        .select("event_type,video_id,video_title,session_id,created_at")
        .gte("created_at", since).limit(20000);
      const rows = visits || [];
      const pageVisits = rows.filter((r: any) => r.event_type === "page_visit").length;
      const uniqueVisitors = new Set(
        rows.filter((r: any) => r.event_type === "page_visit").map((r: any) => r.session_id || "-")
      ).size;
      const videoMap: Record<string, any> = {};
      for (const r of rows) {
        if (!r.event_type.startsWith("video_")) continue;
        const key = r.video_id || "unknown";
        videoMap[key] = videoMap[key] || {
          video_id: key, video_title: r.video_title || key,
          starts: 0, p25: 0, p50: 0, p75: 0, p100: 0,
        };
        if (r.event_type === "video_start") videoMap[key].starts++;
        else if (r.event_type === "video_25") videoMap[key].p25++;
        else if (r.event_type === "video_50") videoMap[key].p50++;
        else if (r.event_type === "video_75") videoMap[key].p75++;
        else if (r.event_type === "video_100") videoMap[key].p100++;
        if (r.video_title) videoMap[key].video_title = r.video_title;
      }
      return json({
        days,
        page_visits: pageVisits,
        unique_visitors: uniqueVisitors,
        videos: Object.values(videoMap),
      });
    }


    return json({ error: "Invalid action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
