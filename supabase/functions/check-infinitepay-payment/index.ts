import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HANDLE = "paguemro";

const log = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-INFINITEPAY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing backend configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const order_nsu = body.order_nsu;
    const transaction_nsu = body.transaction_nsu;
    const slug = body.slug;

    if (!order_nsu || !transaction_nsu || !slug) {
      return new Response(
        JSON.stringify({ success: false, error: "Parâmetros faltando (order_nsu, transaction_nsu, slug)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    log("Checking payment", { order_nsu, transaction_nsu, slug });

    const resp = await fetch("https://api.infinitepay.io/invoices/public/checkout/payment_check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle: HANDLE,
        order_nsu,
        transaction_nsu,
        slug,
      }),
    });

    const data = await resp.json().catch(() => ({}));
    log("payment_check response", { status: resp.status, data });

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao consultar status", details: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const paid = Boolean(data?.paid);

    if (paid) {
      const { error: updateError } = await supabase
        .from("payment_orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          verified_at: new Date().toISOString(),
        })
        .eq("nsu_order", order_nsu);

      if (updateError) {
        log("DB update error", updateError);
        return new Response(
          JSON.stringify({ success: false, error: "Erro ao atualizar pedido" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, paid, amount: data?.amount, paid_amount: data?.paid_amount, capture_method: data?.capture_method }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { msg });
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
