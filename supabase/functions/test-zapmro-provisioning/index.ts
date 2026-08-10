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
  const { data: order } = await supabase.from("zapmro_orders").insert({
    username: testUser,
    email: testEmail,
    plan_type: "monthly",
    amount: 67,
    status: "pending",
    nsu_order: "TEST_" + Date.now()
  }).select().single();

  log("Test order created", order);

  // 2. Mock payment confirmation (this would normally happen via webhook)
  // We'll update the order status
  const { error: updateError } = await supabase.from("zapmro_orders").update({
    status: "paid",
    paid_at: new Date().toISOString()
  }).eq("id", order.id);

  if (updateError) log("Error updating order", updateError);
  else log("Order marked as paid");

  return new Response(JSON.stringify({ success: true, user: testUser }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

serve(testProvisioning);
