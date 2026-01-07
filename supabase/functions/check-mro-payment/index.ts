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
    const { nsu_order, transaction_nsu, slug, force_webhook } = body;

    log("Request params", { nsu_order, transaction_nsu, slug, force_webhook });

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
      .maybeSingle();

    if (orderError) {
      log("Database error", { error: orderError.message, nsu_order });
      return new Response(
        JSON.stringify({ error: "Database error", details: orderError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!order) {
      log("Order not found", { nsu_order });
      return new Response(
        JSON.stringify({ error: "Order not found", nsu_order }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    log("Order found", { status: order.status, email: order.email, username: order.username });

    // Se já está completed, retornar sucesso
    if (order.status === "completed") {
      log("Order already completed");
      return new Response(
        JSON.stringify({ success: true, status: "completed", order }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Se já está pago mas não completed, tentar processar via webhook
    if (order.status === "paid" || force_webhook) {
      log("Order paid or force_webhook, triggering webhook manually");
      
      try {
        // Chamar webhook para processar
        const webhookResult = await supabase.functions.invoke("mro-payment-webhook", {
          body: {
            order_nsu: nsu_order,
            items: [{
              description: `MROIG_${order.plan_type === "lifetime" ? "VITALICIO" : "ANUAL"}_${order.username}_${order.email}`
            }]
          }
        });

        log("Webhook result", webhookResult);

        // Aguardar um pouco e verificar novamente
        await new Promise(resolve => setTimeout(resolve, 2000));

        const { data: updatedOrder } = await supabase
          .from("mro_orders")
          .select("*")
          .eq("nsu_order", nsu_order)
          .single();

        return new Response(
          JSON.stringify({ 
            success: true, 
            status: updatedOrder?.status || "paid", 
            order: updatedOrder,
            webhook_triggered: true,
            message: "Pagamento processado com sucesso"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (webhookError) {
        log("Error invoking webhook", { error: String(webhookError) });
      }
    }

    // Tentar verificar via InfiniPay payment_check se tiver os parâmetros
    if (transaction_nsu && slug) {
      log("Checking payment via InfiniPay API with transaction_nsu", { transaction_nsu, slug });

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
          log("Payment confirmed via API, updating order and triggering webhook");

          // Atualizar para paid primeiro
          await supabase
            .from("mro_orders")
            .update({ 
              status: "paid", 
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("nsu_order", nsu_order);

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
            JSON.stringify({ 
              success: true, 
              status: updatedOrder?.status || "paid", 
              order: updatedOrder,
              payment_confirmed: true 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
      } catch (apiError) {
        log("Error checking InfiniPay API", { error: String(apiError) });
      }
    }

    // Tentar buscar status via API pública do InfiniPay usando o link
    if (order.infinitepay_link) {
      log("Trying to extract slug from payment link", { link: order.infinitepay_link });
      
      try {
        // Extrair parâmetros do link
        const url = new URL(order.infinitepay_link);
        const lenc = url.searchParams.get('lenc');
        
        if (lenc) {
          log("Found lenc parameter, checking payment status", { lenc: lenc.substring(0, 50) + "..." });
          
          // Tentar verificar o pagamento usando o lenc como slug
          const checkResponse = await fetch(
            "https://api.infinitepay.io/invoices/public/checkout/payment_check",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                handle: INFINITEPAY_HANDLE,
                order_nsu: nsu_order,
                slug: lenc,
              }),
            }
          );

          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            log("InfiniPay payment_check with lenc response", checkData);

            if (checkData.paid) {
              log("Payment confirmed via lenc, updating order and triggering webhook");

              // Atualizar para paid
              await supabase
                .from("mro_orders")
                .update({ 
                  status: "paid", 
                  paid_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq("nsu_order", nsu_order);

              // Chamar webhook
              await supabase.functions.invoke("mro-payment-webhook", {
                body: {
                  order_nsu: nsu_order,
                  items: [{
                    description: `MROIG_${order.plan_type === "lifetime" ? "VITALICIO" : "ANUAL"}_${order.username}_${order.email}`
                  }]
                }
              });

              await new Promise(resolve => setTimeout(resolve, 3000));

              const { data: updatedOrder } = await supabase
                .from("mro_orders")
                .select("*")
                .eq("nsu_order", nsu_order)
                .single();

              return new Response(
                JSON.stringify({ 
                  success: true, 
                  status: updatedOrder?.status || "paid", 
                  order: updatedOrder,
                  payment_confirmed: true,
                  method: "lenc"
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
              );
            }
          }
        }
      } catch (lencError) {
        log("Error checking with lenc", { error: String(lencError) });
      }
    }

    // Método alternativo: buscar pelo order_nsu na API (sem slug)
    log("Trying direct order_nsu check with InfiniPay");
    try {
      const directCheckResponse = await fetch(
        "https://api.infinitepay.io/invoices/public/checkout/payment_check",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handle: INFINITEPAY_HANDLE,
            order_nsu: nsu_order,
          }),
        }
      );

      if (directCheckResponse.ok) {
        const directCheckData = await directCheckResponse.json();
        log("InfiniPay direct check response", directCheckData);

        if (directCheckData.paid) {
          log("Payment confirmed via direct check, updating order and triggering webhook");

          await supabase
            .from("mro_orders")
            .update({ 
              status: "paid", 
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("nsu_order", nsu_order);

          await supabase.functions.invoke("mro-payment-webhook", {
            body: {
              order_nsu: nsu_order,
              items: [{
                description: `MROIG_${order.plan_type === "lifetime" ? "VITALICIO" : "ANUAL"}_${order.username}_${order.email}`
              }]
            }
          });

          await new Promise(resolve => setTimeout(resolve, 3000));

          const { data: updatedOrder } = await supabase
            .from("mro_orders")
            .select("*")
            .eq("nsu_order", nsu_order)
            .single();

          return new Response(
            JSON.stringify({ 
              success: true, 
              status: updatedOrder?.status || "paid", 
              order: updatedOrder,
              payment_confirmed: true,
              method: "direct_nsu"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
      }
    } catch (directError) {
      log("Error in direct check", { error: String(directError) });
    }

    // Pedido ainda pendente
    log("Order still pending");
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
