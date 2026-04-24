import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logoMro from "@/assets/logo-mro-white.png";
import {
  CheckCircle2,
  Shield,
  ArrowRight,
  Loader2,
  X,
  Mail,
  User,
  Phone,
  CreditCard,
  Sparkles,
  Zap,
  Target,
  Clock,
} from "lucide-react";

const RendaExt = () => {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paymentCreated, setPaymentCreated] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [nsuOrder, setNsuOrder] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [formData, setFormData] = useState({
    nomeCompleto: "",
    email: "",
    whatsapp: "",
  });

  useEffect(() => {
    supabase.from("rendaext_analytics").insert({
      event_type: "page_view",
      source_url: window.location.href,
      user_agent: navigator.userAgent,
    }).then(() => {});
  }, []);

  // Auto-verify if returning from InfiniPay redirect (?paid=1&nsu=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nsu = params.get("nsu");
    if (params.get("paid") === "1" && nsu) {
      setNsuOrder(nsu);
      setPaymentCreated(true);
      void verifyPayment(nsu, true);
    }
  }, []);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nomeCompleto.trim()) {
      toast.error("Informe seu nome completo");
      return;
    }
    if (!isValidEmail(formData.email)) {
      toast.error("Email inválido");
      return;
    }
    if (formData.whatsapp.replace(/\D/g, "").length < 10) {
      toast.error("WhatsApp inválido");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("rendaext-checkout", {
        body: {
          nome_completo: formData.nomeCompleto.trim(),
          email: formData.email.toLowerCase().trim(),
          whatsapp: formData.whatsapp.replace(/\D/g, "").trim(),
        },
      });
      if (error || !data?.success) {
        toast.error(data?.error || "Erro ao gerar pagamento");
        return;
      }
      setNsuOrder(data.nsu_order);
      setPaymentLink(data.payment_link);
      setPaymentCreated(true);
      // Open payment in new tab
      window.open(data.payment_link, "_blank");
      toast.success("Link de pagamento gerado! Após pagar, clique em 'Já paguei'.");
    } catch (err) {
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (nsu?: string, silent = false) => {
    const orderNsu = nsu || nsuOrder;
    if (!orderNsu) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("rendaext-verify-payment", {
        body: { nsu_order: orderNsu },
      });
      if (error || !data?.success) {
        if (!silent) toast.error("Erro ao verificar pagamento");
        return;
      }
      if (data.paid) {
        setPaymentConfirmed(true);
        toast.success("Pagamento confirmado! Confira seu email.");
      } else if (!silent) {
        toast.info("Pagamento ainda não confirmado. Aguarde alguns instantes e tente novamente.");
      }
    } catch (_e) {
      if (!silent) toast.error("Erro ao verificar");
    } finally {
      setVerifying(false);
    }
  };

  if (paymentConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] via-[#0d1325] to-[#0a0f1a] flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center space-y-6 animate-fade-in">
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-8 rounded-3xl border border-green-500/20 backdrop-blur-xl">
            <CheckCircle2 className="w-20 h-20 text-green-400 mx-auto mb-6" />
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Pagamento Confirmado!
            </h1>
            <p className="text-gray-300 text-lg mb-2">
              Enviamos o <strong>passo a passo</strong> completo no seu email:
            </p>
            <p className="text-yellow-400 font-bold text-lg mb-6 break-all">{formData.email}</p>
            <p className="text-gray-400 text-sm">
              Verifique também sua caixa de SPAM/Promoções. Aplique HOJE mesmo!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] via-[#0d1325] to-[#0a0f1a] text-white">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 py-10 md:py-16">
        <div className="flex justify-center mb-8">
          <img src={logoMro} alt="MRO" className="h-12 md:h-16" />
        </div>

        <div className="text-center space-y-6 mb-12">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 rounded-full">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-semibold">OFERTA ESPECIAL</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            Libere a aula completa de como fazer isso com a{" "}
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              nova onda do mercado
            </span>
          </h1>

          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto">
            Por apenas <span className="text-yellow-400 font-bold text-2xl">R$ 19,90</span> você libera o acesso imediato à aula e ao passo a passo completo.
          </p>

          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
              <Zap className="w-4 h-4 text-yellow-400" /> Acesso imediato
            </span>
            <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
              <Mail className="w-4 h-4 text-blue-400" /> Enviado por email
            </span>
            <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
              <Shield className="w-4 h-4 text-green-400" /> Pagamento seguro
            </span>
          </div>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Target, title: "Como prospectar empresas", desc: "Estratégias prontas para fechar contratos" },
            { icon: Zap, title: "Acesso à Aula", desc: "Passo a passo completo em vídeo" },
            { icon: Clock, title: "Aplique HOJE mesmo", desc: "Resultados rápidos e duradouros" },
          ].map((b, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
              <b.icon className="w-8 h-8 text-yellow-400 mb-3" />
              <h3 className="font-bold text-white mb-1">{b.title}</h3>
              <p className="text-gray-400 text-sm">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Card */}
        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-3xl p-8 md:p-10 text-center">
          <div className="text-gray-400 text-sm mb-2">Investimento único de</div>
          <div className="text-5xl md:text-6xl font-black text-white mb-2">
            R$ <span className="text-yellow-400">19,90</span>
          </div>
          <div className="text-gray-400 text-sm mb-6">Pagamento via Pix ou Cartão</div>

          <Button
            onClick={() => setShowForm(true)}
            className="w-full md:w-auto bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold text-lg px-10 py-6 rounded-2xl shadow-2xl shadow-yellow-500/20 hover:scale-105 transition-transform"
          >
            LIBERAR AULA COMPLETA
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <p className="text-gray-400 text-xs mt-4">
            ⚡ Após o pagamento você recebe acesso imediato à aula no seu email
          </p>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-gradient-to-br from-[#151a2e] to-[#0d1020] rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl animate-fade-in">
            <button
              onClick={() => {
                setShowForm(false);
                setPaymentCreated(false);
                setNsuOrder("");
                setPaymentLink("");
              }}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 border border-white/10"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {!paymentCreated ? (
              <form onSubmit={handleCheckout} className="space-y-4">
                <div className="text-center mb-2">
                  <div className="mx-auto w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mb-3">
                    <CreditCard className="w-7 h-7 text-black" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Cadastro</h2>
                  <p className="text-gray-400 text-sm">Preencha para gerar seu pagamento de R$ 19,90</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300 flex items-center gap-2">
                    <User className="w-4 h-4" /> Nome completo
                  </label>
                  <Input
                    value={formData.nomeCompleto}
                    onChange={(e) => setFormData({ ...formData, nomeCompleto: e.target.value })}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 py-5"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 py-5"
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300 flex items-center gap-2">
                    <Phone className="w-4 h-4" /> WhatsApp
                  </label>
                  <Input
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 py-5"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-400">Valor único</div>
                  <div className="text-3xl font-black text-yellow-400">R$ 19,90</div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold py-6 rounded-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando link...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />
                      Pagar R$ 19,90
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Após pagar você receberá o acesso à aula no seu email automaticamente.
                </p>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="mx-auto w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Pagamento gerado!</h2>
                  <p className="text-gray-400 text-sm mt-1">Conclua o pagamento na nova aba</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-400">Pedido</div>
                  <div className="font-mono text-yellow-400 text-sm break-all">{nsuOrder}</div>
                </div>

                {paymentLink && (
                  <Button
                    onClick={() => window.open(paymentLink, "_blank")}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold py-5 rounded-xl"
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    Abrir pagamento novamente
                  </Button>
                )}

                <Button
                  onClick={() => verifyPayment()}
                  disabled={verifying}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10 py-5 rounded-xl"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Já paguei – Verificar
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Após o pagamento, o acesso à aula será enviado automaticamente para seu email.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RendaExt;
