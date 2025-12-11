import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bright Data API configuration
const BRIGHTDATA_API_URL = 'https://api.brightdata.com/datasets/v3/scrape';
const INSTAGRAM_PROFILES_DATASET_ID = 'gd_l1vikfch901nx3by4';
const INSTAGRAM_POSTS_DATASET_ID = 'gd_lyclm20il4r5helnj'; // Posts dataset

interface InstagramProfile {
  username: string;
  fullName: string;
  bio: string;
  followers: number;
  following: number;
  posts: number;
  profilePicUrl: string;
  isBusinessAccount: boolean;
  category: string;
  externalUrl: string;
}

interface InstagramPost {
  id: string;
  imageUrl: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
  hasHumanFace: boolean;
}

// Proxy de imagem para HTTPS
const proxyImage = (url: string | undefined | null): string => {
  if (!url) return '';
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=400&q=80`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, existingPosts, onlyPosts } = await req.json();
    
    if (!username) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    console.log(`Fetching Instagram profile via Bright Data: ${cleanUsername} (onlyPosts: ${onlyPosts || false})`);

    const BRIGHTDATA_TOKEN = Deno.env.get('BRIGHTDATA_API_TOKEN');
    const INSTAGRAM_SESSION_ID = Deno.env.get('INSTAGRAM_SESSION_ID');
    
    if (!BRIGHTDATA_TOKEN) {
      console.error('BRIGHTDATA_API_TOKEN not configured');
      return Response.json({ 
        success: false, 
        error: 'Token da Bright Data não configurado. Configure o token nas configurações.'
      }, { status: 500, headers: corsHeaders });
    }

    // Helper function to scrape Instagram directly via web page
    const scrapeInstagramDirect = async (): Promise<any | null> => {
      console.log('🔍 Tentando scraping direto do Instagram...');
      
      try {
        // Try to fetch the Instagram page directly with mobile user agent
        const response = await fetch(`https://www.instagram.com/${cleanUsername}/?__a=1&__d=dis`, {
          headers: {
            'User-Agent': 'Instagram 219.0.0.12.117 Android',
            'Accept': 'application/json',
            'X-IG-App-ID': '936619743392459',
          }
        });
        
        if (response.ok) {
          const text = await response.text();
          console.log(`📥 Direct scrape response (${text.length} chars)`);
          
          try {
            const data = JSON.parse(text);
            if (data.graphql?.user || data.user) {
              const user = data.graphql?.user || data.user;
              console.log('✅ Direct scrape successful!');
              return {
                profile_name: user.full_name || user.username,
                account: user.username,
                biography: user.biography,
                followers: user.edge_followed_by?.count || user.follower_count || 0,
                following: user.edge_follow?.count || user.following_count || 0,
                posts_count: user.edge_owner_to_timeline_media?.count || user.media_count || 0,
                profile_image_link: user.profile_pic_url_hd || user.profile_pic_url,
                is_business_account: user.is_business_account || user.is_professional_account,
                category: user.category_name || user.category || '',
                external_url: user.external_url || '',
              };
            }
          } catch (e) {
            console.log('❌ Failed to parse direct scrape response');
          }
        } else {
          console.log(`❌ Direct scrape failed with status: ${response.status}`);
        }
      } catch (e) {
        console.error('❌ Direct scrape error:', e);
      }
      
      return null;
    };

    // Helper function to make Bright Data API call
    const callBrightDataAPI = async (attempt: number, useAuth: boolean = false): Promise<Response> => {
      console.log(`🔄 Bright Data API tentativa ${attempt}/2 para: ${cleanUsername} (auth: ${useAuth})`);
      const profileUrl = `https://www.instagram.com/${cleanUsername}/`;
      
      // Build request body with optional session cookie for authenticated requests
      const requestBody: any = {
        input: [{ url: profileUrl }]
      };
      
      // Add session cookie for authenticated requests to access age-restricted profiles
      if (useAuth && INSTAGRAM_SESSION_ID) {
        requestBody.browser_instructions = [
          {
            action: "set_cookies",
            cookies: [
              {
                name: "sessionid",
                value: INSTAGRAM_SESSION_ID,
                domain: ".instagram.com",
                path: "/",
                secure: true,
                httpOnly: true
              }
            ]
          }
        ];
        console.log('🍪 Added Instagram session cookie for authenticated request');
      }
      
      return await fetch(`${BRIGHTDATA_API_URL}?dataset_id=${INSTAGRAM_PROFILES_DATASET_ID}&format=json`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BRIGHTDATA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
    };

    // Helper function to process Bright Data response
    const processBrightDataResponse = async (response: Response): Promise<any | null> => {
      if (!response.ok) {
        console.log(`❌ Bright Data API status: ${response.status}`);
        const errorText = await response.text();
        console.log(`❌ Bright Data error body: ${errorText.substring(0, 500)}`);
        return null;
      }

      const data = await response.json();
      const rawResponse = JSON.stringify(data);
      console.log(`📥 Bright Data raw response (${rawResponse.length} chars): ${rawResponse.substring(0, 2000)}`);
      
      // Handle empty array response - Bright Data sometimes returns [] for valid profiles
      if (Array.isArray(data) && data.length === 0) {
        console.log(`⚠️ Bright Data returned empty array [] for ${cleanUsername} - may be temporary issue`);
        return null;
      }
      
      const profileData = Array.isArray(data) ? data[0] : data;
      
      // Check if we have valid profile data
      if (profileData && (profileData.followers !== undefined || profileData.id || profileData.profile_name)) {
        console.log(`✅ Valid profile data found: followers=${profileData.followers}, id=${profileData.id}`);
        return profileData;
      }
      
      console.log('❌ No valid profile data in response structure');
      return null;
    };

    const hasAuthSession = !!INSTAGRAM_SESSION_ID;

    try {
      let profileData = null;

      // ATTEMPT 0: Try direct scraping first (fastest)
      profileData = await scrapeInstagramDirect();

      // ATTEMPT 1: Bright Data without auth
      if (!profileData) {
        try {
          const response1 = await callBrightDataAPI(1, false);
          
          if (response1.status === 202) {
            console.log('⏳ Bright Data returned 202 (async) on attempt 1');
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            profileData = await processBrightDataResponse(response1);
          }
        } catch (e) {
          console.error('❌ Bright Data attempt 1 failed:', e);
        }
      }

      // ATTEMPT 2: Second try Bright Data without auth if first failed
      if (!profileData) {
        console.log('⚠️ Primeira tentativa falhou, tentando novamente...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        try {
          const response2 = await callBrightDataAPI(2, false);
          
          if (response2.status === 202) {
            console.log('⏳ Bright Data returned 202 (async) on attempt 2');
          } else {
            profileData = await processBrightDataResponse(response2);
          }
        } catch (e) {
          console.error('❌ Bright Data attempt 2 failed:', e);
        }
      }

      // ATTEMPT 3: Try with authenticated session if available and previous attempts failed
      if (!profileData && hasAuthSession) {
        console.log('🔐 Tentando com sessão autenticada para perfis restritos...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        try {
          const response3 = await callBrightDataAPI(3, true);
          
          if (response3.status === 202) {
            console.log('⏳ Bright Data returned 202 (async) on authenticated attempt');
            return Response.json({ 
              success: false, 
              error: 'Perfil restrito em processamento. Clique em "Tentar novamente" em 30 segundos.',
              retryAfter: 30,
              canRetry: true
            }, { headers: corsHeaders });
          } else {
            profileData = await processBrightDataResponse(response3);
            if (profileData) {
              console.log('✅ Perfil restrito acessado via sessão autenticada!');
            }
          }
        } catch (e) {
          console.error('❌ Bright Data authenticated attempt failed:', e);
        }
      }

      // If still no data after all attempts, return error with retry option
      if (!profileData) {
        const errorMsg = hasAuthSession 
          ? 'Perfil não encontrado ou inacessível mesmo com autenticação. Verifique se o perfil existe.'
          : 'Este perfil possui restrição de idade e não pode ser acessado automaticamente. O dono do perfil precisa desativar a restrição nas configurações do Instagram.';
        
        console.log(`❌ Perfil @${cleanUsername} não encontrado após todas tentativas`);
        return Response.json({ 
          success: false, 
          error: errorMsg,
          canRetry: true,
          retryAfter: 60,
          isRestricted: true
        }, { headers: corsHeaders });
      }

      // Process successful profile data
      const originalProfilePic = profileData.profile_image_link;
      
      if (!onlyPosts && !originalProfilePic) {
        console.log('⚠️ No profile picture - loading anyway');
      }
      
      const proxiedProfilePic = originalProfilePic ? proxyImage(originalProfilePic) : '';
      const followersCount = profileData.followers || 0;
      
      if (!onlyPosts && followersCount === 0) {
        console.log('⚠️ Profile has 0 followers - loading anyway for growth tracking');
      }
      
      const postsCount = profileData.posts_count || profileData.post_count || 0;
      const avgEngagement = profileData.avg_engagement || 2.5;

      // Try to get real posts from the profile data
      let recentPosts: InstagramPost[] = [];
      
      if (profileData.posts && Array.isArray(profileData.posts) && profileData.posts.length > 0) {
        console.log('✅ Found real posts in profile data:', profileData.posts.length);
        recentPosts = profileData.posts.slice(0, 6).map((post: any, index: number) => ({
          id: post.id || post.pk || `post_${index}`,
          imageUrl: proxyImage(post.display_url || post.image_url || post.thumbnail_url),
          caption: post.caption || post.description || '',
          likes: post.likes_count || post.like_count || post.likes || 0,
          comments: post.comments_count || post.comment_count || post.comments || 0,
          timestamp: post.taken_at || post.timestamp || post.date_posted || post.datetime || new Date().toISOString(),
          hasHumanFace: post.has_human_face !== undefined ? post.has_human_face : true,
        }));
      }
      else if (profileData.latest_posts && Array.isArray(profileData.latest_posts) && profileData.latest_posts.length > 0) {
        console.log('✅ Found real latest_posts:', profileData.latest_posts.length);
        recentPosts = profileData.latest_posts.slice(0, 6).map((post: any, index: number) => ({
          id: post.id || post.pk || `post_${index}`,
          imageUrl: proxyImage(post.display_url || post.image_url || post.thumbnail_url || post.image),
          caption: post.caption || post.description || post.text || '',
          likes: post.likes_count || post.like_count || post.likes || 0,
          comments: post.comments_count || post.comment_count || post.comments || 0,
          timestamp: post.taken_at || post.timestamp || post.date_posted || post.datetime || new Date().toISOString(),
          hasHumanFace: post.has_human_face !== undefined ? post.has_human_face : true,
        }));
      }
      else if (existingPosts && Array.isArray(existingPosts) && existingPosts.length > 0) {
        console.log('✅ Keeping existing real posts (no new data from API)');
        recentPosts = existingPosts;
      }
      else {
        console.log('⚠️ No posts available in API response');
        recentPosts = [];
      }

      const avgLikes = Math.round(followersCount * (avgEngagement / 100));
      const avgComments = Math.round(avgLikes * 0.15);

      if (onlyPosts) {
        console.log('✅ onlyPosts mode - returning just posts data:', recentPosts.length, 'posts');
        return Response.json({
          success: true,
          profile: {
            recentPosts,
            avgLikes,
            avgComments,
            engagement: Math.min(avgEngagement, 15),
          },
          simulated: false,
          message: 'Posts atualizados via Bright Data API'
        }, { headers: corsHeaders });
      }

      const profile: InstagramProfile = {
        username: profileData.account || profileData.profile_name || cleanUsername,
        fullName: profileData.profile_name || profileData.full_name || '',
        bio: profileData.biography || profileData.bio || '',
        followers: followersCount,
        following: profileData.following || 0,
        posts: postsCount,
        profilePicUrl: proxiedProfilePic,
        isBusinessAccount: profileData.is_business_account || profileData.is_professional_account || false,
        category: profileData.category || '',
        externalUrl: profileData.external_url || '',
      };

      console.log('✅ Profile found via Bright Data:', profile.username, profile.followers, 'posts:', recentPosts.length);

      return Response.json({
        success: true,
        profile: {
          ...profile,
          engagement: Math.min(avgEngagement, 15),
          avgLikes,
          avgComments,
          recentPosts,
        },
        simulated: false,
        message: 'Dados reais do Instagram via Bright Data API'
      }, { headers: corsHeaders });

    } catch (e) {
      console.error('Bright Data API error:', e);
      return Response.json({ 
        success: false, 
        error: 'Erro de conexão com a API. Clique em "Tentar novamente".',
        canRetry: true
      }, { status: 500, headers: corsHeaders });
    }

  } catch (error) {
    console.error('Error fetching Instagram profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return Response.json(
      { success: false, error: 'Erro ao buscar perfil: ' + errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
});
