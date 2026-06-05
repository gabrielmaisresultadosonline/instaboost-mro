import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  Rocket,
  DollarSign,
  Target,
  MessageCircle,
  Briefcase,
  Users,
  LineChart,
  Globe,
  Headphones,
  FileText,
  MousePointer2,
  Lock
} from 'lucide-react';
import { motion } from 'framer-motion';

const Licenciado = () => {
  const handleWhatsAppContact = () => {
    window.open('https://wa.me/555192036540?text=Olá, quero receber informações para me tornar um Licenciado MRO.', '_blank');
  };

  const benefits = [
    { title: "Licença Oficial MRO", icon: ShieldCheck },
    { title: "Acesso à Plataforma Completa", icon: Globe },
    { title: "Link Exclusivo de Vendas", icon: MousePointer2 },
    { title: "Treinamento Comercial", icon: Users },
    { title: "Estratégias de Captação", icon: Target },
    { title: "Scripts de Vendas", icon: FileText },
    { title: "Materiais de Marketing", icon: Rocket },
    { title: "Suporte Especializado", icon: Headphones },
    { title: "Atualizações Constantes", icon: Zap },
    { title: "Operação Validada", icon: CheckCircle2 },
    { title: "Acompanhamento Inicial", icon: Users },
    { title: "Estrutura para Escalar", icon: LineChart },
  ];

  const steps = [
    {
      step: "01",
      title: "Adquira sua Licença MRO",
      desc: "Investimento único para garantir seu território e operação.",
      highlight: "R$ 3.600"
    },
    {
      step: "02",
      title: "Treinamento e Acesso",
      desc: "Nossa equipe entrega toda a estrutura necessária e treinamento.",
      highlight: "Acesso Imediato"
    },
    {
      step: "03",
      title: "Comece a vender",
      desc: "Utilize seu link exclusivo e as estratégias fornecidas.",
      highlight: "Venda Imediata"
    },
    {
      step: "04",
      title: "Receba pelas vendas",
      desc: "Cada venda realizada gera lucro imediato para você.",
      highlight: "Lucro de 70%"
    }
  ];

  const profitPlans = [
    { plan: "R$ 300", profit: "R$ 210,00" },
    { plan: "R$ 397", profit: "R$ 277,90" },
    { plan: "R$ 997", profit: "R$ 697,90" },
  ];

  const forWhom = [
    "Agências", "Gestores de Tráfego", "Consultores", "Empreendedores Digitais",
    "Profissionais de Marketing", "Freelancers", "Empresários", "Novos Empreendedores"
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-400 selection:text-black">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/5 blur-[120px] rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-6 py-2 rounded-full border-none uppercase tracking-widest">
              Oportunidade de Negócio
            </Badge>
            <h1 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter leading-none">
              TORNE-SE UM <br />
              <span className="text-yellow-500">LICENCIADO MRO</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-10 leading-relaxed font-medium">
              Receba uma operação pronta para vender nossa solução, com treinamento, suporte, sistema completo e estrutura validada para faturar <span className="text-white font-bold">mais de R$15.000 por mês.</span>
            </p>
            
            <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl max-w-2xl mx-auto mb-12 backdrop-blur-md">
              <p className="text-lg text-gray-400">
                Você não precisa desenvolver software, contratar equipe ou criar um produto do zero.
                A MRO entrega toda a estrutura pronta. <span className="text-yellow-500 font-bold italic">Você vende. Você recebe.</span>
              </p>
            </div>

            <Button 
              size="lg" 
              onClick={handleWhatsAppContact}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-black h-20 px-12 rounded-[2rem] text-xl md:text-2xl transition-all hover:scale-105 shadow-[0_0_40px_rgba(234,179,8,0.3)] group"
            >
              QUERO SER UM LICENCIADO MRO <ArrowRight className="ml-3 w-8 h-8 group-hover:translate-x-2 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Seção 2 - O QUE É */}
      <section className="py-24 px-4 bg-zinc-950/50 relative">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-6xl font-black leading-tight italic">
                O que significa ser um <span className="text-yellow-500">Licenciado MRO?</span>
              </h2>
              <p className="text-xl text-gray-400 leading-relaxed">
                O Licenciado MRO recebe autorização oficial para comercializar as soluções da MRO utilizando toda nossa estrutura, tecnologia, treinamentos e suporte.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {[
                { text: "Você não precisa criar um produto", icon: Lock },
                { text: "Você não precisa desenvolver sistemas", icon: Zap },
                { text: "Você não precisa contratar programadores", icon: Users },
                { text: "Você recebe tudo pronto para começar", icon: Rocket },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 group hover:border-yellow-500/30 transition-all">
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <item.icon className="text-yellow-500 w-6 h-6" />
                  </div>
                  <span className="text-lg font-bold text-gray-200">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Seção 3 - O QUE VOCÊ RECEBE */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-7xl font-black italic mb-4">Tudo o que você <span className="text-yellow-500">recebe</span></h2>
            <p className="text-gray-500 font-bold uppercase tracking-widest">A estrutura completa de um negócio milionário</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 flex flex-col items-center text-center group hover:border-yellow-500/30 transition-all"
              >
                <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <benefit.icon className="text-yellow-500 w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg text-white leading-tight">{benefit.title}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção 4 - COMO FUNCIONA */}
      <section className="py-24 px-4 bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-7xl font-black mb-6 italic">COMO FUNCIONA <span className="text-yellow-500">NA PRÁTICA?</span></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-yellow-500/10 -translate-y-1/2 z-0" />
            
            {steps.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative z-10"
              >
                <div className="bg-black border border-white/5 p-8 rounded-[2.5rem] h-full flex flex-col items-center text-center group hover:border-yellow-500/40 transition-all">
                  <span className="text-6xl font-black text-white/5 absolute top-4 left-6 group-hover:text-yellow-500/10 transition-colors">{item.step}</span>
                  <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {i === 0 ? <DollarSign className="text-yellow-500 w-8 h-8" /> : 
                     i === 1 ? <Rocket className="text-yellow-500 w-8 h-8" /> :
                     i === 2 ? <Briefcase className="text-yellow-500 w-8 h-8" /> :
                               <CheckCircle2 className="text-yellow-500 w-8 h-8" />}
                  </div>
                  <h3 className="font-black text-xl mb-3 leading-tight uppercase italic">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4">{item.desc}</p>
                  <div className="mt-auto pt-4">
                    <span className="bg-yellow-500/10 text-yellow-500 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-yellow-500/20">
                      {item.highlight}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção 5 - GANHOS */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black mb-4">QUANTO VOCÊ PODE <span className="text-yellow-500">GANHAR?</span></h2>
            <p className="text-gray-400 text-lg">Simulação de lucro baseado no repasse de 70% por venda</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {profitPlans.map((item, i) => (
              <div key={i} className="bg-zinc-900/80 border border-white/5 p-8 rounded-[2.5rem] text-center group hover:border-emerald-500/30 transition-all">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2 block">Plano Vendido</span>
                <div className="text-3xl font-black mb-6">{item.plan}</div>
                <div className="w-full h-px bg-white/5 mb-6" />
                <span className="text-emerald-500 text-xs font-bold uppercase tracking-widest mb-1 block">Seu Lucro Líquido</span>
                <div className="text-4xl font-black text-emerald-500">{item.profit}</div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-8 md:p-12 rounded-[3rem] text-black text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform">
              <LineChart className="w-32 h-32" />
            </div>
            <h3 className="text-3xl md:text-4xl font-black mb-4 tracking-tight leading-tight uppercase italic">
              Recupere seu investimento em 6 vendas
            </h3>
            <p className="text-xl font-bold opacity-80 max-w-2xl mx-auto">
              Com apenas 6 vendas do plano de R$997 você recupera seu investimento inicial. A partir daí, todo o restante é lucro operacional puro.
            </p>
          </div>
        </div>
      </section>

      {/* Seção 6 - PARTICIPAÇÃO */}
      <section className="py-24 px-4 bg-zinc-950">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <h2 className="text-3xl md:text-5xl font-black italic">Por que existe <span className="text-yellow-500">participação</span> nas vendas?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="space-y-4">
              <p className="text-lg text-gray-400 leading-relaxed">
                A MRO continua fornecendo toda a retaguarda necessária para o seu sucesso:
              </p>
              <ul className="space-y-3">
                {["Tecnologia", "Infraestrutura", "Atualizações", "Hospedagem", "Treinamentos", "Suporte", "Desenvolvimento"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-200">
                    <CheckCircle2 className="w-4 h-4 text-yellow-500" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-zinc-900 border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-center text-center">
              <div className="space-y-2">
                <span className="text-yellow-500 text-5xl font-black">70%</span>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">É o seu Lucro</p>
              </div>
              <div className="h-px bg-white/5 my-6" />
              <div className="space-y-1 opacity-50">
                <span className="text-white text-2xl font-black">30%</span>
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Taxa de Manutenção MRO</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 7 - PARA QUEM É */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-16 italic">Quem pode se tornar um <span className="text-yellow-500">Licenciado?</span></h2>
          <div className="flex flex-wrap justify-center gap-4">
            {forWhom.map((item, i) => (
              <span key={i} className="px-8 py-4 rounded-2xl bg-zinc-900 border border-white/5 text-lg font-bold hover:border-yellow-500/40 transition-all cursor-default">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Seção 8 - DIFERENCIAL */}
      <section className="py-24 px-4 bg-yellow-500 text-black overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-5">
          <Target className="w-64 h-64" />
        </div>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12 relative z-10">
          <div className="text-7xl font-black italic opacity-20 hidden md:block">!</div>
          <div className="space-y-6">
            <h2 className="text-4xl md:text-6xl font-black leading-none uppercase italic">Você não está comprando uma ferramenta</h2>
            <p className="text-xl md:text-2xl font-bold opacity-80 leading-relaxed">
              Você está adquirindo uma operação pronta. Enquanto a maioria precisa criar um produto, desenvolver tecnologia e contratar equipe, o Licenciado MRO recebe tudo pronto para iniciar suas vendas imediatamente.
            </p>
          </div>
        </div>
      </section>

      {/* NOVO BENEFÍCIO - TRAFEGO PAGO */}
      <section className="py-24 px-4 bg-zinc-950">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-zinc-900 to-black border border-emerald-500/20 rounded-[3rem] p-8 md:p-16 flex flex-col md:flex-row items-center gap-12">
          <div className="w-24 h-24 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center shrink-0 animate-pulse">
            <TrendingUp className="text-emerald-500 w-12 h-12" />
          </div>
          <div className="space-y-4">
            <Badge className="bg-emerald-500 text-black font-black px-4 py-1 rounded-full uppercase tracking-widest border-none">Bônus Exclusivo</Badge>
            <h3 className="text-3xl md:text-5xl font-black text-white italic uppercase leading-none">Aceleração com Tráfego Pago</h3>
            <p className="text-xl text-gray-400 font-medium">
              Vamos entregar suporte total com tráfego pago e vamos <span className="text-white font-bold">criar as campanhas "Top 5"</span> para que você já comece a vender no seu primeiro mês como licenciado.
            </p>
          </div>
        </div>
      </section>

      {/* Seção 9 - INVESTIMENTO */}
      <section className="py-32 px-4 relative">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-zinc-900/50 border-yellow-500/30 rounded-[3.5rem] p-8 md:p-16 text-center backdrop-blur-xl relative overflow-hidden group shadow-2xl shadow-yellow-500/5">
            <div className="absolute inset-0 bg-yellow-500/[0.02] group-hover:bg-yellow-500/[0.04] transition-all" />
            
            <Badge className="mb-8 bg-white/10 text-yellow-500 font-black px-6 py-2 rounded-full border-white/10 uppercase tracking-[0.2em]">Investimento Único</Badge>
            <h2 className="text-4xl md:text-7xl font-black text-white mb-4 italic uppercase leading-none">Torne-se um <span className="text-yellow-500">Licenciado MRO</span></h2>
            
            <div className="mt-12 space-y-4">
              <div className="flex flex-col items-center">
                <span className="text-gray-500 font-bold uppercase tracking-widest text-sm mb-2">Por Apenas</span>
                <div className="text-7xl md:text-9xl font-black text-white tracking-tighter leading-none mb-2">R$ 3.600</div>
                <span className="text-yellow-500 text-xl font-black uppercase tracking-[0.3em] italic">À VISTA</span>
              </div>
              
              <div className="py-8 flex items-center justify-center gap-4">
                <div className="h-px w-12 bg-white/10" />
                <span className="text-gray-500 font-bold">OU NO CARTÃO</span>
                <div className="h-px w-12 bg-white/10" />
              </div>

              <div className="flex flex-col items-center">
                <div className="text-4xl md:text-5xl font-black text-white/90">12x de <span className="text-yellow-500">R$ 369</span></div>
                <span className="text-gray-500 font-bold mt-2 text-sm italic">(R$ 4.432 total parcelado)</span>
              </div>
            </div>

            <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {[
                "Licença Oficial MRO",
                "Operação 100% Pronta",
                "70% de Lucro por Venda",
                "Suporte com Campanhas Top 5",
                "Acesso Imediato",
                "Pagamento Único"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-white/60 font-medium">
                  <CheckCircle2 className="text-yellow-500 w-5 h-5 shrink-0" /> {item}
                </div>
              ))}
            </div>

            <Button 
              size="lg" 
              onClick={handleWhatsAppContact}
              className="mt-16 bg-yellow-500 hover:bg-yellow-600 text-black font-black h-24 px-12 rounded-[2.5rem] text-xl md:text-2xl w-full transition-all hover:scale-105 shadow-[0_20px_50px_rgba(234,179,8,0.2)] group"
            >
              QUERO ME TORNAR UM LICENCIADO <ArrowRight className="ml-3 w-8 h-8 group-hover:translate-x-2 transition-transform" />
            </Button>
            
            <p className="mt-8 text-gray-500 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> Atendimento Humano via WhatsApp
            </p>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-gray-600">
        <p className="text-xs uppercase font-bold tracking-[0.3em]">MRO INTELIGENTE © 2026 • TODOS OS DIREITOS RESERVADOS</p>
      </footer>
    </div>
  );
};

export default Licenciado;
