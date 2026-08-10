import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INFINITEPAY_HANDLE = "paguemro";
const FEE_AMOUNT = 67;
const REDIRECT_URL = "https://maisresultadosonline.com.br/zapmro";

// Lista de usuários vitalícios legados que DEVEM pagar a taxa de atualização
const LEGACY_LIFETIME_USERS = [
  "charlesdeivisonvip",
  "marcosoliveiravip",
  "guilhermerocha",
  "hudsonvip",
  "guerrerovip",
  "vagnertomasivip",
  "gah",
  "degisvip",
  "marlonwhats",
  "d01e07e8-8674-4b21-99ba-45efa15d4bf8", // ilannavip (pode vir como UUID ou username dependendo do fluxo, mas a lista retornada tinha usernames)
  "ilannavip",
  "osdileidezap",
  "renatovipfull",
  "grazivipfull",
  "rittervip",
  "gomesdanielvip",
  "nichollsvip",
  "hielenvipp1",
  "pereiravipfull",
  "kamaravipfull",
  "jacintovipfull",
  "jeanvip1",
  "rodrigovip1"
];


const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ZAPMRO-UPGRADE-FEE] ${step}${d}`);
};

const generateNSU = () => {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 8);
  return `ZAPTAXA${t}${r}`.toUpperCase();
};

// Consulta a API da InfinitePay para saber se o pedido foi pago
async function checkInfinitePay(orderNsu: string): Promise<boolean> {
  try {
    const resp = await fetch("https://api.checkout.infinitepay.io/payment_check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: INFINITEPAY_HANDLE, order_nsu: orderNsu }),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    log("payment_check", { orderNsu, paid: data?.paid });
    return data?.paid === true;
  } catch (e) {
    log("payment_check error", { error: String(e) });
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    let body: Record<string, unknown> = {};
    try {
      const raw = await req.text();
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = {};
    }

    const action = String(body.action || "webhook");
    const username = body.username ? String(body.username).toLowerCase().trim() : "";

    // ---------- STATUS: verifica se o usuário já pagou a taxa ----------
    if (action === "status") {
      if (!username) return json({ success: false, error: "username obrigatório" }, 400);

      // Removida a verificação da lista LEGACY_LIFETIME_USERS para que o bloqueio seja universal
      // para todos os usuários vitalícios conforme identificado pelo frontend.
      
      const { data: paid } = await supabase
        .from("zapmro_upgrade_fees")
        .select("*")
        .eq("username", username)
        .eq("status", "paid")
        .maybeSingle();

      if (paid) return json({ success: true, paid: true, order: paid });

      // Verifica pedidos pendentes na InfinitePay (verificação em tempo real)
      const { data: pending } = await supabase
        .from("zapmro_upgrade_fees")
        .select("*")
        .eq("username", username)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(3);

      for (const order of pending || []) {
        const isPaid = await checkInfinitePay(order.nsu_order);
        if (isPaid) {
          await supabase
            .from("zapmro_upgrade_fees")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("id", order.id);
          return json({ success: true, paid: true, order: { ...order, status: "paid" } });
        }
      }

      return json({ success: true, paid: false, pending: (pending || []).length > 0 });
    }


    // ---------- CREATE CHECKOUT ----------
    if (action === "create_checkout") {
      const email = String(body.email || "").toLowerCase().trim();
      if (!username) return json({ success: false, error: "username obrigatório" }, 400);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
        return json({ success: false, error: "E-mail inválido" }, 400);
      }

      // Já pago? devolve direto
      const { data: alreadyPaid } = await supabase
        .from("zapmro_upgrade_fees")
        .select("*")
        .eq("username", username)
        .eq("status", "paid")
        .maybeSingle();
      if (alreadyPaid) return json({ success: true, paid: true, order: alreadyPaid });

      const orderNsu = generateNSU();
      const priceCents = FEE_AMOUNT * 100;
      const webhookUrl = `${supabaseUrl}/functions/v1/zapmro-upgrade-fee`;
      const description = `ZAPTAXA_${username}_${email}`;

      const lineItems = [{ description, quantity: 1, price: priceCents }];
      let paymentLink: string | null = null;

      try {
        const resp = await fetch("https://api.checkout.infinitepay.io/links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handle: INFINITEPAY_HANDLE,
            items: lineItems,
            itens: lineItems,
            order_nsu: orderNsu,
            redirect_url: REDIRECT_URL,
            webhook_url: webhookUrl,
            customer: { email },
          }),
        });
        const data = await resp.json();
        log("InfiniPay links response", { status: resp.status });
        if (resp.ok) paymentLink = data.url || data.checkout_url || data.link || null;
      } catch (e) {
        log("InfiniPay links error", { error: String(e) });
      }

      if (!paymentLink) {
        const fallback = JSON.stringify([{ name: description, price: priceCents, quantity: 1 }]);
        paymentLink = `https://checkout.infinitepay.io/${INFINITEPAY_HANDLE}?items=${encodeURIComponent(
          fallback,
        )}&redirect_url=${encodeURIComponent(REDIRECT_URL)}&webhook_url=${encodeURIComponent(webhookUrl)}`;
      }

      const { data: inserted, error: insErr } = await supabase
        .from("zapmro_upgrade_fees")
        .insert({
          username,
          email,
          amount: FEE_AMOUNT,
          status: "pending",
          nsu_order: orderNsu,
          infinitepay_link: paymentLink,
        })
        .select()
        .single();

      if (insErr) return json({ success: false, error: insErr.message }, 500);

      return json({ success: true, paid: false, order_nsu: orderNsu, payment_link: paymentLink, order: inserted });
    }

    // ---------- LIST (admin) ----------
    if (action === "list") {
      const { data, error } = await supabase
        .from("zapmro_upgrade_fees")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, fees: data || [] });
    }

    // ---------- APPROVE MANUAL (admin) ----------
    if (action === "approve_manual") {
      const id = String(body.id || "");
      if (!id) return json({ success: false, error: "ID obrigatório" }, 400);

      const { error } = await supabase
        .from("zapmro_upgrade_fees")
        .update({ 
          status: "paid", 
          paid_at: new Date().toISOString(),
          manual_approval: true 
        })
        .eq("id", id);

      if (error) return json({ success: false, error: error.message }, 500);
      
      log("Manual approval successful", { id });
      return json({ success: true });
    }

    // ---------- WEBHOOK InfinitePay ----------
    const orderNsu =
      (body.order_nsu as string) ||
      (body.orderNsu as string) ||
      ((body.data as Record<string, unknown>)?.order_nsu as string) ||
      "";

    log("Webhook received", { orderNsu, keys: Object.keys(body) });

    if (!orderNsu) return json({ success: true, ignored: true });

    const { data: order } = await supabase
      .from("zapmro_upgrade_fees")
      .select("*")
      .eq("nsu_order", orderNsu)
      .maybeSingle();

    if (!order) return json({ success: true, ignored: true });

    // Confirma com a API antes de liberar
    const confirmed = await checkInfinitePay(orderNsu);
    if (!confirmed) return json({ success: true, paid: false });

    await supabase
      .from("zapmro_upgrade_fees")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", order.id);

    log("Fee marked as paid", { orderNsu, username: order.username });
    return json({ success: true, paid: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { msg });
    return json({ success: false, error: "Erro interno" }, 500);
  }
});
