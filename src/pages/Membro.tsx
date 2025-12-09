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
  Play
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { PaidUser, getPaidUserSession, savePaidUserSession, PAID_USER_STORAGE_KEY } from "@/types/paidUser";
import { StrategyDisplay } from "@/components/StrategyDisplay";
import { CreativeGenerator } from "@/components/CreativeGenerator";

export default function Membro() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<PaidUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [instagramInput, setInstagramInput] = useState('');
  const [isAddingInstagram, setIsAddingInstagram] = useState(false);
  const [strategy, setStrategy] = useState<any>(null);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [showPromo, setShowPromo] = useState(false);

  const success = searchParams.get('success');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    checkUserStatus();
  }, []);

  useEffect(() => {
    // Show promo after 1 day (check if user created more than 24h ago)
    if (user && user.subscription_status === 'active') {
      const createdAt = new Date(user.created_at);
      const now = new Date();
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation >= 24) {
        setShowPromo(true);
      }
    }
  }, [user]);

  const checkUserStatus = async () => {
    setIsLoading(true);

    try {
      // First check local storage
      const session = getPaidUserSession();
      
      if (session.isAuthenticated && session.user) {
        setUser(session.user);
        
        // If coming from successful payment, verify
        if (success === 'true' && sessionId) {
          await verifyPayment(session.user.email);
        }
      } else {
        // Check if coming from successful payment
        const pendingUser = localStorage.getItem('mro_pending_user');
        if (pendingUser && success === 'true' && sessionId) {
          const userData = JSON.parse(pendingUser);
          await verifyPayment(userData.email);
          localStorage.removeItem('mro_pending_user');
        } else {
          // No user found, redirect to sales page
          navigate('/vendas');
          return;
        }
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPayment = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        body: { email, session_id: sessionId }
      });

      if (error) throw error;

      if (data.subscribed && data.user) {
        // Facebook Pixel - Purchase
        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', 'Purchase', {
            value: 33.00,
            currency: 'BRL',
            content_name: 'Plano Mensal I.A MRO'
          });
        }

        setUser(data.user);
        savePaidUserSession({
          user: data.user,
          isAuthenticated: true
        });

        toast({
          title: "Pagamento confirmado!",
          description: "Bem-vindo ao I.A MRO. Agora adicione seu Instagram para começar."
        });
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast({
        title: "Erro ao verificar pagamento",
        description: "Por favor, entre em contato pelo WhatsApp",
        variant: "destructive"
      });
    }
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

      // Update user with Instagram
      const { data: userData, error: updateError } = await supabase
        .from('paid_users')
        .update({ instagram_username: normalized })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setUser(userData as unknown as PaidUser);
      savePaidUserSession({
        user: userData as unknown as PaidUser,
        isAuthenticated: true
      });

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

      // Update strategies generated count
      await supabase
        .from('paid_users')
        .update({ strategies_generated: (user.strategies_generated || 0) + 1 })
        .eq('id', user.id);

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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle>Acesso não autorizado</CardTitle>
            <CardDescription>
              Você precisa ter uma assinatura ativa para acessar esta área.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/vendas')}>
              Conhecer o Plano
              <ArrowRight className="ml-2 h-4 w-4" />
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
                    const updated = { ...user, creatives_used: (user.creatives_used || 0) + credits };
                    setUser(updated);
                    savePaidUserSession({ user: updated, isAuthenticated: true });
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
