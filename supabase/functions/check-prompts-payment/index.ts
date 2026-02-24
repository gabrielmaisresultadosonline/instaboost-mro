import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INFINITEPAY_HANDLE = "paguemro";

const log = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-PROMPTS-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase configuration" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    log("Checking Prompts payment");

    const body = await req.json();
    const { nsu_order, transaction_nsu, slug } = body;

    if (!nsu_order) {
      return new Response(
        JSON.stringify({ error: "Missing nsu_order" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Find order
    const { data: order, error: orderError } = await supabase
      .from("prompts_mro_orders")
      .select("*")
      .eq("nsu_order", nsu_order)
      .maybeSingle();

    if (orderError || !order) {
      log("Order not found", { nsu_order });
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Already completed
    if (order.status === "completed") {
      return new Response(
        JSON.stringify({ success: true, status: "completed", order }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Already paid - create access
    if (order.status === "paid") {
      await createUserAccess(supabase, order);
      const { data: updatedOrder } = await supabase
        .from("prompts_mro_orders")
        .select("*")
        .eq("nsu_order", nsu_order)
        .single();
      return new Response(
        JSON.stringify({ success: true, status: updatedOrder?.status || "paid", order: updatedOrder }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Try InfiniPay API checks
    const paymentConfirmed = await checkInfiniPayPayment(order, nsu_order, transaction_nsu, slug);

    if (paymentConfirmed) {
      log("Payment confirmed, updating order");
      await supabase
        .from("prompts_mro_orders")
        .update({ status: "paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("nsu_order", nsu_order);

      await createUserAccess(supabase, order);

      const { data: updatedOrder } = await supabase
        .from("prompts_mro_orders")
        .select("*")
        .eq("nsu_order", nsu_order)
        .single();

      return new Response(
        JSON.stringify({ success: true, status: updatedOrder?.status || "paid", order: updatedOrder, payment_confirmed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Still pending
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

async function checkInfiniPayPayment(order: any, nsu_order: string, transaction_nsu?: string, slug?: string): Promise<boolean> {
  // Method 1: with transaction_nsu and slug
  if (transaction_nsu && slug) {
    try {
      const res = await fetch("https://api.infinitepay.io/invoices/public/checkout/payment_check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: INFINITEPAY_HANDLE, order_nsu: nsu_order, transaction_nsu, slug }),
      });
      const data = await res.json();
      if (data.paid) return true;
    } catch (e) { log("Error checking with transaction_nsu", String(e)); }
  }

  // Method 2: extract lenc from link
  if (order.infinitepay_link) {
    try {
      const url = new URL(order.infinitepay_link);
      const lenc = url.searchParams.get('lenc');
      if (lenc) {
        const res = await fetch("https://api.infinitepay.io/invoices/public/checkout/payment_check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: INFINITEPAY_HANDLE, order_nsu: nsu_order, slug: lenc }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.paid) return true;
        }
      }
    } catch (e) { log("Error checking with lenc", String(e)); }
  }

  // Method 3: direct order_nsu check
  try {
    const res = await fetch("https://api.infinitepay.io/invoices/public/checkout/payment_check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: INFINITEPAY_HANDLE, order_nsu: nsu_order }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.paid) return true;
    }
  } catch (e) { log("Error in direct check", String(e)); }

  return false;
}

async function createUserAccess(supabase: any, order: any) {
  if (order.access_created) return;

  log("Creating user access", { email: order.email });

  try {
    // Check if user already exists
    const { data: existing } = await supabase
      .from("prompts_mro_users")
      .select("id")
      .eq("email", order.email)
      .maybeSingle();

    if (existing) {
      // Reactivate existing user
      await supabase
        .from("prompts_mro_users")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      // Create new user - password = email
      const password = order.email.split("@")[0] + "2025";
      await supabase.from("prompts_mro_users").insert({
        name: order.name || order.email.split("@")[0],
        email: order.email,
        password,
        status: "active",
      });
    }

    // Mark order as completed
    await supabase
      .from("prompts_mro_orders")
      .update({
        status: "completed",
        access_created: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    log("User access created successfully");
  } catch (e) {
    log("Error creating user access", String(e));
  }
}
