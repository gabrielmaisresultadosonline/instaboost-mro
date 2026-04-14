import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackFacebookEvent } from "@/lib/facebookTracking";

const RendaExtraAula = () => {
  const [showForm, setShowForm] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [form, setForm] = useState({ nome_completo: "", email: "", whatsapp: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [countdown, setCountdown] = useState(20 * 60); // 20 minutes in seconds

  useEffect(() => {
    // Fetch WhatsApp number from settings
    supabase.from("whatsapp_page_settings").select("whatsapp_number").limit(1).single().then(({ data }) => {
      if (data) setWhatsappNumber(data.whatsapp_number);
    });
    // Track page view
    supabase.functions.invoke("renda-extra-aula-register", {
      body: { action: "trackPageView", source_url: window.location.href, user_agent: navigator.userAgent }
    });
    trackFacebookEvent("PageView", { content_name: "Renda Extra Aula" });
  }, []);

  // Countdown timer for WhatsApp button (starts when video is shown)
  useEffect(() => {
    if (!showVideo) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowWhatsApp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showVideo]);

  const validateWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length >= 10 && cleaned.length <= 13;
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.nome_completo.trim() || form.nome_completo.trim().length < 3) {
      newErrors.nome_completo = "Nome completo é obrigatório (mínimo 3 caracteres)";
    }
    if (!validateEmail(form.email)) {
      newErrors.email = "Insira um email válido";
    }
    if (!validateWhatsApp(form.whatsapp)) {
      newErrors.whatsapp = "Insira um número de WhatsApp válido (com DDD)";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("renda-extra-aula-register", {
        body: { action: "register", ...form }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao cadastrar");

      setRegisteredEmail(form.email);
      setShowVideo(true);
      setShowForm(false);

      // Track Lead on Facebook
      trackFacebookEvent("Lead", {
        content_name: "Renda Extra Aula - Cadastro",
        content_category: "Lead",
        email: form.email
      });

      toast({ title: "✅ Cadastro realizado!", description: "A aula já está disponível abaixo!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao cadastrar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-500/20 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 pt-12 pb-8 text-center">
          <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-extrabold text-sm px-6 py-2 rounded-full mb-6 animate-pulse">
            🎯 AULA GRÁTIS
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">
            Faça no mínimo{" "}
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              R$ 5.000/mês
            </span>{" "}
            com a Ferramenta MRO!
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Descubra como pessoas comuns estão faturando alto prestando serviços de Instagram para empresas usando nossa ferramenta exclusiva.
          </p>

          {!showForm && !showVideo && (
            <button
              onClick={() => { setShowForm(true); trackFacebookEvent("ViewContent", { content_name: "Clicou Acessar Aula" }); }}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-extrabold text-xl px-10 py-5 rounded-2xl shadow-2xl shadow-yellow-500/30 transform hover:scale-105 transition-all duration-300"
            >
              🎬 ACESSAR AULA GRÁTIS
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && !showVideo && (
        <div className="max-w-md mx-auto px-4 pb-12 animate-fade-in">
          <div className="bg-gray-800/80 backdrop-blur-md border border-gray-700 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-center mb-1">📋 Preencha para liberar a aula</h2>
            <p className="text-gray-400 text-center text-sm mb-6">Dados reais são obrigatórios</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  value={form.nome_completo}
                  onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
                  maxLength={100}
                />
                {errors.nome_completo && <p className="text-red-400 text-xs mt-1">{errors.nome_completo}</p>}
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Email</label>
                <input
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
                  maxLength={255}
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">WhatsApp (com DDD)</label>
                <input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
                  maxLength={20}
                />
                {errors.whatsapp && <p className="text-red-400 text-xs mt-1">{errors.whatsapp}</p>}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-lg py-4 rounded-xl shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? "Liberando..." : "🔓 LIBERAR AULA AGORA"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Video */}
      {showVideo && (
        <div className="max-w-3xl mx-auto px-4 pb-16 animate-fade-in">
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 rounded-2xl p-4 mb-6 text-center">
            <p className="text-green-400 font-bold text-lg">✅ Aula liberada com sucesso!</p>
            <p className="text-gray-300 text-sm">
              Pode assistir abaixo, ou acesse pelo seu email: <strong className="text-yellow-400">{registeredEmail}</strong>
            </p>
          </div>
          <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
            <iframe
              src="https://www.youtube.com/embed/-0CHlqHVe0g?autoplay=1"
              title="Aula Grátis MRO"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>

          {/* WhatsApp CTA - appears after 20 min */}
          {showWhatsApp && whatsappNumber && (
            <div className="mt-8 text-center animate-fade-in">
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 rounded-2xl p-6">
                <p className="text-white font-bold text-lg mb-4">🔥 Gostou da aula? Garanta seu desconto exclusivo!</p>
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent("Acabei de assistir a aula grátis fiquei interessado no desconto da ferramenta MRO para começar a trabalhar.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackFacebookEvent("Lead", { content_name: "WhatsApp CTA Aula" })}
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-extrabold text-xl px-10 py-5 rounded-2xl shadow-2xl shadow-green-500/30 transform hover:scale-105 transition-all"
                >
                  📲 FALAR NO WHATSAPP
                </a>
              </div>
            </div>
          )}

          {!showWhatsApp && (
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                ⏳ Oferta especial disponível em {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")} minutos
              </p>
            </div>
          )}
        </div>
      )}

      {/* Benefits */}
      {!showVideo && (
        <div className="max-w-4xl mx-auto px-4 pb-16">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "💰", title: "Renda Extra Real", desc: "Aprenda a faturar prestando serviços para empresas locais" },
              { icon: "🤖", title: "Ferramenta Exclusiva", desc: "Use a MRO para automatizar e escalar seus resultados" },
              { icon: "📈", title: "Método Comprovado", desc: "Alunos reais faturando mais de R$5.000 por mês" },
            ].map((item, i) => (
              <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center hover:border-yellow-500/50 transition-colors">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RendaExtraAula;
