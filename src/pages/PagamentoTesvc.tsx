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
  Bot,
  MessageCircle,
  Monitor,
  Crown,
  Sparkles,
  Lock,
  Zap,
  Users,
  Plus,
} from "lucide-react";
import logoMro from "@/assets/logo-mro.png";

/**
 * Plano único: Teste 30 dias · 1 conta Instagram · R$67
 * Order bumps opcionais (o acesso é SEMPRE mensal/30 dias, independente do valor final).
 */
const BASE_PLAN = {
  name: "Teste 30 Dias",
  price: 67,
  accounts: 1,
  planType: "monthly",
  durationLabel: "30 dias de acesso",
} as const;

const BUMP_SUPPORT_PRICE = 19;
const BUMP_ACCOUNTS_PRICE = 10;
const BUMP_ACCOUNTS_QTY = 3;

const BENEFITS = [
  { icon: Bot, text: "Ferramenta MRO completa (Instagram)" },
  { icon: Monitor, text: "Área de Membros completa" },
  { icon: Crown, text: "Acesso liberado na hora do pagamento" },
  { icon: Sparkles, text: "Inteligência Artificial integrada" },
];

const formatBRL = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const PagamentoTesvc = () => {
  const [withSupport, setWithSupport] = useState(false);
  const [withExtraAccounts, setWithExtraAccounts] = useState(false);
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
    trackPageView("Pagamento Tesvc - Teste 30 Dias");
  }, []);

  const totalPrice =
    BASE_PLAN.price +
    (withSupport ? BUMP_SUPPORT_PRICE : 0) +
    (withExtraAccounts ? BUMP_ACCOUNTS_PRICE : 0);

  const totalAccounts = BASE_PLAN.accounts + (withExtraAccounts ? BUMP_ACCOUNTS_QTY : 0);
  

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

    setLoading(true);
    try {
      const extras: string[] = [];
      if (withSupport) extras.push("suporte-whatsapp");
      if (withExtraAccounts) extras.push("mais-3-contas");

      const { data, error } = await supabase.functions.invoke("create-mro-checkout", {
        body: {
          email: email.toLowerCase().trim(),
          username: username.toLowerCase().trim(),
          phone: phone.replace(/\D/g, "").trim(),
          name: name.trim(),
          // Acesso SEMPRE mensal (30 dias), independente dos order bumps escolhidos
          planType: BASE_PLAN.planType,
          amount: totalPrice,
          checkUserExists: true,
          source: extras.length ? `tesvc:${extras.join("+")}` : "tesvc",
          redirectTo: "https://maisresultadosonline.com.br/pagamentotesvc/obrigado",
        },
      });
      if (error) { toast.error("Erro ao criar link de pagamento"); return; }
      if (data?.userExists) {
        toast.error("Este usuário já está em uso.");
        setUsernameError("Usuário já existe, escolha outro");
        return;
      }
      if (!data?.success) { toast.error(data?.error || "Erro ao criar pagamento"); return; }
      trackInitiateCheckout(`Tesvc ${BASE_PLAN.name}`, totalPrice);
      window.location.href = data.payment_link;
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-amber-300/60">
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-40 -right-32 w-[520px] h-[520px] rounded-full bg-amber-200/40 blur-3xl" />
      </div>

      <header className="border-b border-zinc-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <img src={logoMro} alt="MRO" className="h-8" />
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
            <Lock className="w-3.5 h-3.5" />
            Checkout 100% seguro
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-4 border border-emerald-200">
            <Zap className="w-3 h-3" /> Plano único · 30 dias
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">
            Teste a Ferramenta MRO por{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-emerald-700 bg-clip-text text-transparent">30 dias</span>
          </h1>
          <p className="text-zinc-600 mt-3 text-base">
            <strong>{formatBRL(BASE_PLAN.price)}</strong> · 1 conta do Instagram · acesso liberado após o pagamento
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <form onSubmit={handleCheckout} className="lg:col-span-3 space-y-5">
            {/* Order bumps */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-3 shadow-sm">
              <div>
                <h2 className="font-black text-xl text-zinc-900">Quer melhorar seu plano?</h2>
                <p className="text-xs text-zinc-500 mt-1">Opcional · o acesso continua de 30 dias.</p>
              </div>

              <button
                type="button"
                onClick={() => setWithSupport((v) => !v)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${withSupport ? "border-emerald-500 bg-emerald-50" : "border-zinc-200 hover:border-emerald-300 bg-white"}`}
              >
                <span className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${withSupport ? "bg-emerald-500 border-emerald-500 text-white" : "border-zinc-300"}`}>
                  {withSupport && <CheckCircle2 className="w-4 h-4" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2 font-bold text-zinc-900">
                    <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    Suporte via WhatsApp
                  </span>
                  <span className="block text-xs text-zinc-600 mt-1">
                    Atendimento direto com nosso time durante os 30 dias.
                  </span>
                </span>
                <span className="font-black text-emerald-700 whitespace-nowrap">+ {formatBRL(BUMP_SUPPORT_PRICE)}</span>
              </button>

              <button
                type="button"
                onClick={() => setWithExtraAccounts((v) => !v)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${withExtraAccounts ? "border-amber-500 bg-amber-50" : "border-zinc-200 hover:border-amber-300 bg-white"}`}
              >
                <span className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${withExtraAccounts ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-300"}`}>
                  {withExtraAccounts && <CheckCircle2 className="w-4 h-4" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2 font-bold text-zinc-900">
                    <Users className="w-4 h-4 text-amber-600 shrink-0" />
                    + {BUMP_ACCOUNTS_QTY} contas do Instagram
                  </span>
                  <span className="block text-xs text-zinc-600 mt-1">
                    Gerencie até {BASE_PLAN.accounts + BUMP_ACCOUNTS_QTY} contas na mesma ferramenta.
                  </span>
                </span>
                <span className="font-black text-amber-700 whitespace-nowrap">+ {formatBRL(BUMP_ACCOUNTS_PRICE)}</span>
              </button>
            </div>

            {/* Dados */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-sm">
              <div>
                <h2 className="font-black text-xl text-zinc-900">Seus dados</h2>
                <p className="text-xs text-zinc-500 mt-1">Usuário e senha de acesso são enviados por email após o pagamento.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">Nome completo</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como devemos te chamar" className="mt-1 bg-white border-zinc-300" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700">Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="mt-1 bg-white border-zinc-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700">WhatsApp (com DDD)</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="mt-1 bg-white border-zinc-300" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700">Usuário de acesso</label>
                <Input
                  value={username}
                  onChange={(e) => validateUsername(e.target.value)}
                  placeholder="apenas letras minúsculas"
                  className="mt-1 bg-white border-zinc-300"
                />
                {usernameError && <p className="text-xs text-red-500 mt-1 font-medium">{usernameError}</p>}
                {usernameAvailable === true && !usernameError && (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">✓ Usuário disponível</p>
                )}
                {checkingUsername && <p className="text-xs text-zinc-500 mt-1">Verificando…</p>}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-auto min-h-14 py-3 px-4 whitespace-normal text-center text-sm sm:text-base font-black bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30 transition-all"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando link…</>
                ) : (
                  <>🚀 Pagar agora · {formatBRL(totalPrice)}</>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 text-center">
                <Lock className="w-3 h-3 shrink-0" /> Pagamento processado com segurança pela InfiniPay
              </div>
            </div>
          </form>

          <aside className="lg:col-span-2">
            <div className="sticky top-24 bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                <h2 className="font-black text-zinc-900">Resumo do pedido</h2>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 p-4">
                <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-700 mb-1">Plano</div>
                <div className="font-black text-xl text-zinc-900">{BASE_PLAN.name}</div>
                <div className="text-xs text-zinc-600 mt-1">{BASE_PLAN.durationLabel}</div>

                <div className="mt-4 space-y-1.5 text-sm border-t border-emerald-200 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600">Plano base</span>
                    <span className="font-bold">{formatBRL(BASE_PLAN.price)}</span>
                  </div>
                  {withSupport && (
                    <div className="flex items-center justify-between text-emerald-700">
                      <span className="flex items-center gap-1"><Plus className="w-3 h-3" /> Suporte WhatsApp</span>
                      <span className="font-bold">{formatBRL(BUMP_SUPPORT_PRICE)}</span>
                    </div>
                  )}
                  {withExtraAccounts && (
                    <div className="flex items-center justify-between text-amber-700">
                      <span className="flex items-center gap-1"><Plus className="w-3 h-3" /> +{BUMP_ACCOUNTS_QTY} contas</span>
                      <span className="font-bold">{formatBRL(BUMP_ACCOUNTS_PRICE)}</span>
                    </div>
                  )}
                </div>

                <div className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent mt-3">
                  {formatBRL(totalPrice)}
                </div>
                <div className="text-xs text-zinc-600 mt-3 font-medium">
                  {totalAccounts} {totalAccounts === 1 ? "conta" : "contas"} Instagram · 30 dias
                </div>
              </div>

              <ul className="space-y-2.5">
                {BENEFITS.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-zinc-700">{b.text}</span>
                  </li>
                ))}
                {withSupport && (
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-zinc-700">Suporte via WhatsApp incluso</span>
                  </li>
                )}
              </ul>

              <div className="flex items-center gap-3 rounded-xl border-2 border-emerald-500/40 bg-emerald-50 p-3">
                <Shield className="w-6 h-6 text-emerald-600 shrink-0" />
                <p className="text-sm font-bold text-emerald-700">Acesso mensal · 30 dias</p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t border-zinc-200 py-6 mt-10 bg-white">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-zinc-500">
          © MRO · Todos os direitos reservados · Gabriel Fernandes da Silva · CNPJ 54.840.738/0001-96
        </div>
      </footer>
    </div>
  );
};

export default PagamentoTesvc;
