import { useState, useEffect } from 'react';
import { InstagramProfile } from '@/types/instagram';
import { Users, UserPlus, Grid3X3, ExternalLink, Briefcase, RefreshCw, Camera, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { VideoTutorialButton } from '@/components/VideoTutorialButton';
import { fetchInstagramProfile, recoverProfileFromScreenshot } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

interface ProfileCardProps {
  profile: InstagramProfile;
  screenshotUrl?: string | null;
  onProfileUpdate?: (updatedProfile: InstagramProfile) => void;
}

export const ProfileCard = ({ profile, screenshotUrl, onProfileUpdate }: ProfileCardProps) => {
  const [isResyncingPhoto, setIsResyncingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [localProfilePicUrl, setLocalProfilePicUrl] = useState(profile.profilePicUrl);
  const { toast } = useToast();
  const [triedCacheFallback, setTriedCacheFallback] = useState(false);

  const needsScreenshot = profile.needsScreenshotAnalysis && !screenshotUrl;

  useEffect(() => {
    setLocalProfilePicUrl(profile.profilePicUrl);
    setPhotoError(false);
    setTriedCacheFallback(false);
  }, [profile.username, profile.profilePicUrl]);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const cachedImageUrl = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/profile-cache/profiles/${profile.username?.toLowerCase()}.jpg`
    : null;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleResyncPhoto = async () => {
    setIsResyncingPhoto(true);
    try {
      const result = await fetchInstagramProfile(profile.username, profile.recentPosts, true);

      if (!result.success || !result.profile) {
        if (screenshotUrl) {
          const screenshotRecovery = await recoverProfileFromScreenshot(profile.username, screenshotUrl, profile);
          if (screenshotRecovery.success && screenshotRecovery.profile) {
            const recoveredProfile = { ...profile, ...screenshotRecovery.profile };
            setLocalProfilePicUrl(recoveredProfile.profilePicUrl || '');
            setPhotoError(!recoveredProfile.profilePicUrl);
            if (onProfileUpdate) onProfileUpdate(recoveredProfile);
            toast({ title: 'Dados recuperados do print!', description: 'Usamos o print salvo para restaurar os dados do perfil.' });
            return;
          }
        }
        toast({ title: 'Erro ao sincronizar', description: result.error || 'Não foi possível buscar os dados do perfil.', variant: 'destructive' });
        return;
      }

      const updatedProfile = { ...profile, ...result.profile };
      setLocalProfilePicUrl(updatedProfile.profilePicUrl || '');
      setPhotoError(!updatedProfile.profilePicUrl);
      setTriedCacheFallback(false);

      if (updatedProfile.profilePicUrl) {
        supabase.functions.invoke('cache-profile-images', {
          body: { action: 'process-batch', batchSize: 1, offset: 0, forceRefresh: true, singleUsername: profile.username }
        }).catch(() => {});
      }

      if (onProfileUpdate) onProfileUpdate(updatedProfile);
      toast({ title: result.fromCache ? 'Dados recuperados do cache!' : 'Perfil atualizado!', description: result.message || 'Os dados do perfil foram sincronizados com sucesso.' });
    } catch (err) {
      console.error('Error resyncing photo:', err);
      toast({ title: 'Erro', description: 'Erro ao sincronizar perfil. Tente novamente.', variant: 'destructive' });
    } finally {
      setIsResyncingPhoto(false);
    }
  };

  const showingFallbackAvatar = photoError || !localProfilePicUrl;

  // If profile needs screenshot analysis and hasn't uploaded one yet, show minimal card
  if (needsScreenshot) {
    return (
      <div className="glass-card glow-border p-4 sm:p-6 animate-slide-up relative">
        <div className="flex items-center gap-4 py-4">
          {/* Instagram logo */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#E1306C] via-[#F77737] to-[#FCAF45] flex items-center justify-center flex-shrink-0">
            <Instagram className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-display font-bold truncate">@{profile.username}</h2>
            <div className="flex items-center gap-2 text-primary mt-1">
              <Camera className="w-3.5 h-3.5 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-muted-foreground">Envie o print do perfil abaixo para carregar dados</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // After screenshot analysis - show full data with Instagram logo instead of profile photo
  return (
    <div className="glass-card glow-border p-4 sm:p-6 animate-slide-up relative">
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
        <VideoTutorialButton youtubeUrl="https://youtu.be/mIQ78Skz1BU" title="Tutorial" variant="pulse" size="sm" />
      </div>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
        {/* Instagram logo instead of profile photo */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#E1306C] via-[#F77737] to-[#FCAF45] flex items-center justify-center flex-shrink-0">
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
          {profile.fullName && profile.fullName !== profile.username && (
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
