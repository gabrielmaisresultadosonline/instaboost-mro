import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trackLead, trackPageView, trackButtonClick } from "@/lib/facebookTracking";
import {
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  BadgeCheck,
  Zap,
  ArrowRight,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";

interface LeadForm {
  nome: string;
  email: string;
  whatsapp: string;
}

const EMPRESAS = [
  "Vivo",
  "Claro",
  "Magazine Luiza",
  "Havan",
  "iFood",
  "Nubank",
  "Americanas",
  "Bradesco",
];

const BENEFICIOS = [
  { icon: ShieldCheck, title: "Zero risco de banimento", desc: "Número aprovado pela Meta, dentro das regras oficiais." },
  { icon: Users, title: "Vários atendentes", desc: "Toda a equipe no mesmo número, com histórico e CRM." },
  { icon: Zap, title: "Chatbot e automações", desc: "Funis, respostas rápidas e atendimento 24h." },
  { icon: BadgeCheck, title: "Selo verificado", desc: "Mais autoridade e confiança na hora da venda." },
];

const emailValido = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

const ZapZap = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [grupoLink, setGrupoLink] = useState("");
  const [form, setForm] = useState<LeadForm>({ nome: "", email: "", whatsapp: "" });

  useEffect(() => {
    document.title = "WhatsApp API Oficial - Zero Risco | Teste 2 Dias Grátis";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute(
        "content",
        "Atenda pelo WhatsApp com API Oficial da Meta: zero risco de banimento, vários atendentes e automações. Teste 02 dias grátis e entre no grupo.",
      );
    }
    trackPageView("ZapZap - Captura WhatsApp API Oficial");
  }, []);

  const abrirQuiz = (origem: string) => {
    trackButtonClick(`zapzap_cta_${origem}`, "ZapZap");
    setOpen(true);
  };

  const formatWhatsapp = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const avancar = async () => {
    if (step === 0) {
      if (form.nome.trim().length < 2) return toast.error("Digite seu nome completo");
      return setStep(1);
    }
    if (step === 1) {
      if (!emailValido(form.email.trim())) return toast.error("Digite um e-mail válido");
      return setStep(2);
    }
    if (form.whatsapp.replace(/\D/g, "").length < 10) return toast.error("Digite um WhatsApp válido com DDD");

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("zapzap-register", {
        body: {
          action: "register",
          nome: form.nome.trim(),
          email: form.email.trim(),
          whatsapp: form.whatsapp.trim(),
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao cadastrar");

      trackLead("zapzap_grupo_whatsapp", {
        email: form.email.trim(),
        phone: form.whatsapp.replace(/\D/g, ""),
        content_name: "ZapZap - Grupo WhatsApp API Oficial",
      });

      setGrupoLink(data.grupo_link || "");
      setDone(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível concluir seu cadastro");
    } finally {
      setLoading(false);
    }
  };

  const CTA = ({ label, origem }: { label: string; origem: string }) => (
    <Button
      onClick={() => abrirQuiz(origem)}
      size="lg"
      className="w-full sm:w-auto whitespace-normal bg-[#25D366] px-8 py-6 text-base font-bold text-[#062e15] shadow-[0_10px_40px_-10px_rgba(37,211,102,0.8)] transition-transform hover:scale-105 hover:bg-[#1ebe5b] sm:text-lg"
    >
      <MessageCircle className="mr-2 h-5 w-5 shrink-0" />
      {label}
      <ArrowRight className="ml-2 h-5 w-5 shrink-0" />
    </Button>
  );

  return (
    <div className="min-h-screen bg-[#0b141a] text-slate-100">
      {/* HERO */}
      <header className="relative overflow-hidden border-b border-[#25D366]/20 px-4 py-16 sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{ background: "radial-gradient(circle at 50% 0%, #075E54 0%, transparent 60%)" }}
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#25D366]/40 bg-[#25D366]/10 px-4 py-1.5 text-xs font-semibold text-[#25D366] sm:text-sm">
            <Sparkles className="h-4 w-4" /> API OFICIAL META BUSINESS
          </span>
          <h1 className="mt-6 text-3xl font-extrabold leading-tight sm:text-5xl">
            WhatsApp com API Oficial:{" "}
            <span className="bg-gradient-to-r from-[#25D366] to-[#5cf59a] bg-clip-text text-transparent">
              zero risco!
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-300 sm:text-lg">
            Pare de perder número e cliente. Atenda com segurança total, vários atendentes e automações —{" "}
            <strong className="text-white">teste 02 dias grátis</strong>.
          </p>
          <div className="mt-8 flex justify-center">
            <CTA label="PARTICIPE DO GRUPO NO WHATSAPP" origem="hero" />
          </div>
          <p className="mt-4 text-xs text-slate-400">Cadastro rápido • Link do grupo liberado na hora</p>
        </div>
      </header>

      {/* EMPRESAS */}
      <section className="border-b border-white/5 px-4 py-14">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">As maiores empresas usam API OFICIAL WhatsApp</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
            Vivo, Claro, Magazine Luiza, Havan entre outras utilizam a ferramenta oficial para atendimento.{" "}
            <strong className="text-[#25D366]">Entre para a turma dos gigantes e utilize você também!</strong>
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {EMPRESAS.map((e) => (
              <div
                key={e}
                className="rounded-xl border border-white/10 bg-[#111b21] px-4 py-5 text-sm font-semibold text-slate-200 transition-colors hover:border-[#25D366]/50"
              >
                {e}
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <CTA label="QUERO ENTRAR NO GRUPO" origem="empresas" />
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Por que a API Oficial é zero risco</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {BENEFICIOS.map((b) => (
              <div
                key={b.title}
                className="rounded-2xl border border-white/10 bg-[#111b21] p-6 transition-transform hover:-translate-y-1"
              >
                <b.icon className="h-8 w-8 text-[#25D366]" />
                <h3 className="mt-4 text-lg font-bold">{b.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{b.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <CTA label="PARTICIPE DO GRUPO NO WHATSAPP" origem="beneficios" />
          </div>
        </div>
      </section>

      {/* FINAL */}
      <section className="border-t border-[#25D366]/20 bg-gradient-to-b from-[#075E54]/30 to-transparent px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-extrabold sm:text-4xl">Teste 02 dias grátis</h2>
          <p className="mt-4 text-base text-slate-300">
            Entre no grupo do WhatsApp e receba o passo a passo para ativar a API Oficial no seu número.
          </p>
          <div className="mt-8 flex justify-center">
            <CTA label="PARTICIPE DO GRUPO AGORA" origem="final" />
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 px-4 py-8 text-center text-xs text-slate-500">
        © MRO • Mais Resultados Online
      </footer>

      {/* QUIZ MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="animate-in fade-in zoom-in-95 relative w-full max-w-md rounded-2xl border border-[#25D366]/30 bg-[#111b21] p-6 shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {done ? (
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-14 w-14 text-[#25D366]" />
                <h3 className="mt-4 text-xl font-bold">Cadastro confirmado!</h3>
                <p className="mt-2 text-sm text-slate-300">
                  Enviamos o resumo da ferramenta e o link do grupo no seu e-mail.
                </p>
                {grupoLink ? (
                  <a href={grupoLink} target="_blank" rel="noopener noreferrer" className="mt-6 block">
                    <Button className="w-full bg-[#25D366] py-6 font-bold text-[#062e15] hover:bg-[#1ebe5b]">
                      <MessageCircle className="mr-2 h-5 w-5" /> ENTRAR NO GRUPO
                    </Button>
                  </a>
                ) : (
                  <p className="mt-6 text-sm text-amber-400">
                    O link do grupo será enviado por e-mail em instantes.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="mb-6 flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i <= step ? "bg-[#25D366]" : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#25D366]">
                  Etapa {step + 1} de 3
                </p>

                {step === 0 && (
                  <div className="mt-4 animate-in fade-in slide-in-from-right-4">
                    <h3 className="text-lg font-bold">Qual é o seu nome?</h3>
                    <Input
                      autoFocus
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value.slice(0, 120) })}
                      onKeyDown={(e) => e.key === "Enter" && avancar()}
                      placeholder="Seu nome completo"
                      className="mt-4 border-white/10 bg-[#0b141a] py-6 text-base"
                    />
                  </div>
                )}
                {step === 1 && (
                  <div className="mt-4 animate-in fade-in slide-in-from-right-4">
                    <h3 className="text-lg font-bold">Qual é o seu melhor e-mail?</h3>
                    <Input
                      autoFocus
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value.slice(0, 200) })}
                      onKeyDown={(e) => e.key === "Enter" && avancar()}
                      placeholder="voce@email.com"
                      className="mt-4 border-white/10 bg-[#0b141a] py-6 text-base"
                    />
                    <p className="mt-2 text-xs text-slate-400">Enviaremos o link do grupo também por e-mail.</p>
                  </div>
                )}
                {step === 2 && (
                  <div className="mt-4 animate-in fade-in slide-in-from-right-4">
                    <h3 className="text-lg font-bold">Qual é o seu WhatsApp?</h3>
                    <Input
                      autoFocus
                      inputMode="numeric"
                      value={form.whatsapp}
                      onChange={(e) => setForm({ ...form, whatsapp: formatWhatsapp(e.target.value) })}
                      onKeyDown={(e) => e.key === "Enter" && avancar()}
                      placeholder="(11) 99999-9999"
                      className="mt-4 border-white/10 bg-[#0b141a] py-6 text-base"
                    />
                  </div>
                )}

                <Button
                  onClick={avancar}
                  disabled={loading}
                  className="mt-6 w-full bg-[#25D366] py-6 font-bold text-[#062e15] hover:bg-[#1ebe5b]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Liberando...
                    </>
                  ) : step === 2 ? (
                    "LIBERAR LINK DO GRUPO"
                  ) : (
                    "AVANÇAR"
                  )}
                </Button>
                {step > 0 && !loading && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="mt-3 w-full text-xs text-slate-400 hover:text-white"
                  >
                    Voltar
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ZapZap;
