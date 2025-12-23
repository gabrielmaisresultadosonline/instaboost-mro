import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [METODO-SEGUIDOR-ADMIN-AUTH] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const { email, password } = body;

    log("Admin login attempt", { email });

    const { data: admin, error } = await supabase
      .from("metodo_seguidor_admins")
      .select("*")
      .eq("email", email.trim().toLowerCase())
      .eq("password", password.trim())
      .maybeSingle();

    if (error || !admin) {
      log("Admin login failed", { email, error });
      return new Response(
        JSON.stringify({ success: false, error: "Credenciais inválidas" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log("Admin login successful", { adminId: admin.id });

    return new Response(
      JSON.stringify({ success: true, admin: { id: admin.id, email: admin.email, name: admin.name } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
