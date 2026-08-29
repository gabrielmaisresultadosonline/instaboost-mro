import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trackPageView, trackLead, trackInitiateCheckout } from "@/lib/facebookTracking";
import { toast } from "sonner";
import {
  ArrowRight,
  Shield,
  Zap,
  CheckCircle2,
  Lock,
  User,
  Mail,
  Phone,
  Rocket,
  CreditCard,
  Loader2,
  Monitor,
  Code2,
  Infinity as InfinityIcon,
  X,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoMro from "@/assets/logo-mro.png";

/** Preço único do plano mensal (em reais). */
const MONTHLY_PRICE = 97;

interface CheckoutForm {
  name: string;
  email: string;
  password: string;
  whatsapp: string;
}

const EMPTY_FORM: CheckoutForm = { name: "", email: "", password: "", whatsapp: "" };

const FEATURES: string[] = [
  "Créditos ilimitados dentro do Lovable",
  "Crie SaaS, sites e sistemas complexos",
  "Sem limite de projetos ou mensagens",
  "Atualizações automáticas da extensão",
  "Suporte prioritário via WhatsApp",
  "Acesso imediato após o pagamento",
];

const BENEFITS = [
  { icon: InfinityIcon, title: "Créditos Ilimitados", text: "Trabalhe o dia inteiro sem se preocupar com o consumo de créditos." },
  { icon: Code2, title: "Projetos Complexos", text: "Construa SaaS completos, dashboards, APIs e integrações sem travas." },
  { icon: Zap, title: "Alta Velocidade", text: "Extensão leve, otimizada e sem interferir no funcionamento do editor." },
  { icon: Shield, title: "100% Segura", text: "Não altera seu código nem armazena seus projetos. Apenas libera o uso." },
  { icon: Monitor, title: "Funciona no seu PC", text: "Compatível com Chrome, Edge e Brave no Windows, macOS e Linux." },
  { icon: Rocket, title: "Setup em 2 minutos", text: "Instale, faça login com seu acesso e comece a criar imediatamente." },
];

const FAQ = [
  { q: "Como funciona a extensão?", a: "Após a compra você recebe seu acesso, instala a extensão no navegador, faz login com o e-mail e senha cadastrados e passa a usar o Lovable sem consumir seus créditos." },
  { q: "O plano é mensal mesmo?", a: "Sim. É apenas um plano mensal de R$97, sem fidelidade. Você renova quando quiser." },
  { q: "E se eu não gostar?", a: "Você tem 7 dias de garantia incondicional. Se não gostar, devolvemos 100% do valor pago." },
  { q: "Preciso ter conta no Lovable?", a: "Sim, você usa sua própria conta. A extensão apenas remove as limitações de uso durante suas criações." },
  { q: "Funciona em mais de um computador?", a: "O acesso é individual, para uso em uma máquina por vez, para garantir a estabilidade do sistema." },
];

const Lovablack = () => {
  const [showCheckout, setShowCheckout] = useState(false);
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    trackPageView("Sales Page - Lovablack");
  }, []);

  const updateField = (field: keyof CheckoutForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenCheckout = () => {
    setShowCheckout(true);
    trackInitiateCheckout("Lovablack - Mensal", MONTHLY_PRICE);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const whatsapp = form.whatsapp.replace(/\D/g, "");

    if (name.length < 3) { toast.error("Informe seu nome completo."); return; }
    if (!email.includes("@") || email.length < 6) { toast.error("Informe um e-mail válido."); return; }
    if (form.password.length < 6) { toast.error("A senha deve ter no mínimo 6 caracteres."); return; }
    if (whatsapp.length < 10) { toast.error("Informe um WhatsApp válido com DDD."); return; }

    setLoading(true);
    trackLead("Lovablack - Cadastro Checkout");

    try {
      const { data, error } = await supabase.functions.invoke("lovablack-api", {
        body: { action: "checkout", name, email, password: form.password, whatsapp },
      });

      if (error) throw error;
      if (!data?.success) {
        toast.error(data?.error || "Não foi possível gerar o pagamento.");
        return;
      }

      window.location.href = data.payment_link;
    } catch (err) {
      console.error("[Lovablack] checkout error", err);
      toast.error("Erro ao processar. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <style>{`
        .lb-pulse { animation: lb-pulse 2.2s infinite; }
        @keyframes lb-pulse {
          0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.55); }
          70% { box-shadow: 0 0 0 18px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
      `}</style>

      {/* HERO */}
      <header className="relative overflow-hidden px-4 pt-16 pb-20">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-full -translate-x-1/2 rounded-full bg-red-600/10 blur-[140px]" />
        <div className="mx-auto max-w-5xl text-center">
          <img src={logoMro} alt="Logo MRO Lovablack" className="mx-auto mb-8 h-14 md:h-20" />

          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Extensão Oficial Lovablack</span>
          </div>

          <h1 className="mb-6 text-4xl font-black leading-tight md:text-6xl">
            A MELHOR FERRAMENTA <span className="text-red-600">LOVABLE</span> DO MERCADO
          </h1>

          <p className="mx-auto mb-10 max-w-3xl text-lg text-zinc-400 md:text-2xl">
            Use o Lovable sem se preocupar com créditos e construa SaaS, sites e sistemas completos
            com liberdade total. Plano mensal, sem fidelidade.
          </p>

          <Button
            onClick={handleOpenCheckout}
            className="lb-pulse w-full rounded-2xl bg-red-600 px-10 py-8 text-lg font-black text-white hover:bg-red-700 sm:w-auto md:text-xl"
          >
            QUERO ACESSO AGORA — R$97/MÊS
            <ArrowRight className="ml-2 h-6 w-6" />
          </Button>

          <p className="mt-5 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
            <Shield className="h-4 w-4 text-red-600" /> 7 dias de garantia incondicional
          </p>
        </div>
      </header>

      {/* BENEFÍCIOS */}
      <section className="border-y border-zinc-900 bg-zinc-950 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-black md:text-5xl">
            TUDO QUE VOCÊ PRECISA PARA <span className="text-red-600">CRIAR SEM LIMITES</span>
          </h2>
          <p className="mx-auto mb-14 max-w-2xl text-center text-zinc-500">
            Uma extensão feita para quem constrói de verdade: produtos digitais, sistemas e projetos para clientes.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {BENEFITS.map((b) => (
              <article key={b.title} className="rounded-2xl border border-zinc-800 bg-black p-6 transition-colors hover:border-red-600/60">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-600/10">
                  <b.icon className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="mb-2 text-lg font-black text-white">{b.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{b.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PLANO */}
      <section id="pricing" className="px-4 py-24">
        <div className="mx-auto max-w-lg">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-4xl font-black md:text-5xl">PLANO ÚNICO</h2>
            <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Acesso liberado após a confirmação</p>
          </div>

          <Card className="relative overflow-hidden border-red-600 bg-zinc-900 shadow-[0_0_45px_rgba(220,38,38,0.18)]">
            <div className="absolute right-0 top-0 rounded-bl-lg bg-red-600 px-4 py-1 text-[10px] font-black uppercase tracking-tighter text-white">
              Sem fidelidade
            </div>
            <CardHeader className="pb-2 text-center">
              <Badge className="mx-auto mb-4 w-fit border-none bg-red-600 text-white">MENSAL</Badge>
              <CardTitle className="text-3xl font-black text-white">LOVABLACK PRO</CardTitle>
              <div className="mt-5 flex items-baseline justify-center gap-1">
                <span className="text-2xl font-bold text-red-600">R$</span>
                <span className="text-7xl font-black text-white">97</span>
                <span className="font-bold text-zinc-500">/mês</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-7 pt-6">
              <ul className="space-y-3.5">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm font-medium text-zinc-300">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                onClick={handleOpenCheckout}
                className="lb-pulse w-full rounded-xl bg-red-600 py-7 text-lg font-black text-white hover:bg-red-700"
              >
                ASSINAR AGORA
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-black/50 p-4 text-center">
                <Shield className="h-5 w-5 shrink-0 text-red-600" />
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                  Garantia de 7 dias — devolução integral
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* GARANTIA */}
      <section className="border-y border-zinc-900 bg-zinc-950 px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600/10">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="mb-4 text-3xl font-black md:text-4xl">RISCO ZERO POR 7 DIAS</h2>
          <p className="text-lg leading-relaxed text-zinc-400">
            Teste a Lovablack por 7 dias completos. Se por qualquer motivo você achar que não é para você,
            basta nos chamar e devolvemos 100% do valor pago, sem perguntas e sem burocracia.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center text-3xl font-black md:text-4xl">PERGUNTAS FREQUENTES</h2>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div key={item.q} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
                >
                  {item.q}
                  <ChevronDown className={`h-5 w-5 shrink-0 text-red-600 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <p className="border-t border-zinc-800 p-5 text-sm leading-relaxed text-zinc-400">{item.a}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button
              onClick={handleOpenCheckout}
              className="lb-pulse w-full rounded-2xl bg-red-600 px-10 py-7 text-lg font-black text-white hover:bg-red-700 sm:w-auto"
            >
              COMEÇAR POR R$97/MÊS
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-900 px-4 py-12 text-center">
        <img src={logoMro} alt="Logo MRO" className="mx-auto mb-6 h-10 opacity-50" />
        <p className="text-sm text-zinc-600">
          © {new Date().getFullYear()} Lovablack — Uma ferramenta MRO. Todos os direitos reservados.
        </p>
      </footer>

      {/* MODAL DE CHECKOUT */}
      {showCheckout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Finalizar assinatura">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowCheckout(false)} />
          <Card className="relative max-h-[92vh] w-full max-w-md overflow-y-auto border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="relative text-center">
              <button
                type="button"
                onClick={() => setShowCheckout(false)}
                aria-label="Fechar"
                className="absolute right-4 top-4 text-zinc-500 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
              <CardTitle className="text-2xl font-black">CRIAR SEU ACESSO</CardTitle>
              <p className="font-medium text-zinc-400">Plano Mensal — R${MONTHLY_PRICE}/mês</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="lb-name" className="text-xs font-black uppercase text-zinc-500">Nome completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="lb-name"
                      placeholder="Ex: João da Silva"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      maxLength={120}
                      className="border-zinc-700 bg-zinc-800 pl-10 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="lb-email" className="text-xs font-black uppercase text-zinc-500">Seu melhor e-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="lb-email"
                      type="email"
                      placeholder="exemplo@email.com"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      maxLength={255}
                      className="border-zinc-700 bg-zinc-800 pl-10 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="lb-password" className="text-xs font-black uppercase text-zinc-500">Crie sua senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="lb-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={form.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      minLength={6}
                      maxLength={72}
                      className="border-zinc-700 bg-zinc-800 pl-10 text-white"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500">Você usará este e-mail e senha para entrar na extensão.</p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="lb-whatsapp" className="text-xs font-black uppercase text-zinc-500">WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="lb-whatsapp"
                      inputMode="tel"
                      placeholder="(00) 00000-0000"
                      value={form.whatsapp}
                      onChange={(e) => updateField("whatsapp", e.target.value)}
                      maxLength={20}
                      className="border-zinc-700 bg-zinc-800 pl-10 text-white"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-red-600 py-7 text-lg font-black text-white hover:bg-red-700"
                >
                  {loading ? (
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      PAGAR R${MONTHLY_PRICE} E LIBERAR
                      <CreditCard className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>

                <p className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                  <Shield className="h-3 w-3" /> Pagamento seguro • Garantia de 7 dias
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Lovablack;
