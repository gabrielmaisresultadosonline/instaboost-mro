import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  LogIn,
  Play,
  Heart,
  Eye,
  UserPlus,
  Bot,
  Calendar,
  FileText,
  Image,
  Lightbulb,
  Rocket,
  Star,
  Gift,
  MessageCircle,
  Monitor,
  BadgeCheck
} from "lucide-react";
import { Logo } from "@/components/Logo";
import creative1 from "@/assets/creative-1.webp";
import creative2 from "@/assets/creative-2.jpg";
import creative3 from "@/assets/creative-3.jpg";
import creative4 from "@/assets/creative-4.jpg";

const creativeImages = [creative1, creative2, creative3, creative4];

const iaFeatures = [
  {
    icon: BarChart3,
    title: "Análise Completa do Perfil",
    description: "Nossa I.A analisa seu perfil em profundidade: bio, posts, engajamento, público-alvo e identifica pontos de melhoria"
  },
  {
    icon: Calendar,
    title: "Estratégia de 30 Dias",
    description: "Planejamento completo com calendário de postagens, melhores horários e tipos de conteúdo que geram resultados"
  },
  {
    icon: Image,
    title: "6 Criativos Profissionais",
    description: "Imagens geradas por I.A prontas para publicar no feed e stories, com CTAs e sua identidade visual"
  },
  {
    icon: FileText,
    title: "Bio Otimizada",
    description: "Sugestões personalizadas para transformar sua bio em uma máquina de conversão de visitantes em seguidores"
  },
  {
    icon: Lightbulb,
    title: "Ideias de Conteúdo",
    description: "Dezenas de ideias de posts, reels e stories alinhadas com seu nicho para nunca ficar sem conteúdo"
  },
  {
    icon: Target,
    title: "Estratégias de Vendas",
    description: "Scripts prontos e gatilhos mentais para transformar seguidores em clientes pagantes"
  }
];

const mroFeatures = [
  {
    icon: Heart,
    title: "Curtir Fotos Automaticamente",
    description: "A ferramenta curte fotos de potenciais clientes do seu nicho automaticamente"
  },
  {
    icon: Eye,
    title: "Visualizar Stories",
    description: "Visualiza stories de outras contas, gerando notificações e curiosidade sobre você"
  },
  {
    icon: UserPlus,
    title: "Seguir Contas Relevantes",
    description: "Segue pessoas que têm interesse no seu nicho baseado em hashtags e concorrentes"
  },
  {
    icon: Zap,
    title: "200 Pessoas por Dia",
    description: "Interação com até 200 novos potenciais clientes todos os dias, de forma segura"
  }
];

const benefits = [
  "Aumente suas vendas sem gastar com anúncios",
  "Atraia leads qualificados organicamente",
  "Cresça de 1.000 a 10.000 seguidores por mês",
  "Transforme seu perfil em máquina de vendas",
  "Economize horas de trabalho manual",
  "Resultados comprovados em qualquer nicho"
];

