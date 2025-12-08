import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LogOut, Clock, Crown, User } from 'lucide-react';
import { getCurrentUser, logoutUser } from '@/lib/userStorage';
import { formatDaysRemaining, isLifetimeAccess } from '@/types/user';

interface UserHeaderProps {
  onLogout: () => void;
}

export const UserHeader = ({ onLogout }: UserHeaderProps) => {
  const user = getCurrentUser();

  if (!user) return null;

  const daysText = formatDaysRemaining(user.daysRemaining);
  const isLifetime = isLifetimeAccess(user.daysRemaining);

  const handleLogout = () => {
    if (confirm('Deseja realmente sair?')) {
      logoutUser();
      onLogout();
    }
  };

  return (
    <div className="flex items-center gap-3">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 text-sm">
              <User className="w-4 h-4" />
              <span className="font-medium">{user.username}</span>
              {isLifetime ? (
                <Crown className="w-4 h-4 text-amber-500" />
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {user.daysRemaining}d
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <p className="font-semibold">{user.username}</p>
              <p className="text-xs text-muted-foreground">{daysText}</p>
              {user.email && (
                <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Button variant="ghost" size="sm" onClick={handleLogout}>
        <LogOut className="w-4 h-4" />
      </Button>
    </div>
  );
};
