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

// Verificar pagamento via API InfiniPay (só precisa do order_nsu)
async function checkPaymentWithAPI(orderNsu: string, transactionNsu?: string, slug?: string): Promise<{ paid: boolean; data?: any }> {
  try {
    const payload: any = {
      handle: HANDLE,
      order_nsu: orderNsu,
    };
    
    // Adicionar campos opcionais se disponíveis
    if (transactionNsu) payload.transaction_nsu = transactionNsu;
    if (slug) payload.slug = slug;

    const response = await fetch(
      "https://api.infinitepay.io/invoices/public/checkout/payment_check",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (response.ok) {
      const data = await response.json();
      log("InfiniPay API response", data);
      return { paid: data.paid === true, data };
    }
    
    log("InfiniPay API error", { status: response.status });
    return { paid: false };
  } catch (error) {
    log("Error calling InfiniPay API", { error: String(error) });
    return { paid: false };
  }
}

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
    const { order_nsu, transaction_nsu, slug, table } = body;

    // Se não tiver order_nsu, buscar pedidos pendentes recentes
    if (!order_nsu) {
      log("No order_nsu provided, checking recent pending orders");
      
      const tableName = table || "mro_orders";
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      const { data: pendingOrders, error: fetchError } = await supabase
        .from(tableName)
        .select("*")
        .eq("status", "pending")
        .gte("created_at", fifteenMinutesAgo)
        .order("created_at", { ascending: false })
        .limit(10);

      if (fetchError || !pendingOrders || pendingOrders.length === 0) {
        return new Response(
          JSON.stringify({ success: true, paid: false, message: "No pending orders found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Verificar cada pedido pendente
      for (const order of pendingOrders) {
        const orderNsu = order.nsu_order;
        const { paid, data: paymentData } = await checkPaymentWithAPI(orderNsu);

        if (paid) {
          log("Payment confirmed for pending order", { orderNsu, orderId: order.id });

          await supabase
            .from(tableName)
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", order.id);

          return new Response(
            JSON.stringify({
              success: true,
              paid: true,
              order_id: order.id,
              order_nsu: orderNsu,
              amount: paymentData?.amount,
              paid_amount: paymentData?.paid_amount,
              capture_method: paymentData?.capture_method,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true, paid: false, checked: pendingOrders.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    log("Checking specific payment", { order_nsu, transaction_nsu, slug });

    // Verificar pagamento específico
    const { paid, data: paymentData } = await checkPaymentWithAPI(order_nsu, transaction_nsu, slug);

    if (paid) {
      // Atualizar na tabela correspondente
      const tableName = table || "payment_orders";
      
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("nsu_order", order_nsu);

      if (updateError) {
        log("DB update error", updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        paid,
        amount: paymentData?.amount,
        paid_amount: paymentData?.paid_amount,
        capture_method: paymentData?.capture_method,
      }),
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