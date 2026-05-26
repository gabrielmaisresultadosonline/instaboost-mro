import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CheckCircle2,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Users,
  Rocket,
  ArrowRight,
  ArrowLeft,
  X,
  Building2,
  Package,
  Wrench,
  Smartphone,
  Repeat,
  Monitor,
  Laptop,
  Ban,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { trackLead } from "@/lib/facebookTracking";

interface Settings {
  whatsapp_group_link: string;
  page_title: string | null;
  page_subtitle: string | null;
}

type PerfilKey =
  | "tem_empresa"
  | "vende_produto"
  | "presta_servico"
  | "iniciando_digital"
  | "marca_e_passa";

const PERFIS: { key: PerfilKey; label: string; icon: typeof Building2 }[] = [
  { key: "tem_empresa", label: "Tenho empresa", icon: Building2 },
  { key: "vende_produto", label: "Vendo produto", icon: Package },
  { key: "presta_servico", label: "Presto serviço", icon: Wrench },
  { key: "iniciando_digital", label: "Estou começando no digital", icon: Smartphone },
];

type DispositivoKey = "celular" | "computador" | "notebook" | "nenhum";

const DISPOSITIVOS: { key: DispositivoKey; label: string; icon: typeof Smartphone }[] = [
  { key: "celular", label: "Celular", icon: Smartphone },
  { key: "computador", label: "Computador de mesa", icon: Monitor },
  { key: "notebook", label: "Notebook", icon: Laptop },
  { key: "nenhum", label: "Nenhum", icon: Ban },
];

