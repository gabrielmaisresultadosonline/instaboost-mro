import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2,
  Sparkles,
  Play,
  ShieldCheck,
  Cpu,
  ImageIcon,
  Wand2,
  UserCircle2,
  Palette,
  Target,
  Megaphone,
  Users,
  ChevronDown,
  Lock,
  Zap,
} from "lucide-react";
import PostsComIAGallery from "@/components/PostsComIAGallery";
import TrackedVideo from "@/components/TrackedVideo";

const BASE_PRICE = 67;
const BUMP_PRICE = 10;
const INSTALLMENT_LABEL = "12x de R$ 6,88";
const YT_ID = "1dSrjZPDasg";

const heading = { fontFamily: "'Sora', system-ui, sans-serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };

const capabilities = [
  { icon: Cpu, title: "ChatGPT Mestre", desc: "Comandos avançados para textos, roteiros e legendas que vendem no automático." },
  { icon: ImageIcon, title: "Fotos de Estúdio", desc: "Ensaios fotográficos profissionais gerados por I.A — sem fotógrafo, sem cenário." },
  { icon: Wand2, title: "Criativos Ilimitados", desc: "Peças novas todos os dias para orgânico e anúncios, com qualidade profissional." },
  { icon: UserCircle2, title: "Seu Rosto em I.A", desc: "Coloque a sua imagem em qualquer cenário com realismo impressionante." },
  { icon: Palette, title: "Logomarca com I.A", desc: "Crie identidades visuais completas para o seu negócio em minutos." },
  { icon: Target, title: "Público Certo", desc: "Descubra o público ideal do seu produto usando análise por I.A." },
  { icon: Megaphone, title: "Meta Ads com I.A", desc: "Estruture campanhas no Facebook e Instagram Ads guiadas por I.A." },
  { icon: Sparkles, title: "Melhore o Perfil", desc: "Reposicione seu perfil e seu negócio com estratégias potencializadas por I.A." },
];

const faqs = [
  {
    q: "Preciso ter conhecimento técnico?",
    a: "Não. O curso começa do absoluto zero. Se você sabe usar WhatsApp, consegue dominar as ferramentas de I.A que ensinamos.",
  },
  {
    q: "O acesso é realmente vitalício?",
    a: "Sim. Pagamento único de R$67 (ou 12x de R$ 6,88), sem mensalidade. Você acessa quantas vezes quiser, no seu ritmo, para sempre.",
  },
  {
    q: "Qual a diferença do bônus 'Atualizações Vitalícias'?",
    a: "Ao ativar o orderbump por +R$10, você recebe automaticamente qualquer nova aula, ferramenta ou módulo que adicionarmos ao curso — para sempre.",
  },
  {
    q: "Como recebo o acesso após o pagamento?",
    a: "Assim que o pagamento é confirmado (na hora, via InfiniPay), o acesso é liberado automaticamente e enviado para o seu e-mail.",
  },
  {
    q: "Serve para qualquer nicho de negócio?",
    a: "Sim. As técnicas de I.A funcionam para infoproduto, e-commerce, serviços locais, criador de conteúdo e afiliado.",
  },
];

export default function PostsComIA() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [orderbump, setOrderbump] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [paidState, setPaidState] = useState<null | { name?: string; amount?: number }>(null);
  const [settings, setSettings] = useState<{ hero_video_url?: string; hero_video_poster?: string; fb_pixel_id?: string }>({});

  // load settings + track visit + inject FB pixel
  useEffect(() => {
    let sid = sessionStorage.getItem("pcia_sid");
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem("pcia_sid", sid);
    }
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("postscomia-admin", { body: { action: "get_settings" } });
        const s = data?.settings || {};
        setSettings(s);
        if (s.fb_pixel_id && !(window as any).fbq) {
          // Meta Pixel base code
          (function (f: any, b: any, e: any, v: any) {
            if (f.fbq) return;
            const n: any = (f.fbq = function () {
              n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
            });
            if (!f._fbq) f._fbq = n;
            n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
            const t = b.createElement(e); t.async = true; t.src = v;
            const s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
          })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
          (window as any).fbq("init", s.fb_pixel_id);
          (window as any).fbq("track", "PageView");
        }
        await supabase.functions.invoke("postscomia-admin", {
          body: { action: "track", event_type: "page_visit", session_id: sid },
        });
      } catch {}
    })();

    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "1") {
      const nsu = params.get("nsu") || "";
      (async () => {
        try {
          const { data } = await supabase.functions.invoke("postscomia-admin", {
            body: { action: "check_paid", nsu },
          });
          if (data?.paid) {
            setPaidState({ name: data.order?.name, amount: data.order?.amount });
            await supabase.functions.invoke("postscomia-admin", { body: { action: "grant_access", nsu } });
            // Fire FB Pixel Purchase
            const fbq = (window as any).fbq;
            if (fbq) fbq("track", "Purchase", { value: Number(data.order?.amount || 67), currency: "BRL", content_name: "Posts com I.A" });
          } else setPaidState({});
        } catch {
          setPaidState({});
        }
      })();
    }
  }, []);



  const total = BASE_PRICE + (orderbump ? BUMP_PRICE : 0);

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !email.includes("@")) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("postscomia-checkout", {
        body: { name, email, whatsapp, orderbump },
      });
      if (error || !data?.success) throw new Error(data?.error || "Erro ao gerar pagamento");
      window.location.href = data.payment_link;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao processar");
      setLoading(false);
    }
  }

  function scrollToCheckout() {
    document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth" });
  }

  if (paidState) {
    return (
      <div className="min-h-screen bg-black text-[#f5f5f5] flex items-center justify-center px-4" style={body}>
        <div className="max-w-lg w-full text-center border border-[#eab308]/30 bg-[#0a0a0a] p-10 rounded-3xl shadow-[0_0_80px_rgba(234,179,8,0.15)]">
          <CheckCircle2 className="w-16 h-16 text-[#eab308] mx-auto mb-4" />
          <h1 className="text-3xl font-extrabold mb-2" style={heading}>
            Compra Confirmada!
          </h1>
          <p className="text-[#a1a1aa] mb-6">
            Obrigado{paidState.name ? `, ${paidState.name}` : ""}! Os acessos foram enviados para o seu e-mail.
          </p>
          <p className="text-xs text-[#a1a1aa]/60 uppercase tracking-widest mb-6">Confira também SPAM / Promoções</p>
          <a
            href="/postscomia/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#eab308] hover:bg-[#fde047] text-black font-black tracking-wide text-sm shadow-[0_0_40px_rgba(234,179,8,0.3)]"
          >
            <Lock className="w-4 h-4" /> ACESSAR ÁREA DE MEMBROS
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black text-[#f5f5f5] selection:bg-[#eab308] selection:text-black" style={body}>
      {/* TOP NAV — Entrar */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-black/70 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#eab308] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            <span className="text-[11px] font-black tracking-[0.2em] uppercase text-[#eab308]" style={heading}>
              Posts com I.A
            </span>
          </div>
          <a
            href="/postscomia/login"
            className="px-4 py-2 rounded-lg border border-[#eab308]/40 bg-[#eab308]/5 hover:bg-[#eab308] hover:text-black text-[#eab308] text-xs font-black tracking-wide transition flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            ENTRAR
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-16 md:pt-20 pb-16 px-6 overflow-hidden">

        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#f5f5f5 1px, transparent 1px), linear-gradient(90deg, #f5f5f5 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[400px] bg-[#eab308] opacity-[0.08] blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex justify-center mb-8">
            <span className="px-4 py-1.5 rounded-full border border-[#eab308]/30 bg-[#eab308]/5 text-[#eab308] text-[11px] font-bold tracking-[0.2em] uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#eab308] animate-pulse" />
              A Era da Inteligência Artificial
            </span>
          </div>

          <h1
            className="text-center text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6"
            style={heading}
          >
            Crie <span className="text-[#eab308]">posts de qualidade profissional</span> GRÁTIS com I.A
          </h1>

          <p className="text-center text-[#a1a1aa] text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Domine o <strong className="text-white">ChatGPT</strong> e crie criativos sem limites, fotos de estúdio,
            logomarcas, campanhas no Meta Ads e muito mais — tudo com I.A.
          </p>

          {/* Video */}
          <div className="relative max-w-3xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#eab308] via-transparent to-[#eab308]/40 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000" />
            <div className="relative aspect-video rounded-xl bg-[#111] border border-white/10 overflow-hidden">
              {settings.hero_video_url ? (
                <TrackedVideo
                  src={settings.hero_video_url}
                  poster={settings.hero_video_poster || undefined}
                  videoId="hero"
                  videoTitle="Vídeo Principal"
                />
              ) : (
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${YT_ID}?rel=0`}
                  title="Posts com I.A"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
            <div className="mt-3 flex justify-between text-[10px] text-white/40 font-mono tracking-tighter px-1">
              <span>SYSTEM_ID: {YT_ID}</span>
              <span className="animate-pulse">AI_STREAMING_ACTIVE...</span>
            </div>
          </div>

          <div className="flex justify-center mt-10">
            <button
              onClick={scrollToCheckout}
              className="px-8 py-4 rounded-xl bg-[#eab308] text-black font-extrabold text-base uppercase tracking-wider shadow-[0_15px_30px_rgba(234,179,8,0.3)] hover:translate-y-[-2px] hover:shadow-[0_20px_40px_rgba(234,179,8,0.4)] transition-all"
              style={heading}
            >
              Quero Acesso Vitalício — R${BASE_PRICE}
            </button>
          </div>
        </div>
      </section>

      {/* METRICS STRIP */}
      <section className="border-y border-white/5 py-6 px-6 bg-[#050505]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { k: "+3.500", v: "Alunos ativos" },
            { k: "8h+", v: "de conteúdo prático" },
            { k: "12", v: "módulos completos" },
            { k: "Vitalício", v: "sem mensalidade" },
          ].map((m, i) => (
            <div key={i}>
              <div className="text-2xl md:text-3xl font-extrabold text-[#eab308]" style={heading}>
                {m.k}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-[#a1a1aa] mt-1">{m.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 md:py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-[10px] font-bold text-[#eab308] uppercase tracking-[0.3em] mb-3">
              Módulos do Curso
            </div>
            <h2 className="text-3xl md:text-4xl font-bold" style={heading}>
              A tecnologia que você terá em <span className="text-[#eab308]">mãos</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {capabilities.map((c, i) => {
              const Icon = c.icon;
              return (
                <div
                  key={i}
                  className="p-6 rounded-2xl border border-white/5 bg-white/[0.03] hover:border-[#eab308]/40 hover:bg-white/[0.05] transition-all duration-300 group"
                >
                  <div className="w-10 h-10 mb-4 rounded-lg bg-[#eab308]/10 flex items-center justify-center text-[#eab308] group-hover:bg-[#eab308]/20 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg mb-2" style={heading}>
                    {c.title}
                  </h3>
                  <p className="text-sm text-[#a1a1aa] leading-relaxed">{c.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <PostsComIAGallery />

      {/* HOW IT WORKS */}
      <section className="py-20 px-6 border-y border-white/5 bg-[#050505]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-[10px] font-bold text-[#eab308] uppercase tracking-[0.3em] mb-3">
              Como Funciona
            </div>
            <h2 className="text-3xl md:text-4xl font-bold" style={heading}>
              De iniciante a criador de I.A em <span className="text-[#eab308]">3 passos</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: "01", t: "Acesso Imediato", d: "Após o pagamento, receba seu login por e-mail e acesse toda a plataforma." },
              { n: "02", t: "Assista e Aplique", d: "Aulas curtas e práticas com prompts prontos para copiar, colar e usar." },
              { n: "03", t: "Resultado Real", d: "Publique conteúdos profissionais, atraia clientes e monetize com I.A." },
            ].map((s, i) => (
              <div key={i} className="relative p-6 rounded-2xl border border-white/5 bg-black">
                <div className="text-5xl font-extrabold text-[#eab308]/20 mb-2" style={heading}>
                  {s.n}
                </div>
                <h3 className="font-bold text-lg mb-2" style={heading}>
                  {s.t}
                </h3>
                <p className="text-sm text-[#a1a1aa] leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <button
              onClick={scrollToCheckout}
              className="group px-8 py-4 rounded-full bg-[#eab308] hover:bg-[#facc15] text-black font-black text-sm md:text-base uppercase tracking-wider shadow-[0_15px_40px_-10px_rgba(234,179,8,0.6)] hover:scale-[1.03] transition-all inline-flex items-center gap-2"
              style={heading}
            >
              <Sparkles className="w-4 h-4" />
              Começar agora por R${BASE_PRICE}
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
          </div>
        </div>
      </section>


      {/* BONUSES */}
      <section className="py-16 md:py-20 px-6 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold whitespace-nowrap" style={heading}>
              Bônus <span className="text-[#eab308]">Especiais</span>
            </h2>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="space-y-4">
            {[
              {
                tag: "Desbloqueio Imediato",
                t: "Renda Extra com MRO",
                d: "Curso completo — aprenda como ter uma renda extra usando as ferramentas da MRO.",
                v: "R$ 197,00",
                icon: Users,
              },
              {
                tag: "Estratégia Orgânica",
                t: "Fature sem investir em anúncios",
                d: "Método completo para vender todos os dias sem gastar R$1 em tráfego pago.",
                v: "R$ 297,00",
                icon: Zap,
              },
            ].map((b, i) => {
              const Icon = b.icon;
              return (
                <div
                  key={i}
                  className="relative p-[1px] rounded-2xl bg-gradient-to-r from-white/10 via-[#eab308]/20 to-transparent"
                >
                  <div className="bg-black p-6 rounded-[15px] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-[#eab308]/10 flex items-center justify-center text-[#eab308] flex-shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[#eab308] font-bold text-[10px] mb-1 uppercase tracking-widest">
                          {b.tag}
                        </div>
                        <h4 className="text-lg md:text-xl font-bold" style={heading}>
                          {b.t}
                        </h4>
                        <p className="text-[#a1a1aa] text-sm mt-1">{b.d}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="px-3 py-1.5 bg-white/5 rounded-lg text-white/30 line-through text-xs font-mono">
                        {b.v}
                      </div>
                      <div className="text-[#eab308] text-xs font-bold mt-1 uppercase tracking-widest">INCLUSO</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA banner */}
          <div className="mt-10 relative overflow-hidden rounded-2xl border border-[#eab308]/40 bg-gradient-to-r from-[#eab308]/10 via-[#eab308]/5 to-transparent p-6 md:p-7 flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <div className="flex-1 text-center md:text-left">
              <div className="text-[10px] font-black text-[#eab308] uppercase tracking-[0.25em] mb-1">Vaga garantida</div>
              <div className="text-lg md:text-xl font-bold" style={heading}>
                Destrave tudo isso por <span className="text-[#eab308]">R${BASE_PRICE} vitalício</span>
              </div>
            </div>
            <button
              onClick={scrollToCheckout}
              className="px-6 py-3 rounded-xl bg-[#eab308] hover:bg-[#facc15] text-black font-black text-sm uppercase tracking-wider shadow-[0_10px_30px_-10px_rgba(234,179,8,0.7)] hover:scale-[1.02] transition-all"
              style={heading}
            >
              Garantir meu acesso →
            </button>
          </div>
        </div>
      </section>
      <section id="checkout" className="py-20 md:py-24 px-6 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(circle at 50% 30%, rgba(234,179,8,0.08), transparent 60%)" }}
        />
        <div className="max-w-xl mx-auto relative">
          <div className="p-8 md:p-10 rounded-[2.5rem] bg-[#111] border border-white/10 shadow-2xl overflow-hidden text-center relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Sparkles className="w-32 h-32 text-[#eab308]" />
            </div>

            <div className="text-[10px] font-bold text-[#eab308] uppercase tracking-[0.3em] mb-2">
              Oferta por tempo limitado
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2" style={heading}>
              Acesso Vitalício
            </h2>
            <p className="text-[#a1a1aa] text-sm mb-8">Pagamento único. Sem mensalidade.</p>

            <div className="mb-8 flex flex-col items-center">
              <span className="text-xs text-[#a1a1aa] mb-1 line-through">De R$ 497</span>
              <div className="flex items-start">
                <span className="text-xl font-bold text-[#eab308] mt-3" style={heading}>
                  R$
                </span>
                <span className="text-7xl md:text-8xl font-extrabold text-[#eab308] tracking-tighter leading-none" style={heading}>
                  {total}
                </span>
              </div>
              <span className="text-[10px] text-[#a1a1aa] mt-2 uppercase tracking-widest">
                {orderbump ? "com atualizações vitalícias" : "à vista"}
              </span>
              <span className="mt-2 text-xs text-[#eab308] font-mono">
                ou {INSTALLMENT_LABEL} no cartão
              </span>
            </div>

            <form onSubmit={handleBuy} className="space-y-3 text-left">
              <input
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-black border border-white/10 focus:border-[#eab308]/60 rounded-xl px-4 py-3 text-white outline-none transition-colors"
              />
              <input
                type="email"
                placeholder="Seu melhor e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black border border-white/10 focus:border-[#eab308]/60 rounded-xl px-4 py-3 text-white outline-none transition-colors"
              />
              <input
                type="tel"
                placeholder="WhatsApp (opcional)"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full bg-black border border-white/10 focus:border-[#eab308]/60 rounded-xl px-4 py-3 text-white outline-none transition-colors"
              />

              {/* Orderbump */}
              <label
                className={`flex items-start gap-4 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                  orderbump
                    ? "border-[#eab308] bg-[#eab308]/10"
                    : "border-[#eab308]/40 bg-[#eab308]/5 hover:bg-[#eab308]/10"
                }`}
              >
                <input
                  type="checkbox"
                  checked={orderbump}
                  onChange={(e) => setOrderbump(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-[#eab308] flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-bold leading-tight text-white">
                    Sim! Adicionar Atualizações Vitalícias (+R${BUMP_PRICE})
                  </p>
                  <p className="text-[11px] text-[#a1a1aa] mt-1 leading-relaxed">
                    Receba todas as novas ferramentas de I.A que lançarmos no curso — para sempre.
                  </p>
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 rounded-2xl bg-[#eab308] text-black font-extrabold text-lg md:text-xl uppercase tracking-wider shadow-[0_15px_30px_rgba(234,179,8,0.3)] hover:translate-y-[-2px] hover:shadow-[0_20px_40px_rgba(234,179,8,0.4)] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
                style={heading}
              >
                {loading ? "Gerando pagamento..." : `Garantir minha vaga — R$${total}`}
              </button>

              <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-[10px] text-[#a1a1aa] font-mono uppercase tracking-widest">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-[#eab308]" /> Pagamento seguro
                </span>
                <span className="w-px h-3 bg-white/10" />
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-[#eab308]" /> InfiniPay
                </span>
                <span className="w-px h-3 bg-white/10" />
                <span>Acesso imediato</span>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-[10px] font-bold text-[#eab308] uppercase tracking-[0.3em] mb-3">FAQ</div>
            <h2 className="text-3xl md:text-4xl font-bold" style={heading}>
              Perguntas <span className="text-[#eab308]">frequentes</span>
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={i}
                  className={`rounded-2xl border transition-colors ${
                    open ? "border-[#eab308]/40 bg-[#eab308]/[0.03]" : "border-white/5 bg-white/[0.02]"
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between text-left px-5 py-4"
                  >
                    <span className="font-bold text-sm md:text-base" style={heading}>
                      {f.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#eab308] transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open && <div className="px-5 pb-4 text-sm text-[#a1a1aa] leading-relaxed">{f.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-14 border-t border-white/5 bg-[#050505]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="font-bold text-[#eab308] text-xl mb-6 tracking-tight" style={heading}>
            Posts com I.A
          </div>
          <p className="text-[10px] text-[#a1a1aa] leading-relaxed max-w-xl mx-auto uppercase tracking-widest opacity-60">
            Este site não faz parte do site do Facebook ou do Facebook Inc. Além disso, este site NÃO é endossado
            pelo Facebook de nenhuma maneira. FACEBOOK é uma marca comercial da FACEBOOK, Inc.
          </p>
          <div className="mt-6 text-[10px] text-white/30 uppercase tracking-widest">
            © MRO — Mais Resultados Online. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
