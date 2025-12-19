import { useState, useEffect } from 'react';
import { InstagramProfile } from '@/types/instagram';
import { Users, UserPlus, Grid3X3, ExternalLink, Briefcase, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { VideoTutorialButton } from '@/components/VideoTutorialButton';

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

  // Reset photo state when profile changes
  useEffect(() => {
    setLocalProfilePicUrl(profile.profilePicUrl);
    setPhotoError(false);
  }, [profile.username, profile.profilePicUrl]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleResyncPhoto = async () => {
    setIsResyncingPhoto(true);
    try {
      // Use fetch-instagram instead of sync - it has more fallbacks
      const { data, error } = await supabase.functions.invoke('fetch-instagram', {
        body: { username: profile.username }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success && data?.profile?.profilePicUrl) {
        setLocalProfilePicUrl(data.profile.profilePicUrl);
        setPhotoError(false);
        toast({
          title: 'Foto atualizada!',
          description: 'A foto do perfil foi sincronizada com sucesso.'
        });
        
        // Update parent if callback provided
        if (onProfileUpdate) {
          onProfileUpdate({
            ...profile,
            profilePicUrl: data.profile.profilePicUrl,
            followers: data.profile.followers || profile.followers,
            following: data.profile.following || profile.following,
            posts: data.profile.posts || profile.posts,
            bio: data.profile.bio || profile.bio,
          });
        }
      } else {
        toast({
          title: 'Erro ao sincronizar',
          description: data?.error || 'Não foi possível buscar a foto do perfil.',
          variant: 'destructive'
        });
      }
    } catch (err) {
      console.error('Error resyncing photo:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao sincronizar foto. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsResyncingPhoto(false);
    }
  };

  // Show sync overlay when showing fallback avatar (no real photo)
  const showingFallbackAvatar = photoError || !localProfilePicUrl;

  return (
    <div className="glass-card glow-border p-4 sm:p-6 animate-slide-up relative">
      {/* Video Tutorial Button - Pulsing */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
        <VideoTutorialButton
          youtubeUrl="https://youtu.be/mIQ78Skz1BU"
          title="Tutorial"
          variant="pulse"
          size="sm"
        />
      </div>

      {/* Profile Header - Responsivo */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
        {/* Profile Picture */}
        <div className="relative flex-shrink-0">
          <div 
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-4 ring-primary/30 bg-primary/20 flex items-center justify-center ${showingFallbackAvatar ? 'cursor-pointer' : ''}`}
            onClick={showingFallbackAvatar ? handleResyncPhoto : undefined}
          >
            {localProfilePicUrl && !photoError ? (
              <img 
                src={localProfilePicUrl} 
                alt={profile.fullName}
                className="w-full h-full object-cover"
                onError={() => {
                  setPhotoError(true);
                }}
              />
            ) : (
              <>
                {/* Fallback avatar with initials */}
                <span className="text-xl sm:text-2xl font-bold text-primary">
                  {profile.username?.substring(0, 2).toUpperCase()}
                </span>
                
                {/* Sync overlay on fallback avatar */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 hover:opacity-100 transition-opacity">
                  <RefreshCw className={`w-5 h-5 sm:w-6 sm:h-6 text-white ${isResyncingPhoto ? 'animate-spin' : ''}`} />
                </div>
              </>
            )}
          </div>
          
          {/* Sync indicator badge when showing fallback */}
          {showingFallbackAvatar && (
            <button
              onClick={handleResyncPhoto}
              disabled={isResyncingPhoto}
              className="absolute -bottom-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
              title="Clique para buscar foto real"
            >
              <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 text-white ${isResyncingPhoto ? 'animate-spin' : ''}`} />
            </button>
          )}
          
          {profile.isBusinessAccount && !showingFallbackAvatar && (
            <div className="absolute -bottom-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center">
              <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-3 mb-2">
            <h2 className="text-lg sm:text-2xl font-display font-bold break-all">@{profile.username}</h2>
            {profile.category && (
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-primary/20 text-primary text-xs font-medium whitespace-nowrap">
                {profile.category}
              </span>
            )}
          </div>
          <p className="text-base sm:text-lg text-foreground/90 mb-1 sm:mb-2">{profile.fullName}</p>
          <p className="text-muted-foreground text-xs sm:text-sm whitespace-pre-line line-clamp-3 sm:line-clamp-none">{profile.bio}</p>
          
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border">
        <StatItem icon={<Grid3X3 className="w-4 h-4 sm:w-5 sm:h-5" />} value={formatNumber(profile.posts)} label="Posts" />
        <StatItem icon={<Users className="w-4 h-4 sm:w-5 sm:h-5" />} value={formatNumber(profile.followers)} label="Seguidores" />
        <StatItem icon={<UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />} value={formatNumber(profile.following)} label="Seguindo" />
      </div>

      {/* Engagement - only show if we have engagement data */}
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
