import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trackPageView, trackLead, trackInitiateCheckout } from "@/lib/facebookTracking";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  Laptop,
  Flame,
  Star,
  Download,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoMro from "@/assets/logo-mro.png";

const Lovablack = () => {
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "lifetime">("monthly");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    trackPageView('Sales Page - Lovablack');
  }, []);

  const handleOpenCheckout = (plan: "monthly" | "lifetime") => {
    setSelectedPlan(plan);
    setShowCheckoutModal(true);
    trackInitiateCheckout(`Lovablack - ${plan}`, plan === "monthly" ? 47 : 147);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) { toast.error("E-mail inválido"); return; }
    if (!name) { toast.error("Nome é obrigatório"); return; }
    if (!whatsapp) { toast.error("WhatsApp é obrigatório"); return; }

    setLoading(true);
    trackLead("Lovablack - Cadastro Checkout");

    try {
      const amount = selectedPlan === "monthly" ? 47 : 147;
      
      // Chamada para criar o checkout (reutilizando a lógica de checkout do sistema)
      const { data, error } = await supabase.functions.invoke("lovablack-checkout", {
        body: { 
          email: email.toLowerCase().trim(),
          name: name.trim(),
          whatsapp: whatsapp.replace(/\D/g, ""),
          planType: selectedPlan,
          amount: amount
        }
      });

      if (error) throw error;
      if (data.payment_link) {
        window.location.href = data.payment_link;
      } else {
        toast.error("Erro ao gerar link de pagamento.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-primary/30">
      <style>{`
        .btn-pulse-green { 
          position: relative; 
          overflow: hidden; 
          animation: pulse-green 2s infinite; 
          transition: all 0.3s ease; 
        }
        .btn-pulse-green::after { 
          content: ""; 
          position: absolute; 
          top: -50%; 
          left: -60%; 
          width: 20%; 
          height: 200%; 
          background: rgba(255, 255, 255, 0.4); 
          transform: rotate(30deg); 
          animation: light-sweep 3s infinite; 
          filter: blur(5px); 
        }
        @keyframes light-sweep { 0% { left: -60%; } 30% { left: 150%; } 100% { left: 150%; } }
        @keyframes pulse-green { 
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); } 
          70% { box-shadow: 0 0 0 15px rgba(34, 197, 94, 0); } 
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } 
        }
      `}</style>

      {/* Hero Section */}
      <header className="relative pt-20 pb-16 px-4 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-5xl mx-auto text-center">
          <img src={logoMro} alt="MRO" className="h-16 md:h-24 mx-auto mb-8 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
          
          <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Extensão Oficial Lovablack</span>
          </div>

          <h1 className="text-4xl md:text-7xl font-black mb-6 leading-tight">
            EXTENSÃO PARA USAR <span className="text-primary">LOVABLE</span> SEM PAGAR CRÉDITOS!
          </h1>
          
          <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto mb-10">
            A extensão definitiva para você criar SAAS, sites e sistemas complexos sem limites.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button 
              onClick={() => handleOpenCheckout("monthly")}
              className="w-full sm:w-auto btn-pulse-green bg-green-500 hover:bg-green-600 text-black font-black text-xl px-12 py-8 rounded-2xl"
            >
              TESTE GRÁTIS AGORA
              <ArrowRight className="ml-2 w-6 h-6" />
            </Button>
            <Button 
              variant="outline"
              className="w-full sm:w-auto border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-white font-bold text-lg px-8 py-8 rounded-2xl"
              onClick={() => window.open('https://chrome.google.com/webstore', '_blank')}
            >
              <Download className="mr-2 w-5 h-5" />
              BAIXAR EXTENSÃO
            </Button>
          </div>

          {/* Feature Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: Zap, text: "Créditos Ilimitados" },
              { icon: Shield, text: "100% Seguro" },
              { icon: Monitor, text: "Sistemas Complexos" },
              { icon: Rocket, text: "Alta Velocidade" }
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                <f.icon className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold text-zinc-300">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Info Section */}
      <section className="py-20 px-4 bg-zinc-950">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-8">
            OTIMO PARA CRIAR <span className="text-primary">SAAS</span>, PROJETOS DE SITES E SISTEMAS COMPLEXOS.
          </h2>
          <p className="text-zinc-400 text-lg md:text-xl leading-relaxed">
            Nossa extensão integra-se perfeitamente ao Lovable, permitindo que você foque na criação sem se preocupar com o consumo de créditos da plataforma original. Economize centenas de reais todos os meses.
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black mb-4">ESCOLHA SEU PLANO</h2>
            <p className="text-zinc-500 font-bold uppercase tracking-widest">Acesso imediato após a confirmação</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Mensal */}
            <Card className="bg-zinc-900 border-zinc-800 relative overflow-hidden group hover:border-primary/50 transition-all duration-300">
              <CardHeader className="text-center pb-2">
                <Badge className="w-fit mx-auto mb-4 bg-zinc-800 text-zinc-400 border-zinc-700">POPULAR</Badge>
                <CardTitle className="text-3xl font-black text-white">MENSAL</CardTitle>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  <span className="text-2xl font-bold text-primary">R$</span>
                  <span className="text-6xl font-black text-white">47</span>
                  <span className="text-zinc-500 font-bold">/mês</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <ul className="space-y-4">
                  {["Créditos Ilimitados", "Uso em 1 máquina", "Suporte via WhatsApp", "Atualizações Inclusas"].map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-zinc-300 font-medium">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => handleOpenCheckout("monthly")}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black py-7 text-lg rounded-xl"
                >
                  ASSINAR AGORA
                </Button>
              </CardContent>
            </Card>

            {/* Vitalício */}
            <Card className="bg-zinc-900 border-primary shadow-[0_0_30px_rgba(59,130,246,0.15)] relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
              <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-black px-4 py-1 rounded-bl-lg uppercase tracking-tighter">
                Melhor Custo Benefício
              </div>
              <CardHeader className="text-center pb-2">
                <Badge className="w-fit mx-auto mb-4 bg-primary text-white border-none">VITALÍCIO</Badge>
                <CardTitle className="text-3xl font-black text-white">ILIMITADO</CardTitle>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  <span className="text-2xl font-bold text-primary">R$</span>
                  <span className="text-6xl font-black text-white">147</span>
                  <span className="text-zinc-500 font-bold">VITALÍCIO</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <ul className="space-y-4">
                  {["TUDO DO MENSAL", "ACESSO PARA SEMPRE", "Prioridade no Suporte", "Bônus de Lançamento"].map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-zinc-300 font-black">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => handleOpenCheckout("lifetime")}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-black py-7 text-lg rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                >
                  GARANTIR VITALÍCIO
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-zinc-900 text-center">
        <img src={logoMro} alt="MRO" className="h-10 mx-auto mb-6 opacity-50" />
        <p className="text-zinc-600 text-sm">© 2026 Lovablack - Uma ferramenta MRO Inteligente. Todos os direitos reservados.</p>
      </footer>

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowCheckoutModal(false)} />
          <Card className="relative w-full max-w-md bg-zinc-900 border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="text-center relative">
              <button 
                onClick={() => setShowCheckoutModal(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <CardTitle className="text-2xl font-black">FINALIZAR ACESSO</CardTitle>
              <p className="text-zinc-400 font-medium">Plano {selectedPlan === "monthly" ? "Mensal R$47" : "Vitalício R$147"}</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-zinc-500 uppercase">Seu Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input 
                      placeholder="Ex: João da Silva" 
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-zinc-500 uppercase">Seu Melhor E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input 
                      type="email"
                      placeholder="exemplo@email.com" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-zinc-500 uppercase">WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input 
                      placeholder="(00) 00000-0000" 
                      value={whatsapp}
                      onChange={e => setWhatsapp(e.target.value)}
                      className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-500 hover:bg-green-600 text-black font-black py-7 text-xl rounded-xl"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    ) : (
                      <>
                        PAGAR AGORA
                        <CreditCard className="ml-2 w-6 h-6" />
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-center text-zinc-600 uppercase font-black tracking-widest mt-4 flex items-center justify-center gap-2">
                  <Shield className="w-3 h-3" /> Pagamento 100% Seguro via InfinitePay
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
