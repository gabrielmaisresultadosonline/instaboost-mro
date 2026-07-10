import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INFINITEPAY_HANDLE = "paguemro";

const log = (s: string, d?: unknown) =>
  console.log(`[RENDASAOVIVO-CHECKOUT] ${s}`, d ? JSON.stringify(d) : "");

const genNSU = () =>
  `RENDASAOVIVO${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`.toUpperCase();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { name, email, whatsapp } = body;

    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").toLowerCase().trim();
    const cleanPhone = String(whatsapp || "").replace(/\D/g, "");

    if (!cleanName || cleanName.split(/\s+/).length < 2) {
      return new Response(JSON.stringify({ success: false, error: "Nome completo obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!cleanEmail.includes("@")) {
      return new Response(JSON.stringify({ success: false, error: "E-mail inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return new Response(JSON.stringify({ success: false, error: "WhatsApp inválido (DDD + número)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read price from settings
    const { data: settings } = await supabase.from("rendasaovivo_settings").select("preco").limit(1).maybeSingle();
    const amount = Number(settings?.preco) || 19;
    const priceCents = Math.round(amount * 100);
    const nsu = genNSU();

    const redirectUrl = `https://maisresultadosonline.com.br/rendasaovivo/obrigado?nsu=${nsu}`;
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/infinitepay-webhook`;
    const description = `RENDASAOVIVO_${cleanEmail}`;
    const items = [{ description, quantity: 1, price: priceCents }];
    const phoneWithCC = `55${cleanPhone}`;

    const payload = {
      handle: INFINITEPAY_HANDLE,
      items, itens: items,
      order_nsu: nsu,
      redirect_url: redirectUrl,
      webhook_url: webhookUrl,
      customer: {
        name: cleanName, email: cleanEmail,
        phone: phoneWithCC, phone_number: phoneWithCC, mobile_phone: phoneWithCC,
      },
      customer_name: cleanName, customer_email: cleanEmail, customer_phone: phoneWithCC,
    };

    let paymentLink: string | null = null;
    try {
      const r = await fetch("https://api.checkout.infinitepay.io/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      log("InfiniPay resp", { status: r.status });
      if (r.ok) paymentLink = data.checkout_url || data.link || data.url || null;
    } catch (e) {
      log("InfiniPay error", { e: String(e) });
    }

    const prefillParams: Record<string, string> = {
      customer_name: cleanName, customer_email: cleanEmail,
      customer_cellphone: cleanPhone, customer_phone: cleanPhone, customer_mobile_phone: cleanPhone,
      name: cleanName, email: cleanEmail, phone: cleanPhone, cellphone: cleanPhone, mobile_phone: cleanPhone,
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
      .from("rendasaovivo_orders")
      .insert({
        nome_completo: cleanName, email: cleanEmail, whatsapp: cleanPhone,
        amount, nsu_order: nsu, infinitepay_link: paymentLink,
        status: "pending", expired_at: expiresAt,
      })
      .select().single();
    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, order_id: order.id, nsu_order: nsu, payment_link: paymentLink }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
