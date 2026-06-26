import { useEffect, useState } from "react";

function SetTitle({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    document.title = title;
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); }
    m.setAttribute("content", description);
  }, [title, description]);
  return null;
}
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, Target, Users, TrendingUp, Briefcase, Megaphone, MessageSquare, Award } from "lucide-react";

const Section = ({ title, items }: { title: string; items: string[] }) => (
  <div className="bg-zinc-900/60 border border-amber-500/20 rounded-xl p-6">
    <h4 className="text-amber-400 font-bold mb-4 text-lg">{title}</h4>
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it} className="flex items-start gap-2 text-zinc-200 text-sm">
          <Check className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default function ComercialAAF() {
  const [form, setForm] = useState({
    nome: "", email: "", whatsapp: "", empresa: "", o_que_vende: "", faturamento: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.email || !form.whatsapp || !form.empresa || !form.faturamento) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("comercialaaf-register", { body: form });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Erro");
      setDone(data.message || "Recebemos seu interesse! Entraremos em contato em breve pelo seu WhatsApp.");
      toast.success("Cadastro recebido!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Helmet>
        <title>Projeto AAF - Anúncio, Abordagem e Fechamento | MRO</title>
        <meta name="description" content="Ecossistema completo para empresas faturarem mais. Anúncios, abordagem comercial e fechamento de vendas com Meta API e plataforma MRO." />
      </Helmet>

      {/* HERO */}
      <header className="relative overflow-hidden border-b border-amber-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-700/5" />
        <div className="relative max-w-6xl mx-auto px-4 py-20 text-center">
          <div className="inline-block bg-amber-500 text-black font-bold px-4 py-1 rounded-full text-xs tracking-widest mb-6">
            PROJETO AAF
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-4 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-600 bg-clip-text text-transparent">
            Anúncio • Abordagem • Fechamento
          </h1>
          <p className="text-xl md:text-2xl text-zinc-300 max-w-3xl mx-auto mb-6">
            O ecossistema completo que sua empresa precisa para vender mais.
          </p>
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/40 rounded-full px-5 py-2 text-amber-300 text-sm font-semibold">
            <Award className="w-4 h-4" /> Indicado para empresas que faturam mais de R$ 15 mil mensais
          </div>
        </div>
      </header>

      {/* MISSÃO */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-amber-400 mb-6 text-center">Nossa missão</h2>
        <p className="text-zinc-300 text-lg leading-relaxed text-center mb-4">
          Mais do que criar anúncios, implantamos uma <strong className="text-white">operação comercial completa</strong> para transformar oportunidades em vendas.
        </p>
        <p className="text-zinc-400 text-base leading-relaxed text-center mb-8">
          Nosso método une marketing, tecnologia e gestão comercial para que sua empresa tenha um processo previsível de geração de clientes, atendimento e fechamento de negócios.
        </p>
        <p className="text-zinc-300 text-center mb-4">Todo o projeto é desenvolvido utilizando o ecossistema da Meta:</p>
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {["Facebook", "Instagram", "WhatsApp", "Threads"].map((p) => (
            <span key={p} className="bg-zinc-900 border border-amber-500/30 px-4 py-2 rounded-lg text-amber-300 font-medium">{p}</span>
          ))}
        </div>
      </section>

      {/* MÉTODO */}
      <section className="bg-zinc-950 py-16 border-y border-amber-500/10">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Como funciona o <span className="text-amber-400">Método AAF</span>
          </h2>

          {/* 1. ANÚNCIO */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-amber-500 text-black font-black text-2xl flex items-center justify-center">1</div>
              <div>
                <div className="flex items-center gap-2 text-amber-400"><Megaphone className="w-5 h-5" /><span className="text-xs tracking-widest font-bold">ANÚNCIO</span></div>
                <h3 className="text-2xl font-bold">Geramos oportunidades para sua empresa</h3>
              </div>
            </div>
            <p className="text-zinc-400 mb-6 ml-0 md:ml-[72px]">
              Criamos campanhas estratégicas para atrair clientes qualificados através do ecossistema Meta. Não anunciamos para qualquer pessoa — planejamos campanhas voltadas para pessoas com maior potencial de compra.
            </p>
            <Section title="O que inclui" items={[
              "Planejamento estratégico das campanhas",
              "Gestão de anúncios no Facebook e Instagram",
              "Campanhas para WhatsApp",
              "Remarketing e segmentação de público",
              "Criação das campanhas",
              "Monitoramento diário e otimização mensal",
              "Relatórios de desempenho",
            ]} />
          </div>

          {/* 2. ABORDAGEM */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-amber-500 text-black font-black text-2xl flex items-center justify-center">2</div>
              <div>
                <div className="flex items-center gap-2 text-amber-400"><MessageSquare className="w-5 h-5" /><span className="text-xs tracking-widest font-bold">ABORDAGEM</span></div>
                <h3 className="text-2xl font-bold">Organizamos toda sua operação comercial</h3>
              </div>
            </div>
            <p className="text-zinc-400 mb-6 ml-0 md:ml-[72px]">
              Após gerar os clientes, estruturamos o processo para que nenhum lead seja perdido. Criamos uma jornada comercial organizada do primeiro contato até a negociação.
            </p>
            <Section title="O que inclui" items={[
              "Landing Page ou Site",
              "Organização do CRM e banco de dados",
              "Formulários de captura",
              "Integração com WhatsApp",
              "Estruturação do funil de vendas e etapas comerciais",
              "Distribuição de leads",
              "Automações e padronização do atendimento",
            ]} />
          </div>

          {/* 3. FECHAMENTO */}
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-amber-500 text-black font-black text-2xl flex items-center justify-center">3</div>
              <div>
                <div className="flex items-center gap-2 text-amber-400"><Target className="w-5 h-5" /><span className="text-xs tracking-widest font-bold">FECHAMENTO</span></div>
                <h3 className="text-2xl font-bold">Transformamos oportunidades em vendas</h3>
              </div>
            </div>
            <p className="text-zinc-400 mb-6 ml-0 md:ml-[72px]">
              Acompanhamos toda a operação comercial para aumentar a taxa de conversão. Criamos processos, treinamos a equipe e analisamos continuamente os atendimentos.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <Section title="Treinamento Comercial" items={[
                "Treinamento completo da equipe de vendas",
                "Técnicas de abordagem, negociação e fechamento",
                "Padronização do atendimento",
                "Scripts comerciais",
                "Boas práticas e rotina comercial",
              ]} />
              <Section title="Estruturação Comercial" items={[
                "Construção do funil de vendas",
                "Organização do processo comercial",
                "Gatilhos de atendimento e follow-up",
                "Estratégias de remarketing",
                "Recuperação de clientes",
                "Gestão de relacionamento",
              ]} />
              <Section title="Acompanhamento Mensal" items={[
                "Reuniões estratégicas mensais",
                "Acompanhamento das conversas comerciais",
                "Análise dos atendimentos e qualidade",
                "Análise da taxa de conversão",
                "Ajustes no funil e relatórios gerenciais",
                "Melhorias contínuas",
              ]} />
              <Section title="Plataforma Oficial Meta + MRO" items={[
                "Implantação da Meta API Oficial",
                "Integração com plataforma MRO",
                "Atendimento profissional no WhatsApp",
                "Múltiplos atendentes e histórico de conversas",
                "Fluxos e mensagens automáticas",
                "Distribuição inteligente de atendimentos",
              ]} />
            </div>
          </div>
        </div>
      </section>

      {/* O QUE RECEBE */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">
          O que sua empresa <span className="text-amber-400">recebe</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            "Mais clientes", "Processo comercial organizado", "Funil de vendas estruturado",
            "Atendimento profissional", "Equipe treinada", "CRM organizado",
            "Integração com WhatsApp", "Meta API Oficial", "Plataforma MRO implantada",
            "Acompanhamento mensal", "Estratégias comerciais", "Relatórios completos",
            "Otimização contínua", "Maior conversão de vendas", "Crescimento previsível",
          ].map((it) => (
            <div key={it} className="bg-zinc-900/60 border border-amber-500/20 rounded-lg p-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-sm text-zinc-200">{it}</span>
            </div>
          ))}
        </div>
      </section>

      {/* PARA QUEM */}
      <section className="bg-gradient-to-br from-amber-500/10 to-transparent border-y border-amber-500/20 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500 text-black font-bold px-5 py-2 rounded-full text-sm mb-6">
            <TrendingUp className="w-4 h-4" /> EMPRESAS QUE FATURAM 15K+ MENSAIS
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Indicado para empresários que precisam <span className="text-amber-400">alavancar suas vendas</span> e expandir no mercado
          </h2>
          <p className="text-zinc-300 text-lg leading-relaxed mb-4">
            Nosso compromisso é acompanhar sua empresa durante toda a operação comercial. Não entregamos apenas anúncios — implantamos uma estrutura completa.
          </p>
          <p className="text-zinc-400 leading-relaxed">
            Durante todo o projeto realizamos reuniões estratégicas, analisamos as conversas da equipe, acompanhamos a evolução do funil de vendas e implementamos melhorias constantes para aumentar a taxa de conversão.
          </p>
          <p className="text-amber-300 mt-6 font-semibold">
            Transformamos sua empresa em uma operação comercial organizada, previsível e escalável.
          </p>
        </div>
      </section>

      {/* FORMULÁRIO */}
      <section id="formulario" className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <Briefcase className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Solicite uma análise estratégica</h2>
          <p className="text-zinc-400">Preencha os dados abaixo e nossa equipe entrará em contato pelo WhatsApp.</p>
        </div>

        {done ? (
          <div className="bg-gradient-to-br from-amber-500/20 to-amber-700/10 border-2 border-amber-500/50 rounded-xl p-8 text-center">
            <Check className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-amber-300 mb-3">Cadastro recebido!</h3>
            <p className="text-zinc-200" dangerouslySetInnerHTML={{ __html: done }} />
            <p className="text-zinc-400 text-sm mt-4">Confira também seu email — enviamos uma confirmação.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-zinc-900/60 border border-amber-500/30 rounded-xl p-6 md:p-8 space-y-4">
            <div>
              <Label className="text-amber-300">Nome completo *</Label>
              <Input className="bg-black border-amber-500/20 text-white mt-1" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-amber-300">Email *</Label>
                <Input type="email" className="bg-black border-amber-500/20 text-white mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <Label className="text-amber-300">WhatsApp *</Label>
                <Input className="bg-black border-amber-500/20 text-white mt-1" placeholder="(00) 00000-0000" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} required />
              </div>
            </div>
            <div>
              <Label className="text-amber-300">Nome da empresa *</Label>
              <Input className="bg-black border-amber-500/20 text-white mt-1" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} required />
            </div>
            <div>
              <Label className="text-amber-300">O que sua empresa vende? Explique brevemente</Label>
              <Textarea className="bg-black border-amber-500/20 text-white mt-1 min-h-[100px]" value={form.o_que_vende} onChange={(e) => setForm({ ...form, o_que_vende: e.target.value })} />
            </div>
            <div>
              <Label className="text-amber-300">Faturamento mensal *</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                {[
                  { v: "15k-30k", l: "R$ 15k a 30k" },
                  { v: "30k-100k", l: "R$ 30k a 100k" },
                  { v: "100k+", l: "Mais de R$ 100k" },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setForm({ ...form, faturamento: o.v })}
                    className={`px-4 py-3 rounded-lg border text-sm font-semibold transition ${
                      form.faturamento === o.v
                        ? "bg-amber-500 text-black border-amber-400"
                        : "bg-black text-zinc-300 border-amber-500/20 hover:border-amber-500/50"
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-lg py-6">
              {loading ? "Enviando..." : "Quero alavancar minha empresa"}
            </Button>
            <p className="text-xs text-zinc-500 text-center flex items-center justify-center gap-1">
              <Users className="w-3 h-3" /> Atendimento exclusivo para empresas com faturamento mínimo de R$ 15k mensais.
            </p>
          </form>
        )}
      </section>

      <footer className="border-t border-amber-500/10 py-8 text-center text-zinc-500 text-sm">
        © {new Date().getFullYear()} Projeto AAF — MRO
      </footer>
    </div>
  );
}
