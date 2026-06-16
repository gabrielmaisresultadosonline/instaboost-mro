import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Rocket, Sparkles, TrendingUp, Users, Zap, Target, MessageCircle, CheckCircle2, Crown, Building2, Shield } from "lucide-react";
import logoMro from "@/assets/logo-mro.png";
import InstagrammNewVideoPlayer from "@/components/InstagrammNewVideoPlayer";
import { trackLead } from "@/lib/facebookTracking";

const STORAGE_KEY = "instagrammnew_email";

export default function InstagrammNew() {
  const [checking, setChecking] = useState(true);
  const [granted, setGranted] = useState(false);
  const [grantedEmail, setGrantedEmail] = useState("");
  const [grantedNome, setGrantedNome] = useState("");

  // gate view mode: 'hero' | 'login' | 'register'
  const [mode, setMode] = useState<"hero" | "login" | "register">("hero");

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [expired, setExpired] = useState(false);

  // Register form
  const [regNome, setRegNome] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regWhats, setRegWhats] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // Granted: lead details (email + whatsapp) loaded from server
  const [grantedWhats, setGrantedWhats] = useState("");

  // Plan checkout modal
  type Plan = { id: "pro" | "agencia"; name: string; itemName: string; priceCents: number; priceLabel: string };
  const PLANS: Record<"pro" | "agencia", Plan> = {
    pro: { id: "pro", name: "Plano Pro", itemName: "MRO+PRO", priceCents: 39700, priceLabel: "R$ 397" },
    agencia: { id: "agencia", name: "Plano Agências", itemName: "MRO+AGENCIA", priceCents: 99700, priceLabel: "R$ 997" },
  };
  const [planModal, setPlanModal] = useState<Plan | null>(null);
  const [planUsername, setPlanUsername] = useState("");

  // initial gate check (token in URL or saved email)
  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const token = url.searchParams.get("token");
        if (token) {
          const { data } = await supabase.functions.invoke("instagrammnew-discount", {
            body: { action: "verify_token", token },
          });
          if (data?.valid) {
            localStorage.setItem(STORAGE_KEY, data.email);
            setGrantedEmail(data.email); setGrantedNome(data.nome || ""); setGrantedWhats(data.whatsapp || "");
            setGranted(true); setChecking(false); return;
          }
          if (data?.expired) setExpired(true);
        }
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const { data } = await supabase.functions.invoke("instagrammnew-discount", {
            body: { action: "verify_email", email: saved },
          });
          if (data?.valid) {
            setGrantedEmail(saved); setGrantedNome(data.nome || ""); setGrantedWhats(data.whatsapp || "");
            setGranted(true); setChecking(false); return;
          }
          if (data?.expired) { setExpired(true); localStorage.removeItem(STORAGE_KEY); }
        }
      } catch {}
      setChecking(false);
    })();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = loginEmail.trim().toLowerCase();
    if (!email.includes("@")) { toast.error("Informe um email válido"); return; }
    setLoginLoading(true); setNotFound(false); setExpired(false);
    try {
      const { data } = await supabase.functions.invoke("instagrammnew-discount", {
        body: { action: "verify_email", email },
      });
      if (data?.valid) {
        localStorage.setItem(STORAGE_KEY, email);
        setGrantedEmail(email); setGrantedNome(data.nome || ""); setGrantedWhats(data.whatsapp || "");
        setGranted(true);
      } else if (data?.expired) setExpired(true);
      else setNotFound(true);
    } catch { toast.error("Erro ao validar"); }
    finally { setLoginLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = regNome.trim();
    const email = regEmail.trim().toLowerCase();
    const whatsapp = regWhats.trim();
    if (!nome || !whatsapp || !email.includes("@")) { toast.error("Preencha todos os campos"); return; }
    setRegLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagrammnew-discount", {
        body: { action: "create_lead", nome, email, whatsapp, source: "instagrammnew" },
      });
      if (error || !data?.success) { toast.error("Erro ao cadastrar"); return; }
      localStorage.setItem(STORAGE_KEY, email);
      setGrantedEmail(email); setGrantedNome(nome); setGrantedWhats(whatsapp);
      setGranted(true);
      try { trackLead("instagrammnew_register"); } catch {}
      toast.success("Cadastro realizado! Acesso liberado.");
    } catch { toast.error("Erro ao cadastrar"); }
    finally { setRegLoading(false); }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!granted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black text-white">
        {/* HERO */}
        <section className="px-4 pt-8 pb-4 max-w-4xl mx-auto text-center">
          <img src={logoMro} alt="MRO" className="h-10 sm:h-14 mx-auto mb-4 object-contain" />
          <div className="inline-flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/40 rounded-full px-3 py-1 mb-4">
            <Sparkles className="w-3 h-3 text-yellow-400" />
            <span className="text-yellow-300 font-semibold text-[10px] uppercase tracking-wider">Sistema MRO</span>
          </div>
          <p className="text-xs sm:text-sm font-medium leading-snug mb-3 text-zinc-400 uppercase tracking-wide">
            Prospecção Ativa com a <span className="text-yellow-400">ferramenta MRO</span>
          </p>
          <h1 className="text-[28px] sm:text-5xl md:text-6xl font-black leading-[1.05] mb-4 text-white">
            Mais Vendas,<br />Mais Clientes,<br />
            <span className="text-yellow-400">Mais Engajamento</span>
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 max-w-2xl mx-auto leading-relaxed mb-6">
            <span className="bg-yellow-400 text-black font-bold px-2 py-0.5 rounded">Sem gastar 1 real com anúncios</span>
          </p>
          <p className="text-base sm:text-lg font-semibold text-zinc-200 mt-4 mb-6">
            👉 Cadastre-se para ver tudo
          </p>
        </section>


        {/* CTA CARD */}
        <section className="px-4 pb-16 max-w-md mx-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="space-y-3">
              <Button onClick={() => setMode("register")}
                className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black py-6 text-sm sm:text-base rounded-xl shadow-lg shadow-yellow-400/20">
                FAZER CADASTRO E ASSISTIR
              </Button>
              <Button onClick={() => setMode("login")} variant="outline"
                className="w-full border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700 hover:text-white font-semibold py-5 text-sm rounded-xl">
                Já fiz cadastro — quero assistir
              </Button>
            </div>
          </div>
        </section>

        {/* MODAL OVERLAY */}
        {(mode === "login" || mode === "register") && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="relative w-full max-w-md bg-zinc-900 border border-yellow-400/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-yellow-400/10 my-auto">
              <button type="button" onClick={() => setMode("hero")}
                className="absolute top-3 right-4 text-zinc-500 hover:text-white text-2xl leading-none"
                disabled={regLoading || loginLoading} aria-label="Fechar">×</button>

              {mode === "login" && (
                <>
                  <h2 className="text-2xl font-black text-white mb-1 text-center">Acessar aula</h2>
                  <p className="text-zinc-400 text-sm text-center mb-5">Digite o email do seu cadastro.</p>
                  <form onSubmit={handleLogin} className="space-y-3">
                    <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="seu@email.com" className="bg-zinc-800 border-zinc-700 text-white h-12 text-base" required />
                    {notFound && <p className="text-red-400 text-xs">Email não encontrado. Faça o cadastro.</p>}
                    {expired && <p className="text-amber-400 text-xs">Seu acesso expirou. Faça um novo cadastro.</p>}
                    <Button type="submit" disabled={loginLoading}
                      className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black py-6 text-base rounded-xl">
                      {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "ACESSAR AULA"}
                    </Button>
                  </form>
                </>
              )}

              {mode === "register" && (
                <>
                  <h2 className="text-2xl font-black text-white mb-1 text-center">Cadastro rápido</h2>
                  <p className="text-zinc-400 text-sm text-center mb-5">Libere acesso imediato à aula completa.</p>
                  <form onSubmit={handleRegister} className="space-y-3">
                    <Input type="text" value={regNome} onChange={(e) => setRegNome(e.target.value)}
                      placeholder="Nome completo" className="bg-zinc-800 border-zinc-700 text-white h-12" required maxLength={120} />
                    <Input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="seu@email.com" className="bg-zinc-800 border-zinc-700 text-white h-12" required maxLength={255} />
                    <Input type="tel" value={regWhats} onChange={(e) => setRegWhats(e.target.value)}
                      placeholder="WhatsApp (com DDD)" className="bg-zinc-800 border-zinc-700 text-white h-12" required maxLength={20} />
                    <Button type="submit" disabled={regLoading}
                      className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black py-6 text-base rounded-xl">
                      {regLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "CADASTRAR E LIBERAR ACESSO"}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }


  // Granted view
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-violet-950/20 to-black text-white">
      <section className="px-4 pt-12 pb-10 max-w-5xl mx-auto text-center">
        <img src={logoMro} alt="MRO" className="h-16 sm:h-20 mx-auto mb-6 object-contain" />
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/30 rounded-full px-4 py-1.5 mb-4">
          <Rocket className="w-4 h-4 text-violet-400" />
          <span className="text-violet-300 font-semibold text-xs uppercase tracking-wider">Sistema MRO</span>
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black mb-4">
          Conheça o <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">sistema MRO</span> e tenha resultados incríveis!
        </h1>
        <p className="text-base sm:text-lg text-zinc-300 max-w-3xl mx-auto leading-relaxed">
          Mais vendas, clientes e engajamento com <strong className="text-white">Prospecção ativa</strong>, sem precisar gastar nenhum real com anúncios.
        </p>
        {grantedNome && (
          <p className="mt-4 text-sm text-emerald-400">
            <CheckCircle2 className="inline w-4 h-4 mr-1" /> Acesso liberado para {grantedNome}
          </p>
        )}
      </section>

      <section className="px-4 pb-12 max-w-4xl mx-auto">
        <InstagrammNewVideoPlayer email={grantedEmail} nome={grantedNome} />
      </section>

      <section className="px-4 pb-16 max-w-5xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: TrendingUp, title: "Mais vendas", desc: "Aumente seu faturamento sem aumentar gastos com anúncios." },
            { icon: Users, title: "Mais clientes", desc: "Atrai público qualificado direto do seu concorrente." },
            { icon: Zap, title: "Sem ads pagos", desc: "Prospecção ativa rodando 24h por dia automaticamente." },
            { icon: Target, title: "Foco no nicho", desc: "Mira no público certo e engaja de verdade." },
          ].map((f, i) => (
            <div key={i} className="bg-zinc-900/60 border border-violet-500/20 rounded-2xl p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-white mb-1">{f.title}</h3>
              <p className="text-zinc-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* PLANOS */}
        <div className="mt-12">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-black">Escolha seu <span className="text-yellow-400">plano</span></h2>
            <p className="text-zinc-400 text-sm mt-2">Pagamento 100% seguro via InfiniPay</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* Pro */}
            <div className="bg-gradient-to-br from-zinc-900 to-black border-2 border-blue-500 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-3"><Crown className="w-5 h-5 text-blue-400" /><h3 className="text-xl font-bold text-blue-400">Plano Pro</h3></div>
              <p className="text-zinc-400 text-sm mb-4">Acesso completo ao sistema MRO por 12 meses.</p>
              <div className="mb-4">
                <div className="text-zinc-500 line-through text-sm">De R$ 597</div>
                <div className="text-4xl font-black text-white">R$ 397<span className="text-base text-zinc-400 font-normal"> à vista</span></div>
                <div className="text-blue-400 text-sm">ou 12x de R$ 40</div>
              </div>
              <Button onClick={() => { setPlanUsername(""); setPlanModal(PLANS.pro); }}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-5 rounded-xl">
                ASSINAR PLANO PRO
              </Button>
            </div>
            {/* Agência */}
            <div className="relative bg-gradient-to-br from-zinc-900 to-black border-2 border-amber-500 rounded-2xl p-6 shadow-2xl shadow-amber-500/20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[10px] font-black px-3 py-1 rounded-full">RECOMENDADO</div>
              <div className="flex items-center gap-2 mb-3"><Building2 className="w-5 h-5 text-amber-400" /><h3 className="text-xl font-bold text-amber-400">Plano Agências</h3></div>
              <p className="text-zinc-400 text-sm mb-4">Para agências e gestores com múltiplos clientes.</p>
              <div className="mb-4">
                <div className="text-zinc-500 line-through text-sm">De R$ 1.997</div>
                <div className="text-4xl font-black text-white">R$ 997<span className="text-base text-zinc-400 font-normal"> à vista</span></div>
                <div className="text-amber-400 text-sm">ou 12x de R$ 99</div>
              </div>
              <Button onClick={() => { setPlanUsername(""); setPlanModal(PLANS.agencia); }}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold py-5 rounded-xl">
                ASSINAR PLANO AGÊNCIAS
              </Button>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-zinc-400 text-xs">
            <Shield className="w-4 h-4 text-green-400" /> Pagamento 100% seguro via InfiniPay
          </div>
        </div>

        <div className="mt-10 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/40 rounded-2xl p-6 text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Tem dúvidas antes de assinar?</h2>
          <p className="text-zinc-300 mb-4">Fale com a nossa equipe e tire suas dúvidas no WhatsApp.</p>
          <a href="https://wa.me/5551992036540?text=Ol%C3%A1%2C%20assisti%20a%20aula%20do%20Sistema%20MRO%20e%20quero%20mais%20informa%C3%A7%C3%B5es"
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-xl">
            <MessageCircle className="w-5 h-5" /> FALAR NO WHATSAPP
          </a>
        </div>
      </section>

      {/* CHECKOUT MODAL — só pede nome de usuário */}
      {planModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-zinc-900 border border-yellow-400/30 rounded-2xl p-6 sm:p-8 shadow-2xl my-auto">
            <button type="button" onClick={() => setPlanModal(null)}
              className="absolute top-3 right-4 text-zinc-500 hover:text-white text-2xl leading-none" aria-label="Fechar">×</button>
            <h2 className="text-xl font-black text-white mb-1">Finalizar — {planModal.name}</h2>
            <p className="text-zinc-400 text-sm mb-5">
              Só falta escolher um <strong className="text-yellow-400">nome de usuário</strong> para acessar o sistema.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const username = planUsername.trim().toLowerCase().replace(/[^a-z0-9_.]/g, "");
                if (username.length < 3) { toast.error("Nome de usuário precisa ter ao menos 3 caracteres (letras, números, _ ou .)"); return; }
                const items = encodeURIComponent(JSON.stringify([{ name: planModal.itemName, price: planModal.priceCents, quantity: 1 }]));
                const params = new URLSearchParams({
                  customer_name: grantedNome,
                  customer_email: grantedEmail,
                  customer_phone: grantedWhats.replace(/\D/g, ""),
                  order_nsu: `${planModal.id}:${username}:${grantedEmail}`,
                  redirect_url: "https://maisresultadosonline.com.br/obrigado",
                });
                const url = `https://checkout.infinitepay.io/paguemro?items=${items}&${params.toString()}`;
                window.open(url, "_blank");
                setPlanModal(null);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs text-zinc-400">Nome</label>
                <Input value={grantedNome} readOnly className="bg-zinc-800/60 border-zinc-700 text-zinc-300 h-11" />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Email</label>
                <Input value={grantedEmail} readOnly className="bg-zinc-800/60 border-zinc-700 text-zinc-300 h-11" />
              </div>
              <div>
                <label className="text-xs text-zinc-400">WhatsApp</label>
                <Input value={grantedWhats} readOnly className="bg-zinc-800/60 border-zinc-700 text-zinc-300 h-11" />
              </div>
              <div>
                <label className="text-xs text-yellow-400 font-semibold">Nome de usuário (para acessar o sistema)</label>
                <Input
                  value={planUsername}
                  onChange={(e) => setPlanUsername(e.target.value)}
                  placeholder="ex: joaomro"
                  className="bg-zinc-800 border-yellow-400/40 text-white h-12"
                  autoFocus required maxLength={30}
                />
                <p className="text-[11px] text-zinc-500 mt-1">Use apenas letras, números, "_" ou "."</p>
              </div>
              <Button type="submit" className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black py-6 text-base rounded-xl">
                IR PARA O PAGAMENTO — {planModal.priceLabel}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
