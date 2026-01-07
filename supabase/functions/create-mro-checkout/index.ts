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
  console.log(`[${timestamp}] [CREATE-MRO-CHECKOUT] ${step}${detailsStr}`);
};

const generateNSU = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `MROIG${timestamp}${random}`.toUpperCase();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Creating MRO checkout link");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const { email, username, phone, planType, amount, checkUserExists } = body;

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Email inválido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!username || username.length < 4) {
      return new Response(
        JSON.stringify({ error: "Nome de usuário inválido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.toLowerCase().trim();
    const cleanPhone = phone ? phone.replace(/\D/g, "").trim() : "";
    const orderNsu = generateNSU();
    const priceInCents = Math.round((amount || 397) * 100);
    const planLabel = planType === "lifetime" ? "VITALICIO" : "ANUAL";

    // Verificar se usuário já existe na SquareCloud
    if (checkUserExists) {
      try {
        log("Checking if user exists in SquareCloud", { username: cleanUsername });
        const checkUrl = `https://dashboardmroinstagramvini-online.squareweb.app/api/users/${cleanUsername}`;
        const checkResponse = await fetch(checkUrl);
        
        if (checkResponse.ok) {
          const userData = await checkResponse.json();
          if (userData && userData.username) {
            log("User already exists in SquareCloud", { username: cleanUsername });
            return new Response(
              JSON.stringify({ error: "Este nome de usuário já está em uso. Escolha outro.", userExists: true }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
            );
          }
        }
      } catch (e) {
        log("Error checking user existence (continuing)", e);
      }
    }

    // Redirect URL para página de obrigado
    // A InfiniPay adiciona automaticamente: order_nsu, transaction_nsu, slug, capture_method, receipt_url
    const redirectUrl = `https://maisresultadosonline.com.br/mro-obrigado`;
    
    // Webhook URL para receber notificação automática de pagamento
    const webhookUrl = `${supabaseUrl}/functions/v1/infinitepay-webhook`;

    log("Preparing InfiniPay integrated link", { 
      email: cleanEmail, 
      username: cleanUsername,
      planType,
      orderNsu, 
      priceInCents,
      webhookUrl
    });

    // Descrição do produto inclui email e username para identificação
    // Formato: MROIG_PLANO_username_email (email pode incluir afiliado:email@real.com)
    let productDescription = `MROIG_${planType === "lifetime" ? "VITALICIO" : "ANUAL"}_${cleanUsername}_${cleanEmail}`;
    
    // Email para mostrar no checkout (sem prefixo do afiliado)
    let customerEmailForPayment = cleanEmail;
    if (cleanEmail.includes(":") && cleanEmail.includes("@")) {
      const emailParts = cleanEmail.split(":");
      customerEmailForPayment = emailParts.slice(1).join(":");
    }

    // Criar link integrado InfiniPay com webhook_url
    const itemData = [{
      name: productDescription,
      price: priceInCents,
      quantity: 1
    }];

    // Codificar items para URL
    const itemsEncoded = encodeURIComponent(JSON.stringify(itemData));
    
    // Criar link integrado com NSU no redirect + webhook para verificação automática
    const paymentLink = `https://checkout.infinitepay.io/${INFINITEPAY_HANDLE}?items=${itemsEncoded}&redirect_url=${encodeURIComponent(redirectUrl)}&webhook_url=${encodeURIComponent(webhookUrl)}`;

    log("Integrated payment link created with webhook", { paymentLink, orderNsu, webhookUrl });

    // Salvar pedido no banco (expira em 30 minutos)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const { data: orderData, error: insertError } = await supabase
      .from("mro_orders")
      .insert({
        email: cleanEmail,
        username: cleanUsername,
        phone: cleanPhone || null,
        plan_type: planType,
        amount: amount || 397,
        status: "pending",
        nsu_order: orderNsu,
        infinitepay_link: paymentLink,
        expired_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      log("Error saving order", insertError);
      throw insertError;
    }

    log("Order created successfully", { orderId: orderData.id, paymentLink, orderNsu });

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderData.id,
        nsu_order: orderNsu,
        payment_link: paymentLink,
        email: cleanEmail,
        username: cleanUsername,
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