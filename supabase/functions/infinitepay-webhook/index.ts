import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { verifyInfinitePayWebhook } from "../_shared/webhook-security.ts";

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

// Função para salvar log do webhook
async function saveWebhookLog(
  supabase: any,
  logData: {
    event_type: string;
    order_nsu?: string | null;
    transaction_nsu?: string | null;
    email?: string | null;
    username?: string | null;
    affiliate_id?: string | null;
    amount?: number | null;
    status: string;
    payload?: any;
    result_message?: string | null;
    order_found?: boolean;
    order_id?: string | null;
  }
) {
  try {
    await supabase.from("infinitepay_webhook_logs").insert({
      event_type: logData.event_type,
      order_nsu: logData.order_nsu || null,
      transaction_nsu: logData.transaction_nsu || null,
      email: logData.email || null,
      username: logData.username || null,
      affiliate_id: logData.affiliate_id || null,
      amount: logData.amount || null,
      status: logData.status,
      payload: logData.payload || null,
      result_message: logData.result_message || null,
      order_found: logData.order_found || false,
      order_id: logData.order_id || null,
    });
    log("Webhook log saved");
  } catch (e) {
    log("Error saving webhook log", { error: String(e) });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Webhook received", { method: req.method });

    // Verify webhook signature for security
    const verification = await verifyInfinitePayWebhook(req, corsHeaders, "INFINITEPAY-WEBHOOK");
    if (!verification.verified) {
      return verification.response;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Parse the webhook payload from InfiniPay
    const body = verification.body;
    log("Webhook payload", body);

    const order_nsu = body.order_nsu as string | undefined;
    const transaction_nsu = body.transaction_nsu as string | undefined;
    const invoice_slug = body.invoice_slug as string | undefined;
    const amount = body.amount as number | undefined;
    const paid_amount = body.paid_amount as number | undefined;
    const capture_method = body.capture_method as string | undefined;
    const receipt_url = body.receipt_url as string | undefined;
    const items = body.items as Array<{ description?: string; name?: string }> | undefined;

    // Extrair informações do nome do produto
    let email: string | null = null;
    let emailWithAffiliate: string | null = null;
    let username: string | null = null;
    let affiliateId: string | null = null;
    let isMROOrder = false;
    let isPromptsOrder = false;
    
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const itemName = item.description || item.name || "";
        log("Processing item", { itemName });
        
        // Formato PROMPTS: PROMPTS_email@domain.com
        if (itemName.startsWith("PROMPTS_")) {
          isPromptsOrder = true;
          email = itemName.replace("PROMPTS_", "").toLowerCase();
          log("Parsed PROMPTS order", { email });
          break;
        }
        
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

    // PROMPTS MRO orders
    if (isPromptsOrder || (order_nsu && typeof order_nsu === 'string' && order_nsu.startsWith("PROMPTS"))) {
      log("Processing as PROMPTS order", { order_nsu, email });
      
      let promptsOrder = null;

      if (order_nsu) {
        const result = await supabase
          .from("prompts_mro_payment_orders")
          .select("*")
          .eq("nsu_order", order_nsu)
          .eq("status", "pending")
          .maybeSingle();
        promptsOrder = result.data;
        if (promptsOrder) log("Found PROMPTS order by NSU", { orderId: promptsOrder.id });
      }

      if (!promptsOrder && email) {
        const result = await supabase
          .from("prompts_mro_payment_orders")
          .select("*")
          .eq("email", email)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        promptsOrder = result.data;
        if (promptsOrder) log("Found PROMPTS order by email", { orderId: promptsOrder.id });
      }

      if (!promptsOrder) {
        log("No pending PROMPTS order found", { order_nsu, email });
        await saveWebhookLog(supabase, {
          event_type: "prompts_order_not_found",
          order_nsu: order_nsu || null,
          transaction_nsu: transaction_nsu || null,
          email,
          amount: (paid_amount || amount) as number | null | undefined,
          status: "not_found",
          payload: body,
          result_message: "No pending PROMPTS order found",
          order_found: false,
        });
        return new Response(
          JSON.stringify({ success: false, error: "No pending PROMPTS order found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Mark as paid
      await supabase.from("prompts_mro_payment_orders").update({
        status: "paid",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", promptsOrder.id);

      // Unlock user - determine plan based on amount (<=50 = monthly 30 days, >50 = annual 365 days)
      const isMonthly = promptsOrder.amount <= 50;
      const planDays = isMonthly ? 30 : 365;
      const planLabel = isMonthly ? 'PRO Mensal (30 dias)' : 'PRO Anual (365 dias)';
      const subscriptionEnd = new Date(Date.now() + planDays * 24 * 60 * 60 * 1000).toISOString();
      let userName = 'Cliente';
      if (promptsOrder.user_id) {
        await supabase.from("prompts_mro_users").update({
          is_paid: true,
          paid_at: new Date().toISOString(),
          subscription_end: subscriptionEnd,
        }).eq("id", promptsOrder.user_id);

        // Fetch user name for email
        const { data: userData } = await supabase.from("prompts_mro_users").select("name, email").eq("id", promptsOrder.user_id).single();
        if (userData?.name) userName = userData.name;
      }

      log("PROMPTS order marked as PAID and user unlocked", { orderId: promptsOrder.id, planLabel, planDays });

      // Send payment confirmation email
      try {
        const smtpPassword = Deno.env.get("SMTP_PASSWORD");
        if (smtpPassword) {
          const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
          const endDate = new Date(subscriptionEnd);
          const formattedEnd = endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

          const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;">
<tr><td style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:30px;text-align:center;">
<div style="background:#fff;color:#22c55e;display:inline-block;padding:8px 20px;border-radius:8px;font-size:24px;font-weight:bold;letter-spacing:2px;">✨ PROMPTS MRO</div>
<h1 style="color:#fff;margin:15px 0 0;font-size:22px;">🎉 Pagamento Confirmado!</h1>
</td></tr>
<tr><td style="padding:30px;">
<div style="background:#f0fdf4;border:2px solid #22c55e;padding:20px;border-radius:10px;margin-bottom:20px;text-align:center;">
<p style="margin:0 0 5px;color:#16a34a;font-size:20px;font-weight:bold;">Parabéns, ${userName}! 🥳</p>
<p style="margin:0;color:#333;font-size:15px;">Seu plano <strong>${planLabel}</strong> foi ativado com sucesso!</p>
</div>
<div style="background:linear-gradient(135deg,#7c3aed10,#ec489910);border:2px solid #7c3aed;border-radius:10px;padding:20px;margin:20px 0;text-align:center;">
<p style="margin:0 0 8px;font-size:14px;color:#666;">Seu acesso é válido até:</p>
<p style="margin:0;font-size:28px;font-weight:bold;color:#7c3aed;">${formattedEnd}</p>
<p style="margin:8px 0 0;font-size:16px;color:#333;">⏱️ <strong>${planDays} dias</strong> de acesso</p>
</div>
<h3 style="color:#333;margin:25px 0 15px;">O que você ganhou:</h3>
<table width="100%">
<tr><td style="padding:8px 0;"><span style="background:#7c3aed;color:#fff;padding:3px 10px;border-radius:15px;font-size:13px;margin-right:8px;">✓</span> Acesso a <strong>+1000 prompts</strong> profissionais</td></tr>
<tr><td style="padding:8px 0;"><span style="background:#7c3aed;color:#fff;padding:3px 10px;border-radius:15px;font-size:13px;margin-right:8px;">✓</span> Cópias <strong>ilimitadas</strong></td></tr>
<tr><td style="padding:8px 0;"><span style="background:#7c3aed;color:#fff;padding:3px 10px;border-radius:15px;font-size:13px;margin-right:8px;">✓</span> Categorias <strong>Feminino, Masculino, Empresarial e Geral</strong></td></tr>
</table>
<table width="100%"><tr><td style="text-align:center;padding:25px 0;">
<a href="https://maisresultadosonline.com.br/prompts/dashboard" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;text-decoration:none;padding:15px 40px;border-radius:8px;font-weight:bold;font-size:16px;">🚀 Acessar Meus Prompts</a>
</td></tr></table>
</td></tr>
<tr><td style="background:#1a1a1a;padding:20px;text-align:center;">
<p style="color:#22c55e;margin:0 0 8px;font-weight:bold;">Obrigado por confiar na Prompts MRO! 💚</p>
<p style="color:#888;margin:0;font-size:12px;">© ${new Date().getFullYear()} MRO - Mais Resultados Online</p>
</td></tr>
</table></body></html>`;

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
          await client.send({
            from: "Prompts MRO <suporte@maisresultadosonline.com.br>",
            to: promptsOrder.email,
            subject: `🎉 Pagamento Confirmado - Plano ${planLabel} Prompts MRO!`,
            content: "auto",
            html: emailHtml,
          });
          await client.close();
          log("Payment confirmation email sent", { email: promptsOrder.email, planLabel });
        }
      } catch (emailErr) {
        log("Error sending payment email (non-blocking)", { error: String(emailErr) });
      }

      await saveWebhookLog(supabase, {
        event_type: "prompts_payment_confirmed",
        order_nsu: order_nsu || null,
        transaction_nsu: transaction_nsu || null,
        email: promptsOrder.email,
        amount: (paid_amount || amount) as number | null | undefined,
        status: "success",
        payload: body,
        result_message: `PROMPTS order ${promptsOrder.id} marked as PAID - ${planLabel}`,
        order_found: true,
        order_id: promptsOrder.id,
      });

      return new Response(
        JSON.stringify({ success: true, message: "PROMPTS Payment confirmed", order_id: promptsOrder.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Se é um pedido MRO, processar na tabela mro_orders
    if (isMROOrder || (order_nsu && typeof order_nsu === 'string' && order_nsu.startsWith("MROIG"))) {
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

      // Tentar buscar pelo email real em qualquer lugar do campo email (afiliado:email)
      if (!mroOrder && email) {
        const result = await supabase
          .from("mro_orders")
          .select("*")
          .ilike("email", `%${email}%`)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        mroOrder = result.data;
        
        if (mroOrder) {
          log("Found MRO order by email pattern match (ILIKE)", { orderId: mroOrder.id, searchedEmail: email, foundEmail: mroOrder.email });
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
        
        // Salvar log de webhook não encontrado
        await saveWebhookLog(supabase, {
          event_type: "mro_order_not_found",
          order_nsu: order_nsu || null,
          transaction_nsu: transaction_nsu || null,
          email,
          username,
          affiliate_id: affiliateId,
          amount: (paid_amount || amount) as number | null | undefined,
          status: "not_found",
          payload: body,
          result_message: "No pending MRO order found",
          order_found: false,
        });
        
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
      
      // Salvar log de sucesso
      await saveWebhookLog(supabase, {
        event_type: "mro_payment_confirmed",
        order_nsu: order_nsu || null,
        transaction_nsu: transaction_nsu || null,
        email: mroOrder.email,
        username: mroOrder.username,
        affiliate_id: affiliateId,
        amount: (paid_amount || amount) as number | null | undefined,
        status: "success",
        payload: body,
        result_message: `MRO order ${mroOrder.id} marked as PAID`,
        order_found: true,
        order_id: mroOrder.id,
      });

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
