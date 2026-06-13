import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kiwify-token",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Fixed token so Kiwify config never breaks. Configurable as env if needed.
const WEBHOOK_TOKEN = Deno.env.get("KIWIFY_WEBHOOK_TOKEN") || "mroposts2026";

// Events that grant access
const APPROVE_EVENTS = new Set([
  "order_approved",
  "pix_paid",
  "subscription_approved",
  "subscription_renewed",
  "order.paid",
  "compra_aprovada",
]);

// Events that revoke access
const REVOKE_EVENTS = new Set([
  "order_refunded",
  "refund",
  "chargeback",
  "subscription_canceled",
  "subscription_cancelled",
  "order_rejected",
  "compra_recusada",
  "reembolso",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // GET = health check / config info
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, service: "kiwify-webhook", token_required: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Token check: Kiwify sends ?token= in URL
  const token = url.searchParams.get("token") || req.headers.get("x-kiwify-token");
  if (token !== WEBHOOK_TOKEN) {
    return new Response(JSON.stringify({ error: "invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: any = {};
  try {
    const raw = await req.text();
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }

  // Normalize fields from various Kiwify payload shapes
  const event =
    payload.webhook_event_type ||
    payload.event ||
    payload.order_status ||
    payload.status ||
    "unknown";

  const email = (
    payload?.Customer?.email ||
    payload?.customer?.email ||
    payload?.buyer?.email ||
    payload?.email ||
    ""
  )
    .toString()
    .trim()
    .toLowerCase();

  const name =
    payload?.Customer?.full_name ||
    payload?.Customer?.name ||
    payload?.customer?.name ||
    payload?.buyer?.name ||
    null;

  const orderId =
    payload?.order_id || payload?.id || payload?.order?.id || payload?.transaction_id || null;

  console.log("[kiwify-webhook] event:", event, "email:", email, "order:", orderId);

  if (!email) {
    return new Response(JSON.stringify({ ok: true, ignored: "no email" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const isApprove = APPROVE_EVENTS.has(event) || /aprov|paid|approved/i.test(event);
  const isRevoke = REVOKE_EVENTS.has(event) || /refund|reembol|chargeback|cancel|recus/i.test(event);

  if (isApprove) {
    await supabase.from("postsprompts_buyers").upsert(
      {
        email,
        name,
        status: "active",
        source: "kiwify",
        kiwify_order_id: orderId,
        kiwify_event: event,
        last_event_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );

    // Send access email
    try {
      await supabase.functions.invoke("postsprompts-admin", {
        body: { action: "send_access_internal", email, name },
      });
    } catch (e) {
      console.error("send access internal failed", e);
    }

    return new Response(JSON.stringify({ ok: true, action: "granted", email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (isRevoke) {
    await supabase
      .from("postsprompts_buyers")
      .delete()
      .eq("email", email);
    return new Response(JSON.stringify({ ok: true, action: "revoked", email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, action: "logged", event }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
