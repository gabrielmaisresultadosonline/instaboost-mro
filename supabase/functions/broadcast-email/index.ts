import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, body, userName } = await req.json();

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const SMTP_USER = "suporte@maisresultadosonline.com.br";
    const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD");

    if (!SMTP_PASSWORD) {
      console.error("SMTP_PASSWORD not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Replace WhatsApp button placeholder
    const whatsappButtonHtml = '<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="text-align:center;padding:14px;background:#25D366;border-radius:8px;"><a href="https://maisresultadosonline.com.br/whatsapp" style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;">📱 Falar no WhatsApp</a></td></tr></table>';

    const processedBody = body.replace(/\[BOTAO_WHATSAPP\]/g, whatsappButtonHtml);

    // Convert plain text newlines to HTML paragraphs (skip if body already has HTML tags)
    const hasHtml = /<[a-z][\s\S]*>/i.test(processedBody);
    const formattedBody = hasHtml
      ? processedBody
      : processedBody.split('\n').filter(l => l.trim() !== '').map(l => '<p style="margin:0 0 12px 0;color:#333;font-size:15px;line-height:1.6;">' + l + '</p>').join('');

    // Build table-based HTML email (same pattern as send-welcome-email that works)
    const greetingHtml = userName ? '<p style="margin:0 0 15px 0;color:#333;font-size:16px;">Ol\u00e1, <strong>' + userName + '</strong>!</p>' : '';

    const htmlBody = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>' +
      '<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">' +
      '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">' +
      '<tr><td style="padding:25px;text-align:center;border-bottom:3px solid #FFD700;">' +
      '<div style="background:#000;color:#fff;display:inline-block;padding:8px 20px;border-radius:8px;font-size:28px;font-weight:bold;letter-spacing:2px;">MRO</div>' +
      '</td></tr>' +
      '<tr><td style="padding:30px;">' +
      greetingHtml +
      formattedBody +
      '</td></tr>' +
      '<tr><td style="padding:0 30px 20px 30px;"><hr style="border:none;border-top:1px solid #eee;margin:0;"></td></tr>' +
      '<tr><td style="padding:0 30px 10px 30px;text-align:center;">' +
      '<p style="color:#999;font-size:11px;margin:0;">Estamos \u00e0 disposi\u00e7\u00e3o para ajud\u00e1-lo.</p>' +
      '<p style="color:#666;font-size:13px;margin:10px 0 0 0;">Abra\u00e7os,<br><strong>Equipe MRO</strong></p>' +
      '</td></tr>' +
      '<tr><td style="background:#1a1a1a;padding:15px;text-align:center;">' +
      '<p style="color:#888;margin:0;font-size:11px;">\u00a9 ' + new Date().getFullYear() + ' MRO - Mais Resultados Online</p>' +
      '</td></tr>' +
      '</table></body></html>';

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.hostinger.com",
        port: 465,
        tls: true,
        auth: {
          username: SMTP_USER,
          password: SMTP_PASSWORD,
        },
      },
    });

    await client.send({
      from: `MRO - Mais Resultados Online <${SMTP_USER}>`,
      to: to,
      subject: subject,
      html: htmlBody,
    });

    await client.close();

    console.log(`Email sent successfully to ${to}`);

    // Log to database
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from("broadcast_email_logs").insert({
        recipient_email: to,
        recipient_name: userName || null,
        subject: subject,
        body: body,
        status: "sent",
      });
    } catch (logError) {
      console.error("Failed to log email:", logError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending email:", error);

    // Try to log failure
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { to, subject, body } = await req.clone().json().catch(() => ({ to: '', subject: '', body: '' }));
      
      await supabase.from("broadcast_email_logs").insert({
        recipient_email: to || 'unknown',
        subject: subject || 'unknown',
        body: body || '',
        status: "failed",
        error_message: error.message || "Unknown error",
      });
    } catch (_) {}

    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
