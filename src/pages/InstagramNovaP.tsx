import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { trackPageView, trackLead } from "@/lib/facebookTracking";
import { toast } from "sonner";
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
  Brain,
  RefreshCw,
  Gift,
  Monitor,
  Laptop,
  Mail,
  User,
  CreditCard,
  Loader2,
  Phone
} from "lucide-react";
import logoMro from "@/assets/logo-mro.png";
import ActiveClientsSection from "@/components/ActiveClientsSection";

interface SalesSettings {
  whatsappNumber: string;
  whatsappMessage: string;
  ctaButtonText: string;
}

// Valores de produção
const PLANS = {
  trial: { name: "Teste 30 Dias", price: 97.00, days: 30, description: "Teste por 30 dias" },
  annual: { name: "Anual", price: 397.00, days: 365, description: "Acesso por 1 ano" },
  lifetime: { name: "Vitalício", price: 797.00, days: 999999, description: "Acesso para sempre" },
};

const InstagramNovaP = () => {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [timeLeft, setTimeLeft] = useState({ hours: 47, minutes: 59, seconds: 59 });
  
  // Countdown para promoção - 06/01/2026 às 16:00
  const [promoTimeLeft, setPromoTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, expired: false });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const [salesSettings, setSalesSettings] = useState<SalesSettings>({
    whatsappNumber: '+55 51 9203-6540',
    whatsappMessage: 'Gostaria de saber sobre a promoção.',
    ctaButtonText: 'Gostaria de aproveitar a promoção'
  });
  
  // Modal de cadastro
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"trial" | "annual" | "lifetime">("annual");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const usernameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(false);

  const checkUsernameAvailability = async (
    usernameToCheck: string
  ): Promise<boolean | null> => {
    if (usernameToCheck.length < 4) {
      setUsernameAvailable(null);
      return null;
    }

    setCheckingUsername(true);
    try {
      const body = new URLSearchParams({
        nome: usernameToCheck,
        numero: usernameToCheck,
      });

      const response = await fetch(
        'https://dashboardmroinstagramvini-online.squareweb.app/verificar-numero',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setUsernameAvailable(null);
        return null;
      }

      if (data?.senhaCorrespondente === true) {
        setUsernameAvailable(false);
        setUsernameError("Usuário já em uso. Utilize outro usuário");
        return false;
      }

      if (data?.senhaCorrespondente === false) {
        setUsernameAvailable(true);
        setUsernameError((prev) =>
          prev === "Usuário já em uso. Utilize outro usuário" ? "" : prev
        );
        return true;
      }

      setUsernameAvailable(null);
      return null;
    } catch {
      setUsernameAvailable(null);
      return null;
    } finally {
      setCheckingUsername(false);
    }
  };

  const validateUsername = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z]/g, "");
    setUsername(cleaned);
    setUsernameAvailable(null);

    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current);
    }

    if (value !== cleaned) {
      setUsernameError("Apenas letras minúsculas, sem espaços ou números");
      return;
    } else if (cleaned.length < 4) {
      setUsernameError("Mínimo de 4 caracteres");
      return;
    } else if (cleaned.length > 20) {
      setUsernameError("Máximo de 20 caracteres");
      return;
    }

    setUsernameError("");

    usernameCheckTimeoutRef.current = setTimeout(() => {
      void checkUsernameAvailability(cleaned);
    }, 500);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Por favor, insira um email válido");
      return;
    }

    if (!phone || phone.replace(/\D/g, "").length < 10) {
      toast.error("Por favor, insira um celular válido com DDD");
      return;
    }

    if (!username || username.length < 4) {
      toast.error("Nome de usuário deve ter no mínimo 4 caracteres");
      return;
    }

    if (usernameError) {
      toast.error(usernameError);
      return;
    }

    if (checkingUsername) {
      toast.error("Aguarde a verificação do usuário");
      return;
    }

    const availability =
      usernameAvailable ?? (await checkUsernameAvailability(username.toLowerCase().trim()));

    if (availability === false) {
      toast.error("Este nome de usuário já está em uso. Escolha outro.");
      return;
    }

    if (availability !== true) {
      toast.error("Não foi possível verificar o usuário. Tente novamente.");
      return;
    }

    setLoading(true);

    try {
      const plan = PLANS[selectedPlan];
      
      const { data: checkData, error: checkError } = await supabase.functions.invoke("create-mro-checkout", {
        body: { 
          email: email.toLowerCase().trim(),
          username: username.toLowerCase().trim(),
          phone: phone.replace(/\D/g, "").trim(),
          planType: selectedPlan,
          amount: plan.price,
          checkUserExists: true
        }
      });

      if (checkError) {
        console.error("Error creating checkout:", checkError);
        toast.error("Erro ao criar link de pagamento. Tente novamente.");
        return;
      }

      if (checkData.userExists) {
        toast.error("Este nome de usuário já está em uso. Escolha outro.");
        setUsernameError("Usuário já existe, escolha outro");
        return;
      }

      if (!checkData.success) {
        toast.error(checkData.error || "Erro ao criar pagamento");
        return;
      }

      window.location.href = checkData.payment_link;

    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    trackPageView('Sales Page - Instagram MRO P');
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('modules-storage', {
          body: { action: 'load-call-settings' }
        });
        if (!error && data?.success && data?.data?.salesPageSettings) {
          setSalesSettings(data.data.salesPageSettings);
        }
      } catch (err) {
        console.error('Error loading sales settings:', err);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 47, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const promoEndDate = new Date('2026-01-06T16:00:00-03:00');
    
    const updatePromoCountdown = () => {
      const now = new Date();
      const diff = promoEndDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setPromoTimeLeft({ days: 0, hours: 0, minutes: 0, expired: true });
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setPromoTimeLeft({ days, hours, minutes, expired: false });
    };
    
    updatePromoCountdown();
    const timer = setInterval(updatePromoCountdown, 60000);
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
    "Acesso a 6 contas simultâneas fixas",
    "5 testes todo mês para testar em seus clientes/outras contas",
    "Área de membros VITALÍCIA",
    "Vídeos estratégicos passo a passo",
    "Grupo VIP no WhatsApp",
    "Suporte prioritário",
    "Atualizações gratuitas para sempre"
  ];

  const affiliateBonus = "Cadastro Afiliado - Comissão de R$97 Por venda";

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
          
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 blur-3xl rounded-full" />
            <h1 className="relative text-3xl md:text-5xl lg:text-6xl font-black mb-4 bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent leading-tight">
              NÃO GASTE MAIS COM ANÚNCIOS
            </h1>
            <h2 className="relative text-xl md:text-3xl lg:text-4xl font-black">
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-shift_3s_ease-in-out_infinite]">
                UTILIZE A MRO INTELIGENTE
              </span>
            </h2>
            <p className="relative mt-3 text-sm md:text-base text-gray-400">
              Instale em seu notebook, macbook ou computador de mesa!
            </p>
            <div className="relative mt-6 inline-block">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-black font-black text-sm md:text-xl lg:text-2xl px-5 py-3 rounded-2xl shadow-lg shadow-green-500/40 animate-pulse leading-snug">
                <span className="block sm:inline">🔥 TESTE AGORA</span>
                <span className="block sm:inline sm:ml-1">30 DIAS POR R$97</span>
              </div>
            </div>
          </div>

          <div className="mt-10 max-w-4xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
              <iframe
                src="https://www.youtube.com/embed/lecSwt54sa0?rel=0&modestbranding=1"
                title="Video MRO"
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          <div className="mt-10 animate-bounce">
            <ChevronDown className="w-10 h-10 text-gray-500 mx-auto" />
          </div>
        </div>
      </section>

      {/* Active Clients Section */}
      <section className="py-8 px-4 bg-gradient-to-b from-gray-950 to-black">
        <ActiveClientsSection title="Clientes Ativos" maxClients={15} />
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
      <section className="py-20 px-4 bg-gradient-to-b from-gray-950 to-black">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-green-950/80 to-black border-2 border-green-500/50 rounded-3xl p-8 md:p-14 text-center shadow-2xl shadow-green-500/10 overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none" />

            {/* Shield icon with ring */}
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute w-28 h-28 rounded-full bg-green-500/10 animate-ping pointer-events-none" style={{animationDuration: '3s'}} />
              <div className="relative w-24 h-24 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center">
                <Shield className="w-12 h-12 text-green-400" />
              </div>
            </div>

            <span className="text-green-400 font-bold text-xs tracking-[0.3em] uppercase">GARANTIA TOTAL</span>
            <h2 className="text-3xl md:text-5xl font-black mt-3 mb-6 leading-tight">
              30 Dias de Resultados <span className="text-green-400">Garantidos</span>
            </h2>

            {/* Main guarantee text */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl px-6 py-5 max-w-2xl mx-auto mb-8">
              <p className="text-white text-lg md:text-xl leading-relaxed">
                Se em <strong className="text-green-400">30 dias</strong> não tiver os resultados prometidos,{" "}
                <strong className="text-white">devolvemos o seu dinheiro.</strong>
              </p>
              <p className="text-green-300 font-bold text-lg mt-2">
                Nós garantimos resultados. Sem risco para você.
              </p>
            </div>

            {/* Guarantee items */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
              {[
                { emoji: "🔒", label: "Compra 100% Segura" },
                { emoji: "💰", label: "Reembolso Garantido" },
                { emoji: "✅", label: "Satisfação ou Dinheiro de Volta" }
              ].map((item, i) => (
                <div key={i} className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 flex items-center gap-2 justify-center">
                  <span className="text-xl">{item.emoji}</span>
                  <span className="text-green-300 text-sm font-semibold">{item.label}</span>
                </div>
              ))}
            </div>

            <p className="text-gray-500 text-sm">
              Garantia válida por 30 dias após a data da compra. Basta entrar em contato pelo WhatsApp.
            </p>
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

          <div className="flex flex-wrap justify-center gap-6">
            {bonusIAFeatures.slice(3).map((feature, i) => (
              <div 
                key={i}
                className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700 rounded-2xl p-6 hover:border-amber-500/50 transition-all duration-300 w-full md:w-[calc(33.333%-1rem)] md:max-w-[350px]"
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
            <h2 className="text-4xl sm:text-5xl md:text-7xl font-black mb-4 leading-tight">
              ESCOLHA SEU <span className="text-amber-400">PLANO</span>
            </h2>
            <p className="text-gray-400 text-lg mb-2">
              A solução definitiva para crescer no Instagram sem gastar com anúncios
            </p>
            <p className="text-green-400 font-bold text-xl">
              🔥 TESTE 30 DIAS AGORA POR R$97
            </p>
          </div>

          {/* Plano Trial - Destaque especial */}
          <div className="max-w-md mx-auto mb-8">
            <div className="relative bg-gradient-to-br from-green-900/60 to-green-800/40 border-2 border-green-400 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl shadow-green-500/30">
              {/* Badge de destaque */}
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 flex gap-2">
                <div className="bg-gradient-to-r from-green-400 to-emerald-400 text-black text-xs font-black px-4 py-1.5 rounded-full whitespace-nowrap shadow-lg">
                  🚀 COMECE HOJE — SEM RECORRÊNCIA
                </div>
              </div>

              {/* Pulse animation ring */}
              <div className="absolute inset-0 rounded-2xl sm:rounded-3xl border-2 border-green-400/30 animate-ping pointer-events-none" style={{animationDuration: '2s'}} />

              <h3 className="text-3xl font-bold mb-1 text-center text-green-300 mt-3">Plano Teste 30 Dias</h3>
              <p className="text-gray-400 text-center mb-6 text-sm">Sem recorrência — pague uma vez e teste por 30 dias</p>

              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl sm:text-7xl font-black text-green-400">R$97</span>
                </div>
                <p className="text-green-300/70 mt-1 text-sm font-medium">Pagamento único • 30 dias de acesso</p>
              </div>

              <div className="space-y-2 mb-6">
                {[
                  "Ferramenta completa para Instagram",
                  "Acesso a 1 conta/negócio disponível",
                  "Área de membros por 30 dias",
                  "Grupo VIP no WhatsApp",
                  "Suporte WhatsApp"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              <Button 
                size="lg"
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-black font-black py-5 rounded-xl hover:scale-105 transition-transform text-lg shadow-lg shadow-green-500/40"
                onClick={() => {
                  trackLead('Instagram MRO P - Plano Teste 30 Dias');
                  setSelectedPlan("trial");
                  setShowCheckoutModal(true);
                }}
              >
                🚀 TESTAR POR R$97 AGORA
              </Button>
              <p className="text-center text-xs text-gray-500 mt-2">Sem cobrança recorrente — sem surpresas</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Plano Anual */}
            <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-blue-500 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl">
              <h3 className="text-2xl font-bold mb-2 text-center text-blue-400">Plano Anual</h3>
              <p className="text-gray-400 text-center mb-6 text-sm">Acesso completo por 12 meses</p>

              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-lg sm:text-xl text-gray-400">12x de</span>
                  <span className="text-5xl sm:text-6xl font-black text-blue-400">R$41</span>
                </div>
                <p className="text-gray-400 mt-2">ou à vista PIX <span className="text-white font-bold">R$397</span></p>
              </div>

              <div className="space-y-2 mb-6">
                {annualFeatures.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                  <span>• {affiliateBonus}</span>
                </div>
              </div>

              <Button 
                size="lg"
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 rounded-xl hover:scale-105 transition-transform"
                onClick={() => {
                  trackLead('Instagram MRO P - Plano Anual');
                  setSelectedPlan("annual");
                  setShowCheckoutModal(true);
                }}
              >
                GARANTIR PLANO ANUAL
              </Button>
            </div>

            {/* Plano Vitalício */}
            <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-amber-500 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl shadow-amber-500/30">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-black px-4 py-1.5 rounded-full whitespace-nowrap">
                  ⭐ MAIS POPULAR
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-2 text-center text-amber-400 mt-2">Plano Vitalício</h3>
              <p className="text-gray-400 text-center mb-6 text-sm">Acesso completo para sempre</p>

              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-lg sm:text-xl text-gray-400">12x de</span>
                  <span className="text-5xl sm:text-6xl font-black text-amber-400">R$81</span>
                </div>
                <p className="text-gray-400 mt-2">ou à vista PIX <span className="text-white font-bold">R$797</span></p>
              </div>

              <div className="space-y-2 mb-6">
                {lifetimeFeatures.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                  <span>• {affiliateBonus}</span>
                </div>
              </div>

              <Button 
                size="lg"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold py-4 rounded-xl hover:scale-105 transition-transform"
                onClick={() => {
                  trackLead('Instagram MRO P - Plano Vitalício');
                  setSelectedPlan("lifetime");
                  setShowCheckoutModal(true);
                }}
              >
                GARANTIR PLANO VITALÍCIO
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
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold text-base sm:text-lg md:text-xl px-6 sm:px-12 py-6 sm:py-8 rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all hover:scale-105 whitespace-normal h-auto min-h-[60px] leading-tight"
            onClick={scrollToPricing}
          >
            <span className="flex items-center justify-center gap-2 flex-wrap text-center">
              <span>GARANTIR MEU ACESSO AGORA</span>
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-800">
        <div className="max-w-6xl mx-auto text-center text-gray-500">
          <img src={logoMro} alt="MRO" className="h-10 mx-auto mb-4 object-contain" />
          <p className="font-medium text-gray-400">Mais Resultados Online</p>
          <p className="text-sm mt-1">Gabriel Fernandes da Silva</p>
          <p className="text-sm mt-1">CNPJ: 54.840.738/0001-96</p>
          <p className="text-sm mt-3">© 2024. Todos os direitos reservados.</p>
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

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCheckoutModal(false)}
        >
          <div 
            className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <button 
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              onClick={() => setShowCheckoutModal(false)}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                selectedPlan === "trial"
                  ? "bg-green-500/20"
                  : selectedPlan === "annual" 
                  ? "bg-blue-500/20" 
                  : "bg-gradient-to-br from-amber-500/20 to-orange-500/20"
              }`}>
                <Sparkles className={`w-7 h-7 ${selectedPlan === "trial" ? "text-green-400" : selectedPlan === "annual" ? "text-blue-400" : "text-amber-400"}`} />
              </div>
              <h3 className="text-xl font-bold text-white">
                Plano {PLANS[selectedPlan].name}
              </h3>
              {selectedPlan === "trial" && (
                <p className="text-xs text-green-400 font-medium mt-1">Sem recorrência • Pague uma vez</p>
              )}
              <p className="text-2xl font-bold mt-2">
                <span className={selectedPlan === "trial" ? "text-green-400" : selectedPlan === "annual" ? "text-blue-400" : "text-amber-400"}>
                  R$ {PLANS[selectedPlan].price.toFixed(2).replace(".", ",")}
                </span>
              </p>
            </div>

            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <label className="text-sm text-zinc-300 flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" />
                  Seu Email
                </label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-600 text-white placeholder:text-zinc-500"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-zinc-300 flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4" />
                  Celular com DDD
                </label>
                <Input
                  type="tel"
                  placeholder="(51) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-600 text-white placeholder:text-zinc-500"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-zinc-300 flex items-center gap-2 mb-2">
                  <User className="w-4 h-4" />
                  Nome de Usuário (será sua senha também)
                </label>
                <Input
                  type="text"
                  placeholder="seuusuario"
                  value={username}
                  onChange={(e) => validateUsername(e.target.value)}
                  className={`bg-zinc-800/50 border-zinc-600 text-white placeholder:text-zinc-500 ${
                    usernameError ? "border-red-500" : ""
                  }`}
                  required
                />
                {usernameError && (
                  <p className="text-xs text-red-400 mt-1">{usernameError}</p>
                )}
                <p className="text-xs text-zinc-500 mt-1">
                  Apenas letras minúsculas, sem espaços ou números
                </p>
              </div>

              <div className="bg-zinc-800/30 rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Usuário/Senha</span>
                  <span className="text-white font-mono">{username || "---"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Total</span>
                  <span className={`font-bold ${selectedPlan === "trial" ? "text-green-400" : selectedPlan === "annual" ? "text-blue-400" : "text-amber-400"}`}>
                    R$ {PLANS[selectedPlan].price.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                {selectedPlan === "trial" && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Acesso</span>
                    <span className="text-green-400 font-medium">30 dias • Sem recorrência</span>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className={`w-full font-bold py-5 ${
                  selectedPlan === "trial"
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-black"
                    : selectedPlan === "annual"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black"
                }`}
                disabled={loading || !!usernameError || !username || !email || !phone}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Ir para Pagamento
                  </>
                )}
              </Button>

              <p className="text-xs text-zinc-500 text-center">
                Após o pagamento, seu acesso será liberado automaticamente
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstagramNovaP;
