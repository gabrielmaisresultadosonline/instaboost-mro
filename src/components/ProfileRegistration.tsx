import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  Check, 
  Instagram, 
  Loader2, 
  LogOut,
  Mail, 
  RefreshCw, 
  UserPlus,
  Download,
  Camera,
  LayoutDashboard,
  ChevronDown,
  Rocket,
  Wrench,
  Briefcase,
  DollarSign,
  KeyRound,
  X as XIcon
} from 'lucide-react';
import { InstagramProfile, ProfileAnalysis } from '@/types/instagram';
import { normalizeInstagramUsername } from '@/types/user';
import { addIGToSquare, saveEmailAndPrint, verifyRegisteredIGs, canRegisterIG } from '@/lib/squareApi';
import { 
  getCurrentUser, 
  updateUserEmail, 
  forceUpdateUserEmail,
  addRegisteredIG, 
  isIGRegistered,
  syncIGsFromSquare,
  getRegisteredIGs,
  loadUserFromCloud,
  saveUserSession,
  getUserSession
} from '@/lib/userStorage';
import { 
  getArchivedByUsername, 
  restoreProfileFromArchive,
  addProfile,
  getSession as getStorageSession,
  setActiveProfile as setActiveProfileInStorage,
  resetSession
} from '@/lib/storage';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import { TutorialButton } from '@/components/TutorialButton';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { TutorialList } from '@/components/TutorialList';
import { useTutorial, profileRegistrationTutorial } from '@/hooks/useTutorial';
import { VideoTutorialButton } from '@/components/VideoTutorialButton';

interface ProfileRegistrationProps {
  onProfileRegistered: (profile: InstagramProfile, analysis: ProfileAnalysis) => void;
  onSyncComplete: (instagrams: string[]) => void;
  onEnterMemberArea?: () => void;
  onLogout?: () => void;
}

