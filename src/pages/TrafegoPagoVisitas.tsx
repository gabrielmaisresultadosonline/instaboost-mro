import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Star, Users, Target, Rocket, ShieldCheck, Zap, Globe, ArrowRight } from "lucide-react";
import VisitasCheckoutModal from "@/components/trafego-pago/VisitasCheckoutModal";
import { motion } from "framer-motion";

const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <motion.div 
    whileHover={{ scale: 1.05 }}
    className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
  >
    <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mb-4">
      <Icon className="text-blue-500 w-6 h-6" />
    </div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-gray-400 text-sm">{description}</p>
  </motion.div>
);

export default function TrafegoPagoVisitas() {
  const [showModal, setShowModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-blue-900/10 blur-[120px] rounded-full" />
      </div>

      {/* Floating CTA for Mobile */}
      {scrolled && (
        <motion.div 
          initial={{ y: 100 }} 
          animate={{ y: 0 }}
          className="fixed bottom-6 left-4 right-4 z-40 md:hidden"
        >
          <Button 
            onClick={() => setShowModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-50 text-white hover:text-blue-900 font-black py-7 text-lg rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all"
          >
            QUERO ACESSAR AGORA! 🚀
          </Button>
        </motion.div>
      )}

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 px-6 container mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-400 text-sm font-bold mb-6"
          >
            <Zap className="w-4 h-4 fill-current" /> NOVO MODELO META BUSINESS 2026
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-tight"
          >
            Domine o Tráfego Pago <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
              Módulo 1: Visitas no Perfil
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Você aprenderá a criar campanhas de Visitas ao Perfil utilizando o novo modelo do Meta Business. 
            Passo a passo, do criativo de alta conversão até a otimização final. 📈
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-4"
          >
            <Button 
              size="lg" 
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-white text-white hover:text-blue-900 font-black py-8 px-12 text-2xl rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.3)] group transition-all"
            >
              QUERO ACESSAR AGORA 🚀
              <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-gray-500 text-sm font-medium">Acesso imediato por apenas R$ 47,00/ano</p>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard 
            icon={Target}
            title="Público Alvo"
            description="Aprenda a encontrar seguidores reais e locais que realmente compram de você."
          />
          <FeatureCard 
            icon={Rocket}
            title="Escala Real"
            description="Aumente seu alcance de forma estratégica e orgânica através de anúncios pagos."
          />
          <FeatureCard 
            icon={Zap}
            title="Alta Conversão"
            description="Criativos desenvolvidos para prender a atenção e gerar o clique imediato."
          />
          <FeatureCard 
            icon={ShieldCheck}
            title="Método Seguro"
            description="Configurações corretas para evitar bloqueios e otimizar cada centavo gasto."
          />
        </div>
      </section>

      {/* Course Details */}
      <section className="py-20 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-black mb-8 leading-tight">
                O que você vai <br/>
                <span className="text-blue-500">aprender neste módulo:</span>
              </h2>
              <div className="space-y-6">
                {[
                  "Criação de criativos de alta conversão do zero",
                  "Configuração completa da conta no Meta Business",
                  "Segmentação estratégica para visitas locais",
                  "Análise de métricas e otimização de resultados",
                  "Estratégias de remarketing para novos seguidores",
                  "Como escalar sem perder o ROI"
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="text-blue-500 w-6 h-6 mt-1 flex-shrink-0" />
                    <p className="text-gray-300 text-lg">{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute inset-0 bg-blue-600/20 blur-[80px] rounded-full" />
              <div className="relative p-1 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-900 shadow-2xl overflow-hidden">
                <div className="bg-black/90 p-8 rounded-[22px] space-y-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                      <Star className="text-white w-6 h-6 fill-current" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xl">MRO Estratégias</h4>
                      <p className="text-blue-400 text-sm">Método Validado 2026</p>
                    </div>
                  </div>
                  <p className="text-gray-400 leading-relaxed italic">
                    "Ao final, mostramos como analisar os resultados, interpretar as principais métricas e identificar oportunidades de otimização para melhorar continuamente o desempenho das campanhas."
                  </p>
                  <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Investimento</p>
                      <p className="text-4xl font-black">R$ 47,00</p>
                      <p className="text-blue-400 text-sm">por 1 ano de acesso</p>
                    </div>
                    <Button 
                      onClick={() => setShowModal(true)}
                      className="bg-blue-600 hover:bg-white text-white hover:text-blue-900 font-bold"
                    >
                      ACESSAR
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="py-20 px-6 container mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-black mb-12">Próximos Passos na MRO</h2>
        <div className="max-w-3xl mx-auto text-gray-400 text-lg leading-relaxed mb-12">
          <p>
            Esta é apenas a primeira etapa de uma série de módulos exclusivos da MRO Estratégias. 
            Novos treinamentos serão lançados abordando diferentes objetivos de campanha, estratégias avançadas, 
            públicos, conversões, remarketing, geração de leads, vendas e diversas técnicas para que você domine o Tráfego Pago de forma completa. ⚡
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <span className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-bold">#Visitas</span>
          <span className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-bold">#Seguidores</span>
          <span className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-bold">#AlcanceReal</span>
          <span className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-bold">#Local</span>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="relative p-12 md:p-20 rounded-[40px] bg-gradient-to-br from-blue-600 to-blue-900 overflow-hidden text-center">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-black mb-6 text-white leading-tight">
                Comece a crescer <br className="hidden md:block"/> seu perfil hoje mesmo!
              </h2>
              <p className="text-blue-100 text-xl mb-10 max-w-xl mx-auto font-medium">
                Pagamento único de R$ 47 para 1 ano de acesso completo. <br/>
                Sem pegadinhas, sem cobranças ocultas.
              </p>
              <Button 
                onClick={() => setShowModal(true)}
                className="bg-white text-blue-900 hover:bg-blue-50 font-black py-8 px-16 text-2xl rounded-2xl shadow-2xl transition-all"
              >
                QUERO MEU ACESSO AGORA! 🚀
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-center text-gray-500 text-sm">
        <p>&copy; 2026 MRO Estratégias. Todos os direitos reservados.</p>
      </footer>

      {showModal && <VisitasCheckoutModal plan="Trafego" amount={47} onClose={() => setShowModal(false)} />}
    </div>
  );
}