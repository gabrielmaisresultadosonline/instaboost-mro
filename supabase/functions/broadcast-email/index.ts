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

    // Replace WhatsApp button placeholder with actual HTML button
    const whatsappButtonHtml = `
      <div style="text-align: center; margin: 25px 0;">
        <a href="https://maisresultadosonline.com.br/whatsapp" 
           style="display: inline-block; background-color: #25D366; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 8px; letter-spacing: 0.5px;">
          📱 Falar no WhatsApp
        </a>
      </div>
    `;

    const processedBody = body.replace(/\[BOTAO_WHATSAPP\]/g, whatsappButtonHtml);

    // Format body with proper HTML
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://maisresultadosonline.com.br/logo-mro-2.png" alt="MRO" style="height: 60px;" />
    </div>
    
    ${userName ? `<p style="color: #333; font-size: 16px;">Olá, <strong>${userName}</strong>!</p>` : ''}
    
    <div style="color: #333; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
${processedBody}
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
    
    <p style="color: #888; font-size: 12px; text-align: center;">
      Este email foi enviado por MRO - Mais Resultados Online
    </p>
  </div>
</body>
</html>
    `;

    // Use denomailer SMTPClient - same method that works in manage-user-access
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
      content: processedBody.replace(/<[^>]*>/g, ''), // Plain text fallback
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
