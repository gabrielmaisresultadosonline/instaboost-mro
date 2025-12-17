import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-USER-ACCESS] ${step}${detailsStr}`);
};

const WHATSAPP_API_URL = 'https://mrozap.squareweb.app';
const INSTAGRAM_API_URL = 'https://dashboardmroinstagramvini-online.squareweb.app';

// Send email via SMTP
async function sendAccessEmail(
  customerEmail: string,
  customerName: string,
  username: string,
  password: string,
  serviceType: string,
  accessType?: string,
  expirationDate?: string | null
): Promise<boolean> {
  try {
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    if (!smtpPassword) {
      logStep("SMTP password not configured");
      return false;
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.hostinger.com",
        port: 465,
        tls: true,
        auth: {
          username: "suporte@maisresultadosonline.com.br",
          password: smtpPassword,
        },
      },
    });

    const serviceName = serviceType === 'whatsapp' ? 'ZAPMRO' : 'MRO Instagram';
    const memberAreaUrl = 'https://maisresultadosonline.com.br';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 30px; text-align: center; }
    .header h1 { color: #000; margin: 0; font-size: 28px; }
    .content { padding: 30px; background: #f9f9f9; }
    .credentials { background: #fff; border: 2px solid #FFD700; border-radius: 10px; padding: 20px; margin: 20px 0; }
    .credentials h3 { color: #333; margin-top: 0; }
    .credential-item { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
    .credential-label { font-weight: bold; color: #666; }
    .credential-value { font-size: 18px; color: #000; font-family: monospace; }
    .button { display: inline-block; background: #FFD700; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .expiration { background: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 10px; margin: 15px 0; text-align: center; }
    .expiration strong { color: #856404; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 MRO - Acesso Liberado!</h1>
  </div>
  <div class="content">
    <p>Olá${customerName ? ` <strong>${customerName}</strong>` : ''},</p>
    <p>Seu acesso ao <strong>${serviceName}</strong> foi liberado com sucesso!</p>
    
    <div class="credentials">
      <h3>📋 Seus Dados de Acesso:</h3>
      <div class="credential-item">
        <div class="credential-label">Usuário:</div>
        <div class="credential-value">${username}</div>
      </div>
      <div class="credential-item">
        <div class="credential-label">Senha:</div>
        <div class="credential-value">${password}</div>
      </div>
    </div>
    
    {EXPIRATION_SECTION}
    
    <p>Para acessar a área de membros, clique no botão abaixo:</p>
    
    <center>
      <a href="${memberAreaUrl}" class="button">🔑 ACESSAR ÁREA DE MEMBROS</a>
    </center>
    
    <p style="color: #666; font-size: 14px;">
      Ou acesse diretamente: <a href="${memberAreaUrl}">${memberAreaUrl}</a>
    </p>
    
    <p>Se tiver qualquer dúvida, entre em contato conosco pelo WhatsApp: <strong>+55 51 9203-6540</strong></p>
  </div>
  <div class="footer">
    <p>MRO - Mais Resultados Online</p>
    <p>Gabriel Fernandes da Silva</p>
    <p>CNPJ: 54.840.738/0001-96</p>
  </div>
</body>
</html>
    `;

    // Build expiration section
    let expirationSection = '';
    if (accessType && accessType !== 'lifetime' && expirationDate) {
      const expDate = new Date(expirationDate);
      const formattedDate = expDate.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      const planType = accessType === 'annual' ? 'Anual' : 'Mensal';
      expirationSection = `
        <div class="expiration">
          📅 <strong>Plano ${planType}</strong> - Acesso disponível até <strong>${formattedDate}</strong>
        </div>
      `;
    } else if (accessType === 'lifetime') {
      expirationSection = `
        <div class="expiration" style="background: #d4edda; border-color: #28a745;">
          ♾️ <strong style="color: #155724;">Acesso Vitalício</strong> - Sem data de expiração!
        </div>
      `;
    }

    const finalHtml = htmlContent.replace('{EXPIRATION_SECTION}', expirationSection);

    await client.send({
      from: "MRO - Mais Resultados Online <suporte@maisresultadosonline.com.br>",
      to: customerEmail,
      subject: `MRO - Acesso Liberado ao ${serviceName}!`,
      content: "Seu acesso foi liberado! Veja os detalhes no email HTML.",
      html: finalHtml,
    });

    await client.close();
    logStep("Email sent successfully", { to: customerEmail });
    return true;
  } catch (error: any) {
    logStep("Error sending email", { error: error?.message || String(error) });
    return false;
  }
}

