import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [METODO-SEGUIDOR-VERIFY] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const { nsu_order } = body;

    if (!nsu_order) {
      return new Response(
        JSON.stringify({ error: "NSU order required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    log("Verifying payment", { nsu_order });

    // Get order
    const { data: order, error: orderError } = await supabase
      .from("metodo_seguidor_orders")
      .select("*")
      .eq("nsu_order", nsu_order)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Check if already paid
    if (order.status === "paid") {
      return new Response(
        JSON.stringify({ success: true, paid: true, already_processed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (order.expired_at && new Date(order.expired_at) < new Date()) {
      if (order.status !== "expired") {
        await supabase
          .from("metodo_seguidor_orders")
          .update({ status: "expired" })
          .eq("id", order.id);
      }
      return new Response(
        JSON.stringify({ success: false, expired: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call InfiniPay to check payment status
    try {
      const checkResponse = await fetch(
        `https://api.infinitepay.io/invoices/public/payment_check/${nsu_order}`,
        { method: "GET" }
      );

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        log("InfiniPay check response", checkData);

        if (checkData.paid === true || checkData.status === "paid") {
          // Update order
          await supabase
            .from("metodo_seguidor_orders")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              verified_at: new Date().toISOString()
            })
            .eq("id", order.id);

          // Get and update user
          if (order.user_id) {
            const { data: user } = await supabase
              .from("metodo_seguidor_users")
              .select("*")
              .eq("id", order.user_id)
              .maybeSingle();

            if (user) {
              await supabase
                .from("metodo_seguidor_users")
                .update({
                  subscription_status: "active",
                  subscription_start: new Date().toISOString()
                })
                .eq("id", user.id);

              // Send email if not already sent
              if (!user.email_sent && resendApiKey) {
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

                  await supabase
                    .from("metodo_seguidor_users")
                    .update({
                      email_sent: true,
                      email_sent_at: new Date().toISOString()
                    })
                    .eq("id", user.id);

                  log("Email sent", { email: order.email });
                } catch (emailError) {
                  log("Error sending email", emailError);
                }
              }
            }
          }

          log("Payment verified successfully", { nsu_order });

          return new Response(
            JSON.stringify({ success: true, paid: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (checkError) {
      log("Error checking InfiniPay", checkError);
    }

    return new Response(
      JSON.stringify({ success: true, paid: false }),
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