const Empresas = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ link: string } | null>(null);

  const [form, setForm] = useState({
    nome_completo: "",
    email: "",
    whatsapp: "",
    dispositivo: "" as DispositivoKey | "",
    perfil: "" as PerfilKey | "",
  });

  useEffect(() => {
    supabase
      .from("empresas_settings")
      .select("whatsapp_group_link, page_title, page_subtitle")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSettings(data as Settings | null));
  }, []);

  const openModal = () => {
    setStep(0);
    setDone(null);
    setForm({ nome_completo: "", email: "", whatsapp: "", dispositivo: "", perfil: "" });
    setOpen(true);
  };

  const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const next = () => {
    if (step === 0 && !form.nome_completo.trim()) return toast.error("Digite seu nome");
    if (step === 1 && !validEmail(form.email)) return toast.error("Email inválido");
    if (step === 2 && form.whatsapp.replace(/\D/g, "").length < 10)
      return toast.error("WhatsApp inválido");
    if (step === 3 && !form.dispositivo) return toast.error("Escolha uma opção");
    setStep((s) => s + 1);
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    if (!form.perfil) return toast.error("Escolha uma opção");
    setSubmitting(true);
    try {
      const payload = {
        nome_completo: form.nome_completo,
        email: form.email,
        whatsapp: form.whatsapp,
        dispositivo: form.dispositivo || null,
        tem_empresa: form.perfil === "tem_empresa" ? "sim" : "nao",
        vende_produto: form.perfil === "vende_produto" ? "sim" : "nao",
        presta_servico: form.perfil === "presta_servico" ? "sim" : "nao",
        iniciando_digital: form.perfil === "iniciando_digital" ? "sim" : "nao",
        marca_e_passa: form.perfil === "marca_e_passa" ? "sim" : "nao",
      };
      const { data, error } = await supabase.functions.invoke("empresas-register", {
        body: payload,
      });
      if (error || !data?.success)
        throw new Error(data?.error || error?.message || "Erro ao cadastrar");
      setDone({ link: data.whatsappGroupLink || settings?.whatsapp_group_link || "" });
      try { trackLead("Empresas - Grupo WhatsApp"); } catch {}
      toast.success("Cadastro confirmado!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setSubmitting(false);
    }
  };

  const totalSteps = 5;
  const progress = done ? 100 : ((step + (submitting ? 0.5 : 0)) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Decorative background */}
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-yellow-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] bg-yellow-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 md:px-8 py-5 flex items-center justify-between border-b border-white/5">
        <Logo size="md" />
        <span className="hidden sm:inline text-xs uppercase tracking-widest text-yellow-400 font-semibold">
          Grupo · Empresas
        </span>
      </header>

      {/* HERO */}
      <section className="relative z-10 px-4 md:px-8 pt-12 md:pt-20 pb-12 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold mb-6">
          <Sparkles className="w-4 h-4" /> GRUPO ESPECIAL · 100% GRATUITO
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight mb-5 leading-tight">
          {settings?.page_title || (
            <>
              Aprenda grátis como a <span className="text-yellow-400">MRO</span> pode te
              ajudar no seu negócio
            </>
          )}
        </h1>
        <p className="text-base md:text-xl text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed">
          {settings?.page_subtitle ||
            "Grupo Especial para empresas, pequenos negócios, vendedores e prestadores de serviço que precisam crescer no digital de forma real e constante."}
        </p>
        <Button
          onClick={openModal}
          size="lg"
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-base md:text-lg px-8 md:px-10 py-6 md:py-7 rounded-xl shadow-[0_10px_40px_-10px_rgba(250,204,21,0.6)] hover:scale-[1.02] transition-all"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          PARTICIPAR DO GRUPO GRÁTIS
        </Button>
        <p className="text-xs md:text-sm text-gray-500 mt-4">
          Vagas limitadas · sem custo · 100% gratuito
        </p>
      </section>

      {/* BENEFITS */}
      <section className="relative z-10 px-4 md:px-8 pb-16 max-w-5xl mx-auto grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[
          {
            icon: TrendingUp,
            t: "Crescimento Real",
            d: "Estratégias práticas que funcionam para pequenos negócios no digital.",
          },
          {
            icon: Users,
            t: "Comunidade Ativa",
            d: "Empresários, vendedores e prestadores trocando experiências reais.",
          },
          {
            icon: Rocket,
            t: "Conteúdo Exclusivo",
            d: "Aprenda como usar a MRO para escalar suas vendas investindo pouco.",
          },
        ].map(({ icon: Icon, t, d }) => (
          <div
            key={t}
            className="group bg-[#141414] border border-white/5 hover:border-yellow-400/40 rounded-2xl p-6 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center mb-4 group-hover:bg-yellow-400/20 transition-colors">
              <Icon className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="font-bold text-white mb-2 text-lg">{t}</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{d}</p>
          </div>
        ))}
      </section>

      {/* MID CTA */}
      <section className="relative z-10 px-4 md:px-8 pb-16 max-w-3xl mx-auto">
        <div className="bg-gradient-to-br from-[#141414] to-[#0a0a0a] border border-yellow-400/20 rounded-3xl p-6 md:p-10 text-center">
          <h2 className="text-2xl md:text-4xl font-extrabold mb-3">
            Recebemos seu interesse em <span className="text-yellow-400">crescer na internet</span>
          </h2>
          <p className="text-gray-400 mb-7 md:text-lg">
            Investindo muito pouco, a MRO pode ajudar você. Entre no grupo e descubra como.
          </p>
          <Button
            onClick={openModal}
            size="lg"
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-8 py-6 rounded-xl"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            QUERO PARTICIPAR DO GRUPO
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 px-4 py-8 text-center text-xs text-gray-600 border-t border-white/5">
        © {new Date().getFullYear()} MRO · Mais Resultados Online
      </footer>

      {/* MULTI-STEP MODAL */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] p-0 bg-[#0f0f0f] border border-white/10 text-white rounded-2xl overflow-hidden [&>button]:hidden">
          {/* Top bar with logo + close */}
          <div className="flex items-center justify-between px-5 pt-5">
            <Logo size="sm" />
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="px-5 mt-4">
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="px-5 pb-6 pt-5 min-h-[340px] flex flex-col">
            {done ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5 py-6">
                <div className="w-20 h-20 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold mb-2">Parabéns pelo interesse!</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Sua vaga está garantida. Clique abaixo para entrar agora no grupo no
                    WhatsApp e começar a crescer.
                  </p>
                </div>
                <a
                  href={done.link}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full"
                  onClick={() => setOpen(false)}
                >
                  <Button
                    size="lg"
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-6 rounded-xl"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    PARTICIPE DO GRUPO
                  </Button>
                </a>
                <p className="text-xs text-gray-500">
                  Enviamos também o link no seu email.
                </p>
              </div>
            ) : (
              <>
                {/* Step content */}
                <div className="flex-1 space-y-5">
                  {step === 0 && (
                    <StepBlock
                      eyebrow={`Passo 1 de ${totalSteps}`}
                      title="Como podemos te chamar?"
                      subtitle="Digite seu nome completo para começar."
                    >
                      <Field
                        autoFocus
                        placeholder="Seu nome completo"
                        value={form.nome_completo}
                        onChange={(v) => setForm({ ...form, nome_completo: v })}
                        onEnter={next}
                      />
                    </StepBlock>
                  )}
                  {step === 1 && (
                    <StepBlock
                      eyebrow={`Passo 2 de ${totalSteps}`}
                      title="Qual seu melhor email?"
                      subtitle="Você receberá o link do grupo nesse email."
                    >
                      <Field
                        autoFocus
                        type="email"
                        placeholder="voce@email.com"
                        value={form.email}
                        onChange={(v) => setForm({ ...form, email: v })}
                        onEnter={next}
                      />
                    </StepBlock>
                  )}
                  {step === 2 && (
                    <StepBlock
                      eyebrow={`Passo 3 de ${totalSteps}`}
                      title="Qual seu WhatsApp?"
                      subtitle="Para contato direto sobre o grupo."
                    >
                      <Field
                        autoFocus
                        placeholder="(11) 99999-9999"
                        value={form.whatsapp}
                        onChange={(v) => setForm({ ...form, whatsapp: v })}
                        onEnter={next}
                      />
                    </StepBlock>
                  )}
                  {step === 3 && (
                    <StepBlock
                      eyebrow={`Passo 4 de ${totalSteps}`}
                      title="O que melhor te descreve?"
                      subtitle="Escolha apenas uma opção."
                    >
                      <div className="space-y-2">
                        {PERFIS.map(({ key, label, icon: Icon }) => {
                          const active = form.perfil === key;
                          return (
                            <button
                              type="button"
                              key={key}
                              onClick={() => setForm({ ...form, perfil: key })}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                                active
                                  ? "bg-yellow-400/10 border-yellow-400 text-white"
                                  : "bg-white/[0.02] border-white/10 text-gray-300 hover:border-white/30"
                              }`}
                            >
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                  active ? "bg-yellow-400 text-black" : "bg-white/5 text-yellow-400"
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-medium flex-1">{label}</span>
                              {active && (
                                <CheckCircle2 className="w-5 h-5 text-yellow-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </StepBlock>
                  )}
                </div>

                {/* Footer buttons */}
                <div className="flex items-center gap-3 pt-5">
                  {step > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={back}
                      className="text-gray-400 hover:text-white hover:bg-white/5"
                      disabled={submitting}
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Voltar
                    </Button>
                  )}
                  <div className="flex-1" />
                  {step < totalSteps - 1 ? (
                    <Button
                      type="button"
                      onClick={next}
                      className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-6"
                    >
                      Avançar
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={submit}
                      disabled={submitting || !form.perfil}
                      className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-6"
                    >
                      {submitting ? "Enviando..." : "Concluir"}
                      {!submitting && <ArrowRight className="w-4 h-4 ml-1" />}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StepBlock = ({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-4">
    <div>
      <div className="text-[11px] uppercase tracking-widest text-yellow-400 font-semibold mb-2">
        {eyebrow}
      </div>
      <h3 className="text-xl md:text-2xl font-extrabold leading-tight">{title}</h3>
      <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
    </div>
    {children}
  </div>
);

const Field = ({
  value,
  onChange,
  onEnter,
  placeholder,
  type = "text",
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
}) => (
  <Input
    autoFocus={autoFocus}
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onEnter?.();
      }
    }}
    placeholder={placeholder}
    className="h-14 bg-white/[0.03] border-white/10 text-white placeholder:text-gray-600 text-base rounded-xl px-4 focus-visible:ring-yellow-400/40 focus-visible:border-yellow-400"
  />
);

export default Empresas;
