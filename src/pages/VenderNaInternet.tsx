import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  Rocket, 
  MessageCircle, 
  Target, 
  DollarSign, 
  Star,
  Users,
  Video,
  Play,
  X,
  Mail,
  Lock,
  User,
  Phone,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import logoMro from "@/assets/logo-mro.png";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function VenderNaInternet() {
  const navigate = useNavigate();
  const pricingRef = useRef<HTMLDivElement>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    whatsapp: ""
  });

  const scrollToPricing = () => {
    pricingRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.from('vender_usuarios').insert([{
        nome: formData.nome,
        email: formData.email,
        senha: formData.senha,
        whatsapp: formData.whatsapp
      }]).select().single();

      if (error) throw error;

      const { error: pError } = await supabase.from('vender_pagamentos').insert([{
        usuario_id: data.id,
        valor: 25.00,
        status: 'pendente'
      }]).select().single();

      if (pError) throw pError;

      toast.success("Cadastro realizado! Redirecionando para pagamento...");
      
      setTimeout(() => {
        window.open('https://infinitepay.io/checkout?amount=2500', '_blank');
        setShowCheckout(false);
        navigate('/vendernainternet/login');
      }, 2000);

    } catch (err: any) {
      toast.error(err.message || "Erro no cadastro");
    } finally {
      setLoading(false);
    }
  };

  const openCheckout = () => {
    setShowCheckout(true);
  };

  const handleCTA = () => {
    navigate('/vendernainternet/login');
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-400 selection:text-black">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <img src={logoMro} alt="MRO" className="h-16 sm:h-24 mx-auto mb-8 object-contain" />
            
            <Badge className="mb-6 bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-6 py-2 rounded-full border-none uppercase tracking-widest">
              Oportunidade Única
            </Badge>
            
            <h1 className="text-4xl md:text-7xl font-black mb-6 tracking-tighter leading-none italic uppercase">
              Pare de gastar dinheiro com <br />
              <span className="text-yellow-500">tráfego pago</span> para vender
            </h1>
            
            {/* Video de Vendas Principal */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="max-w-4xl mx-auto mb-10 aspect-video rounded-3xl overflow-hidden border-4 border-zinc-900 shadow-2xl shadow-yellow-500/10"
            >
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/LtGuQazIYjo"
                title="Apresentação MRO"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </motion.div>
            
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
              A MRO ajuda você a vender todos os dias utilizando <span className="text-white font-bold">Inteligência Artificial e automação</span> no Instagram.
            </p>

            <Button 
              size="lg" 
              onClick={openCheckout}
              className="bg-green-600 hover:bg-green-700 text-white font-black h-20 px-12 rounded-2xl text-xl md:text-2xl transition-all hover:scale-105 shadow-[0_0_40px_rgba(22,163,74,0.3)] group"
            >
              APENAS R$25 VITALÍCIO - PAGAMENTO ÚNICO <ArrowRight className="ml-3 w-8 h-8 group-hover:translate-x-2 transition-transform" />
            </Button>
          </motion.div>
        </div>
        
        <div className="max-w-xl mx-auto mt-12 px-4">
          <Button 
            onClick={scrollToPricing}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-black h-16 rounded-2xl text-lg transition-all hover:scale-105 shadow-xl shadow-green-500/20 group uppercase italic"
          >
            Apenas R$25 Vitalício - Pagamento Único <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>

      {/* Section 1 - Presentation */}
      <section className="py-20 px-4 bg-zinc-950/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-5xl font-black leading-tight italic uppercase">
                A tecnologia que <span className="text-yellow-500">trabalha para você</span>
              </h2>
              <div className="space-y-4 text-lg text-gray-400">
                <p>
                  A MRO é uma ferramenta completa com Inteligência Artificial que trabalha de forma automática.
                </p>
                <p>
                  Ela ajuda empresários, prestadores de serviço, produtores e vendedores a gerar oportunidades de negócio sem precisar passar horas todos os dias no Instagram.
                </p>
                <div className="p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
                  <p className="italic text-white font-bold">
                    "Imagine ter um funcionário trabalhando até 10 horas por dia, de forma automática, entrando em contato com potenciais clientes e ajudando sua empresa a vender mais."
                  </p>
                </div>
                <p className="text-yellow-500 font-bold italic">
                  Entre para imersão e aprenda como a MRO pode te ajudar.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {[
                { text: "Automação 24/7", icon: Zap },
                { text: "IA de Última Geração", icon: Rocket },
                { text: "Geração de Leads Qualificados", icon: Target },
                { text: "Operação no Automático", icon: CheckCircle2 },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 group hover:border-yellow-500/30 transition-all">
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform text-yellow-500">
                    <item.icon />
                  </div>
                  <span className="text-lg font-bold text-gray-200">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 - Opportunity & Value */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-8 italic uppercase">Vagas <span className="text-yellow-500">Especiais</span></h2>
          <p className="text-xl text-gray-400 mb-12">
            Estou liberando algumas vagas especiais para você conhecer tudo o que a MRO pode fazer e aplicar imediatamente no seu negócio.
          </p>
          
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-zinc-900 border-2 border-yellow-500 p-8 md:p-16 rounded-[3rem] relative overflow-hidden group shadow-2xl shadow-yellow-500/10"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <DollarSign className="w-32 h-32" />
            </div>
            <Badge className="mb-6 bg-green-500 text-white font-black px-4 py-1 rounded-full uppercase tracking-widest border-none">Oferta de Lançamento</Badge>
            <h3 className="text-3xl md:text-5xl font-black mb-6 italic uppercase leading-tight">
              Acesso Completo <br /> por apenas <span className="text-yellow-500">R$ 25</span>
            </h3>
            <p className="text-xl font-medium text-gray-400 max-w-2xl mx-auto">
              Você terá acesso completo para entender como utilizar a ferramenta e aproveitar todo o seu potencial de faturamento.
            </p>
            <div className="max-w-xl mx-auto mt-12">
              <Button 
                onClick={openCheckout}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-black h-16 rounded-2xl text-lg transition-all hover:scale-105 shadow-xl shadow-green-500/20 group uppercase italic"
              >
                APENAS R$25 VITALÍCIO - PAGAMENTO ÚNICO <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 4 - What you receive */}
      <section className="py-20 px-4 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-7xl font-black italic mb-4 uppercase">O que você <span className="text-yellow-500">recebe</span></h2>
            <p className="text-gray-500 font-bold uppercase tracking-widest">Acesso imediato após o pagamento</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Imersão Completa", desc: "Passo a passo para dominar a ferramenta", icon: Video },
              { title: "Grupo VIP", desc: "Networking e suporte no WhatsApp", icon: MessageCircle },
              { title: "Descontos Exclusivos", desc: "Benefícios em outras ferramentas", icon: Star },
              { title: "Conteúdo Premium", desc: "Estratégias para vender todos os dias", icon: Target },
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-yellow-500/30 transition-all flex flex-col items-center text-center group">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-yellow-500">
                  <item.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black mb-3 italic uppercase">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="max-w-xl mx-auto mt-16">
            <Button 
              onClick={openCheckout}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-black h-16 rounded-2xl text-lg transition-all hover:scale-105 shadow-xl shadow-green-500/20 group uppercase italic"
            >
              APENAS R$25 VITALÍCIO - PAGAMENTO ÚNICO <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>

      {/* Section 5 - Special Offer Card */}
      <section className="py-32 px-4 relative">
        <div ref={pricingRef} className="max-w-4xl mx-auto">
          <Card className="bg-zinc-900/80 border-2 border-yellow-500/50 rounded-[4rem] p-8 md:p-20 text-center backdrop-blur-xl relative overflow-hidden shadow-2xl">
            <div className="absolute top-[-50px] left-[-50px] w-48 h-48 bg-yellow-500/10 blur-[80px] rounded-full" />
            
            <Badge className="mb-8 bg-yellow-500 text-black font-black px-6 py-2 rounded-full border-none uppercase tracking-widest">
              Acesso Vitalício
            </Badge>

            <h2 className="text-4xl md:text-6xl font-black mb-12 tracking-tight uppercase italic leading-none">
              DE <span className="text-gray-600 line-through">R$ 497</span> <br />
              POR APENAS <span className="text-green-500">R$ 25</span>
            </h2>

            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-12 max-w-2xl mx-auto">
              {[
                "Pagamento único", "Sem mensalidades", "Acesso imediato", 
                "Atualizações inclusas", "Grupo VIP de empresários", "Conteúdo exclusivo"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 font-bold text-gray-200">
                  <CheckCircle2 className="text-green-500 w-5 h-5 flex-shrink-0" /> {item}
                </li>
              ))}
            </ul>

            <Button 
              size="lg" 
              onClick={openCheckout}
              className="bg-green-600 hover:bg-green-700 text-white font-black h-24 px-12 rounded-3xl text-xl md:text-3xl transition-all hover:scale-105 shadow-[0_20px_50px_rgba(22,163,74,0.3)] w-full sm:w-auto"
            >
              APENAS R$25 VITALÍCIO - PAGAMENTO ÚNICO <ArrowRight className="ml-3 w-8 h-8" />
            </Button>
            
            <p className="mt-8 text-gray-500 font-bold uppercase tracking-widest text-sm">
              <ShieldCheck className="inline-block mr-2 w-4 h-4" /> Pagamento 100% Seguro via InfinitePay
            </p>
          </Card>
        </div>
      </section>

      {/* Pop-up de Checkout Responsivo */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCheckout(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md"
            >
              <Card className="bg-zinc-900 border-zinc-800 text-white rounded-[2.5rem] shadow-2xl overflow-hidden">
                <button 
                  onClick={() => setShowCheckout(false)}
                  className="absolute right-6 top-6 text-gray-500 hover:text-white transition-colors z-20"
                >
                  <X className="w-6 h-6" />
                </button>
                <CardHeader className="text-center space-y-2 pt-10">
                  <div className="flex justify-center mb-2">
                    <img src={logoMro} alt="MRO" className="h-12 object-contain" />
                  </div>
                  <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">
                    FINALIZAR CADASTRO
                  </CardTitle>
                  <CardDescription className="text-gray-400 font-medium">
                    Preencha os dados abaixo para receber seu acesso
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-10">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Nome Completo</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" />
                        <Input 
                          placeholder="Ex: João Silva" 
                          className="pl-12 bg-black border-zinc-800 focus:border-yellow-500 h-12 rounded-xl font-bold text-sm" 
                          required
                          value={formData.nome}
                          onChange={e => setFormData({...formData, nome: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">E-mail de Acesso</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" />
                        <Input 
                          type="email" 
                          placeholder="seu@email.com" 
                          className="pl-12 bg-black border-zinc-800 focus:border-yellow-500 h-12 rounded-xl font-bold text-sm" 
                          required
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Senha Segura</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" />
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          className="pl-12 bg-black border-zinc-800 focus:border-yellow-500 h-12 rounded-xl font-bold text-sm" 
                          required
                          value={formData.senha}
                          onChange={e => setFormData({...formData, senha: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">WhatsApp (DDD)</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" />
                        <Input 
                          placeholder="(00) 00000-0000" 
                          className="pl-12 bg-black border-zinc-800 focus:border-yellow-500 h-12 rounded-xl font-bold text-sm" 
                          required
                          value={formData.whatsapp}
                          onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-black h-14 rounded-xl text-lg uppercase italic mt-4 shadow-lg shadow-green-500/10" disabled={loading}>
                      {loading ? <Loader2 className="animate-spin" /> : "PAGAR R$ 25 AGORA"}
                    </Button>

                    <div className="flex items-center justify-center gap-2 pt-2 opacity-30">
                      <ShieldCheck className="w-3 h-3" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Tecnologia 100% Criptografada</span>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-gray-500">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-sm font-bold uppercase tracking-widest mb-4">
            MRO — Inteligência Artificial & Automação
          </p>
          <p className="max-w-2xl mx-auto text-xs opacity-50">
            Esta é uma condição promocional por tempo limitado. Aproveite agora para conhecer a MRO, entender todo o potencial da ferramenta e começar a aplicar as estratégias no seu negócio ainda hoje.
          </p>
        </div>
      </footer>
    </div>
  );
}
