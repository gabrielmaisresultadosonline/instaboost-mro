/** /IG — landing page do produto MRO Instagram. */
import { Link } from "react-router-dom";
import {
  BarChart3,
  Bot,
  Film,
  Kanban,
  MessageCircle,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Image as ImageIcon,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: MessageCircle, title: "Direct", text: "Central de atendimento unificada para todas as conversas." },
  { icon: Zap, title: "Automação", text: "Gatilhos por palavra-chave, comentário e mensagem." },
  { icon: Bot, title: "IA", text: "Respostas com base no seu negócio e tom de voz." },
  { icon: MessageSquare, title: "Comentários", text: "Responda e envie Direct privado automaticamente." },
  { icon: ImageIcon, title: "Posts", text: "Publique e agende conteúdo pela API oficial." },
  { icon: Film, title: "Reels", text: "Acompanhe desempenho e alcance dos seus Reels." },
  { icon: Sparkles, title: "Stories", text: "Gerencie os recursos oficialmente suportados." },
  { icon: BarChart3, title: "Analytics", text: "Insights reais direto da Meta, sem estimativas." },
  { icon: Kanban, title: "CRM", text: "Contatos, tags e funil de vendas do Instagram." },
  { icon: TrendingUp, title: "Crescimento", text: "Evolução de seguidores e score do perfil." },
];

const IgLanding = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-bold uppercase tracking-widest">MRO Instagram</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/IG/login">ENTRAR</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/IG/register">CRIAR CONTA</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-4 pb-16 pt-10 text-center md:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            API oficial da Meta • sem automação de navegador
          </span>
          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight md:text-6xl">
            MRO Instagram
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            Automatize, atenda, publique e analise seu Instagram em um único lugar.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/IG/register">CRIAR CONTA</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link to="/IG/login">ENTRAR</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
              <Link to="/IG/register">CONECTAR INSTAGRAM</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="mt-3 text-sm font-bold uppercase tracking-wide">{title}</h2>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
        MRO Instagram — plataforma construída sobre as APIs oficiais do Instagram e da Meta.
      </footer>
    </div>
  );
};

export default IgLanding;
