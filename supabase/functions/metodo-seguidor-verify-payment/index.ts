import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [METODO-SEGUIDOR-VERIFY] ${step}`, details ? JSON.stringify(details) : "");
};

// Send email via SMTP
async function sendAccessEmail(
  email: string,
  username: string,
  instagramLink: string | null
): Promise<boolean> {
  try {
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    if (!smtpPassword) {
      log("SMTP password not configured");
      return false;
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.hostinger.com",
        port: 465,
        tls: true,
        auth: {
          username: "suporte@maisresultadosonline.com.br",
          password: smtpPassword,
        },
      },
    });

    const instagramSection = instagramLink ? `
      <p style="color: #9ca3af; margin: 8px 0;">
        <strong style="color: #f59e0b;">Perfil do Instagram:</strong> <a href="${instagramLink}" style="color: #60a5fa;">${instagramLink}</a>
      </p>
    ` : '';

    await client.send({
      from: "MRO - Mais Resultados Online <suporte@maisresultadosonline.com.br>",
      to: email,
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
              <strong style="color: #f59e0b;">Usuário:</strong> ${username}
            </p>
            <p style="color: #9ca3af; margin: 8px 0;">
              <strong style="color: #f59e0b;">Senha:</strong> ${username}
            </p>
            ${instagramSection}
          </div>

          <div style="background-color: #064e3b; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="color: #10b981; margin: 0; font-weight: bold;">
              🔧 Agora vamos corrigir o perfil do seu Instagram com os métodos da MRO e deixar tudo profissional!
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
          
          <hr style="border-color: #333; margin: 30px 0;">
          <p style="color: #6b7280; text-align: center; font-size: 12px;">
            MRO - Mais Resultados Online<br>
            Este é um email automático, não responda.
          </p>
        </div>
      `,
    });

    await client.close();
    log("Email sent successfully", { to: email });
    return true;
  } catch (error) {
    log("Error sending email", error);
    return false;
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
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const { nsu_order, email } = body;

    // Support both nsu_order and email-based lookup
    let order: any = null;

    if (nsu_order) {
      log("Verifying payment by NSU", { nsu_order });
      const { data } = await supabase
        .from("metodo_seguidor_orders")
        .select("*")
        .eq("nsu_order", nsu_order)
        .maybeSingle();
      order = data;
    } else if (email) {
      log("Verifying payment by email", { email });
      const { data } = await supabase
        .from("metodo_seguidor_orders")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      order = data;
    }

    if (!order) {
      return new Response(
        JSON.stringify({ error: "Order not found", success: false }),
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

    // Call InfiniPay to check payment status using mroseg_email format
    const searchKey = `mroseg_${order.email}`;
    log("Checking InfiniPay with key", { searchKey, nsu: order.nsu_order });

    try {
      // Try NSU-based check first
      const checkResponse = await fetch(
        `https://api.infinitepay.io/invoices/public/payment_check/${order.nsu_order}`,
        { method: "GET" }
      );

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        log("InfiniPay check response", checkData);

        if (checkData.paid === true || checkData.status === "paid") {
          return await processPayment(supabase, order);
        }
      }

      // Also try searching by email pattern
      const searchResponse = await fetch(
        `https://api.infinitepay.io/invoices/public/search?q=${encodeURIComponent(searchKey)}`,
        { method: "GET" }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        log("InfiniPay search response", searchData);

        if (searchData.items && searchData.items.length > 0) {
          const paidItem = searchData.items.find((item: any) => 
            item.paid === true || item.status === "paid"
          );
          if (paidItem) {
            return await processPayment(supabase, order);
          }
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

async function processPayment(supabase: any, order: any) {
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
      if (!user.email_sent) {
        const emailSent = await sendAccessEmail(order.email, user.username, user.instagram_username);

        if (emailSent) {
          await supabase
            .from("metodo_seguidor_users")
            .update({
              email_sent: true,
              email_sent_at: new Date().toISOString()
            })
            .eq("id", user.id);
        }
      }
    }
  }

  log("Payment verified successfully", { order_id: order.id });

  return new Response(
    JSON.stringify({ success: true, paid: true }),
    { headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
  );
}
