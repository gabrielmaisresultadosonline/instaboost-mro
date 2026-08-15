import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { trackPageView } from '@/lib/facebookTracking';

export default function LotarGruposLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    trackPageView('Login - Lotar Grupos');
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password
      });

      if (authError) {
        toast({
          title: "Erro de acesso",
          description: "Credenciais inválidas ou acesso não liberado.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const { data: user, error } = await supabase
        .from('lotargrupos_users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('status', 'active')
        .maybeSingle();

      if (error || !user) {
        await supabase.auth.signOut();
        toast({
          title: "Acesso bloqueado",
          description: "Você não tem uma licença ativa.",
          variant: "destructive"
        });
      } else {
        toast({ title: "Login realizado!", description: "Bem-vindo à área de membros." });
        navigate('/dashboard');
      }
    } catch (err) {
      toast({ title: "Erro no login", description: "Tente novamente mais tarde.", variant: "destructive" });
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
            <Lock className="w-8 h-8" />
          </div>
          <CardTitle className="text-3xl font-black text-white tracking-tight">ÁREA DE MEMBROS</CardTitle>
          <CardDescription className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2 flex items-center justify-center gap-2">
            <Sparkles className="w-3 h-3 text-blue-500" /> Lotar Grupos
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Seu E-mail</label>
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

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Senha de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                <Input 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
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
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>ENTRAR NA PLATAFORMA <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
              )}
            </Button>
            
            <div className="text-center">
              <button 
                type="button" 
                onClick={() => navigate('/recuperar-senha')}
                className="text-slate-500 hover:text-blue-400 text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Esqueceu sua senha?
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
