import { useState, useEffect } from 'react';
import { InstagramProfile } from '@/types/instagram';
import { Users, UserPlus, Grid3X3, ExternalLink, Briefcase, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
    <div className="glass-card glow-border p-6 animate-slide-up">
      <div className="flex items-start gap-6">
        {/* Profile Picture */}
        <div className="relative">
          <div 
            className={`w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary/30 bg-primary/20 flex items-center justify-center ${showingFallbackAvatar ? 'cursor-pointer' : ''}`}
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
                <span className="text-2xl font-bold text-primary">
                  {profile.username?.substring(0, 2).toUpperCase()}
                </span>
                
                {/* Sync overlay on fallback avatar */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 hover:opacity-100 transition-opacity">
                  <RefreshCw className={`w-6 h-6 text-white ${isResyncingPhoto ? 'animate-spin' : ''}`} />
                </div>
              </>
            )}
          </div>
          
          {/* Sync indicator badge when showing fallback */}
          {showingFallbackAvatar && (
            <button
              onClick={handleResyncPhoto}
              disabled={isResyncingPhoto}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
              title="Clique para buscar foto real"
            >
              <RefreshCw className={`w-4 h-4 text-white ${isResyncingPhoto ? 'animate-spin' : ''}`} />
            </button>
          )}
          
          {profile.isBusinessAccount && !showingFallbackAvatar && (
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-display font-bold">@{profile.username}</h2>
            {profile.category && (
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                {profile.category}
              </span>
            )}
          </div>
          <p className="text-lg text-foreground/90 mb-2">{profile.fullName}</p>
          <p className="text-muted-foreground text-sm whitespace-pre-line">{profile.bio}</p>
          
          {profile.externalUrl && (
            <a 
              href={profile.externalUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 text-primary hover:underline text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              {profile.externalUrl}
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
        <StatItem icon={<Grid3X3 />} value={formatNumber(profile.posts)} label="Posts" />
        <StatItem icon={<Users />} value={formatNumber(profile.followers)} label="Seguidores" />
        <StatItem icon={<UserPlus />} value={formatNumber(profile.following)} label="Seguindo" />
      </div>

      {/* Engagement - only show if we have engagement data */}
      {profile.engagement > 0 && (
        <div className="mt-6 p-4 rounded-lg bg-secondary/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Engajamento</p>
              <p className="text-2xl font-display font-bold text-gradient">{profile.engagement.toFixed(2)}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Média por Post</p>
              <p className="text-foreground">
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
    <div className="flex items-center justify-center gap-2 mb-1">
      <span className="text-primary">{icon}</span>
      <span className="text-2xl font-display font-bold">{value}</span>
    </div>
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);
