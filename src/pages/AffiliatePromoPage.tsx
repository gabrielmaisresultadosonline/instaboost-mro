import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
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
  AlertTriangle
} from "lucide-react";
import logoMro from "@/assets/logo-mro.png";

interface AffiliateData {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
  active: boolean;
  promoStartDate?: string;
  promoEndDate?: string;
  promoStartTime?: string;
  promoEndTime?: string;
}

const AffiliatePromoPage = () => {
  const { affiliateId } = useParams<{ affiliateId: string }>();
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  
  // Countdown
  const [promoTimeLeft, setPromoTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });
  const pricingRef = useRef<HTMLDivElement>(null);
  
  // Modal de cadastro
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Carregar dados do afiliado
  useEffect(() => {
    const loadAffiliate = async () => {
      if (!affiliateId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        // Buscar do Supabase Storage
        const { data, error } = await supabase.storage
          .from('user-data')
          .download('admin/affiliates.json');

        if (error || !data) {
          console.error("Error loading affiliates:", error);
          setNotFound(true);
          setLoading(false);
          return;
        }

        const text = await data.text();
        const affiliates: AffiliateData[] = JSON.parse(text);
        const found = affiliates.find(a => a.id.toLowerCase() === affiliateId.toLowerCase());

        if (!found || !found.active) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setAffiliate(found);
      } catch (e) {
        console.error("Error:", e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadAffiliate();
  }, [affiliateId]);

  // Countdown baseado nas datas do afiliado
  useEffect(() => {
    if (!affiliate) return;

    // Contador fictício de escassez - SEMPRE começa em 10 horas quando usuário entra
    // Armazena apenas na sessão atual (não persiste entre recarregamentos)
    const startTime = Date.now();
    const tenHoursMs = 10 * 60 * 60 * 1000; // 10 horas em milissegundos

    const updateCountdown = () => {
      const elapsed = Date.now() - startTime;
      let remaining = tenHoursMs - elapsed;

      // Se chegou a zero, reinicia (nunca expira de verdade)
      if (remaining <= 0) {
        remaining = tenHoursMs;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      setPromoTimeLeft({ days: 0, hours, minutes, seconds, expired: false });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [affiliate]);

  // Track PageView
  useEffect(() => {
    if (affiliate) {
      trackPageView(`Sales Page - Affiliate ${affiliate.name}`);
    }
  }, [affiliate]);

  // Validar username
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

  // Checkout
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

    setCheckoutLoading(true);

    try {
      const { data: checkData, error: checkError } = await supabase.functions.invoke("create-mro-checkout", {
        body: { 
          email: `${affiliateId}:${email.toLowerCase().trim()}`,
          username: username.toLowerCase().trim(),
          phone: phone.replace(/\D/g, "").trim(),
          planType: "annual",
          amount: 397,
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

      window.open(checkData.payment_link, "_blank");
      setShowCheckoutModal(false);
      toast.success("Checkout criado! Complete o pagamento na nova aba.");
      setEmail("");
      setUsername("");
      setPhone("");

    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const scrollToPricing = () => {
    pricingRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const openVideo = (url: string) => {
    setCurrentVideoUrl(url);
    setShowVideoModal(true);
  };

  // Features
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

  // Formatar data de expiração para exibição
  const getExpirationText = () => {
    // Sempre mostrar a mensagem de urgência
    return "PROMOÇÃO TERMINA EM 10 HORAS";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-green-400 animate-spin" />
      </div>
    );
  }

  if (notFound || !affiliate) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Promoção não encontrada</h1>
          <p className="text-gray-400">Esta promoção pode ter expirado ou não existe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Removed Urgency Banner */}

      {/* Hero Section */}
      <section className="relative pt-4 sm:pt-6 md:pt-8 pb-10 sm:pb-16 px-3 sm:px-4">
        <div className="max-w-5xl mx-auto text-center">
          {/* Affiliate Photo & Special Badge */}
          <div className="mb-6 sm:mb-8">
            {affiliate.photoUrl ? (
              <img 
                src={affiliate.photoUrl} 
                alt={affiliate.name} 
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full mx-auto mb-4 border-4 border-green-500 shadow-lg shadow-green-500/30 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%234c1d95'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='40'%3E" + affiliate.name.charAt(0).toUpperCase() + "%3C/text%3E%3C/svg%3E";
                }}
              />
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full mx-auto mb-4 border-4 border-green-500 shadow-lg shadow-green-500/30 bg-purple-900 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">{affiliate.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <p className="text-green-400 text-xs sm:text-sm font-medium">
              🎁 Promoção especial para alunos {affiliate.name}
            </p>
          </div>
          
          <img src={logoMro} alt="MRO" className="h-16 sm:h-20 md:h-28 mx-auto mb-6 sm:mb-8 object-contain" />
          
          {/* Title */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 blur-3xl rounded-full" />
            <h1 className="relative text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black mb-3 sm:mb-4 bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent px-2">
              NÃO GASTE COM ANÚNCIOS UTILIZE A MRO INTELIGENTE!
            </h1>
          </div>


          {/* Main Video */}
          <div className="mt-8 sm:mt-10 max-w-4xl mx-auto">
            <div 
              onClick={() => openVideo("U-WmszcYekA")}
              className="relative rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer group shadow-2xl border border-green-500/30 hover:border-green-500/60 transition-all"
            >
              <img 
                src="https://img.youtube.com/vi/U-WmszcYekA/maxresdefault.jpg" 
                alt="Video MRO" 
                className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-red-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-red-500/50">
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1" fill="white" />
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <Button 
            onClick={scrollToPricing}
            className="mt-8 sm:mt-10 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-sm sm:text-lg px-6 sm:px-10 py-5 sm:py-6 rounded-full shadow-lg shadow-green-500/30"
          >
            GARANTIR MEU DESCONTO AGORA <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>
      </section>

      {/* Pricing Section */}
      <section ref={pricingRef} className="py-10 sm:py-16 px-3 sm:px-4 bg-gradient-to-b from-gray-950 to-black">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-center mb-3 sm:mb-4">
            <span className="text-green-400">OFERTA ESPECIAL</span>
          </h2>
          {getExpirationText() && (
            <p className="text-center text-gray-400 mb-8 sm:mb-10 text-base sm:text-lg">
              ⏰ {getExpirationText()}
            </p>
          )}
          
          {/* Pricing Card */}
          <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-2 border-green-500 rounded-2xl sm:rounded-3xl p-5 sm:p-8 relative overflow-hidden">
            {/* Badge */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold px-4 sm:px-6 py-1.5 sm:py-2 rounded-b-xl text-xs sm:text-sm whitespace-nowrap">
                🔥 PROMOÇÃO ALUNOS {affiliate.name.toUpperCase()}
              </div>
            </div>
            
            <div className="text-center mt-6 sm:mt-6 mb-6 sm:mb-8">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">Plano Anual Completo</h3>
              
              {/* Price Display - Updated Layout */}
              <div className="mb-2">
                <span className="text-gray-500 line-through text-lg sm:text-2xl">De R$497</span>
              </div>
              
              <div className="text-base sm:text-lg text-gray-300 mb-2">POR APENAS</div>
              
              {/* Main price - R$41 bigger */}
              <div className="text-green-400 mb-1">
                <span className="text-base sm:text-lg text-gray-400">12x de</span>{" "}
                <span className="text-5xl sm:text-6xl md:text-7xl font-black">R$41</span>
              </div>
              
              {/* À vista price below */}
              <div className="text-green-400/80 mb-3">
                <span className="text-xl sm:text-2xl font-bold">ou R$397 à vista no PIX</span>
              </div>
              
              <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/50 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 mb-4 sm:mb-6">
                <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                <span className="text-red-400 font-bold text-sm sm:text-base">R$100 OFF DE DESCONTO!</span>
              </div>
              
              {/* Countdown Timer */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4">
                {promoTimeLeft.days > 0 && (
                  <>
                    <div className="bg-gradient-to-b from-red-600 to-red-800 rounded-lg p-2 sm:p-3 min-w-[50px] sm:min-w-[65px]">
                      <div className="text-xl sm:text-2xl md:text-3xl font-bold font-mono">
                        {String(promoTimeLeft.days).padStart(2, '0')}
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-red-200">DIAS</div>
                    </div>
                    <span className="text-lg sm:text-xl font-bold text-red-500">:</span>
                  </>
                )}
                <div className="bg-gradient-to-b from-red-600 to-red-800 rounded-lg p-2 sm:p-3 min-w-[50px] sm:min-w-[65px]">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold font-mono">
                    {String(promoTimeLeft.hours).padStart(2, '0')}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-red-200">HORAS</div>
                </div>
                <span className="text-lg sm:text-xl font-bold text-red-500">:</span>
                <div className="bg-gradient-to-b from-red-600 to-red-800 rounded-lg p-2 sm:p-3 min-w-[50px] sm:min-w-[65px]">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold font-mono">
                    {String(promoTimeLeft.minutes).padStart(2, '0')}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-red-200">MINUTOS</div>
                </div>
                <span className="text-lg sm:text-xl font-bold text-red-500">:</span>
                <div className="bg-gradient-to-b from-red-600 to-red-800 rounded-lg p-2 sm:p-3 min-w-[50px] sm:min-w-[65px]">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold font-mono">
                    {String(promoTimeLeft.seconds).padStart(2, '0')}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-red-200">SEGUNDOS</div>
                </div>
              </div>
              
              {getExpirationText() && (
                <p className="text-yellow-400 text-xs sm:text-sm font-medium">
                  ⏰ {getExpirationText()}
                </p>
              )}
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
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-base sm:text-xl py-5 sm:py-7 rounded-xl shadow-lg shadow-green-500/30 disabled:opacity-50"
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

      {/* O QUE VOCÊ VAI RECEBER */}
      <section className="py-10 sm:py-16 px-3 sm:px-4 bg-gradient-to-b from-black to-gray-950">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-center mb-10 sm:mb-16">
            O QUE VOCÊ VAI <span className="text-green-400">RECEBER</span>
          </h2>

          {/* IA Section */}
          <div className="mb-10 sm:mb-16">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2">
                <span className="font-bold text-xs sm:text-sm">NOVO</span>
              </div>
              <h3 className="text-lg sm:text-2xl md:text-3xl font-bold">
                Inteligência artificial automática
              </h3>
            </div>
            
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-8">
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                {iaFeatures.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2 sm:gap-3">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300 text-sm sm:text-base">{feature}</span>
                  </div>
                ))}
              </div>
              <p className="text-green-400 font-medium mt-4 sm:mt-6 text-center text-sm sm:text-lg">
                Tudo isso personalizado para você, em segundos!
              </p>
            </div>
          </div>

          {/* MRO Principal */}
          <div className="mb-10 sm:mb-16">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="bg-green-500 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2">
                <span className="font-bold text-black text-xs sm:text-sm">PRINCIPAL</span>
              </div>
              <h3 className="text-lg sm:text-2xl md:text-3xl font-bold">
                FERRAMENTA MRO
              </h3>
            </div>
            
            <div className="bg-gray-900/50 border border-green-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-8">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {mroFeatures.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 sm:gap-4 bg-gray-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                    </div>
                    <span className="font-medium text-sm sm:text-base">{feature.title}</span>
                  </div>
                ))}
              </div>
              
              <p className="text-gray-400 mt-6 sm:mt-8 text-center max-w-3xl mx-auto text-sm sm:text-base">
                Tudo isso em alta escala, todos os dias, atraindo um novo público real e interessado em você.
              </p>
              
              <div className="mt-4 sm:mt-6 text-center">
                <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-full px-4 sm:px-6 py-2 sm:py-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                  <span className="text-green-400 font-bold text-xs sm:text-sm">Resultados comprovados em até 7 horas de uso!</span>
                </div>
              </div>
            </div>
          </div>

          {/* Area de Membros */}
          <div className="mb-10 sm:mb-16">
            <h3 className="text-lg sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6">
              ÁREA DE MEMBROS <span className="text-green-400">VITALÍCIA</span>
            </h3>
            
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-8">
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                {areaMembroFeatures.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2 sm:gap-3">
                    <Video className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300 text-sm sm:text-base">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Grupo VIP */}
          <div className="mb-10 sm:mb-16">
            <h3 className="text-lg sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6">
              GRUPO VIP DE <span className="text-green-400">SUPORTE E NETWORKING</span>
            </h3>
            
            <div className="bg-gray-900/50 border border-green-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-8">
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                {grupoVipFeatures.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2 sm:gap-3">
                    <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300 text-sm sm:text-base">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
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
                  promoTimeLeft.days > 0 
                    ? `${promoTimeLeft.days}D ${String(promoTimeLeft.hours).padStart(2, '0')}:${String(promoTimeLeft.minutes).padStart(2, '0')}:${String(promoTimeLeft.seconds).padStart(2, '0')}`
                    : `${String(promoTimeLeft.hours).padStart(2, '0')}:${String(promoTimeLeft.minutes).padStart(2, '0')}:${String(promoTimeLeft.seconds).padStart(2, '0')}`
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
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-sm sm:text-xl px-6 sm:px-12 py-5 sm:py-7 rounded-full shadow-lg shadow-green-500/30 disabled:opacity-50"
          >
            {promoTimeLeft.expired ? "PROMOÇÃO EXPIRADA" : "GARANTIR MEU DESCONTO DE R$100"}
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
              <div className="text-gray-400 text-sm">12x de</div>
              <div className="text-3xl sm:text-4xl font-bold text-green-400">
                R$41
              </div>
              <p className="text-gray-400 text-xs sm:text-sm">ou R$397 à vista no PIX</p>
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
                disabled={checkoutLoading || promoTimeLeft.expired}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-5 sm:py-6 rounded-xl text-sm sm:text-base"
              >
                {checkoutLoading ? (
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

export default AffiliatePromoPage;
