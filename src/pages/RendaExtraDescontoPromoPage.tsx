import { useState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { trackPageView, trackInitiateCheckout, trackFacebookEvent } from "@/lib/facebookTracking";
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
  Phone,
  Timer,
  AlertTriangle,
  Send,
  Filter,
  TrendingUp,
  BarChart3,
  FileText,
  Rocket,
  Crown,
  Flame,
  MousePointerClick,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import logoMro from "@/assets/logo-mro.png";
import bonus5mil from "@/assets/bonus-5mil.png";
import ActiveClientsSection from "@/components/ActiveClientsSection";
import PromoToolVideoSection from "@/components/PromoToolVideoSection";

const RendaExtraDescontoPromoPage = () => {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [isMainVideoPlaying, setIsMainVideoPlaying] = useState(false);
  const [isDiscountActive, setIsDiscountActive] = useState(true);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  // Access gate: requires registered email with >=50% video watched on /rendaextra/desconto
  const [accessState, setAccessState] = useState<'checking' | 'allowed' | 'denied'>('checking');
  const [accessName, setAccessName] = useState<string>('');
  const [accessDenyReason, setAccessDenyReason] = useState<string>('Voce precisa assistir pelo menos 50% do video em /rendaextra/desconto para liberar essa pagina.');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailFromUrl = (params.get('email') || '').trim().toLowerCase();
    const emailFromStorage = (() => { try { return localStorage.getItem('rendaextra-desconto:email') || ''; } catch { return ''; } })();
    const email = emailFromUrl || emailFromStorage;
    if (!email) {
      setAccessDenyReason('Acesso restrito. Verifique seu email em /rendaextra/desconto para liberar esta pagina.');
      setAccessState('denied');
      return;
    }
    supabase.functions.invoke('rendaextra-desconto-access', {
      body: { action: 'check_access', email },
    }).then(({ data, error }) => {
      if (error || !data?.success) {
        setAccessDenyReason('Email nao encontrado. Cadastre-se em /rendaextra primeiro.');
        setAccessState('denied');
        return;
      }
      if (!data.allowed) {
        setAccessDenyReason('Voce ainda nao assistiu 50% do video. Acesse /rendaextra/desconto para liberar.');
        setAccessState('denied');
        return;
      }
      setAccessName(data.name || '');
      try {
        localStorage.setItem('rendaextra-desconto:email', data.email);
        if (data.name) localStorage.setItem('rendaextra-desconto:name', data.name);
      } catch {}
      setAccessState('allowed');
    }).catch(() => {
      setAccessDenyReason('Erro ao verificar acesso. Tente novamente.');
      setAccessState('denied');
    });
  }, []);
  
  // Popup de desconto encerrado - agora controlado pelo banco de dados
  const [showDiscountEndedPopup, setShowDiscountEndedPopup] = useState(false);
  
  // Countdown para promoção - 8 horas a partir do primeiro acesso
  const [promoTimeLeft, setPromoTimeLeft] = useState({ hours: 8, minutes: 0, seconds: 0, expired: false });
  const pricingRef = useRef<HTMLDivElement>(null);
  
  // Modal de cadastro
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [loading, setLoading] = useState(false);

  const planConfig = {
    monthly: { label: '30 dias por R$99', amount: 99, planType: 'monthly', priceDisplay: 'R$99', durationDisplay: '30 dias de acesso' },
    annual: { label: '12x R$30 (R$297 à vista)', amount: 297, planType: 'annual', priceDisplay: 'R$297', durationDisplay: '1 ano completo' },
  } as const;


  // Validar username: apenas letras minúsculas, sem espaços, sem números
  const validateUsername = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z]/g, "");
    setUsername(cleaned);
    
    if (value !== cleaned) {
      setUsernameError("Apenas letras minúsculas, sem espaços ou números");
    } else if (cleaned.length < 4) {
      setUsernameError("Mínimo de 4 caracteres");
    } else if (cleaned.length > 20) {
      setUsernameError("Máximo de 20 caracteres");
    } else {
      setUsernameError("");
    }
  };

  // Criar checkout e abrir pagamento
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

    setLoading(true);

    try {
      const plan = planConfig[selectedPlan];
      const { data: checkData, error: checkError } = await supabase.functions.invoke("create-mro-checkout", {
        body: { 
          email: email.toLowerCase().trim(),
          username: username.toLowerCase().trim(),
          phone: phone.replace(/\D/g, "").trim(),
          planType: plan.planType,
          amount: plan.amount,
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

      // Track InitiateCheckout when redirecting to payment
      trackInitiateCheckout(`MRO Renda Extra Desconto - ${planConfig[selectedPlan].label}`, planConfig[selectedPlan].amount);
      
      // Redirecionar diretamente para o checkout (funciona melhor no mobile)
      window.location.href = checkData.payment_link;
      
      // Resetar form
      setEmail("");
      setUsername("");
      setPhone("");

    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Track PageView on mount and fetch settings
  useEffect(() => {
    trackPageView('Sales Page - Instagram MRO Promo 2');
    
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("desconto_alunos_settings")
          .select("is_active")
          .single();
        
        if (!error && data) {
          setIsDiscountActive(data.is_active);
          if (!data.is_active) {
            setShowDiscountEndedPopup(true);
          }
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      } finally {
        setIsSettingsLoading(false);
      }
    };
    
    fetchSettings();
  }, []);

  // Countdown de 7 horas - SEMPRE reinicia quando entra na página (NUNCA expira)
  useEffect(() => {
    // Definir tempo de promoção como 7 horas a partir de AGORA (a cada visita)
    const PROMO_DURATION = 7 * 60 * 60 * 1000; // 7 horas em milissegundos
    const promoEndTime = Date.now() + PROMO_DURATION;
    
    const updateCountdown = () => {
      const currentTime = Date.now();
      const diff = promoEndTime - currentTime;
      
      // Nunca expira - se chegar a 0, mostra 0:0:0 mas não marca como expirado
      if (diff <= 0) {
        setPromoTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: false });
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setPromoTimeLeft({ hours, minutes, seconds, expired: false });
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
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

  const planFeatures = [
    "Ferramenta completa para Instagram",
    "Acesso a 4 contas simultâneas fixas",
    "5 testes todo mês para testar em seus clientes/outras contas",
    "Área de membros por 1 ano",
    "Vídeos estratégicos passo a passo",
    "Grupo VIP no WhatsApp",
    "Suporte prioritário"
  ];

  if (accessState === 'checking') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-green-400" />
          <p className="text-white/60 text-sm">Verificando seu acesso...</p>
        </div>
      </div>
    );
  }

  if (accessState === 'denied') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900/80 border border-amber-500/30 rounded-3xl p-7 md:p-9 text-center shadow-2xl">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/15 text-amber-400 mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight mb-2">Acesso restrito</h2>
          <p className="text-white/60 text-sm md:text-base mb-6">{accessDenyReason}</p>
          <a
            href="/rendaextra/desconto"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-sm transition-all"
          >
            Liberar acesso <ArrowRight className="w-4 h-4" />
          </a>
          <p className="text-white/40 text-xs mt-5">
            Ainda nao cadastrou? <a href="/rendaextra" className="text-amber-400 underline">Cadastre-se em /rendaextra</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <style>{`
        .btn-pulse-color {
          background: linear-gradient(to right, #facc15, #eab308) !important;
          border: none;
        }
        @keyframes bounceArrowRight {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(8px); }
        }
        @keyframes bounceArrowLeft {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-8px); }
        }
        .arrow-bounce-right {
          animation: bounceArrowRight 1s ease-in-out infinite;
        }
        .arrow-bounce-left {
          animation: bounceArrowLeft 1s ease-in-out infinite;
        }
      `}</style>
      {/* Popup Desconto Encerrado */}
      {showDiscountEndedPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
          <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-2 border-red-500 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center relative animate-in zoom-in-95 duration-300 shadow-[0_0_50px_rgba(239,68,68,0.3)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="bg-red-600 text-white font-bold px-4 py-1.5 rounded-full text-sm">
                ⚠️ AVISO
              </div>
            </div>
            
            <div className="mt-4 mb-6">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Desconto Encerrado!
              </h2>
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-2">
                Aguarde um próximo desconto para alunos renda extra.
              </p>
              <p className="text-red-400 font-bold text-sm sm:text-base">
                Consulte os administradores para mais informações.
              </p>
            </div>
            
            <Button 
              onClick={() => window.location.href = '/instagram-nova'}
              className="w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold text-lg py-5 rounded-xl border border-gray-600"
            >
              Página Oficial <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            
            {!isDiscountActive ? (
              <div className="mt-6 p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
                <p className="text-xs text-red-400">
                  Esta oferta foi encerrada temporariamente pela administração.
                </p>
              </div>
            ) : (
              <button 
                onClick={() => setShowDiscountEndedPopup(false)}
                className="mt-4 text-gray-400 hover:text-white text-sm underline"
              >
                Continuar na página mesmo assim
              </button>
            )}
          </div>
        </div>
      )}

      {/* Urgency Banner */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-red-600 via-orange-500 to-red-600 py-2 px-2">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-1 sm:gap-3 text-center flex-wrap">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 animate-pulse hidden sm:block" />
          <span className="text-xs sm:text-sm md:text-base font-bold text-white leading-tight">
            🎓 DESCONTO ESPECIAL PARA ALUNOS DO RENDA EXTRA! Aproveite em{" "}
            <span className="bg-black/30 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-yellow-300 font-mono text-xs sm:text-sm">
              {promoTimeLeft.expired ? "EXPIRADO" : 
                `${String(promoTimeLeft.hours).padStart(2, '0')}:${String(promoTimeLeft.minutes).padStart(2, '0')}:${String(promoTimeLeft.seconds).padStart(2, '0')}`
              }
            </span>
          </span>
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 animate-pulse hidden sm:block" />
        </div>
      </div>

      {/* Header removido conforme solicitação */}

      {/* Hero Section */}
      <section className="relative pt-16 sm:pt-20 md:pt-24 pb-10 sm:pb-16 px-3 sm:px-4">
        <div className="max-w-5xl mx-auto text-center">
          
          <img src={logoMro} alt="MRO" className="h-16 sm:h-20 md:h-28 mx-auto mb-6 sm:mb-8 object-contain" />
          
          {/* Animated Title */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 blur-3xl rounded-full" />
            <h1 className="relative text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black mb-3 sm:mb-4 px-2">
              <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">FATURE MAIS DE R$5.000</span>
            </h1>
            <h2 className="relative text-lg sm:text-xl md:text-3xl lg:text-4xl font-black mb-3">
              <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-400 bg-clip-text text-transparent">
                TRABALHANDO DE CASA!
              </span>
            </h2>
            <p className="relative mt-3 text-sm sm:text-base md:text-lg text-gray-300 max-w-3xl mx-auto">
              Renda extra automática e real! Com apenas 1 computador ou notebook, instale a ferramenta MRO e comece a faturar de qualquer lugar do mundo.
            </p>
          </div>

          {/* Renda Extra Badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600/30 to-emerald-600/30 border border-green-500/50 rounded-full px-4 sm:px-6 py-2 mt-6">
            <Laptop className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
            <span className="text-white font-bold text-xs sm:text-sm">20 MINUTOS ANTES DE DORMIR = RENDA EXTRA AUTOMÁTICA</span>
            <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
          </div>


          {/* Main Video removed - access already gated by email verification */}

          {/* CTA Button with arrows */}
          <div className="relative mt-8 sm:mt-10 flex items-center justify-center gap-2 sm:gap-4">
            <span className="arrow-bounce-right text-white text-2xl sm:text-3xl">▶</span>
            <Button 
              onClick={scrollToPricing}
              className="btn-pulse-color text-black font-bold text-sm sm:text-lg px-6 sm:px-10 py-5 sm:py-6 rounded-full shadow-lg shadow-yellow-500/30"
            >
              COMECE AGORA POR R$99 <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <span className="arrow-bounce-left text-white text-2xl sm:text-3xl">◀</span>
          </div>
          <p className="mt-3 text-sm sm:text-base text-yellow-300 font-bold">
            🔥 Conheça o sistema por 30 dias por apenas R$99 — depois escale para o plano anual!
          </p>

        </div>
      </section>

      {/* === VIDEO: VEJA COMO A FERRAMENTA TRABALHA === */}
      <PromoToolVideoSection />

      {/* === COMO FUNCIONA A RENDA EXTRA === */}
      <section className="py-16 sm:py-20 px-3 sm:px-4 bg-gradient-to-b from-gray-950 to-black">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 sm:px-6 py-2 mb-4">
              <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
              <span className="text-green-400 font-bold text-xs sm:text-sm">SUA RENDA EXTRA</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black mb-4">
              COMO VOCÊ VAI <span className="text-green-400">FATURAR</span>
            </h2>
            <p className="text-gray-300 text-sm sm:text-lg max-w-3xl mx-auto">
              Seja uma <strong className="text-white">EUGência de Marketing Digital</strong> — preste serviço para empresas usando a ferramenta MRO e cobre mensalidade deles!
            </p>
          </div>

          {/* Business Model Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
            {[
              { icon: Monitor, title: "Instale no seu computador", desc: "Com apenas 1 notebook ou PC, você já pode começar a trabalhar de casa ou de qualquer lugar", color: "from-blue-600 to-cyan-600", border: "border-blue-500/40" },
              { icon: Clock, title: "20 min antes de dormir", desc: "Configure a ferramenta em 20 minutos, deixe rodando automaticamente durante toda a madrugada", color: "from-purple-600 to-pink-600", border: "border-purple-500/40" },
              { icon: CreditCard, title: "Cobre mensalidade", desc: "Ofereça o serviço para empresas e cobre uma mensalidade para rodar a ferramenta na sua máquina", color: "from-green-600 to-emerald-600", border: "border-green-500/40" },
            ].map((item, i) => (
              <div key={i} className={`bg-gray-900/80 border-2 ${item.border} rounded-2xl p-6 sm:p-8 text-center`}>
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-lg sm:text-xl font-bold text-white mb-2">{item.title}</h4>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* What you offer to companies */}
          <div className="bg-gradient-to-br from-amber-950/50 to-orange-950/50 border-2 border-amber-500/40 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10">
            <div className="text-center mb-6">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-amber-300 mb-2">
                💼 O que você oferece para empresas?
              </h3>
              <p className="text-gray-400 text-sm sm:text-base">Você traz resultados reais e elas pagam você por isso!</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { icon: TrendingUp, text: "Mais vendas", color: "text-green-400" },
                { icon: Users, text: "Mais clientes", color: "text-blue-400" },
                { icon: UserPlus, text: "Mais seguidores", color: "text-purple-400" },
                { icon: Brain, text: "Estratégias automáticas", color: "text-amber-400" },
              ].map((item, i) => (
                <div key={i} className="bg-black/40 border border-amber-500/20 rounded-xl p-4 sm:p-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <span className="text-white font-bold text-sm sm:text-base">{item.text}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 sm:mt-8 bg-green-500/15 border border-green-500/30 rounded-xl p-4 text-center">
              <p className="text-green-300 font-bold text-sm sm:text-lg">
                💰 Com 5 clientes pagando R$1.000/mês cada, você já fatura R$5.000 de casa!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* === PASSO A PASSO PARA FATURAR 5 MIL === */}
      <section className="py-16 sm:py-20 px-3 sm:px-4 bg-gradient-to-b from-black to-gray-950">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 sm:px-6 py-2 mb-6">
            <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            <span className="text-amber-400 font-bold text-xs sm:text-sm">BÔNUS EXCLUSIVO</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4">
            Você vai receber o <span className="text-green-400">passo a passo completo</span> para faturar seus 5 mil!
          </h2>
          <p className="text-gray-300 text-sm sm:text-lg max-w-3xl mx-auto mb-8 sm:mb-10">
            Desde como se posicionar para começar, até fechar contratos e entregar testes ao cliente — além de materiais disponíveis para divulgação.
          </p>
          <div className="rounded-2xl overflow-hidden border-2 border-amber-500/30 shadow-2xl shadow-amber-500/10">
            <img src={bonus5mil} alt="Passo a passo para faturar mais de 5 mil com a ferramenta MRO" className="w-full h-auto" />
          </div>
        </div>
      </section>

      {/* === FEEDBACKS DE ALUNOS - VÍDEO CARROSSEL === */}
      <section className="py-16 sm:py-20 px-3 sm:px-4 bg-gradient-to-b from-gray-950 to-black">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 sm:px-6 py-2 mb-4">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
              <span className="text-green-400 font-bold text-xs sm:text-sm">RESULTADOS REAIS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3">
              Alunos faturando <span className="text-green-400">mais de R$5.000</span>
            </h2>
            <p className="text-gray-400 text-sm sm:text-base">
              Veja os feedbacks de quem já está lucrando com prestação de serviço usando a ferramenta MRO
            </p>
          </div>

          <div className="relative">
            <button
              onClick={() => {
                const el = document.getElementById('feedback-carousel');
                if (el) el.scrollBy({ left: -260, behavior: 'smooth' });
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-800/80 hover:bg-green-500/80 border border-gray-700 hover:border-green-400 flex items-center justify-center transition-all -ml-2 sm:-ml-4 shadow-lg"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('feedback-carousel');
                if (el) el.scrollBy({ left: 260, behavior: 'smooth' });
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-800/80 hover:bg-green-500/80 border border-gray-700 hover:border-green-400 flex items-center justify-center transition-all -mr-2 sm:-mr-4 shadow-lg"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>

            <div
              id="feedback-carousel"
              className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory cursor-grab active:cursor-grabbing px-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
              onMouseDown={(e) => {
                const el = e.currentTarget;
                el.dataset.dragging = 'true';
                el.dataset.startX = String(e.pageX - el.offsetLeft);
                el.dataset.scrollLeft = String(el.scrollLeft);
              }}
              onMouseMove={(e) => {
                const el = e.currentTarget;
                if (el.dataset.dragging !== 'true') return;
                e.preventDefault();
                const x = e.pageX - el.offsetLeft;
                const walk = (x - Number(el.dataset.startX)) * 1.5;
                el.scrollLeft = Number(el.dataset.scrollLeft) - walk;
              }}
              onMouseUp={(e) => { e.currentTarget.dataset.dragging = 'false'; }}
              onMouseLeave={(e) => { e.currentTarget.dataset.dragging = 'false'; }}
            >
              {[
                { id: "eFEZ_jysYvU", title: "Feedback 1" },
                { id: "gRe-VlScXjo", title: "Feedback 2" },
                { id: "wfU12IHauN8", title: "Feedback 3" },
                { id: "8o8ut9yxmnk", title: "Feedback 4" },
                { id: "cZA5lEH8rpE", title: "Feedback 5" },
                { id: "ct5U0Cp61YA", title: "Feedback 6" },
              ].map((video, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[180px] sm:w-[220px] md:w-[240px] snap-start cursor-pointer group select-none"
                  onClick={(e) => {
                    const el = document.getElementById('feedback-carousel');
                    if (el?.dataset.dragging === 'true') return;
                    openVideo(video.id);
                  }}
                >
                  <div className="relative aspect-[9/16] rounded-xl sm:rounded-2xl overflow-hidden border-2 border-green-500/30 group-hover:border-green-400 transition-all shadow-lg group-hover:shadow-green-500/20">
                    <img
                      src={`https://img.youtube.com/vi/${video.id}/0.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-500/90 group-hover:bg-green-500 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white ml-1" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      <section className="py-10 sm:py-12 px-3 sm:px-4 bg-gradient-to-b from-black to-gray-950">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-xl sm:text-2xl font-bold text-center mb-6 text-white">
            Como funciona <span className="text-cyan-400">na prática</span>
          </h3>
          <p className="text-center text-gray-300 text-sm sm:text-base mb-6 max-w-2xl mx-auto">
            Você vai prestar esse serviço para <span className="text-green-400 font-semibold">empresas e negócios locais</span> — e eles vão te pagar uma <span className="text-green-400 font-semibold">mensalidade recorrente</span> pelo trabalho automático que a ferramenta faz por você.
          </p>
          <div className="grid gap-3">
            {[
              { step: "01", title: "Feche um cliente (empresa/negócio local)", desc: "Ofereça o serviço de automação no Instagram e cobre uma mensalidade recorrente" },
              { step: "02", title: "Ative o seguir + curtir em massa", desc: "O sistema interage com perfis estratégicos automaticamente para o cliente" },
              { step: "03", title: "Pessoas interessadas seguem o cliente de volta", desc: "Quem se identifica com o conteúdo passa a seguir o perfil" },
              { step: "04", title: "Envie Direct em massa automaticamente", desc: "Mensagens otimizadas são enviadas para leads qualificados" },
              { step: "05", title: "O cliente vende mais e te paga todo mês", desc: "Resultado real = cliente satisfeito pagando mensalidade recorrente pra você" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-gray-900/60 border border-gray-800 rounded-xl p-3 sm:p-4">
                <span className="text-cyan-400 font-black text-lg shrink-0">{item.step}</span>
                <div>
                  <p className="text-white font-semibold text-sm sm:text-base">{item.title}</p>
                  <p className="text-gray-500 text-xs sm:text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm sm:text-base text-gray-400 mt-5">
            Mais seguidores → Mais conversas → <span className="text-green-400 font-bold">Mais vendas</span>
          </p>
        </div>
      </section>




      <section ref={pricingRef} className="py-10 sm:py-16 px-3 sm:px-4 bg-gradient-to-b from-gray-950 to-black">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-center mb-3 sm:mb-4">
            <span className="text-green-400">OFERTA ESPECIAL</span>
          </h2>
          <p className="text-center text-gray-400 mb-8 sm:mb-10 text-base sm:text-lg">Escolha seu plano e comece agora</p>

          <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
            {/* === PLANO 30 DIAS - POPULAR === */}
            <div className="bg-gradient-to-b from-yellow-950/40 to-gray-950 border-2 border-yellow-400 rounded-2xl sm:rounded-3xl p-5 sm:p-7 relative overflow-hidden shadow-2xl shadow-yellow-500/20 md:scale-105">
              <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black px-4 sm:px-6 py-1.5 sm:py-2 rounded-b-xl text-xs sm:text-sm whitespace-nowrap flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> MAIS POPULAR
                </div>
              </div>

              <div className="text-center mt-6 mb-5">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black mb-2 text-yellow-300">CONHEÇA POR 30 DIAS</h3>
                <p className="text-gray-400 text-xs sm:text-sm mb-4">Comece pequeno, valide e depois escale</p>

                <div className="text-yellow-300 mb-1">
                  <span className="text-5xl sm:text-6xl md:text-7xl font-black">R$99</span>
                </div>
                <p className="text-gray-300 text-base sm:text-lg mb-3">
                  por <span className="text-white font-bold">30 dias de acesso completo</span>
                </p>

                <div className="inline-flex items-center gap-2 bg-yellow-500/15 border border-yellow-400/40 rounded-full px-4 py-2">
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span className="text-yellow-200 font-bold text-xs sm:text-sm">Conheça o sistema e depois evolua seu plano</span>
                </div>
              </div>

              <div className="space-y-2.5 mb-6">
                {planFeatures.slice(0, 5).map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-200 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => {
                  if (promoTimeLeft.expired) { toast.error("Promoção expirada!"); return; }
                  setSelectedPlan('monthly');
                  setShowCheckoutModal(true);
                }}
                disabled={promoTimeLeft.expired}
                className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-base sm:text-xl py-5 sm:py-7 rounded-xl shadow-lg shadow-yellow-500/40 disabled:opacity-50"
              >
                ADQUIRIR POR R$99 <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <p className="text-center text-yellow-300/80 text-xs mt-2 font-semibold">30 dias por R$99 — depois escale!</p>
            </div>

            {/* === PLANO ANUAL === */}
            <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-2 border-green-500 rounded-2xl sm:rounded-3xl p-5 sm:p-7 relative overflow-hidden">
              <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold px-4 sm:px-6 py-1.5 sm:py-2 rounded-b-xl text-xs sm:text-sm whitespace-nowrap">
                  🔥 MELHOR CUSTO-BENEFÍCIO
                </div>
              </div>

              <div className="text-center mt-6 mb-5">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Plano Anual Completo</h3>
                <div className="mb-1">
                  <span className="text-gray-500 line-through text-base sm:text-lg">De R$ 397</span>
                </div>
                <div className="text-green-400 mb-1">
                  <span className="text-4xl sm:text-5xl md:text-6xl font-black">12X R$30</span>
                </div>
                <p className="text-gray-300 text-base sm:text-lg mb-3">
                  avista <span className="text-white font-bold">R$297 por 1 ano todo</span>
                </p>
                <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/40 rounded-full px-4 py-2">
                  <Gift className="w-4 h-4 text-red-300" />
                  <span className="text-red-200 font-bold text-xs sm:text-sm">R$100 DE DESCONTO</span>
                </div>
              </div>

              <div className="space-y-2.5 mb-6">
                {planFeatures.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-200 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => {
                  if (promoTimeLeft.expired) { toast.error("Promoção expirada!"); return; }
                  setSelectedPlan('annual');
                  setShowCheckoutModal(true);
                }}
                disabled={promoTimeLeft.expired}
                className="w-full btn-pulse-color text-black font-bold text-base sm:text-xl py-5 sm:py-7 rounded-xl shadow-lg shadow-green-500/30 disabled:opacity-50"
              >
                QUERO O PLANO ANUAL
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 sm:gap-4 mt-6 text-xs sm:text-sm text-gray-400 flex-wrap">
            <div className="flex items-center gap-1"><Shield className="w-4 h-4" /><span>Compra Segura</span></div>
            <div className="flex items-center gap-1"><CreditCard className="w-4 h-4" /><span>PIX ou Cartão</span></div>
          </div>
        </div>
      </section>


      {/* Garantia */}
      <section className="py-10 sm:py-16 px-3 sm:px-4 bg-black">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl sm:rounded-2xl p-5 sm:p-8">
            <div className="flex flex-col items-center gap-4 sm:gap-6 text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-green-400 mb-2 sm:mb-3">
                  30 Dias de Resultados Garantidos
                </h3>
                <p className="text-gray-300 text-sm sm:text-base">
                  Nós garantimos engajamento, clientes, público e vendas utilizando nossa ferramenta de modo contínuo. 
                  Se em 30 dias você não estiver completamente satisfeito, devolvemos <strong className="text-white">100% do seu investimento!</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 sm:py-16 px-3 sm:px-4 bg-gradient-to-b from-gray-950 to-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl md:text-4xl font-bold mb-4 sm:mb-6">
            Não perca essa <span className="text-green-400">oportunidade única!</span>
          </h2>
          
          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8">
            <Timer className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 animate-pulse" />
            <span className="text-base sm:text-xl font-bold">
              Oferta expira em{" "}
              <span className="text-red-500 font-mono">
                {promoTimeLeft.expired ? "EXPIRADO" : 
                  `${String(promoTimeLeft.hours).padStart(2, '0')}:${String(promoTimeLeft.minutes).padStart(2, '0')}:${String(promoTimeLeft.seconds).padStart(2, '0')}`
                }
              </span>
            </span>
          </div>
          
          <Button 
            onClick={() => {
              if (promoTimeLeft.expired) { toast.error("Promoção expirada!"); return; }
              setSelectedPlan('monthly');
              scrollToPricing();
            }}
            disabled={promoTimeLeft.expired}
            className="btn-pulse-color text-black font-bold text-sm sm:text-xl px-6 sm:px-12 py-5 sm:py-7 rounded-full shadow-lg shadow-yellow-500/30 disabled:opacity-50"
          >
            {promoTimeLeft.expired ? "PROMOÇÃO EXPIRADA" : "COMECE AGORA POR R$99"}
          </Button>

          <div className="flex items-center justify-center gap-2 sm:gap-4 mt-3">
            <span className="arrow-bounce-right text-white text-xl sm:text-2xl">▶</span>
            <span className="text-white text-xs sm:text-sm font-semibold">CLIQUE ACIMA</span>
            <span className="arrow-bounce-left text-white text-xl sm:text-2xl">◀</span>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {showVideoModal && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-2 sm:p-4"
          onClick={() => setShowVideoModal(false)}
        >
          <button 
            className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white hover:text-gray-300 z-10"
            onClick={() => setShowVideoModal(false)}
          >
            <X className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
          <div className="w-full max-w-sm aspect-[9/16] max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <iframe
              src={`https://www.youtube.com/embed/${currentVideoUrl}?autoplay=1&rel=0`}
              className="w-full h-full rounded-xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-green-500/30 rounded-xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 relative my-4">
            <button 
              onClick={() => setShowCheckoutModal(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            
            <div className="text-center mb-4 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Finalize seu Cadastro</h3>
              <div className="text-2xl sm:text-3xl font-bold text-green-400">
                {planConfig[selectedPlan].priceDisplay}
              </div>
              <p className="text-gray-400 text-xs sm:text-sm">{planConfig[selectedPlan].durationDisplay}</p>
            </div>


            
            <form onSubmit={handleCheckout} className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs sm:text-sm text-gray-400 mb-1 block">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  E-mail
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="bg-gray-800 border-gray-700 text-white text-sm sm:text-base"
                  required
                />
              </div>
              
              <div>
                <label className="text-xs sm:text-sm text-gray-400 mb-1 block">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  Celular com DDD
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="bg-gray-800 border-gray-700 text-white text-sm sm:text-base"
                  required
                />
              </div>
              
              <div>
                <label className="text-xs sm:text-sm text-gray-400 mb-1 block">
                  <User className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  Nome de usuário (login)
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => validateUsername(e.target.value)}
                  placeholder="seunome"
                  className={`bg-gray-800 border-gray-700 text-white text-sm sm:text-base ${usernameError ? 'border-red-500' : ''}`}
                  required
                />
                {usernameError && (
                  <p className="text-red-400 text-[10px] sm:text-xs mt-1">{usernameError}</p>
                )}
                <p className="text-gray-500 text-[10px] sm:text-xs mt-1">
                  Apenas letras minúsculas, sem espaços ou números
                </p>
              </div>
              
              <Button
                type="submit"
                disabled={loading || promoTimeLeft.expired}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-5 sm:py-6 rounded-xl text-sm sm:text-base"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    PAGAR AGORA
                  </>
                )}
              </Button>
            </form>
            
            <div className="flex items-center justify-center gap-2 mt-3 sm:mt-4 text-[10px] sm:text-xs text-gray-500">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Pagamento 100% seguro via InfiniPay</span>
            </div>
          </div>
        </div>
      )}

      {/* Active Clients */}
      <section className="py-8 px-4 bg-gradient-to-b from-gray-950 to-black">
        <ActiveClientsSection title="Clientes Ativos" maxClients={15} showRegistration={false} />
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-3 sm:px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center text-gray-500 text-xs sm:text-sm">
          <p>© 2025 MRO - Mais Resultados Online. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default RendaExtraDescontoPromoPage;