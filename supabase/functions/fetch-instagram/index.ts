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
    
    if (!BRIGHTDATA_TOKEN) {
      console.error('BRIGHTDATA_API_TOKEN not configured');
      return Response.json({ 
        success: false, 
        error: 'Token da Bright Data não configurado. Configure o token nas configurações.'
      }, { status: 500, headers: corsHeaders });
    }

    // Helper function to make Bright Data API call
    const callBrightDataAPI = async (attempt: number): Promise<Response> => {
      console.log(`🔄 Bright Data API tentativa ${attempt}/2 para: ${cleanUsername}`);
      const profileUrl = `https://www.instagram.com/${cleanUsername}/`;
      
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

    try {
      let profileData = null;

      // ATTEMPT 1: First try
      try {
        const response1 = await callBrightDataAPI(1);
        
        if (response1.status === 202) {
          console.log('⏳ Bright Data returned 202 (async) on attempt 1');
          // Wait 2 seconds and try again
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          profileData = await processBrightDataResponse(response1);
        }
      } catch (e) {
        console.error('❌ Bright Data attempt 1 failed:', e);
      }

      // ATTEMPT 2: Second try if first failed
      if (!profileData) {
        console.log('⚠️ Primeira tentativa falhou, tentando novamente...');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5s between retries
        
        try {
          const response2 = await callBrightDataAPI(2);
          
          if (response2.status === 202) {
            console.log('⏳ Bright Data returned 202 (async) on attempt 2');
            return Response.json({ 
              success: false, 
              error: 'Dados do perfil estão sendo processados. Clique em "Tentar novamente" em 30 segundos.',
              retryAfter: 30,
              canRetry: true
            }, { headers: corsHeaders });
          } else {
            profileData = await processBrightDataResponse(response2);
          }
        } catch (e) {
          console.error('❌ Bright Data attempt 2 failed:', e);
        }
      }

      // If still no data after 2 attempts, return error with retry option
      if (!profileData) {
        console.log(`❌ Perfil @${cleanUsername} não encontrado após 2 tentativas - API pode estar temporariamente indisponível`);
        return Response.json({ 
          success: false, 
          error: 'API temporariamente indisponível para este perfil. Tente novamente em alguns minutos.',
          canRetry: true,
          retryAfter: 60
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
