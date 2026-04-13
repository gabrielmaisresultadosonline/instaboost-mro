import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type VerifyAdminPasswordResponse = {
  success: boolean;
  error?: string;
};

const respond = (payload: VerifyAdminPasswordResponse) =>
  new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let password: unknown;

    try {
      const body = await req.json();
      password = body?.password;
    } catch {
      return respond({ success: false, error: "Invalid input" });
    }

    if (!password || typeof password !== "string" || password.length > 100) {
      return respond({ success: false, error: "Invalid input" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await supabase
      .from("license_settings")
      .select("admin_password")
      .limit(1)
      .single();

    if (error || !data) {
      return respond({ success: false, error: "Config not found" });
    }

    const isValid = password === data.admin_password;

    return respond({ success: isValid });
  } catch (error) {
    console.error("Error:", error);
    return respond({ success: false, error: "Internal error" });
  }
});
