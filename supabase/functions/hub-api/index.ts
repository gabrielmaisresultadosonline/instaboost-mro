import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const INFINITEPAY_HANDLE = "paguemro";
const LIFETIME_DAYS = 999999;

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function genNSU() {
  return `HUB${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

/** Verifica se o registro de usuário (MRO ou ZAPMRO) ainda está com acesso válido. */
function isAccessActive(row: Record<string, unknown> | null): boolean {
  if (!row) return false;
  if (row.is_active === false) return false;
  const days = Number(row.expiration_days ?? 0);
  if (days >= LIFETIME_DAYS) return true;
  const created = row.last_access || row.created_at;
  if (!days) return false;
  if (!created) return true;
  const start = new Date(String(row.created_at || created)).getTime();
  const expires = start + days * 24 * 60 * 60 * 1000;
  return Date.now() < expires;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    let body: Record<string, unknown> = {};
    try {
      const raw = await req.text();
      if (raw) body = JSON.parse(raw);
    } catch {
      body = {};
    }
    const action = String(body.action || "");

    // ================= LOGIN =================
    if (action === "login") {
      const identifier = String(body.identifier || body.username || body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!identifier || !password) return json({ success: false, error: "Informe usuário/e-mail e senha" }, 400);
      if (identifier.length > 255 || password.length > 255) return json({ success: false, error: "Credenciais inválidas" }, 400);

      const hash = await sha256(password);
      const safe = identifier.replace(/[,()"']/g, "");

      let username: string | null = null;
      let email: string | null = null;
      let name: string | null = null;
      let matched = false;

      // 1) MRO Ferramenta
      const { data: mroRows } = await supabase
        .from("mro_tool_users")
        .select("*")
        .or(`username.eq.${safe},email.eq.${safe}`)
        .limit(1);
      const mro = mroRows?.[0] || null;
      if (mro && (mro.password_hash === hash || (mro.password_plain && mro.password_plain === password))) {
        matched = true;
        username = mro.username;
        email = mro.email;
        name = mro.name;
      }

      // 2) ZAPMRO
      if (!matched) {
        const { data: zapRows } = await supabase
          .from("zapmro_users")
          .select("*")
          .or(`username.eq.${safe},email.eq.${safe}`)
          .limit(1);
        const zap = zapRows?.[0] || null;
        if (zap && (zap.password_hash === hash || (zap.password_plain && zap.password_plain === password))) {
          matched = true;
          username = zap.username;
          email = zap.email;
          name = zap.name;
        }
      }

      // 3) Posts com IA (compras pagas)
      if (!matched && identifier.includes("@")) {
        const { data: order } = await supabase
          .from("postscomia_orders")
          .select("*")
          .eq("email", identifier)
          .eq("status", "paid")
          .order("paid_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (order && order.password && order.password === password) {
          matched = true;
          email = order.email;
          name = order.name;
        }
      }

      if (!matched) return json({ success: false, error: "Usuário ou senha incorretos" }, 200);

      return json({
        success: true,
        user: { username, email, name },
      });
    }

    // ================= PRODUTOS + ACESSOS =================
    if (action === "products") {
      const username = String(body.username || "").trim().toLowerCase();
      const email = String(body.email || "").trim().toLowerCase();

      const { data: products } = await supabase
        .from("hub_products")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      const access: Record<string, boolean> = {};
      const details: Record<string, unknown> = {};

      // MRO Ferramenta
      if (username || email) {
        const parts: string[] = [];
        if (username) parts.push(`username.eq.${username}`);
        if (email) parts.push(`email.eq.${email}`);
        const { data: mroRows } = await supabase.from("mro_tool_users").select("*").or(parts.join(",")).limit(1);
        const mro = mroRows?.[0] || null;
        access.mro_tool = isAccessActive(mro);
        if (mro) details.mro_tool = { expiration_days: mro.expiration_days, username: mro.username };

        const { data: zapRows } = await supabase.from("zapmro_users").select("*").or(parts.join(",")).limit(1);
        const zap = zapRows?.[0] || null;
        access.zapmro = isAccessActive(zap);
        if (zap) details.zapmro = { expiration_days: zap.expiration_days, username: zap.username };
      }

      if (email) {
        const { data: pOrder } = await supabase
          .from("postscomia_orders")
          .select("email,status")
          .eq("email", email)
          .eq("status", "paid")
          .limit(1)
          .maybeSingle();
        access.postscomia = !!pOrder;
      }

      // Liberações manuais / compras feitas pela dashboard
      const grantFilters: string[] = [];
      if (email) grantFilters.push(`email.eq.${email}`);
      if (username) grantFilters.push(`username.eq.${username}`);
      let grants: { product_id: string; expires_at: string | null }[] = [];
      if (grantFilters.length) {
        const { data } = await supabase.from("hub_access").select("product_id,expires_at").or(grantFilters.join(","));
        grants = data || [];
      }
      const grantedIds = new Set(
        grants.filter((g) => !g.expires_at || new Date(g.expires_at).getTime() > Date.now()).map((g) => g.product_id),
      );

      const result = (products || []).map((p) => ({
        ...p,
        unlocked: grantedIds.has(p.id) || !!access[p.access_source],
      }));

      return json({ success: true, products: result, access, details });
    }

    // ================= PRODUTO + TUTORIAIS =================
    if (action === "product") {
      const slug = String(body.slug || "").trim();
      const { data: product } = await supabase.from("hub_products").select("*").eq("slug", slug).maybeSingle();
      if (!product) return json({ success: false, error: "Produto não encontrado" }, 200);
      const { data: tutorials } = await supabase
        .from("hub_product_tutorials")
        .select("*")
        .eq("product_id", product.id)
        .eq("is_active", true)
        .order("order_index", { ascending: true });
      return json({ success: true, product, tutorials: tutorials || [] });
    }

    // ================= CHECKOUT =================
    if (action === "create_checkout") {
      const slug = String(body.slug || "").trim();
      const cleanEmail = String(body.email || "").trim().toLowerCase();
      const cleanName = String(body.name || "").trim();
      const cleanPhone = String(body.whatsapp || "").replace(/\D/g, "");

      if (!slug) return json({ success: false, error: "Produto inválido" }, 400);
      if (!cleanEmail.includes("@")) return json({ success: false, error: "E-mail inválido" }, 400);
      if (!cleanName) return json({ success: false, error: "Nome obrigatório" }, 400);

      const { data: product } = await supabase.from("hub_products").select("*").eq("slug", slug).maybeSingle();
      if (!product) return json({ success: false, error: "Produto não encontrado" }, 404);

      const amount = Number(product.price || 0);
      if (amount <= 0) return json({ success: false, error: "Produto sem preço configurado" }, 400);

      const priceCents = Math.round(amount * 100);
      const nsu = genNSU();
      const redirectUrl = `https://maisresultadosonline.com.br/dashboard?paid=1&nsu=${nsu}`;
      const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/infinitepay-webhook`;
      const description = `HUB_${slug}_${cleanEmail}`;
      const items = [{ description, quantity: 1, price: priceCents }];
      const phoneWithCC = cleanPhone ? `55${cleanPhone}` : undefined;

      const payload = {
        handle: INFINITEPAY_HANDLE,
        items,
        itens: items,
        order_nsu: nsu,
        redirect_url: redirectUrl,
        webhook_url: webhookUrl,
        customer: { name: cleanName, email: cleanEmail, phone: phoneWithCC },
        customer_name: cleanName,
        customer_email: cleanEmail,
        customer_phone: phoneWithCC,
      };

      let paymentLink: string | null = null;
      try {
        const r = await fetch("https://api.checkout.infinitepay.io/links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await r.json();
        if (r.ok) paymentLink = data.checkout_url || data.link || data.url || null;
      } catch (_e) {
        paymentLink = null;
      }

      const prefill = new URLSearchParams({
        customer_name: cleanName,
        customer_email: cleanEmail,
        customer_cellphone: cleanPhone,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
      }).toString();

      if (!paymentLink) {
        const enc = encodeURIComponent(JSON.stringify([{ name: description, price: priceCents, quantity: 1 }]));
        paymentLink = `https://checkout.infinitepay.io/${INFINITEPAY_HANDLE}?items=${enc}&redirect_url=${encodeURIComponent(redirectUrl)}&webhook_url=${encodeURIComponent(webhookUrl)}&${prefill}`;
      } else {
        paymentLink += (paymentLink.includes("?") ? "&" : "?") + prefill;
      }

      await supabase.from("hub_orders").insert({
        product_id: product.id,
        product_slug: slug,
        name: cleanName,
        email: cleanEmail,
        whatsapp: cleanPhone,
        amount,
        nsu_order: nsu,
        infinitepay_link: paymentLink,
        status: "pending",
      });

      return json({ success: true, nsu, payment_link: paymentLink });
    }

    if (action === "check_payment") {
      const nsu = String(body.nsu || "");
      if (!nsu) return json({ success: false, error: "NSU obrigatório" }, 400);
      const { data: order } = await supabase.from("hub_orders").select("*").eq("nsu_order", nsu).maybeSingle();
      return json({ success: true, paid: order?.status === "paid", order: order || null });
    }

    // ================= ADMIN =================
    if (action === "admin_list_products") {
      const { data: products } = await supabase
        .from("hub_products")
        .select("*")
        .order("order_index", { ascending: true });
      const { data: tutorials } = await supabase
        .from("hub_product_tutorials")
        .select("*")
        .order("order_index", { ascending: true });
      return json({ success: true, products: products || [], tutorials: tutorials || [] });
    }

    if (action === "admin_save_product") {
      const p = (body.product || {}) as Record<string, unknown>;
      const slug = String(p.slug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
      if (!slug || !String(p.title || "").trim()) {
        return json({ success: false, error: "Slug e título são obrigatórios" }, 400);
      }
      const payload = {
        slug,
        title: String(p.title),
        description: p.description ? String(p.description) : null,
        thumb_url: p.thumb_url ? String(p.thumb_url) : null,
        app_route: p.app_route ? String(p.app_route) : null,
        sales_page_url: p.sales_page_url ? String(p.sales_page_url) : null,
        price: Number(p.price || 0),
        access_source: String(p.access_source || "manual"),
        order_index: Number(p.order_index || 0),
        is_active: p.is_active !== false,
      };
      if (p.id) {
        const { error } = await supabase.from("hub_products").update(payload).eq("id", String(p.id));
        if (error) return json({ success: false, error: error.message }, 400);
      } else {
        const { error } = await supabase.from("hub_products").insert(payload);
        if (error) return json({ success: false, error: error.message }, 400);
      }
      return json({ success: true });
    }

    if (action === "admin_delete_product") {
      const id = String(body.id || "");
      if (!id) return json({ success: false, error: "ID obrigatório" }, 400);
      await supabase.from("hub_products").delete().eq("id", id);
      return json({ success: true });
    }

    if (action === "admin_save_tutorial") {
      const t = (body.tutorial || {}) as Record<string, unknown>;
      if (!t.product_id || !String(t.title || "").trim()) {
        return json({ success: false, error: "Produto e título são obrigatórios" }, 400);
      }
      const payload = {
        product_id: String(t.product_id),
        title: String(t.title),
        description: t.description ? String(t.description) : null,
        cover_url: t.cover_url ? String(t.cover_url) : null,
        video_url: t.video_url ? String(t.video_url) : null,
        download_url: t.download_url ? String(t.download_url) : null,
        order_index: Number(t.order_index || 0),
        is_active: t.is_active !== false,
      };
      if (t.id) {
        const { error } = await supabase.from("hub_product_tutorials").update(payload).eq("id", String(t.id));
        if (error) return json({ success: false, error: error.message }, 400);
      } else {
        const { error } = await supabase.from("hub_product_tutorials").insert(payload);
        if (error) return json({ success: false, error: error.message }, 400);
      }
      return json({ success: true });
    }

    if (action === "admin_delete_tutorial") {
      const id = String(body.id || "");
      if (!id) return json({ success: false, error: "ID obrigatório" }, 400);
      await supabase.from("hub_product_tutorials").delete().eq("id", id);
      return json({ success: true });
    }

    if (action === "admin_list_orders") {
      const { data } = await supabase
        .from("hub_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return json({ success: true, orders: data || [] });
    }

    if (action === "admin_grant_access") {
      const productId = String(body.product_id || "");
      const email = String(body.email || "").trim().toLowerCase() || null;
      const username = String(body.username || "").trim().toLowerCase() || null;
      if (!productId || (!email && !username)) {
        return json({ success: false, error: "Produto e e-mail/usuário são obrigatórios" }, 400);
      }
      await supabase.from("hub_access").insert({ product_id: productId, email, username, source: "manual" });
      return json({ success: true });
    }

    return json({ success: false, error: "Ação inválida" }, 400);
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
