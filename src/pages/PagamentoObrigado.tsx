import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Mail } from "lucide-react";
import { useEffect } from "react";

export default function PagamentoObrigado() {
  const location = useLocation();
  const navigate = useNavigate();
  const { email, nsuOrder } = location.state || {};

  useEffect(() => {
    if (!email && !nsuOrder) {
      // If no state, still show the page but with generic message
    }
  }, [email, nsuOrder]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-800/80 border-zinc-700 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Pagamento Confirmado!
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Seu acesso foi liberado com sucesso
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {email && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-green-400" />
                <p className="text-sm text-zinc-400">Email cadastrado</p>
              </div>
              <p className="text-white font-medium">{email}</p>
            </div>
          )}

          {nsuOrder && (
            <div className="bg-zinc-700/30 rounded-lg p-4">
              <p className="text-sm text-zinc-400 mb-1">Número do pedido (NSU)</p>
              <p className="text-lg font-mono text-green-400">{nsuOrder}</p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-start gap-3 text-zinc-300">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm">Seu pagamento foi processado com sucesso</p>
            </div>
            <div className="flex items-start gap-3 text-zinc-300">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm">Acesso liberado para o email informado</p>
            </div>
            <div className="flex items-start gap-3 text-zinc-300">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm">Você pode começar a usar agora</p>
            </div>
          </div>

          <Button
            onClick={() => navigate("/")}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-6"
          >
            Acessar Plataforma
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <p className="text-xs text-zinc-500 text-center">
            Guarde o número do pedido para referência futura
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
