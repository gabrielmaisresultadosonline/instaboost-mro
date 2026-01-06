import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LogOut, Clock, Crown, User, Lock, Unlock, KeyRound, RefreshCw, ShieldAlert } from 'lucide-react';
import { getCurrentUser, logoutUser } from '@/lib/userStorage';
import { formatDaysRemaining, isLifetimeAccess, canUseCreatives } from '@/types/user';
import { getSession, updateAnalysis } from '@/lib/storage';
import { syncSessionToPersistent, persistProfileData } from '@/lib/persistentStorage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserHeaderProps {
  onLogout: () => void;
  onReanalysisComplete?: () => void;
}

const ADMIN_PASSWORD = 'Ga145523@';

export const UserHeader = ({ onLogout, onReanalysisComplete }: UserHeaderProps) => {
  const user = getCurrentUser();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [nicheInput, setNicheInput] = useState('');
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  if (!user) return null;

  const daysText = formatDaysRemaining(user.daysRemaining);
  const isLifetime = isLifetimeAccess(user.daysRemaining);
  const creativesAccess = canUseCreatives(user);

  const handleLogout = async () => {
    if (confirm('Deseja realmente sair?')) {
      await logoutUser();
      onLogout();
    }
  };

  const handleAdminAccess = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleReanalysis = async () => {
    if (!nicheInput.trim()) {
      toast.error('Informe o nicho correto para reanálise');
      return;
    }

    setIsReanalyzing(true);
    
    try {
      const session = getSession();
      const activeProfile = session.profiles.find(p => p.id === session.activeProfileId);
      
      if (!activeProfile) {
        toast.error('Nenhum perfil ativo encontrado');
        return;
      }

      toast.info(`Reanalisando @${activeProfile.profile.username} como "${nicheInput}"...`);

      // Call the analyze-profile function with the correct niche hint
      const { data, error } = await supabase.functions.invoke('analyze-profile', {
        body: {
          profile: activeProfile.profile,
          nicheHint: nicheInput.trim()
        }
      });

      if (error) {
        throw error;
      }

      if (data && data.analysis) {
        // Update the analysis in session
        updateAnalysis(data.analysis);
        
        // Persist to cloud
        await persistProfileData(
          user.username, 
          activeProfile.profile.username, 
          activeProfile.profile, 
          data.analysis
        );
        await syncSessionToPersistent(user.username);

        toast.success(`Reanálise concluída! Nicho identificado como: ${data.analysis.niche || nicheInput}`);
        
        // Trigger refresh
        if (onReanalysisComplete) {
          onReanalysisComplete();
        }
        
        // Reset modal
        setShowAdminModal(false);
        setIsAuthenticated(false);
        setAdminPassword('');
        setNicheInput('');
      } else {
        throw new Error('Resposta inválida da API');
      }
    } catch (error) {
      console.error('Erro na reanálise:', error);
      toast.error('Erro ao reanalisar perfil. Tente novamente.');
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleCloseModal = () => {
    setShowAdminModal(false);
    setIsAuthenticated(false);
    setAdminPassword('');
    setNicheInput('');
    setPasswordError(false);
  };

  return (
    <div className="flex items-center gap-1 sm:gap-3">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-secondary/50 text-xs sm:text-sm max-w-[180px] sm:max-w-none">
              <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="font-medium truncate">{user.username}</span>
              
              {/* Admin Lock Icon */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAdminModal(true);
                }}
                className="p-0.5 sm:p-1 hover:bg-secondary rounded-full transition-colors flex-shrink-0"
                title="Acesso Admin"
              >
                <KeyRound className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground hover:text-amber-500 transition-colors" />
              </button>
              
              {isLifetime ? (
                <div className="hidden xs:flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                  <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" />
                  <span className="hidden sm:inline text-amber-500 font-semibold text-xs">Vitalício</span>
                  {user.creativesUnlocked ? (
                    <Unlock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-500" />
                  ) : (
                    <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-400" />
                  )}
                </div>
              ) : (
                <span className="hidden xs:flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">
                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  {user.daysRemaining}d
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center space-y-1">
              <p className="font-semibold">{user.username}</p>
              <p className="text-xs text-muted-foreground">{daysText}</p>
              {isLifetime && (
                <p className={`text-xs ${creativesAccess.allowed ? 'text-green-400' : 'text-amber-400'}`}>
                  Criativos: {creativesAccess.allowed ? 'Liberado' : 'Bloqueado'}
                </p>
              )}
              {user.email && (
                <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Button variant="ghost" size="sm" onClick={handleLogout} className="p-1.5 sm:p-2 h-auto">
        <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </Button>

      {/* Admin Access Modal */}
      <Dialog open={showAdminModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <ShieldAlert className="w-5 h-5" />
              Acesso RESTRITO
            </DialogTitle>
            <DialogDescription className="text-amber-500 font-medium">
              Somente admin MRO!
            </DialogDescription>
          </DialogHeader>

          {!isAuthenticated ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <Lock className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-400">Esta área requer autenticação de administrador</span>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha Admin</label>
                <Input
                  type="password"
                  placeholder="Digite a senha de admin"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    setPasswordError(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminAccess()}
                  className={passwordError ? 'border-red-500' : ''}
                />
                {passwordError && (
                  <p className="text-xs text-red-500">Senha incorreta!</p>
                )}
              </div>

              <Button onClick={handleAdminAccess} className="w-full" variant="destructive">
                <Lock className="w-4 h-4 mr-2" />
                Acessar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <Unlock className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-400">Acesso admin liberado!</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nicho Correto do Perfil</label>
                <Input
                  placeholder="Ex: Loja de Roupas, Barbearia, Restaurante..."
                  value={nicheInput}
                  onChange={(e) => setNicheInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleReanalysis()}
                />
                <p className="text-xs text-muted-foreground">
                  Informe o nicho correto para a IA fazer uma reanálise mais precisa
                </p>
              </div>

              <Button 
                onClick={handleReanalysis} 
                className="w-full" 
                disabled={isReanalyzing || !nicheInput.trim()}
              >
                {isReanalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Reanalisando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reanalisar Perfil
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
