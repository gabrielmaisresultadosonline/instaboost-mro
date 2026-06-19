import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Gift,
  Loader2,
  CheckCircle2,
  Rocket,
  Laptop,
  TrendingUp,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackFacebookEvent } from "@/lib/facebookTracking";

/**
 * Full-page registration screen shown on /estruturarendaextra4 when the
 * visitor isn't authenticated. Replaces the previous login form: now the
 * user goes straight into the discount lead flow.
 *
 * Submission logic is identical to the old LoginWithDiscountCTA:
 *  - calls edge function `estrutura4-discount` action `create_lead`
 *  - fires Facebook `Lead` pixel/CAPI event on success
 *  - on success, shows a confirmation card with the discount checkout link
 */
export const DiscountRegistrationPage = () => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.includes("@") || whatsapp.replace(/\D/g, "").length < 10) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("estrutura4-discount", {
        body: {
          action: "create_lead",
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          whatsapp: whatsapp.replace(/\D/g, ""),
        },
      });
      if (error || !data?.success) throw new Error(data?.error || "erro");
      setSuccess(true);
      toast.success("Pronto! Confira seu email — desconto liberado.");
      try {
        await trackFacebookEvent("Lead", {
          content_name: "Desconto Estrutura Renda Extra 4",
          content_category: "discount_lead",
          value: 97,
          currency: "BRL",
          email: email.trim().toLowerCase(),
          phone: whatsapp.replace(/\D/g, ""),
        });
      } catch (err) {
        console.error("[FB-LEAD]", err);
      }
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível liberar agora. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0a14] text-white relative overflow-hidden">
      {/* Ambient gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-15%] left-[-10%] w-[520px] h-[520px] bg-yellow-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[160px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 min-h-screen flex flex-col">
        {/* Top badge */}
        <div className="flex justify-center mb-6 md:mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-[11px] sm:text-xs font-black uppercase tracking-[0.2em]">
            <Sparkles className="w-3.5 h-3.5" />
            Desconto Exclusivo • Renda Extra MRO
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center flex-1">
          {/* Left — pitch */}
          <div className="space-y-6 lg:space-y-7 text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight">
              Faça{" "}
              <span className="bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-500 bg-clip-text text-transparent">
                R$ 5 mil/mês
              </span>{" "}
              com a ferramenta MRO prestando serviço{" "}
              <span className="italic">em casa</span> com apenas seu notebook.
            </h1>

            <p className="text-base sm:text-lg text-white/60 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
              <span className="text-white font-bold">Instale e utilize.</span> Você vai aprender
              todo o passo a passo para fechar contratos, aplicar a ferramenta e gerar resultado já
              no primeiro mês.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto lg:mx-0">
              <Feature icon={<Laptop className="w-4 h-4" />} text="Trabalhe do notebook" />
              <Feature icon={<TrendingUp className="w-4 h-4" />} text="R$ 5 mil+ por mês" />
              <Feature icon={<ShieldCheck className="w-4 h-4" />} text="Passo a passo guiado" />
            </div>

            <div className="hidden lg:flex items-center gap-3 pt-2 text-white/40 text-xs font-medium">
              <Clock className="w-4 h-4" />
              <span>Acesso liberado em segundos após o cadastro.</span>
            </div>
          </div>

          {/* Right — form / success */}
          <div className="w-full max-w-md mx-auto lg:ml-auto lg:mr-0">
            <div className="relative rounded-[2rem] p-[1.5px] bg-gradient-to-br from-yellow-400/60 via-orange-500/40 to-yellow-500/60 shadow-[0_20px_60px_-15px_rgba(245,158,11,0.35)]">
              <div className="rounded-[1.9rem] bg-gradient-to-b from-zinc-950 to-black p-6 sm:p-7">
                {success ? (
                  <div className="py-2 text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 ring-2 ring-green-400/40">
                      <CheckCircle2 className="w-9 h-9 text-green-400" />
                    </div>
                    <h3 className="text-2xl font-black">Desconto liberado! 🎉</h3>
                    <p className="text-sm text-zinc-200">
                      Enviamos um email para{" "}
                      <strong className="text-yellow-300 break-all">{email}</strong> com o link
                      exclusivo de desconto.
                    </p>
                    <p className="text-xs text-zinc-400">⏱️ O link é válido por 48 horas.</p>
                    <a
                      href="https://maisresultadosonline.com.br/descontoalunosrendaextrasss"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 hover:opacity-95 text-black font-black h-13 py-3.5 rounded-xl animate-pulse"
                    >
                      Acessar Desconto Agora <ArrowRight className="w-5 h-5" />
                    </a>
                  </div>
                ) : (
                  <form onSubmit={submit} className="space-y-5">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-yellow-400/15 ring-1 ring-yellow-400/40">
                        <Gift className="w-5 h-5 text-yellow-300" />
                      </span>
                      <div>
                        <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
                          Libere seu desconto
                        </h2>
                        <p className="text-[12px] text-zinc-400 font-medium">
                          Preencha e receba o link no seu email.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <Input
                        placeholder="Seu nome completo"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-12 text-base font-medium focus-visible:ring-yellow-400/60"
                      />
                      <Input
                        type="email"
                        placeholder="Seu melhor email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-12 text-base font-medium focus-visible:ring-yellow-400/60"
                      />
                      <Input
                        placeholder="WhatsApp com DDD"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        inputMode="numeric"
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-12 text-base font-medium focus-visible:ring-yellow-400/60"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="relative overflow-hidden w-full bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 hover:opacity-95 text-black font-black h-14 text-base sm:text-lg shadow-lg shadow-orange-500/20 ring-1 ring-yellow-300/50"
                    >
                      <span className="absolute inset-0 pointer-events-none shimmer-reflection" />
                      {submitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Rocket className="w-5 h-5 mr-2" /> Cadastrar receber desconto !
                        </>
                      )}
                    </Button>
                    <p className="text-[11px] text-zinc-400 text-center font-medium">
                      🔒 Você receberá um email com o link exclusivo do desconto.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Feature = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 text-xs sm:text-sm font-bold justify-center lg:justify-start">
    <span className="text-yellow-300">{icon}</span>
    <span>{text}</span>
  </div>
);
