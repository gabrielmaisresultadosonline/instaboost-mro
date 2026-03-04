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
    const LEADS_PATH = "rendaextraligacao/leads.json";
    const STATS_PATH = "rendaextraligacao/stats.json";

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

    if (action === "track_no_notebook") {
      let stats = { no_notebook_count: 0 };
      try {
        const { data: statsData } = await supabase.storage.from(BUCKET).download(STATS_PATH);
        if (statsData) {
          const text = await statsData.text();
          stats = JSON.parse(text);
        }
      } catch (_) {}

      stats.no_notebook_count = (stats.no_notebook_count || 0) + 1;

      const blob = new Blob([JSON.stringify(stats)], { type: "application/json" });
      await supabase.storage.from(BUCKET).upload(STATS_PATH, blob, { upsert: true, contentType: "application/json" });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "register_lead") {
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

      // Send email
      try {
        const smtpPassword = Deno.env.get("SMTP_PASSWORD");
        if (smtpPassword) {
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

    if (action === "load_leads") {
      let leads: any[] = [];
      let stats = { no_notebook_count: 0 };

      try {
        const { data: leadsData } = await supabase.storage.from(BUCKET).download(LEADS_PATH);
        if (leadsData) {
          const text = await leadsData.text();
          leads = JSON.parse(text);
        }
      } catch (_) {}

      try {
        const { data: statsData } = await supabase.storage.from(BUCKET).download(STATS_PATH);
        if (statsData) {
          const text = await statsData.text();
          stats = JSON.parse(text);
        }
      } catch (_) {}

      return new Response(
        JSON.stringify({ success: true, leads, stats }),
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
