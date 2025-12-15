import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Shield,
  Clock,
  Play,
  Heart,
  Eye,
  UserPlus,
  Bot,
  MessageCircle,
  Video,
  Users,
  Zap,
  X,
  ChevronDown,
  Star,
  Target,
  Lightbulb,
  Image,
  Brain,
  RefreshCw,
  Gift,
  Monitor,
  Laptop
} from "lucide-react";
import logoMro from "@/assets/logo-mro.png";

const VendasCompleta = () => {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 59 });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const scrollToPricing = () => {
    pricingRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const openVideo = (url: string) => {
    setCurrentVideoUrl(url);
    setShowVideoModal(true);
  };

  const iaFeatures = [
    "Cria legendas prontas e otimizadas para seu conteúdo",
    "Gera biografias profissionais para seu Instagram",
    "Entrega os melhores horários para postar no seu nicho",
    "Recomenda hashtags quentes e relevantes"
  ];

  const mroFeatures = [
    { icon: Heart, title: "Curte fotos" },
    { icon: UserPlus, title: "Segue perfis estratégicos" },
    { icon: Users, title: "Segue e deixa de seguir também" },
    { icon: Eye, title: "Reage aos Stories com \"amei\"" },
    { icon: Target, title: "Remove seguidores fakes/comprados" },
    { icon: Zap, title: "Interação com 200 pessoas por dia" }
  ];

  const areaMembroFeatures = [
    "Vídeos estratégicos com passo a passo",
    "Como deixar seu perfil mais atrativo e profissional",
    "Como agendar suas postagens e deixar tudo no automático",
    "Estratégias para bombar seu Instagram mesmo começando do zero"
  ];

  const grupoVipFeatures = [
    "Acesse o grupo VIP",
    "Tire dúvidas",
    "Compartilhe resultados",
    "Receba atualizações em primeira mão"
  ];

  const bonusIAFeatures = [
    {
      icon: Brain,
      title: "Análise de I.A Completa",
      description: "Nossa inteligência artificial analisa seu perfil em profundidade: bio, posts, engajamento e identifica oportunidades de melhoria"
    },
    {
      icon: RefreshCw,
      title: "Acompanhamento Anual",
      description: "Suporte e acompanhamento durante todo o ano para garantir que você está sempre evoluindo"
    },
    {
      icon: Sparkles,
      title: "Estratégias Mensais (30 em 30 dias)",
      description: "A cada 30 dias você recebe uma nova estratégia personalizada baseada no seu nicho"
    },
    {
      icon: Image,
      title: "6 Criativos por Estratégia",
      description: "Imagens profissionais geradas por I.A prontas para publicar no feed e stories"
    },
    {
      icon: Lightbulb,
      title: "Ideias de Conteúdo Ilimitadas",
      description: "Dezenas de ideias de posts, reels e stories alinhadas com seu nicho"
    },
    {
      icon: Target,
      title: "Scripts de Vendas",
      description: "Scripts prontos e gatilhos mentais para transformar seguidores em clientes"
    }
  ];

  const faqs = [
    {
      q: "Quais são os planos disponíveis hoje?",
      a: "Oferecemos dois planos: o Plano Anual de 12 meses, que dá acesso completo por um ano, e o Plano Pagamento Único Vitalício, onde você paga apenas uma vez e tem acesso para sempre, incluindo todas as atualizações sem custo adicional."
    },
    {
      q: "Por que interagir em massa vai me ajudar?",
      a: "Ao curtir fotos, seguir perfis, reagir a stories e interagir com seguidores de concorrentes de forma estratégica, você gera um efeito de proximidade e visibilidade. Isso atrai atenção automática como se fosse um funcionário trabalhando por você — aumentando o engajamento, seguidores e possíveis vendas de forma consistente."
    },
    {
      q: "Mas isso traz vendas, ou só seguidores?",
      a: "Sim, o método é completo. Além da ferramenta de engajamento automático, oferecemos acesso a uma área de membros com vídeos estratégicos que ensinam como converter seguidores em clientes reais. Essa parte estratégica é exclusiva para clientes VIPs."
    },
    {
      q: "Isso em massa não gera bloqueio?",
      a: "Não. Nosso sistema simula um humano com tela ligada, interações espaçadas e pausas naturais. Você deixa rodando por 7 a 8 horas diárias com segurança. O algoritmo entende como uso real, evitando bloqueios. Interagimos com cerca de 200 pessoas por dia de forma inteligente e segura."
    },
    {
      q: "Funciona só em computador?",
      a: "Sim, nossa ferramenta é compatível apenas com computadores de mesa, notebooks ou MacBooks. Não funciona em celulares, tablets ou dispositivos móveis. Isso garante desempenho, estabilidade e maior segurança nas interações automáticas."
    }
  ];

  const annualFeatures = [
    "Ferramenta completa para Instagram",
    "Acesso a 4 contas simultâneas fixas",
    "5 testes todo mês para testar em seus clientes/outras contas",
    "Área de membros por 1 ano",
    "Vídeos estratégicos passo a passo",
    "Grupo VIP no WhatsApp",
    "Suporte prioritário"
  ];

  const lifetimeFeatures = [
    "Ferramenta completa para Instagram",
    "Acesso a 4 contas simultâneas fixas",
    "5 testes todo mês para testar em seus clientes/outras contas",
    "Área de membros VITALÍCIA",
    "Vídeos estratégicos passo a passo",
    "Grupo VIP no WhatsApp",
    "Suporte prioritário",
    "Atualizações gratuitas para sempre"
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <img src={logoMro} alt="MRO" className="h-10 object-contain" />
          <Button 
            onClick={scrollToPricing}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
          >
            Garantir Acesso
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-28 pb-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <img src={logoMro} alt="MRO" className="h-20 md:h-28 mx-auto mb-8 object-contain" />
          
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-black mb-4">
            NÃO GASTE MAIS COM ANÚNCIOS
          </h1>
          <h2 className="text-xl md:text-3xl font-bold text-amber-400">
            UTILIZE A MRO INTELIGENTE
          </h2>

          {/* Main Video */}
          <div className="mt-10 max-w-4xl mx-auto">
            <div 
              onClick={() => openVideo("U-WmszcYekA")}
              className="relative rounded-2xl overflow-hidden cursor-pointer group shadow-2xl border border-gray-700"
            >
              <img 
                src="https://img.youtube.com/vi/U-WmszcYekA/maxresdefault.jpg" 
                alt="Video MRO" 
                className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-red-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Play className="w-10 h-10 text-white ml-1" fill="white" />
                </div>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="mt-10 animate-bounce">
            <ChevronDown className="w-10 h-10 text-gray-500 mx-auto" />
          </div>
        </div>
      </section>

      {/* O QUE VOCÊ VAI RECEBER */}
      <section className="py-16 px-4 bg-gradient-to-b from-black to-gray-950">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-16">
            O QUE VOCÊ VAI <span className="text-amber-400">RECEBER</span>
          </h2>

          {/* IA Section */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg px-4 py-2">
                <span className="font-bold text-sm">NOVO</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold">
                Inteligência artificial automática
              </h3>
            </div>
            
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8">
              <div className="grid md:grid-cols-2 gap-4">
                {iaFeatures.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
              <p className="text-amber-400 font-medium mt-6 text-center text-lg">
                Tudo isso personalizado para você, em segundos!
              </p>
            </div>
          </div>

          {/* MRO Principal */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-amber-500 rounded-lg px-4 py-2">
                <span className="font-bold text-black text-sm">PRINCIPAL</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold">
                FERRAMENTA MRO
              </h3>
            </div>
            
            <div className="bg-gray-900/50 border border-amber-500/30 rounded-2xl p-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mroFeatures.map((feature, i) => (
                  <div key={i} className="flex items-center gap-4 bg-gray-800/50 rounded-xl p-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <feature.icon className="w-6 h-6 text-amber-400" />
                    </div>
                    <span className="font-medium">{feature.title}</span>
                  </div>
                ))}
              </div>
              
              <p className="text-gray-400 mt-8 text-center max-w-3xl mx-auto">
                Tudo isso em alta escala, todos os dias, atraindo um novo público real e interessado em você.
              </p>
              
              <div className="mt-6 text-center">
                <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-full px-6 py-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-bold">Resultados comprovados em até 7 horas de uso!</span>
                </div>
              </div>
            </div>
          </div>

          {/* Area de Membros */}
          <div className="mb-16">
            <h3 className="text-2xl md:text-3xl font-bold mb-6">
              ÁREA DE MEMBROS <span className="text-amber-400">VITALÍCIA</span>
            </h3>
            
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8">
              <div className="grid md:grid-cols-2 gap-4">
                {areaMembroFeatures.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Video className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Grupo VIP */}
          <div className="mb-16">
            <h3 className="text-2xl md:text-3xl font-bold mb-6">
              GRUPO VIP DE <span className="text-green-400">SUPORTE E NETWORKING</span>
            </h3>
            
            <div className="bg-gray-900/50 border border-green-500/30 rounded-2xl p-8">
              <div className="grid md:grid-cols-2 gap-4">
                {grupoVipFeatures.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <MessageCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FAQ Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h4 className="font-bold text-lg mb-4">Por que interagir em massa vai me ajudar?</h4>
              <p className="text-gray-400 text-sm">
                Ao curtir fotos, seguir perfis, reagir a stories e interagir com seguidores de concorrentes de forma estratégica, você gera um efeito de proximidade e visibilidade. Isso atrai atenção automática como se fosse um funcionário trabalhando por você — aumentando o engajamento, seguidores e possíveis vendas de forma consistente.
              </p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h4 className="font-bold text-lg mb-4">Mas isso traz vendas, ou só seguidores?</h4>
              <p className="text-gray-400 text-sm">
                Sim, o método é completo. Além da ferramenta de engajamento automático, oferecemos acesso a uma área de membros com vídeos estratégicos que ensinam como converter seguidores em clientes reais. Essa parte estratégica é exclusiva para clientes VIPs.
              </p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h4 className="font-bold text-lg mb-4">Isso em massa não gera bloqueio?</h4>
              <p className="text-gray-400 text-sm">
                Não. Nosso sistema simula um humano com tela ligada, interações espaçadas e pausas naturais. Você deixa rodando por 7 a 8 horas diárias com segurança. O algoritmo entende como uso real, evitando bloqueios. Interagimos com cerca de 200 pessoas por dia de forma inteligente e segura.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Guarantee Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-3xl p-8 md:p-12 text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <Shield className="w-16 h-16 text-green-400" />
            </div>
            <span className="text-green-400 font-bold text-sm tracking-widest">GARANTIA</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6">
              30 Dias de Resultados <span className="text-green-400">Garantidos</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-6">
              Nós garantimos engajamento, clientes, público e vendas utilizando nossa ferramenta de modo contínuo. 
              Se em 30 dias você não estiver completamente satisfeito, <strong className="text-white">devolvemos 100% do seu investimento!</strong>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <span className="bg-green-500/20 rounded-full px-4 py-2 text-green-400">Sem Risco</span>
              <span className="bg-green-500/20 rounded-full px-4 py-2 text-green-400">Compra Segura</span>
              <span className="bg-green-500/20 rounded-full px-4 py-2 text-green-400">Satisfação Garantida</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main 3 Bonuses Highlight */}
      <section className="py-16 px-4 bg-black">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-full px-6 py-3 mb-4">
              <Gift className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-bold">+ BÔNUS INCLUSOS</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Bonus 1 - Análise de IA */}
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-2 border-purple-500/50 rounded-2xl p-6 text-center hover:scale-105 transition-transform">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-purple-400" />
              </div>
              <div className="bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-3">
                BÔNUS #1
              </div>
              <h3 className="text-xl font-bold mb-2 text-purple-300">Análise de I.A Completa</h3>
              <p className="text-gray-400 text-sm">
                Nossa inteligência artificial analisa seu perfil em profundidade: bio, posts, engajamento e identifica todas as oportunidades de melhoria baseado no seu nicho.
              </p>
            </div>

            {/* Bonus 2 - Acompanhamento Anual */}
            <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-2 border-green-500/50 rounded-2xl p-6 text-center hover:scale-105 transition-transform">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8 text-green-400" />
              </div>
              <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-3">
                BÔNUS #2
              </div>
              <h3 className="text-xl font-bold mb-2 text-green-300">Acompanhamento Anual</h3>
              <p className="text-gray-400 text-sm">
                Suporte e acompanhamento durante todo o ano para garantir que você está sempre evoluindo e alcançando seus objetivos de crescimento.
              </p>
            </div>

            {/* Bonus 3 - Estratégias Mensais */}
            <div className="bg-gradient-to-br from-amber-900/30 to-amber-800/20 border-2 border-amber-500/50 rounded-2xl p-6 text-center hover:scale-105 transition-transform">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-amber-400" />
              </div>
              <div className="bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full inline-block mb-3">
                BÔNUS #3
              </div>
              <h3 className="text-xl font-bold mb-2 text-amber-300">Estratégias Mensais (30 em 30 dias)</h3>
              <p className="text-gray-400 text-sm">
                A cada 30 dias você recebe uma nova estratégia personalizada baseada no seu nicho e nos resultados do mês anterior.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BONUS I.A Section - Additional */}
      <section className="py-16 px-4 bg-gradient-to-b from-gray-950 to-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              E mais recursos da <span className="text-amber-400">I.A da MRO</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {bonusIAFeatures.slice(3).map((feature, i) => (
              <div 
                key={i}
                className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700 rounded-2xl p-6 hover:border-amber-500/50 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section ref={pricingRef} className="py-20 px-4 bg-black relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Escolha Seu <span className="text-amber-400">Plano</span>
            </h2>
            <p className="text-gray-400 text-lg">
              A solução definitiva para crescer no Instagram sem gastar com anúncios
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Plano Anual */}
            <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-3xl p-8 hover:border-amber-500/50 transition-all">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-pink-500 text-white text-sm font-bold px-4 py-1 rounded-full">
                  MAIS POPULAR
                </span>
              </div>

              <h3 className="text-2xl font-bold mb-2 mt-4">Plano Anual</h3>
              <p className="text-gray-400 text-sm mb-6">Método MRO + Ferramenta Completa</p>

              <div className="text-center mb-6">
                <div className="text-xl text-gray-400 mb-1">12x de</div>
                <div className="text-6xl font-black text-amber-400">R$33</div>
                <p className="text-gray-500 text-sm mt-2">ou à vista R$397</p>
              </div>

              <div className="space-y-3 mb-8">
                {annualFeatures.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <Button 
                size="lg"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold text-lg py-6 rounded-xl"
                onClick={() => window.open('https://checkout.infinitepay.io/paguemro?items=[{"name":"MRO+Inteligente+Anual","price":39700,"quantity":1}]&redirect_url=https://pay.maisresultadosonline.com.br/mro-inteligente-obrigado/', '_blank')}
              >
                ADQUIRIR ANUAL
              </Button>
            </div>

            {/* Plano Vitalício */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-amber-500 rounded-3xl p-8 shadow-xl shadow-amber-500/20">
              <h3 className="text-2xl font-bold mb-2">Plano Vitalício</h3>
              <p className="text-gray-400 text-sm mb-6">A solução definitiva para crescer no Instagram sem gastar com anúncios</p>

              <div className="text-center mb-6">
                <div className="text-xl text-gray-400 mb-1">12x de</div>
                <div className="text-6xl font-black text-amber-400">R$83</div>
                <p className="text-gray-500 text-sm mt-2">ou à vista R$997</p>
              </div>

              <div className="space-y-3 mb-8">
                {lifetimeFeatures.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <Button 
                size="lg"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold text-lg py-6 rounded-xl"
                onClick={() => window.open('https://checkout.infinitepay.io/paguemro?items=[{"name":"MRO+Inteligente+Vitalício","price":99700,"quantity":1}]&redirect_url=https://pay.maisresultadosonline.com.br/mro-inteligente-obrigado/', '_blank')}
              >
                ADQUIRIR VITALÍCIO
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Bonus 5K Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-black to-gray-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-2 mb-4">
              <Gift className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-bold">BÔNUS GRÁTIS</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              FAÇA MAIS DE <span className="text-green-400">5 MIL MENSAL</span> PRESTANDO SERVIÇO COM ESSA FERRAMENTA
            </h2>
            <p className="text-amber-400 font-medium text-lg">
              Rode esse sistema para outras empresas e fature mensalmente por isso!
            </p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 mb-10">
            <div className="space-y-4 text-gray-400">
              <p>
                Temos um método completo no qual você pode prestar serviços utilizando essa ferramenta, fechando contratos com empresas que buscam engajamento, clientes e vendas.
              </p>
              <p>
                Você roda a ferramenta para o cliente, cobra uma mensalidade, e gera uma renda recorrente. Tudo pode ser feito de qualquer lugar do mundo com seu notebook.
              </p>
              <p>
                Para quem deseja oferecer esse serviço, entregamos <strong className="text-white">4 contas vitalícias + 5 testes grátis por mês</strong> (de 1 dia cada).
              </p>
              <p>
                Esses testes servem para apresentar o serviço: você roda a ferramenta por 1 dia, o cliente vê o resultado e você fecha um contrato mensal com ele.
              </p>
              <p className="text-xl font-bold text-amber-400 text-center mt-6">
                OU SEJA, VOCÊ PODE FATURAR MAIS DE R$5.000,00 POR MÊS PRESTANDO SERVIÇO COM ESSA FERRAMENTA!
              </p>
              <p className="text-center text-sm">
                Caso precise de mais contas no futuro, cobramos R$150 por conta adicional para quem já utiliza o sistema.
              </p>
            </div>
          </div>

          {/* Video 5K */}
          <div className="max-w-3xl mx-auto">
            <h4 className="text-center text-lg font-medium mb-4">
              CONFIRA UMA APRESENTAÇÃO DE COMO DESENVOLVEMOS ESSA SOLUÇÃO:
            </h4>
            <div 
              onClick={() => openVideo("WQwnAHNvSMU")}
              className="relative rounded-2xl overflow-hidden cursor-pointer group shadow-2xl border border-gray-700"
            >
              <img 
                src="https://img.youtube.com/vi/WQwnAHNvSMU/maxresdefault.jpg" 
                alt="Video 5K" 
                className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Play className="w-8 h-8 text-white ml-1" fill="white" />
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-lg text-gray-300 mt-10">
            Está pronto para começar? Entre em contato e garanta seu acesso vitalício agora mesmo!
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-black">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Perguntas <span className="text-amber-400">Frequentes</span>
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div 
                key={i}
                className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-semibold pr-4">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-amber-400 transition-transform flex-shrink-0 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-gray-400">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Still Have Doubts Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-black to-gray-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ainda está com <span className="text-amber-400">dúvidas</span>?
            </h2>
            <p className="text-gray-400 text-lg">
              Veja no vídeo abaixo como nossa ferramenta pode transformar seus resultados sem gastar com anúncios pagos
            </p>
          </div>

          {/* Final Video */}
          <div className="max-w-3xl mx-auto">
            <div 
              onClick={() => openVideo("htcmVvznaBs")}
              className="relative rounded-2xl overflow-hidden cursor-pointer group shadow-2xl border border-gray-700"
            >
              <img 
                src="https://img.youtube.com/vi/htcmVvznaBs/maxresdefault.jpg" 
                alt="Video Final" 
                className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Play className="w-8 h-8 text-white ml-1" fill="white" />
                </div>
              </div>
            </div>
          </div>

          {/* Feature Pills */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-center">
              <Zap className="w-10 h-10 text-amber-400 mx-auto mb-4" />
              <h4 className="font-bold text-lg mb-2">Resultados Rápidos</h4>
              <p className="text-gray-400 text-sm">
                Em apenas 7 horas utilizando nossa ferramenta você já começa a ver os primeiros resultados no seu negócio
              </p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-center">
              <Star className="w-10 h-10 text-amber-400 mx-auto mb-4" />
              <h4 className="font-bold text-lg mb-2">Engajamento Garantido</h4>
              <p className="text-gray-400 text-sm">
                Aumente significativamente o engajamento do seu público sem depender de algoritmos ou anúncios pagos
              </p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-center">
              <Target className="w-10 h-10 text-amber-400 mx-auto mb-4" />
              <h4 className="font-bold text-lg mb-2">Mais Vendas</h4>
              <p className="text-gray-400 text-sm">
                Método comprovado que gera clientes e aumenta suas vendas de forma consistente e previsível
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Computer Only Note */}
      <section className="py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6 flex items-center gap-4">
            <div className="flex gap-2">
              <Monitor className="w-8 h-8 text-gray-400" />
              <Laptop className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-400 text-sm">
              <strong className="text-white">Nota:</strong> Nossa ferramenta é compatível apenas com computadores de mesa, notebooks ou MacBooks. Não funciona em celulares, tablets ou dispositivos móveis.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-gray-950 to-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Pronto para <span className="text-amber-400">Escalar</span> seu Instagram?
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            Junte-se a milhares de empreendedores que já transformaram seus perfis
          </p>
          <Button 
            size="lg"
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold text-xl px-12 py-8 rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all hover:scale-105"
            onClick={scrollToPricing}
          >
            GARANTIR MEU ACESSO AGORA <ArrowRight className="ml-2 w-6 h-6" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-800">
        <div className="max-w-6xl mx-auto text-center text-gray-500">
          <img src={logoMro} alt="MRO" className="h-10 mx-auto mb-4 object-contain" />
          <p>Mais Resultados Online © 2024. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* Video Modal */}
      {showVideoModal && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setShowVideoModal(false)}
        >
          <button 
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={() => setShowVideoModal(false)}
          >
            <X className="w-6 h-6" />
          </button>
          <div className="w-full max-w-5xl aspect-video" onClick={e => e.stopPropagation()}>
            <iframe
              src={`https://www.youtube.com/embed/${currentVideoUrl}?autoplay=1`}
              className="w-full h-full rounded-xl"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VendasCompleta;
