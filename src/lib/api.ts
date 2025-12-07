import { supabase } from '@/integrations/supabase/client';
import { InstagramProfile, ProfileAnalysis, Strategy, Creative } from '@/types/instagram';

export const fetchInstagramProfile = async (username: string): Promise<{
  success: boolean;
  profile?: InstagramProfile;
  simulated?: boolean;
  message?: string;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-instagram', {
      body: { username }
    });

    if (error) {
      console.error('Error fetching profile:', error);
      return { success: false, error: error.message };
    }

    if (data.success && data.profile) {
      // Add computed fields
      const profile: InstagramProfile = {
        ...data.profile,
        engagement: data.profile.followers > 0 
          ? ((data.profile.avgLikes || Math.floor(data.profile.followers * 0.03)) / data.profile.followers) * 100 
          : 0,
        avgLikes: data.profile.avgLikes || Math.floor(data.profile.followers * 0.03),
        avgComments: data.profile.avgComments || Math.floor(data.profile.followers * 0.005),
        recentPosts: data.profile.recentPosts || generateMockPosts(data.profile.username),
      };

      return { 
        success: true, 
        profile,
        simulated: data.simulated,
        message: data.message
      };
    }

    return { success: false, error: 'Não foi possível buscar o perfil' };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Erro de conexão' };
  }
};

export const analyzeProfile = async (profile: InstagramProfile): Promise<{
  success: boolean;
  analysis?: ProfileAnalysis;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-profile', {
      body: { profile }
    });

    if (error) {
      console.error('Error analyzing profile:', error);
      return { success: false, error: error.message };
    }

    if (data.success && data.analysis) {
      return { success: true, analysis: data.analysis };
    }

    return { success: false, error: 'Não foi possível analisar o perfil' };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Erro de conexão' };
  }
};

export const generateStrategy = async (
  profile: InstagramProfile, 
  analysis: ProfileAnalysis, 
  type: 'mro' | 'content' | 'engagement' | 'sales'
): Promise<{
  success: boolean;
  strategy?: Strategy;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-strategy', {
      body: { profile, analysis, type }
    });

    if (error) {
      console.error('Error generating strategy:', error);
      return { success: false, error: error.message };
    }

    if (data.success && data.strategy) {
      return { success: true, strategy: data.strategy };
    }

    return { success: false, error: 'Não foi possível gerar a estratégia' };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Erro de conexão' };
  }
};

export const generateCreative = async (
  strategy: Strategy,
  profile: InstagramProfile,
  niche: string
): Promise<{
  success: boolean;
  creative?: Creative;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-creative', {
      body: { strategy, profile, niche }
    });

    if (error) {
      console.error('Error generating creative:', error);
      return { success: false, error: error.message };
    }

    if (data.success && data.creative) {
      return { success: true, creative: data.creative };
    }

    return { success: false, error: 'Não foi possível gerar o criativo' };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Erro de conexão' };
  }
};

function generateMockPosts(username: string) {
  return Array.from({ length: 9 }, (_, i) => ({
    id: `post_${i}`,
    imageUrl: `https://picsum.photos/seed/${username}${i}/400/400`,
    caption: `Post ${i + 1} - Conteúdo de qualidade 🔥`,
    likes: Math.floor(Math.random() * 500) + 50,
    comments: Math.floor(Math.random() * 50) + 5,
    timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    hasHumanFace: Math.random() > 0.4,
  }));
}
