import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sendRendaSaoVivoEmail } from "../_shared/rendasaovivo-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "mro@gmail.com";
const ADMIN_PASSWORD = "Ga145523@";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.json();
    const action = body.action;

    // Public actions (no auth required)
    if (action === "track_visit") {
      await supabase.from("rendasaovivo_visits").insert({
        session_id: body.session_id || null,
        user_agent: body.user_agent || null,
        referrer: body.referrer || null,
      });
      return json({ success: true });
    }

    if (action === "get_public_settings") {
      const { data } = await supabase.from("rendasaovivo_settings").select("aula_data,aula_titulo,preco,hero_video_url,hero_video_hls_url").limit(1).maybeSingle();
      return json({ success: true, settings: data || { aula_data: "19/07", aula_titulo: "", preco: 19, hero_video_url: "", hero_video_hls_url: "" } });
    }

    if (action === "check_paid") {
      const { data } = await supabase.from("rendasaovivo_orders").select("status,email").eq("nsu_order", body.nsu).maybeSingle();
      return json({ success: true, paid: data?.status === "paid", email: data?.email });
    }

    // Auth-required actions
    if (body.email !== ADMIN_EMAIL || body.password !== ADMIN_PASSWORD) {
      return json({ success: false, error: "unauthorized" }, 401);
    }

    if (action === "login") return json({ success: true });

    if (action === "get_settings") {
      const { data } = await supabase.from("rendasaovivo_settings").select("*").limit(1).maybeSingle();
      return json({ success: true, settings: data });
    }

    if (action === "save_settings") {
      const { whatsapp_group_link, aula_data, aula_titulo, preco } = body;
      const { data: existing } = await supabase.from("rendasaovivo_settings").select("id").limit(1).maybeSingle();
      const payload = { whatsapp_group_link, aula_data, aula_titulo, preco };
      if (existing) {
        await supabase.from("rendasaovivo_settings").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("rendasaovivo_settings").insert(payload);
      }
      return json({ success: true });
    }

    if (action === "list_orders") {
      const { data } = await supabase.from("rendasaovivo_orders").select("*").order("created_at", { ascending: false }).limit(500);
      return json({ success: true, orders: data || [] });
    }

    if (action === "list_visits") {
      const { data } = await supabase.from("rendasaovivo_visits").select("*").order("created_at", { ascending: false }).limit(200);
      const { count } = await supabase.from("rendasaovivo_visits").select("*", { count: "exact", head: true });
      return json({ success: true, visits: data || [], total: count || 0 });
    }

    if (action === "send_test_email") {
      const testEmail = String(body.test_email || "").trim();
      if (!testEmail.includes("@")) return json({ success: false, error: "email inválido" }, 400);
      const { data: s } = await supabase.from("rendasaovivo_settings").select("*").limit(1).maybeSingle();
      const ok = await sendRendaSaoVivoEmail(testEmail, "Teste", s?.whatsapp_group_link || "#", s?.aula_data || "19/07");
      return json({ success: ok });
    }

    if (action === "resend_email") {
      const { order_id } = body;
      const { data: order } = await supabase.from("rendasaovivo_orders").select("*").eq("id", order_id).maybeSingle();
      if (!order) return json({ success: false, error: "order não encontrada" }, 404);
      const { data: s } = await supabase.from("rendasaovivo_settings").select("*").limit(1).maybeSingle();
      const ok = await sendRendaSaoVivoEmail(order.email, order.nome_completo, s?.whatsapp_group_link || "#", s?.aula_data || "19/07");
      if (ok) {
        await supabase.from("rendasaovivo_orders").update({
          email_sent: true, email_sent_at: new Date().toISOString(),
        }).eq("id", order_id);
      }
      return json({ success: ok });
    }

    return json({ success: false, error: "action inválida" }, 400);
  } catch (e) {
    return json({ success: false, error: String(e) }, 500);
  }
});
