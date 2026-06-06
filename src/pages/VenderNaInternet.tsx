import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Shield, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function VenderNaInternet() {
  const [loading, setLoading] = useState(false);

  const handleCTA = () => {
    // Popup logic as requested: 
    // Button 1: "Utilize a MRO no seu negocio agora" -> Popup
    // Wait 24h logic needs to be checked on DB or storage if they qualify.
    toast.info("Você compreendeu como a MRO vai te ajudar a vender sem precisar investir em tráfego pago, e investindo muito pouco, agora voce recebeu um desconto para se quiser aproveitar a MRO e adquirir o plano anual com desconto, que vai ser liberado para o link /instagram-nova-promoo2 (Acesso liberado após 24h)");
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-black mb-4">PÁGINA DE VENDAS - MRO</h1>
        <p className="text-2xl font-bold">Pare de gastar dinheiro com tráfego pago para vender na internet.</p>
        <p className="text-xl text-gray-400 mt-2">A MRO pode ajudar você a vender todos os dias utilizando Inteligência Artificial e automação no Instagram.</p>
      </header>

      <section className="mb-16">
        <h2 className="text-3xl font-bold mb-6 italic text-yellow-500">SEÇÃO 1 - APRESENTAÇÃO</h2>
        <p className="text-lg text-gray-300">A MRO é uma ferramenta completa com Inteligência Artificial que trabalha para você de forma automática.</p>
        <p className="text-lg text-gray-300 mt-4">Ela ajuda empresários, prestadores de serviço, produtores e vendedores a gerar oportunidades de negócio sem precisar passar horas todos os dias no Instagram.</p>
        <p className="text-lg text-gray-300 mt-4">Imagine ter um funcionário trabalhando até 10 horas por dia, de forma automática, entrando em contato com potenciais clientes e ajudando sua empresa a vender mais. Isso é o que a MRO faz.</p>
      </section>

      <section className="mb-16">
        <h2 className="text-3xl font-bold mb-6 italic text-yellow-500">SEÇÃO 2 - OPORTUNIDADE</h2>
        <p className="text-lg text-gray-300">Estou liberando algumas vagas especiais para você conhecer tudo o que a MRO pode fazer e aplicar imediatamente no seu negócio.</p>
        <div className="mt-6 p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
          <p className="text-2xl font-black">Por apenas R$ 25, você terá acesso completo para entender como utilizar a ferramenta e aproveitar todo o seu potencial.</p>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-3xl font-bold mb-6 italic text-yellow-500">SEÇÃO 3 - O QUE É A MRO</h2>
        <p className="text-lg text-gray-300">A MRO é uma ferramenta de automação para Instagram que funciona como um funcionário virtual. Ela trabalha continuamente para sua empresa, produto ou serviço, ajudando a gerar contatos, oportunidades e vendas. Enquanto você cuida do seu negócio, a MRO continua trabalhando.</p>
      </section>

      <section className="mb-16">
        <h2 className="text-3xl font-bold mb-6 italic text-yellow-500">SEÇÃO 4 - O QUE VOCÊ RECEBE</h2>
        <ul className="space-y-4">
          <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500" /> Imersão Completa MRO - Aprenda passo a passo como utilizar a ferramenta.</li>
          <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500" /> Grupo VIP de Empresários no WhatsApp - Networking, troca de experiências e suporte.</li>
          <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500" /> Descontos em Outras Ferramentas - Benefícios exclusivos para acelerar o crescimento.</li>
          <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500" /> Conteúdo Exclusivo - Materiais, estratégias e atualizações.</li>
        </ul>
      </section>

      <section className="mb-16 text-center p-12 bg-zinc-900 rounded-3xl border-2 border-yellow-500">
        <h2 className="text-3xl font-bold mb-6 text-yellow-500">SEÇÃO 5 - OFERTA ESPECIAL</h2>
        <p className="text-xl mb-8">Deixe a tecnologia trabalhar para você. Acesso Vitalício à MRO: R$ 25</p>
        
        <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white text-xl py-8 px-12" onClick={handleCTA}>
          QUERO GARANTIR MINHA VAGA AGORA
        </Button>
      </section>
      
      <footer className="text-center text-gray-500">
        Esta é uma condição promocional por tempo limitado. Aproveite agora para conhecer a MRO.
      </footer>
    </div>
  );
}
