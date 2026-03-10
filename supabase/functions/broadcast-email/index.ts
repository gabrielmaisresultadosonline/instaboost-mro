import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

    const SMTP_HOST = "smtp.hostinger.com";
    const SMTP_PORT = 465;
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

    // Use Deno's built-in SMTP (via fetch to external service or direct)
    // For production, using a transactional email service
    // Here we'll use the same pattern as send-welcome-email
    
    const emailData = {
      from: `MRO Instagram <${SMTP_USER}>`,
      to: to,
      subject: subject,
      html: htmlBody,
    };

    // Send via Hostinger SMTP using raw socket
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const conn = await Deno.connectTls({
      hostname: SMTP_HOST,
      port: SMTP_PORT,
    });

    const read = async () => {
      const buf = new Uint8Array(1024);
      const n = await conn.read(buf);
      if (n === null) return "";
      return decoder.decode(buf.subarray(0, n));
    };

    const write = async (data: string) => {
      await conn.write(encoder.encode(data + "\r\n"));
    };

    // Read greeting
    const greeting = await read();
    console.log(`SMTP Greeting: ${greeting.trim()}`);

    // EHLO
    await write(`EHLO maisresultadosonline.com.br`);
    const ehloResp = await read();
    console.log(`SMTP EHLO: ${ehloResp.trim()}`);

    // AUTH LOGIN
    await write("AUTH LOGIN");
    const authPrompt = await read();
    console.log(`SMTP AUTH: ${authPrompt.trim()}`);

    // Username (base64)
    await write(btoa(SMTP_USER));
    const userResp = await read();
    console.log(`SMTP USER: ${userResp.trim()}`);

    // Password (base64)
    await write(btoa(SMTP_PASSWORD));
    const authResponse = await read();
    console.log(`SMTP AUTH RESULT: ${authResponse.trim()}`);

    if (!authResponse.includes("235")) {
      conn.close();
      throw new Error(`SMTP authentication failed: ${authResponse.trim()}`);
    }

    // MAIL FROM
    await write(`MAIL FROM:<${SMTP_USER}>`);
    const mailFromResp = await read();
    console.log(`SMTP MAIL FROM: ${mailFromResp.trim()}`);

    // RCPT TO
    await write(`RCPT TO:<${to}>`);
    const rcptResp = await read();
    console.log(`SMTP RCPT TO: ${rcptResp.trim()}`);

    if (!rcptResp.includes("250") && !rcptResp.includes("251")) {
      conn.close();
      throw new Error(`SMTP recipient rejected: ${rcptResp.trim()}`);
    }

    // DATA
    await write("DATA");
    const dataResp = await read();
    console.log(`SMTP DATA: ${dataResp.trim()}`);

    // Generate proper email headers for deliverability
    const messageId = `<${crypto.randomUUID()}@maisresultadosonline.com.br>`;
    const dateStr = new Date().toUTCString();
    
    // Email headers and body
    const emailContent = [
      `Date: ${dateStr}`,
      `From: MRO Instagram <${SMTP_USER}>`,
      `To: ${to}`,
      `Reply-To: ${SMTP_USER}`,
      `Message-ID: ${messageId}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: quoted-printable",
      "X-Mailer: MRO-Mailer/1.0",
      "",
      htmlBody,
      ".",
    ].join("\r\n");

    await write(emailContent);
    const sendResp = await read();
    console.log(`SMTP SEND RESULT: ${sendResp.trim()}`);

    if (!sendResp.includes("250")) {
      conn.close();
      throw new Error(`SMTP send failed: ${sendResp.trim()}`);
    }

    // QUIT
    await write("QUIT");
    conn.close();

    console.log(`Email CONFIRMED sent to ${to}`);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
