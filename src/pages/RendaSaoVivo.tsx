import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sparkles, TrendingUp, Users, CheckCircle2, Zap, Laptop, DollarSign, Calendar, Clock, ArrowRight, ShieldCheck, Rocket,
} from "lucide-react";

const RendaSaoVivo = () => {
  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preco, setPreco] = useState<number>(19);
  const [aulaData, setAulaData] = useState<string>("18/07");
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "" });

  useEffect(() => {
    document.title = "Renda Ao Vivo | Aprenda a faturar mais de 5 mil em casa";
    (async () => {
      const sid = crypto.randomUUID();
      try {
        await supabase.functions.invoke("rendasaovivo-admin", {
          body: {
            action: "track_visit", session_id: sid,
            user_agent: navigator.userAgent, referrer: document.referrer,
          },
        });
      } catch { /* ignore */ }
      try {
        const { data } = await supabase.functions.invoke("rendasaovivo-admin", {
          body: { action: "get_public_settings" },
        });
        if (data?.settings) {
          setPreco(Number(data.settings.preco) || 19);
          setAulaData(data.settings.aula_data || "18/07");
        }
      } catch { /* ignore */ }
      const fbq = (window as any).fbq;
      if (fbq) fbq("track", "PageView");
    })();
  }, []);

  const openCheckout = () => {
    const fbq = (window as any).fbq;
    if (fbq) fbq("track", "ViewContent", { content_name: "Renda Ao Vivo" });
    setOpenForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("rendasaovivo-checkout", {
        body: { name: form.name, email: form.email, whatsapp: form.whatsapp },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao gerar pagamento");
      const fbq = (window as any).fbq;
      if (fbq) fbq("track", "InitiateCheckout",
        { value: preco, currency: "BRL", content_name: "Renda Ao Vivo" },
        { eventID: data.nsu_order }
      );
      window.location.href = data.payment_link;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#04070d] text-white overflow-x-hidden">
      {/* backdrop */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-green-500/10 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-yellow-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-5 py-10 md:py-16">
        {/* HERO */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-4 py-2 rounded-full animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-red-300 font-bold text-xs md:text-sm uppercase tracking-widest">AO VIVO dia {aulaData}</span>
          </div>

          <h1 className="text-4xl md:text-7xl font-black leading-[1.05] tracking-tight">
            Aprenda como <span className="text-yellow-400">eu, Gabriel</span>,<br className="hidden md:block" />
            faturo <span className="text-green-400 underline decoration-yellow-400">mais de R$ 5 mil</span> em casa
            <br className="hidden md:block" />
            com apenas um <span className="inline-flex items-center gap-2">notebook <Laptop className="w-8 h-8 md:w-12 md:h-12 inline text-yellow-400" /></span>
          </h1>

          <p className="text-lg md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Participe agora por <span className="text-yellow-400 font-black">R$ {preco.toFixed(0)}</span> e aprenda você também.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button onClick={openCheckout} size="lg" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black text-lg md:text-xl h-16 px-8 rounded-2xl shadow-[0_0_40px_rgba(34,197,94,0.4)] hover:scale-105 transition">
              <Rocket className="w-6 h-6 mr-2" /> EU QUERO APRENDER
            </Button>
            <Button onClick={openCheckout} size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black font-black text-lg md:text-xl h-16 px-8 rounded-2xl hover:scale-105 transition">
              <Zap className="w-6 h-6 mr-2" /> QUERO ENTRAR NESSA ONDA
            </Button>
          </div>
        </div>

        {/* DESTAQUE */}
        <div className="mt-14 md:mt-20 bg-gradient-to-br from-yellow-500/10 to-green-500/10 border border-yellow-500/30 p-6 md:p-10 rounded-3xl backdrop-blur-lg">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-20 h-20 md:w-28 md:h-28 flex-shrink-0 bg-yellow-500/20 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-12 h-12 md:w-16 md:h-16 text-yellow-400" />
            </div>
            <div className="text-center md:text-left">
              <div className="inline-block bg-yellow-500 text-black font-black text-xs px-3 py-1 rounded-full mb-2 uppercase tracking-widest">
                🔥 A nova onda do digital
              </div>
              <h2 className="text-2xl md:text-4xl font-black leading-tight">
                Mais de <span className="text-green-400">1.800 empreendedores</span> já estão lucrando <span className="text-yellow-400">R$ 5 mil por mês</span> em casa
              </h2>
              <p className="mt-2 text-gray-300 text-base md:text-lg">
                Um método simples, replicável, sem precisar aparecer, e que qualquer pessoa consegue aplicar.
              </p>
            </div>
          </div>
        </div>

        {/* BENEFÍCIOS */}
        <div className="mt-14 grid md:grid-cols-3 gap-4">
          {[
            { icon: Users, title: "Comunidade Ativa", text: "1.800+ empreendedores aplicando" },
            { icon: DollarSign, title: "R$ 5 mil / mês", text: "Faturamento comprovado em casa" },
            { icon: Laptop, title: "Só um notebook", text: "Sem estoque, sem aparecer" },
          ].map((b, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur">
              <b.icon className="w-10 h-10 text-yellow-400 mb-3" />
              <h3 className="font-black text-lg">{b.title}</h3>
              <p className="text-gray-400 text-sm mt-1">{b.text}</p>
            </div>
          ))}
        </div>

        {/* CTA MID */}
        <div className="mt-12 text-center">
          <Button onClick={openCheckout} size="lg" className="bg-red-500 hover:bg-red-600 text-white font-black text-lg h-14 px-10 rounded-2xl animate-pulse">
            <ArrowRight className="w-6 h-6 mr-2" /> QUERO PARTICIPAR AGORA
          </Button>
        </div>

        {/* PREÇO CONTAINER */}
        <div id="preco" className="mt-16 md:mt-24">
          <div className="max-w-2xl mx-auto bg-gradient-to-br from-[#0f1a2e] to-[#0a0f1a] border-2 border-yellow-500/40 rounded-[2.5rem] p-8 md:p-12 shadow-[0_0_60px_rgba(234,179,8,0.15)]">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-red-500 text-white font-black text-xs px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest">
                🔴 LOTE INICIAL - VAGAS LIMITADAS
              </div>
              <h3 className="text-3xl md:text-5xl font-black">
                Passaporte de Acesso
              </h3>
              <p className="text-gray-400 mt-2">Aula 100% ao vivo. Você tira TODAS as suas dúvidas em tempo real.</p>

              <div className="my-8 space-y-3 text-left max-w-md mx-auto">
                {[
                  { icon: Calendar, text: `Aula ao vivo dia ${aulaData}` },
                  { icon: Clock, text: "Tire todas as suas dúvidas em tempo real" },
                  { icon: Sparkles, text: "Método inédito, fácil de aplicar" },
                  { icon: ShieldCheck, text: "Acesso garantido no seu e-mail" },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-xl">
                    <f.icon className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-sm md:text-base">{f.text}</span>
                  </div>
                ))}
              </div>

              <div className="my-6">
                <div className="text-gray-400 text-sm line-through">De R$ 97,00</div>
                <div className="text-6xl md:text-8xl font-black bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent">
                  R$ {preco.toFixed(0)}
                </div>
                <div className="text-gray-400 text-sm font-bold uppercase tracking-widest">Pagamento único</div>
              </div>

              <Button onClick={openCheckout} size="lg" className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black text-xl md:text-2xl h-20 rounded-2xl shadow-[0_0_50px_rgba(34,197,94,0.5)] hover:scale-[1.02] transition">
                <CheckCircle2 className="w-7 h-7 mr-3" /> PAGAR E GARANTIR VAGA
              </Button>

              <p className="mt-4 text-gray-500 text-xs flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Pagamento 100% seguro via InfiniPay
              </p>
            </div>
          </div>
        </div>

        <footer className="mt-16 text-center text-gray-500 text-sm pb-8">
          © 2026 MRO - Mais Resultados Online
        </footer>
      </div>

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="bg-[#0a0f1a] border-yellow-500/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Garanta sua vaga</DialogTitle>
            <DialogDescription className="text-gray-400">
              Preencha seus dados e finalize o pagamento de R$ {preco.toFixed(0)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white/5 border-white/10 mt-1" placeholder="Seu nome completo" />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-white/5 border-white/10 mt-1" placeholder="seu@email.com" />
            </div>
            <div>
              <Label htmlFor="whatsapp">WhatsApp (DDD + número)</Label>
              <Input id="whatsapp" required value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="bg-white/5 border-white/10 mt-1" placeholder="(11) 99999-9999" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-green-500 hover:bg-green-600 text-white font-black h-14 text-lg rounded-xl">
              {loading ? "Gerando pagamento..." : `PAGAR R$ ${preco.toFixed(0)}`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RendaSaoVivo;
