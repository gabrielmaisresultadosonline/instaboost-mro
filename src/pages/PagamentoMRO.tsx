import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { trackPageView, trackInitiateCheckout } from "@/lib/facebookTracking";
import { toast } from "sonner";
import {
  CheckCircle2,
  Shield,
  Loader2,
  Users,
  Bot,
  MessageCircle,
  Monitor,
  Crown,
  Sparkles,
  Lock,
} from "lucide-react";
import logoMro from "@/assets/logo-mro.png";

const PLANS = {
  pro: {
    name: "Pro",
    price: 397.0,
    days: 365,
    installment: "41",
    accounts: 4,
    highlight: false,
  },
  agencia: {
    name: "Agência",
    price: 997.0,
    days: 365,
    installment: "81",
    accounts: 10,
    highlight: true,
  },
} as const;

const BENEFITS = [
  { icon: Bot, text: "Ferramenta MRO completa (Instagram)" },
  { icon: Monitor, text: "Área de Membros completa" },
  { icon: Crown, text: "Grupo VIP Vitalício" },
  { icon: MessageCircle, text: "Suporte via WhatsApp" },
  { icon: Users, text: "Suporte via AnyDesk" },
  { icon: Sparkles, text: "Inteligência Artificial integrada" },
  { icon: Users, text: "Acesso a até 4 contas Instagram (Pro)" },
];

