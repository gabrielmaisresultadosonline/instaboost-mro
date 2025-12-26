import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INFINITEPAY_HANDLE = "paguemro";
const INFINITEPAY_CHECKOUT_LINKS_URL =
  "https://api.infinitepay.io/invoices/public/checkout/links";

// Mantém o redirect para o dashboard (não dependemos dele para confirmar pagamento)
const REDIRECT_URL = "https://pay.maisresultadosonline.com.br/anuncios/dash";

const log = (step: string, details?: unknown) => {
  console.log(
    `[ADS-CHECKOUT] ${step}:`,
    details ? JSON.stringify(details, null, 2) : "",
  );
};

const generateNSU = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `ADS${timestamp}${randomPart}`.toUpperCase();
};

const getCheckoutUrl = (data: any): string | null => {
  return data?.checkout_url || data?.checkoutUrl || data?.link || data?.url || null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      name,
      email,
      password,
      phone,
      amount = 1,
      type = "initial",
      userId,
      leadsQuantity,
    } = body;

    log("Request received", { name, email, type, amount });

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ success: false, error: "Email inválido" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const nsuOrder = generateNSU();
    const priceInCents = Math.round(Number(amount) * 100);

    // Webhook URL para receber notificação de pagamento (em tempo real)
    const webhookUrl = `${supabaseUrl}/functions/v1/ads-webhook`;

    // Item no formato da doc: description/quantity/price
    // Mantemos o prefixo anun_ para o webhook conseguir extrair o email
    const description = `anun_${cleanEmail}`;
    const lineItems = [{ description, quantity: 1, price: priceInCents }];

    const infinitepayPayload: Record<string, unknown> = {
      handle: INFINITEPAY_HANDLE,
      items: lineItems,
      itens: lineItems,
      order_nsu: nsuOrder,
      redirect_url: REDIRECT_URL,
      webhook_url: webhookUrl,
      customer: {
        email: cleanEmail,
        ...(name ? { name } : {}),
        ...(phone ? { phone_number: phone } : {}),
      },
    };

    log("Calling InfiniPay checkout/links", {
      order_nsu: nsuOrder,
      webhook_url: webhookUrl,
      description,
      priceInCents,
    });

    const infinitepayResponse = await fetch(INFINITEPAY_CHECKOUT_LINKS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(infinitepayPayload),
    });

    const infinitepayData = await infinitepayResponse.json().catch(() => ({}));
    log("InfiniPay response", {
      status: infinitepayResponse.status,
      ok: infinitepayResponse.ok,
      data: infinitepayData,
    });

    if (!infinitepayResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Erro ao criar link de pagamento",
          details: infinitepayData,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const paymentLink = getCheckoutUrl(infinitepayData);
    if (!paymentLink) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Resposta da InfinitePay sem checkout_url",
          details: infinitepayData,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (type === "initial") {
      // Garante usuário (case-insensitive)
      const { data: existingUser } = await supabase
        .from("ads_users")
        .select("id")
        .ilike("email", cleanEmail)
        .maybeSingle();

      if (!existingUser && name && password) {
        const { data: newUser, error: userError } = await supabase
          .from("ads_users")
          .insert({
            name,
            email: cleanEmail,
            password,
            phone: phone || null,
            status: "pending",
          })
          .select("id")
          .single();

        if (userError) {
          log("Error creating user", userError);
        } else {
          log("User created", newUser);
        }
      }

      // Cria pedido
      const { data: order, error: orderError } = await supabase
        .from("ads_orders")
        .insert({
          email: cleanEmail,
          name: name || cleanEmail.split("@")[0],
          amount: Number(amount),
          nsu_order: nsuOrder,
          infinitepay_link: paymentLink,
          status: "pending",
          expired_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (orderError) {
        log("Error creating order", orderError);
        throw orderError;
      }

      log("Order created", order);

      return new Response(
        JSON.stringify({
          success: true,
          paymentLink,
          nsuOrder,
          orderId: order.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (type === "balance") {
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: "userId é obrigatório" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data: balanceOrder, error: balanceError } = await supabase
        .from("ads_balance_orders")
        .insert({
          user_id: userId,
          amount: Number(amount),
          leads_quantity: Number(leadsQuantity || 0),
          nsu_order: nsuOrder,
          infinitepay_link: paymentLink,
          status: "pending",
        })
        .select()
        .single();

      if (balanceError) {
        log("Error creating balance order", balanceError);
        throw balanceError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          paymentLink,
          nsuOrder,
          orderId: balanceOrder.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Tipo de operação inválido" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    log("Error", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
