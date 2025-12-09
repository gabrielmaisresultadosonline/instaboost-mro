import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  TrendingUp, 
  Users, 
  Target, 
  Zap, 
  CheckCircle2, 
  Instagram, 
  ArrowRight,
  Shield,
  Clock,
  Palette,
  BarChart3,
  Crown,
  LogIn
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
const benefits = [
  {
    icon: TrendingUp,
    title: "Aumente suas Vendas",
    description: "Estratégias comprovadas para converter seguidores em clientes pagantes"
  },
  {
    icon: Users,
    title: "Mais Leads Qualificados",
    description: "Atraia pessoas realmente interessadas no seu produto ou serviço"
  },
  {
    icon: Target,
    title: "Crescimento Orgânico",
    description: "Sem precisar gastar com anúncios - resultados 100% orgânicos"
  },
  {
    icon: Palette,
    title: "Criativos Profissionais",
    description: "6 criativos gerados por IA para seu feed e stories"
  },
  {
    icon: BarChart3,
    title: "Estratégia de 30 Dias",
    description: "Planejamento completo com calendário de conteúdo"
  },
  {
    icon: Instagram,
    title: "Bio Otimizada",
    description: "Sugestões para tornar seu perfil profissional de verdade"
  }
];

const features = [
  "Análise completa do seu perfil",
  "Estratégia personalizada de 30 dias",
  "6 criativos profissionais inclusos",
  "Calendário de postagens",
  "Otimização de bio do Instagram",
  "Suporte via WhatsApp"
];

export default function Vendas() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<'info' | 'register'>('info');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    instagram: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const canceled = searchParams.get('canceled');

  const handleStartRegistration = () => {
    setStep('register');
    // Facebook Pixel - Initiate Checkout
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'InitiateCheckout');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.email || !formData.password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para continuar",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter no mínimo 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Facebook Pixel - Lead
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Lead', {
          content_name: 'Plano Mensal I.A MRO',
          value: 33.00,
          currency: 'BRL'
        });
      }

      // Store user data locally for pending registration
      const pendingUser = {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        instagram: formData.instagram,
        createdAt: new Date().toISOString(),
        status: 'pending_payment'
      };
      
      localStorage.setItem('mro_pending_user', JSON.stringify(pendingUser));
      
      // Redirect to Stripe payment link (will be configured by admin)
      const stripePaymentLink = localStorage.getItem('mro_stripe_link') || 'https://buy.stripe.com/test_placeholder';
      
      toast({
        title: "Redirecionando para pagamento",
        description: "Complete o pagamento para ativar seu acesso"
      });
      
      window.open(stripePaymentLink, '_blank');
      
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Erro ao processar",
        description: error.message || "Tente novamente em alguns instantes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openInstagram = () => {
    window.open('https://instagram.com/maisresultadosonline', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Logo size="lg" />
          <Button 
            variant="outline" 
            onClick={() => navigate('/membro')}
            className="gap-2"
          >
            <LogIn className="w-4 h-4" />
            Acessar / Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 text-center">
        <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
          <Sparkles className="w-3 h-3 mr-1" />
          Inteligência Artificial para seu Instagram
        </Badge>
        
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary to-yellow-500 bg-clip-text text-transparent">
          Aumente suas Vendas, Leads e Seguidores
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto">
          <span className="text-foreground font-semibold">Sem precisar gastar com anúncios.</span> A I.A MRO cria estratégias 
          personalizadas e criativos profissionais para transformar seu Instagram em uma máquina de vendas.
        </p>

        <div className="flex items-center justify-center gap-2 text-3xl md:text-4xl font-bold text-primary mb-8">
          <span className="text-muted-foreground text-lg line-through">R$ 197</span>
          <span>R$ 33</span>
          <span className="text-lg font-normal text-muted-foreground">/mês</span>
        </div>

        {canceled && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg max-w-md mx-auto">
            <p className="text-destructive">Pagamento cancelado. Você pode tentar novamente quando quiser.</p>
          </div>
        )}

        <Button 
          size="lg" 
          className="text-lg px-8 py-6 animate-pulse-glow"
          onClick={handleStartRegistration}
        >
          Quero Começar Agora
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </section>

      {/* Benefits Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          O que a I.A MRO vai fazer pelo seu Instagram
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <Card key={index} className="glass-card border-primary/20 hover:border-primary/40 transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{benefit.title}</CardTitle>
                <CardDescription className="text-base">{benefit.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="container mx-auto px-4 py-16 bg-primary/5 rounded-3xl">
        <h2 className="text-3xl font-bold text-center mb-12">Como Funciona</h2>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="text-xl font-semibold mb-2">Cadastre-se</h3>
            <p className="text-muted-foreground">Informe seu nome, email e Instagram</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="text-xl font-semibold mb-2">Pague R$33</h3>
            <p className="text-muted-foreground">Via Pix ou cartão - acesso imediato</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="text-xl font-semibold mb-2">Receba sua Estratégia</h3>
            <p className="text-muted-foreground">A I.A analisa seu perfil e gera tudo automaticamente</p>
          </div>
        </div>
      </section>

      {/* Features List */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">O que está incluso</h2>
          
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-4 glass-card rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                <span className="text-lg">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ferramenta MRO Promo */}
      <section className="container mx-auto px-4 py-16">
        <Card className="glass-card border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-primary/10 max-w-3xl mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Crown className="w-12 h-12 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl">Quer resultados ainda maiores?</CardTitle>
            <CardDescription className="text-lg">
              Conheça a <span className="text-yellow-500 font-semibold">Ferramenta MRO</span> - 
              Automação completa de engajamento orgânico com 200 interações por dia!
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Membros do plano mensal têm acesso a valor promocional exclusivo.
            </p>
            <Button variant="outline" onClick={openInstagram} className="gap-2">
              <Instagram className="w-4 h-4" />
              @maisresultadosonline
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Registration Form */}
      {step === 'register' && (
        <section id="register" className="container mx-auto px-4 py-16">
          <Card className="max-w-lg mx-auto glass-card border-primary/30">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Crie sua Conta</CardTitle>
              <CardDescription>
                Preencha seus dados para começar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Seu Nome *</label>
                  <Input
                    placeholder="Digite seu nome completo"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Seu Email *</label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Sua Senha *</label>
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Instagram (opcional agora)
                  </label>
                  <Input
                    placeholder="@seuinstagram ou link do perfil"
                    value={formData.instagram}
                    onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Você poderá adicionar após o pagamento
                  </p>
                </div>

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full text-lg py-6"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      "Processando..."
                    ) : (
                      <>
                        Pagar R$33 e Começar
                        <Zap className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-4 pt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    Pagamento Seguro
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Acesso Imediato
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>
      )}

      {/* CTA Final */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Transforme seu Instagram hoje
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Por apenas R$33/mês, tenha acesso a estratégias profissionais e criativos 
          gerados por inteligência artificial.
        </p>
        
        {step === 'info' && (
          <Button 
            size="lg" 
            className="text-lg px-8 py-6"
            onClick={handleStartRegistration}
          >
            Começar Agora por R$33/mês
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        )}
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-border/50">
        <div className="text-center text-muted-foreground text-sm">
          <p>© 2024 MRO - Mais Resultados Online. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
