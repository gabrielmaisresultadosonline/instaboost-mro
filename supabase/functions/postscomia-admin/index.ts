import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "mro@gmail.com";
const ADMIN_PASSWORD = "Ga145523@";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Public: check if a given email/nsu is already paid
    if (action === "check_paid") {
      const email = (body.email || "").toString().trim().toLowerCase();
      const nsu = (body.nsu || "").toString().trim();
      let q = supabase.from("postscomia_orders").select("*").eq("status", "paid");
      if (nsu) q = q.eq("nsu_order", nsu);
      else if (email) q = q.eq("email", email);
      else return json({ paid: false });
      const { data } = await q.order("paid_at", { ascending: false }).limit(1).maybeSingle();
      return json({ paid: !!data, order: data || null });
    }

    // Admin login
    if (action === "login") {
      const ok =
        (body.email || "").toString().trim().toLowerCase() === ADMIN_EMAIL &&
        body.password === ADMIN_PASSWORD;
      return json({ success: ok });
    }

    // Admin gate
    if (
      (body.email || "").toString().trim().toLowerCase() !== ADMIN_EMAIL ||
      body.password !== ADMIN_PASSWORD
    ) {
      return json({ error: "Unauthorized" }, 401);
    }

    if (action === "list_orders") {
      const { data } = await supabase
        .from("postscomia_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return json({ orders: data || [] });
    }

    if (action === "mark_paid") {
      const id = body.id;
      if (!id) return json({ error: "id obrigatório" }, 400);
      await supabase
        .from("postscomia_orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", id);
      return json({ success: true });
    }

    if (action === "delete_order") {
      const id = body.id;
      if (!id) return json({ error: "id obrigatório" }, 400);
      await supabase.from("postscomia_orders").delete().eq("id", id);
      return json({ success: true });
    }

    if (action === "stats") {
      const { data } = await supabase.from("postscomia_orders").select("status,amount,orderbump");
      const orders = data || [];
      const paid = orders.filter((o: any) => o.status === "paid");
      const pending = orders.filter((o: any) => o.status === "pending");
      const revenue = paid.reduce((s: number, o: any) => s + Number(o.amount || 0), 0);
      const bumpCount = paid.filter((o: any) => o.orderbump).length;
      return json({
        total: orders.length,
        paid: paid.length,
        pending: pending.length,
        revenue,
        bumpCount,
      });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
