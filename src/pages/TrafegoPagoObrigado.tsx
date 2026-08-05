import React from 'react';
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TrafegoPagoObrigado() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <CheckCircle2 className="w-20 h-20 text-emerald-500 mb-6 animate-bounce" />
      <h1 className="text-4xl font-black mb-4">Pagamento Confirmado!</h1>
      <p className="text-zinc-400 mb-8 max-w-md">
        Seu acesso foi liberado! Enviamos suas credenciais para seu e-mail. 
        Você já pode acessar o dashboard e definir sua senha.
      </p>
      <Button onClick={() => navigate("/dashboard")} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-6 text-lg font-bold">
        Acessar Dashboard
      </Button>
    </div>
  );
}