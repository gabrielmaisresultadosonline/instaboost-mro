import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INFINITEPAY_HANDLE = "paguemro";

const log = (step: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [CHECK-MRO-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Checking MRO payment");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const { nsu_order, transaction_nsu, slug } = body;

    log("Request params", { nsu_order, transaction_nsu, slug });

    if (!nsu_order) {
      return new Response(
        JSON.stringify({ error: "Missing nsu_order" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Buscar pedido no banco
    const { data: order, error: orderError } = await supabase
      .from("mro_orders")
      .select("*")
      .eq("nsu_order", nsu_order)
      .single();

    if (orderError || !order) {
      log("Order not found", { nsu_order });
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Se já está completed, retornar sucesso
    if (order.status === "completed") {
      log("Order already completed");
      return new Response(
        JSON.stringify({ success: true, status: "completed", order }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Se já está pago mas não completed, tentar processar
    if (order.status === "paid") {
      log("Order paid but not completed, triggering webhook manually");
      
      // Chamar webhook para processar
      await supabase.functions.invoke("mro-payment-webhook", {
        body: {
          order_nsu: nsu_order,
          items: [{
            description: `MROIG_${order.plan_type === "lifetime" ? "VITALICIO" : "ANUAL"}_${order.username}_${order.email}`
          }]
        }
      });

      // Aguardar um pouco e verificar novamente
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { data: updatedOrder } = await supabase
        .from("mro_orders")
        .select("*")
        .eq("nsu_order", nsu_order)
        .single();

      return new Response(
        JSON.stringify({ success: true, status: updatedOrder?.status || "paid", order: updatedOrder }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Se tem transaction_nsu e slug, verificar via payment_check
    if (transaction_nsu && slug) {
      log("Checking payment via InfiniPay API", { transaction_nsu, slug });

      try {
        const checkResponse = await fetch(
          "https://api.infinitepay.io/invoices/public/checkout/payment_check",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              handle: INFINITEPAY_HANDLE,
              order_nsu: nsu_order,
              transaction_nsu,
              slug,
            }),
          }
        );

        const checkData = await checkResponse.json();
        log("InfiniPay payment_check response", checkData);

        if (checkData.paid) {
          log("Payment confirmed via API, triggering webhook");

          // Chamar webhook para processar
          await supabase.functions.invoke("mro-payment-webhook", {
            body: {
              order_nsu: nsu_order,
              items: [{
                description: `MROIG_${order.plan_type === "lifetime" ? "VITALICIO" : "ANUAL"}_${order.username}_${order.email}`
              }]
            }
          });

          // Aguardar processamento
          await new Promise(resolve => setTimeout(resolve, 3000));

          const { data: updatedOrder } = await supabase
            .from("mro_orders")
            .select("*")
            .eq("nsu_order", nsu_order)
            .single();

          return new Response(
            JSON.stringify({ success: true, status: updatedOrder?.status || "paid", order: updatedOrder }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
      } catch (apiError) {
        log("Error checking InfiniPay API", { error: String(apiError) });
      }
    }

    // Pedido ainda pendente
    return new Response(
      JSON.stringify({ success: true, status: "pending", order }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
