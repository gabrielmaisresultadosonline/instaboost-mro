import { useState } from 'react';
import { InstagramProfile } from '@/types/instagram';
import { Users, UserPlus, Grid3X3, ExternalLink, Briefcase, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ProfileCardProps {
  profile: InstagramProfile;
  onResync?: () => Promise<void>;
}

export const ProfileCard = ({ profile, onResync }: ProfileCardProps) => {
  const [isResyncing, setIsResyncing] = useState(false);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Verifica se faltam informações
  const hasMissingProfilePic = !profile.profilePicUrl;
  const hasMissingPostImages = profile.recentPosts?.some(post => !post.imageUrl) || false;
  const needsResync = hasMissingProfilePic || hasMissingPostImages;

  const handleResync = async () => {
    if (!onResync) return;
    
    setIsResyncing(true);
    try {
      await onResync();
      toast.success('Perfil resincronizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao resincronizar perfil');
    } finally {
      setIsResyncing(false);
    }
  };

  return (
    <div className="glass-card glow-border p-6 animate-slide-up">
      <div className="flex items-start gap-6">
        {/* Profile Picture */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary/30 bg-primary/20 flex items-center justify-center">
            {profile.profilePicUrl ? (
              <img 
                src={profile.profilePicUrl} 
                alt={profile.fullName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement?.classList.add('show-initial');
                }}
              />
            ) : null}
            <span className={`text-2xl font-bold text-primary ${profile.profilePicUrl ? 'hidden' : ''}`}>
              {profile.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          {profile.isBusinessAccount && (
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-display font-bold">@{profile.username}</h2>
            {needsResync && onResync && (
              <Button
                onClick={handleResync}
                disabled={isResyncing}
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                title="Resincronizar perfil para buscar imagens faltantes"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isResyncing ? 'animate-spin' : ''}`} />
                {isResyncing ? 'Sincronizando...' : 'Resync'}
              </Button>
            )}
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

      {/* Engagement */}
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
