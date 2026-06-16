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
                  <h2 className="text-2xl font-black text-white mb-1 text-center">Acessar Ferramenta MRO</h2>
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
                  <p className="text-zinc-400 text-sm text-center mb-5">Libere acesso imediato a ferramenta MRO!</p>
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


  // Granted view — mesma página de /instagram-nova, com o vídeo do /instagrammnew
  return (
    <InstagramNovaPlan
      videoSlot={
        <InstagrammNewVideoPlayer email={grantedEmail} nome={grantedNome} />
      }
    />
  );
}
