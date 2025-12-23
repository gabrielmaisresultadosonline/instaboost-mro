import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [METODO-SEGUIDOR-WEBHOOK] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Webhook received");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    log("Webhook body", body);

    // Extract order NSU from webhook
    const orderNsu = body.order_nsu || body.nsu || body.metadata?.order_nsu;
    const paymentStatus = body.status || body.payment_status;
    const isPaid = paymentStatus === "paid" || paymentStatus === "approved" || body.paid === true;

    if (!orderNsu) {
      log("No order NSU found");
      return new Response(JSON.stringify({ received: true }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (!isPaid) {
      log("Payment not confirmed", { status: paymentStatus });
      return new Response(JSON.stringify({ received: true }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Find order
    const { data: order, error: orderError } = await supabase
      .from("metodo_seguidor_orders")
      .select("*")
      .eq("nsu_order", orderNsu)
      .maybeSingle();

    if (orderError || !order) {
      log("Order not found", { orderNsu, error: orderError });
      return new Response(JSON.stringify({ error: "Order not found" }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404 
      });
    }

    if (order.status === "paid") {
      log("Order already paid", { orderNsu });
      return new Response(JSON.stringify({ received: true, already_paid: true }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Update order status
    const { error: updateOrderError } = await supabase
      .from("metodo_seguidor_orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        verified_at: new Date().toISOString()
      })
      .eq("id", order.id);

    if (updateOrderError) {
      log("Error updating order", updateOrderError);
    }

    // Get user and update status
    if (order.user_id) {
      const { data: user, error: userError } = await supabase
        .from("metodo_seguidor_users")
        .select("*")
        .eq("id", order.user_id)
        .maybeSingle();

      if (user) {
        const { error: updateUserError } = await supabase
          .from("metodo_seguidor_users")
          .update({
            subscription_status: "active",
            subscription_start: new Date().toISOString()
          })
          .eq("id", user.id);

        if (updateUserError) {
          log("Error updating user", updateUserError);
        }

        // Send email with credentials
        if (resendApiKey) {
          try {
            const resend = new Resend(resendApiKey);
            
            await resend.emails.send({
              from: "MRO <onboarding@resend.dev>",
              to: [order.email],
              subject: "🎉 Seu acesso ao Método de Correção MRO está pronto!",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0a; padding: 40px; border-radius: 16px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #f59e0b; margin: 0;">🎉 Parabéns!</h1>
                    <p style="color: #9ca3af; margin-top: 10px;">Seu acesso foi liberado com sucesso</p>
                  </div>
                  
                  <div style="background-color: #1f2937; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
                    <h2 style="color: #ffffff; margin-top: 0;">Seus dados de acesso:</h2>
                    <p style="color: #9ca3af; margin: 8px 0;">
                      <strong style="color: #f59e0b;">Usuário:</strong> ${user.username}
                    </p>
                    <p style="color: #9ca3af; margin: 8px 0;">
                      <strong style="color: #f59e0b;">Senha:</strong> ${user.password}
                    </p>
                  </div>
                  
                  <div style="text-align: center;">
                    <a href="https://maisresultadosonline.com.br/metodoseguidormembro" 
                       style="display: inline-block; background-color: #f59e0b; color: #000000; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                      Acessar Área de Membros
                    </a>
                  </div>
                  
                  <p style="color: #6b7280; text-align: center; margin-top: 30px; font-size: 14px;">
                    Guarde este email com seus dados de acesso.
                  </p>
                </div>
              `,
            });

            // Update email sent status
            await supabase
              .from("metodo_seguidor_users")
              .update({
                email_sent: true,
                email_sent_at: new Date().toISOString()
              })
              .eq("id", user.id);

            log("Email sent successfully", { email: order.email });
          } catch (emailError) {
            log("Error sending email", emailError);
          }
        } else {
          log("RESEND_API_KEY not configured");
        }
      }
    }

    log("Payment processed successfully", { orderNsu });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
