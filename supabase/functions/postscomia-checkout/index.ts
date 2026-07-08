import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INFINITEPAY_HANDLE = "paguemro";
const BASE_PRICE = 67.00;
const ORDERBUMP_PRICE = 10.00;
const META_PIXEL_ID = "569414052132145";
const META_API_VERSION = "v18.0";

const log = (s: string, d?: unknown) =>
  console.log(`[POSTSCOMIA-CHECKOUT] ${s}`, d ? JSON.stringify(d) : "");

const genNSU = () =>
  `POSTSCOMIA${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`.toUpperCase();

async function sha256Hex(s: string) {
  const buf = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendMetaLeadEvent(email: string, phoneDigits: string | null, value: number, eventId: string) {
  try {
    const accessToken = Deno.env.get("META_CONVERSIONS_API_TOKEN");
    if (!accessToken) return;
    const em = await sha256Hex(email.toLowerCase().trim());
    const ph = phoneDigits ? await sha256Hex(phoneDigits) : undefined;
    const event: Record<string, unknown> = {
      event_name: "Lead",
      event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_source_url: "https://maisresultadosonline.com.br/postscomia",
      user_data: ph ? { em, ph } : { em },
      custom_data: { content_name: "Posts com IA", value, currency: "BRL" },
    };
    const url = `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [event], access_token: accessToken }),
    });
    log("META Lead sent", { ok: resp.ok });
  } catch (e) {
    log("META Lead error (non-blocking)", { e: String(e) });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { name, email, whatsapp, orderbump } = body;

    const cleanEmail = String(email || "").toLowerCase().trim();
    const cleanName = String(name || "").trim();
    const cleanPhone = String(whatsapp || "").replace(/\D/g, "");

    if (!cleanName || cleanName.split(/\s+/).length < 2) {
      return new Response(JSON.stringify({ success: false, error: "Nome completo obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!cleanEmail.includes("@")) {
      return new Response(JSON.stringify({ success: false, error: "E-mail inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return new Response(JSON.stringify({ success: false, error: "WhatsApp inválido (DDD + número, sem 55)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const withBump = !!orderbump;
    const amount = withBump ? BASE_PRICE + ORDERBUMP_PRICE : BASE_PRICE;
    const priceCents = Math.round(amount * 100);
    const nsu = genNSU();

    const redirectUrl = `https://maisresultadosonline.com.br/postscomia/obrigado?paid=1&nsu=${nsu}`;
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/infinitepay-webhook`;

    const description = `POSTSCOMIA_${withBump ? "BUMP_" : ""}${cleanEmail}`;
    const items = [{ description, quantity: 1, price: priceCents }];

    // Phone prefixed with Brazil country code for InfiniPay
    const phoneWithCC = `55${cleanPhone}`;

    const customer = {
      name: cleanName,
      email: cleanEmail,
      phone: phoneWithCC,
      phone_number: phoneWithCC,
      mobile_phone: phoneWithCC,
    };

    const payload = {
      handle: INFINITEPAY_HANDLE,
      items,
      itens: items,
      order_nsu: nsu,
      redirect_url: redirectUrl,
      webhook_url: webhookUrl,
      customer,
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
      log("InfiniPay resp", { status: r.status, data });
      if (r.ok) paymentLink = data.checkout_url || data.link || data.url || null;
    } catch (e) {
      log("InfiniPay error", { e: String(e) });
    }

    // Prefill querystring for InfiniPay hosted checkout — send both country-coded
    // and raw formats plus common param aliases so the form always fills.
    const prefillParams: Record<string, string> = {
      customer_name: cleanName,
      customer_email: cleanEmail,
      customer_cellphone: cleanPhone,       // InfiniPay expects DDD+numero, no country code
      customer_phone: cleanPhone,
      customer_mobile_phone: cleanPhone,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      cellphone: cleanPhone,
      mobile_phone: cleanPhone,
    };
    const prefill = new URLSearchParams(prefillParams).toString();

    if (!paymentLink) {
      const enc = encodeURIComponent(JSON.stringify([{ name: description, price: priceCents, quantity: 1 }]));
      paymentLink = `https://checkout.infinitepay.io/${INFINITEPAY_HANDLE}?items=${enc}&redirect_url=${encodeURIComponent(redirectUrl)}&webhook_url=${encodeURIComponent(webhookUrl)}&${prefill}`;
    } else {
      paymentLink += (paymentLink.includes("?") ? "&" : "?") + prefill;
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { data: order, error } = await supabase
      .from("postscomia_orders")
      .insert({
        name: cleanName,
        email: cleanEmail,
        whatsapp: cleanPhone,
        amount,
        orderbump: withBump,
        nsu_order: nsu,
        infinitepay_link: paymentLink,
        status: "pending",
        expired_at: expiresAt,
      })
      .select()
      .single();

    if (error) throw error;

    // Fire Meta Conversions API Lead (non-blocking)
    sendMetaLeadEvent(cleanEmail, cleanPhone, amount, nsu).catch(() => {});

    return new Response(
      JSON.stringify({ success: true, order_id: order.id, nsu_order: nsu, payment_link: paymentLink, lead_event_id: nsu }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
