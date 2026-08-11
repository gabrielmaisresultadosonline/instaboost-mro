import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Sparkles, LayoutDashboard, Mail, Lock, User } from "lucide-react";
import { trackPageView, trackPurchase } from "@/lib/facebookTracking";

const ZapMROVendasObrigado = () => {
  useEffect(() => {
    trackPageView('Thank You Page - ZAPMRO Vendas');
    
    // Tenta recuperar o valor total da compra para o pixel
    const storedAmount = localStorage.getItem('zapmro_checkout_amount');
    const purchaseAmount = storedAmount ? Number(storedAmount) : 67; // Fallback para o plano mensal mínimo
    
    trackPurchase(purchaseAmount, 'ZAPMRO Purchase');
    
    // Opcional: Limpar após o rastreio para evitar duplicação em refresh (embora Purchase já tenha deduplicação por ID se configurado)
    // localStorage.removeItem('zapmro_checkout_amount');
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
            <Sparkles className="w-8 h-8 text-emerald-400 absolute -top-2 -right-2 animate-pulse" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            PAGAMENTO APROVADO!
          </h1>
          
          <p className="text-xl text-gray-400">
            Seu acesso ao <span className="text-white font-bold">ZAPMRO</span> foi liberado com sucesso.
          </p>
        </div>

        <Card className="bg-gray-900/50 border-green-500/20 backdrop-blur-sm">
          <CardContent className="p-8 space-y-6">
            <div className="flex items-start gap-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <Mail className="w-6 h-6 text-green-400 shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg">Verifique seu E-mail</h3>
                <p className="text-gray-400 text-sm">
                  Enviamos seus dados de acesso (usuário e senha) para o e-mail cadastrado na compra.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-center">Como acessar agora?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                  <User className="w-5 h-5 text-green-400" />
                  <span className="text-sm">Use seu Usuário enviado</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                  <Lock className="w-5 h-5 text-green-400" />
                  <span className="text-sm">Use sua Senha enviada</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => window.location.href = '/dashboard'}
              className="w-full h-14 text-lg font-black bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white gap-2 shadow-lg shadow-green-500/20"
            >
              <LayoutDashboard className="w-6 h-6" />
              ACESSAR ÁREA DE MEMBROS
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-gray-500 text-sm">
          Caso não encontre o e-mail, verifique sua caixa de spam ou lixo eletrônico.
        </p>
      </div>
    </div>
  );
};

export default ZapMROVendasObrigado;
