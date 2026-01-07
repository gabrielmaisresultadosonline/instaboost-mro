import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AFFILIATE-RESUMO-STORAGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, affiliateId, password, resumoData } = await req.json();
    
    logStep("Request received", { action, affiliateId });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "verify-password") {
      // Verify affiliate password
      try {
        const { data, error } = await supabase.storage
          .from('user-data')
          .download(`affiliate-resumos/${affiliateId}/config.json`);
        
        if (error) {
          logStep("Config not found, using default password", { affiliateId });
          // Default password is the affiliate ID if no config exists
          const isValid = password === affiliateId || password === "mro2024";
          return new Response(
            JSON.stringify({ success: isValid }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const text = await data.text();
        const config = JSON.parse(text);
        const isValid = password === config.password;
        
        logStep("Password verified", { affiliateId, isValid });
        
        return new Response(
          JSON.stringify({ success: isValid }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (e) {
        // If no config, use default password
        const isValid = password === affiliateId || password === "mro2024";
        return new Response(
          JSON.stringify({ success: isValid }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === "set-password") {
      // Set affiliate password
      const config = { password, updatedAt: new Date().toISOString() };
      
      const { error } = await supabase.storage
        .from('user-data')
        .upload(
          `affiliate-resumos/${affiliateId}/config.json`,
          JSON.stringify(config),
          { contentType: 'application/json', upsert: true }
        );
      
      if (error) {
        logStep("Error setting password", { error: error.message });
        throw error;
      }
      
      logStep("Password set successfully", { affiliateId });
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === "save") {
      // Save resumo data
      const dataToSave = {
        ...resumoData,
        updatedAt: new Date().toISOString()
      };
      
      const { error } = await supabase.storage
        .from('user-data')
        .upload(
          `affiliate-resumos/${affiliateId}/resumo.json`,
          JSON.stringify(dataToSave),
          { contentType: 'application/json', upsert: true }
        );
      
      if (error) {
        logStep("Error saving resumo", { error: error.message });
        throw error;
      }
      
      logStep("Resumo saved successfully", { affiliateId });
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === "get") {
      // Get resumo data
      const { data, error } = await supabase.storage
        .from('user-data')
        .download(`affiliate-resumos/${affiliateId}/resumo.json`);
      
      if (error) {
        logStep("Resumo not found", { affiliateId, error: error.message });
        return new Response(
          JSON.stringify({ success: false, error: 'Resumo not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const text = await data.text();
      const resumo = JSON.parse(text);
      
      logStep("Resumo loaded", { affiliateId });
      
      return new Response(
        JSON.stringify({ success: true, resumo }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error) {
    logStep('Error', { error: error instanceof Error ? error.message : 'Unknown' });
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
