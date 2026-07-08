import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INFINITEPAY_HANDLE = "paguemro";
const BASE_PRICE = 97.00;
const ORDERBUMP_PRICE = 10.00;

const log = (s: string, d?: unknown) =>
  console.log(`[POSTSCOMIA-CHECKOUT] ${s}`, d ? JSON.stringify(d) : "");

const genNSU = () =>
  `POSTSCOMIA${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`.toUpperCase();

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

    if (!name || !email || !String(email).includes("@")) {
      return new Response(JSON.stringify({ success: false, error: "Dados inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanName = String(name).trim();
    const cleanPhone = whatsapp ? String(whatsapp).replace(/\D/g, "") : null;
    const withBump = !!orderbump;
    const amount = withBump ? BASE_PRICE + ORDERBUMP_PRICE : BASE_PRICE;
    const priceCents = Math.round(amount * 100);
    const nsu = genNSU();

    const redirectUrl = `https://maisresultadosonline.com.br/postscomia/obrigado?paid=1&nsu=${nsu}`;
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/infinitepay-webhook`;

    const description = `POSTSCOMIA_${withBump ? "BUMP_" : ""}${cleanEmail}`;
    const items = [{ description, quantity: 1, price: priceCents }];

    const payload = {
      handle: INFINITEPAY_HANDLE,
      items,
      itens: items,
      order_nsu: nsu,
      redirect_url: redirectUrl,
      webhook_url: webhookUrl,
      customer: { email: cleanEmail, name: cleanName },
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

    if (!paymentLink) {
      const enc = encodeURIComponent(JSON.stringify([{ name: description, price: priceCents, quantity: 1 }]));
      paymentLink = `https://checkout.infinitepay.io/${INFINITEPAY_HANDLE}?items=${enc}&redirect_url=${encodeURIComponent(redirectUrl)}&webhook_url=${encodeURIComponent(webhookUrl)}`;
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

    return new Response(
      JSON.stringify({ success: true, order_id: order.id, nsu_order: nsu, payment_link: paymentLink }),
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
