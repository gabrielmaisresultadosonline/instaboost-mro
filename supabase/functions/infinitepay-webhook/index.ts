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

    // Parse the webhook payload
    const body = await req.json();
    log("Webhook payload", body);

    // InfiniPay webhook structure may vary - handle different formats
    // The product name format is: MRO_email@cliente.com
    
    let email: string | null = null;
    let productName: string | null = null;
    let status: string | null = null;
    let transactionId: string | null = null;

    // Try to extract from items array (checkout format)
    if (body.items && Array.isArray(body.items)) {
      for (const item of body.items) {
        if (item.name && item.name.startsWith("MRO_")) {
          productName = item.name;
          email = item.name.replace("MRO_", "").toLowerCase();
          break;
        }
      }
    }

    // Try to extract from direct fields
    if (body.product_name && body.product_name.startsWith("MRO_")) {
      productName = body.product_name;
      email = body.product_name.replace("MRO_", "").toLowerCase();
    }

    // Try to extract from description
    if (body.description && body.description.startsWith("MRO_")) {
      productName = body.description;
      email = body.description.replace("MRO_", "").toLowerCase();
    }

    // Get status
    status = body.status || body.payment_status || body.transaction_status;
    transactionId = body.transaction_id || body.id || body.nsu;

    log("Parsed webhook data", { email, productName, status, transactionId });

    if (!email) {
      log("Could not extract email from webhook payload");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Could not identify payment - no MRO_ product found" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if payment is confirmed/approved
    const paidStatuses = ["paid", "approved", "confirmed", "success", "completed", "PAID", "APPROVED"];
    const isPaid = status && paidStatuses.includes(status.toLowerCase?.() || status);

    if (!isPaid && status) {
      log("Payment not confirmed yet", { status });
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Payment status received: ${status}`,
          email 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Find pending order by email
    const { data: order, error: fetchError } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("email", email)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      log("Error fetching order", fetchError);
      throw fetchError;
    }

    if (!order) {
      log("No pending order found for email", { email });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No pending order found for this email",
          email 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    log("Found pending order", { orderId: order.id, email: order.email });

    // Mark order as paid
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
      throw updateError;
    }

    log("Order marked as paid", { orderId: order.id, email: order.email });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment confirmed successfully",
        order_id: order.id,
        email: order.email,
        transaction_id: transactionId,
      }),
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
