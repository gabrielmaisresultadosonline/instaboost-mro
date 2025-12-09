import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  Instagram, 
  ArrowRight,
  MessageCircle,
  Crown,
  CheckCircle2,
  Clock,
  Palette,
  BarChart3,
  Search,
  Loader2,
  AlertCircle,
  BookOpen,
  Play,
  LogIn,
  LogOut
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { StrategyDisplay } from "@/components/StrategyDisplay";
import { CreativeGenerator } from "@/components/CreativeGenerator";

interface PaidMemberUser {
  id: string;
  username: string;
  email: string;
  password: string;
  instagram_username?: string;
  subscription_status: 'active' | 'pending' | 'expired';
  subscription_end?: string;
  strategies_generated: number;
  creatives_used: number;
  created_at: string;
}

const PAID_MEMBERS_KEY = 'mro_paid_members';
const CURRENT_MEMBER_KEY = 'mro_current_member';

const getPaidMembers = (): PaidMemberUser[] => {
  const stored = localStorage.getItem(PAID_MEMBERS_KEY);
  return stored ? JSON.parse(stored) : [];
};

const savePaidMembers = (members: PaidMemberUser[]) => {
  localStorage.setItem(PAID_MEMBERS_KEY, JSON.stringify(members));
};

const getCurrentMember = (): PaidMemberUser | null => {
  const stored = localStorage.getItem(CURRENT_MEMBER_KEY);
  return stored ? JSON.parse(stored) : null;
};

const saveCurrentMember = (member: PaidMemberUser | null) => {
  if (member) {
    localStorage.setItem(CURRENT_MEMBER_KEY, JSON.stringify(member));
  } else {
    localStorage.removeItem(CURRENT_MEMBER_KEY);
  }
};

