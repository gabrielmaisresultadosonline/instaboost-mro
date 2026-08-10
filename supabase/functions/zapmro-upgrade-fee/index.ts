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

interface InfinitePayCheckResult {
  paid: boolean;
  data: Record<string, unknown>;
}

// Consulta a API da InfinitePay com todos os identificadores disponíveis.
// A InfinitePay nem sempre localiza links novos somente pelo order_nsu.
async function checkInfinitePay(
  orderNsu: string,
  transactionNsu?: string,
  slug?: string,
): Promise<InfinitePayCheckResult> {
  try {
    const resp = await fetch("https://api.checkout.infinitepay.io/payment_check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle: INFINITEPAY_HANDLE,
        order_nsu: orderNsu,
        ...(transactionNsu ? { transaction_nsu: transactionNsu } : {}),
        ...(slug ? { slug } : {}),
      }),
    });
    const raw = await resp.text();
    let data: Record<string, unknown> = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }
    log("payment_check response", {
      orderNsu,
      transactionNsu: transactionNsu || null,
      hasSlug: Boolean(slug),
      httpStatus: resp.status,
      response: data,
    });
    return { paid: resp.ok && data.paid === true, data };
  } catch (e) {
    log("payment_check error", { orderNsu, error: String(e) });
    return { paid: false, data: { error: String(e) } };
  }
}

function readString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function extractLenc(paymentLink: unknown): string | undefined {
  if (typeof paymentLink !== "string" || !paymentLink) return undefined;
  try {
    return new URL(paymentLink).searchParams.get("lenc") || undefined;
  } catch {
    return undefined;
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
    const emailFromReq = body.email ? String(body.email).toLowerCase().trim() : "";

    // ---------- STATUS: verifica se o usuário já pagou a taxa ----------
    if (action === "status") {
      if (!username) return json({ success: false, error: "username obrigatório" }, 400);

      // Removida a verificação da lista LEGACY_LIFETIME_USERS para que o bloqueio seja universal
      // para todos os usuários vitalícios conforme identificado pelo frontend.
      // No entanto, garantimos que se o usuário estiver na lista, o status seja verificado.
      const isLegacyFromList = LEGACY_LIFETIME_USERS.includes(username);
      
      const orFilter = emailFromReq 
        ? `or(username.eq.${username},email.eq.${emailFromReq},email.eq.${username},username.eq.${emailFromReq})`
        : `or(username.eq.${username},email.eq.${username})`;
        
      const { data: paidData } = await supabase
        .from("zapmro_upgrade_fees")
        .select("*")
        .or(orFilter)
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(1);
        
      const paid = paidData && paidData.length > 0 ? paidData[0] : null;

      if (paid) return json({ success: true, paid: true, order: paid });

      // Verifica pedidos pendentes na InfinitePay (verificação em tempo real)
      const { data: pending } = await supabase
        .from("zapmro_upgrade_fees")
        .select("*")
        .or(orFilter)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(3);

      for (const order of pending || []) {
        const slug = extractLenc(order.infinitepay_link);
        log("Checking pending payment realtime", { orderNsu: order.nsu_order, slug });
        
        // A verificação via API no checkInfinitePay já garante que o pagamento é real.
        const verification = await checkInfinitePay(order.nsu_order, undefined, slug);
        if (verification.paid) {
          log("Payment confirmed by API! Updating DB...", { orderId: order.id });
          const { error: updateError } = await supabase
            .from("zapmro_upgrade_fees")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("id", order.id);
          
          if (updateError) {
            log("status update failed", { orderId: order.id, error: updateError.message });
            continue;
          }
          log("Fee marked as paid by realtime check", { orderNsu: order.nsu_order, username });
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
        .or(email ? `or(username.eq.${username},email.eq.${email},email.eq.${username},username.eq.${email})` : `or(username.eq.${username},email.eq.${username})`)
        .eq("status", "paid")
        .maybeSingle();
      if (alreadyPaid) return json({ success: true, paid: true, order: alreadyPaid });

      const orderNsu = generateNSU();
      const priceCents = FEE_AMOUNT * 100;
      // Todas as vendas usam o processador unificado, que já possui validação,
      // auditoria e tratamento das diferentes variações do payload da InfinitePay.
      const webhookUrl = `${supabaseUrl}/functions/v1/infinitepay-webhook`;
      const description = `ZAPTAXA_${username}_${email}`;

      // A API /links associa corretamente order_nsu e webhook quando o item usa "name".
      const lineItems = [{ name: description, quantity: 1, price: priceCents }];
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
        log("InfiniPay links response", {
          status: resp.status,
          orderNsu,
          hasPaymentLink: Boolean(data.url || data.checkout_url || data.link),
          responseKeys: data && typeof data === "object" ? Object.keys(data) : [],
        });
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
    const nestedData = body.data && typeof body.data === "object"
      ? body.data as Record<string, unknown>
      : {};
    const orderNsu = readString(body, ["order_nsu", "orderNsu"]) ||
      readString(nestedData, ["order_nsu", "orderNsu"]);
    const transactionNsu = readString(body, ["transaction_nsu", "transactionNsu", "transaction_id"]) ||
      readString(nestedData, ["transaction_nsu", "transactionNsu", "transaction_id"]);
    const invoiceSlug = readString(body, ["invoice_slug", "invoiceSlug", "slug"]) ||
      readString(nestedData, ["invoice_slug", "invoiceSlug", "slug"]);

    log("Webhook received", {
      orderNsu,
      transactionNsu: transactionNsu || null,
      invoiceSlug: invoiceSlug || null,
      keys: Object.keys(body),
      nestedKeys: Object.keys(nestedData),
    });

    if (!orderNsu) return json({ success: true, ignored: true });

    const { data: order } = await supabase
      .from("zapmro_upgrade_fees")
      .select("*")
      .eq("nsu_order", orderNsu)
      .maybeSingle();

    if (!order) {
      log("Webhook order not found", { orderNsu });
      return json({ success: true, ignored: true });
    }

    // Confirma com a API antes de liberar
    const verification = await checkInfinitePay(
      orderNsu,
      transactionNsu || undefined,
      invoiceSlug || extractLenc(order.infinitepay_link),
    );
    if (!verification.paid) {
      log("Webhook payment not confirmed", { orderNsu, response: verification.data });
      return json({ success: true, paid: false });
    }

    const { error: updateError } = await supabase
      .from("zapmro_upgrade_fees")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", order.id);

    if (updateError) {
      log("Webhook status update failed", { orderNsu, error: updateError.message });
      return json({ success: false, error: "Falha ao confirmar pagamento" }, 500);
    }

    log("Fee marked as paid", { orderNsu, username: order.username });
    return json({ success: true, paid: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { msg });
    return json({ success: false, error: "Erro interno" }, 500);
  }
});
