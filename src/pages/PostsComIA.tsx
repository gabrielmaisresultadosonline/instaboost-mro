import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Sparkles, Zap, Play, ShieldCheck, Award, ArrowRight, Gift } from "lucide-react";

const BASE_PRICE = 97;
const BUMP_PRICE = 10;
const YT_ID = "1dSrjZPDasg";

const features = [
  "Domine a I.A ChatGPT do zero ao avançado",
  "Crie criativos ilimitados de alta qualidade",
  "Fotos de estúdio profissionais com I.A",
  "Crie sua logomarca em minutos",
  "Criativos com o seu próprio rosto",
  "Melhore o seu perfil e o seu negócio com I.A",
  "Campanhas no Meta Ads geradas por I.A",
  "Encontre o seu público perfeito com I.A",
];

const bonuses = [
  { title: "BÔNUS #1", desc: "Renda Extra com a MRO — curso completo" },
  { title: "BÔNUS #2", desc: "Fature mais SEM investir em anúncios" },
];

export default function PostsComIA() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [orderbump, setOrderbump] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [paidState, setPaidState] = useState<null | { name?: string }>(null);

  // Detect ?paid=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "1") {
      const nsu = params.get("nsu") || "";
      (async () => {
        try {
          const { data } = await supabase.functions.invoke("postscomia-admin", {
            body: { action: "check_paid", nsu },
          });
          if (data?.paid) setPaidState({ name: data.order?.name });
          else setPaidState({});
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

  if (paidState) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center border border-yellow-400/30 bg-gradient-to-b from-neutral-900 to-black p-10 rounded-2xl shadow-[0_0_60px_rgba(250,204,21,0.15)]">
          <CheckCircle2 className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-3xl font-black mb-2">Compra Confirmada!</h1>
          <p className="text-neutral-300 mb-6">
            Obrigado{paidState.name ? `, ${paidState.name}` : ""}! Enviamos os acessos para o seu e-mail.
          </p>
          <p className="text-sm text-neutral-500">Confira também a caixa de SPAM/Promoções.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* animated backdrop */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 -left-40 w-[500px] h-[500px] bg-yellow-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-0 -right-40 w-[500px] h-[500px] bg-yellow-400/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02),transparent_60%)]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10">
        {/* Top badge */}
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-xs font-bold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" /> Curso Oficial MRO • Acesso Vitalício
          </span>
        </div>

        {/* Hero */}
        <div className="text-center mb-10 space-y-4">
          <h1 className="text-4xl md:text-6xl font-black leading-tight">
            Crie seus posts de qualidade{" "}
            <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent">
              profissional GRÁTIS
            </span>{" "}
            com I.A
          </h1>
          <p className="text-neutral-400 text-lg md:text-xl max-w-3xl mx-auto">
            Domine o <strong className="text-white">ChatGPT</strong> e crie criativos SEM LIMITES,
            fotos de estúdio, logomarcas, campanhas no Meta Ads e muito mais.
          </p>
        </div>

        {/* Video */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="relative rounded-2xl overflow-hidden border border-yellow-400/20 shadow-[0_0_80px_rgba(250,204,21,0.15)]">
            <div className="aspect-video bg-black">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${YT_ID}?rel=0`}
                title="Posts com IA"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
          <p className="text-center text-neutral-500 text-sm mt-3 flex items-center justify-center gap-2">
            <Play className="w-4 h-4 text-yellow-400" /> Assista o vídeo antes de comprar
          </p>
        </div>

        {/* CTA hero button */}
        {!showForm && (
          <div className="flex justify-center mb-16">
            <button
              onClick={() => {
                setShowForm(true);
                setTimeout(() => document.getElementById("compra")?.scrollIntoView({ behavior: "smooth" }), 100);
              }}
              className="group relative px-10 py-5 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-black text-lg tracking-wide shadow-[0_0_40px_rgba(250,204,21,0.4)] hover:shadow-[0_0_60px_rgba(250,204,21,0.6)] transition-all hover:scale-105"
            >
              <span className="flex items-center gap-3">
                QUERO ACESSO AGORA — R${BASE_PRICE}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>
        )}

        {/* Features grid */}
        <div className="grid md:grid-cols-2 gap-3 max-w-4xl mx-auto mb-16">
          {features.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-4 rounded-xl bg-neutral-900/50 border border-neutral-800 hover:border-yellow-400/40 transition-colors"
            >
              <CheckCircle2 className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <span className="text-neutral-200">{f}</span>
            </div>
          ))}
        </div>

        {/* Bonuses */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-center text-2xl md:text-3xl font-black mb-6 flex items-center justify-center gap-2">
            <Gift className="w-7 h-7 text-yellow-400" /> BÔNUS EXCLUSIVOS
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {bonuses.map((b, i) => (
              <div
                key={i}
                className="relative p-6 rounded-2xl bg-gradient-to-br from-yellow-400/10 to-transparent border border-yellow-400/30"
              >
                <div className="text-xs font-black text-yellow-400 tracking-widest mb-2">{b.title}</div>
                <div className="text-white font-bold text-lg">{b.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Purchase form */}
        <div id="compra" className="max-w-2xl mx-auto mb-16">
          <div className="bg-gradient-to-b from-neutral-900 to-black rounded-2xl border border-yellow-400/30 p-8 shadow-[0_0_60px_rgba(250,204,21,0.15)]">
            <div className="text-center mb-6">
              <div className="inline-block px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-300 text-xs font-bold tracking-wider mb-3">
                OFERTA POR TEMPO LIMITADO
              </div>
              <div className="text-neutral-400 text-sm">De R$497 por apenas</div>
              <div className="text-6xl font-black text-white mt-1">
                R$<span className="text-yellow-400">{total}</span>
              </div>
              <div className="text-neutral-500 text-sm mt-1">Pagamento único • Acesso vitalício</div>
            </div>

            <form onSubmit={handleBuy} className="space-y-3">
              <input
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-black border border-neutral-800 focus:border-yellow-400/60 rounded-lg px-4 py-3 text-white outline-none transition-colors"
              />
              <input
                type="email"
                placeholder="Seu melhor e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black border border-neutral-800 focus:border-yellow-400/60 rounded-lg px-4 py-3 text-white outline-none transition-colors"
              />
              <input
                type="tel"
                placeholder="WhatsApp (opcional)"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full bg-black border border-neutral-800 focus:border-yellow-400/60 rounded-lg px-4 py-3 text-white outline-none transition-colors"
              />

              {/* Orderbump */}
              <label
                className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer border-2 transition-all ${
                  orderbump
                    ? "border-yellow-400 bg-yellow-400/10"
                    : "border-neutral-800 bg-neutral-900/50 hover:border-yellow-400/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={orderbump}
                  onChange={(e) => setOrderbump(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-yellow-400"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="font-black text-white">SIM! Quero atualizações vitalícias</span>
                  </div>
                  <div className="text-sm text-neutral-400">
                    Adicione +R${BUMP_PRICE} e receba TODAS as atualizações futuras do curso para sempre.
                  </div>
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-black text-lg tracking-wide shadow-[0_0_40px_rgba(250,204,21,0.4)] hover:shadow-[0_0_60px_rgba(250,204,21,0.6)] transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Gerando pagamento..." : `PAGAR R$${total} E LIBERAR ACESSO`}
              </button>

              <div className="flex items-center justify-center gap-4 pt-3 text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-yellow-400" /> Pagamento Seguro
                </span>
                <span className="flex items-center gap-1">
                  <Award className="w-4 h-4 text-yellow-400" /> Acesso Vitalício
                </span>
              </div>
            </form>
          </div>
        </div>

        <footer className="text-center text-neutral-600 text-xs py-8 border-t border-neutral-900">
          © MRO — Mais Resultados Online. Todos os direitos reservados.
        </footer>
      </div>
    </div>
  );
}