export default function Membro() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<PaidMemberUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [instagramInput, setInstagramInput] = useState('');
  const [isAddingInstagram, setIsAddingInstagram] = useState(false);
  const [strategy, setStrategy] = useState<any>(null);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [showPromo, setShowPromo] = useState(false);

  const success = searchParams.get('success');

  useEffect(() => {
    checkUserStatus();
  }, []);

  useEffect(() => {
    if (user && user.subscription_status === 'active') {
      const createdAt = new Date(user.created_at);
      const now = new Date();
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation >= 24) {
        setShowPromo(true);
      }
    }
  }, [user]);

  const checkUserStatus = () => {
    setIsLoading(true);

    try {
      // Check if coming from successful payment
      if (success === 'true') {
        const pendingUser = localStorage.getItem('mro_pending_user');
        if (pendingUser) {
          const userData = JSON.parse(pendingUser);
          activatePendingUser(userData);
          localStorage.removeItem('mro_pending_user');
          return;
        }
      }

      // Check if user is already logged in
      const currentMember = getCurrentMember();
      if (currentMember) {
        setUser(currentMember);
        
        // Load saved strategy if exists
        const savedStrategy = localStorage.getItem(`mro_strategy_${currentMember.id}`);
        if (savedStrategy) {
          setStrategy(JSON.parse(savedStrategy));
        }
        
        const savedProfile = localStorage.getItem(`mro_profile_${currentMember.id}`);
        if (savedProfile) {
          setProfileData(JSON.parse(savedProfile));
        }
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const activatePendingUser = (userData: any) => {
    // Facebook Pixel - Purchase
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Purchase', {
        value: 33.00,
        currency: 'BRL',
        content_name: 'Plano Mensal I.A MRO'
      });
    }

    const newMember: PaidMemberUser = {
      id: `member_${Date.now()}`,
      username: userData.username,
      email: userData.email,
      password: userData.password,
      instagram_username: userData.instagram || undefined,
      subscription_status: 'active',
      subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      strategies_generated: 0,
      creatives_used: 0,
      created_at: new Date().toISOString()
    };

    const members = getPaidMembers();
    // Check if user already exists
    const existingIndex = members.findIndex(m => m.email === userData.email);
    if (existingIndex >= 0) {
      // Renew subscription
      members[existingIndex] = {
        ...members[existingIndex],
        subscription_status: 'active',
        subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
      savePaidMembers(members);
      setUser(members[existingIndex]);
      saveCurrentMember(members[existingIndex]);
    } else {
      members.push(newMember);
      savePaidMembers(members);
      setUser(newMember);
      saveCurrentMember(newMember);
    }

    toast({
      title: "Pagamento confirmado!",
      description: "Bem-vindo ao I.A MRO. Agora adicione seu Instagram para começar."
    });

    setIsLoading(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginForm.email || !loginForm.password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha email e senha",
        variant: "destructive"
      });
      return;
    }

    setIsLoggingIn(true);

    try {
      const members = getPaidMembers();
      const member = members.find(m => 
        m.email.toLowerCase() === loginForm.email.toLowerCase() && 
        m.password === loginForm.password
      );

      if (!member) {
        toast({
          title: "Credenciais inválidas",
          description: "Email ou senha incorretos",
          variant: "destructive"
        });
        setIsLoggingIn(false);
        return;
      }

      // Check if subscription is still active
      if (member.subscription_end && new Date(member.subscription_end) < new Date()) {
        member.subscription_status = 'expired';
        const updatedMembers = members.map(m => m.id === member.id ? member : m);
        savePaidMembers(updatedMembers);
      }

      setUser(member);
      saveCurrentMember(member);

      // Load saved data
      const savedStrategy = localStorage.getItem(`mro_strategy_${member.id}`);
      if (savedStrategy) {
        setStrategy(JSON.parse(savedStrategy));
      }
      
      const savedProfile = localStorage.getItem(`mro_profile_${member.id}`);
      if (savedProfile) {
        setProfileData(JSON.parse(savedProfile));
      }

      toast({
        title: "Login realizado!",
        description: `Bem-vindo de volta, ${member.username}`
      });

    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Erro ao fazer login",
        description: "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    saveCurrentMember(null);
    setUser(null);
    setStrategy(null);
    setProfileData(null);
    toast({
      title: "Logout realizado",
      description: "Até logo!"
    });
  };

  const updateMember = (updates: Partial<PaidMemberUser>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    saveCurrentMember(updatedUser);
    
    const members = getPaidMembers();
    const updatedMembers = members.map(m => m.id === user.id ? updatedUser : m);
    savePaidMembers(updatedMembers);
  };

  const normalizeInstagram = (input: string): string => {
    let normalized = input.trim().toLowerCase();
    if (normalized.startsWith('@')) {
      normalized = normalized.substring(1);
    }
    if (normalized.includes('instagram.com/')) {
      const match = normalized.match(/instagram\.com\/([^/?]+)/);
      if (match) {
        normalized = match[1];
      }
    }
    return normalized;
  };

  const handleAddInstagram = async () => {
    if (!instagramInput.trim()) {
      toast({
        title: "Instagram obrigatório",
        description: "Digite seu @ do Instagram",
        variant: "destructive"
      });
      return;
    }

    if (!user) return;

    setIsAddingInstagram(true);

    try {
      const normalized = normalizeInstagram(instagramInput);

      // Fetch Instagram profile data
      const { data: profileResponse, error: profileError } = await supabase.functions.invoke('fetch-instagram', {
        body: { username: normalized }
      });

      if (profileError || !profileResponse.success) {
        throw new Error(profileResponse?.error || 'Perfil não encontrado');
      }

      setProfileData(profileResponse.profile);
      localStorage.setItem(`mro_profile_${user.id}`, JSON.stringify(profileResponse.profile));

      updateMember({ instagram_username: normalized });

      toast({
        title: "Instagram adicionado!",
        description: "Agora vamos gerar sua estratégia personalizada"
      });

      // Auto-generate strategy
      await generateStrategy(normalized, profileResponse.profile);

    } catch (error: any) {
      console.error('Error adding Instagram:', error);
      toast({
        title: "Erro ao buscar perfil",
        description: error.message || "Verifique o @ e tente novamente",
        variant: "destructive"
      });
    } finally {
      setIsAddingInstagram(false);
    }
  };

  const generateStrategy = async (instagram: string, profile: any) => {
    if (!user) return;

    setIsGeneratingStrategy(true);

    try {
      // First analyze the profile
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-profile', {
        body: { profile }
      });

      if (analysisError) throw analysisError;

      // Then generate strategy
      const { data: strategyData, error: strategyError } = await supabase.functions.invoke('generate-strategy', {
        body: {
          profile,
          analysis: analysisData.analysis,
          strategyType: 'complete'
        }
      });

      if (strategyError) throw strategyError;

      setStrategy(strategyData.strategy);
      localStorage.setItem(`mro_strategy_${user.id}`, JSON.stringify(strategyData.strategy));

      updateMember({ strategies_generated: (user.strategies_generated || 0) + 1 });

      toast({
        title: "Estratégia gerada!",
        description: "Sua estratégia personalizada de 30 dias está pronta"
      });

    } catch (error: any) {
      console.error('Error generating strategy:', error);
      toast({
        title: "Erro ao gerar estratégia",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  const openWhatsApp = () => {
    window.open('https://wa.me/5551920936540?text=Olá! Sou membro do plano mensal e tenho interesse na Ferramenta MRO com valor promocional.', '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Login form if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <header className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Logo size="lg" />
            <Button 
              variant="outline" 
              onClick={() => navigate('/vendas')}
              className="gap-2"
            >
              Criar Conta
            </Button>
          </div>
        </header>

        <div className="container mx-auto px-4 py-12 flex items-center justify-center">
          <Card className="w-full max-w-md glass-card border-primary/30">
            <CardHeader className="text-center">
              <LogIn className="w-12 h-12 text-primary mx-auto mb-2" />
              <CardTitle className="text-2xl">Área do Membro</CardTitle>
              <CardDescription>
                Entre com seu email e senha para acessar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Senha</label>
                  <Input
                    type="password"
                    placeholder="Sua senha"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      Entrar
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Ainda não tem conta?{' '}
                  <button 
                    onClick={() => navigate('/vendas')}
                    className="text-primary hover:underline font-medium"
                  >
                    Criar agora por R$33/mês
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Check if subscription expired
  if (user.subscription_status === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle>Assinatura Expirada</CardTitle>
            <CardDescription>
              Sua assinatura expirou em {new Date(user.subscription_end!).toLocaleDateString('pt-BR')}.
              Renove para continuar acessando.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Button onClick={() => navigate('/vendas')}>
              Renovar Assinatura
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasInstagram = !!user.instagram_username;
  const canGenerateStrategy = (user.strategies_generated || 0) < 1;
  const creativesRemaining = 6 - (user.creatives_used || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              Membro Ativo
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Olá, {user.username}! 👋
          </h1>
          <p className="text-muted-foreground">
            {hasInstagram 
              ? `Gerenciando @${user.instagram_username}`
              : 'Adicione seu Instagram para começar'
            }
          </p>
        </div>

        {/* Promo Banner */}
        {showPromo && (
          <Card className="glass-card border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-primary/10 mb-8">
            <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 p-6">
              <div className="flex items-center gap-4">
                <Crown className="w-10 h-10 text-yellow-500" />
                <div>
                  <h3 className="font-semibold text-lg">Quer resultados 10x maiores?</h3>
                  <p className="text-muted-foreground">
                    Conheça a Ferramenta MRO - Valor promocional exclusivo para membros!
                  </p>
                </div>
              </div>
              <Button onClick={openWhatsApp} className="gap-2 bg-green-600 hover:bg-green-700">
                <MessageCircle className="w-4 h-4" />
                Falar com Administrador
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add Instagram */}
        {!hasInstagram && (
          <Card className="glass-card border-primary/30 max-w-lg mx-auto mb-8">
            <CardHeader className="text-center">
              <Instagram className="w-12 h-12 text-pink-500 mx-auto mb-2" />
              <CardTitle>Adicione seu Instagram</CardTitle>
              <CardDescription>
                Digite o @ do Instagram que você quer analisar e receber estratégias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="@seuinstagram ou link do perfil"
                  value={instagramInput}
                  onChange={(e) => setInstagramInput(e.target.value)}
                  disabled={isAddingInstagram}
                />
                <Button 
                  onClick={handleAddInstagram}
                  disabled={isAddingInstagram}
                >
                  {isAddingInstagram ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                ⚠️ Após adicionar, não será possível remover ou trocar o perfil
              </p>
            </CardContent>
          </Card>
        )}

        {/* Generating Strategy */}
        {hasInstagram && isGeneratingStrategy && (
          <Card className="glass-card max-w-lg mx-auto mb-8">
            <CardContent className="py-12 text-center">
              <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Gerando sua Estratégia...</h3>
              <p className="text-muted-foreground">
                A I.A MRO está analisando seu perfil e criando uma estratégia personalizada de 30 dias
              </p>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {hasInstagram && !isGeneratingStrategy && (
          <Tabs defaultValue="strategy" className="max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="strategy" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Estratégia
              </TabsTrigger>
              <TabsTrigger value="creatives" className="gap-2">
                <Palette className="w-4 h-4" />
                Criativos ({creativesRemaining})
              </TabsTrigger>
              <TabsTrigger value="tutorial" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Tutorial
              </TabsTrigger>
            </TabsList>

            <TabsContent value="strategy">
              {strategy ? (
                <StrategyDisplay 
                  strategy={strategy} 
                  onGenerateCreative={() => {}}
                  creativesRemaining={creativesRemaining}
                />
              ) : (
                <Card className="glass-card">
                  <CardContent className="py-12 text-center">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Nenhuma estratégia gerada</h3>
                    <p className="text-muted-foreground mb-4">
                      {canGenerateStrategy 
                        ? "Clique no botão abaixo para gerar sua estratégia"
                        : "Você já usou sua estratégia deste mês"
                      }
                    </p>
                    {canGenerateStrategy && profileData && (
                      <Button onClick={() => generateStrategy(user.instagram_username!, profileData)}>
                        Gerar Estratégia
                        <Sparkles className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="creatives">
              {strategy && profileData ? (
                <CreativeGenerator 
                  profile={profileData}
                  strategy={strategy}
                  niche={profileData.businessType || 'geral'}
                  creativesRemaining={creativesRemaining}
                  onCreativeGenerated={(creative, credits) => {
                    updateMember({ creatives_used: (user.creatives_used || 0) + credits });
                  }}
                  onClose={() => {}}
                />
              ) : (
                <Card className="glass-card">
                  <CardContent className="py-12 text-center">
                    <Palette className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Gere sua estratégia primeiro</h3>
                    <p className="text-muted-foreground">
                      Você precisa ter uma estratégia ativa para gerar criativos
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="tutorial">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="w-5 h-5 text-primary" />
                    Como usar o I.A MRO
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex gap-4 p-4 bg-primary/5 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold">Estratégia de 30 Dias</h4>
                        <p className="text-muted-foreground text-sm">
                          Sua estratégia inclui um calendário completo de postagens, hashtags otimizadas e dicas de bio. 
                          Siga o calendário diariamente para melhores resultados.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 p-4 bg-primary/5 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold">Gere Criativos</h4>
                        <p className="text-muted-foreground text-sm">
                          Você tem 6 criativos inclusos. Use-os para posts no feed ou stories. 
                          Cada criativo gerado consome 1 crédito (manual consome 2).
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 p-4 bg-primary/5 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold">Agende suas Postagens</h4>
                        <p className="text-muted-foreground text-sm">
                          Use o Meta Business Suite para agendar seus posts. 
                          Assim você mantém a consistência mesmo nos dias ocupados.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <Crown className="w-8 h-8 text-yellow-500 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-yellow-600">Ferramenta MRO</h4>
                        <p className="text-muted-foreground text-sm">
                          Para resultados ainda maiores, a Ferramenta MRO automatiza 200 interações 
                          orgânicas por dia. Fale com o administrador para liberar acesso com valor promocional.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2 gap-2"
                          onClick={openWhatsApp}
                        >
                          <MessageCircle className="w-4 h-4" />
                          Consultar Valor
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Status Cards */}
        <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-8">
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <BarChart3 className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{user.strategies_generated || 0}/1</p>
              <p className="text-sm text-muted-foreground">Estratégias Geradas</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <Palette className="w-8 h-8 text-pink-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{creativesRemaining}/6</p>
              <p className="text-sm text-muted-foreground">Criativos Disponíveis</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <Clock className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">
                {user.subscription_end 
                  ? new Date(user.subscription_end).toLocaleDateString('pt-BR')
                  : '-'
                }
              </p>
              <p className="text-sm text-muted-foreground">Válido até</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
