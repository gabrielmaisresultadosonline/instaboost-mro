import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CUSTOM_API_BASE = "http://72.62.9.229:8000";

// Proxy de imagem para HTTPS
const proxyImage = (url: string | undefined | null): string => {
  if (!url) return '';
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=200&h=200&fit=cover`;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username } = await req.json();

    if (!username) {
      return new Response(
        JSON.stringify({ success: false, error: "Username is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean username
    const cleanUsername = username
      .replace('@', '')
      .replace('https://instagram.com/', '')
      .replace('https://www.instagram.com/', '')
      .replace('/', '')
      .trim()
      .toLowerCase();

    console.log(`Fetching profile for sync: ${cleanUsername}`);

    try {
      const apiUrl = `${CUSTOM_API_BASE}/profile/${cleanUsername}`;
      console.log('Calling custom API:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      console.log('Custom API status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Custom API response received');
        
        // API response format: { status: string, data: ProfileData | null, message: string | null }
        if (data.status === 'success' && data.data) {
          const profileData = data.data;
          
          // Profile picture with HTTPS proxy
          const proxiedProfilePic = profileData.profile_pic_url 
            ? proxyImage(profileData.profile_pic_url)
            : `https://api.dicebear.com/7.x/initials/svg?seed=${cleanUsername}&backgroundColor=10b981`;

          const profile = {
            username: profileData.username || cleanUsername,
            followers: profileData.followers_count || 0,
            following: profileData.following_count || 0,
            posts: profileData.posts_count || 0,
            profilePicUrl: proxiedProfilePic,
            fullName: profileData.full_name || cleanUsername,
            bio: profileData.biography || "",
            externalUrl: profileData.external_url || ""
          };

          console.log(`✅ Profile ${cleanUsername} found with ${profile.followers} followers`);

          return new Response(
            JSON.stringify({ success: true, profile }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.log(`❌ Profile ${cleanUsername} not found in API response:`, data.message || 'No data');
        }
      } else {
        console.log(`❌ API returned status ${response.status} for ${cleanUsername}`);
      }
    } catch (apiError) {
      console.error(`API error for ${cleanUsername}:`, apiError);
    }

    // Profile not found
    console.log(`Profile ${cleanUsername} does not exist or API unavailable`);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Perfil não existe ou API indisponível", 
        username: cleanUsername 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in sync function:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});