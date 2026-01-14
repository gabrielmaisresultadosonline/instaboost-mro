import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegisterRequest {
  nome_completo: string;
  email: string;
  whatsapp: string;
  trabalha_atualmente: boolean;
  media_salarial: string;
  tipo_computador: string;
  instagram_username?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const data: RegisterRequest = await req.json();

    // Insert lead
    const { data: lead, error: leadError } = await supabase
      .from("renda_extra_leads")
      .insert({
        nome_completo: data.nome_completo,
        email: data.email,
        whatsapp: data.whatsapp,
        trabalha_atualmente: data.trabalha_atualmente,
        media_salarial: data.media_salarial,
        tipo_computador: data.tipo_computador,
        instagram_username: data.instagram_username || null
      })
      .select()
      .single();

    if (leadError) {
      console.error("Error inserting lead:", leadError);
      throw new Error("Erro ao salvar cadastro");
    }

    // Get settings for group link
    const { data: settings } = await supabase
      .from("renda_extra_settings")
      .select("*")
      .limit(1)
      .single();

    const groupLink = settings?.whatsapp_group_link || "https://chat.whatsapp.com/example";

    // Send confirmation email
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        const emailResult = await resend.emails.send({
          from: "MRO <noreply@mro.email>",
          to: [data.email],
          subject: "Recebemos seu interesse! - MRO Renda Extra",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1f2937 0%, #111827 100%); border-radius: 16px; padding: 40px; }
                .logo { text-align: center; margin-bottom: 30px; }
                h1 { color: #10b981; text-align: center; }
                .content { color: #d1d5db; line-height: 1.8; }
                .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; margin: 20px 0; }
                .button-container { text-align: center; margin: 30px 0; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 40px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="logo">
                  <h1>MRO - Renda Extra</h1>
                </div>
                
                <div class="content">
                  <p>Olá <strong>${data.nome_completo}</strong>! 👋</p>
                  
                  <p>Recebemos seu interesse no lançamento da ferramenta MRO!</p>
                  
                  <p>Você está a um passo de aprender como gerar <strong style="color: #10b981;">5 a 10 mil reais mensais</strong> com nossa ferramenta automática.</p>
                  
                  <p>Para não perder nenhuma novidade e participar do lançamento gratuito, entre no nosso grupo exclusivo do WhatsApp:</p>
                  
                  <div class="button-container">
                    <a href="${groupLink}" class="button">Entrar no Grupo do WhatsApp</a>
                  </div>
                  
                  <p>Aguarde mais informações sobre a data do lançamento!</p>
                  
                  <p>Até breve! 🚀</p>
                </div>
                
                <div class="footer">
                  <p>© ${new Date().getFullYear()} MRO. Todos os direitos reservados.</p>
                </div>
              </div>
            </body>
            </html>
          `
        });

        console.log("Email sent:", emailResult);

        // Log email
        await supabase.from("renda_extra_email_logs").insert({
          lead_id: lead.id,
          email_to: data.email,
          email_type: "confirmacao",
          subject: "Recebemos seu interesse! - MRO Renda Extra",
          status: "sent"
        });

        // Update lead
        await supabase
          .from("renda_extra_leads")
          .update({ 
            email_confirmacao_enviado: true,
            email_confirmacao_enviado_at: new Date().toISOString()
          })
          .eq("id", lead.id);

      } catch (emailError: any) {
        console.error("Error sending email:", emailError);
        
        // Log failed email
        await supabase.from("renda_extra_email_logs").insert({
          lead_id: lead.id,
          email_to: data.email,
          email_type: "confirmacao",
          subject: "Recebemos seu interesse! - MRO Renda Extra",
          status: "error",
          error_message: emailError.message
        });
      }
    } else {
      console.warn("RESEND_API_KEY not configured, skipping email");
    }

    return new Response(
      JSON.stringify({ success: true, leadId: lead.id, groupLink }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in renda-extra-register:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
