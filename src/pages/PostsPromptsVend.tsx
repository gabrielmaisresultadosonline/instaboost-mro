import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Calendar, Zap, TrendingUp, Check, Palette, Image as ImageIcon, Brain, Shield, Lock } from "lucide-react";

const KIWIFY_URL = "https://pay.kiwify.com.br/V3E8Qpl";

const PostsPromptsVend = () => {
  const scrollToOffer = () => {
    document.getElementById("oferta")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const benefits = [
    { icon: Brain, title: "Inteligência Artificial MRO Inclusa", desc: "IA MRO profissional cria prompts perfeitos automaticamente para você." },
    { icon: Calendar, title: "Posts para o Mês Todo", desc: "Gere o calendário completo de conteúdo em minutos, não em dias." },
    { icon: Palette, title: "Cores Personalizadas", desc: "Escolha até 4 cores da sua marca e mantenha identidade visual consistente." },
    { icon: ImageIcon, title: "Feed e Stories", desc: "Formatos otimizados 1080x1350 (feed) e 1080x1920 (stories)." },
    { icon: Zap, title: "Velocidade Profissional", desc: "Gere imagens prontas direto na IA MRO em segundos." },
    { icon: TrendingUp, title: "Qualidade que Vende", desc: "Designer gráfico sênior dentro da IA MRO — sem precisar contratar ninguém." },
  ];

  const included = [
    "Geração ilimitada de prompts com IA MRO",
    "Posts para o mês todo em poucos minutos",
    "Paleta de cores personalizada (até 4 cores)",
    "Formatos Feed (1080x1350) e Stories (1080x1920)",
    "Prompts profissionais nível designer sênior",
    "Geração de imagens 100% dentro da IA MRO",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Hero */}
      <section className="container mx-auto px-4 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/40 rounded-full px-4 py-1.5 mb-6">
          <Sparkles className="w-4 h-4 text-purple-300" />
          <span className="text-sm text-purple-200">MROIMAGEM PRO</span>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 leading-tight">
          Gere posts para o <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">mês todo</span><br />
          de forma automática com IA MRO
        </h1>
        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-8">
          Inteligência Artificial MRO inclusa. Crie prompts profissionais de imagens em segundos e nunca mais fique sem conteúdo.
        </p>

        {/* Video */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border border-purple-500/30">
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/1dSrjZPDasg"
              title="MROIMAGEM PRO"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        <Button
          size="lg"
          onClick={scrollToOffer}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg px-8 py-6 rounded-xl shadow-lg shadow-purple-500/30"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Ver Oferta Especial
        </Button>
      </section>

      {/* Why quality matters */}
      <section className="container mx-auto px-4 py-12">
        <Card className="bg-slate-900/60 border-purple-500/20 p-6 sm:p-10 max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center">
            Por que <span className="text-purple-400">qualidade</span> nos posts importa?
          </h2>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-4">
            Um post com qualidade no seu negócio é a <strong className="text-white">primeira impressão</strong> que o cliente tem da sua marca.
            Posts amadores afastam clientes. Posts profissionais geram autoridade, confiança e vendas.
          </p>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Com a <strong className="text-purple-300">MROIMAGEM PRO</strong>, você tem um designer gráfico sênior trabalhando 24h por dia,
            movido pela <strong className="text-purple-300">Inteligência Artificial MRO</strong>, criando prompts prontos para gerar imagens de altíssima qualidade — minimalistas, profissionais e que convertem.
          </p>
        </Card>
      </section>

      {/* Benefits grid */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-10">Tudo o que você recebe</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {benefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <Card key={i} className="bg-slate-900/60 border-slate-800 hover:border-purple-500/50 p-6 transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">{b.title}</h3>
                <p className="text-slate-400 text-sm">{b.desc}</p>
              </Card>
            );
          })}
        </div>
        <div className="text-center mt-10">
          <Button
            size="lg"
            onClick={scrollToOffer}
            variant="outline"
            className="border-purple-500/50 text-purple-200 hover:bg-purple-500/10 text-lg px-8 py-6 rounded-xl"
          >
            Ver Oferta Especial
          </Button>
        </div>
      </section>

      {/* SPECIAL OFFER CONTAINER — único CTA Kiwify */}
      <section id="oferta" className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <span className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold uppercase tracking-wider px-4 py-1.5 rounded-full">
              🎁 Oferta Especial
            </span>
          </div>
          <Card className="bg-gradient-to-br from-purple-900/60 to-pink-900/40 border-2 border-purple-500/60 p-6 sm:p-10 shadow-2xl shadow-purple-500/30 rounded-3xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-2">MROIMAGEM PRO</h2>
            <p className="text-center text-slate-300 mb-6">Acesso Vitalício • Pagamento Único</p>

            {/* Price */}
            <div className="text-center mb-8">
              <p className="text-slate-400 text-base mb-1">De <span className="line-through">R$ 397</span> por apenas</p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-2xl text-purple-300 font-bold">R$</span>
                <span className="text-7xl font-extrabold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">67</span>
              </div>
              <p className="text-green-400 font-semibold mt-2">Pagamento único • Sem mensalidade</p>
            </div>

            {/* Benefits inside container */}
            <div className="bg-slate-950/40 rounded-2xl p-5 mb-8">
              <p className="text-purple-200 font-bold mb-4 text-center">✅ Tudo isso está incluso:</p>
              <ul className="space-y-3">
                {included.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-slate-100 text-sm sm:text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* The ONE CTA */}
            <Button
              size="lg"
              onClick={() => window.location.href = KIWIFY_URL}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xl font-bold py-7 rounded-xl shadow-lg shadow-green-500/40 animate-pulse"
            >
              <Sparkles className="w-6 h-6 mr-2" />
              Quero Garantir Por R$ 67 Vitalício
            </Button>

            {/* Trust signals */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span>Garantia de 7 dias</span>
              </div>
              <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-600" />
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                <span>Pagamento seguro via Kiwify</span>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default PostsPromptsVend;
