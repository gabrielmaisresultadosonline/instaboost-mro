import { ProfileSession } from '@/types/instagram';
import { Plus, User, X, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProfileSelectorProps {
  profiles: ProfileSession[];
  activeProfileId: string | null;
  onSelectProfile: (profileId: string) => void;
  onAddProfile: () => void;
  onRemoveProfile: (profileId: string) => void;
  isLoading?: boolean;
}

export const ProfileSelector = ({
  profiles,
  activeProfileId,
  onSelectProfile,
  onAddProfile,
  onRemoveProfile,
  isLoading,
}: ProfileSelectorProps) => {
  const activeProfile = profiles.find(p => p.id === activeProfileId);

  return (
    <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-initial min-w-0 px-2 sm:px-4" disabled={isLoading}>
            {activeProfile ? (
              <>
                <img
                  src={activeProfile.profile.profilePicUrl}
                  alt={activeProfile.profile.username}
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover flex-shrink-0"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <span className="truncate text-xs sm:text-sm">@{activeProfile.profile.username}</span>
              </>
            ) : (
              <>
                <User className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Selecionar Perfil</span>
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px] sm:w-64">
          <div className="max-h-[50vh] overflow-y-auto">
            {profiles.map((profile) => (
              <DropdownMenuItem
                key={profile.id}
                className="flex items-center justify-between cursor-pointer py-2"
                onClick={() => onSelectProfile(profile.id)}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {profile.profile.profilePicUrl && !profile.profile.profilePicUrl.includes('ui-avatars') && !profile.profile.profilePicUrl.includes('dicebear') ? (
                    <img
                      src={profile.profile.profilePicUrl}
                      alt={profile.profile.username}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">{profile.profile.username?.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs sm:text-sm truncate">@{profile.profile.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {profile.profile.followers.toLocaleString()} seguidores
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {profile.id === activeProfileId && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                  {/* Só mostra botão de remover se o print NÃO estiver bloqueado (menos de 2 uploads) */}
                  {(profile.screenshotUploadCount ?? 0) < 2 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remover @${profile.profile.username} da sessão?`)) {
                          onRemoveProfile(profile.id);
                        }
                      }}
                      className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
                      title="Remover perfil"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </div>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              onAddProfile();
            }}
            className="cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Perfil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="p-1 sm:p-1.5 rounded-full hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground flex-shrink-0">
              <Info className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{profiles.length} perfil(is) • 6 criativos por perfil</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
