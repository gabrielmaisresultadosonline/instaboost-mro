import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, ExternalLink, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function MROObrigado() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  // Parâmetros da URL - podem vir do redirect do InfiniPay
  const nsu = searchParams.get("nsu") || searchParams.get("order_nsu");
  const transactionNsu = searchParams.get("transaction_nsu");
  const slug = searchParams.get("slug");

  useEffect(() => {
    if (nsu) {
      checkOrder();
    } else {
      setLoading(false);
    }
  }, [nsu]);

  const checkOrder = async () => {
    try {
      const { data, error } = await supabase
        .from("mro_orders")
        .select("*")
        .eq("nsu_order", nsu)
        .single();

      if (error) {
        console.error("Error fetching order:", error);
        return;
      }

      setOrder(data);

      // Se ainda não está completo, verificar pagamento
      if (data.status === "pending") {
        setChecking(true);
        
        // Verificar via edge function passando parâmetros do redirect do InfiniPay
        console.log("[MROObrigado] Verificando pagamento", { nsu, transactionNsu, slug });
        
        await supabase.functions.invoke("check-mro-payment", {
          body: { 
            nsu_order: nsu,
            transaction_nsu: transactionNsu,
            slug: slug
          }
        });
        
        // Recarregar após verificação
        setTimeout(() => {
          checkOrder();
        }, 3000);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  const copyCredentials = async () => {
    if (!order) return;
    
    const text = `Usuário: ${order.username}\nSenha: ${order.username}`;
    await navigator.clipboard.writeText(text);
    toast.success("Credenciais copiadas!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-800/80 border-zinc-700 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
            <p className="text-zinc-400">Verificando pagamento...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-800/80 border-zinc-700 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-white">Pedido não encontrado</CardTitle>
            <CardDescription className="text-zinc-400">
              Não foi possível localizar seu pedido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate("/mroferramenta")}
              className="w-full bg-amber-500 hover:bg-amber-600"
            >
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCompleted = order.status === "completed";
  const isPaid = order.status === "paid" || isCompleted;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-800/80 border-zinc-700 backdrop-blur-sm">
        <CardHeader className="text-center">
          {isCompleted ? (
            <>
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                Acesso Liberado! 🎉
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Seu acesso à ferramenta MRO Instagram foi liberado com sucesso!
              </CardDescription>
            </>
          ) : isPaid ? (
            <>
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                Pagamento Confirmado!
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Aguarde enquanto liberamos seu acesso...
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-zinc-500 to-zinc-600 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                Aguardando Pagamento
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Seu pagamento ainda está sendo processado...
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {isCompleted && (
            <>
              <div className="bg-zinc-700/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Usuário</span>
                  <span className="text-white font-mono font-bold">{order.username}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Senha</span>
                  <span className="text-white font-mono font-bold">{order.username}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Plano</span>
                  <span className="text-amber-400 font-medium">
                    {order.plan_type === "lifetime" ? "Vitalício" : "Anual (365 dias)"}
                  </span>
                </div>
              </div>

              <Button
                onClick={copyCredentials}
                variant="outline"
                className="w-full border-zinc-600 text-zinc-300 hover:bg-zinc-700"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar credenciais
              </Button>

              <Button
                onClick={() => window.open("https://maisresultadosonline.com.br", "_blank")}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Acessar Área de Membros
              </Button>

              <Button
                onClick={() => window.open("https://chat.whatsapp.com/JdEHa4jeLSUKTQFCNp7YXi", "_blank")}
                variant="outline"
                className="w-full border-green-600 text-green-400 hover:bg-green-900/20"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Entrar no Grupo de Avisos
              </Button>

              <p className="text-xs text-zinc-500 text-center">
                Os dados de acesso também foram enviados para: <strong>{order.email}</strong>
              </p>
            </>
          )}

          {!isCompleted && (
            <>
              <div className="bg-zinc-700/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">NSU</span>
                  <span className="text-white font-mono">{order.nsu_order}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Email</span>
                  <span className="text-white">{order.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Status</span>
                  <span className={isPaid ? "text-amber-400" : "text-zinc-400"}>
                    {isPaid ? "Processando..." : "Aguardando pagamento"}
                  </span>
                </div>
              </div>

              <Button
                onClick={checkOrder}
                variant="outline"
                className="w-full border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                disabled={checking}
              >
                {checking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Verificar novamente
                  </>
                )}
              </Button>

              <p className="text-xs text-zinc-500 text-center">
                Esta página será atualizada automaticamente quando o pagamento for confirmado.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
