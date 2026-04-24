import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INFINITEPAY_HANDLE = "paguemro";

const log = (step: string, details?: unknown) => {
  console.log(`[RENDAEXT-VERIFY] ${step}`, details ? JSON.stringify(details) : "");
};

const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  if (!smtpPassword) return false;
  try {
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.hostinger.com",
        port: 465,
        tls: true,
        auth: { username: "suporte@maisresultadosonline.com.br", password: smtpPassword },
      },
    });
    await client.send({
      from: "MRO <suporte@maisresultadosonline.com.br>",
      to, subject, content: "auto", html,
    });
    await client.close();
    return true;
  } catch (e) {
    log("Email error", { e: String(e) });
    return false;
  }
};

const buildEmail = (name: string) => `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
<tr><td style="background:linear-gradient(135deg,#FFD700 0%,#FFA500 100%);padding:30px;text-align:center;">
<div style="background:#000;color:#fff;display:inline-block;padding:10px 25px;border-radius:8px;font-size:32px;font-weight:bold;">MRO</div>
<h1 style="color:#000;margin:15px 0 0 0;font-size:24px;">🎉 Aula Liberada!</h1>
</td></tr>
<tr><td style="padding:30px;color:#333;">
<p style="font-size:16px;">Olá <strong>${name}</strong>!</p>
<p style="font-size:16px;">Parabéns pelo interesse, você é um dos empreendedores de sucesso que a partir de agora vai aprender o novo método.</p>
<div style="background:#f8f9fa;border-left:4px solid #FFD700;padding:20px;margin:20px 0;border-radius:8px;">
<p style="margin:0 0 10px 0;font-weight:bold;font-size:18px;">📚 Acesse sua aula aqui:</p>
<a href="https://maisresultadosonline.com.br/rendaextraaula" style="display:inline-block;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#fff;text-decoration:none;padding:15px 40px;border-radius:30px;font-size:16px;font-weight:bold;margin-top:10px;">▶️ ACESSAR AULA AGORA</a>
</div>
<div style="background:#e8f5e9;border-left:4px solid #4caf50;padding:15px;margin:20px 0;border-radius:8px;">
<p style="margin:0;font-size:14px;color:#2e7d32;"><strong>Suporte WhatsApp:</strong> <a href="https://maisresultadosonline.com.br/whatsapp" style="color:#2e7d32;">Clique aqui para suporte</a></p>
</div>
<p style="font-size:14px;color:#666;margin-top:30px;"><strong>Aplique HOJE mesmo!</strong> Quanto antes começar, antes verá resultados.</p>
</td></tr>
<tr><td style="background:#1a1a1a;padding:20px;text-align:center;color:#999;font-size:12px;">© 2026 MRO - Mais Resultados Online</td></tr>
</table></body></html>`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { nsu_order } = await req.json();
    if (!nsu_order) {
      return new Response(JSON.stringify({ success: false, error: "nsu_order required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    const { data: order } = await supabase
      .from("rendaext_orders")
      .select("*")
      .eq("nsu_order", nsu_order)
      .maybeSingle();

    if (!order) {
      return new Response(JSON.stringify({ success: false, error: "Order not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 });
    }

    // If already paid, just return
    if (order.status === "paid") {
      return new Response(JSON.stringify({ success: true, paid: true, alreadyPaid: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify with InfiniPay
    let paid = false;
    try {
      const resp = await fetch(
        "https://api.infinitepay.io/invoices/public/checkout/payment_check",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: INFINITEPAY_HANDLE, order_nsu: nsu_order }),
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        paid = data.paid === true;
      }
    } catch (e) {
      log("InfiniPay verify error", { e: String(e) });
    }

    if (!paid) {
      return new Response(JSON.stringify({ success: true, paid: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark as paid + send email
    const emailSent = await sendEmail(
      order.email,
      "✅ Pagamento confirmado! Seu passo a passo MRO chegou",
      buildEmail(order.nome_completo)
    );

    await supabase
      .from("rendaext_orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        email_sent: emailSent,
        email_sent_at: emailSent ? new Date().toISOString() : null,
      })
      .eq("id", order.id);

    return new Response(JSON.stringify({ success: true, paid: true, emailSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
