import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import {
  ArrowRight, Check, Target, TrendingUp, Megaphone, MessageSquare,
  Sparkles, Zap, Crown, X, ChevronRight, Rocket,
} from "lucide-react";

function SetTitle({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    document.title = title;
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); }
    m.setAttribute("content", description);
  }, [title, description]);
  return null;
}

const fadeUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

type FormData = {
  nome: string; email: string; whatsapp: string;
  empresa: string; o_que_vende: string; faturamento: string;
};

const STEPS = [
  { key: "nome", label: "Qual seu nome?", placeholder: "Digite seu nome completo", type: "text" as const },
  { key: "email", label: "Qual seu melhor email?", placeholder: "voce@empresa.com", type: "email" as const },
  { key: "whatsapp", label: "Qual seu WhatsApp?", placeholder: "(00) 00000-0000", type: "tel" as const },
  { key: "empresa", label: "Nome da sua empresa", placeholder: "Razão social ou marca", type: "text" as const },
  { key: "o_que_vende", label: "O que sua empresa vende?", placeholder: "Conte rapidamente sobre seu negócio...", type: "textarea" as const },
  { key: "faturamento", label: "Qual seu faturamento mensal?", type: "choice" as const, options: [
    { v: "15k-30k", l: "R$ 15k a 30k" },
    { v: "30k-100k", l: "R$ 30k a 100k" },
    { v: "100k+", l: "Mais de R$ 100k" },
  ]},
];

function StepForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>({ nome: "", email: "", whatsapp: "", empresa: "", o_que_vende: "", faturamento: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const current = STEPS[step];
  const value = (data as any)[current?.key] || "";
  const isLast = step === STEPS.length - 1;

  const next = async () => {
    if (!value.trim()) { toast.error("Preencha para continuar"); return; }
    if (current.key === "email" && !/^\S+@\S+\.\S+$/.test(value)) { toast.error("Email inválido"); return; }
    if (!isLast) { setStep(step + 1); return; }
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("comercialaaf-register", { body: data });
      if (error || !res?.success) throw new Error(res?.error || error?.message || "Erro");
      setDone(res.message || "Recebemos seu interesse! Entraremos em contato em breve.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar");
    } finally { setLoading(false); }
  };

  const update = (v: string) => setData({ ...data, [current.key]: v });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-zinc-950 border-amber-500/30 p-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-700/10 pointer-events-none" />
        <button onClick={onClose} className="absolute top-4 right-4 z-10 text-zinc-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-10 text-center relative">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Check className="w-10 h-10 text-black" strokeWidth={3} />
            </motion.div>
            <h3 className="text-3xl font-bold text-amber-300 mb-3">Tudo certo!</h3>
            <p className="text-zinc-200" dangerouslySetInnerHTML={{ __html: done }} />
            <p className="text-zinc-500 text-sm mt-4">Confira também seu email.</p>
          </motion.div>
        ) : (
          <div className="p-8 relative">
            <div className="flex items-center gap-1 mb-8">
              {STEPS.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? "bg-amber-500" : "bg-zinc-800"}`} />
              ))}
            </div>
            <div className="text-xs text-amber-400 font-bold tracking-widest mb-2">
              ETAPA {step + 1} DE {STEPS.length}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={step}
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.35 }}>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">{current.label}</h3>

                {current.type === "textarea" ? (
                  <Textarea autoFocus value={value} onChange={(e) => update(e.target.value)}
                    placeholder={current.placeholder}
                    className="bg-black border-amber-500/30 text-white min-h-[120px] text-lg" />
                ) : current.type === "choice" ? (
                  <div className="space-y-2">
                    {current.options!.map((o) => (
                      <button key={o.v} onClick={() => { update(o.v); setTimeout(next, 200); }}
                        className={`w-full text-left px-5 py-4 rounded-lg border-2 transition-all font-semibold ${
                          value === o.v ? "bg-amber-500 text-black border-amber-400" : "bg-zinc-900 text-white border-zinc-800 hover:border-amber-500/50"
                        }`}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Input autoFocus type={current.type} value={value}
                    onChange={(e) => update(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && next()}
                    placeholder={current.placeholder}
                    className="bg-black border-amber-500/30 text-white h-14 text-lg" />
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between mt-8">
              <button onClick={() => step > 0 && setStep(step - 1)}
                disabled={step === 0}
                className="text-zinc-500 hover:text-white text-sm disabled:opacity-30">
                ← Voltar
              </button>
              {current.type !== "choice" && (
                <Button onClick={next} disabled={loading}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold px-8 h-12">
                  {loading ? "Enviando..." : isLast ? "Finalizar" : "Avançar"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
      variants={{ hidden: { opacity: 0, y: 60 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const } } }}>
      {children}
    </motion.div>
  );
}

export default function ComercialAAF() {
  const [open, setOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden font-sans">
      <SetTitle title="Projeto AAF — Anúncio, Abordagem, Fechamento | MRO" description="Ecossistema completo para empresas faturarem mais. Anúncios, abordagem e fechamento com Meta API e MRO." />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Instrument+Serif&display=swap');
        .font-display { font-family: 'Instrument Serif', serif; letter-spacing: -0.02em; }
        .font-grotesk { font-family: 'Space Grotesk', sans-serif; }
        .text-gradient-gold { background: linear-gradient(135deg, #fde68a 0%, #f59e0b 50%, #b45309 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .noise::before { content:''; position:absolute; inset:0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E"); opacity:0.04; pointer-events:none; mix-blend-mode:overlay; }
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        .shimmer-text { background: linear-gradient(90deg, #f59e0b 0%, #fef3c7 50%, #f59e0b 100%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: shimmer 3s linear infinite; }
        @keyframes orb { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(30px,-30px) scale(1.1) } }
        .orb { animation: orb 12s ease-in-out infinite; }
        .marquee { animation: marquee 30s linear infinite; }
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
      `}</style>

      {/* HERO */}
      <div ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden noise font-grotesk">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-amber-500/20 rounded-full blur-[120px] orb" />
          <div className="absolute bottom-1/4 -right-32 w-[600px] h-[600px] bg-amber-700/15 rounded-full blur-[140px] orb" style={{ animationDelay: "3s" }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_70%)]" />
        </div>

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 backdrop-blur-sm rounded-full px-5 py-2 mb-8">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 text-xs tracking-[0.2em] font-semibold">PROJETO AAF · MRO</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.1 }}
            className="font-display text-6xl md:text-8xl lg:text-9xl leading-[0.95] mb-6">
            <span className="block text-white">Anúncio.</span>
            <span className="block text-gradient-gold italic">Abordagem.</span>
            <span className="block text-white">Fechamento.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto mb-10 font-light">
            O ecossistema completo que sua empresa precisa para <span className="text-white">vender mais</span>.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col items-center gap-5">
            <button onClick={() => setOpen(true)}
              className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black font-bold text-lg px-10 py-5 rounded-full overflow-hidden shadow-[0_0_60px_rgba(245,158,11,0.4)] hover:shadow-[0_0_80px_rgba(245,158,11,0.6)] transition-shadow">
              <span className="relative z-10">Quero alavancar minha empresa</span>
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
            <div className="flex items-center gap-2 text-amber-300/80 text-sm">
              <Crown className="w-4 h-4" /> Indicado para empresas que faturam <strong className="text-amber-200">+R$ 15k/mês</strong>
            </div>
          </motion.div>
        </motion.div>

        <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-zinc-500 text-xs tracking-widest">
          ROLE PARA EXPLORAR ↓
        </motion.div>
      </div>

      {/* MARQUEE */}
      <div className="border-y border-amber-500/10 py-6 overflow-hidden bg-zinc-950">
        <div className="flex marquee whitespace-nowrap">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-12 px-6 font-display text-3xl text-amber-500/40">
              {["FACEBOOK", "INSTAGRAM", "WHATSAPP", "META API", "MRO", "THREADS", "CRM", "AUTOMAÇÃO"].map((w) => (
                <span key={w} className="flex items-center gap-12">{w}<span className="text-amber-500/20">✦</span></span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* MISSÃO */}
      <section className="relative py-32 px-6 font-grotesk">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-amber-400 text-xs tracking-[0.3em] mb-4">NOSSA MISSÃO</div>
            <h2 className="font-display text-5xl md:text-7xl leading-tight mb-8">
              Mais do que anúncios — uma <span className="text-gradient-gold italic">operação comercial completa</span>.
            </h2>
            <p className="text-xl text-zinc-400 leading-relaxed mb-6 font-light">
              Unimos marketing, tecnologia e gestão comercial para que sua empresa tenha um processo previsível de geração de clientes, atendimento e fechamento.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              {["Facebook", "Instagram", "WhatsApp", "Threads", "Meta API"].map((p) => (
                <span key={p} className="px-4 py-2 rounded-full border border-amber-500/30 text-amber-300 text-sm backdrop-blur-sm">{p}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* MÉTODO AAF — 3 PILARES */}
      <section className="relative py-32 px-6 bg-gradient-to-b from-black via-zinc-950 to-black font-grotesk">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-center mb-20">
              <div className="text-amber-400 text-xs tracking-[0.3em] mb-4">MÉTODO AAF</div>
              <h2 className="font-display text-5xl md:text-7xl">Como <span className="italic text-gradient-gold">funciona</span></h2>
            </div>
          </Reveal>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid md:grid-cols-3 gap-6">
            {[
              { n: "01", icon: Megaphone, kicker: "ANÚNCIO", title: "Geramos oportunidades", text: "Campanhas estratégicas no ecossistema Meta para atrair clientes qualificados, não qualquer pessoa.",
                items: ["Planejamento estratégico", "Gestão Facebook & Instagram", "Campanhas WhatsApp", "Remarketing & segmentação", "Otimização mensal"] },
              { n: "02", icon: MessageSquare, kicker: "ABORDAGEM", title: "Organizamos a operação", text: "Estruturamos a jornada comercial para que nenhum lead se perca. Do primeiro contato à negociação.",
                items: ["Landing Page / Site", "CRM organizado", "Funil de vendas", "Integração WhatsApp", "Automações inteligentes"] },
              { n: "03", icon: Target, kicker: "FECHAMENTO", title: "Convertemos em vendas", text: "Acompanhamento contínuo, treinamento da equipe e análise dos atendimentos para aumentar conversão.",
                items: ["Treinamento comercial", "Scripts de vendas", "Meta API Oficial + MRO", "Reuniões mensais", "Melhorias contínuas"] },
            ].map((p) => (
              <motion.div key={p.n} variants={fadeUp}
                className="group relative bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-amber-500/10 rounded-3xl p-8 hover:border-amber-500/40 transition-all duration-500 hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/0 via-amber-500/0 to-amber-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-6">
                    <span className="font-display text-7xl text-amber-500/30">{p.n}</span>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <p.icon className="w-5 h-5 text-amber-400" />
                    </div>
                  </div>
                  <div className="text-amber-400 text-xs tracking-[0.25em] mb-3 font-semibold">{p.kicker}</div>
                  <h3 className="font-display text-3xl mb-4">{p.title}</h3>
                  <p className="text-zinc-400 text-sm mb-6 leading-relaxed">{p.text}</p>
                  <ul className="space-y-2">
                    {p.items.map((it) => (
                      <li key={it} className="flex items-start gap-2 text-zinc-300 text-sm">
                        <ChevronRight className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />{it}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* O QUE RECEBE */}
      <section className="relative py-32 px-6 font-grotesk">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <div className="text-amber-400 text-xs tracking-[0.3em] mb-4">ENTREGAS</div>
              <h2 className="font-display text-5xl md:text-6xl">O que sua empresa <span className="italic text-gradient-gold">recebe</span></h2>
            </div>
          </Reveal>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              "Mais clientes", "Processo organizado", "Funil estruturado", "Atendimento profissional",
              "Equipe treinada", "CRM organizado", "WhatsApp integrado", "Meta API Oficial",
              "Plataforma MRO", "Acompanhamento mensal", "Estratégias comerciais", "Relatórios completos",
            ].map((it) => (
              <motion.div key={it} variants={fadeUp}
                className="bg-zinc-900/40 border border-amber-500/10 rounded-xl p-4 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all">
                <Check className="w-4 h-4 text-amber-500 mb-2" />
                <div className="text-sm text-zinc-200 font-medium">{it}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* PARA QUEM */}
      <section className="relative py-32 px-6 overflow-hidden font-grotesk">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-[150px]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold px-5 py-2 rounded-full text-xs tracking-widest mb-8">
              <TrendingUp className="w-4 h-4" /> EMPRESAS 15K+ MENSAIS
            </div>
            <h2 className="font-display text-5xl md:text-7xl leading-tight mb-8">
              Para empresários que querem <span className="italic text-gradient-gold">alavancar</span> suas vendas
            </h2>
            <p className="text-xl text-zinc-300 leading-relaxed mb-10 font-light">
              Não entregamos apenas anúncios. Implantamos uma estrutura comercial completa, organizada, previsível e escalável.
            </p>
            <button onClick={() => setOpen(true)}
              className="group inline-flex items-center gap-3 bg-white text-black font-bold text-lg px-10 py-5 rounded-full hover:bg-amber-300 transition-colors">
              <Rocket className="w-5 h-5" />
              Solicitar análise estratégica
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Reveal>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative py-32 px-6 border-t border-amber-500/10 font-grotesk">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <Zap className="w-12 h-12 text-amber-400 mx-auto mb-6" />
            <h2 className="font-display text-5xl md:text-7xl mb-6">
              Pronto para <span className="shimmer-text italic">crescer</span>?
            </h2>
            <p className="text-xl text-zinc-400 mb-10 font-light">
              Responda 6 perguntas rápidas e nossa equipe entra em contato pelo WhatsApp.
            </p>
            <button onClick={() => setOpen(true)}
              className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-bold text-lg px-12 py-6 rounded-full shadow-[0_0_60px_rgba(245,158,11,0.4)]">
              Começar agora
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-amber-500/10 py-8 text-center text-zinc-600 text-sm font-grotesk">
        © {new Date().getFullYear()} Projeto AAF — MRO
      </footer>

      <StepForm open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
