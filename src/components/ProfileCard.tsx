import { useState } from 'react';
import { InstagramProfile } from '@/types/instagram';
import { Users, UserPlus, Grid3X3, ExternalLink, Instagram, RefreshCw, Loader2 } from 'lucide-react';
import { VideoTutorialButton } from '@/components/VideoTutorialButton';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfileCardProps {
  profile: InstagramProfile;
  screenshotUrl?: string | null;
  onProfileUpdate?: (updatedProfile: InstagramProfile) => void;
  onAnalysisComplete?: (analysis: any) => void;
}

export const ProfileCard = ({ profile, screenshotUrl, onProfileUpdate, onAnalysisComplete }: ProfileCardProps) => {
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const hasRealPrintData = profile.dataSource === 'screenshot' && !profile.needsScreenshotAnalysis;
  const hasScreenshot = !!screenshotUrl;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleReanalyze = async () => {
    if (!screenshotUrl) return;
    setIsReanalyzing(true);
    try {
      const { data: analysisData, error } = await supabase.functions.invoke('analyze-profile-screenshot', {
        body: { screenshot_url: screenshotUrl, username: profile.username }
      });

      if (error) throw error;

      if (analysisData?.success === false && analysisData?.error === 'not_instagram_profile') {
        toast.error('Este print não parece ser de um perfil do Instagram.');
        return;
      }

      if (analysisData?.analysis && onAnalysisComplete) {
        onAnalysisComplete(analysisData.analysis);
      }

      if (analysisData?.extracted_data && onProfileUpdate) {
        const extracted = analysisData.extracted_data;
        const updatedProfile: InstagramProfile = {
          ...profile,
          followers: Number(extracted.followers) || 0,
          following: Number(extracted.following) || 0,
          posts: Number(extracted.posts_count) || 0,
          bio: extracted.bio || '',
          fullName: extracted.full_name || '',
          isBusinessAccount: extracted.is_business || false,
          category: extracted.category || '',
          externalUrl: extracted.external_link || '',
          needsScreenshotAnalysis: false,
          dataSource: 'screenshot',
        };
        onProfileUpdate(updatedProfile);
      }

      toast.success('Reanálise concluída! Dados atualizados.');
    } catch (err) {
      console.error('Reanalysis error:', err);
      toast.error('Erro ao reanalisar. Tente novamente.');
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Profile not yet analyzed but has a screenshot — show reanalyze button
  if (!hasRealPrintData) {
    return (
      <div className="glass-card glow-border p-4 sm:p-6 animate-slide-up relative">
        <div className="flex items-center gap-4 py-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-instagram-gradient flex items-center justify-center flex-shrink-0">
            <Instagram className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-display font-bold truncate">@{profile.username}</h2>
            {hasScreenshot ? (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Print salvo. Clique em reanalisar para carregar dados reais.</p>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Envie o print do perfil para carregar dados reais</p>
            )}
          </div>
          {hasScreenshot && (
            <Button
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              size="sm"
              className="shrink-0 gap-2"
            >
              {isReanalyzing ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Analisando...</>
              ) : (
                <><RefreshCw className="w-4 h-4" />Reanalisar</>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card glow-border p-4 sm:p-6 animate-slide-up relative">
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 flex items-center gap-2">
        <Button
          onClick={handleReanalyze}
          disabled={isReanalyzing}
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
        >
          {isReanalyzing ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analisando...</>
          ) : (
            <><RefreshCw className="w-3.5 h-3.5" />Reanalisar</>
          )}
        </Button>
        <VideoTutorialButton youtubeUrl="https://youtu.be/mIQ78Skz1BU" title="Tutorial" variant="pulse" size="sm" />
      </div>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-instagram-gradient flex items-center justify-center flex-shrink-0">
          <Instagram className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-3 mb-2">
            <h2 className="text-lg sm:text-2xl font-display font-bold break-all">@{profile.username}</h2>
            {profile.category && (
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-primary/20 text-primary text-xs font-medium whitespace-nowrap">
                {profile.category}
              </span>
            )}
          </div>
          {profile.fullName && (
            <p className="text-base sm:text-lg text-foreground/90 mb-1 sm:mb-2">{profile.fullName}</p>
          )}
          {profile.bio && (
            <p className="text-muted-foreground text-xs sm:text-sm whitespace-pre-line line-clamp-3 sm:line-clamp-none">{profile.bio}</p>
          )}
          
          {profile.externalUrl && (
            <a 
              href={profile.externalUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 sm:gap-2 mt-2 sm:mt-3 text-primary hover:underline text-xs sm:text-sm break-all"
            >
              <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-none">{profile.externalUrl}</span>
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border">
        <StatItem icon={<Grid3X3 className="w-4 h-4 sm:w-5 sm:h-5" />} value={formatNumber(profile.posts)} label="Posts" />
        <StatItem icon={<Users className="w-4 h-4 sm:w-5 sm:h-5" />} value={formatNumber(profile.followers)} label="Seguidores" />
        <StatItem icon={<UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />} value={formatNumber(profile.following)} label="Seguindo" />
      </div>

      {profile.engagement > 0 && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg bg-secondary/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
            <div className="text-center sm:text-left">
              <p className="text-xs sm:text-sm text-muted-foreground">Taxa de Engajamento</p>
              <p className="text-xl sm:text-2xl font-display font-bold text-gradient">{profile.engagement.toFixed(2)}%</p>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-xs sm:text-sm text-muted-foreground">Média por Post</p>
              <p className="text-foreground text-sm sm:text-base">
                <span className="font-semibold">{formatNumber(profile.avgLikes)}</span> likes • 
                <span className="font-semibold ml-1">{formatNumber(profile.avgComments)}</span> comentários
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatItem = ({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) => (
  <div className="text-center">
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
      <span className="text-primary">{icon}</span>
      <span className="text-lg sm:text-2xl font-display font-bold">{value}</span>
    </div>
    <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
  </div>
);
