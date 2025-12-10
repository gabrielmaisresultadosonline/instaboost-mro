import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const registerSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo").transform(v => v.toLowerCase().trim()),
  username: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo").transform(v => v.trim()),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(72, "Senha muito longa"),
  instagram_username: z.string().max(30, "Username do Instagram muito longo").optional().nullable()
    .transform(v => v ? v.toLowerCase().replace(/^@/, '').trim() : null)
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    
    // Validate input
    const parseResult = registerSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map(e => e.message).join(", ");
      console.error("Validation error:", parseResult.error.errors);
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { email, username, password, instagram_username } = parseResult.data;

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from("paid_users")
      .select("id, email, subscription_status")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ 
          exists: true, 
          user: existingUser 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Create new user with password
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from("paid_users")
      .insert({
        email: email,
        username: username,
        password: password,
        instagram_username: instagram_username,
        subscription_status: "pending",
        strategies_generated: 0,
        creatives_used: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar usuário: " + insertError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("User created successfully:", newUser.id);

    return new Response(
      JSON.stringify({ 
        exists: false, 
        user: newUser 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    console.error("Registration error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