export default function VendasCompleta() {
  const navigate = useNavigate();
  const [showVideo, setShowVideo] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [reachedPricing, setReachedPricing] = useState(false);
  const videoSectionRef = useRef<HTMLDivElement>(null);
  const iaSectionRef = useRef<HTMLDivElement>(null);
  const creativeSectionRef = useRef<HTMLDivElement>(null);
  const mroSectionRef = useRef<HTMLDivElement>(null);
  const pricingSectionRef = useRef<HTMLDivElement>(null);
  const [currentSection, setCurrentSection] = useState(0);

  const sections = [iaSectionRef, creativeSectionRef, mroSectionRef, pricingSectionRef];

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Show pricing after scrolling past 40% of the page
      if (scrollPosition > (documentHeight - windowHeight) * 0.4) {
        setShowPricing(true);
      }
      
      // Check if reached pricing section
      if (pricingSectionRef.current) {
        const pricingTop = pricingSectionRef.current.getBoundingClientRect().top;
        if (pricingTop < windowHeight * 0.8) {
          setReachedPricing(true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBuyClick = () => {
    window.open('https://pay.maisresultadosonline.com.br/pagamento/', '_blank');
  };

  const handleViewMore = () => {
    const nextSection = sections[currentSection];
    if (nextSection?.current) {
      nextSection.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentSection(prev => Math.min(prev + 1, sections.length - 1));
    }
  };

  const handleWhatsAppClick = () => {
    setShowWhatsAppDialog(true);
  };

  const handleWhatsAppConfirm = (sawContent: boolean) => {
    setShowWhatsAppDialog(false);
    
    if (sawContent) {
      const phone = "5551920536540";
      const message = encodeURIComponent("Acabei de vim do site, gostaria de tirar algumas dúvidas.");
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    } else {
      // Scroll to video section
      videoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-yellow-950/10 to-primary/10">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Logo size="lg" />
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <LogIn className="w-4 h-4" />
            Acessar / Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 text-center">
        <Badge className="mb-4 bg-gradient-to-r from-yellow-500/20 to-primary/20 text-background border-yellow-500/30">
          <Sparkles className="w-3 h-3 mr-1" />
          Inteligência Artificial + Automação
        </Badge>
        
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-yellow-400 via-yellow-500 to-primary bg-clip-text text-transparent">
          I.A para Instagram com Automação
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-6 max-w-4xl mx-auto">
          <span className="text-foreground font-semibold">Sem precisar gastar com anúncios.</span> A I.A MRO cria estratégias 
          personalizadas, criativos profissionais e a Ferramenta MRO automatiza seu engajamento 24 horas por dia.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          {benefits.slice(0, 3).map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 text-sm md:text-base">
              <CheckCircle2 className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <span>{benefit}</span>
            </div>
          ))}
        </div>

        {reachedPricing ? (
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-background animate-pulse-glow"
            onClick={handleBuyClick}
          >
            <Rocket className="mr-2 h-5 w-5" />
            Comprar Agora
          </Button>
        ) : (
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 bg-gradient-to-r from-yellow-500 to-primary hover:from-yellow-600 hover:to-primary/90 text-background"
            onClick={handleViewMore}
          >
            Ver Mais
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        )}
      </section>

      {/* I.A Features Section */}
      <section ref={iaSectionRef} className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-yellow-500/20 to-primary/20 text-background border-yellow-500/30">
            <Bot className="w-3 h-3 mr-1" />
            Inteligência Artificial
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-primary bg-clip-text text-transparent">
            O Poder da I.A MRO no seu Instagram
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Nossa inteligência artificial analisa seu perfil e cria estratégias personalizadas para transformar 
            seu Instagram em uma máquina de vendas
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {iaFeatures.map((feature, index) => (
            <Card key={index} className="glass-card border-yellow-500/20 hover:border-yellow-500/40 transition-all group">
              <CardHeader>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-yellow-500" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Creative Generation Highlight */}
      <section ref={creativeSectionRef} className="container mx-auto px-4 py-16">
        <Card className="glass-card border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-primary/5 overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 p-8">
            <div>
              <Badge className="mb-4 bg-gradient-to-r from-yellow-500/20 to-primary/20 text-background border-yellow-500/30">
                <Palette className="w-3 h-3 mr-1" />
                Criativos com I.A
              </Badge>
              <h3 className="text-3xl font-bold mb-4">
                6 Criativos Profissionais Todo Mês
              </h3>
              <p className="text-muted-foreground mb-6">
                Nossa I.A gera imagens únicas e profissionais baseadas no seu negócio, 
                com CTAs estratégicos, sua logo e cores da sua marca. Prontos para publicar!
              </p>
              <ul className="space-y-3">
                {[
                  "Imagens personalizadas para seu nicho",
                  "CTAs que convertem visitantes em clientes",
                  "Sua logo integrada automaticamente",
                  "Cores e estilo da sua marca",
                  "Formatos para feed e stories",
                  "Download instantâneo em alta qualidade"
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-center">
              <div className="grid grid-cols-2 gap-4">
                {creativeImages.map((img, index) => (
                  <div 
                    key={index} 
                    className="w-32 h-40 md:w-40 md:h-52 rounded-xl overflow-hidden border-2 border-yellow-500/30 animate-float shadow-lg shadow-yellow-500/20"
                    style={{ animationDelay: `${index * 0.2}s` }}
                  >
                    <img 
                      src={img} 
                      alt={`Criativo exemplo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* MRO Tool Section */}
      <section id="ferramenta-mro" ref={mroSectionRef} className="container mx-auto px-4 py-16">
        <div ref={videoSectionRef} />
        <Card className="glass-card border-yellow-500/40 bg-gradient-to-br from-yellow-500/15 via-yellow-500/5 to-background overflow-hidden">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500/30 to-yellow-500/10 flex items-center justify-center animate-pulse-glow">
                <Crown className="w-10 h-10 text-yellow-500" />
              </div>
            </div>
            <Badge className="mb-4 bg-yellow-500/20 text-yellow-500 border-yellow-500/30 mx-auto">
              <Zap className="w-3 h-3 mr-1" />
              Bônus Exclusivo
            </Badge>
            <CardTitle className="text-3xl md:text-4xl mb-4">
              Ferramenta MRO de Engajamento Automático
            </CardTitle>
            <CardDescription className="text-lg max-w-3xl mx-auto">
              Automatize suas interações no Instagram! A Ferramenta MRO curte fotos, visualiza stories e segue 
              contas do seu nicho automaticamente. <span className="text-foreground font-semibold">200 pessoas por dia, 24 horas por dia!</span>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Video Section */}
            <div 
              className="relative mx-auto max-w-3xl aspect-video bg-card rounded-2xl overflow-hidden cursor-pointer group border-2 border-yellow-500/30 hover:border-yellow-500/60 transition-all"
              onClick={() => setShowVideo(true)}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10" />
              <img 
                src={`https://img.youtube.com/vi/U-WmszcYekA/maxresdefault.jpg`}
                alt="Ferramenta MRO"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-yellow-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-yellow-500/50">
                  <Play className="w-10 h-10 md:w-12 md:h-12 text-background ml-1" fill="currentColor" />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 z-20 text-center">
                <p className="text-lg md:text-xl font-semibold text-foreground">
                  Clique para ver como funciona
                </p>
              </div>
            </div>

            {/* MRO Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {mroFeatures.map((feature, index) => (
                <div key={index} className="p-6 rounded-xl bg-card/50 border border-yellow-500/20 hover:border-yellow-500/40 transition-all text-center">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-yellow-500" />
                  </div>
                  <h4 className="font-semibold mb-2">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* How MRO Works */}
            <div className="bg-card/30 rounded-2xl p-8 border border-yellow-500/20">
              <h4 className="text-xl font-bold mb-6 text-center">Como a Ferramenta MRO Funciona</h4>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-yellow-500 text-background flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    1
                  </div>
                  <h5 className="font-semibold mb-2">Configure uma vez</h5>
                  <p className="text-sm text-muted-foreground">Defina seu nicho, hashtags e contas de concorrentes que deseja atrair seguidores</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-yellow-500 text-background flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    2
                  </div>
                  <h5 className="font-semibold mb-2">Dê o Start</h5>
                  <p className="text-sm text-muted-foreground">Aperte um botão e a ferramenta começa a interagir automaticamente</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-yellow-500 text-background flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    3
                  </div>
                  <h5 className="font-semibold mb-2">Resultados Diários</h5>
                  <p className="text-sm text-muted-foreground">200 pessoas impactadas por dia = novos seguidores e clientes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Benefits Summary */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">
            Tudo que você precisa para crescer no Instagram
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {[
              "Análise completa do seu perfil com I.A",
              "Estratégia personalizada de 30 dias",
              "6 criativos profissionais por mês",
              "Calendário de postagens otimizado",
              "Otimização de bio que converte",
              "Ferramenta MRO de engajamento automático",
              "200 interações automáticas por dia",
              "Suporte via WhatsApp",
              "Atualizações gratuitas",
              "Acesso imediato após pagamento"
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-4 glass-card rounded-lg border border-yellow-500/20">
                <CheckCircle2 className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                <span className="text-lg">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section ref={pricingSectionRef} className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-yellow-500/20 to-primary/20 text-background border-yellow-500/30">
            <Gift className="w-3 h-3 mr-1" />
            Oferta Especial
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-primary bg-clip-text text-transparent">
            Escolha seu Plano
          </h2>
          <p className="text-lg text-muted-foreground">
            Invista no crescimento do seu negócio
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Annual Plan */}
          <Card className="glass-card border-yellow-500/30 relative overflow-hidden bg-gradient-to-br from-yellow-500/5 to-background">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-500 to-primary text-background px-4 py-1 text-sm font-semibold rounded-bl-xl">
              Mais Popular
            </div>
            <CardHeader className="text-center pt-8">
              <CardTitle className="text-2xl">Acesso Anual</CardTitle>
              <CardDescription className="text-base">12 meses de acesso completo</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div>
                <p className="text-muted-foreground line-through text-lg">De R$ 997</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl font-bold text-yellow-500">12x R$ 33</span>
                </div>
                <p className="text-muted-foreground mt-1">ou R$ 397 à vista</p>
              </div>
              
              <ul className="space-y-3 text-left">
                {[
                  "I.A MRO completa",
                  "Ferramenta de engajamento automático",
                  "6 criativos por mês",
                  "Estratégias mensais",
                  "Suporte prioritário"
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Button 
                size="lg" 
                className="w-full text-lg py-6 bg-gradient-to-r from-yellow-500 to-primary hover:from-yellow-600 hover:to-primary/90 text-background animate-pulse-glow"
                onClick={handleBuyClick}
              >
                Comprar Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>

          {/* Lifetime Plan */}
          <Card className="glass-card border-yellow-500/40 relative overflow-hidden bg-gradient-to-br from-yellow-500/5 to-background">
            <div className="absolute top-0 right-0 bg-yellow-500 text-background px-4 py-1 text-sm font-semibold rounded-bl-xl">
              Melhor Custo-Benefício
            </div>
            <CardHeader className="text-center pt-8">
              <div className="flex justify-center mb-2">
                <Crown className="w-8 h-8 text-yellow-500" />
              </div>
              <CardTitle className="text-2xl">Acesso Vitalício</CardTitle>
              <CardDescription className="text-base">Pague uma vez, use para sempre</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div>
                <p className="text-muted-foreground line-through text-lg">De R$ 2.997</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl font-bold text-yellow-500">12x R$ 83</span>
                </div>
                <p className="text-muted-foreground mt-1">ou R$ 997 à vista</p>
              </div>
              
              <ul className="space-y-3 text-left">
                {[
                  "Tudo do plano anual",
                  "Acesso vitalício sem renovação",
                  "Atualizações gratuitas para sempre",
                  "Suporte VIP prioritário",
                  "Bônus exclusivos futuros"
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Button 
                size="lg" 
                className="w-full text-lg py-6 bg-yellow-500 hover:bg-yellow-600 text-background animate-pulse-glow"
                onClick={handleBuyClick}
              >
                Comprar Agora
                <Crown className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Guarantee Highlight */}
      <section className="container mx-auto px-4 py-12">
        <Card className="bg-gradient-to-r from-green-500/10 via-green-600/5 to-green-500/10 border-green-500/30">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <BadgeCheck className="w-12 h-12 text-green-500" />
              <h3 className="text-2xl md:text-3xl font-bold text-green-500">30 Dias de Garantia de Resultados</h3>
            </div>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Caso não aconteça <span className="text-foreground font-semibold">engajamento, vendas, clientes e resultados reais</span> no seu perfil 
              dentro de 30 dias, <span className="text-green-500 font-semibold">cancelamos e devolvemos 100% do seu dinheiro</span>. 
              Sem burocracia!
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Guarantees */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex flex-wrap items-center justify-center gap-8 text-center">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-yellow-500" />
            <div className="text-left">
              <p className="font-semibold">Pagamento Seguro</p>
              <p className="text-sm text-muted-foreground">Dados protegidos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div className="text-left">
              <p className="font-semibold">Acesso Imediato</p>
              <p className="text-sm text-muted-foreground">Após confirmação</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Instagram className="w-8 h-8 text-yellow-500" />
            <div className="text-left">
              <p className="font-semibold">Suporte no Instagram</p>
              <p className="text-sm text-muted-foreground">@maisresultadosonline</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-green-500" />
            <div className="text-left">
              <p className="font-semibold">Suporte no WhatsApp</p>
              <p className="text-sm text-muted-foreground">Atendimento rápido</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Monitor className="w-8 h-8 text-blue-500" />
            <div className="text-left">
              <p className="font-semibold">Suporte via AnyDesk</p>
              <p className="text-sm text-muted-foreground">Acesso remoto se precisar</p>
            </div>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-6 max-w-2xl mx-auto">
          Em caso de muita dúvida ou dificuldade, conseguimos <span className="text-foreground font-medium">acessar remotamente sua máquina</span> e 
          fazer o passo a passo junto com você!
        </p>
      </section>

      {/* Floating CTA */}
      {showPricing && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-r from-background/95 via-yellow-950/20 to-background/95 backdrop-blur-lg border-t border-yellow-500/30 z-50 animate-slide-up">
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="font-semibold text-yellow-500">Aproveite o valor promocional!</p>
              <p className="text-sm text-muted-foreground">A partir de 12x de R$ 33</p>
            </div>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-background animate-pulse-glow"
              onClick={handleBuyClick}
            >
              Comprar Agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-muted-foreground border-t border-border">
        <Logo size="sm" />
        <p className="mt-4">© 2024 Mais Resultados Online. Todos os direitos reservados.</p>
      </footer>

      {/* Video Lightbox */}
      <Dialog open={showVideo} onOpenChange={setShowVideo}>
        <DialogContent className="max-w-4xl p-0 bg-background border-primary/30 overflow-hidden">
          <div className="aspect-video">
            <iframe
              src="https://www.youtube.com/embed/U-WmszcYekA?autoplay=1"
              title="Ferramenta MRO"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Confirmation Dialog */}
      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent className="max-w-md bg-background border-primary/30">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <DialogTitle className="text-xl">Antes de atender você...</DialogTitle>
            <DialogDescription className="text-base pt-2">
              Chegou a ver todo conteúdo em nosso site? O vídeo explicativo também de nossa automação com I.A?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <Button 
              size="lg"
              className="bg-green-500 hover:bg-green-600 text-white"
              onClick={() => handleWhatsAppConfirm(true)}
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Sim, já vi tudo!
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => handleWhatsAppConfirm(false)}
            >
              Não, quero ver primeiro
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
