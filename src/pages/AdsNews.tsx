import { useState } from "react";
import { useNavigate } from "react-router-dom";
import metaLogo from "@/assets/meta-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MessageCircle, 
  Send, 
  Instagram, 
  Facebook, 
  Users, 
  CheckCircle,
  ArrowRight,
  Phone,
  Mail,
  User,
  Lock,
  Loader2,
  LogIn
} from "lucide-react";

const AdsNews = () => {
  const navigate = useNavigate();
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: ""
  });
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });
  // Removed unused paymentLink and checkingPayment states - flow now redirects to dashboard

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.email || !loginData.password) {
      toast({
        title: "Erro",
        description: "Preencha email e senha",
        variant: "destructive"
      });
      return;
    }

    setLoginLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ads-auth', {
        body: { 
          action: 'login', 
          email: loginData.email, 
          password: loginData.password 
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Login realizado!",
          description: "Redirecionando para o dashboard..."
        });
        navigate(`/anuncios/dash?email=${encodeURIComponent(loginData.email)}&password=${encodeURIComponent(loginData.password)}`);
      } else {
        throw new Error(data?.error || "Email ou senha incorretos");
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      toast({
        title: "Erro no login",
        description: error instanceof Error ? error.message : "Email ou senha incorretos",
        variant: "destructive"
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ads-checkout', {
        body: {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          amount: 1, // R$1 for testing (change to 397 for production)
          type: 'initial'
        }
      });

      if (error) throw error;

      if (data.success && data.paymentLink) {
        toast({
          title: "Cadastro realizado!",
          description: "Redirecionando para o dashboard..."
        });
        
        // Redirect to dashboard with payment info - user will see payment overlay there
        localStorage.setItem('ads_pending_payment', JSON.stringify({
          email: formData.email,
          password: formData.password,
          paymentLink: data.paymentLink,
          nsuOrder: data.nsuOrder
        }));
        
        navigate(`/anuncios/dash?email=${encodeURIComponent(formData.email)}&password=${encodeURIComponent(formData.password)}&pending=true`);
      } else {
        throw new Error(data.error || "Erro ao criar checkout");
      }
    } catch (error: unknown) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao processar cadastro",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Payment check logic moved to AdsNewsDash - registration now redirects directly there

  const benefits = [
    "Leads no seu WhatsApp o dia todo",
    "Anúncios para WhatsApp, Telegram e Sites",
    "Todos os posicionamentos: Facebook, Instagram, WhatsApp Status",
    "Criamos os anúncios e criativos para você",
    "Sem dor de cabeça - apenas passe as informações"
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <img 
            src="/ads-news-full.png" 
            alt="Ads News" 
            className="h-10 md:h-14"
          />
          <Button 
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
            onClick={() => setShowLogin(true)}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Entrar
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            Vendendo <span className="text-orange-400">3x mais</span> com nossas<br />
            Campanhas de Tráfego Pago com <span className="text-yellow-300">IA Automático!</span>
          </h1>
          
          {/* AI Automation Info */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 mb-8 max-w-4xl mx-auto border border-white/20">
            <p className="text-xl md:text-2xl font-semibold mb-4 text-yellow-300">
              🤖 Campanha de tráfego pago com IA totalmente automática
            </p>
            <p className="text-lg text-blue-100 mb-6">
              Basta apenas <span className="font-bold text-white">UMA configuração</span> e deixe a IA trabalhar para você!
            </p>
            
            {/* AI Question */}
            <div className="bg-gradient-to-r from-purple-600/50 to-blue-600/50 rounded-xl p-5 mb-6 border border-purple-400/30">
              <p className="text-lg md:text-xl font-semibold text-white mb-2">
                💡 Já imaginou sua campanha de anúncios <span className="text-yellow-300">assertiva</span> criada pelas maiores IAs do mercado?
              </p>
            </div>
            
            {/* AI Logos */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              <div className="bg-white rounded-xl p-3 shadow-lg flex flex-col items-center">
                <img src="/ai-logos/chatgpt.png" alt="ChatGPT" className="h-12 w-12 md:h-16 md:w-16 object-contain" />
                <span className="text-xs font-bold text-gray-700 mt-1">ChatGPT</span>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-lg flex flex-col items-center">
                <img src="/ai-logos/deepseek.png" alt="DeepSeek" className="h-12 w-12 md:h-16 md:w-16 object-contain" />
                <span className="text-xs font-bold text-gray-700 mt-1">DeepSeek</span>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-lg flex flex-col items-center">
                <img src="/ai-logos/nanobanana.png" alt="Nano Banana" className="h-12 w-12 md:h-16 md:w-16 object-contain" />
                <span className="text-xs font-bold text-gray-700 mt-1">Nano Banana</span>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-lg flex flex-col items-center">
                <img src="/ai-logos/gemini.png" alt="Gemini" className="h-12 w-12 md:h-16 md:w-16 object-contain" />
                <span className="text-xs font-bold text-gray-700 mt-1">Gemini</span>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-lg flex flex-col items-center">
                <img src="/ai-logos/mro-api.png" alt="API Oficial MRO" className="h-12 w-12 md:h-16 md:w-16 object-contain" />
                <span className="text-xs font-bold text-gray-700 mt-1">API MRO</span>
              </div>
            </div>
          </div>

          <p className="text-lg md:text-xl mb-8 text-blue-100 max-w-3xl mx-auto">
            Leads no seu WhatsApp <span className="text-orange-400 font-bold">o dia todo</span> por apenas <span className="font-bold text-orange-400">R$397/mês</span>.
          </p>
          <Button 
            size="lg" 
            className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 py-6 rounded-full shadow-lg animate-pulse"
            onClick={() => setShowRegister(true)}
          >
            Quero Começar Agora
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Meta Partner Section */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <img 
            src={metaLogo} 
            alt="Meta Business" 
            className="h-16 md:h-20 mx-auto mb-4"
          />
          <p className="text-xl md:text-2xl font-semibold text-gray-800">
            Parceiro Oficial da Meta Business
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-gray-800">
            O que você recebe
          </h2>
          {/* Primeira linha - 3 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">WhatsApp</h3>
                <p className="text-gray-600">Anúncios diretos para o seu WhatsApp Business ou normal</p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Instagram className="h-8 w-8 text-pink-600" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">Instagram</h3>
                <p className="text-gray-600">Feed, Stories e Reels patrocinados</p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Facebook className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">Facebook</h3>
                <p className="text-gray-600">Feed, Marketplace e Messenger</p>
              </CardContent>
            </Card>
          </div>

          {/* Segunda linha - 2 cards centralizados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">Criativos</h3>
                <p className="text-gray-600">Criamos os anúncios e artes para você</p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">Sem Dor de Cabeça</h3>
                <p className="text-gray-600">Apenas passe as informações e nós fazemos tudo</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 md:p-12 text-white">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
              Tudo incluso no seu plano
            </h2>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-orange-400 flex-shrink-0" />
                  <span className="text-lg">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 bg-gray-50" id="pricing">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-800">
            Comece agora mesmo
          </h2>
          <p className="text-gray-600 mb-8">
            Investimento mensal para gerar leads no seu WhatsApp
          </p>
          
          <Card className="border-2 border-orange-400 shadow-xl max-w-sm mx-auto bg-white">
            <CardContent className="p-8">
              <div className="bg-orange-400 text-white text-sm font-bold px-3 py-1 rounded-full inline-block mb-4">
                MENSAL
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                R$<span className="text-5xl">397</span>
              </div>
              <p className="text-gray-600 font-medium">mensal (30 dias)</p>
            </CardContent>
          </Card>

          <Button 
            size="lg" 
            className="mt-8 bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 py-6 rounded-full shadow-lg"
            onClick={() => setShowRegister(true)}
          >
            Começar Agora por R$397
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Registration Modal */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Cadastre-se</h3>
                <button 
                  onClick={() => setShowRegister(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="flex items-center gap-2 text-gray-900">
                    <User className="h-4 w-4" />
                    Nome completo *
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Seu nome"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="flex items-center gap-2 text-gray-900">
                    <Mail className="h-4 w-4" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="flex items-center gap-2 text-gray-900">
                    <Lock className="h-4 w-4" />
                    Senha *
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Crie uma senha"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2 text-gray-900">
                    <Phone className="h-4 w-4" />
                    Telefone (opcional)
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      Continuar para Pagamento
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Valor para teste: R$1,00 (produção: R$397)
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Acessar Dashboard</h3>
                <button 
                  onClick={() => setShowLogin(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email" className="flex items-center gap-2 text-gray-900">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    value={loginData.email}
                    onChange={handleLoginInputChange}
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="login-password" className="flex items-center gap-2 text-gray-900">
                    <Lock className="h-4 w-4" />
                    Senha
                  </Label>
                  <Input
                    id="login-password"
                    name="password"
                    type="password"
                    value={loginData.password}
                    onChange={handleLoginInputChange}
                    placeholder="Sua senha"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Entrar
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Ainda não tem conta?{' '}
                  <button 
                    type="button"
                    onClick={() => { setShowLogin(false); setShowRegister(true); }}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Cadastre-se aqui
                  </button>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <img 
            src="/ads-news-logo.png" 
            alt="Ads News" 
            className="h-12 mx-auto mb-4"
          />
          <p className="text-gray-400 text-sm">
            Ads News - Anúncios para WhatsApp, Facebook e Instagram
          </p>
          <p className="text-gray-500 text-xs mt-2">
            © 2024 Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AdsNews;
