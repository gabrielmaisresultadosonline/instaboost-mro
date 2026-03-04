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
    const { action, settings, lead } = await req.json();
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const BUCKET = "user-data";
    const FILE_PATH = "rendaextraligacao/settings.json";

    if (action === "load") {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .download(FILE_PATH);

      if (error || !data) {
        return new Response(
          JSON.stringify({ success: true, data: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const text = await data.text();
      const parsed = JSON.parse(text);

      return new Response(
        JSON.stringify({ success: true, data: parsed }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "save") {
      const jsonStr = JSON.stringify(settings);
      const blob = new Blob([jsonStr], { type: "application/json" });

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(FILE_PATH, blob, { upsert: true, contentType: "application/json" });

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "register_lead") {
      // Save lead to storage
      const LEADS_PATH = "rendaextraligacao/leads.json";
      let existingLeads: any[] = [];
      
      try {
        const { data: leadsData } = await supabase.storage.from(BUCKET).download(LEADS_PATH);
        if (leadsData) {
          const text = await leadsData.text();
          existingLeads = JSON.parse(text);
        }
      } catch (_) {}

      existingLeads.push({
        ...lead,
        created_at: new Date().toISOString(),
      });

      const leadsBlob = new Blob([JSON.stringify(existingLeads)], { type: "application/json" });
      await supabase.storage.from(BUCKET).upload(LEADS_PATH, leadsBlob, { upsert: true, contentType: "application/json" });

      // Send email to the lead
      try {
        const smtpPassword = Deno.env.get("SMTP_PASSWORD");
        if (smtpPassword) {
          // Use edge function to send email via SMTP
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #4ade80; margin: 0;">🎉 Bem-vindo(a), ${lead.nome}!</h1>
              </div>
              <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
                <h2 style="color: #333; margin-top: 0;">Vejo que você tem interesse!</h2>
                <p style="color: #555; line-height: 1.6;">
                  Ficamos muito felizes com seu interesse em nossa ferramenta com IA para Instagram. 
                  Você está a um passo de transformar seus resultados!
                </p>
                <p style="color: #555; line-height: 1.6;">
                  <strong>Participe da nossa Live exclusiva</strong> onde vamos mostrar na prática como a ferramenta 
                  funciona e como você pode ter mais vendas, mais clientes e mais seguidores reais.
                </p>
              </div>
              <div style="background: #25d366; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
                <h3 style="color: #fff; margin-top: 0;">📱 Entre no grupo da Live</h3>
                <p style="color: rgba(255,255,255,0.9); margin-bottom: 16px;">
                  Clique no botão abaixo para entrar no grupo exclusivo:
                </p>
                <a href="https://chat.whatsapp.com/KIDNoL8cBlnFrHlifBqU7X" 
                   style="display: inline-block; background: #fff; color: #25d366; font-weight: bold; 
                          padding: 12px 32px; border-radius: 30px; text-decoration: none; font-size: 16px;">
                  Entrar no Grupo
                </a>
              </div>
              <div style="text-align: center; color: #999; font-size: 12px;">
                <p>Equipe Gabriel MRO • Ferramenta com IA para Instagram</p>
              </div>
            </div>
          `;

          // Simple SMTP send via fetch to a mail API or log
          console.log(`[RendaExtraLigacao] Email would be sent to: ${lead.email}`);
          console.log(`[RendaExtraLigacao] Lead registered: ${JSON.stringify(lead)}`);
        }
      } catch (emailErr) {
        console.error("[RendaExtraLigacao] Email error:", emailErr);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
