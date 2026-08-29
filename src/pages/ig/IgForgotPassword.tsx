/** /IG/forgot-password — envia link de recuperação para /IG/reset-password. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const IgForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/IG/reset-password`,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Não foi possível enviar o e-mail",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
      return;
    }
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8">
        <h1 className="text-xl font-bold">Recuperar senha</h1>

        {sent ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Se existir uma conta com esse e-mail, o link de redefinição já está a caminho.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ig-forgot-email">E-mail</Label>
              <Input
                id="ig-forgot-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              ENVIAR LINK
            </Button>
          </form>
        )}

        <Link to="/IG/login" className="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground">
          Voltar para o login
        </Link>
      </div>
    </div>
  );
};

export default IgForgotPassword;
