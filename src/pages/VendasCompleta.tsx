import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
  BarChart3,
  Play,
  Heart,
  Eye,
  UserPlus,
  Bot,
  Calendar,
  FileText,
  Image,
  Lightbulb,
  Star,
  Gift,
  X,
  Brain,
  RefreshCw,
  ChevronDown
} from "lucide-react";
import logoMro from "@/assets/logo-mro.png";

const VendasCompleta = () => {
  const navigate = useNavigate();
  const [showVideoModal, setShowVideoModal] = useState(false);
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

  const mainCards = [
    {
      title: "Não Gaste Com Anúncios Faça Você Mesmo",
      description: "Ferramenta premium para crescimento orgânico no Instagram sem investir em anúncios",
      buttonText: "ACESSAR FERRAMENTA",
      borderColor: "border-l-amber-500",
      action: () => scrollToPricing()
    },
    {
      title: "Deixe Nós Trabalhar Para Você! Vamos Escalar Por Você!",
      description: "Nossa equipe especializada cuida de todo o crescimento do seu perfil profissionalmente",
      buttonText: "CONTRATAR SERVIÇO",
      borderColor: "border-l-amber-500",
      action: () => window.open("https://wa.me/5551920036540?text=Olá! Quero saber mais sobre o serviço de crescimento profissional!", "_blank")
    }
  ];

  const bonusFeatures = [
    {
      icon: Brain,
      title: "Análise de I.A Completa",
      description: "Nossa inteligência artificial analisa seu perfil em profundidade: bio, posts, engajamento e identifica todas as oportunidades de melhoria"
    },
    {
      icon: Calendar,
      title: "Acompanhamento Anual",
      description: "Suporte e acompanhamento durante todo o ano para garantir que você está sempre evoluindo e alcançando seus objetivos"
    },
    {
      icon: RefreshCw,
      title: "Estratégias Mensais (30 em 30 dias)",
      description: "A cada 30 dias você recebe uma nova estratégia personalizada baseada no seu nicho e nos resultados do mês anterior"
    },
    {
      icon: Image,
      title: "6 Criativos por Estratégia",
      description: "Imagens profissionais geradas por I.A prontas para publicar no feed e stories, com CTAs e sua identidade visual"
    },
    {
      icon: Lightbulb,
      title: "Ideias de Conteúdo Ilimitadas",
      description: "Dezenas de ideias de posts, reels e stories alinhadas com seu nicho para nunca ficar sem conteúdo"
    },
    {
      icon: Target,
      title: "Scripts de Vendas",
      description: "Scripts prontos e gatilhos mentais para transformar seguidores em clientes pagantes"
    }
  ];

  const mroFeatures = [
    { icon: Heart, title: "Curtir Fotos", desc: "Curte fotos de potenciais clientes automaticamente" },
    { icon: Eye, title: "Ver Stories", desc: "Visualiza stories gerando curiosidade sobre você" },
    { icon: UserPlus, title: "Seguir Contas", desc: "Segue pessoas do seu nicho automaticamente" },
    { icon: Zap, title: "200/dia", desc: "Interação com 200 pessoas todos os dias" },
  ];

  const planFeatures = [
    "Ferramenta MRO completa por 1 ano",
    "4 contas de Instagram simultaneamente",
    "Análise de I.A do seu perfil",
    "Estratégias mensais personalizadas (30 em 30 dias)",
    "6 criativos por estratégia",
    "Acompanhamento anual completo",
    "Suporte via WhatsApp",
    "Área de membros VIP",
    "Atualizações incluídas",
    "Garantia de 30 dias"
  ];

  const faqs = [
    {
      q: "Como funciona a ferramenta MRO?",
      a: "A MRO é uma extensão que funciona no seu navegador. Ela automatiza interações orgânicas como curtir fotos, ver stories e seguir pessoas do seu nicho, gerando até 200 novas interações por dia de forma segura."
    },
    {
      q: "Como funcionam as estratégias mensais?",
      a: "A cada 30 dias, nossa I.A analisa seu perfil e gera uma nova estratégia personalizada com calendário de postagens, ideias de conteúdo, 6 criativos prontos e scripts de vendas baseados no seu nicho."
    },
    {
      q: "Posso usar em mais de uma conta?",
      a: "Sim! Com o plano anual você pode usar a ferramenta em até 4 contas de Instagram diferentes, gerenciando múltiplos perfis simultaneamente."
    },
    {
      q: "É seguro usar a ferramenta?",
      a: "Sim! A MRO simula comportamento humano e respeita os limites do Instagram. São apenas 200 interações por dia, dentro do padrão de uso normal."
    },
    {
      q: "E se eu não gostar?",
      a: "Você tem 30 dias de garantia. Se não tiver resultados reais de engajamento e crescimento, devolvemos 100% do seu investimento."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-lg border-b border-gray-800">
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

      {/* Hero */}
      <section className="relative pt-28 pb-20 px-4">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <img src={logoMro} alt="MRO" className="h-24 md:h-32 mx-auto mb-8 object-contain" />
          
          <h1 className="text-4xl md:text-6xl font-black mb-4 text-amber-400">
            FERRAMENTAS & ESTRATÉGIAS
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto">
            Soluções premium para escalar seu negócio digital
          </p>

          <div className="w-32 h-1 bg-amber-500 mx-auto mt-8" />
        </div>
      </section>

      {/* Main Cards Grid */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
          {mainCards.map((card, i) => (
            <div 
              key={i}
              className={`bg-gray-900/80 border border-gray-800 border-l-4 ${card.borderColor} rounded-lg p-8 hover:bg-gray-800/80 transition-all duration-300`}
            >
              <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center mb-6">
                <Instagram className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3">{card.title}</h3>
              <p className="text-gray-400 mb-6">{card.description}</p>
              <Button 
                onClick={card.action}
                className="bg-transparent border-2 border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-black font-bold"
              >
                {card.buttonText}
              </Button>
            </div>
          ))}
        </div>

        {/* Single Card - Método 5K */}
        <div className="max-w-6xl mx-auto mt-6">
          <div className="bg-gray-900/80 border border-gray-800 border-l-4 border-l-amber-500 rounded-lg p-8">
            <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center mb-6">
              <TrendingUp className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Preste Serviço Com A MRO! E Fatura Mais De 5k</h3>
            <p className="text-gray-400 mb-6">Método exclusivo e comprovado para faturamento recorrente trabalhando com a Mais Resultados Online</p>
            <Button 
              onClick={scrollToPricing}
              className="bg-transparent border-2 border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-black font-bold"
            >
              MÉTODO 5K+
            </Button>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div 
            onClick={() => setShowVideoModal(true)}
            className="relative rounded-2xl overflow-hidden cursor-pointer group shadow-2xl border-2 border-amber-500/30"
          >
            <img 
              src="https://img.youtube.com/vi/U-WmszcYekA/maxresdefault.jpg" 
              alt="Video MRO" 
              className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center group-hover:bg-black/40 transition-colors">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/50">
                <Play className="w-10 h-10 text-black ml-1" fill="black" />
              </div>
            </div>
          </div>
          <p className="text-center text-gray-400 mt-4">Veja como funciona a ferramenta MRO</p>
        </div>
      </section>

      {/* MRO Tool Features */}
      <section className="py-16 px-4 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/30 rounded-full px-4 py-2 mb-4">
              <Bot className="w-4 h-4 text-pink-400" />
              <span className="text-pink-400 text-sm font-medium">Ferramenta MRO</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Como um <span className="text-pink-400">Funcionário</span> Trabalhando 24h
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              A MRO trabalha no automático enquanto você foca no que importa
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mroFeatures.map((feature, i) => (
              <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center hover:border-pink-500/50 transition-colors">
                <div className="w-14 h-14 rounded-full bg-pink-500/20 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-7 h-7 text-pink-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BONUS Section - I.A Features */}
      <section className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-2 mb-4">
              <Gift className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 text-sm font-bold">BÔNUS EXCLUSIVOS</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              <span className="text-amber-400">I.A da MRO</span> Trabalhando Para Você
            </h2>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              Além da ferramenta de automação, você recebe análises e estratégias mensais personalizadas
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bonusFeatures.map((feature, i) => (
              <div 
                key={i}
                className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-amber-500/30 rounded-2xl p-6 hover:border-amber-500/50 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-7 h-7 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-8 md:p-12">
            <Shield className="w-16 h-16 text-green-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">30 Dias de Garantia</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Se você não tiver <strong className="text-white">resultados reais</strong> de engajamento e crescimento em 30 dias, 
              devolvemos <strong className="text-green-400">100% do seu investimento</strong>. Sem perguntas.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section ref={pricingRef} className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          {/* Timer */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-4 bg-red-500/10 border border-red-500/30 rounded-full px-6 py-3">
              <Clock className="w-5 h-5 text-red-400" />
              <span className="text-red-400 font-bold">OFERTA EXPIRA EM:</span>
              <div className="flex items-center gap-2 font-mono text-2xl font-bold">
                <span className="bg-red-500/20 px-3 py-1 rounded">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="text-red-400">:</span>
                <span className="bg-red-500/20 px-3 py-1 rounded">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="text-red-400">:</span>
                <span className="bg-red-500/20 px-3 py-1 rounded">{String(timeLeft.seconds).padStart(2, '0')}</span>
              </div>
            </div>
          </div>

          <div className="text-center mb-10">
            <span className="text-amber-400 font-bold text-lg">PLANO ANUAL COMPLETO</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-2">MRO + I.A + Automação</h2>
          </div>

          {/* Price Card */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-amber-500/50 rounded-3xl p-8 md:p-12 shadow-2xl shadow-amber-500/20">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                {planFeatures.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-black" />
                    </div>
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-center justify-center text-center">
                <p className="text-gray-500 text-sm mb-4">ou R$397 à vista</p>
                
                <div className="mb-2">
                  <span className="text-2xl text-gray-400">12x de</span>
                </div>
                <div className="text-7xl md:text-8xl font-black text-amber-400 mb-1">
                  R$33
                </div>
                <p className="text-xl text-gray-300 font-medium mb-6">por mês</p>

                <Button 
                  size="lg"
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold text-xl py-8 rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all hover:scale-105"
                  onClick={() => window.open('https://checkout.infinitepay.io/paguemro?items=[{"name":"MRO+I.A+++Automação+(+ANUAL+)+","price":39700,"quantity":1}]&redirect_url=https://acessar.click/obrigado', '_blank')}
                >
                  GARANTIR MEU ACESSO AGORA
                </Button>

                <p className="text-sm text-gray-500 mt-4 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Pagamento 100% seguro
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-700 text-center">
              <p className="text-amber-400 font-medium">
                ⚡ Acesso imediato após confirmação do pagamento
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Dúvidas <span className="text-amber-400">Frequentes</span>
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

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-gray-950 to-gray-900">
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
            onClick={() => window.open('https://checkout.infinitepay.io/paguemro?items=[{"name":"MRO+I.A+++Automação+(+ANUAL+)+","price":39700,"quantity":1}]&redirect_url=https://acessar.click/obrigado', '_blank')}
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
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
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
              src="https://www.youtube.com/embed/U-WmszcYekA?autoplay=1"
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