const PagamentoMRO = () => {
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "agencia">("pro");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [loading, setLoading] = useState(false);
  const usernameCheckTimeoutRef = useRef<any | null>(null);

  useEffect(() => {
    trackPageView("Pagamento MRO - Checkout Direto");
  }, []);

  const checkUsernameAvailability = async (u: string): Promise<boolean | null> => {
    if (u.length < 4) { setUsernameAvailable(null); return null; }
    setCheckingUsername(true);
    try {
      const body = new URLSearchParams({ nome: u, numero: u });
      const response = await fetch("https://dashboardmroinstagramvini-online.squareweb.app/verificar-numero", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) { setUsernameAvailable(null); return null; }
      if (data?.senhaCorrespondente === true) {
        setUsernameAvailable(false);
        setUsernameError("Usuário já em uso. Utilize outro usuário");
        return false;
      }
      if (data?.senhaCorrespondente === false) {
        setUsernameAvailable(true);
        setUsernameError("");
        return true;
      }
      return null;
    } catch { return null; } finally { setCheckingUsername(false); }
  };

  const validateUsername = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z]/g, "");
    setUsername(cleaned); setUsernameAvailable(null);
    if (usernameCheckTimeoutRef.current) clearTimeout(usernameCheckTimeoutRef.current);
    if (value !== cleaned) { setUsernameError("Apenas letras minúsculas, sem espaços ou números"); return; }
    if (cleaned.length < 4) { setUsernameError("Mínimo de 4 caracteres"); return; }
    if (cleaned.length > 20) { setUsernameError("Máximo de 20 caracteres"); return; }
    setUsernameError("");
    usernameCheckTimeoutRef.current = setTimeout(() => { void checkUsernameAvailability(cleaned); }, 500);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) { toast.error("Informe seu nome"); return; }
    if (!email || !email.includes("@")) { toast.error("Email inválido"); return; }
    if (!phone || phone.replace(/\D/g, "").length < 10) { toast.error("WhatsApp inválido com DDD"); return; }
    if (!username || username.length < 4) { toast.error("Usuário deve ter no mínimo 4 caracteres"); return; }
    if (usernameError) { toast.error(usernameError); return; }
    if (checkingUsername) { toast.error("Aguarde a verificação do usuário"); return; }
    const availability = usernameAvailable ?? (await checkUsernameAvailability(username.toLowerCase().trim()));
    if (availability === false) { toast.error("Este usuário já está em uso"); return; }
    if (availability !== true) { toast.error("Não foi possível verificar o usuário. Tente novamente."); return; }

    setLoading(true);
    try {
      const plan = PLANS[selectedPlan];
      const { data, error } = await supabase.functions.invoke("create-mro-checkout", {
        body: {
          email: email.toLowerCase().trim(),
          username: username.toLowerCase().trim(),
          phone: phone.replace(/\D/g, "").trim(),
          name: name.trim(),
          planType: selectedPlan,
          amount: plan.price,
          checkUserExists: true,
          redirectTo: "https://maisresultadosonline.com.br/pagamentomro/obrigado",
        },
      });
      if (error) { toast.error("Erro ao criar link de pagamento"); return; }
      if (data.userExists) {
        toast.error("Este usuário já está em uso.");
        setUsernameError("Usuário já existe, escolha outro");
        return;
      }
      if (!data.success) { toast.error(data.error || "Erro ao criar pagamento"); return; }
      trackInitiateCheckout(`Plano ${plan.name}`, plan.price);
      window.location.href = data.payment_link;
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const plan = PLANS[selectedPlan];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <img src={logoMro} alt="MRO" className="h-8" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5" />
            Checkout seguro
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
            Ative sua <span className="bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">Ferramenta MRO</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Preencha seus dados, escolha seu plano e receba acesso imediato após o pagamento.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Form + Plans */}
          <form onSubmit={handleCheckout} className="lg:col-span-3 space-y-6">
            {/* Plan Selector */}
            <div className="grid sm:grid-cols-2 gap-3">
              {(Object.keys(PLANS) as Array<keyof typeof PLANS>).map((key) => {
                const p = PLANS[key];
                const active = selectedPlan === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedPlan(key)}
                    className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                      active
                        ? "border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/10"
                        : "border-border hover:border-amber-500/50 bg-card"
                    }`}
                  >
                    {p.highlight && (
                      <span className="absolute -top-2 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-black">
                        MAIS COMPLETO
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className={`w-4 h-4 ${active ? "text-amber-500" : "text-muted-foreground"}`} />
                      <span className="font-bold">Plano {p.name}</span>
                    </div>
                    <div className="text-2xl font-black">
                      R$ {p.price.toFixed(2).replace(".", ",")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ou 12x de R$ {p.installment} · {p.accounts} contas · 1 ano
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Form fields */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="font-bold text-lg">Seus dados</h2>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nome completo</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como devemos te chamar" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">WhatsApp (com DDD)</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Usuário de acesso</label>
                <Input
                  value={username}
                  onChange={(e) => validateUsername(e.target.value)}
                  placeholder="apenas letras minúsculas"
                />
                {usernameError && <p className="text-xs text-destructive mt-1">{usernameError}</p>}
                {usernameAvailable === true && !usernameError && (
                  <p className="text-xs text-emerald-500 mt-1">Usuário disponível</p>
                )}
                {checkingUsername && <p className="text-xs text-muted-foreground mt-1">Verificando…</p>}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-bold bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando link…</>
                ) : (
                  <>Pagar agora · R$ {plan.price.toFixed(2).replace(".", ",")}</>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Lock className="w-3 h-3" /> Pagamento processado com segurança pela InfiniPay
              </div>
            </div>

            {/* Guarantee */}
            <div className="relative overflow-hidden rounded-xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 p-5">
              <div className="flex items-center gap-4">
                <div className="shrink-0 w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Shield className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-black text-emerald-600 dark:text-emerald-400 text-lg">
                    Garantia incondicional de 30 dias
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Se não gostar, devolvemos 100% do seu dinheiro. Sem perguntas.
                  </p>
                </div>
              </div>
            </div>
          </form>

          {/* Right: What's included */}
          <aside className="lg:col-span-2">
            <div className="sticky top-24 bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold">O que você recebe</h2>
              </div>
              <ul className="space-y-3">
                {BENEFITS.map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{b.text}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground mb-1">Você está adquirindo</div>
                <div className="font-bold">Plano {plan.name}</div>
                <div className="text-2xl font-black text-amber-500">
                  R$ {plan.price.toFixed(2).replace(".", ",")}
                </div>
                <div className="text-xs text-muted-foreground">
                  ou 12x de R$ {plan.installment} · Acesso por 1 ano
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t border-border/50 py-6 mt-10">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-muted-foreground">
          © MRO · Todos os direitos reservados
        </div>
      </footer>
    </div>
  );
};

export default PagamentoMRO;
