import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizeEmail = (value: unknown) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized.length > 320) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
};

const normalizeText = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
};

const stripHtml = (value: string) => value
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<\/p>/gi, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/\n{3,}/g, "\n\n")
  .replace(/[ \t]{2,}/g, " ")
  .trim();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let recipientEmail = "unknown";
  let emailSubject = "unknown";
  let originalBody = "";

  try {
    const payload = await req.json().catch(() => ({}));
    const recipient = normalizeEmail(payload?.to);
    const subject = normalizeText(payload?.subject, 255);
    const body = normalizeText(payload?.body, 50000);
    const userName = typeof payload?.userName === "string" ? payload.userName.trim().slice(0, 255) : "";
    const rawHtml = payload?.rawHtml === true;

    if (!recipient || !subject || !body) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing or invalid required fields: to, subject, body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    recipientEmail = recipient;
    emailSubject = subject;
    originalBody = body;

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
    const plainTextBody = stripHtml(
      body.replace(/\[BOTAO_WHATSAPP\]/g, "📱 Falar no WhatsApp: https://maisresultadosonline.com.br/whatsapp")
    );

    let htmlBody: string;

    if (rawHtml) {
      // Pre-formatted HTML: wrap in doctype but don't add MRO header/footer
      htmlBody = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>' +
        '<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">' +
        processedBody +
        '</body></html>';
    } else {
      // Convert plain text newlines to HTML paragraphs (skip if body already has HTML tags)
      const hasHtml = /<[a-z][\s\S]*>/i.test(processedBody);
      const formattedBody = hasHtml
        ? processedBody
        : processedBody.split('\n').filter(l => l.trim() !== '').map(l => '<p style="margin:0 0 12px 0;color:#333;font-size:15px;line-height:1.6;">' + l + '</p>').join('');

      // Build table-based HTML email (same pattern as send-welcome-email that works)
      const greetingHtml = userName ? '<p style="margin:0 0 15px 0;color:#333;font-size:16px;">Ol\u00e1, <strong>' + userName + '</strong>!</p>' : '';

      htmlBody = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>' +
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
    }

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

    try {
      await client.send({
        from: `MRO - Mais Resultados Online <${SMTP_USER}>`,
        to: recipientEmail,
        subject: emailSubject,
        content: plainTextBody,
        html: htmlBody,
      });
    } finally {
      await client.close();
    }

    console.log(`Email sent successfully to ${recipientEmail}`);

    // Log to database
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from("broadcast_email_logs").insert({
        recipient_email: recipientEmail,
        recipient_name: userName || null,
        subject: emailSubject,
        body: originalBody,
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
    const errorMessage = error instanceof Error ? error.message : "Failed to send email";

    // Try to log failure
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from("broadcast_email_logs").insert({
        recipient_email: recipientEmail,
        subject: emailSubject,
        body: originalBody,
        status: "failed",
        error_message: errorMessage,
      });
    } catch (_) {}

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
