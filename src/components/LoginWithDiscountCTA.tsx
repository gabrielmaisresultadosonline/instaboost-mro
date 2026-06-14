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

      <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-1.5rem)] max-w-md px-3 transition-opacity ${open ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
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
        <DialogContent className="bg-zinc-950 border-yellow-500/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white flex items-center gap-2">
              <Gift className="w-6 h-6 text-yellow-400" />
              Liberar seu Desconto
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Preencha abaixo e receba acesso ao desconto exclusivo no seu email.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="py-6 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20">
                <CheckCircle2 className="w-9 h-9 text-green-400" />
              </div>
              <h3 className="text-xl font-bold">Desconto liberado! 🎉</h3>
              <p className="text-sm text-zinc-300">
                Enviamos um email para <strong className="text-yellow-400">{email}</strong> com o link
                exclusivo de desconto. <br />
                <span className="text-xs text-zinc-400">O link é válido por 48 horas.</span>
              </p>
              <Button onClick={reset} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
                Fechar
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3 pt-2">
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-100 leading-relaxed">
                <p className="font-bold mb-1">💰 Renda Extra com a Ferramenta MRO</p>
                <p>
                  Preste serviço como agência de marketing e fature <strong>R$ 5 MIL+/mês</strong>.
                  Vamos te ensinar a fechar contratos, usar a ferramenta e começar a aplicar HOJE mesmo.
                </p>
                <p className="mt-2 text-orange-300">⏰ Esse desconto vai ser liberado hoje.</p>
              </div>

              <Input
                placeholder="Seu nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white h-11"
              />
              <Input
                type="email"
                placeholder="Seu melhor email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white h-11"
              />
              <Input
                placeholder="WhatsApp com DDD"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white h-11"
              />
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:opacity-90 text-black font-bold py-6 text-base"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (<><Sparkles className="w-5 h-5 mr-2" /> LIBERAR MEU DESCONTO</>)}
              </Button>
              <p className="text-[11px] text-zinc-500 text-center">
                Você receberá um email com o link exclusivo do desconto.
              </p>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
