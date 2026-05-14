import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Instagram, 
  MessageSquare, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  BarChart3,
  Rocket
} from 'lucide-react';
import { motion } from 'framer-motion';

const WhiteLabel = () => {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-400 selection:text-black">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/5 blur-[120px] rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-4 py-1.5 rounded-full border-none">
              OPORTUNIDADE WHITE LABEL
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter">
              SUA MARCA, <br />
              <span className="text-yellow-500">NOSSA TECNOLOGIA.</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
              Revenda o sistema de automação para Instagram mais potente do mercado. 
              Mensagens em massa no Direct, atração de público alvo e escala real.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-14 px-8 rounded-2xl text-lg w-full sm:w-auto transition-all hover:scale-105 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                COMEÇAR AGORA <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button variant="outline" size="lg" className="border-gray-800 hover:bg-white/5 h-14 px-8 rounded-2xl text-lg w-full sm:w-auto">
                VER DEMONSTRAÇÃO
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats/Highlight Section */}
      <section className="py-20 bg-zinc-950 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { label: "Economia em Anúncios", value: "100%", icon: Zap },
              { label: "Taxa de Entrega", value: "98%", icon: ShieldCheck },
              { label: "Escalabilidade", value: "ILIMITADA", icon: TrendingUp },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="p-8 rounded-3xl bg-black border border-white/5 flex flex-col items-center text-center group hover:border-yellow-500/30 transition-colors"
              >
                <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <stat.icon className="text-yellow-500 w-6 h-6" />
                </div>
                <div className="text-4xl font-black text-white mb-2">{stat.value}</div>
                <div className="text-gray-500 font-medium uppercase tracking-widest text-xs">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content / Features */}
      <section className="py-32 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1">
              <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight">
                IMAGINA OFERECER ESSA SOLUÇÃO PARA <span className="text-yellow-500 underline decoration-yellow-500/30">QUALQUER EMPRESA?</span>
              </h2>
              <p className="text-lg text-gray-400 mb-10 leading-relaxed">
                Empresas gastam milhares com anúncios que nem sempre convertem. Com sua solução de Direct em massa, elas garantem atenção direta do público-alvo com custo quase zero de aquisição.
              </p>
              
              <ul className="space-y-6">
                {[
                  "Sua logo e sua identidade visual",
                  "Domínio próprio personalizado",
                  "Painel administrativo completo",
                  "Gestão total de usuários e planos",
                  "Tecnologia anti-bloqueio avançada",
                  "Suporte técnico especializado"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-gray-200 font-medium">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-yellow-500" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex-1 relative">
              <div className="absolute inset-0 bg-yellow-500/20 blur-[100px] rounded-full animate-pulse" />
              <Card className="bg-black border-white/10 rounded-[40px] overflow-hidden relative z-10 shadow-2xl">
                <CardContent className="p-12">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-gradient-to-tr from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Instagram className="text-black w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xl">Direct Pro Master</h4>
                      <p className="text-gray-500 text-sm">Powered by Your Brand</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="h-4 w-3/4 bg-zinc-800 rounded-full" />
                    <div className="h-4 w-full bg-zinc-900 rounded-full" />
                    <div className="h-4 w-5/6 bg-zinc-800 rounded-full" />
                    <div className="grid grid-cols-2 gap-4 mt-12">
                      <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5">
                        <BarChart3 className="text-yellow-500 mb-2 w-5 h-5" />
                        <span className="block text-xs text-gray-500 uppercase">Cliques</span>
                        <span className="text-xl font-bold">12.4k</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5">
                        <Users className="text-yellow-500 mb-2 w-5 h-5" />
                        <span className="block text-xs text-gray-500 uppercase">Leads</span>
                        <span className="text-xl font-bold">3.1k</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 relative bg-zinc-950/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">INVESTIMENTO <span className="text-yellow-500">WHITE LABEL</span></h2>
            <p className="text-gray-400 text-lg">Escolha o melhor plano para começar sua própria agência de automação</p>
          </div>
          
          <div className="max-w-md mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-[40px] blur opacity-25" />
              <Card className="bg-zinc-950 border-white/10 rounded-[40px] overflow-hidden relative z-10">
                <CardContent className="p-10 text-center">
                  <Badge className="bg-yellow-500 text-black font-bold mb-6">ATIVAÇÃO POR 1 ANO</Badge>
                  <div className="mb-8">
                    <span className="text-gray-400 text-lg text-balance">Investimento Único</span>
                    <div className="text-6xl font-black text-white my-2">R$ 6.000</div>
                    <span className="text-yellow-500 font-bold uppercase tracking-widest text-sm">Acesso por 12 meses</span>
                  </div>
                  
                  <div className="py-6 border-y border-white/5 mb-8">
                    <p className="text-gray-400 mb-2">Ou parcele no cartão:</p>
                    <div className="text-3xl font-bold text-white">12x de R$ 615</div>
                    <p className="text-gray-500 text-sm mt-2">Total parcelado: R$ 7.388,26</p>
                  </div>

                  <ul className="text-left space-y-4 mb-10">
                    {[
                      "Vendas ILIMITADAS de clientes",
                      "Liberação de Teste Grátis para prospectos",
                      "Passo a passo completo de vendas",
                      "Faturamento Anual Est. R$ 238 mil líquido",
                      "Sua Marca e Seu Domínio Próprio",
                      "Painel Admin para Gestão Total"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-gray-300">
                        <CheckCircle2 className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                        <span className="text-sm md:text-base font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-black h-14 rounded-2xl text-lg shadow-lg shadow-yellow-500/20 transition-all hover:scale-[1.02]">
                    QUERO MEU SISTEMA AGORA
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 relative overflow-hidden">
        <div className="max-w-5xl mx-auto rounded-[50px] bg-gradient-to-b from-yellow-500 to-yellow-600 p-1 lg:p-[1px]">
          <div className="bg-black rounded-[49px] p-12 lg:p-24 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/10 blur-[100px] -mr-48 -mt-48 rounded-full" />
            
            <Rocket className="w-16 h-16 text-yellow-500 mx-auto mb-8 animate-bounce" />
            <h2 className="text-4xl md:text-6xl font-black mb-8">
              MAIS VENDAS. <br />
              <span className="text-yellow-500">MAIS RESULTADOS.</span>
            </h2>
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
              Seja o dono da sua própria plataforma de SaaS. O mercado de automação para Instagram é o que mais cresce hoje. Não perca tempo.
            </p>
            <Button size="lg" className="bg-white hover:bg-gray-100 text-black font-black h-16 px-12 rounded-2xl text-xl transition-all hover:scale-105">
              QUERO SER WHITE LABEL
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Instagram className="w-6 h-6 text-yellow-500" />
            <span className="font-bold text-xl">WHITELABEL <span className="text-yellow-500">PRO</span></span>
          </div>
          <p className="text-gray-500 text-sm">© 2026 Todos os direitos reservados. Sua Marca.</p>
          <div className="flex gap-6">
            <a href="#" className="text-gray-400 hover:text-yellow-500 transition-colors">Termos</a>
            <a href="#" className="text-gray-400 hover:text-yellow-500 transition-colors">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WhiteLabel;