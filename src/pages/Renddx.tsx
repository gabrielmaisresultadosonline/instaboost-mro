import { useState, useEffect, useRef, lazy, Suspense } from "react";
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
  Monitor,
  Check,
  MousePointer2
} from "lucide-react";
const DiscountVideoPlayer = lazy(() => import("@/components/DiscountVideoPlayer"));
const PromoToolVideoSection = lazy(() => import("@/components/PromoToolVideoSection"));
import logoMro from "@/assets/logo-mro.png";


const Renddx = () => {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [isDiscountActive, setIsDiscountActive] = useState(true);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [showDiscountEndedPopup, setShowDiscountEndedPopup] = useState(false);
  const [promoTimeLeft, setPromoTimeLeft] = useState({ hours: 8, minutes: 0, seconds: 0, expired: false });
  const pricingRef = useRef<HTMLDivElement>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [loading, setLoading] = useState(false);

  // Novos estados para order bumps
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);

  const planConfig = {
    label: 'Renda Extra MRO',
    amount: 47,
    planType: 'monthly',
    priceDisplay: 'R$47',
    durationDisplay: '30 dias de acesso',
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
    const fetchProducts = async () => {
      try {
        const { data } = await supabase
          .from("hub_products")
          .select("*")
          .eq("is_active", true)
          .order("order_index", { ascending: true });
        
        const hubProducts = data || [];
        
        // Mapear produtos do HUB e adicionar o bump de Suporte
        const allProducts = [
          {
            id: "suporte-wa",
            slug: "suporte-whatsapp",
            title: "Suporte exclusivo Whatsapp",
            description: "Acesso direto ao time de especialistas",
            price: 19,
            plan_type: "mensal"
          },
          ...hubProducts
            .filter(p => p.slug === 'segredo-vender-mais' || p.slug === 'postscomia')
            .map(p => ({
              ...p,
              title: p.slug === 'segredo-vender-mais' ? 'O SEGREDO PARA VENDER MAIS !' : p.title,
              description: p.slug === 'segredo-vender-mais' ? 'Liberado - Acesso exclusivo aos 4 Audibooks que vão transformar seus resultados.' : p.description
            }))
        ];
        
        setProducts(allProducts);
      } catch (err) {
        console.error("Error loading products:", err);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  const totalAmount = planConfig.amount + selectedBumps.reduce((acc, slug) => {
    const prod = products.find(p => p.slug === slug);
    return acc + (Number(prod?.price) || 0);
  }, 0);

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
      const { data: checkData, error: checkError } = await supabase.functions.invoke("create-mro-checkout", {
        body: { 
          email: email.toLowerCase().trim(), 
          username: username.toLowerCase().trim(), 
          phone: phone.replace(/\D/g, "").trim(), 
          planType: planConfig.planType, 
          amount: totalAmount, 
          checkUserExists: true,
          selectedBumps: selectedBumps 
        }
      });
      if (checkError) { toast.error("Erro ao criar link de pagamento. Tente novamente."); return; }
      if (checkData.userExists) { toast.error("Este nome de usuário já está em uso. Escolha outro."); setUsernameError("Usuário já existe, escolha outro"); return; }
      if (!checkData.success) { toast.error(checkData.error || "Erro ao criar pagamento"); return; }
      trackInitiateCheckout(`MRO Renda Extra Mensal - R$47`, totalAmount);
      window.location.href = checkData.payment_link;
    } catch (error) { toast.error("Erro ao processar. Tente novamente."); } finally { setLoading(false); }
  };

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

  const toggleBump = (slug: string) => {
    setSelectedBumps(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <style>{`
        .btn-pulse-yellow { background: linear-gradient(to right, #facc15, #eab308) !important; border: none; color: black !important; font-weight: 900 !important; animation: pulse-yellow 2s infinite; }
        @keyframes pulse-yellow { 0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(234, 179, 8, 0); } 100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); } }
        .btn-pulse-green { position: relative; overflow: hidden; animation: pulse-green 2s infinite; transition: all 0.3s ease; }
        .btn-pulse-green::after { content: ""; position: absolute; top: -50%; left: -60%; width: 20%; height: 200%; background: rgba(255, 255, 255, 0.4); transform: rotate(30deg); animation: light-sweep 3s infinite; filter: blur(5px); }
        @keyframes light-sweep { 0% { left: -60%; } 30% { left: 150%; } 100% { left: 150%; } }
        @keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(34, 197, 94, 0); } 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } }
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
            <Button onClick={() => window.location.href = '/instagram-nova'} className="w-full btn-pulse-yellow text-lg py-5 rounded-xl border border-gray-600">
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
          <div className="relative mb-8 sm:mb-12">
            <h1 className="relative text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black mb-3 leading-tight tracking-tight text-white">FATURE MAIS DE <span className="text-yellow-300">R$5.000</span></h1>
            <h2 className="relative text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black mb-5 leading-tight text-green-400">TRABALHANDO DE CASA!</h2>
            <p className="relative mt-4 text-sm sm:text-base md:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">Renda extra <span className="text-green-300 font-semibold">automática e real</span>. Com apenas 1 computador, instale a ferramenta MRO e comece a faturar.</p>
          </div>

          {/* Vídeo Principal e CTA R$47 */}
          <div className="max-w-4xl mx-auto mb-10 sm:mb-16 space-y-8">
            <div className="bg-zinc-900/40 border border-green-500/20 rounded-3xl p-4 sm:p-6 backdrop-blur-sm">
              <Suspense fallback={<div className="aspect-video w-full bg-zinc-900 animate-pulse rounded-xl" />}>
                <DiscountVideoPlayer email="public@renddx.com" nome="Visitante Renddx" />
              </Suspense>
              
              <div className="mt-8 flex flex-col items-center gap-4">
                <div className="flex flex-col items-center">
                  <span className="text-zinc-400 text-sm uppercase font-bold tracking-widest">Acesso imediato por apenas</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-green-500">R$</span>
                    <span className="text-6xl font-black text-green-500">47</span>
                    <span className="text-zinc-400 text-sm font-bold">/mês</span>
                  </div>
                </div>
                
                <Button 
                  onClick={() => pricingRef.current?.scrollIntoView({ behavior: 'smooth' })} 
                  className="w-full sm:w-auto btn-pulse-yellow px-12 py-8 rounded-2xl text-xl shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-all hover:scale-105 active:scale-95 group"
                >
                  QUERO COMEÇAR AGORA
                  <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Button>
                
                <p className="text-zinc-500 text-xs font-medium flex items-center gap-2">
                  <Shield className="w-3 h-3" /> Pagamento 100% seguro via InfinitePay
                </p>
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 sm:gap-3 bg-green-600/20 backdrop-blur-sm border border-green-500/40 rounded-full px-4 py-2.5">
            <Laptop className="w-4 h-4 text-green-300" />
            <span className="text-white font-semibold text-[11px] sm:text-sm tracking-wide">20 MIN ANTES DE DORMIR = RENDA EXTRA AUTOMÁTICA</span>
            <Rocket className="w-4 h-4 text-green-300" />
          </div>
        </div>
      </section>

      {/* Título para o vídeo de funcionamento */}
      <div className="text-center pt-8">
        <h3 className="text-xl sm:text-2xl font-bold text-zinc-400 uppercase tracking-widest">Veja a ferramenta em funcionamento</h3>
      </div>
      <Suspense fallback={<div className="py-20 bg-black h-96 w-full animate-pulse" />}>
        <PromoToolVideoSection />
      </Suspense>


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

      {/* CTA Adicional Superior */}
      <section className="py-10 text-center">
          <Button onClick={() => pricingRef.current?.scrollIntoView({ behavior: 'smooth' })} className="btn-pulse-yellow px-10 py-8 rounded-2xl text-xl">
            QUERO COMEÇAR POR APENAS R$47 <ArrowRight className="ml-2 w-6 h-6" />
          </Button>
      </section>

      <section ref={pricingRef} className="py-16 sm:py-24 px-3 sm:px-4 bg-zinc-950">
        <div className="max-w-md mx-auto bg-zinc-900 border-2 border-green-500 rounded-3xl p-8 text-center relative shadow-[0_0_40px_rgba(34,197,94,0.2)]">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-500 text-black font-black px-6 py-1 rounded-full text-xs">OFERTA EXCLUSIVA</div>
          <h3 className="text-2xl font-bold mb-4">Plano Mensal</h3>
          <div className="text-5xl font-black mb-2 text-green-400">R$47</div>
          <p className="text-zinc-400 mb-6">Acesso 30 Dias</p>
          <ul className="text-left space-y-3 mb-8 text-zinc-300 text-sm">
            <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-green-500" /> Ferramenta Completa</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Passo a passo completo para conseguir faturar!</li>
            <li className="flex items-center gap-2"><Target className="w-4 h-4 text-green-500" /> Suporte VIP</li>
          </ul>
          <Button onClick={() => setShowCheckoutModal(true)} className="w-full bg-green-500 hover:bg-green-600 text-black font-black py-6 rounded-xl text-lg btn-pulse-green shadow-[0_0_20px_rgba(34,197,94,0.4)]">COMPRAR AGORA</Button>
        </div>
      </section>

      {/* CTA Adicional Inferior */}
      <section className="pb-20 text-center">
          <Button onClick={() => pricingRef.current?.scrollIntoView({ behavior: 'smooth' })} className="btn-pulse-yellow px-10 py-8 rounded-2xl text-xl">
            LIBERAR MEU ACESSO AGORA <ArrowRight className="ml-2 w-6 h-6" />
          </Button>
      </section>

      {showCheckoutModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setShowCheckoutModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
            
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold mb-2">Finalize seu Cadastro</h3>
              <p className="text-zinc-400 text-sm">Resumo do pedido: <span className="text-green-400 font-bold">R$ {totalAmount.toFixed(2).replace('.', ',')}</span></p>
            </div>

            <form onSubmit={handleCheckout} className="space-y-6">
              <div className="space-y-4">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="bg-zinc-900 border-zinc-800 h-12" required />
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp" className="bg-zinc-900 border-zinc-800 h-12" required />
                <Input type="text" value={username} onChange={(e) => validateUsername(e.target.value)} placeholder="Usuário (login)" className="bg-zinc-900 border-zinc-800 h-12" required />
                {usernameError && <p className="text-red-400 text-xs">{usernameError}</p>}
              </div>

              {/* Order Bumps Section */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <h4 className="text-xs font-black text-zinc-200 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-3 h-3 text-yellow-400 animate-pulse" />
                  Aproveite as ofertas
                </h4>
                
                {loadingProducts ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-700" />
                  </div>
                ) : products.map((prod) => (
                  <div 
                    key={prod.id}
                    onClick={() => toggleBump(prod.slug)}
                    className={`group relative overflow-hidden rounded-xl border-2 transition-all cursor-pointer p-3 ${
                      selectedBumps.includes(prod.slug) 
                        ? 'border-green-500 bg-green-500/5' 
                        : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex gap-3 items-center">
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <h5 className="font-bold text-sm leading-tight">{prod.title}</h5>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors relative ${
                            selectedBumps.includes(prod.slug) ? 'bg-green-500 border-green-500' : 'border-zinc-700'
                          }`}>
                            {selectedBumps.includes(prod.slug) ? (
                              <Check className="w-3 h-3 text-black font-bold" />
                            ) : (
                              <div className="absolute -left-6 top-1/2 -translate-y-1/2">
                                <MousePointer2 className="w-4 h-4 text-green-400 animate-pulse opacity-50" />
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight">{prod.description}</p>
                        <div className="flex items-center gap-2 pt-1">
                          <p className="text-green-400 font-black text-xs">
                            + R$ {Number(prod.price).toFixed(2).replace('.', ',')}
                          </p>
                          <span className="text-[8px] text-red-500 font-bold uppercase px-1 py-0.5 bg-red-500/10 rounded">
                            {prod.plan_type === 'anual' ? 'Anual' : prod.plan_type === 'mensal' ? 'Mensal' : 'Vitalício'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-green-500 hover:bg-green-600 text-black font-black py-7 text-lg rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] btn-checkout-green">
                {loading ? <Loader2 className="animate-spin w-6 h-6" /> : `COMPRAR AGORA`}
              </Button>
            </form>
          </div>
        </div>
      )}

      <footer className="py-8 text-center text-zinc-600 text-xs border-t border-zinc-900"><p>© 2025 MRO - Mais Resultados Online. Todos os direitos reservados.</p></footer>
    </div>
  );
};

export default Renddx;
