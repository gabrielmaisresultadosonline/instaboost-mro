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
        // Continuar mesmo se der erro na verificação
      }
    }

    // Webhook URL para receber notificação de pagamento
    const webhookUrl = `${supabaseUrl}/functions/v1/mro-payment-webhook`;
    const redirectUrl = `https://maisresultadosonline.com.br/obrigado?nsu=${orderNsu}`;

    log("Preparing InfiniPay request", { 
      email: cleanEmail, 
      username: cleanUsername,
      planType,
      orderNsu, 
      priceInCents,
      webhookUrl 
    });

    // Descrição do produto inclui email e username para identificação
    // Formato: MROIG_PLANO_username_email (email pode ter prefixo de afiliado: afiliado:email)
    const productDescription = `MROIG_${planLabel}_${cleanUsername}_${cleanEmail}`;
    
    // Para o InfiniPay, usar o email real do cliente (sem prefixo de afiliado)
    // Formato com afiliado: "afiliado:email@gmail.com" -> extrair "email@gmail.com"
    let customerEmailForPayment = cleanEmail;
    if (cleanEmail.includes(':')) {
      const emailParts = cleanEmail.split(':');
      customerEmailForPayment = emailParts.slice(1).join(':'); // Pegar tudo após o primeiro ":"
    }

    // Usar a API pública de invoices para criar link com webhook
    const infinitepayPayload = {
      amount: priceInCents,
      customer_email: customerEmailForPayment, // Email real do cliente
      description: productDescription, // Mantém formato completo com afiliado
      order_nsu: orderNsu,
      redirect_url: redirectUrl,
      webhook_url: webhookUrl,
      metadata: {
        email: cleanEmail, // Email completo com prefixo de afiliado
        real_email: customerEmailForPayment,
        username: cleanUsername,
        plan_type: planType,
        phone: cleanPhone,
      }
    };

    log("Calling InfiniPay Invoice API", infinitepayPayload);

    let paymentLink: string;
    let invoiceSlug: string | null = null;

    try {
      // Tentar criar invoice com a API de invoices (que suporta webhook)
      const infinitepayResponse = await fetch(
        `https://api.infinitepay.io/v2/invoices?handle=${INFINITEPAY_HANDLE}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(infinitepayPayload),
        }
      );

      const infinitepayData = await infinitepayResponse.json();
      log("InfiniPay Invoice response", { status: infinitepayResponse.status, data: infinitepayData });

      if (infinitepayResponse.ok && infinitepayData.url) {
        paymentLink = infinitepayData.url;
        invoiceSlug = infinitepayData.slug || infinitepayData.id || null;
        log("Invoice created successfully", { paymentLink, invoiceSlug });
      } else {
        // Se falhar, tentar API de checkout links
        log("Invoice API failed, trying checkout links API");
        
        const lineItems = [{
          description: productDescription,
          quantity: 1,
          price: priceInCents,
        }];

        const checkoutPayload = {
          handle: INFINITEPAY_HANDLE,
          items: lineItems,
          itens: lineItems,
          order_nsu: orderNsu,
          redirect_url: redirectUrl,
          webhook_url: webhookUrl,
          customer: {
            email: cleanEmail,
          },
        };

        const checkoutResponse = await fetch(
          "https://api.infinitepay.io/invoices/public/checkout/links",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(checkoutPayload),
          }
        );

        const checkoutData = await checkoutResponse.json();
        log("InfiniPay Checkout response", { status: checkoutResponse.status, data: checkoutData });

        if (checkoutResponse.ok && (checkoutData.checkout_url || checkoutData.link || checkoutData.url)) {
          paymentLink = checkoutData.checkout_url || checkoutData.link || checkoutData.url;
          invoiceSlug = checkoutData.slug || null;
        } else {
          // Fallback final: criar link manualmente
          log("Both APIs failed, using manual fallback");
          
          const fallbackItems = JSON.stringify([{
            name: productDescription,
            price: priceInCents,
            quantity: 1
          }]);
          
          paymentLink = `https://checkout.infinitepay.io/${INFINITEPAY_HANDLE}?items=${encodeURIComponent(fallbackItems)}&redirect_url=${encodeURIComponent(redirectUrl)}`;
        }
      }
    } catch (apiError) {
      log("API error, using fallback", { error: String(apiError) });
      
      const fallbackItems = JSON.stringify([{
        name: productDescription,
        price: priceInCents,
        quantity: 1
      }]);
      
      paymentLink = `https://checkout.infinitepay.io/${INFINITEPAY_HANDLE}?items=${encodeURIComponent(fallbackItems)}&redirect_url=${encodeURIComponent(redirectUrl)}`;
    }

    // Salvar pedido no banco (expira em 30 minutos)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
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

    log("Order created successfully", { orderId: orderData.id, paymentLink });

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
