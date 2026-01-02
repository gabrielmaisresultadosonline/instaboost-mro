import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CreditCard, Mail, CheckCircle, User, Euro, Sparkles } from "lucide-react";

const PLAN = {
  name: "Anual",
  price: 300,
  days: 365,
  description: "1 ano de acesso completo",
};

export default function InstagramNovaEuro() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
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
      // Call edge function to create Stripe checkout
      const { data, error } = await supabase.functions.invoke("create-euro-checkout", {
        body: { 
          email: email.toLowerCase().trim(),
          username: username.toLowerCase().trim(),
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-zinc-800/80 border-zinc-700 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
            <Euro className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            MRO Ferramenta Instagram
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {!paymentCreated 
              ? "Pagamento em Euro via Stripe"
              : "Clique para finalizar o pagamento"
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!paymentCreated ? (
            <form onSubmit={handleCreatePayment} className="space-y-6">
              {/* Plan Display */}
              <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-blue-400" />
                    <div>
                      <p className="text-white font-semibold">Plano {PLAN.name}</p>
                      <p className="text-zinc-400 text-sm">{PLAN.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-400">€{PLAN.price}</p>
                    <p className="text-xs text-zinc-500">EUR</p>
                  </div>
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

              {/* Summary */}
              <div className="bg-zinc-700/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Plano</span>
                  <span className="text-white font-medium">{PLAN.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Usuário/Senha</span>
                  <span className="text-white font-mono">{username || "---"}</span>
                </div>
                <div className="border-t border-zinc-600 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Total</span>
                    <span className="text-2xl font-bold text-blue-400">
                      €{PLAN.price}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-6"
                disabled={loading || !!usernameError || !username}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Pagar €{PLAN.price} com Stripe
                  </>
                )}
              </Button>

              <p className="text-xs text-zinc-500 text-center">
                Pagamento seguro processado via Stripe
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-zinc-400 mb-1">Session ID</p>
                <p className="text-sm font-mono text-blue-400 truncate">{sessionId}</p>
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
                  <span className="text-white">{PLAN.name}</span>
                </div>
              </div>

              <Button
                onClick={handleOpenPayment}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-6"
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Pagar €{PLAN.price}
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
