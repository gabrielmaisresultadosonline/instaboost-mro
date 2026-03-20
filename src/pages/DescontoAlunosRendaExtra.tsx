import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { trackPageView } from "@/lib/facebookTracking";
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
  MousePointerClick
} from "lucide-react";
import logoMro from "@/assets/logo-mro.png";
import bonus5mil from "@/assets/bonus-5mil.png";
import ActiveClientsSection from "@/components/ActiveClientsSection";

const DescontoAlunosRendaExtra = () => {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [isMainVideoPlaying, setIsMainVideoPlaying] = useState(false);
  
  // Popup de desconto encerrado - desativado nesta página
  const [showDiscountEndedPopup, setShowDiscountEndedPopup] = useState(false);
  
  // Countdown para promoção - 8 horas a partir do primeiro acesso
  const [promoTimeLeft, setPromoTimeLeft] = useState({ hours: 8, minutes: 0, seconds: 0, expired: false });
  const pricingRef = useRef<HTMLDivElement>(null);
  
  // Modal de cadastro
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [loading, setLoading] = useState(false);

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
      // Preço promocional: R$300
      const { data: checkData, error: checkError } = await supabase.functions.invoke("create-mro-checkout", {
        body: { 
          email: email.toLowerCase().trim(),
          username: username.toLowerCase().trim(),
          phone: phone.replace(/\D/g, "").trim(),
          planType: "annual",
          amount: 300,
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

      // Redirecionar diretamente para o checkout (funciona melhor no mobile)
      // Usar location.href ao invés de window.open para evitar bloqueio de popup
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

  // Track PageView on mount
  useEffect(() => {
    trackPageView('Sales Page - Instagram MRO Promo 2');
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

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <style>{`
        @keyframes btnPulseColor {
          0%, 100% { background: linear-gradient(to right, #22c55e, #059669); }
          50% { background: linear-gradient(to right, #f97316, #ea580c); }
        }
        .btn-pulse-color {
          animation: btnPulseColor 2s ease-in-out infinite;
          border: none;
        }
      `}</style>
      {/* Popup Desconto Encerrado */}
      {showDiscountEndedPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-2 border-red-500 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center relative animate-in zoom-in-95 duration-300">
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
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
                Aguarde um próximo desconto ou siga para página oficial para adquirir o plano hoje
              </p>
            </div>
            
            <Button 
              onClick={() => window.location.href = '/instagram-nova'}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-lg py-5 rounded-xl shadow-lg shadow-green-500/30"
            >
              Acessar Página <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            
            <button 
              onClick={() => setShowDiscountEndedPopup(false)}
              className="mt-4 text-gray-400 hover:text-white text-sm underline"
            >
              Continuar na página mesmo assim
            </button>
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
          {/* Special Discount Badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-full px-4 sm:px-6 py-2 sm:py-3 mb-4 sm:mb-6 animate-bounce">
            <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" />
            <span className="font-bold text-sm sm:text-lg">DESCONTO ESPECIAL PARA ALUNOS DO RENDA EXTRA</span>
          </div>
          
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


          {/* Main Video */}
          <div className="mt-8 sm:mt-10 max-w-4xl mx-auto">
            <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-green-500/30">
              <div className="aspect-video">
                <iframe 
                  src="https://www.youtube.com/embed/WQwnAHNvSMU?rel=0&modestbranding=1" 
                  title="Video MRO"
                  className="w-full h-full" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen 
                />
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <Button 
            onClick={scrollToPricing}
            className="mt-8 sm:mt-10 btn-pulse-color text-white font-bold text-sm sm:text-lg px-6 sm:px-10 py-5 sm:py-6 rounded-full shadow-lg shadow-green-500/30"
          >
            GARANTIR MEU DESCONTO AGORA <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>
      </section>

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

      {/* ====== COMO FUNCIONA NA PRÁTICA ====== */}
      <section className="py-16 sm:py-20 px-3 sm:px-4 bg-gradient-to-b from-black to-gray-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full px-4 sm:px-6 py-2 mb-4">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
              <span className="text-cyan-400 font-bold text-xs sm:text-sm">COMO FUNCIONA</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black mb-4">
              COMO FUNCIONA <span className="text-cyan-400">NA PRÁTICA</span>
            </h2>
            <p className="text-gray-400 text-sm sm:text-lg">A nova lógica está muito mais estratégica e assertiva</p>
          </div>

          <div className="relative">
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/50 via-amber-500/50 to-green-500/50 -translate-x-1/2" />
            {[
              { step: "01", icon: UserPlus, title: "Ative o seguir + curtir em massa", desc: "O sistema começa a interagir com perfis estratégicos automaticamente", color: "cyan" },
              { step: "02", icon: Users, title: "Pessoas interessadas te seguem de volta", desc: "Quem se identifica com seu conteúdo e nicho passa a te seguir", color: "blue" },
              { step: "03", icon: Filter, title: "O sistema identifica o público quente", desc: "Filtros inteligentes separam quem realmente tem interesse", color: "purple" },
              { step: "04", icon: Send, title: "Envie Direct em massa automaticamente", desc: "Mensagens otimizadas são enviadas para leads qualificados", color: "amber" },
              { step: "05", icon: Rocket, title: "Direcione para seu produto ou serviço", desc: "Converta seguidores em clientes reais com estratégia", color: "green" },
            ].map((item, i) => (
              <div key={i} className={`relative flex items-center gap-4 sm:gap-6 mb-6 sm:mb-8 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                  <div className="bg-gray-900/80 border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-gray-600 transition-colors">
                    <div className="flex items-center gap-3 mb-2" style={{ justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
                      <span className="text-2xl sm:text-3xl font-black text-gray-700">{item.step}</span>
                    </div>
                    <h4 className="text-base sm:text-xl font-bold text-white mb-1">{item.title}</h4>
                    <p className="text-gray-400 text-sm">{item.desc}</p>
                  </div>
                </div>
                <div className="hidden md:flex w-14 h-14 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-600 items-center justify-center z-10 flex-shrink-0">
                  <item.icon className="w-6 h-6 text-gray-300" />
                </div>
                <div className="flex-1 hidden md:block" />
              </div>
            ))}
          </div>

          <div className="mt-8 sm:mt-12 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-green-500/10 border-2 border-amber-500/30 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center">
            <p className="text-2xl sm:text-3xl md:text-4xl font-black mb-4">
              💥 <span className="text-amber-400">RESULTADO</span>
            </p>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-200 font-bold">
              Mais seguidores → Mais conversas → <span className="text-green-400">Mais vendas</span>
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 px-3 sm:px-4 bg-black">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black mb-4">
              💰 MAIS RESULTADOS, <span className="text-red-400">ZERO ANÚNCIOS</span>
            </h2>
            <p className="text-gray-400 text-sm sm:text-lg">Com a MRO Inteligente V7+ você:</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: Rocket, text: "Aumenta seu engajamento", gradient: "from-blue-600 to-cyan-600", glow: "shadow-blue-500/30" },
              { icon: Users, text: "Ganha seguidores qualificados", gradient: "from-purple-600 to-pink-600", glow: "shadow-purple-500/30" },
              { icon: CreditCard, text: "Converte mais clientes", gradient: "from-green-600 to-emerald-600", glow: "shadow-green-500/30" },
              { icon: X, text: "Sem tráfego pago", gradient: "from-red-600 to-orange-600", glow: "shadow-red-500/30" },
            ].map((item, i) => (
              <div key={i} className="text-center group">
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-xl ${item.glow} group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <p className="text-white font-bold text-sm sm:text-lg">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== RESUMO FINAL ====== */}
      <section className="py-12 sm:py-16 px-3 sm:px-4 bg-gradient-to-b from-black to-gray-950">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-amber-950/50 to-orange-950/50 border-2 border-amber-500/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 rounded-full px-4 sm:px-6 py-2 mb-4 sm:mb-6">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                <span className="text-amber-400 font-bold text-xs sm:text-sm">RESUMO FINAL</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-6 sm:mb-8">
                A MRO Inteligente V7+ Plus é uma <span className="text-amber-400">máquina de crescimento e vendas</span> no Instagram
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { emoji: "👉", label: "Automática", desc: "Funciona 24/7" },
                  { emoji: "👉", label: "Inteligente", desc: "IA exclusiva" },
                  { emoji: "👉", label: "Escalável", desc: "Sem limites" },
                  { emoji: "👉", label: "Sem limites", desc: "Uso ilimitado" },
                ].map((item, i) => (
                  <div key={i} className="bg-black/40 border border-amber-500/20 rounded-xl p-3 sm:p-4">
                    <span className="text-xl sm:text-2xl">{item.emoji}</span>
                    <p className="text-white font-bold mt-2 text-sm sm:text-base">{item.label}</p>
                    <p className="text-gray-500 text-[10px] sm:text-xs mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={pricingRef} className="py-10 sm:py-16 px-3 sm:px-4 bg-gradient-to-b from-gray-950 to-black">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-center mb-3 sm:mb-4">
            <span className="text-green-400">OFERTA ESPECIAL</span>
          </h2>
          <p className="text-center text-gray-400 mb-8 sm:mb-10 text-base sm:text-lg">Promoção válida apenas por 8 horas</p>
          
          {/* Pricing Card */}
          <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-2 border-green-500 rounded-2xl sm:rounded-3xl p-5 sm:p-8 relative overflow-hidden">
            {/* Badge */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold px-4 sm:px-6 py-1.5 sm:py-2 rounded-b-xl text-xs sm:text-sm whitespace-nowrap">
                🔥 DESCONTO ESPECIAL
              </div>
            </div>
            
            <div className="text-center mt-6 sm:mt-6 mb-6 sm:mb-8">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">Plano Anual Completo</h3>
              
              {/* Price */}
              <div className="mb-2">
                <span className="text-gray-500 line-through text-lg sm:text-2xl">De R$ 397</span>
              </div>
              
              <div className="text-base sm:text-lg text-gray-300 mb-2">por apenas</div>
              
              <div className="text-green-400 mb-1">
                <span className="text-lg sm:text-xl md:text-2xl font-medium">12x de</span>
                <span className="text-5xl sm:text-6xl md:text-7xl font-black ml-2">R$30</span>
              </div>
              
              <p className="text-gray-300 text-lg sm:text-xl mb-3">
                ou <span className="text-white font-bold">R$300 à vista</span>
              </p>
              
              {/* Animated discount highlight */}
              <div className="relative inline-block mb-4">
                <div className="absolute -inset-2 bg-gradient-to-r from-red-500/30 via-yellow-500/30 to-red-500/30 rounded-full blur-md animate-pulse" />
                <div className="relative inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-600 border-2 border-yellow-400/60 rounded-full px-4 sm:px-6 py-2 sm:py-3 animate-bounce" style={{ animationDuration: '2s' }}>
                  <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" />
                  <span className="text-white font-black text-sm sm:text-lg tracking-wide">R$97 DE DESCONTO!</span>
                  <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300 animate-pulse" />
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 animate-pulse" />
                <p className="text-yellow-400 text-xs sm:text-sm font-bold">
                  ⏰ Válido apenas nas próximas 8 horas
                </p>
                <AlertTriangle className="w-4 h-4 text-yellow-400 animate-pulse" />
              </div>
            </div>
            
            {/* Features */}
            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              {planFeatures.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200 text-sm sm:text-base">{feature}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <Button 
              onClick={() => {
                if (promoTimeLeft.expired) {
                  toast.error("Promoção expirada! Esta oferta não está mais disponível.");
                  return;
                }
                setShowCheckoutModal(true);
              }}
              disabled={promoTimeLeft.expired}
              className="w-full btn-pulse-color text-white font-bold text-base sm:text-xl py-5 sm:py-7 rounded-xl shadow-lg shadow-green-500/30 disabled:opacity-50"
            >
              {promoTimeLeft.expired ? "PROMOÇÃO EXPIRADA" : "QUERO GARANTIR AGORA"}
            </Button>
            
            {/* Secure badges */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mt-4 sm:mt-6 text-xs sm:text-sm text-gray-400 flex-wrap">
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Compra Segura</span>
              </div>
              <div className="flex items-center gap-1">
                <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>PIX ou Cartão</span>
              </div>
            </div>
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
              if (promoTimeLeft.expired) {
                toast.error("Promoção expirada!");
                return;
              }
              setShowCheckoutModal(true);
            }}
            disabled={promoTimeLeft.expired}
            className="btn-pulse-color text-white font-bold text-sm sm:text-xl px-6 sm:px-12 py-5 sm:py-7 rounded-full shadow-lg shadow-green-500/30 disabled:opacity-50"
          >
            {promoTimeLeft.expired ? "PROMOÇÃO EXPIRADA" : "GARANTIR MEU DESCONTO DE R$300"}
          </Button>
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
          <div className="w-full max-w-5xl aspect-video" onClick={e => e.stopPropagation()}>
            <iframe
              src={`https://www.youtube.com/embed/${currentVideoUrl}?autoplay=1&rel=0`}
              className="w-full h-full rounded-lg"
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
                12x de R$30
              </div>
              <p className="text-gray-400 text-xs sm:text-sm">ou R$300 à vista no PIX</p>
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

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-3 sm:px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center text-gray-500 text-xs sm:text-sm">
          <p>© 2025 MRO - Mais Resultados Online. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default DescontoAlunosRendaExtra;