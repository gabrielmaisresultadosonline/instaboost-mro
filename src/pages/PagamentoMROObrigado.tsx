import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, MessageCircle, Sparkles, Mail } from "lucide-react";
import { toast } from "sonner";
import { trackPageView, trackPurchase } from "@/lib/facebookTracking";
import logoMro from "@/assets/logo-mro.png";

const WHATSAPP_NUMBER = "555192835863";

const PagamentoMROObrigado = () => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    trackPageView("Pagamento MRO - Obrigado");
    try { trackPurchase(397, "MRO Vitalicio"); } catch {}
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || nome.trim().length < 2) { toast.error("Informe seu nome"); return; }
    if (!email.trim() || !email.includes("@")) { toast.error("Informe um email válido"); return; }
    const msg = encodeURIComponent(
      `Acabei de comprar a MRO vitalicio.\nnome: ${nome.trim()}\nemail: ${email.trim()}`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-emerald-500/5 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <img src={logoMro} alt="MRO" className="h-10 mx-auto mb-4" />
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mb-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
            Parabéns! Você fez o <span className="bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">pagamento</span>
          </h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
            <Mail className="w-4 h-4" /> Já enviamos seu acesso para o seu email
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-xl">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm">
              Preencha abaixo seu <b>nome</b> e o <b>email da compra</b> para receber a entrada no nosso <b>Grupo VIP</b>. Aguardo você!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nome</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email da compra</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Acessar Grupo VIP no WhatsApp
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Você será direcionado ao WhatsApp para confirmarmos sua entrada no grupo.
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} MRO · Mais Resultados Online
        </p>
      </div>
    </div>
  );
};

export default PagamentoMROObrigado;
