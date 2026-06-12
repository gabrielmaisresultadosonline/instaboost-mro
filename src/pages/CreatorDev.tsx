import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2, 
  Laptop, 
  Code2, 
  Rocket, 
  Globe, 
  Database, 
  Shield, 
  Layout, 
  Settings, 
  ArrowRight, 
  Cpu, 
  Layers, 
  Smartphone, 
  Zap,
  Star,
  MessageSquare
} from 'lucide-react';

const CreatorDev = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    whatsapp: '',
    email: '',
    project_description: ''
  });
  const [loading, setLoading] = useState(false);

  // Contact form moved to /creatordev/projeto


  const services = [
    { icon: <Layout className="w-8 h-8 text-blue-400" />, title: "Sistemas Web Personalizados", desc: "Plataformas exclusivas desenhadas para o seu fluxo de trabalho." },
    { icon: <Rocket className="w-8 h-8 text-purple-400" />, title: "Delivery & Automação", desc: "Agilize seus pedidos e processos internos automaticamente." },
    { icon: <Code2 className="w-8 h-8 text-emerald-400" />, title: "APIs e Integrações", desc: "Conectamos seu sistema com qualquer serviço externo." },
    { icon: <Globe className="w-8 h-8 text-orange-400" />, title: "Extensões & Web Apps", desc: "Soluções acessíveis diretamente do navegador." },
    { icon: <Settings className="w-8 h-8 text-red-400" />, title: "Infraestrutura VPS", desc: "Servidores Linux otimizados para alta performance." },
    { icon: <Database className="w-8 h-8 text-cyan-400" />, title: "Bancos de Dados", desc: "Estruturas de dados seguras e escaláveis." },
  ];

  const goToContact = () => {
    window.location.href = '/creatordev/projeto';
  };


  return (
    <div className="min-h-screen bg-[#050506] text-white selection:bg-blue-500/30 font-sans">
      {/* Navigation Dummy */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-xl tracking-tighter">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Code2 className="w-5 h-5" />
            </div>
            CREATOR<span className="text-blue-500">DEV</span>
          </div>
          <Button 
            variant="ghost" 
            className="text-gray-400 hover:text-white"
            onClick={() => window.location.href = '/creatordev/projeto'}

          >
            Falar com Especialista
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 px-6 overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -z-10 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] -z-10" />
        
        <div className="max-w-6xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/5 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-widest uppercase animate-fade-in">
            <Zap className="w-3 h-3 fill-current" />
            Software Engineering & Full Stack Development
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] bg-gradient-to-b from-white via-white to-gray-500 bg-clip-text text-transparent">
            TRANSFORMAMOS IDEIAS EM<br />
            <span className="text-blue-500">SISTEMAS ESCALÁVEIS</span>
          </h1>
          
          <p className="text-lg md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Desenvolvemos sistemas web sob medida que automatizam processos, aumentam a produtividade e escalam o faturamento da sua empresa.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-10 h-16 text-lg font-bold shadow-[0_0_30px_rgba(37,99,235,0.3)] group"
              onClick={() => window.location.href = '/creatordev/projeto'}

            >
              Iniciar meu projeto
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-gray-800" />
                ))}
              </div>
              +150 Projetos entregues
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-12 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "Anos de Experiência", val: "8+" },
            { label: "Sistemas Web", val: "200+" },
            { label: "Uptime Garantido", val: "99.9%" },
            { label: "Suporte VIP", val: "24/7" },
          ].map((stat, i) => (
            <div key={i} className="text-center space-y-1">
              <div className="text-2xl md:text-4xl font-black text-white">{stat.val}</div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight">SOLUÇÕES SOB MEDIDA PARA CADA NECESSIDADE</h2>
              <p className="text-gray-400 text-lg">
                Desenvolvemos sistemas web personalizados para empresas e profissionais de diversas áreas: 
                delivery, academias, personal trainers, clínicas, imobiliárias, gestão empresarial, marketplaces e muito mais.
              </p>
            </div>

            <Button 
              variant="outline" 
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 rounded-xl h-14 px-8 font-bold"
              onClick={() => window.location.href = '/creatordev/projeto'}

            >
              Ver todos os serviços
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <div key={index} className="group p-8 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-blue-500/30 transition-all duration-500 hover:-translate-y-2">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  {service.desc}
                </p>
                <div className="flex items-center gap-2 text-blue-500 text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Saber mais <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Expertise Section */}
      <section className="py-32 px-6 bg-blue-600">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">DOMÍNIO TÉCNICO COMPLETO</h2>
            <div className="space-y-6">
              <p className="text-blue-100 text-lg md:text-xl font-medium">
                Trabalhamos com desenvolvimento Full Stack, criando desde o painel administrativo até a interface do usuário.
              </p>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  "Integração com APIs",
                  "Automações Inteligentes",
                  "Hospedagem em VPS",
                  "Segurança Avançada",
                  "Sistemas Responsivos",
                  "Escalabilidade Real"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white font-bold">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <Button 
              className="bg-white text-blue-600 hover:bg-gray-100 rounded-2xl h-16 px-10 font-black text-lg shadow-xl"
              onClick={() => window.location.href = '/creatordev/projeto'}

            >
              Solicitar Orçamento Grátis
            </Button>
          </div>
          <div className="relative">
            <div className="aspect-square rounded-[40px] bg-blue-700/50 border-4 border-white/10 flex items-center justify-center overflow-hidden">
               <Cpu className="w-40 h-40 text-white/10 absolute animate-spin-slow" />
               <div className="relative z-10 text-center space-y-4 px-10">
                  <div className="text-7xl font-black">100%</div>
                  <div className="text-xl font-bold opacity-80 uppercase tracking-tighter">Focado no seu Resultado</div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 px-6 relative">
        <div className="max-w-5xl mx-auto text-center space-y-12">
          <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-tight">
            PRONTO PARA<br />
            <span className="text-blue-500">O PRÓXIMO NÍVEL?</span>
          </h2>
          <p className="text-gray-400 text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed">
            Estamos prontos para transformar sua visão em uma realidade digital escalável.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-12 h-20 text-xl font-black shadow-2xl group transition-all hover:scale-105"
              onClick={() => window.location.href = '/creatordev/projeto'}
            >
              Começar agora
              <Rocket className="ml-3 w-6 h-6 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline"
              size="lg" 
              className="border-white/10 hover:bg-white/5 rounded-2xl px-12 h-20 text-xl font-bold transition-all"
              onClick={() => window.open('https://wa.me/555192036540', '_blank')}
            >
              Chamar no WhatsApp
            </Button>
          </div>
        </div>
      </section>


      {/* Final Promo Text Card */}
      <section className="py-24 px-6 bg-[#0a0a0c]">
        <div className="max-w-4xl mx-auto">
          <div className="p-12 rounded-[40px] bg-gradient-to-br from-gray-900 to-black border border-white/5 text-center space-y-8">
            <div className="flex justify-center gap-1">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 text-amber-500 fill-amber-500" />)}
            </div>
            <h3 className="text-2xl font-bold tracking-tight italic text-gray-300">
              "Transformamos ideias complexas em sistemas web completos, escaláveis e de alta performance."
            </h3>
            <div className="pt-4">
              <div className="font-black text-xl uppercase tracking-widest">CreatorDev Team</div>
              <div className="text-blue-500 text-sm font-bold">Expert Full Stack Development</div>
            </div>
            <div className="pt-8">
               <Button 
                variant="link" 
                className="text-gray-500 hover:text-white uppercase tracking-[0.2em] font-bold text-xs"
                onClick={() => window.location.href = '/creatordev/projeto'}
              >
                Start your journey with us
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-white/5 text-center space-y-4">
        <div className="font-black text-xl tracking-tighter">
          CREATOR<span className="text-blue-500">DEV</span>
        </div>
        <p className="text-gray-600 text-sm max-w-md mx-auto">
          Especialistas em engenharia de software e desenvolvimento web sob medida.
        </p>
        <div className="pt-8 text-gray-700 text-[10px] font-bold uppercase tracking-[0.3em]">
          &copy; 2024 CreatorDev. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};

export default CreatorDev;

