import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Smartphone, Laptop, Monitor, Zap, TrendingUp, Target, Users, ArrowRight, Star, Shield, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { trackPageView, trackLead } from '@/lib/facebookTracking';
import logoMro from '@/assets/logo-mro.png';

const PROMO33_STORAGE_KEY = 'promo33_user_session';

export default function Promo33() {
  const navigate = useNavigate();
  const [showRegister, setShowRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });

  useEffect(() => {
    trackPageView('Promo33 Sales');
    
    // Check if user is already logged in
    const session = localStorage.getItem(PROMO33_STORAGE_KEY);
    if (session) {
      const user = JSON.parse(session);
      if (user.subscription_status === 'active') {
        navigate('/promo33/dashboard');
      }
    }
  }, [navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('promo33-auth', {
        body: { 
          action: 'register',
          ...formData
        }
      });

      if (error) throw error;

      if (data.success) {
        localStorage.setItem(PROMO33_STORAGE_KEY, JSON.stringify(data.user));
        trackLead('Promo33 Registration');
        toast.success('Cadastro realizado! Redirecionando para pagamento...');
        navigate('/promo33/dashboard');
      } else {
        toast.error(data.message || 'Erro ao cadastrar');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error('Erro ao cadastrar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Preencha email e senha');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('promo33-auth', {
        body: { 
          action: 'login',
          email: formData.email,
          password: formData.password
        }
      });

      if (error) throw error;

      if (data.success) {
        localStorage.setItem(PROMO33_STORAGE_KEY, JSON.stringify(data.user));
        toast.success('Login realizado!');
        navigate('/promo33/dashboard');
      } else {
        toast.error(data.message || 'Email ou senha incorretos');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="py-4 px-4 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex justify-center">
          <img src={logoMro} alt="MRO" className="h-12 md:h-16" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full mb-6 text-sm font-medium">
            <Zap className="w-4 h-4" />
            Oferta Especial por Tempo Limitado
          </div>
          
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
              Venda Mais
            </span>
            <br />
            Tenha Mais Seguidores e Resultados
          </h1>
          
          <p className="text-lg md:text-xl text-gray-300 mb-4">
            Por apenas
          </p>
          
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="text-gray-500 line-through text-2xl">R$197</span>
            <span className="text-5xl md:text-7xl font-bold text-green-400">R$33</span>
            <span className="text-green-400 text-xl">/mês</span>
          </div>

          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Receba a <strong className="text-white">estratégia infalível</strong> para o seu perfil no Instagram. 
            Uma <strong className="text-white">Inteligência Artificial</strong> desenvolvida para o seu crescimento no automático.
          </p>

          <Button 
            onClick={() => setShowRegister(true)}
            size="lg"
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-lg md:text-xl px-8 md:px-12 py-6 md:py-8 rounded-full shadow-2xl shadow-green-500/30 transform hover:scale-105 transition-all"
          >
            CADASTRAR AGORA MESMO
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>

          {/* Device Icons */}
          <div className="flex items-center justify-center gap-6 mt-8 text-gray-400">
            <div className="flex flex-col items-center gap-1">
              <Smartphone className="w-6 h-6" />
              <span className="text-xs">Celular</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Laptop className="w-6 h-6" />
              <span className="text-xs">Notebook</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Monitor className="w-6 h-6" />
              <span className="text-xs">Desktop</span>
            </div>
          </div>
          <p className="text-gray-500 text-sm mt-2">Acesse de qualquer dispositivo</p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 md:py-16 px-4 bg-black/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
            O que você vai receber
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Target, title: 'Estratégia de Bio', desc: 'Bio otimizada para converter visitantes em seguidores' },
              { icon: TrendingUp, title: 'Estratégia de Crescimento', desc: 'Plano completo para crescer organicamente' },
              { icon: Users, title: 'Script de Vendas', desc: 'Scripts prontos para vender no direct' },
              { icon: Star, title: 'Ideias de Criativos', desc: 'Conteúdo que engaja e converte' },
            ].map((benefit, index) => (
              <Card key={index} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                  <p className="text-gray-400 text-sm">{benefit.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-12 md:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
            Como Funciona
          </h2>
          
          <div className="space-y-6">
            {[
              { step: '1', title: 'Faça seu cadastro', desc: 'Crie sua conta em menos de 1 minuto' },
              { step: '2', title: 'Realize o pagamento', desc: 'Apenas R$33 por mês - cancele quando quiser' },
              { step: '3', title: 'Adicione seu Instagram', desc: 'Nossa IA vai analisar seu perfil' },
              { step: '4', title: 'Receba suas estratégias', desc: 'Estratégias personalizadas geradas por IA' },
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-4 bg-white/5 rounded-xl p-4 md:p-6">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">{item.step}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantees */}
      <section className="py-12 md:py-16 px-4 bg-black/30">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 flex items-start gap-4">
                <Shield className="w-10 h-10 text-green-400 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Garantia de 7 Dias</h3>
                  <p className="text-gray-400 text-sm">
                    Se não gostar, devolvemos 100% do seu dinheiro. Sem perguntas.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 flex items-start gap-4">
                <Clock className="w-10 h-10 text-green-400 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Acesso Imediato</h3>
                  <p className="text-gray-400 text-sm">
                    Após o pagamento, acesse imediatamente todas as funcionalidades.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
            Comece Agora Mesmo
          </h2>
          <p className="text-gray-300 mb-8">
            Junte-se a centenas de empreendedores que já estão crescendo no Instagram
          </p>
          
          <Button 
            onClick={() => setShowRegister(true)}
            size="lg"
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-lg px-10 py-6 rounded-full shadow-2xl shadow-green-500/30"
          >
            QUERO COMEÇAR POR R$33/MÊS
          </Button>

          <p className="text-gray-500 text-sm mt-4">
            Já tem uma conta?{' '}
            <button 
              onClick={() => setShowRegister(true)}
              className="text-green-400 hover:underline"
            >
              Fazer login
            </button>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center text-gray-500 text-sm">
          <p>MRO - Mais Resultados Online</p>
          <p>Gabriel Fernandes da Silva</p>
          <p>CNPJ: 54.840.738/0001-96</p>
          <p className="mt-4">© {new Date().getFullYear()}. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* Register/Login Modal */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-gray-900 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-center">
                {formData.name === '' ? 'Criar Conta' : 'Acessar Conta'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={formData.name !== '' || !showRegister ? handleRegister : handleLogin} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Nome Completo</label>
                  <Input
                    type="text"
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Email *</label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">WhatsApp</label>
                  <Input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Senha *</label>
                  <Input
                    type="password"
                    placeholder="Sua senha"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                    required
                  />
                </div>

                <Button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-6"
                >
                  {isLoading ? 'Aguarde...' : 'CONTINUAR'}
                </Button>

                <button
                  type="button"
                  onClick={() => setShowRegister(false)}
                  className="w-full text-gray-400 hover:text-white text-sm py-2"
                >
                  Cancelar
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
