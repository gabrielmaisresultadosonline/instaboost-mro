import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sendLocalVppEmail } from "../_shared/localvpp-email.ts";

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

    if (action === "track_visit") {
      await supabase.from("localvpp_visits").insert({
        session_id: body.session_id || null,
        user_agent: body.user_agent || null,
        referrer: body.referrer || null,
      });
      return json({ success: true });
    }

    if (action === "get_public_settings") {
      const { data } = await supabase.from("localvpp_settings").select("aula_data,aula_titulo,preco,hero_video_url,hero_video_hls_url,whatsapp_group_link").limit(1).maybeSingle();
      return json({ success: true, settings: data || { aula_data: "20/07", aula_titulo: "", preco: 19, hero_video_url: "", hero_video_hls_url: "", whatsapp_group_link: "" } });
    }

    if (action === "submit_lead") {
      const nome = String(body.nome || "").trim();
      const email = String(body.email || "").toLowerCase().trim();
      const whatsapp = String(body.whatsapp || "").replace(/\D/g, "");
      const business_type = String(body.business_type || "").trim();
      const device_type = String(body.device_type || "").trim();
      const instagram = String(body.instagram || "").trim();
      const empresa = String(body.empresa || "").trim();
      const objetivo = String(body.objetivo || "").trim();

      if (!nome || nome.split(/\s+/).length < 2) return json({ success: false, error: "Nome completo obrigatório" }, 400);
      if (!email.includes("@")) return json({ success: false, error: "E-mail inválido" }, 400);
      if (whatsapp.length < 10) return json({ success: false, error: "WhatsApp inválido" }, 400);
      if (!business_type) return json({ success: false, error: "Negócio obrigatório" }, 400);
      if (!device_type) return json({ success: false, error: "Dispositivo obrigatório" }, 400);

      const { error: insertErr } = await supabase.from("localvpp_leads").insert({
        nome_completo: nome, email, whatsapp, business_type, device_type,
        instagram: instagram || null,
        empresa: empresa || null,
        objetivo: objetivo || null,
        user_agent: req.headers.get("user-agent") || null,
        referrer: body.referrer || null,
      });
      if (insertErr) return json({ success: false, error: insertErr.message }, 500);

      // Sem máquina: guarda lead mas não envia email nem libera contato
      if (device_type === "nenhum") return json({ success: true, blocked: true });

      const emailOk = await sendLocalVppEmail(email, nome);
      return json({ success: true, email_sent: emailOk });
    }

    if (action === "check_paid") {
      const { data } = await supabase.from("localvpp_orders").select("status,email,amount").eq("nsu_order", body.nsu).maybeSingle();
      return json({ success: true, paid: data?.status === "paid", email: data?.email, amount: data?.amount });
    }

    if (body.email !== ADMIN_EMAIL || body.password !== ADMIN_PASSWORD) {
      return json({ success: false, error: "unauthorized" }, 401);
    }

    if (action === "login") return json({ success: true });

    if (action === "get_settings") {
      const { data } = await supabase.from("localvpp_settings").select("*").limit(1).maybeSingle();
      return json({ success: true, settings: data });
    }

    if (action === "save_settings") {
      const { whatsapp_group_link, aula_data, aula_titulo, preco, hero_video_url, hero_video_hls_url } = body;
      const { data: existing } = await supabase.from("localvpp_settings").select("id").limit(1).maybeSingle();
      const payload: Record<string, unknown> = { whatsapp_group_link, aula_data, aula_titulo, preco };
      if (typeof hero_video_url === "string") payload.hero_video_url = hero_video_url;
      if (typeof hero_video_hls_url === "string") payload.hero_video_hls_url = hero_video_hls_url;
      if (existing) {
        await supabase.from("localvpp_settings").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("localvpp_settings").insert(payload);
      }
      return json({ success: true });
    }

    if (action === "list_orders") {
      const { data } = await supabase.from("localvpp_orders").select("*").order("created_at", { ascending: false }).limit(500);
      return json({ success: true, orders: data || [] });
    }

    if (action === "list_visits") {
      const { data } = await supabase.from("localvpp_visits").select("*").order("created_at", { ascending: false }).limit(200);
      const { count } = await supabase.from("localvpp_visits").select("*", { count: "exact", head: true });
      return json({ success: true, visits: data || [], total: count || 0 });
    }

    if (action === "list_leads") {
      const { data } = await supabase.from("localvpp_leads").select("*").order("created_at", { ascending: false }).limit(1000);
      return json({ success: true, leads: data || [] });
    }

    if (action === "resend_lead_email") {
      const { lead_id } = body;
      const { data: lead } = await supabase.from("localvpp_leads").select("*").eq("id", lead_id).maybeSingle();
      if (!lead) return json({ success: false, error: "lead não encontrado" }, 404);
      if (!lead.email) return json({ success: false, error: "sem email" }, 400);
      const { data: s } = await supabase.from("localvpp_settings").select("whatsapp_group_link").limit(1).maybeSingle();
      const ok = await sendLocalVppEmail(lead.email, lead.nome_completo, s?.whatsapp_group_link || "#");
      return json({ success: ok });
    }



    if (action === "send_test_email") {
      const testEmail = String(body.test_email || "").trim();
      if (!testEmail.includes("@")) return json({ success: false, error: "email inválido" }, 400);
      const { data: s } = await supabase.from("localvpp_settings").select("*").limit(1).maybeSingle();
      const ok = await sendLocalVppEmail(testEmail, "Teste", s?.whatsapp_group_link || "#", s?.aula_data || "20/07");
      return json({ success: ok });
    }

    if (action === "resend_email") {
      const { order_id } = body;
      const { data: order } = await supabase.from("localvpp_orders").select("*").eq("id", order_id).maybeSingle();
      if (!order) return json({ success: false, error: "order não encontrada" }, 404);
      const { data: s } = await supabase.from("localvpp_settings").select("*").limit(1).maybeSingle();
      const ok = await sendLocalVppEmail(order.email, order.nome_completo, s?.whatsapp_group_link || "#", s?.aula_data || "20/07");
      if (ok) {
        await supabase.from("localvpp_orders").update({
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
