import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Laptop, Code2, Rocket, Globe, Database, Shield, Layout, Settings } from 'lucide-react';

const CreatorDev = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    whatsapp: '',
    email: '',
    project_description: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('creatordev_requests')
        .insert([formData]);

      if (error) throw error;

      // Call edge function for email notification (we will create this next)
      supabase.functions.invoke('creatordev-notify', {
        body: { type: 'new_request', data: formData }
      }).catch(err => console.error("Error calling notify function:", err));

      toast.success("Projeto enviado com sucesso! Entraremos em contato em breve.");
      setFormData({ full_name: '', whatsapp: '', email: '', project_description: '' });
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      toast.error("Erro ao enviar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const services = [
    { icon: <Layout className="w-6 h-6 text-blue-500" />, title: "Sistemas Web Personalizados" },
    { icon: <Rocket className="w-6 h-6 text-purple-500" />, title: "Delivery, Gestão e Automação" },
    { icon: <Code2 className="w-6 h-6 text-green-500" />, title: "APIs e Integrações" },
    { icon: <Globe className="w-6 h-6 text-orange-500" />, title: "Extensões para Navegadores" },
    { icon: <Settings className="w-6 h-6 text-red-500" />, title: "Hospedagem VPS e Servidores Linux" },
    { icon: <Database className="w-6 h-6 text-cyan-500" />, title: "Banco de Dados e Segurança" },
    { icon: <Laptop className="w-6 h-6 text-indigo-500" />, title: "Painéis Administrativos" },
    { icon: <CheckCircle2 className="w-6 h-6 text-yellow-500" />, title: "Sistemas para Empresas e Profissionais" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-blue-500/30">
      {/* Hero Section */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent -z-10" />
        
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Desenvolvimento Full Stack Web
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
            Desenvolvemos o sistema que sua empresa precisa
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Transformamos suas ideias em sistemas web completos, seguros e escaláveis para impulsionar o seu negócio.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 h-12"
              onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Conte para nós o seu projeto
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-6 bg-[#0d0d0e]">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">O que fazemos</h2>
            <div className="space-y-4 text-gray-400 leading-relaxed">
              <p>
                Desenvolvo sistemas web personalizados para empresas e profissionais de diversas áreas. 
                Crio plataformas para delivery, academias, personal trainers, clínicas, imobiliárias, 
                gestão empresarial, marketplaces e qualquer tipo de sistema online.
              </p>
              <p>
                Trabalho com desenvolvimento Full Stack, criando desde o painel administrativo até a 
                interface do usuário, integração com APIs, automações, bancos de dados, hospedagem em 
                VPS, configuração de servidores Linux, domínios, segurança e implantação de projetos.
              </p>
              <p>
                Também desenvolvo extensões para navegadores, integrações entre sistemas, web apps 
                responsivos e soluções sob medida para necessidades específicas de cada cliente.
              </p>
              <p className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-blue-300 italic">
                "Não trabalho apenas com aplicativos Windows, Android ou iOS. Meu foco principal é a 
                criação de soluções web completas, acessíveis de qualquer dispositivo através do 
                navegador, com infraestrutura escalável e integração com serviços externos."
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((service, index) => (
              <div key={index} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-colors">
                <div className="mb-3">{service.icon}</div>
                <h3 className="font-semibold text-sm">{service.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WhatsApp Version Summary */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-2xl font-bold">Resumo das Nossas Soluções</h2>
          <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/5 rounded-2xl p-8 text-left space-y-4">
            <div className="flex items-center gap-2 font-bold text-xl text-blue-400">
              <Code2 className="w-6 h-6" />
              Desenvolvedor Full Stack Web
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-gray-300">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Sistemas Web Personalizados</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Delivery, Gestão e Automação</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> APIs e Integrações</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Extensões para Navegadores</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Hospedagem VPS e Servidores Linux</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Banco de Dados e Segurança</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Painéis Administrativos</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Sistemas para Empresas</li>
            </ul>
            <p className="pt-4 font-medium text-white italic">
              Transformamos ideias em sistemas web completos e escaláveis.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact-form" className="py-20 px-6 bg-[#0d0d0e]">
        <div className="max-w-xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Fale sobre seu projeto</h2>
            <p className="text-gray-400">Quem sabe podemos ajudar a desenvolver tudo para você?</p>
          </div>

          <Card className="bg-white/5 border-white/10 text-white">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome Completo</label>
                  <Input 
                    required
                    placeholder="Seu nome"
                    className="bg-white/5 border-white/10 text-white"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">WhatsApp</label>
                    <Input 
                      required
                      placeholder="(00) 00000-0000"
                      className="bg-white/5 border-white/10 text-white"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input 
                      required
                      type="email"
                      placeholder="seu@email.com"
                      className="bg-white/5 border-white/10 text-white"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Conte sobre o projeto e o que deseja fazer</label>
                  <Textarea 
                    required
                    placeholder="Descreva seu projeto em detalhes..."
                    className="bg-white/5 border-white/10 text-white min-h-[150px]"
                    value={formData.project_description}
                    onChange={(e) => setFormData({...formData, project_description: e.target.value})}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg"
                  disabled={loading}
                >
                  {loading ? "Enviando..." : "Enviar Solicitação de Projeto"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 text-center text-gray-500 text-sm">
        <p>&copy; 2024 CreatorDev. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default CreatorDev;
