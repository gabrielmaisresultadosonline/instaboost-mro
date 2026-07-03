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
  ArrowLeft,
  Zap,
  Infinity as InfinityIcon,
} from "lucide-react";
import logoMro from "@/assets/logo-mro.png";

type PlanKey = "solo" | "pro" | "lifetime" | "trial";

const PLANS: Record<PlanKey, {
  name: string;
  price: number;
  installment: string;
  accounts: number;
  planType: string;
  durationLabel: string;
  badge?: string;
  highlight?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  solo: {
    name: "Anual Solo",
    price: 247.0,
    installment: "20",
    accounts: 1,
    planType: "solo",
    durationLabel: "1 ano de acesso",
    icon: Crown,
  },
  pro: {
    name: "Anual Pro",
    price: 397.0,
    installment: "33",
    accounts: 4,
    planType: "pro",
    durationLabel: "1 ano de acesso",
    badge: "MAIS VENDIDO",
    highlight: true,
    icon: Sparkles,
  },
  lifetime: {
    name: "Agência Vitalício",
    price: 1197.0,
    installment: "99",
    accounts: 12,
    planType: "lifetime",
    durationLabel: "Pagamento único · Vitalício",
    badge: "MELHOR CUSTO",
    icon: InfinityIcon,
  },
  trial: {
    name: "Teste 1 Dia",
    price: 97.0,
    installment: "8",
    accounts: 4,
    planType: "trial",
    durationLabel: "1 dia de acesso",
    icon: Zap,
  },
};

const BENEFITS = [
  { icon: Bot, text: "Ferramenta MRO completa (Instagram)" },
  { icon: Monitor, text: "Área de Membros completa" },
  { icon: Crown, text: "Grupo VIP Vitalício" },
  { icon: MessageCircle, text: "Suporte via WhatsApp" },
  { icon: Users, text: "Suporte via AnyDesk" },
  { icon: Sparkles, text: "Inteligência Artificial integrada" },
];

const formatBRL = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const PagamentoMRO = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("pro");
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

  const handleSelectPlan = (key: PlanKey) => {
    setSelectedPlan(key);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
          planType: plan.planType,
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
  const planKeys: PlanKey[] = ["solo", "pro", "lifetime", "trial"];

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

      {/* Sem juros badge */}
      <div className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 text-black py-2 text-center font-black text-sm md:text-base animate-pulse">
        ✨ PARCELAS SEM JUROS · Em até 12x no cartão ✨
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-6 text-xs">
          <span className={`px-3 py-1 rounded-full font-bold ${step === 1 ? "bg-amber-500 text-black" : "bg-emerald-500 text-black"}`}>
            1 · Escolha o plano
          </span>
          <span className="w-6 h-px bg-border" />
          <span className={`px-3 py-1 rounded-full font-bold ${step === 2 ? "bg-amber-500 text-black" : "bg-muted text-muted-foreground"}`}>
            2 · Seus dados
          </span>
        </div>

        {step === 1 && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
                Escolha seu <span className="bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">plano MRO</span>
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Todos os planos com <strong className="text-emerald-500">parcelamento sem juros</strong> em até 12x no cartão.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {planKeys.map((key) => {
                const p = PLANS[key];
                const Icon = p.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectPlan(key)}
                    className={`relative text-left p-5 rounded-2xl border-2 transition-all hover:-translate-y-1 hover:shadow-xl ${
                      p.highlight
                        ? "border-amber-500 bg-gradient-to-b from-amber-500/10 to-transparent shadow-lg shadow-amber-500/10"
                        : "border-border bg-card hover:border-amber-500/50"
                    }`}
                  >
                    {p.badge && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-black">
                        {p.badge}
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-5 h-5 text-amber-500" />
                      <span className="font-bold">{p.name}</span>
                    </div>
                    <div className="text-3xl font-black mb-1">
                      {formatBRL(p.price)}
                    </div>
                    <div className="text-xs font-bold text-emerald-500 mb-3">
                      12x de R$ {p.installment} sem juros
                    </div>
                    <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border pt-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        {p.accounts} {p.accounts === 1 ? "conta" : "contas"} Instagram
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        {p.durationLabel}
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        Ferramenta MRO + Área VIP
                      </div>
                    </div>
                    <div className={`mt-4 w-full text-center py-2 rounded-lg font-bold text-sm ${
                      p.highlight ? "bg-amber-500 text-black" : "bg-muted text-foreground"
                    }`}>
                      Selecionar
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Guarantee */}
            <div className="mt-8 max-w-2xl mx-auto relative overflow-hidden rounded-xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 p-5">
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
          </>
        )}

        {step === 2 && (
          <>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Trocar plano
            </button>

            <div className="grid lg:grid-cols-5 gap-6">
              <form onSubmit={handleCheckout} className="lg:col-span-3 space-y-6">
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
                      <>Pagar agora · {formatBRL(plan.price)}</>
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Lock className="w-3 h-3" /> Pagamento processado com segurança pela InfiniPay
                  </div>
                </div>

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
                        Se não gostar, devolvemos 100% do seu dinheiro.
                      </p>
                    </div>
                  </div>
                </div>
              </form>

              <aside className="lg:col-span-2">
                <div className="sticky top-24 bg-card border border-border rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h2 className="font-bold">Resumo do pedido</h2>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="text-xs text-muted-foreground mb-1">Plano selecionado</div>
                    <div className="font-bold text-lg">{plan.name}</div>
                    <div className="text-3xl font-black text-amber-500 mt-1">
                      {formatBRL(plan.price)}
                    </div>
                    <div className="text-xs font-bold text-emerald-500 mt-1">
                      12x de R$ {plan.installment} SEM JUROS
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {plan.accounts} {plan.accounts === 1 ? "conta" : "contas"} · {plan.durationLabel}
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {BENEFITS.map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-xs">{b.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>
          </>
        )}
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
