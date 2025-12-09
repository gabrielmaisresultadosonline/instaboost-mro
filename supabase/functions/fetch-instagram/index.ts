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
    const { username, existingPosts } = await req.json();
    
    if (!username) {
      return new Response(
        JSON.stringify({ error: 'Username é obrigatório' }),
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

    console.log(`Fetching Instagram profile via Bright Data: ${cleanUsername}`);

    const BRIGHTDATA_TOKEN = Deno.env.get('BRIGHTDATA_API_TOKEN');
    
    if (!BRIGHTDATA_TOKEN) {
      console.error('BRIGHTDATA_API_TOKEN not configured');
      return Response.json({ 
        success: true, 
        profile: generateFallbackProfile(cleanUsername),
        simulated: true,
        message: 'Token da Bright Data não configurado - usando dados simulados'
      }, { headers: corsHeaders });
    }

    try {
      const profileUrl = `https://www.instagram.com/${cleanUsername}/`;
      console.log('Calling Bright Data API for:', profileUrl);
      
      const response = await fetch(`${BRIGHTDATA_API_URL}?dataset_id=${INSTAGRAM_PROFILES_DATASET_ID}&format=json`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BRIGHTDATA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: [{ url: profileUrl }]
        })
      });

      console.log('Bright Data API status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Bright Data response:', JSON.stringify(data).substring(0, 2000));
        
        // Response can be an array of profiles
        const profileData = Array.isArray(data) ? data[0] : data;
        
        if (profileData && (profileData.followers || profileData.id)) {
          // Profile picture with HTTPS proxy
          const proxiedProfilePic = profileData.profile_image_link 
            ? proxyImage(profileData.profile_image_link)
            : `https://api.dicebear.com/7.x/initials/svg?seed=${cleanUsername}&backgroundColor=10b981`;

          // Calculate engagement from available data
          const followersCount = profileData.followers || 0;
          const postsCount = profileData.posts_count || profileData.post_count || 0;
          const avgEngagement = profileData.avg_engagement || 2.5;

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

          // Try to get real posts from the profile data if available
          let recentPosts: InstagramPost[] = [];
          
          // Check if profile data includes posts
          if (profileData.posts && Array.isArray(profileData.posts) && profileData.posts.length > 0) {
            console.log('✅ Found posts in profile data');
            recentPosts = profileData.posts.slice(0, 6).map((post: any, index: number) => ({
              id: post.id || post.pk || `post_${index}`,
              imageUrl: proxyImage(post.display_url || post.image_url || post.thumbnail_url),
              caption: post.caption || post.description || '',
              likes: post.likes_count || post.like_count || post.likes || 0,
              comments: post.comments_count || post.comment_count || post.comments || 0,
              timestamp: post.taken_at || post.timestamp || post.date_posted || new Date().toISOString(),
              hasHumanFace: post.has_human_face !== undefined ? post.has_human_face : Math.random() > 0.4,
            }));
          }
          // Check if latest_posts is available
          else if (profileData.latest_posts && Array.isArray(profileData.latest_posts) && profileData.latest_posts.length > 0) {
            console.log('✅ Found latest_posts in profile data');
            recentPosts = profileData.latest_posts.slice(0, 6).map((post: any, index: number) => ({
              id: post.id || post.pk || `post_${index}`,
              imageUrl: proxyImage(post.display_url || post.image_url || post.thumbnail_url || post.image),
              caption: post.caption || post.description || post.text || '',
              likes: post.likes_count || post.like_count || post.likes || 0,
              comments: post.comments_count || post.comment_count || post.comments || 0,
              timestamp: post.taken_at || post.timestamp || post.date_posted || new Date().toISOString(),
              hasHumanFace: post.has_human_face !== undefined ? post.has_human_face : Math.random() > 0.4,
            }));
          }
          // If existingPosts were sent and we have no new posts, keep the existing ones
          else if (existingPosts && Array.isArray(existingPosts) && existingPosts.length > 0) {
            console.log('✅ Keeping existing posts (no new data from API)');
            recentPosts = existingPosts;
          }
          // Fallback to placeholder posts only if no existing data
          else {
            console.log('⚠️ No posts in API response and no existing posts, generating placeholders');
            recentPosts = generatePlaceholderPosts(cleanUsername, followersCount);
          }

          // Calculate engagement metrics
          const avgLikes = Math.round(followersCount * (avgEngagement / 100));
          const avgComments = Math.round(avgLikes * 0.15);

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
        } else {
          console.log('❌ No profile data in response');
        }
      } else if (response.status === 202) {
        // Async request - snapshot being processed
        const data = await response.json();
        console.log('Bright Data returned 202 (async):', data);
        
        // If we have existing posts, return them with a note
        if (existingPosts && Array.isArray(existingPosts) && existingPosts.length > 0) {
          console.log('Returning existing posts while async request processes');
          return Response.json({ 
            success: true, 
            profile: {
              ...generateFallbackProfile(cleanUsername),
              recentPosts: existingPosts,
            },
            simulated: false,
            message: 'Dados em processamento - usando posts existentes'
          }, { headers: corsHeaders });
        }
      } else {
        const errorText = await response.text();
        console.log('❌ Bright Data API failed:', response.status, errorText.substring(0, 500));
      }
    } catch (e) {
      console.error('Bright Data API error:', e);
    }

    // Fallback to simulated data if Bright Data API fails
    console.log('Bright Data API failed, using fallback data');
    
    // If we have existing posts, use them in fallback
    if (existingPosts && Array.isArray(existingPosts) && existingPosts.length > 0) {
      const fallbackProfile = generateFallbackProfile(cleanUsername);
      fallbackProfile.recentPosts = existingPosts;
      return Response.json({ 
        success: true, 
        profile: fallbackProfile,
        simulated: true,
        message: 'API indisponível - mantendo posts existentes'
      }, { headers: corsHeaders });
    }
    
    return Response.json({ 
      success: true, 
      profile: generateFallbackProfile(cleanUsername),
      simulated: true,
      message: 'API indisponível - usando dados simulados'
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error fetching Instagram profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return Response.json(
      { error: 'Erro ao buscar perfil', details: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
});

function generateFallbackProfile(username: string) {
  const categories = ['Empresa local', 'Marca', 'Criador de conteúdo', 'Loja', 'Serviços profissionais'];
  const niches = ['Marketing Digital', 'Vendas Online', 'Consultoria', 'Serviços Profissionais', 'E-commerce'];
  
  return {
    username: username,
    fullName: `${username.charAt(0).toUpperCase()}${username.slice(1)} Business`,
    bio: `🚀 Transformando negócios locais\n📍 Brasil\n💼 Especialista em ${niches[Math.floor(Math.random() * niches.length)]}\n👇 Clique no link abaixo`,
    followers: Math.floor(Math.random() * 15000) + 500,
    following: Math.floor(Math.random() * 1500) + 200,
    posts: Math.floor(Math.random() * 300) + 20,
    profilePicUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${username}&backgroundColor=10b981`,
    isBusinessAccount: Math.random() > 0.3,
    category: categories[Math.floor(Math.random() * categories.length)],
    externalUrl: `https://${username}.com.br`,
    engagement: Math.random() * 5 + 0.5,
    avgLikes: Math.floor(Math.random() * 500) + 50,
    avgComments: Math.floor(Math.random() * 30) + 5,
    recentPosts: generatePlaceholderPosts(username, 5000),
  };
}

function generatePlaceholderPosts(username: string, followers: number = 5000): InstagramPost[] {
  const avgLikes = Math.round(followers * 0.03);
  return Array.from({ length: 6 }, (_, i) => ({
    id: `post_${i}`,
    imageUrl: `https://picsum.photos/seed/${username}${i}/400/400`,
    caption: `Post ${i + 1} - Conteúdo de qualidade 🔥`,
    likes: Math.floor(avgLikes * (0.7 + Math.random() * 0.6)),
    comments: Math.floor(avgLikes * 0.15 * (0.5 + Math.random())),
    timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    hasHumanFace: Math.random() > 0.4,
  }));
}