// Create user in WhatsApp API
async function createWhatsAppUser(username: string, password: string, accessType: string): Promise<boolean> {
  try {
    // First login as admin
    const loginResponse = await fetch(`${WHATSAPP_API_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: 'MRO', password: 'Ga145523@' }),
    });

    if (!loginResponse.ok) {
      logStep("WhatsApp admin login failed");
      return false;
    }

    // Get cookies from login response
    const cookies = loginResponse.headers.get('set-cookie') || '';

    // Create user
    const createResponse = await fetch(`${WHATSAPP_API_URL}/admin/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({
        username,
        password,
        access_type: accessType,
        expiry_date: accessType === 'annual' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
      }),
    });

    const result = await createResponse.json();
    logStep("WhatsApp user creation result", result);
    return createResponse.ok;
  } catch (error: any) {
    logStep("Error creating WhatsApp user", { error: error?.message || String(error) });
    return false;
  }
}

// Create user in Instagram API
async function createInstagramUser(username: string, password: string, daysAccess: number): Promise<boolean> {
  try {
    // First enable user
    const enableResponse = await fetch(`${INSTAGRAM_API_URL}/habilitar-usuario/${username}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: username, senha: password }),
    });

    if (!enableResponse.ok) {
      logStep("Instagram enable user failed");
      // Continue anyway, might be already enabled
    }

    // Add user
    const addResponse = await fetch(`${INSTAGRAM_API_URL}/adicionar-usuario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        time: daysAccess,
        igUsers: '',
      }),
    });

    const result = await addResponse.json();
    logStep("Instagram user creation result", result);
    return addResponse.ok;
  } catch (error: any) {
    logStep("Error creating Instagram user", { error: error?.message || String(error) });
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, ...data } = await req.json();
    logStep("Action received", { action });

    switch (action) {
      case "create_access": {
        const { customerEmail, customerName, username, password, serviceType, accessType, daysAccess, notes } = data;

        // Create user in external API
        let apiCreated = false;
        if (serviceType === 'whatsapp') {
          apiCreated = await createWhatsAppUser(username, password, accessType);
        } else if (serviceType === 'instagram') {
          apiCreated = await createInstagramUser(username, password, daysAccess || 365);
        }

        // Calculate expiration date
        let expirationDate: string | null = null;
        if (accessType !== 'lifetime') {
          const days = daysAccess || (accessType === 'annual' ? 365 : 30);
          const expDate = new Date();
          expDate.setDate(expDate.getDate() + days);
          expirationDate = expDate.toISOString();
        }

        // Send email
        const emailSent = await sendAccessEmail(customerEmail, customerName, username, password, serviceType, accessType, expirationDate);

        // Save to database
        const { data: accessRecord, error } = await supabase
          .from('created_accesses')
          .insert({
            customer_email: customerEmail,
            customer_name: customerName,
            username,
            password,
            service_type: serviceType,
            access_type: accessType,
            days_access: daysAccess || 365,
            expiration_date: expirationDate,
            api_created: apiCreated,
            email_sent: emailSent,
            email_sent_at: emailSent ? new Date().toISOString() : null,
            notes,
          })
          .select()
          .single();

        if (error) {
          logStep("Error saving access record", { error: error.message });
          throw new Error(error.message);
        }

        logStep("Access created successfully", { id: accessRecord.id });
        return new Response(JSON.stringify({
          success: true,
          accessRecord,
          apiCreated,
          emailSent,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list_accesses": {
        const { data: accesses, error } = await supabase
          .from('created_accesses')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        return new Response(JSON.stringify({ success: true, accesses }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "resend_email": {
        const { id } = data;

        const { data: access, error: fetchError } = await supabase
          .from('created_accesses')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError || !access) throw new Error('Access record not found');

        const emailSent = await sendAccessEmail(
          access.customer_email,
          access.customer_name,
          access.username,
          access.password,
          access.service_type,
          access.access_type,
          access.expiration_date
        );

        if (emailSent) {
          await supabase
            .from('created_accesses')
            .update({ email_sent: true, email_sent_at: new Date().toISOString() })
            .eq('id', id);
        }

        return new Response(JSON.stringify({ success: emailSent }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_access": {
        const { id, updates } = data;

        const { error } = await supabase
          .from('created_accesses')
          .update(updates)
          .eq('id', id);

        if (error) throw new Error(error.message);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_access": {
        const { id } = data;

        const { error } = await supabase
          .from('created_accesses')
          .delete()
          .eq('id', id);

        if (error) throw new Error(error.message);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "test_whatsapp_api": {
        try {
          const response = await fetch(`${WHATSAPP_API_URL}/status`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          const success = response.ok;
          logStep("WhatsApp API test", { status: response.status, success });
          
          return new Response(JSON.stringify({ 
            success, 
            message: success ? 'API WhatsApp respondendo!' : `Erro: Status ${response.status}` 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (error: any) {
          logStep("WhatsApp API test error", { error: error?.message });
          return new Response(JSON.stringify({ 
            success: false, 
            message: `Erro de conexão: ${error?.message || 'Desconhecido'}` 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      case "test_instagram_api": {
        try {
          const response = await fetch(`${INSTAGRAM_API_URL}/status`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          const success = response.ok;
          logStep("Instagram API test", { status: response.status, success });
          
          return new Response(JSON.stringify({ 
            success, 
            message: success ? 'API Instagram respondendo!' : `Erro: Status ${response.status}` 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (error: any) {
          logStep("Instagram API test error", { error: error?.message });
          return new Response(JSON.stringify({ 
            success: false, 
            message: `Erro de conexão: ${error?.message || 'Desconhecido'}` 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      case "test_email": {
        const { email } = data;
        
        if (!email) {
          return new Response(JSON.stringify({ success: false, message: 'Email não informado' }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        try {
          const smtpPassword = Deno.env.get("SMTP_PASSWORD");
          if (!smtpPassword) {
            return new Response(JSON.stringify({ success: false, message: 'SMTP não configurado' }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
          
          const client = new SMTPClient({
            connection: {
              hostname: "smtp.hostinger.com",
              port: 465,
              tls: true,
              auth: {
                username: "suporte@maisresultadosonline.com.br",
                password: smtpPassword,
              },
            },
          });

          await client.send({
            from: "MRO - Mais Resultados Online <suporte@maisresultadosonline.com.br>",
            to: email,
            subject: "🧪 Email de Teste - MRO Admin",
            content: "Este é um email de teste do sistema MRO Admin.",
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: #fff;">
                <h2 style="color: #FFD700;">🧪 Email de Teste</h2>
                <p>Este é um email de teste do sistema <strong>MRO Admin</strong>.</p>
                <p>Se você recebeu este email, o sistema de envio está funcionando corretamente!</p>
                <hr style="border-color: #333;">
                <p style="color: #888; font-size: 12px;">MRO - Mais Resultados Online</p>
              </div>
            `,
          });

          await client.close();
          logStep("Test email sent successfully", { to: email });

          return new Response(JSON.stringify({ success: true, message: `Email enviado para ${email}` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (error: any) {
          logStep("Test email error", { error: error?.message });
          return new Response(JSON.stringify({ 
            success: false, 
            message: `Erro ao enviar: ${error?.message || 'Desconhecido'}` 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      case "get_settings": {
        try {
          const { data, error } = await supabase.storage
            .from('user-data')
            .download('admin/user-access-settings.json');

          if (error || !data) {
            return new Response(JSON.stringify({ success: true, settings: null }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          const text = await data.text();
          const settings = JSON.parse(text);
          
          return new Response(JSON.stringify({ success: true, settings }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ success: true, settings: null }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      case "save_settings": {
        const { settings } = data;
        
        try {
          const jsonBlob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
          
          const { error } = await supabase.storage
            .from('user-data')
            .upload('admin/user-access-settings.json', jsonBlob, {
              upsert: true,
              contentType: 'application/json',
            });

          if (error) throw error;

          logStep("Settings saved successfully");
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (error: any) {
          logStep("Error saving settings", { error: error?.message });
          return new Response(JSON.stringify({ success: false, error: error?.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      case "send_mass_email": {
        const { emails, subject, message } = data;
        
        if (!emails || !Array.isArray(emails) || emails.length === 0) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Nenhum email informado' 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const smtpPassword = Deno.env.get("SMTP_PASSWORD");
        if (!smtpPassword) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'SMTP não configurado' 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const results: Array<{ email: string; success: boolean }> = [];
        let sent = 0;
        let failed = 0;

        const client = new SMTPClient({
          connection: {
            hostname: "smtp.hostinger.com",
            port: 465,
            tls: true,
            auth: {
              username: "suporte@maisresultadosonline.com.br",
              password: smtpPassword,
            },
          },
        });

        const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 30px; text-align: center; }
    .header h1 { color: #000; margin: 0; font-size: 24px; }
    .content { padding: 30px; background: #f9f9f9; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #1a1a1a; }
    .footer p { color: #888; margin: 5px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📢 MRO - Mais Resultados Online</h1>
  </div>
  <div class="content">
    ${message}
  </div>
  <div class="footer">
    <p>MRO - Mais Resultados Online</p>
    <p>Gabriel Fernandes da Silva</p>
    <p>CNPJ: 54.840.738/0001-96</p>
  </div>
</body>
</html>
        `;

        for (const email of emails) {
          try {
            await client.send({
              from: "MRO - Mais Resultados Online <suporte@maisresultadosonline.com.br>",
              to: email,
              subject: subject || '📢 Novidades do MRO!',
              content: message.replace(/<[^>]*>/g, ''), // Plain text version
              html: htmlTemplate,
            });
            results.push({ email, success: true });
            sent++;
            logStep("Mass email sent", { to: email });
          } catch (error: any) {
            results.push({ email, success: false });
            failed++;
            logStep("Mass email failed", { to: email, error: error?.message });
          }
        }

        await client.close();

        return new Response(JSON.stringify({
          success: true,
          total: emails.length,
          sent,
          failed,
          results,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    logStep("ERROR", { message: errorMsg });
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
