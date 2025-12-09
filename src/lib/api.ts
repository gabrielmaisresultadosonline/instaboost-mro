import { supabase } from '@/integrations/supabase/client';
import { InstagramProfile, ProfileAnalysis, Strategy, Creative, CreativeConfig } from '@/types/instagram';

export const fetchInstagramProfile = async (
  username: string,
  existingPosts?: any[]
): Promise<{
  success: boolean;
  profile?: InstagramProfile;
  simulated?: boolean;
  message?: string;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-instagram', {
      body: { username, existingPosts }
    });

    if (error) {
      console.error('Error fetching profile:', error);
      return { success: false, error: error.message };
    }

    // Check for API error response
    if (!data.success) {
      return { 
        success: false, 
        error: data.error || 'Não foi possível buscar o perfil'
      };
    }

    if (data.profile) {
      // Use ONLY real data from the API - no fallbacks to mock data
      const profile: InstagramProfile = {
        ...data.profile,
        engagement: data.profile.engagement || (data.profile.followers > 0 
          ? ((data.profile.avgLikes || 0) / data.profile.followers) * 100 
          : 0),
        avgLikes: data.profile.avgLikes || 0,
        avgComments: data.profile.avgComments || 0,
        recentPosts: data.profile.recentPosts || [], // Empty array if no real posts, NOT mock
      };

      return { 
        success: true, 
        profile,
        simulated: false,
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
  type: 'mro' | 'content' | 'engagement' | 'sales' | 'bio'
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
  niche: string,
  config?: CreativeConfig,
  logoUrl?: string,
  isManualMode?: boolean,
  customPrompt?: string,
  personPhotoBase64?: string,
  includeText?: boolean,
  includeLogo?: boolean
): Promise<{
  success: boolean;
  creative?: Creative;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-creative', {
      body: { 
        strategy, 
        profile, 
        niche,
        config,
        logoUrl: includeLogo === false ? null : logoUrl,
        isManualMode,
        customPrompt,
        personPhotoBase64,
        includeText,
        includeLogo,
        variationSeed: Date.now() + Math.floor(Math.random() * 10000) // Ensure uniqueness
      }
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

// Mock posts function removed - only real data is used now
