import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { trackPageView, trackInitiateCheckout } from "@/lib/facebookTracking";
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

interface AffiliateData {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
  active: boolean;
}

const AffiliateRendaExtraPromo = () => {
  const { affiliateId } = useParams<{ affiliateId: string }>();
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [loadingAffiliate, setLoadingAffiliate] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [isMainVideoPlaying, setIsMainVideoPlaying] = useState(false);
  const [isDiscountActive, setIsDiscountActive] = useState(true);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  
  // Popup de desconto encerrado
  const [showDiscountEndedPopup, setShowDiscountEndedPopup] = useState(false);
  
  // Countdown para promoção - 8 horas
  const [promoTimeLeft, setPromoTimeLeft] = useState({ hours: 8, minutes: 0, seconds: 0, expired: false });
  const pricingRef = useRef<HTMLDivElement>(null);
  
  // Modal de cadastro
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [loading, setLoading] = useState(false);

  // Carregar dados do afiliado
  useEffect(() => {
    const loadAffiliate = async () => {
      let id = affiliateId;
      if (!id && window.location.hash) {
        id = window.location.hash.replace('#', '');
      }

      if (!id) {
        setNotFound(true);
        setLoadingAffiliate(false);
        return;
      }

      try {
        const { data, error } = await supabase.storage
          .from('user-data')
          .download('admin/affiliates.json');

        if (error || !data) {
          setNotFound(true);
          setLoadingAffiliate(false);
          return;
        }

        const text = await data.text();
        const affiliates: AffiliateData[] = JSON.parse(text);
        const found = affiliates.find(a => a.id.toLowerCase() === id?.toLowerCase());

        if (!found || !found.active) {
          setNotFound(true);
          setLoadingAffiliate(false);
          return;
        }

        setAffiliate(found);
      } catch (e) {
        console.error("Error:", e);
        setNotFound(true);
      } finally {
        setLoadingAffiliate(false);
      }
    };

    loadAffiliate();
  }, [affiliateId]);

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
      // Preço promocional: R$300 (conforme DescontoAlunosRendaExtras)
      // Adicionando prefixo do afiliado no email
      const { data: checkData, error: checkError } = await supabase.functions.invoke("create-mro-checkout", {
        body: { 
          email: `${affiliateId}:${email.toLowerCase().trim()}`,
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

      trackInitiateCheckout(`MRO Renda Extra Affiliate ${affiliate?.name}`, 300);
      window.location.href = checkData.payment_link;
      
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

  useEffect(() => {
    if (affiliate) {
      trackPageView(`Sales Page - Renda Extra Affiliate ${affiliate.name}`);
    }
    
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
  }, [affiliate]);

  useEffect(() => {
    const PROMO_DURATION = 7 * 60 * 60 * 1000;
    const promoEndTime = Date.now() + PROMO_DURATION;
    
    const updateCountdown = () => {
      const currentTime = Date.now();
      const diff = promoEndTime - currentTime;
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

  if (loadingAffiliate) {
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
        .promo-banner {
          background: linear-gradient(90deg, #10b981 0%, #059669 100%);
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
            </div>
            
            <Button 
              onClick={() => window.location.href = '/instagram-nova'}
              className="w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold text-lg py-5 rounded-xl border border-gray-600"
            >
              Página Oficial <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-16 md:pt-20 pb-10 sm:pb-16 px-3 sm:px-4">
        <div className="max-w-5xl mx-auto text-center">
          
          {/* Affiliate Info */}
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
             {affiliate.photoUrl ? (
                <img 
                  src={affiliate.photoUrl} 
                  alt={affiliate.name} 
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full mx-auto mb-4 border-4 border-green-500 shadow-lg shadow-green-500/30 object-cover"
                />
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full mx-auto mb-4 border-4 border-green-500 shadow-lg shadow-green-500/30 bg-green-900 flex items-center justify-center">
                  <User className="w-12 h-12 text-white" />
                </div>
              )}
              <div className="inline-block bg-green-500/10 border border-green-500/30 rounded-full px-6 py-2">
                <p className="text-green-400 text-sm sm:text-base font-bold">
                  🎁 Promoção especial para alunos {affiliate.name}
                </p>
              </div>
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
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
                Assista a <span className="text-green-400">AULA GRÁTIS</span> para entender tudo
              </h2>
            </div>
            <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-green-500/30">
              <div className="aspect-video">
                <iframe 
                  src="https://www.youtube.com/embed/-0CHlqHVe0g?rel=0&modestbranding=1" 
                  title="Aula Grátis"
                  className="w-full h-full" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen 
                />
              </div>
            </div>
          </div>

          {/* CTA Button with arrows */}
          <div className="relative mt-8 sm:mt-10 flex items-center justify-center gap-2 sm:gap-4">
            <span className="arrow-bounce-right text-white text-2xl sm:text-3xl">▶</span>
            <Button 
              onClick={scrollToPricing}
              className="btn-pulse-color text-black font-bold text-sm sm:text-lg px-6 sm:px-10 py-5 sm:py-6 rounded-full shadow-lg shadow-yellow-500/30"
            >
              GARANTIR MEU DESCONTO AGORA <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <span className="arrow-bounce-left text-white text-2xl sm:text-3xl">◀</span>
          </div>
        </div>
      </section>

      {/* Pricing Section - simplified version for the component creation */}
      <section ref={pricingRef} className="py-16 sm:py-20 px-3 sm:px-4 bg-zinc-950">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-b from-zinc-900 to-black border-2 border-green-500 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-green-500 text-black font-bold px-6 py-2 rounded-bl-2xl">
              OFERTA EXCLUSIVA
            </div>
            
            <h3 className="text-2xl sm:text-3xl font-black mb-6">MRO RENDA EXTRA</h3>
            
            <div className="mb-8">
               <span className="text-gray-400 line-through text-lg sm:text-xl block mb-2">De R$ 997,00</span>
               <div className="flex flex-col items-center justify-center">
                  <span className="text-white text-lg font-bold mb-1">Apenas</span>
                  <span className="text-5xl sm:text-7xl font-black text-green-400">R$ 300</span>
                  <span className="text-green-400/70 font-bold mt-1">À VISTA OU PARCELADO</span>
               </div>
            </div>

            <form onSubmit={handleCheckout} className="space-y-4 max-w-md mx-auto">
              <Input 
                type="email" 
                placeholder="Seu melhor e-mail" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 h-14 text-lg"
              />
              <Input 
                type="text" 
                placeholder="Seu celular (com DDD)" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 h-14 text-lg"
              />
              <div className="space-y-1">
                <Input 
                  type="text" 
                  placeholder="Escolha seu usuário" 
                  value={username}
                  onChange={(e) => validateUsername(e.target.value)}
                  required
                  className={`bg-zinc-800 h-14 text-lg ${usernameError ? 'border-red-500' : 'border-zinc-700'}`}
                />
                {usernameError && <p className="text-red-500 text-xs text-left px-2">{usernameError}</p>}
              </div>
              
              <Button 
                type="submit"
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 text-black font-black text-xl py-8 rounded-2xl shadow-xl shadow-green-500/20"
              >
                {loading ? <Loader2 className="animate-spin mr-2" /> : "QUERO COMEÇAR AGORA!"}
              </Button>
            </form>
            
            <div className="mt-8 flex items-center justify-center gap-6 text-gray-400 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" /> Compra segura
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Acesso imediato
              </div>
            </div>
          </div>
        </div>
      </section>

      <ActiveClientsSection title="Já estamos transformando vidas" maxClients={10} />
      
      {/* Footer simple */}
      <footer className="py-12 border-t border-zinc-800 text-center text-gray-500 px-4">
        <img src={logoMro} alt="MRO" className="h-10 mx-auto mb-6 opacity-30 grayscale" />
        <p className="text-sm max-w-2xl mx-auto">
          © 2026 MRO Inteligente. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
};

export default AffiliateRendaExtraPromo;
