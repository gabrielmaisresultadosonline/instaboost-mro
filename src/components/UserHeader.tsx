import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { LogOut, Clock, Crown, User, Lock, Unlock, KeyRound, RefreshCw, ShieldAlert, HelpCircle, Play, List, Mail, ChevronDown } from 'lucide-react';
import { getCurrentUser, logoutUser } from '@/lib/userStorage';
import { formatDaysRemaining, isLifetimeAccess, canUseCreatives } from '@/types/user';
import { getSession, updateAnalysis, clearStrategies } from '@/lib/storage';
import { syncSessionToPersistent, persistProfileData, clearPersistedStrategyDates } from '@/lib/persistentStorage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { dashboardTutorial, strategyTutorial } from '@/hooks/useTutorial';

interface UserHeaderProps {
  onLogout: () => void;
  onReanalysisComplete?: () => void;
  tutorial?: any;
  activeTab?: string;
}

const ADMIN_PASSWORD = 'Ga145523@';

export const UserHeader = ({ onLogout, onReanalysisComplete, tutorial, activeTab }: UserHeaderProps) => {
  const user = getCurrentUser();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
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
        // Clear old strategies from local session
        clearStrategies();
        
        // Update the analysis in session (with clearStrategies=true as backup)
        updateAnalysis(data.analysis, true);
        
        // CRITICAL: Clear strategy dates from cloud FIRST before persisting
        // This allows immediate regeneration of strategies with new niche
        await clearPersistedStrategyDates(user.username, activeProfile.profile.username);
        
        // Persist updated profile and analysis to cloud
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
    <div className="flex items-center gap-1 sm:gap-3 min-w-0 max-w-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-secondary/50 hover:bg-secondary/70 border-none text-xs sm:text-sm max-w-[180px] lg:max-w-[220px] xl:max-w-none min-w-0 h-auto">
            <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="font-bold truncate">MEU PERFIL</span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-2 bg-[#0d0d16] border-white/10 shadow-2xl rounded-2xl">
          <DropdownMenuLabel className="px-3 py-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-black text-white">{user.username}</span>
              <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">{user.email || 'Usuário MRO'}</span>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator className="bg-white/5" />
          
          <div className="py-2 px-1 space-y-1">
            <DropdownMenuItem className="rounded-xl focus:bg-white/5 cursor-default flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white/40" />
                <span className="text-xs font-bold text-white/70">Acesso</span>
              </div>
              {isLifetime ? (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <Crown className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] text-amber-500 font-black uppercase tracking-tighter">Vitalício</span>
                </div>
              ) : (
                <div className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/70 font-black uppercase tracking-tighter">{user.daysRemaining} dias</span>
                </div>
              )}
            </DropdownMenuItem>

            {user.email && (
              <DropdownMenuItem 
                onClick={() => setShowEmailModal(true)}
                className="rounded-xl focus:bg-white/5 cursor-pointer flex items-center gap-2"
              >
                <Mail className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white/70">Ver E-mail</span>
              </DropdownMenuItem>
            )}

            {tutorial && (
              <>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuLabel className="px-3 pt-2 pb-1 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Ajuda e Tutorial</DropdownMenuLabel>
                
                <DropdownMenuItem 
                  onClick={() => {
                    if (activeTab === 'strategies') {
                      tutorial.startTutorial(strategyTutorial);
                    } else {
                      tutorial.startTutorial(dashboardTutorial);
                    }
                  }}
                  className="rounded-xl focus:bg-white/5 cursor-pointer flex items-center gap-2"
                >
                  <Play className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white/70">Tutorial Interativo</span>
                </DropdownMenuItem>

                <DropdownMenuItem 
                  onClick={() => {
                    if (activeTab === 'strategies') {
                      tutorial.startListView(strategyTutorial);
                    } else {
                      tutorial.startListView(dashboardTutorial);
                    }
                  }}
                  className="rounded-xl focus:bg-white/5 cursor-pointer flex items-center gap-2"
                >
                  <List className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white/70">Lista de Instruções</span>
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator className="bg-white/5" />
            
            <DropdownMenuItem 
              onClick={() => setShowAdminModal(true)}
              className="rounded-xl focus:bg-amber-500/10 cursor-pointer flex items-center gap-2 text-amber-500"
            >
              <KeyRound className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-wider">Acesso Admin</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={handleLogout}
              className="rounded-xl focus:bg-red-500/10 cursor-pointer flex items-center gap-2 text-red-500"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-wider">Sair da Conta</span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Email View Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              E-mail Vinculado
            </DialogTitle>
            <DialogDescription>
              Este é o e-mail cadastrado em sua conta.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-secondary/20 rounded-xl border border-border">
            <div className="p-3 bg-primary/10 rounded-full">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground break-all">{user.email}</p>
              <p className="text-sm text-muted-foreground mt-1">Conta: {user.username}</p>
            </div>
          </div>
          <Button onClick={() => setShowEmailModal(false)} className="w-full">
            Fechar
          </Button>
        </DialogContent>
      </Dialog>

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
