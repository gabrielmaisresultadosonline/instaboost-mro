import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "E-mail é obrigatório" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const INFINITEPAY_API = "https://api.infinitepay.io";
    const INFINITEPAY_CLIENT_ID = Deno.env.get("INFINITEPAY_CLIENT_ID");
    const INFINITEPAY_CLIENT_SECRET = Deno.env.get("INFINITEPAY_CLIENT_SECRET");

    // Gerar NSU único
    const nsuOrder = `COR${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Criar link de pagamento InfinitePay
    const paymentData = {
      amount: 1990, // R$ 19,90 em centavos
      order_id: nsuOrder,
      metadata: {
        email: email.toLowerCase(),
        product: "corretor_mro",
        days: 30
      }
    };

    console.log("Criando checkout para:", email);
    
    // Para testes, retornar um link simulado
    // Na produção, integrar com InfinitePay ou outro gateway
    const paymentLink = `https://pay.infinitepay.io/checkout?amount=1990&email=${encodeURIComponent(email)}&ref=${nsuOrder}`;

    return new Response(
      JSON.stringify({
        success: true,
        payment_link: paymentLink,
        nsu_order: nsuOrder
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Erro no checkout:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