export const ProfileRegistration = ({ onProfileRegistered, onSyncComplete, onEnterMemberArea, onLogout }: ProfileRegistrationProps) => {
  const [instagramInput, setInstagramInput] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncOfferDialog, setShowSyncOfferDialog] = useState(false);
  const [pendingSyncIG, setPendingSyncIG] = useState<string>('');
  const [pendingRegisterIG, setPendingRegisterIG] = useState<string>('');
  const [showPreRegisterDialog, setShowPreRegisterDialog] = useState(false);
  const [registeredIGs, setRegisteredIGs] = useState<string[]>([]);
  const [showSyncConfirmDialog, setShowSyncConfirmDialog] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editEmailValue, setEditEmailValue] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Tutorial system
  const tutorial = useTutorial();

  const user = getCurrentUser();

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
    const igs = getRegisteredIGs();
    setRegisteredIGs(igs.map(ig => ig.username));
    
    const checkAndFixPartialData = async () => {
      if (user?.username && igs.length > 0 && !user?.email) {
        try {
          const cloudData = await loadUserFromCloud(user.username);
          if (cloudData?.email) {
            setEmail(cloudData.email);
            const session = getUserSession();
            if (session.user) {
              session.user.email = cloudData.email;
              session.user.isEmailLocked = cloudData.isEmailLocked;
              saveUserSession(session);
            }
          }
        } catch (e) {
          console.error('[ProfileRegistration] Error fixing partial data:', e);
        }
      }
    };
    
    checkAndFixPartialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, user?.username]);

  // Handle syncing a single profile that already exists in SquareCloud
  const handleSyncSingleProfile = async () => {
    if (!pendingSyncIG || !user) return;
    
    setShowSyncOfferDialog(false);
    setIsLoading(true);
    setLoadingMessage(`Sincronizando @${pendingSyncIG}...`);
    
    try {
      if (!email.trim()) {
        toast({ title: 'Digite seu e-mail', description: 'Necessário para sincronizar', variant: 'destructive' });
        setIsLoading(false);
        setLoadingMessage('');
        return;
      }

      updateUserEmail(email);
      
      // Check if profile was previously archived
      const archivedProfile = getArchivedByUsername(pendingSyncIG);
      
      if (archivedProfile) {
        setLoadingMessage('Restaurando dados salvos...');
        const restored = restoreProfileFromArchive(pendingSyncIG);
        
        if (restored) {
          await syncIGsFromSquare([pendingSyncIG], email);
          setRegisteredIGs(prev => [...prev, pendingSyncIG]);
          toast({ title: 'Perfil restaurado!', description: `@${pendingSyncIG} foi restaurado com todos os dados anteriores` });
          onSyncComplete([pendingSyncIG]);
          setPendingSyncIG('');
          setInstagramInput('');
          setIsLoading(false);
          setLoadingMessage('');
          return;
        }
      }
      
      // Create placeholder profile - data will come from screenshot
      const placeholderProfile = createPlaceholderProfile(pendingSyncIG);
      const placeholderAnalysis = createPlaceholderAnalysis();
      
      await syncIGsFromSquare([pendingSyncIG], email);
      setRegisteredIGs(prev => [...prev, pendingSyncIG]);
      
      addProfile(placeholderProfile, placeholderAnalysis);
      
      toast({
        title: 'Perfil sincronizado!',
        description: `@${pendingSyncIG} foi vinculado. Envie um print do perfil para análise completa.`
      });

      onSyncComplete([pendingSyncIG]);
      setPendingSyncIG('');
      setInstagramInput('');
    } catch (error) {
      console.error('[ProfileRegistration] Sync error:', error);
      toast({ title: 'Erro na sincronização', description: 'Tente novamente', variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleSearchProfile = async () => {
    if (!instagramInput.trim()) {
      toast({ title: 'Digite o Instagram', variant: 'destructive' });
      return;
    }

    if (!user) {
      toast({ title: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }

    if (!email.trim()) {
      toast({ title: 'Digite seu e-mail primeiro', variant: 'destructive' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: 'E-mail inválido', variant: 'destructive' });
      return;
    }

    const normalizedIG = normalizeInstagramUsername(instagramInput);

    setIsLoading(true);
    setLoadingMessage('Verificando disponibilidade...');

    try {
      const checkResult = await canRegisterIG(user.username, normalizedIG);
      
      if (checkResult.alreadyExists) {
        setPendingSyncIG(normalizedIG);
        setShowSyncOfferDialog(true);
        setIsLoading(false);
        setLoadingMessage('');
        return;
      }
      
      if (!checkResult.canRegister) {
        toast({ title: 'Limite atingido', description: checkResult.error || 'Você não pode cadastrar mais perfis', variant: 'destructive' });
        setIsLoading(false);
        setLoadingMessage('');
        return;
      }

      // Show confirmation dialog BEFORE registering
      setIsLoading(false);
      setLoadingMessage('');
      setPendingRegisterIG(normalizedIG);
      setShowPreRegisterDialog(true);

    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível verificar disponibilidade', variant: 'destructive' });
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // Called when user confirms they want to register the profile
  const handleConfirmPreRegister = async () => {
    if (!pendingRegisterIG || !user) return;

    setShowPreRegisterDialog(false);
    setShowWarningDialog(true);
  };

  const handleFinalConfirmation = async () => {
    if (!pendingRegisterIG || !user) return;

    setShowWarningDialog(false);
    setIsLoading(true);
    setLoadingMessage('Cadastrando perfil...');

    try {
      // Save email
      updateUserEmail(email);

      // Register in SquareCloud
      const addResult = await addIGToSquare(user.username, pendingRegisterIG);
      
      if (!addResult.success) {
        toast({ title: 'Erro ao cadastrar', description: addResult.error || 'Não foi possível cadastrar o perfil', variant: 'destructive' });
        setIsLoading(false);
        setLoadingMessage('');
        setPendingRegisterIG('');
        return;
      }

      // Create placeholder profile - analysis will come from screenshot
      const placeholderProfile = createPlaceholderProfile(pendingRegisterIG);
      const placeholderAnalysis = createPlaceholderAnalysis();

      // Register locally
      await addRegisteredIG(pendingRegisterIG, email, false);
      setRegisteredIGs(prev => [...prev, normalizeInstagramUsername(pendingRegisterIG)]);

      // Save email and print to SquareCloud
      try {
        const printBlob = await generateSimplePrint(pendingRegisterIG);
        if (printBlob) {
          await saveEmailAndPrint(email, user.username, pendingRegisterIG, printBlob);
        }
      } catch (e) {
        console.error('Error saving print:', e);
      }

      toast({
        title: 'Perfil cadastrado! 📸',
        description: `@${pendingRegisterIG} foi vinculado. Agora envie um print do perfil para análise completa.`
      });

      // Proceed with the registered profile
      onProfileRegistered(placeholderProfile, placeholderAnalysis);
      setPendingRegisterIG('');
      
    } catch (error) {
      toast({ title: 'Erro ao cadastrar', description: 'Tente novamente', variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };



  const handleSyncAll = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setLoadingMessage('Sincronizando todas as suas contas...');
    
    try {
      const squareResult = await verifyRegisteredIGs(user.username);
      if (squareResult.success && squareResult.instagrams && squareResult.instagrams.length > 0) {
        onSyncComplete(squareResult.instagrams);
        toast({
          title: 'Sincronização completa',
          description: `${squareResult.instagrams.length} contas encontradas e vinculadas.`
        });
      } else {
        toast({
          title: 'Nenhuma conta encontrada',
          description: 'Não foram encontradas contas vinculadas ao seu usuário no servidor.'
        });
      }
    } catch (error) {
      console.error('[ProfileRegistration] Sync all error:', error);
      toast({ title: 'Erro na sincronização', variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const generateSimplePrint = async (username: string): Promise<Blob | null> => {
    try {
      const printDiv = document.createElement('div');
      printDiv.style.cssText = `position:fixed;left:-9999px;width:600px;padding:24px;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:white;font-family:Inter,Arial,sans-serif;border-radius:12px;`;
      printDiv.innerHTML = `
        <div style="text-align:center;margin-bottom:20px;">
          <h2 style="margin:12px 0 4px;font-size:20px;">@${username}</h2>
          <p style="color:#888;font-size:14px;">Cadastrado em ${new Date().toLocaleDateString('pt-BR')}</p>
          <p style="color:#666;font-size:12px;margin-top:8px;">Aguardando print do perfil para análise completa</p>
        </div>
        <div style="text-align:center;padding-top:12px;border-top:1px solid rgba(255,255,255,0.1);">
          <div style="font-size:11px;color:#666;">MRO Inteligente • ${new Date().toLocaleDateString('pt-BR')}</div>
        </div>
      `;
      document.body.appendChild(printDiv);
      await new Promise(resolve => setTimeout(resolve, 300));
      const canvas = await html2canvas(printDiv, { backgroundColor: '#1a1a2e', scale: 2 });
      document.body.removeChild(printDiv);
      return new Promise((resolve) => { canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9); });
    } catch (error) {
      console.error('Error generating print:', error);
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-4 relative">
      {/* Loading Overlay */}
      {isLoading && loadingMessage && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-lg p-6 shadow-lg flex flex-col items-center gap-4 max-w-sm mx-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-lg font-medium">{loadingMessage}</p>
              <p className="text-sm text-muted-foreground mt-1">Aguarde...</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Olá, {user?.username}!</CardTitle>
                <CardDescription>
                  Cadastre ou sincronize seus perfis do Instagram
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-xs px-4 py-2 h-9 rounded-full whitespace-nowrap shrink-0 gap-2"
                    >
                      <Wrench className="w-4 h-4 shrink-0" />
                      MENU PRINCIPAL
                      <ChevronDown className="w-4 h-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-[#0d0d16] border-white/10 p-2 rounded-xl z-[100]">
                    <DropdownMenuItem 
                      onClick={() => {
                        localStorage.removeItem('mro_force_dashboard');
                        localStorage.removeItem('mro_force_registration');
                        window.location.reload();
                      }}
                      className="rounded-lg focus:bg-white/5 cursor-pointer py-2.5 gap-3"
                    >
                      <Rocket className="w-4 h-4 text-primary" />
                      <span className="font-bold text-sm">INÍCIO</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate('/mro-ferramenta')}
                      className="rounded-lg focus:bg-white/5 cursor-pointer py-2.5 gap-3"
                    >
                      <Wrench className="w-4 h-4 text-yellow-500" />
                      <span className="font-bold text-sm">INSTALAR E UTILIZAR</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate('/meu-negocio')}
                      className="rounded-lg focus:bg-white/5 cursor-pointer py-2.5 gap-3"
                    >
                      <Briefcase className="w-4 h-4 text-blue-400" />
                      <span className="font-bold text-sm">MEU NEGÓCIO</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        localStorage.setItem('mro_force_registration', 'true');
                        window.location.reload();
                      }}
                      className="rounded-lg focus:bg-white/5 cursor-pointer py-2.5 gap-3"
                    >
                      <Instagram className="w-4 h-4 text-pink-500" />
                      <span className="font-bold text-sm">CADASTRAR INSTAGRAM</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate('/licenciado')}
                      className="rounded-lg focus:bg-white/5 cursor-pointer py-2.5 gap-3"
                    >
                      <Briefcase className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-sm">LICENCIADO</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        // This uses a custom event to trigger the renda extra popup from Index.tsx if needed, 
                        // or we can just navigate to a route that handles it. 
                        // Since we are in ProfileRegistration, we'll navigate to home and try to trigger it.
                        navigate('/renda-extra');
                      }}
                      className="rounded-lg focus:bg-white/5 cursor-pointer py-2.5 gap-3"
                    >
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-sm">RENDA EXTRA</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <VideoTutorialButton youtubeUrl="https://youtu.be/CPI6xSH4TjU" title="Tutorial" variant="default" size="sm" />
                <TutorialButton
                  onStartInteractive={() => tutorial.startTutorial(profileRegistrationTutorial)}
                  onShowList={() => tutorial.startListView(profileRegistrationTutorial)}
                  variant="outline"
                  size="sm"
                />
                {registeredIGs.length > 0 && (
                  <span className="text-sm text-muted-foreground">{registeredIGs.length} perfil(is)</span>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSyncAll}
                  disabled={isLoading}
                  className="text-primary border-primary/20 hover:bg-primary/10"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  Sincronizar Tudo
                </Button>
                {onLogout && (
                  <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground hover:text-destructive">
                    <LogOut className="w-4 h-4 mr-1" />
                    Sair
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Email input */}
        <Card className={`glass-card ${user?.isEmailLocked ? 'border-primary/20' : 'border-amber-500/20'}`}>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Seu e-mail {user?.isEmailLocked ? '(salvo)' : '(obrigatório)'}
                {user?.isEmailLocked && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Vinculado</span>
                )}
                {user?.isEmailLocked && !isEditingEmail && (
                  <button
                    type="button"
                    onClick={() => {
                      const ok = window.confirm('Deseja alterar o e-mail vinculado à sua conta? Certifique-se de digitar o correto — ele ficará vinculado novamente.');
                      if (!ok) return;
                      setEditEmailValue(email);
                      setIsEditingEmail(true);
                    }}
                    className="ml-auto inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/40 text-amber-400 hover:bg-amber-500/20 transition-colors"
                    title="Alterar e-mail"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Alterar
                  </button>
                )}
              </Label>

              {isEditingEmail ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={editEmailValue}
                    onChange={(e) => setEditEmailValue(e.target.value)}
                    className="bg-background/50 border-amber-500/40"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingEmail}
                      onClick={async () => {
                        const newEmail = editEmailValue.trim();
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(newEmail)) {
                          toast({ title: 'E-mail inválido', description: 'Digite um e-mail válido', variant: 'destructive' });
                          return;
                        }
                        setSavingEmail(true);
                        try {
                          await forceUpdateUserEmail(newEmail);
                          setEmail(newEmail);
                          setIsEditingEmail(false);
                          toast({ title: 'E-mail atualizado', description: 'Seu e-mail foi alterado com sucesso' });
                        } catch (err: any) {
                          toast({ title: 'Erro', description: err?.message || 'Falha ao atualizar', variant: 'destructive' });
                        } finally {
                          setSavingEmail(false);
                        }
                      }}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {savingEmail ? 'Salvando...' : 'Salvar'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={savingEmail}
                      onClick={() => { setIsEditingEmail(false); setEditEmailValue(''); }}
                    >
                      <XIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => !user?.isEmailLocked && setEmail(e.target.value)}
                  disabled={user?.isEmailLocked}
                  className={`bg-background/50 ${user?.isEmailLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                  data-tutorial="email-input"
                />
              )}

              <p className="text-xs text-muted-foreground">
                {isEditingEmail
                  ? 'Digite o novo e-mail e clique em Salvar. Ele ficará vinculado à sua conta.'
                  : user?.isEmailLocked
                    ? 'Este e-mail está vinculado à sua conta. Clique em "Alterar" para trocar.'
                    : 'Este e-mail será salvo e vinculado permanentemente à sua conta'
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Register New Profile - Highlighted */}
        <Card className="glass-card border-2 border-amber-500/60 bg-amber-500/5 shadow-lg shadow-amber-500/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-amber-400">
              <UserPlus className="w-5 h-5" />
              Cadastrar Instagram
            </CardTitle>
            <CardDescription>
              Cadastre um perfil para conseguir utilizar a ferramenta MRO. A ferramenta só vai funcionar em um perfil cadastrado no nosso banco de dados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-2">
                <Instagram className="w-4 h-4" />
                Instagram
              </Label>
              <Input
                id="instagram"
                type="text"
                placeholder="@usuario ou link do perfil"
                value={instagramInput}
                onChange={(e) => setInstagramInput(e.target.value)}
                disabled={isLoading}
                className="bg-background/50"
                data-tutorial="instagram-input"
              />
            </div>
            <Button 
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold" 
              onClick={handleSearchProfile}
              disabled={isLoading}
              data-tutorial="buscar-button"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Cadastrar Instagram
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              📸 Após cadastrar, envie um print do perfil para análise completa com I.A.
            </p>
          </CardContent>
        </Card>


        {/* Registered IGs List - Clickable cards */}
        {registeredIGs.length > 0 && (
          <Card className="glass-card" data-tutorial="perfis-list">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Instagram className="w-5 h-5" />
                Suas Contas ({registeredIGs.length})
              </CardTitle>
              <CardDescription>Clique em uma conta para acessar a área de membros</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {registeredIGs.map((ig) => (
                  <button
                    key={ig}
                    type="button"
                    onClick={() => {
                      const storageSession = getStorageSession();
                      const profileSession = storageSession.profiles.find(
                        (p: any) => p.profile.username.toLowerCase() === ig.toLowerCase()
                      );
                      if (profileSession) {
                        setActiveProfileInStorage(profileSession.id);
                      }
                      if (onEnterMemberArea) onEnterMemberArea();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-primary/20 border border-border/50 hover:border-primary/50 transition-all cursor-pointer group text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center flex-shrink-0">
                      <Instagram className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">@{ig}</p>
                      <p className="text-xs text-muted-foreground">Clique para acessar</p>
                    </div>
                    <LayoutDashboard className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Warning / Confirmation Dialog */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="w-5 h-5" />
              Atenção!
            </DialogTitle>
            <DialogDescription className="text-base">
              Após cadastrar, você <strong>não poderá remover</strong> este perfil. 
              Ele ficará permanentemente vinculado à sua conta.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center gap-4 p-4 bg-secondary/20 rounded-lg">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-primary">
              <Instagram className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">@{pendingRegisterIG}</p>
              <p className="text-sm text-muted-foreground">Será vinculado permanentemente</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="confirm-email">Confirme seu e-mail</Label>
              <Input id="confirm-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-background/50" />
            </div>
            <p className="text-xs text-muted-foreground">
              📸 Após o cadastro, envie um print do perfil na aba "Perfil" para que a I.A. faça a análise completa.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowWarningDialog(false); setPendingRegisterIG(''); }}>
              Cancelar
            </Button>
            <Button onClick={handleFinalConfirmation} disabled={isLoading} className="bg-primary">
              {isLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cadastrando...</>) : 'Confirmar Cadastro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Offer Dialog */}
      <Dialog open={showSyncOfferDialog} onOpenChange={setShowSyncOfferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Perfil já vinculado
            </DialogTitle>
            <DialogDescription className="text-base">
              Este perfil já está vinculado à sua conta. Deseja sincronizar agora?
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 bg-secondary/20 rounded-lg flex items-center gap-3">
            <Instagram className="w-8 h-8 text-primary" />
            <div>
              <p className="font-medium">@{pendingSyncIG}</p>
              <p className="text-sm text-muted-foreground">Será adicionado ao seu painel</p>
            </div>
          </div>

          {!user?.email && (
            <div className="space-y-2">
              <Label htmlFor="sync-email-dialog">Seu e-mail</Label>
              <Input id="sync-email-dialog" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-background/50" />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowSyncOfferDialog(false); setPendingSyncIG(''); }}>Não</Button>
            <Button onClick={handleSyncSingleProfile} disabled={isLoading}>
              {isLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sincronizando...</>) : 'Sim'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>




      {/* Pre-Register Confirmation Dialog */}
      <Dialog open={showPreRegisterDialog} onOpenChange={setShowPreRegisterDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Instagram className="w-5 h-5" />
              Cadastrar este perfil?
            </DialogTitle>
            <DialogDescription>
              Deseja vincular @{pendingRegisterIG} à sua conta MRO?
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center gap-4 p-4 bg-secondary/20 rounded-lg">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-primary">
              <Instagram className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">@{pendingRegisterIG}</p>
              <p className="text-sm text-muted-foreground">Perfil disponível para cadastro</p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-xs text-amber-200">
              ⚠️ Após confirmar, o perfil ficará <strong>permanentemente vinculado</strong> à sua conta.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowPreRegisterDialog(false); setPendingRegisterIG(''); }}>Ainda não</Button>
            <Button onClick={handleConfirmPreRegister}>Sim, cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tutorial Overlay */}
      <TutorialOverlay
        isActive={tutorial.isActive}
        currentStep={tutorial.getCurrentStepData()}
        currentStepNumber={tutorial.getCurrentStepNumber()}
        totalSteps={tutorial.getTotalSteps()}
        onNext={tutorial.nextStep}
        onPrev={tutorial.prevStep}
        onStop={tutorial.stopTutorial}
      />

      <TutorialList
        isOpen={tutorial.showList}
        sections={tutorial.tutorialData}
        onClose={() => tutorial.setShowList(false)}
        onStartInteractive={() => tutorial.startTutorial(profileRegistrationTutorial)}
        title="Como Cadastrar Perfis"
      />
    </div>
  );
};

// Helper functions to create placeholder data
function createPlaceholderProfile(username: string): InstagramProfile {
  return {
    username,
    fullName: '',
    bio: '',
    followers: 0,
    following: 0,
    posts: 0,
    profilePicUrl: '',
    isBusinessAccount: false,
    category: '',
    externalUrl: '',
    recentPosts: [],
    engagement: 0,
    avgLikes: 0,
    avgComments: 0,
    needsScreenshotAnalysis: true,
    dataSource: 'placeholder',
  };
}

function createPlaceholderAnalysis(): ProfileAnalysis {
  return {
    strengths: ['📸 Perfil cadastrado - envie um print para análise completa'],
    weaknesses: ['⏳ Aguardando print do perfil para análise'],
    opportunities: ['🎯 Envie um print do perfil para desbloquear análise, estratégias e crescimento'],
    niche: 'Aguardando análise',
    audienceType: 'Aguardando análise',
    contentScore: 0,
    engagementScore: 0,
    profileScore: 0,
    recommendations: ['Envie um print do perfil na aba "Perfil" para análise completa com I.A.']
  };
}
