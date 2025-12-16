import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Crown, Instagram, Search, LogOut, Loader2, Users, Heart, 
  MessageSquare, Target, TrendingUp, FileText, Sparkles, 
  CreditCard, Calendar, CheckCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { trackPageView, trackInitiateCheckout } from '@/lib/facebookTracking';
import logoMro from '@/assets/logo-mro.png';

const PROMO33_STORAGE_KEY = 'promo33_user_session';
const PAYMENT_LINK = 'https://checkout.infinitepay.io/paguemro?items=[{"name":"MRO+PROMO33+MENSAL","price":3300,"quantity":1}]';

interface Promo33User {
  id: string;
  email: string;
  name: string;
  phone: string;
  instagram_username: string | null;
  instagram_data: any;
  strategies_generated: any[];
  subscription_status: string;
  subscription_start: string | null;
  subscription_end: string | null;
}

export default function Promo33Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Promo33User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [instagramInput, setInstagramInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

  useEffect(() => {
    trackPageView('Promo33 Dashboard');
    loadUser();
  }, []);

  const loadUser = async () => {
    const session = localStorage.getItem(PROMO33_STORAGE_KEY);
    if (!session) {
      navigate('/promo33');
      return;
    }

    const storedUser = JSON.parse(session);
    
    // Refresh user data from server
    try {
      const { data, error } = await supabase.functions.invoke('promo33-auth', {
        body: { 
          action: 'get_user',
          email: storedUser.email
        }
      });

      if (data?.success && data.user) {
        setUser(data.user);
        localStorage.setItem(PROMO33_STORAGE_KEY, JSON.stringify(data.user));
      } else {
        setUser(storedUser);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setUser(storedUser);
    }
    
    setIsLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(PROMO33_STORAGE_KEY);
    navigate('/promo33');
  };

  const handlePayment = () => {
    trackInitiateCheckout('Promo33 Monthly', 33);
    
    // Store user email for payment verification
    const redirectUrl = `${window.location.origin}/promo33/obrigado?email=${encodeURIComponent(user?.email || '')}`;
    const fullPaymentLink = `${PAYMENT_LINK}&redirect_url=${encodeURIComponent(redirectUrl)}`;
    
    window.open(fullPaymentLink, '_blank');
  };

  const searchInstagram = async () => {
    if (!instagramInput.trim()) {
      toast.error('Digite o @ do Instagram');
      return;
    }

    // Clean username
    let username = instagramInput.trim().toLowerCase();
    if (username.startsWith('@')) username = username.slice(1);
    if (username.includes('instagram.com/')) {
      const match = username.match(/instagram\.com\/([^/?]+)/);
      if (match) username = match[1];
    }

    setIsSearching(true);

    try {
      // Fetch from Bright Data API
      const { data, error } = await supabase.functions.invoke('sync-instagram-profile', {
        body: { username }
      });

      if (error) throw error;

      if (data?.success && data.profile) {
        // Update user with Instagram data
        const { data: updateData, error: updateError } = await supabase.functions.invoke('promo33-auth', {
          body: {
            action: 'update_instagram',
            email: user?.email,
            instagram_username: username,
            instagram_data: data.profile
          }
        });

        if (updateError) throw updateError;

        if (updateData?.success) {
          setUser(updateData.user);
          localStorage.setItem(PROMO33_STORAGE_KEY, JSON.stringify(updateData.user));
          toast.success('Perfil do Instagram adicionado!');
        }
      } else {
        toast.error('Não foi possível encontrar o perfil. Verifique o @ e tente novamente.');
      }
    } catch (error: any) {
      console.error('Instagram search error:', error);
      toast.error('Erro ao buscar perfil. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  };

  const generateStrategy = async (type: string) => {
    if (!user?.instagram_data || !user?.instagram_username) {
      toast.error('Adicione seu Instagram primeiro');
      return;
    }

    setIsGenerating(true);
    setSelectedStrategy(type);

    try {
      const { data, error } = await supabase.functions.invoke('promo33-generate-strategy', {
        body: {
          type,
          email: user.email,
          instagram_username: user.instagram_username,
          instagram_data: user.instagram_data
        }
      });

      if (error) throw error;

      if (data?.success) {
        setUser(data.user);
        localStorage.setItem(PROMO33_STORAGE_KEY, JSON.stringify(data.user));
        toast.success('Estratégia gerada com sucesso!');
      } else {
        toast.error(data?.message || 'Erro ao gerar estratégia');
      }
    } catch (error: any) {
      console.error('Strategy generation error:', error);
      toast.error('Erro ao gerar estratégia. Tente novamente.');
    } finally {
      setIsGenerating(false);
      setSelectedStrategy(null);
    }
  };

  const isPremium = user?.subscription_status === 'active';
  const daysRemaining = user?.subscription_end 
    ? Math.max(0, Math.ceil((new Date(user.subscription_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="py-4 px-4 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <img src={logoMro} alt="MRO" className="h-10" />
          
          <div className="flex items-center gap-4">
            {isPremium && (
              <Badge className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
                <Crown className="w-3 h-3 mr-1" />
                Premium - {daysRemaining} dias
              </Badge>
            )}
            
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-400 hover:text-white">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Olá, {user?.name?.split(' ')[0] || 'Usuário'}! 👋
          </h1>
          <p className="text-gray-400">
            {isPremium ? 'Seu acesso premium está ativo' : 'Ative seu premium para começar'}
          </p>
        </div>

        {/* Payment Section (if not premium) */}
        {!isPremium && (
          <Card className="bg-gradient-to-r from-green-500/20 to-emerald-600/20 border-green-500/30 mb-8">
            <CardContent className="p-6 md:p-8 text-center">
              <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Ative seu Premium</h2>
              <p className="text-gray-300 mb-6">
                Desbloqueie todas as funcionalidades por apenas <strong className="text-green-400">R$33/mês</strong>
              </p>
              
              <Button 
                onClick={handlePayment}
                size="lg"
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-6 text-lg"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                PAGAR AGORA - R$33
              </Button>
              
              <p className="text-gray-500 text-sm mt-4">
                Pagamento seguro via InfiniPay
              </p>
            </CardContent>
          </Card>
        )}

        {/* Premium Content */}
        {isPremium && (
          <>
            {/* Add Instagram Section */}
            {!user?.instagram_username && (
              <Card className="bg-white/5 border-white/10 mb-8">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Instagram className="w-5 h-5 text-pink-500" />
                    Adicione seu Instagram
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Compartilhe o link ou @ do seu perfil para começarmos a análise
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Input
                      placeholder="@seuperfil ou link do Instagram"
                      value={instagramInput}
                      onChange={(e) => setInstagramInput(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <Button 
                      onClick={searchInstagram}
                      disabled={isSearching}
                      className="bg-pink-500 hover:bg-pink-600"
                    >
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instagram Profile Card */}
            {user?.instagram_username && user?.instagram_data && (
              <Card className="bg-white/5 border-white/10 mb-8">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {user.instagram_data.profilePicture && (
                      <img 
                        src={user.instagram_data.profilePicture} 
                        alt={user.instagram_username}
                        className="w-20 h-20 rounded-full object-cover border-2 border-pink-500"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        @{user.instagram_username}
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </h3>
                      {user.instagram_data.fullName && (
                        <p className="text-gray-400">{user.instagram_data.fullName}</p>
                      )}
                      
                      <div className="flex gap-6 mt-3">
                        <div className="text-center">
                          <p className="text-xl font-bold text-white">
                            {user.instagram_data.followers?.toLocaleString() || '0'}
                          </p>
                          <p className="text-xs text-gray-500">Seguidores</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-bold text-white">
                            {user.instagram_data.following?.toLocaleString() || '0'}
                          </p>
                          <p className="text-xs text-gray-500">Seguindo</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-bold text-white">
                            {user.instagram_data.posts?.length || '0'}
                          </p>
                          <p className="text-xs text-gray-500">Posts</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {user.instagram_data.bio && (
                    <p className="text-gray-300 mt-4 text-sm bg-white/5 p-3 rounded-lg">
                      {user.instagram_data.bio}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Strategy Generation */}
            {user?.instagram_username && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  Gerar Estratégias
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { type: 'bio', icon: FileText, title: 'Estratégia de Bio', desc: 'Otimize sua bio para converter' },
                    { type: 'growth', icon: TrendingUp, title: 'Crescimento', desc: 'Plano para crescer organicamente' },
                    { type: 'sales', icon: Target, title: 'Script de Vendas', desc: 'Scripts para vender no direct' },
                    { type: 'content', icon: MessageSquare, title: 'Criativos', desc: 'Ideias de conteúdo que engaja' },
                  ].map((strategy) => (
                    <Card 
                      key={strategy.type}
                      className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                      onClick={() => !isGenerating && generateStrategy(strategy.type)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-3">
                          {isGenerating && selectedStrategy === strategy.type ? (
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          ) : (
                            <strategy.icon className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <h3 className="text-white font-semibold mb-1">{strategy.title}</h3>
                        <p className="text-gray-500 text-xs">{strategy.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Generated Strategies */}
            {user?.strategies_generated && user.strategies_generated.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Suas Estratégias
                </h2>
                
                <Tabs defaultValue={user.strategies_generated[0]?.type} className="w-full">
                  <TabsList className="bg-white/5 border-white/10 mb-4 flex-wrap h-auto gap-1">
                    {user.strategies_generated.map((strategy: any, index: number) => (
                      <TabsTrigger 
                        key={index} 
                        value={strategy.type}
                        className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
                      >
                        {strategy.type === 'bio' && 'Bio'}
                        {strategy.type === 'growth' && 'Crescimento'}
                        {strategy.type === 'sales' && 'Vendas'}
                        {strategy.type === 'content' && 'Criativos'}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {user.strategies_generated.map((strategy: any, index: number) => (
                    <TabsContent key={index} value={strategy.type}>
                      <Card className="bg-white/5 border-white/10">
                        <CardContent className="p-6">
                          <div className="prose prose-invert max-w-none">
                            <pre className="whitespace-pre-wrap text-gray-300 text-sm font-sans bg-white/5 p-4 rounded-lg">
                              {strategy.content}
                            </pre>
                          </div>
                          <p className="text-gray-500 text-xs mt-4">
                            Gerado em: {new Date(strategy.generated_at).toLocaleDateString('pt-BR')}
                          </p>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}
          </>
        )}

        {/* Non-premium message */}
        {!isPremium && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Acesso Bloqueado</h3>
              <p className="text-gray-400">
                Ative seu premium para acessar as estratégias personalizadas de IA
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
