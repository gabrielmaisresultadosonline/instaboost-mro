import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { trackPageView, trackInitiateCheckout } from "@/lib/facebookTracking";
import { toast } from "sonner";
import { 
  ArrowRight,
  Shield,
  Clock,
  Heart,
  Eye,
  UserPlus,
  Video,
  Users,
  Zap,
  Star,
  Target,
  Mail,
  User,
  CreditCard,
  Loader2,
  Phone,
  AlertTriangle,
  Laptop,
  Rocket,
  X,
  Monitor
} from "lucide-react";
import logoMro from "@/assets/logo-mro.png";
import PromoToolVideoSection from "@/components/PromoToolVideoSection";

const Renddx = () => {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [isDiscountActive, setIsDiscountActive] = useState(true);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [accessState, setAccessState] = useState<'checking' | 'allowed' | 'denied'>('checking');
  const [accessName, setAccessName] = useState<string>('');
  const [accessDenyReason, setAccessDenyReason] = useState<string>('Voce precisa assistir pelo menos 60% do video em /renddx para liberar essa pagina.');
  const [showDiscountEndedPopup, setShowDiscountEndedPopup] = useState(false);
  const [promoTimeLeft, setPromoTimeLeft] = useState({ hours: 8, minutes: 0, seconds: 0, expired: false });
  const pricingRef = useRef<HTMLDivElement>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [loading, setLoading] = useState(false);

  const planConfig = {
    label: '12x R$30 (R$300 à vista)',
    amount: 300,
    planType: 'annual',
    priceDisplay: 'R$300',
    durationDisplay: '1 ano completo',
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailFromUrl = (params.get('email') || '').trim().toLowerCase();
    const emailFromStorage = (() => { try { return localStorage.getItem('renddx-desconto:email') || ''; } catch { return ''; } })();
    const email = emailFromUrl || emailFromStorage;
    if (!email) {
      setAccessDenyReason('Acesso restrito. Verifique seu email em /renddx para liberar esta pagina.');
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
        setAccessDenyReason('Voce ainda nao assistiu 60% do video. Acesse /renddx para liberar.');
        setAccessState('denied');
        return;
      }
      setAccessName(data.name || '');
      try {
        localStorage.setItem('renddx-desconto:email', data.email);
        if (data.name) localStorage.setItem('renddx-desconto:name', data.name);
      } catch {}
      setAccessState('allowed');
    }).catch(() => {
      setAccessDenyReason('Erro ao verificar acesso. Tente novamente.');
      setAccessState('denied');
    });
  }, []);

  const validateUsername = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z]/g, "");
    setUsername(cleaned);
    if (value !== cleaned) setUsernameError("Apenas letras minúsculas, sem espaços ou números");
    else if (cleaned.length < 4) setUsernameError("Mínimo de 4 caracteres");
    else if (cleaned.length > 20) setUsernameError("Máximo de 20 caracteres");
    else setUsernameError("");
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) { toast.error("Por favor, insira um email válido"); return; }
    if (!phone || phone.replace(/\D/g, "").length < 10) { toast.error("Por favor, insira um celular válido com DDD"); return; }
    if (!username || username.length < 4) { toast.error("Nome de usuário deve ter no mínimo 4 caracteres"); return; }
    if (usernameError) { toast.error(usernameError); return; }
    setLoading(true);
    try {
      const plan = planConfig;
      const { data: checkData, error: checkError } = await supabase.functions.invoke("create-mro-checkout", {
        body: { email: email.toLowerCase().trim(), username: username.toLowerCase().trim(), phone: phone.replace(/\D/g, "").trim(), planType: plan.planType, amount: plan.amount, checkUserExists: true }
      });
      if (checkError) { toast.error("Erro ao criar link de pagamento. Tente novamente."); return; }
      if (checkData.userExists) { toast.error("Este nome de usuário já está em uso. Escolha outro."); setUsernameError("Usuário já existe, escolha outro"); return; }
      if (!checkData.success) { toast.error(checkData.error || "Erro ao criar pagamento"); return; }
      trackInitiateCheckout(`MRO Renda Extra Desconto - ${planConfig.label}`, planConfig.amount);
      window.location.href = checkData.payment_link;
      setEmail(""); setUsername(""); setPhone("");
    } catch (error) { toast.error("Erro ao processar. Tente novamente."); } finally { setLoading(false); }
  };

  useEffect(() => {
    trackPageView('Sales Page - Renddx Promo');
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.from("desconto_alunos_settings").select("is_active").single();
        if (!error && data) { setIsDiscountActive(data.is_active); if (!data.is_active) setShowDiscountEndedPopup(true); }
      } catch (err) { console.error("Error fetching settings:", err); } finally { setIsSettingsLoading(false); }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const PROMO_DURATION = 7 * 60 * 60 * 1000;
    const STORAGE_KEY = 'renddx-promo:end-time';
    let promoEndTime: number;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      promoEndTime = stored ? parseInt(stored, 10) : Date.now() + PROMO_DURATION;
      if (!stored) localStorage.setItem(STORAGE_KEY, String(promoEndTime));
    } catch { promoEndTime = Date.now() + PROMO_DURATION; }
    const updateCountdown = () => {
      const diff = promoEndTime - Date.now();
      if (diff <= 0) { setPromoTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true }); return; }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setPromoTimeLeft({ hours, minutes, seconds, expired: false });
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

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
          <a href="/renddx" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-sm transition-all">
            Liberar acesso <ArrowRight className="w-4 h-4" />
          </a>
          <p className="text-white/40 text-xs mt-5">Ainda nao cadastrou? <a href="/rendaextra" className="text-amber-400 underline">Cadastre-se em /rendaextra</a></p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <style>{`
        .btn-pulse-color { background: linear-gradient(to right, #facc15, #eab308) !important; border: none; }
        @keyframes bounceArrowRight { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(8px); } }
        .arrow-bounce-right { animation: bounceArrowRight 1s ease-in-out infinite; }
      `}</style>
      
      {showDiscountEndedPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
          <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-2 border-red-500 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center relative animate-in zoom-in-95 duration-300 shadow-[0_0_50px_rgba(239,68,68,0.3)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2"><div className="bg-red-600 text-white font-bold px-4 py-1.5 rounded-full text-sm">⚠️ AVISO</div></div>
            <div className="mt-4 mb-6">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Desconto Encerrado!</h2>
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-2">Aguarde um próximo desconto para alunos renda extra.</p>
              <p className="text-red-400 font-bold text-sm sm:text-base">Consulte os administradores para mais informações.</p>
            </div>
            <Button onClick={() => window.location.href = '/instagram-nova'} className="w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold text-lg py-5 rounded-xl border border-gray-600">
              Página Oficial <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            {isDiscountActive && <button onClick={() => setShowDiscountEndedPopup(false)} className="mt-4 text-gray-400 hover:text-white text-sm underline">Continuar na página mesmo assim</button>}
          </div>
        </div>
      )}

      <section className="relative pt-8 sm:pt-14 pb-12 sm:pb-20 px-3 sm:px-4 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-0">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-green-500/10 blur-[120px] rounded-full" />
        </div>
        <div className="relative max-w-5xl mx-auto text-center">
          <img src={logoMro} alt="MRO" className="h-16 sm:h-20 md:h-28 mx-auto mb-6 sm:mb-8 object-contain drop-shadow-[0_0_30px_rgba(34,197,94,0.35)]" />
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md border border-green-500/30 rounded-full px-4 py-1.5 mb-5">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></span>
            <span className="text-[11px] sm:text-xs font-semibold tracking-wider text-green-300 uppercase">Oferta liberada • Vagas limitadas</span>
          </div>
          <div className="relative">
            <h1 className="relative text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black mb-3 leading-tight tracking-tight text-white">FATURE MAIS DE <span className="text-yellow-300">R$5.000</span></h1>
            <h2 className="relative text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black mb-5 leading-tight text-green-400">TRABALHANDO DE CASA!</h2>
            <p className="relative mt-4 text-sm sm:text-base md:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">Renda extra <span className="text-green-300 font-semibold">automática e real</span>. Com apenas 1 computador, instale a ferramenta MRO e comece a faturar.</p>
          </div>
          <div className="inline-flex items-center gap-2 sm:gap-3 bg-green-600/20 backdrop-blur-sm border border-green-500/40 rounded-full px-4 py-2.5 mt-7">
            <Laptop className="w-4 h-4 text-green-300" />
            <span className="text-white font-semibold text-[11px] sm:text-sm tracking-wide">20 MIN ANTES DE DORMIR = RENDA EXTRA AUTOMÁTICA</span>
            <Rocket className="w-4 h-4 text-green-300" />
          </div>
        </div>
      </section>

      <PromoToolVideoSection />

      <section className="py-16 sm:py-20 px-3 sm:px-4 bg-gradient-to-b from-gray-950 to-black">
        <div className="max-w-5xl mx-auto text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-2 mb-4">
            <Rocket className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-bold text-xs">SUA RENDA EXTRA</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-black mb-4">COMO VOCÊ VAI <span className="text-green-400">FATURAR</span></h2>
          <p className="text-gray-300 text-sm sm:text-lg max-w-3xl mx-auto">Preste serviço para empresas usando a ferramenta MRO e cobre mensalidade!</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800"><Monitor className="w-10 h-10 text-blue-500 mb-4" /><h3 className="font-bold mb-2">Instale no seu PC</h3><p className="text-gray-400 text-sm">Notebook ou Desktop, comece de casa.</p></div>
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800"><Clock className="w-10 h-10 text-purple-500 mb-4" /><h3 className="font-bold mb-2">20 min por dia</h3><p className="text-gray-400 text-sm">Deixe rodando automaticamente.</p></div>
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800"><CreditCard className="w-10 h-10 text-green-500 mb-4" /><h3 className="font-bold mb-2">Cobre mensalidade</h3><p className="text-gray-400 text-sm">Receba de empresas todo mês.</p></div>
        </div>
      </section>

      <section ref={pricingRef} className="py-16 sm:py-24 px-3 sm:px-4 bg-zinc-950">
        <div className="max-w-md mx-auto bg-zinc-900 border-2 border-green-500 rounded-3xl p-8 text-center relative shadow-[0_0_40px_rgba(34,197,94,0.2)]">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-500 text-black font-black px-6 py-1 rounded-full text-xs">OFERTA EXCLUSIVA</div>
          <h3 className="text-2xl font-bold mb-4">Plano Anual</h3>
          <div className="text-5xl font-black mb-2">R$300</div>
          <p className="text-zinc-400 mb-6">ou 12x de R$30</p>
          <ul className="text-left space-y-3 mb-8 text-zinc-300 text-sm">
            <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-green-500" /> Ferramenta Completa</li>
            <li className="flex items-center gap-2"><Users className="w-4 h-4 text-green-500" /> 4 Contas Simultâneas</li>
            <li className="flex items-center gap-2"><Target className="w-4 h-4 text-green-500" /> Suporte VIP</li>
          </ul>
          <Button onClick={() => setShowCheckoutModal(true)} className="w-full bg-green-500 hover:bg-green-600 text-black font-black py-6 rounded-xl text-lg">QUERO ESSE DESCONTO</Button>
        </div>
      </section>

      {showCheckoutModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-md w-full relative">
            <button onClick={() => setShowCheckoutModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
            <h3 className="text-xl font-bold mb-4 text-center">Finalize seu Cadastro</h3>
            <form onSubmit={handleCheckout} className="space-y-4">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="bg-zinc-900 border-zinc-800" required />
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp" className="bg-zinc-900 border-zinc-800" required />
              <Input type="text" value={username} onChange={(e) => validateUsername(e.target.value)} placeholder="Usuário (login)" className="bg-zinc-900 border-zinc-800" required />
              {usernameError && <p className="text-red-400 text-xs">{usernameError}</p>}
              <Button type="submit" disabled={loading} className="w-full bg-green-500 text-black font-bold py-6">{loading ? <Loader2 className="animate-spin" /> : "PAGAR AGORA"}</Button>
            </form>
          </div>
        </div>
      )}

      <footer className="py-8 text-center text-zinc-600 text-xs border-t border-zinc-900"><p>© 2025 MRO - Mais Resultados Online. Todos os direitos reservados.</p></footer>
    </div>
  );
};

export default Renddx;
