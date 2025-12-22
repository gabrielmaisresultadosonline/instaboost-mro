import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [INFINITEPAY-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Webhook received", { method: req.method });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Parse the webhook payload from InfiniPay
    // Formato esperado:
    // {
    //   "invoice_slug": "abc123",
    //   "amount": 1000,
    //   "paid_amount": 1010,
    //   "installments": 1,
    //   "capture_method": "credit_card",
    //   "transaction_nsu": "UUID",
    //   "order_nsu": "UUID-do-pedido",
    //   "receipt_url": "https://comprovante.com/123",
    //   "items": [...]
    // }
    
    const body = await req.json();
    log("Webhook payload", body);

    const {
      order_nsu,
      transaction_nsu,
      invoice_slug,
      amount,
      paid_amount,
      capture_method,
      receipt_url,
      items
    } = body;

    // Extrair email do nome do produto (MRO_email@cliente.com)
    let email: string | null = null;
    
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const itemName = item.description || item.name;
        if (itemName && itemName.startsWith("MRO_")) {
          email = itemName.replace("MRO_", "").toLowerCase();
          break;
        }
      }
    }

    log("Parsed webhook data", { 
      order_nsu, 
      transaction_nsu, 
      email, 
      amount, 
      paid_amount,
      capture_method 
    });

    // Tentar encontrar o pedido pelo order_nsu primeiro (mais confiável)
    let order = null;
    let fetchError = null;

    if (order_nsu) {
      const result = await supabase
        .from("payment_orders")
        .select("*")
        .eq("nsu_order", order_nsu)
        .eq("status", "pending")
        .maybeSingle();
      
      order = result.data;
      fetchError = result.error;
      
      if (order) {
        log("Found order by NSU", { orderId: order.id, nsu: order_nsu });
      }
    }

    // Se não encontrou pelo NSU, tentar pelo email
    if (!order && email) {
      const result = await supabase
        .from("payment_orders")
        .select("*")
        .eq("email", email)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      order = result.data;
      fetchError = result.error;
      
      if (order) {
        log("Found order by email", { orderId: order.id, email });
      }
    }

    if (fetchError) {
      log("Error fetching order", fetchError);
      // Retornar 200 para o InfiniPay não ficar reenviando
      return new Response(
        JSON.stringify({ success: false, error: "Database error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (!order) {
      log("No pending order found", { order_nsu, email });
      // Retornar 200 para o InfiniPay não ficar reenviando
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No pending order found",
          order_nsu,
          email 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Marcar pedido como pago
    const { error: updateError } = await supabase
      .from("payment_orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      log("Error updating order", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to update order" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    log("Order marked as PAID", { 
      orderId: order.id, 
      email: order.email,
      order_nsu,
      transaction_nsu,
      capture_method,
      amount,
      paid_amount
    });

    // Retornar 200 OK conforme documentação do InfiniPay
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment confirmed successfully",
        order_id: order.id,
        email: order.email,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: errorMessage });

    // Retornar 400 para o InfiniPay tentar novamente
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
