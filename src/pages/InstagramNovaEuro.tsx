import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CreditCard, Mail, CheckCircle, User, Crown, Sparkles, Phone } from "lucide-react";

// Valores em Euro - mesmos valores que em Reais, só que em Euro
const PLANS = {
  annual: { name: "Anual", price: 397, days: 365, description: "Acesso por 1 ano" },
  lifetime: { name: "Vitalício", price: 797, days: 999999, description: "Acesso para sempre" },
};

export default function InstagramNovaEuro() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"annual" | "lifetime">("annual");
  const [loading, setLoading] = useState(false);
  const [paymentCreated, setPaymentCreated] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [orderId, setOrderId] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Check for success return from Stripe
  useEffect(() => {
    const success = searchParams.get("success");
    const returnSessionId = searchParams.get("session_id");
    
    if (success === "true" && returnSessionId) {
      setLoading(true);
      verifyPayment(returnSessionId);
    }
  }, [searchParams]);

  const verifyPayment = async (sid: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-euro-payment", {
        body: { session_id: sid }
      });

      if (error) {
        toast.error("Erro ao verificar pagamento");
        setLoading(false);
        return;
      }

      if (data.status === "completed") {
        toast.success("Pagamento confirmado e acesso liberado!");
        navigate("/mroobrigado?euro=true&username=" + (data.order?.username || ""));
      } else if (data.status === "paid") {
        toast.success("Pagamento confirmado! Acesso será liberado em breve.");
      } else {
        toast.info("Pagamento ainda não confirmado. Aguarde alguns instantes.");
      }
    } catch (err) {
      console.error("Error verifying payment:", err);
      toast.error("Erro ao verificar pagamento");
    } finally {
      setLoading(false);
    }
  };

  // Validate username: only lowercase letters, no spaces, no numbers
  const validateUsername = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z]/g, "");
    setUsername(cleaned);
    
    if (value !== cleaned) {
      setUsernameError("Apenas letras minúsculas, sem espaços ou números");
    } else if (cleaned.length < 4) {
      setUsernameError("Mínimo de 4 caracteres");
    } else if (cleaned.length > 20) {
      setUsernameError("Máximo de 20 caracteres");
    } else {
      setUsernameError("");
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Por favor, insira um email válido");
      return;
    }

    if (!username || username.length < 4) {
      toast.error("Nome de usuário deve ter no mínimo 4 caracteres");
      return;
    }

    if (usernameError) {
      toast.error(usernameError);
      return;
    }

    setLoading(true);

    try {
      const plan = PLANS[selectedPlan];
      
      // Call edge function to create Stripe checkout
      const { data, error } = await supabase.functions.invoke("create-euro-checkout", {
        body: { 
          email: email.toLowerCase().trim(),
          username: username.toLowerCase().trim(),
          phone: phone.trim(),
          planType: selectedPlan,
          amount: plan.price,
          checkUserExists: true,
        }
      });

      if (error) {
        console.error("Error creating checkout:", error);
        toast.error("Erro ao criar link de pagamento. Tente novamente.");
        return;
      }

      if (!data.success) {
        toast.error(data.error || "Erro ao criar pagamento");
        return;
      }

      setSessionId(data.session_id);
      setPaymentUrl(data.payment_url);
      setOrderId(data.order_id);
      setPaymentCreated(true);
      
      toast.success("Checkout criado! Redirecionando para pagamento...");
      
      // Redirect to Stripe checkout
      window.location.href = data.payment_url;

    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayment = () => {
    window.location.href = paymentUrl;
  };

  const handleCheckPayment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-euro-payment", {
        body: { order_id: orderId }
      });

      if (error) {
        toast.error("Erro ao verificar pagamento");
        return;
      }

      if (data.status === "completed") {
        toast.success("Pagamento confirmado e acesso liberado!");
        navigate("/mroobrigado?euro=true&username=" + username);
      } else if (data.status === "paid") {
        toast.success("Pagamento confirmado! Aguarde a liberação do acesso...");
      } else {
        toast.info("Pagamento ainda não confirmado. Aguarde alguns instantes.");
      }
    } catch (error) {
      console.error("Error checking payment:", error);
      toast.error("Erro ao verificar");
    } finally {
      setLoading(false);
    }
  };

  const plan = PLANS[selectedPlan];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-zinc-800/80 border-zinc-700 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            MRO Ferramenta Instagram
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {!paymentCreated 
              ? "Escolha seu plano e crie sua conta"
              : "Link de pagamento gerado! Clique para pagar"
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!paymentCreated ? (
            <form onSubmit={handleCreatePayment} className="space-y-6">
              {/* Seleção de Plano */}
              <div className="space-y-3">
                <label className="text-sm text-zinc-300 font-medium">Escolha seu Plano</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan("annual")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedPlan === "annual"
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-zinc-600 bg-zinc-700/30 hover:border-zinc-500"
                    }`}
                  >
                    <Crown className={`w-6 h-6 mx-auto mb-2 ${selectedPlan === "annual" ? "text-amber-500" : "text-zinc-400"}`} />
                    <p className={`font-semibold ${selectedPlan === "annual" ? "text-amber-500" : "text-white"}`}>
                      Anual
                    </p>
                    <p className="text-2xl font-bold text-white mt-1">
                      €{PLANS.annual.price}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">365 dias de acesso</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlan("lifetime")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedPlan === "lifetime"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-zinc-600 bg-zinc-700/30 hover:border-zinc-500"
                    }`}
                  >
                    <Sparkles className={`w-6 h-6 mx-auto mb-2 ${selectedPlan === "lifetime" ? "text-emerald-500" : "text-zinc-400"}`} />
                    <p className={`font-semibold ${selectedPlan === "lifetime" ? "text-emerald-500" : "text-white"}`}>
                      Vitalício
                    </p>
                    <p className="text-2xl font-bold text-white mt-1">
                      €{PLANS.lifetime.price}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">Acesso para sempre</p>
                  </button>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm text-zinc-300 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Seu Email
                </label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-700/50 border-zinc-600 text-white placeholder:text-zinc-500"
                  required
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label className="text-sm text-zinc-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome de Usuário
                </label>
                <Input
                  type="text"
                  placeholder="seuusuario"
                  value={username}
                  onChange={(e) => validateUsername(e.target.value)}
                  className={`bg-zinc-700/50 border-zinc-600 text-white placeholder:text-zinc-500 ${
                    usernameError ? "border-red-500" : ""
                  }`}
                  required
                />
                {usernameError && (
                  <p className="text-xs text-red-400">{usernameError}</p>
                )}
                <p className="text-xs text-zinc-500">
                  Apenas letras minúsculas, sem espaços ou números. Este será seu usuário e senha.
                </p>
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <label className="text-sm text-zinc-300 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefone (opcional)
                </label>
                <Input
                  type="tel"
                  placeholder="+351 912 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-zinc-700/50 border-zinc-600 text-white placeholder:text-zinc-500"
                />
              </div>

              {/* Resumo */}
              <div className="bg-zinc-700/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Plano</span>
                  <span className="text-white font-medium">{plan.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Usuário/Senha</span>
                  <span className="text-white font-mono">{username || "---"}</span>
                </div>
                <div className="border-t border-zinc-600 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Total</span>
                    <span className="text-2xl font-bold text-amber-400">
                      €{plan.price}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold py-6"
                disabled={loading || !!usernameError || !username}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Pagar €{plan.price} com Stripe
                  </>
                )}
              </Button>

              <p className="text-xs text-zinc-500 text-center">
                Pagamento seguro processado via Stripe
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-sm text-zinc-400 mb-1">ID do Pedido</p>
                <p className="text-sm font-mono text-amber-400 truncate">{sessionId}</p>
              </div>

              <div className="bg-zinc-700/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Email</span>
                  <span className="text-white">{email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Usuário/Senha</span>
                  <span className="text-white font-mono">{username}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Plano</span>
                  <span className="text-white">{plan.name}</span>
                </div>
              </div>

              <Button
                onClick={handleOpenPayment}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold py-6"
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Pagar €{plan.price}
              </Button>

              <Button
                onClick={handleCheckPayment}
                variant="outline"
                className="w-full border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Já paguei - Verificar pagamento
                  </>
                )}
              </Button>

              <p className="text-xs text-zinc-500 text-center">
                Após o pagamento, seu acesso será liberado automaticamente.
                <br />
                Os dados de acesso serão enviados para seu email.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
