import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [METODO-SEGUIDOR-AUTH] ${step}`, details ? JSON.stringify(details) : "");
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
    const { action, username, password, userId } = body;

    if (action === "login") {
      log("Login attempt", { username });

      const { data: user, error } = await supabase
        .from("metodo_seguidor_users")
        .select("*")
        .eq("username", username.trim().toLowerCase())
        .eq("password", password.trim())
        .eq("subscription_status", "active")
        .maybeSingle();

      if (error || !user) {
        log("Login failed", { username, error });
        return new Response(
          JSON.stringify({ success: false, error: "Credenciais inválidas ou acesso não ativo" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update last access
      await supabase
        .from("metodo_seguidor_users")
        .update({ last_access: new Date().toISOString() })
        .eq("id", user.id);

      log("Login successful", { userId: user.id });

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            instagram_username: user.instagram_username
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      const { data: user, error } = await supabase
        .from("metodo_seguidor_users")
        .select("*")
        .eq("id", userId)
        .eq("subscription_status", "active")
        .maybeSingle();

      if (error || !user) {
        return new Response(
          JSON.stringify({ success: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            instagram_username: user.instagram_username
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
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
