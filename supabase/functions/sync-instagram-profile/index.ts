import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bright Data API configuration
const BRIGHTDATA_API_URL = 'https://api.brightdata.com/datasets/v3/scrape';
const INSTAGRAM_PROFILES_DATASET_ID = 'gd_l1vikfch901nx3by4';

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

    console.log(`Syncing profile via Bright Data: ${cleanUsername}`);

    const BRIGHTDATA_TOKEN = Deno.env.get('BRIGHTDATA_API_TOKEN');
    
    if (!BRIGHTDATA_TOKEN) {
      console.error('BRIGHTDATA_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Token da Bright Data não configurado", 
          username: cleanUsername 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Helper function to make Bright Data API call
    const callBrightDataAPI = async (attempt: number): Promise<Response> => {
      const profileUrl = `https://www.instagram.com/${cleanUsername}/`;
      console.log(`🔄 Bright Data API tentativa ${attempt}/2 para sync: ${profileUrl}`);
      
      return await fetch(`${BRIGHTDATA_API_URL}?dataset_id=${INSTAGRAM_PROFILES_DATASET_ID}&format=json`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BRIGHTDATA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: [{ url: profileUrl }]
        })
      });
    };

    // Helper function to process response
    const processBrightDataResponse = async (response: Response): Promise<any | null> => {
      if (!response.ok && response.status !== 202) {
        const errorText = await response.text();
        console.log(`❌ Bright Data API error:`, response.status, errorText.substring(0, 500));
        return null;
      }

      if (response.status === 202) {
        console.log('⏳ Bright Data returned 202 (async processing)');
        return null;
      }

      const data = await response.json();
      console.log('Bright Data sync response:', JSON.stringify(data).substring(0, 1500));
      
      const profileData = Array.isArray(data) ? data[0] : data;
      
      if (profileData && (profileData.followers !== undefined || profileData.id)) {
        return profileData;
      }
      
      console.log('❌ No valid profile data in sync response');
      return null;
    };

    try {
      let profileData = null;

      // ATTEMPT 1: First try
      try {
        const response1 = await callBrightDataAPI(1);
        profileData = await processBrightDataResponse(response1);
      } catch (e) {
        console.error('❌ Sync attempt 1 failed:', e);
      }

      // ATTEMPT 2: Second try if first failed
      if (!profileData) {
        console.log('⚠️ Primeira tentativa de sync falhou, tentando novamente...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        try {
          const response2 = await callBrightDataAPI(2);
          profileData = await processBrightDataResponse(response2);
        } catch (e) {
          console.error('❌ Sync attempt 2 failed:', e);
        }
      }

      // If still no data after 2 attempts
      if (!profileData) {
        console.log(`❌ Profile ${cleanUsername} não encontrado após 2 tentativas de sync`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Não conseguimos buscar dados do perfil. Tente novamente.", 
            username: cleanUsername,
            canRetry: true
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Process successful profile data
      const proxiedProfilePic = profileData.profile_image_link 
        ? proxyImage(profileData.profile_image_link)
        : '';  // Don't use fallback dicebear - that indicates no real data

      const followersCount = profileData.followers || 0;
      const postsCount = profileData.posts_count || profileData.post_count || 0;
      
      // CRITICAL: Don't return success if profile has no real data
      const hasRealData = followersCount > 0 || postsCount > 0 || profileData.profile_image_link;
      
      if (!hasRealData) {
        console.log(`❌ Profile ${cleanUsername} has no real data (0 followers, 0 posts, no picture)`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Perfil não tem dados reais. Verifique se o perfil existe e é público.", 
            username: cleanUsername,
            canRetry: true
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const profile = {
        username: profileData.account || profileData.profile_name || cleanUsername,
        followers: followersCount,
        following: profileData.following || 0,
        posts: postsCount,
        profilePicUrl: proxiedProfilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${cleanUsername}&backgroundColor=10b981`,
        fullName: profileData.profile_name || profileData.full_name || cleanUsername,
        bio: profileData.biography || profileData.bio || "",
        externalUrl: profileData.external_url || ""
      };

      console.log(`✅ Profile ${cleanUsername} synced with REAL data: ${profile.followers} followers, ${profile.posts} posts`);

      return new Response(
        JSON.stringify({ success: true, profile }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (apiError) {
      console.error(`API error for ${cleanUsername}:`, apiError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Erro de conexão. Tente novamente.", 
          username: cleanUsername,
          canRetry: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in sync function:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
