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
  console.log(`[${timestamp}] [INFINITEPAY-WEBHOOK] ${step}${detailsStr}`);
};

// Função para verificar pagamento via API da InfiniPay
async function verifyPaymentWithAPI(orderNsu: string, transactionNsu?: string, slug?: string): Promise<{ paid: boolean; data?: any }> {
  try {
    log("Verifying payment via InfiniPay API", { orderNsu, transactionNsu, slug });
    
    const response = await fetch(
      "https://api.infinitepay.io/invoices/public/checkout/payment_check",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: INFINITEPAY_HANDLE,
          order_nsu: orderNsu,
          ...(transactionNsu && { transaction_nsu: transactionNsu }),
          ...(slug && { slug: slug }),
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      log("InfiniPay API response", data);
      return { paid: data.paid === true, data };
    } else {
      log("InfiniPay API error", { status: response.status });
      return { paid: false };
    }
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

    // Extrair informações do nome do produto
    let email: string | null = null;
    let emailWithAffiliate: string | null = null;
    let username: string | null = null;
    let affiliateId: string | null = null;
    let isMROOrder = false;
    
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const itemName = item.description || item.name || "";
        log("Processing item", { itemName });
        
        // Formato MRO: MROIG_ANUAL_username_afiliado:email ou MROIG_VITALICIO_username_email
        if (itemName.startsWith("MROIG_")) {
          isMROOrder = true;
          const parts = itemName.split("_");
          if (parts.length >= 4) {
            username = parts[2];
            emailWithAffiliate = parts.slice(3).join("_").toLowerCase();
            
            if (emailWithAffiliate && emailWithAffiliate.includes(":") && emailWithAffiliate.includes("@")) {
              const colonIndex = emailWithAffiliate.indexOf(":");
              const potentialAffiliate = emailWithAffiliate.substring(0, colonIndex);
              const potentialEmail = emailWithAffiliate.substring(colonIndex + 1);
              
              if (potentialEmail.includes("@")) {
                affiliateId = potentialAffiliate;
                email = potentialEmail;
                log("Detected affiliate sale", { affiliateId, realEmail: email });
              } else {
                email = emailWithAffiliate;
              }
            } else if (emailWithAffiliate) {
              email = emailWithAffiliate;
            }
          }
          log("Parsed MRO order", { username, email, emailWithAffiliate, affiliateId });
          break;
        }
        else if (itemName.startsWith("MRO_")) {
          email = itemName.replace("MRO_", "").toLowerCase();
          emailWithAffiliate = email;
          break;
        }
      }
    }

    log("Parsed webhook data", { 
      order_nsu, 
      transaction_nsu, 
      email, 
      emailWithAffiliate,
      affiliateId,
      username,
      isMROOrder,
      amount, 
      paid_amount,
      capture_method 
    });

    // Se é um pedido MRO, processar na tabela mro_orders
    if (isMROOrder || (order_nsu && order_nsu.startsWith("MROIG"))) {
      log("Processing as MRO order");
      
      let mroOrder = null;

      // Buscar pedido pelo NSU
      if (order_nsu) {
        const result = await supabase
          .from("mro_orders")
          .select("*")
          .eq("nsu_order", order_nsu)
          .eq("status", "pending")
          .maybeSingle();
        
        mroOrder = result.data;
        
        if (mroOrder) {
          log("Found MRO order by NSU", { orderId: mroOrder.id, nsu: order_nsu });
        }
      }

      // Se não encontrou pelo NSU, tentar pelo email com afiliado + username
      if (!mroOrder && emailWithAffiliate && username) {
        const result = await supabase
          .from("mro_orders")
          .select("*")
          .eq("email", emailWithAffiliate)
          .eq("username", username)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        mroOrder = result.data;
        
        if (mroOrder) {
          log("Found MRO order by emailWithAffiliate+username", { orderId: mroOrder.id });
        }
      }

      // Tentar pelo email real + username
      if (!mroOrder && email && username && email !== emailWithAffiliate) {
        const result = await supabase
          .from("mro_orders")
          .select("*")
          .eq("email", email)
          .eq("username", username)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        mroOrder = result.data;
        
        if (mroOrder) {
          log("Found MRO order by realEmail+username", { orderId: mroOrder.id });
        }
      }

      // Última tentativa: buscar só pelo username
      if (!mroOrder && username) {
        const result = await supabase
          .from("mro_orders")
          .select("*")
          .eq("username", username)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        mroOrder = result.data;
        
        if (mroOrder) {
          log("Found MRO order by username only", { orderId: mroOrder.id });
        }
      }

      // Se ainda não encontrou, verificar via API da InfiniPay e buscar pedidos pendentes recentes
      if (!mroOrder && order_nsu) {
        log("No order found, verifying payment via API and checking recent pending orders");
        
        // Verificar se o pagamento foi confirmado via API
        const { paid } = await verifyPaymentWithAPI(order_nsu, transaction_nsu, invoice_slug);
        
        if (paid) {
          log("Payment confirmed via API, looking for recent pending orders");
          
          // Buscar pedidos pendentes recentes (últimos 30 minutos)
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
          const { data: recentOrders } = await supabase
            .from("mro_orders")
            .select("*")
            .eq("status", "pending")
            .gte("created_at", thirtyMinutesAgo)
            .order("created_at", { ascending: false })
            .limit(10);
          
          if (recentOrders && recentOrders.length > 0) {
            // Tentar encontrar pelo email ou username no item description
            for (const order of recentOrders) {
              if (
                (email && order.email.includes(email)) ||
                (username && order.username === username) ||
                (emailWithAffiliate && order.email === emailWithAffiliate)
              ) {
                mroOrder = order;
                log("Found matching order from recent pending", { orderId: order.id });
                break;
              }
            }
            
            // Se não encontrou match específico, pegar o mais recente
            if (!mroOrder) {
              mroOrder = recentOrders[0];
              log("Using most recent pending order", { orderId: mroOrder.id });
            }
          }
        }
      }

      if (!mroOrder) {
        log("No pending MRO order found", { order_nsu, email, emailWithAffiliate, username });
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "No pending MRO order found",
            order_nsu,
            email,
            emailWithAffiliate,
            username
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Atualizar pedido MRO para pago
      const { error: updateError } = await supabase
        .from("mro_orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", mroOrder.id);

      if (updateError) {
        log("Error updating MRO order", updateError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to update order" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      log("MRO order marked as PAID, triggering webhook", { orderId: mroOrder.id });

      // Chamar o mro-payment-webhook para processar o acesso
      try {
        const webhookResult = await supabase.functions.invoke("mro-payment-webhook", {
          body: {
            order_nsu: mroOrder.nsu_order,
            items: [{
              description: `MROIG_${mroOrder.plan_type === "lifetime" ? "VITALICIO" : "ANUAL"}_${mroOrder.username}_${mroOrder.email}`
            }]
          }
        });

        log("MRO webhook invoked", { result: webhookResult.data });
      } catch (webhookError) {
        log("Error invoking MRO webhook (will retry manually)", { error: String(webhookError) });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "MRO Payment confirmed successfully",
          order_id: mroOrder.id,
          email: mroOrder.email,
          username: mroOrder.username
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Processar como pedido normal (payment_orders)
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
      return new Response(
        JSON.stringify({ success: false, error: "Database error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (!order) {
      log("No pending order found", { order_nsu, email });
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

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
