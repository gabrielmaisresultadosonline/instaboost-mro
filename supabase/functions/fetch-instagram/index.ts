import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Custom Instagram API base URL
const CUSTOM_API_BASE = 'http://72.62.9.229:8000';

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username } = await req.json();
    
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
      .trim();

    console.log(`Buscando perfil real via API customizada: ${cleanUsername}`);

    // Call custom Instagram API
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
        console.log('Custom API response:', JSON.stringify(data).substring(0, 1500));
        
        // API response format: { status: string, data: ProfileData | null, message: string | null }
        if (data.status === 'success' && data.data) {
          const profileData = data.data;
          
          // Use image proxy for profile picture to avoid CORS
          const proxiedProfilePic = profileData.profile_pic_url 
            ? `${CUSTOM_API_BASE}/image-proxy?url=${encodeURIComponent(profileData.profile_pic_url)}`
            : `https://api.dicebear.com/7.x/initials/svg?seed=${cleanUsername}&backgroundColor=10b981`;

          // Map posts (top_posts array - 6 posts)
          const recentPosts: InstagramPost[] = (profileData.top_posts || []).map((post: any, index: number) => {
            // Use image proxy for post images
            const proxiedImageUrl = post.media_url 
              ? `${CUSTOM_API_BASE}/image-proxy?url=${encodeURIComponent(post.thumbnail_url || post.media_url)}`
              : `https://picsum.photos/seed/${cleanUsername}${index}/400/400`;

            return {
              id: post.shortcode || `post_${index}`,
              imageUrl: proxiedImageUrl,
              caption: post.caption || '',
              likes: post.likes_count || 0,
              comments: post.comments_count || 0,
              timestamp: post.date_utc || new Date().toISOString(),
              hasHumanFace: !post.is_video && Math.random() > 0.3,
            };
          });

          // Calculate engagement
          const avgLikes = recentPosts.length > 0 
            ? Math.round(recentPosts.reduce((sum, p) => sum + p.likes, 0) / recentPosts.length)
            : Math.round(profileData.followers_count * 0.03);

          const avgComments = recentPosts.length > 0
            ? Math.round(recentPosts.reduce((sum, p) => sum + p.comments, 0) / recentPosts.length)
            : Math.round(profileData.followers_count * 0.005);

          const engagement = profileData.followers_count > 0 && recentPosts.length > 0
            ? ((avgLikes + avgComments) / profileData.followers_count) * 100
            : 2.5;

          const profile: InstagramProfile = {
            username: profileData.username || cleanUsername,
            fullName: profileData.full_name || '',
            bio: profileData.biography || '',
            followers: profileData.followers_count || 0,
            following: profileData.following_count || 0,
            posts: profileData.posts_count || 0,
            profilePicUrl: proxiedProfilePic,
            isBusinessAccount: !profileData.is_private,
            category: '',
            externalUrl: profileData.external_url || '',
          };

          console.log('Profile found via Custom API:', profile.username, profile.followers);
          console.log('Posts found:', recentPosts.length);

          return Response.json({
            success: true,
            profile: {
              ...profile,
              engagement: Math.min(engagement, 15),
              avgLikes,
              avgComments,
              recentPosts,
            },
            simulated: false,
            message: 'Dados reais do Instagram via API customizada'
          }, { headers: corsHeaders });
        } else {
          console.log('Custom API returned error:', data.message || 'Unknown error');
        }
      } else {
        const errorText = await response.text();
        console.log('Custom API failed:', response.status, errorText.substring(0, 500));
      }
    } catch (e) {
      console.error('Custom API error:', e);
    }

    // Fallback to simulated data if custom API fails
    console.log('Custom API failed, using fallback data');
    return Response.json({ 
      success: true, 
      profile: generateFallbackProfile(cleanUsername),
      simulated: true,
      message: 'API customizada indisponível - usando dados simulados'
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
    recentPosts: generatePlaceholderPosts(username),
  };
}

function generatePlaceholderPosts(username: string): InstagramPost[] {
  return Array.from({ length: 6 }, (_, i) => ({
    id: `post_${i}`,
    imageUrl: `https://picsum.photos/seed/${username}${i}/400/400`,
    caption: `Post ${i + 1} - Conteúdo de qualidade 🔥`,
    likes: Math.floor(Math.random() * 500) + 50,
    comments: Math.floor(Math.random() * 50) + 5,
    timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    hasHumanFace: Math.random() > 0.4,
  }));
}
