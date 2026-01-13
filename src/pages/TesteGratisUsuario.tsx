import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Instagram, 
  LogOut, 
  Download, 
  PlayCircle, 
  Clock, 
  AlertTriangle,
  Lock,
  Users,
  Loader2,
  CheckCircle
} from "lucide-react";

const TesteGratisUsuario = () => {
  const [instagramUsername, setInstagramUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Check for stored session
  useEffect(() => {
    const storedUser = localStorage.getItem('testegratis_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      // Verify if still valid
      checkUserAccess(parsed.instagram_username, true);
    }
  }, []);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from('free_trial_settings')
        .select('*')
        .limit(1)
        .single();
      if (data) setSettings(data);
    };
    loadSettings();
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (!userData?.expires_at) return;
    
    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(userData.expires_at);
      const diff = expires.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining("Expirado");
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [userData]);

  const checkUserAccess = async (username: string, silent = false) => {
    const normalizedIG = username.toLowerCase().replace(/^@/, '').trim();
    
    if (!normalizedIG) {
      if (!silent) toast.error("Digite seu nome de Instagram");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Check in database first
      const { data: registration, error } = await supabase
        .from('free_trial_registrations')
        .select('*')
        .eq('instagram_username', normalizedIG)
        .single();
      
      if (error || !registration) {
        if (!silent) {
          toast.error("Instagram não encontrado", {
            description: "Você ainda não fez o teste grátis. Faça seu cadastro primeiro!"
          });
        }
        localStorage.removeItem('testegratis_user');
        setIsLoading(false);
        return;
      }
      
      // Check if expired
      const now = new Date();
      const expiresAt = new Date(registration.expires_at);
      
      if (now > expiresAt) {
        if (!silent) {
          toast.error("Acesso Expirado! ⏰", {
            description: `Seu teste de 24h expirou em ${expiresAt.toLocaleString('pt-BR')}. Adquira um plano para continuar usando o MRO!`
          });
        }
        localStorage.removeItem('testegratis_user');
        setIsLoading(false);
        return;
      }
      
      // Verify with SquareCloud API that Instagram is registered
      try {
        const response = await fetch('https://dashboardmroinstagramvini-online.squareweb.app/verificar-usuario-instagram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: normalizedIG })
        });
        
        const result = await response.json();
        
        if (!result.success || !result.registered) {
          if (!silent) {
            toast.error("Instagram não está ativo na plataforma", {
              description: "Seu Instagram pode ter sido removido. Entre em contato com o suporte."
            });
          }
          setIsLoading(false);
          return;
        }
      } catch (apiError) {
        console.log("API verification failed, continuing with DB data", apiError);
        // Continue anyway if API is down
      }
      
      // Success - login user
      setUserData(registration);
      setIsLoggedIn(true);
      localStorage.setItem('testegratis_user', JSON.stringify(registration));
      
      if (!silent) {
        toast.success("Bem-vindo(a)! 🎉", {
          description: `Olá ${registration.full_name}! Seu teste está ativo.`
        });
      }
      
    } catch (error) {
      console.error("Error checking access:", error);
      if (!silent) toast.error("Erro ao verificar acesso. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    checkUserAccess(instagramUsername);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserData(null);
    localStorage.removeItem('testegratis_user');
    setInstagramUsername("");
    toast.info("Você saiu da área de teste");
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-purple-500/30">
          <CardHeader className="text-center">
            <div className="mx-auto bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg text-2xl font-bold mb-4">
              MRO
            </div>
            <CardTitle className="text-2xl text-white">Área do Teste Grátis</CardTitle>
            <CardDescription className="text-gray-400">
              Acesse com seu Instagram cadastrado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative">
              <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
              <Input
                type="text"
                placeholder="@seu.instagram"
                value={instagramUsername}
                onChange={(e) => setInstagramUsername(e.target.value)}
                className="pl-10 bg-white/10 border-purple-500/30 text-white placeholder:text-gray-500"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            
            <Button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Acessar Minha Área
                </>
              )}
            </Button>
            
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-2">Ainda não fez o teste?</p>
              <a 
                href="/testegratis" 
                className="text-purple-400 hover:text-purple-300 font-medium"
              >
                Faça seu cadastro grátis →
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Logged in - User Area
  const isExpired = userData?.expires_at && new Date() > new Date(userData.expires_at);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-lg text-xl font-bold">
              MRO
            </div>
            <div>
              <p className="text-white font-medium">{userData?.full_name}</p>
              <p className="text-purple-300 text-sm">@{userData?.instagram_username}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="border-red-500/50 text-red-400 hover:bg-red-500/20"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Timer Card */}
        <Card className={`mb-6 ${isExpired ? 'bg-red-500/20 border-red-500/50' : 'bg-green-500/20 border-green-500/50'}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className={`w-6 h-6 ${isExpired ? 'text-red-400' : 'text-green-400'}`} />
              <div>
                <p className={`font-medium ${isExpired ? 'text-red-400' : 'text-green-400'}`}>
                  {isExpired ? 'Teste Expirado' : 'Tempo Restante'}
                </p>
                <p className={`text-2xl font-bold ${isExpired ? 'text-red-300' : 'text-green-300'}`}>
                  {timeRemaining}
                </p>
              </div>
            </div>
            {isExpired && (
              <a href="/instagram-nova">
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  Adquirir Plano
                </Button>
              </a>
            )}
          </CardContent>
        </Card>

        {isExpired ? (
          <Card className="bg-black/40 border-purple-500/30">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Seu Teste Expirou!</h2>
              <p className="text-gray-400 mb-6">
                Suas 24 horas de teste chegaram ao fim. Para continuar usando o MRO e 
                crescer seu Instagram no automático, adquira um de nossos planos.
              </p>
              <a href="/instagram-nova">
                <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  Ver Planos Disponíveis
                </Button>
              </a>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Access Data */}
            <Card className="mb-6 bg-black/40 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Seus Dados de Acesso
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Usuário</p>
                  <p className="text-white font-mono text-lg font-bold">{userData?.generated_username}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Senha</p>
                  <p className="text-white font-mono text-lg font-bold">{userData?.generated_password}</p>
                </div>
              </CardContent>
            </Card>

            {/* Download Section */}
            <Card className="mb-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Download className="w-6 h-6 text-green-400" />
                  Download do Sistema
                </h3>
                <p className="text-gray-300 mb-4">
                  Baixe o sistema MRO para Windows e comece a usar com suas credenciais acima.
                </p>
                {settings?.download_link ? (
                  <a href={settings.download_link} target="_blank" rel="noopener noreferrer">
                    <Button size="lg" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold">
                      <Download className="w-5 h-5 mr-2" />
                      Baixar MRO para Windows
                    </Button>
                  </a>
                ) : (
                  <Button size="lg" className="w-full bg-gray-500 cursor-not-allowed" disabled>
                    Link de download não disponível
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Videos Section */}
            <Card className="mb-6 bg-black/40 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-purple-400" />
                  Vídeos Tutoriais
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Assista os vídeos abaixo para aprender a instalar e usar o MRO
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings?.installation_video_url && (
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">📥 Como Instalar o MRO</h4>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <iframe
                        src={settings.installation_video_url}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
                
                {settings?.usage_video_url && (
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">🚀 Como Usar o MRO</h4>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <iframe
                        src={settings.usage_video_url}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
                
                {settings?.welcome_video_url && (
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">👋 Boas-vindas</h4>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <iframe
                        src={settings.welcome_video_url}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {!settings?.installation_video_url && !settings?.usage_video_url && !settings?.welcome_video_url && (
                  <div className="text-center py-8 text-gray-500">
                    <PlayCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum vídeo tutorial disponível ainda.</p>
                    <p className="text-sm">O administrador pode adicionar vídeos no painel.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* WhatsApp Group */}
            {settings?.group_link && (
              <Card className="mb-6 bg-gradient-to-r from-[#25D366]/20 to-green-500/20 border-[#25D366]/30">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Users className="w-6 h-6 text-[#25D366]" />
                    Grupo de Suporte
                  </h3>
                  <p className="text-gray-300 mb-4">
                    Entre no nosso grupo do WhatsApp para tirar dúvidas e receber suporte.
                  </p>
                  <a href={settings.group_link} target="_blank" rel="noopener noreferrer">
                    <Button size="lg" className="w-full bg-[#25D366] hover:bg-[#20BA5C] text-white font-bold">
                      <Users className="w-5 h-5 mr-2" />
                      Entrar no Grupo do WhatsApp
                    </Button>
                  </a>
                </CardContent>
              </Card>
            )}

            {/* Renda Extra Section */}
            <Card className="mb-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-white text-center mb-2">
                  💰 Sabia que você pode fazer uma renda extra de mais de{' '}
                  <span className="text-green-400">5 MIL REAIS</span> com essa ferramenta?
                </h3>
                <p className="text-gray-300 text-center mb-4">
                  Sim, além de utilizar para o seu negócio! Assista o vídeo abaixo:
                </p>
                <div className="aspect-video rounded-lg overflow-hidden border border-zinc-700">
                  <iframe
                    src="https://www.youtube.com/embed/WQwnAHNvSMU"
                    title="Renda Extra com MRO"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </CardContent>
            </Card>

            {/* Support Notice */}
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-bold text-white mb-2">
                  💬 Precisa de Ajuda?
                </h3>
                <p className="text-gray-400 text-sm mb-3">
                  Temos suporte <strong className="text-white">Anydesk (acesso remoto)</strong> e{' '}
                  <strong className="text-white">Suporte WhatsApp</strong>!
                </p>
                <p className="text-yellow-400 text-sm font-medium">
                  ⚠️ O suporte funciona apenas no <strong>plano pago</strong>!
                </p>
                <p className="text-gray-500 text-xs mt-3">
                  Para testes grátis, assista os vídeos tutoriais para instalar e utilizar.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default TesteGratisUsuario;
