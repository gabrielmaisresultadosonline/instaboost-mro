import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [VERIFY-EURO-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Verifying Euro payment");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const { session_id, order_id } = body;

    if (!session_id && !order_id) {
      return new Response(
        JSON.stringify({ error: "session_id ou order_id é obrigatório" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    let order;

    // Get order from database
    if (order_id) {
      const { data, error } = await supabase
        .from("mro_euro_orders")
        .select("*")
        .eq("id", order_id)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Pedido não encontrado" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }
      order = data;
    } else if (session_id) {
      const { data, error } = await supabase
        .from("mro_euro_orders")
        .select("*")
        .eq("stripe_session_id", session_id)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Pedido não encontrado" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }
      order = data;
    }

    // If already completed, return success
    if (order.status === "completed") {
      log("Order already completed", { orderId: order.id });
      return new Response(
        JSON.stringify({
          success: true,
          status: "completed",
          order: order,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check payment status with Stripe
    const stripeSessionId = order.stripe_session_id;
    if (!stripeSessionId) {
      return new Response(
        JSON.stringify({ error: "Session ID não encontrado no pedido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const stripeSession = await stripe.checkout.sessions.retrieve(stripeSessionId);
    log("Stripe session retrieved", { 
      sessionId: stripeSession.id, 
      paymentStatus: stripeSession.payment_status,
      status: stripeSession.status
    });

    if (stripeSession.payment_status === "paid") {
      // Payment confirmed - update order and create access
      const now = new Date().toISOString();

      // Update order status to paid
      await supabase
        .from("mro_euro_orders")
        .update({
          status: "paid",
          paid_at: now,
          stripe_payment_intent: stripeSession.payment_intent as string,
        })
        .eq("id", order.id);

      log("Order marked as paid", { orderId: order.id });

      // Create user access in SquareCloud
      try {
        log("Creating user access in SquareCloud", { username: order.username });
        
        const createUserUrl = `https://dashboardmroinstagramvini-online.squareweb.app/api/users`;
        const createResponse = await fetch(createUserUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: order.username,
            password: order.username, // password = username
            days: 365, // 1 year access
            email: order.email,
          }),
        });

        if (createResponse.ok) {
          log("User created successfully in SquareCloud");
          
          // Mark as completed
          await supabase
            .from("mro_euro_orders")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              api_created: true,
            })
            .eq("id", order.id);

          // Also save to created_accesses table for tracking
          await supabase
            .from("created_accesses")
            .insert({
              customer_email: order.email,
              customer_name: order.username,
              username: order.username,
              password: order.username,
              service_type: "mro_instagram_euro",
              access_type: "annual",
              days_access: 365,
              expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              api_created: true,
              notes: `Pagamento Euro via Stripe - Session: ${stripeSessionId}`,
            });

          return new Response(
            JSON.stringify({
              success: true,
              status: "completed",
              message: "Pagamento confirmado e acesso liberado!",
              order: {
                ...order,
                status: "completed",
              },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        } else {
          const errorText = await createResponse.text();
          log("Error creating user in SquareCloud", { error: errorText });
          
          return new Response(
            JSON.stringify({
              success: true,
              status: "paid",
              message: "Pagamento confirmado! Acesso será liberado em breve.",
              order: {
                ...order,
                status: "paid",
              },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
      } catch (apiError) {
        log("Error calling SquareCloud API", apiError);
        
        return new Response(
          JSON.stringify({
            success: true,
            status: "paid",
            message: "Pagamento confirmado! Acesso será liberado em breve.",
            order: {
              ...order,
              status: "paid",
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    // Payment not confirmed yet
    return new Response(
      JSON.stringify({
        success: false,
        status: order.status,
        message: "Pagamento ainda não confirmado",
        order: order,
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
