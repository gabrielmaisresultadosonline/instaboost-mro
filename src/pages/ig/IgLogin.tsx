/** /IG/login — autenticação de clientes via Supabase Auth. */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { igApi } from "@/lib/ig/api";

const IgLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/IG/dashboard", { replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error) {
      setLoading(false);
      toast({
        title: "Não foi possível entrar",
        description: "Verifique seu e-mail e senha e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    await igApi.bootstrap({}).catch(() => undefined);
    navigate("/IG/dashboard", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/IG" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-bold uppercase tracking-widest">MRO Instagram</span>
        </Link>

        <div className="rounded-xl border border-border bg-card p-6 md:p-8">
          <h1 className="text-xl font-bold">Entrar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesse o painel da sua conta.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ig-email">E-mail</Label>
              <Input
                id="ig-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ig-password">Senha</Label>
              <Input
                id="ig-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              ENTRAR
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            A conexão com o Instagram é feita depois do login, com segurança, pela API oficial da Meta.
          </p>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link to="/IG/forgot-password" className="text-muted-foreground hover:text-foreground">
              Esqueci minha senha
            </Link>
            <Link to="/IG/register" className="font-medium text-primary hover:underline">
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IgLogin;
