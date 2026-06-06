import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INFINITEPAY_HANDLE = "paguemro";
const REDIRECT_URL = "https://maisresultadosonline.com.br/vendernainternet/login";
const AMOUNT = 25.00;

const log = (step: string, details?: unknown) => {
  const ts = new Date().toISOString();
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${ts}] [VENDER-CHECKOUT] ${step}${d}`);
};

const generateNSU = () => {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 8);
  return `VENDER${t}${r}`.toUpperCase();
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    const body = await req.json();
    const { nome, email, senha, whatsapp } = body || {};

    if (!nome || !email || !senha || !whatsapp || !String(email).includes("@")) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // Upsert user (email is unique)
    const { data: existing } = await supabase
      .from("vender_usuarios")
      .select("*")
      .eq("email", cleanEmail)
      .maybeSingle();

    let userId: string;
    if (existing) {
      const { error: upErr } = await supabase
        .from("vender_usuarios")
        .update({ nome, senha, whatsapp })
        .eq("id", existing.id);
      if (upErr) throw upErr;
      userId = existing.id;
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("vender_usuarios")
        .insert({ nome, email: cleanEmail, senha, whatsapp, acesso_liberado: false })
        .select()
        .single();
      if (insErr) throw insErr;
      userId = inserted.id;
    }

    const orderNsu = generateNSU();
    const priceCents = Math.round(AMOUNT * 100);
    const webhookUrl = `${supabaseUrl}/functions/v1/infinitepay-webhook`;

    const lineItems = [{
      description: `VENDER_${cleanEmail}`,
      quantity: 1,
      price: priceCents,
    }];

    const payload = {
      handle: INFINITEPAY_HANDLE,
      items: lineItems,
      itens: lineItems,
      order_nsu: orderNsu,
      redirect_url: REDIRECT_URL,
      webhook_url: webhookUrl,
      customer: { email: cleanEmail, name: nome, phone_number: whatsapp },
    };

    log("Calling InfiniPay", payload);

    let paymentLink: string | null = null;
    try {
      const resp = await fetch("https://api.checkout.infinitepay.io/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      log("InfiniPay response", { status: resp.status, data });
      if (resp.ok) {
        paymentLink = data.checkout_url || data.link || data.url || null;
      }
    } catch (e) {
      log("InfiniPay API error", { error: String(e) });
    }

    // Fallback
    if (!paymentLink) {
      const fallbackItems = JSON.stringify([{
        name: `VENDER_${cleanEmail}`,
        price: priceCents,
        quantity: 1,
      }]);
      paymentLink = `https://checkout.infinitepay.io/${INFINITEPAY_HANDLE}?items=${encodeURIComponent(fallbackItems)}&redirect_url=${encodeURIComponent(REDIRECT_URL)}`;
    }

    // Create/replace pending payment row tied to this user
    await supabase
      .from("vender_pagamentos")
      .delete()
      .eq("usuario_id", userId)
      .eq("status", "pendente");

    const { error: payErr } = await supabase
      .from("vender_pagamentos")
      .insert({
        usuario_id: userId,
        valor: AMOUNT,
        status: "pendente",
        infinitepay_transaction_id: orderNsu,
        payment_url: paymentLink,
      });
    if (payErr) throw payErr;

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        order_nsu: orderNsu,
        payment_link: paymentLink,
        email: cleanEmail,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
