import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZAPMRO_API_URL = "https://mrozap.squareweb.app";
const log = (step: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [ZAPMRO-PROVISIONING-TEST] ${step}${detailsStr}`);
};

async function testProvisioning() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

  const testUser = "testuser" + Math.floor(Math.random() * 1000);
  const testEmail = `${testUser}@example.com`;
  
  log("Starting provisioning test for", { testUser, testEmail });

  // 1. Create order
  const { data: order, error: orderErr } = await supabase.from("zapmro_orders").insert({
    username: testUser,
    email: testEmail,
    plan_type: "monthly",
    amount: 67,
    status: "pending",
    nsu_order: "TEST_" + Date.now()
  }).select().single();

  if (orderErr) {
    log("Error creating order", orderErr);
    return new Response(JSON.stringify({ success: false, error: orderErr }), { status: 500 });
  }

  log("Test order created", order);

  // 2. Mock payment confirmation via webhook logic
  // We'll call the webhook directly (simulating the POST from InfiniPay)
  const webhookUrl = `${supabaseUrl}/functions/v1/infinitepay-webhook`;
  const webhookPayload = {
    order_nsu: order.nsu_order,
    paid: true,
    status: "paid",
    amount: 67,
    items: [{
      description: `ZAPMRO_MENSAL_${testUser}_${testEmail}`
    }]
  };

  log("Simulating webhook call", webhookPayload);
  
  const webhookResp = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(webhookPayload)
  });

  const webhookResult = await webhookResp.text();
  log("Webhook response", webhookResult);

  // 3. Verify user was created with correct credentials
  const { data: zapUser } = await supabase
    .from("zapmro_users")
    .select("*")
    .eq("username", testUser)
    .single();

  log("Verified user in DB", zapUser);

  return new Response(JSON.stringify({ 
    success: true, 
    user: zapUser, 
    password_expected: testUser 
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

serve(testProvisioning);
