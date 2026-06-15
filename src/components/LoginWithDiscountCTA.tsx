import { useState } from "react";
import { LoginPage } from "@/components/LoginPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Gift, Sparkles, Loader2, CheckCircle2, TrendingUp, Clock, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackFacebookEvent } from "@/lib/facebookTracking";


interface Props {
  onLoginSuccess: () => void;
}

export const LoginWithDiscountCTA = ({ onLoginSuccess }: Props) => {
  const [open, setOpen] = useState(false);
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
      } catch (e) {
        console.error("[FB-LEAD]", e);
      }

    } catch (err) {
      console.error(err);
      toast.error("Não foi possível liberar agora. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setOpen(false);
    setTimeout(() => {
      setSuccess(false);
      setNome("");
      setEmail("");
      setWhatsapp("");
    }, 300);
  };

  return (
    <div className="relative">
      <LoginPage onLoginSuccess={onLoginSuccess} />

      <div className={`fixed left-1/2 top-1/2 -translate-x-1/2 mt-[260px] sm:mt-[280px] z-[60] w-[calc(100%-1.5rem)] max-w-md px-3 transition-opacity ${open ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <button
          onClick={() => setOpen(true)}
          className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 px-5 py-4 text-black shadow-2xl ring-1 ring-yellow-300/50 hover:scale-[1.02] transition-transform animate-pulse"
        >
          <div className="flex items-center justify-center gap-3">
            <Gift className="w-5 h-5 shrink-0" />
            <span className="text-sm sm:text-base font-bold leading-tight">
              Não tem a ferramenta ainda?<br className="sm:hidden" />
              <span className="underline"> Compre seu acesso com desconto</span>
            </span>
          </div>
        </button>
      </div>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : reset())}>
        <DialogContent className="bg-gradient-to-b from-zinc-950 to-black border-yellow-500/40 text-white w-[calc(100vw-1.5rem)] max-w-md p-0 overflow-hidden max-h-[92vh] overflow-y-auto rounded-2xl">
          <div className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20 px-5 py-4 border-b border-yellow-500/30">
            <DialogHeader className="space-y-1.5 text-left">
              <DialogTitle className="text-xl sm:text-2xl text-white flex items-center gap-2 font-extrabold tracking-tight">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-yellow-400/20 ring-1 ring-yellow-400/40">
                  <Gift className="w-5 h-5 text-yellow-300" />
                </span>
                Liberar seu Desconto
              </DialogTitle>
              <DialogDescription className="text-zinc-200 text-sm font-medium">
                Preencha abaixo e receba o link exclusivo no seu email.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-5 py-4 sm:px-6">
          {success ? (
            <div className="py-4 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 ring-2 ring-green-400/40">
                <CheckCircle2 className="w-9 h-9 text-green-400" />
              </div>
              <h3 className="text-xl font-extrabold">Desconto liberado! 🎉</h3>
              <p className="text-sm text-zinc-200">
                Enviamos um email para <strong className="text-yellow-300 break-all">{email}</strong> com o link exclusivo de desconto.
              </p>
              <p className="text-xs text-zinc-400">⏱️ O link é válido por 48 horas.</p>
              <a
                href="https://maisresultadosonline.com.br/descontoalunosrendaextrasss"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold h-12 rounded-md animate-pulse"
              >
                Acessar Desconto Agora
              </a>
              <Button onClick={reset} variant="outline" className="w-full bg-transparent border-zinc-600 text-zinc-200 hover:bg-zinc-800 h-10">
                Fechar
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="relative overflow-hidden rounded-xl border border-yellow-500/40 bg-gradient-to-br from-yellow-500/15 via-orange-500/10 to-yellow-500/5 p-4">
                <div className="flex items-start gap-2.5 mb-2">
                  <TrendingUp className="w-5 h-5 text-yellow-300 shrink-0 mt-0.5" />
                  <p className="text-sm sm:text-base font-extrabold text-yellow-200 leading-tight">
                    Renda Extra com a Ferramenta MRO
                  </p>
                </div>
                <p className="text-[13px] sm:text-sm text-zinc-100 leading-relaxed font-medium">
                  Preste serviço como agência de marketing.
                  <br />
                  Fature <span className="text-yellow-300 font-extrabold">R$ 5 MIL+/mês</span>.
                  <br />
                  Aprenda a fechar contratos, usar a ferramenta e aplicar{" "}
                  <span className="text-orange-300 font-bold">HOJE</span> mesmo.
                </p>

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
                className="w-full bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 hover:opacity-95 text-black font-extrabold h-14 text-base sm:text-lg shadow-lg shadow-orange-500/20 ring-1 ring-yellow-300/50"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Rocket className="w-5 h-5 mr-2" /> LIBERAR MEU DESCONTO
                  </>
                )}
              </Button>
              <p className="text-[11px] sm:text-xs text-zinc-400 text-center font-medium">
                🔒 Você receberá um email com o link exclusivo do desconto.
              </p>
            </form>
          )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};
