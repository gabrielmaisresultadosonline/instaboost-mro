import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, Loader2, KeyRound } from "lucide-react";

export default function RecuperarSenha() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        toast({
          title: "Erro ao enviar",
          description: "Não foi possível processar sua solicitação agora.",
          variant: "destructive"
        });
      } else {
        setSent(true);
        toast({ 
          title: "E-mail enviado!", 
          description: "Confira sua caixa de entrada para redefinir sua senha." 
        });
      }
    } catch (err) {
      toast({ 
        title: "Erro inesperado", 
        description: "Tente novamente mais tarde.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />

      <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl rounded-[2.5rem] relative z-10">
        <CardHeader className="text-center pt-10">
          <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-500 border border-blue-500/20">
            <KeyRound className="w-8 h-8" />
          </div>
          <CardTitle className="text-3xl font-black text-white tracking-tight">RECUPERAR SENHA</CardTitle>
          <CardDescription className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2">
            Lotar Grupos
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          {!sent ? (
            <form onSubmit={handleRecover} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Seu E-mail de Cadastro</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <Input 
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className="bg-slate-950 border-slate-800 h-14 pl-12 rounded-2xl text-white focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-500/20 group"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "ENVIAR INSTRUÇÕES"}
              </Button>
              
              <Button 
                type="button" 
                variant="ghost"
                onClick={() => navigate('/login')}
                className="w-full text-slate-500 hover:text-white font-bold h-12"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> VOLTAR AO LOGIN
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-6">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-100 text-sm leading-relaxed">
                As instruções para redefinir sua senha foram enviadas para o e-mail: <br />
                <span className="font-bold text-white mt-2 block">{email}</span>
              </div>
              <p className="text-slate-500 text-xs italic">Não esqueça de conferir a pasta de spam ou lixo eletrônico.</p>
              <Button 
                onClick={() => navigate('/login')}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all"
              >
                VOLTAR AO LOGIN
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
