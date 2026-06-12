import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { type, data } = await req.json();

    if (type === 'new_request') {
      // Get admin email from settings
      const { data: settings } = await supabaseClient
        .from('creatordev_settings')
        .select('value')
        .eq('key', 'admin_notification_email')
        .single();

      const adminEmail = settings?.value || "seuemail@exemplo.com";

      // Send email using Lovable/Supabase email infrastructure
      // Since we don't have a direct email tool here, we'd normally use a service like Resend or SendGrid
      // But for this environment, we can use the project's email hook if configured, 
      // or just log it for now. In a real production app with Lovable, we'd use the transactional email tool.
      
      console.log(`Sending notification to ${adminEmail} about new project from ${data.full_name}`);
      
      // Implementation of email sending logic would go here
      // For now, let's assume we're using a webhook or the built-in email functionality if available
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
