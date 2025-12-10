import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const loginSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo").transform(v => v.toLowerCase().trim()),
  password: z.string().min(1, "Senha é obrigatória").max(72, "Senha muito longa")
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    
    // Validate input
    const parseResult = loginSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map(e => e.message).join(", ");
      console.error("Validation error:", parseResult.error.errors);
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { email, password } = parseResult.data;

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find user by email
    const { data: user, error: findError } = await supabaseAdmin
      .from("paid_users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (findError) {
      console.error("Find error:", findError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar usuário" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado", notFound: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Check password
    if (user.password !== password) {
      return new Response(
        JSON.stringify({ error: "Senha incorreta", wrongPassword: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    console.log("User logged in successfully:", user.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          instagram_username: user.instagram_username,
          subscription_status: user.subscription_status,
          subscription_end: user.subscription_end,
          strategies_generated: user.strategies_generated,
          creatives_used: user.creatives_used,
          created_at: user.created_at
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    console.error("Login error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
