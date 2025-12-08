import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CUSTOM_API_BASE = "http://72.62.9.229:8000";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username } = await req.json();

    if (!username) {
      return new Response(
        JSON.stringify({ error: "Username is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching profile for: ${username}`);

    // Fetch from custom API
    const response = await fetch(`${CUSTOM_API_BASE}/profile/${username}`);
    
    if (!response.ok) {
      console.log(`Profile ${username} not found`);
      // Retornar 200 com success: false para evitar erros de rede no frontend
      return new Response(
        JSON.stringify({ success: false, error: "Profile not found", username }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log(`Profile ${username} fetched successfully:`, data);

    // Format response
    const profile = {
      username: data.username || username,
      followers: data.followers || 0,
      following: data.following || 0,
      posts: data.posts || 0,
      profilePicUrl: data.profile_picture 
        ? `https://images.weserv.nl/?url=${encodeURIComponent(data.profile_picture)}&w=200&h=200&fit=cover`
        : `https://api.dicebear.com/7.x/initials/svg?seed=${username}`,
      fullName: data.full_name || username,
      bio: data.bio || ""
    };

    return new Response(
      JSON.stringify({ success: true, profile }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error fetching profile:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
