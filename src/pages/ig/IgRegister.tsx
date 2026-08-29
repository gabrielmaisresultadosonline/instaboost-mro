/** /IG/register — criação de conta do cliente (tenant provisionado no backend). */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { igApi } from "@/lib/ig/api";

const IgRegister = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", company: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (form.password.length < 8) {
      toast({ title: "Senha muito curta", description: "Use no mínimo 8 caracteres.", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirm) {
      toast({ title: "Senhas diferentes", description: "Confirme a mesma senha.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/IG/dashboard`,
        data: { full_name: form.name.trim(), company: form.company.trim() },
      },
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Não foi possível criar sua conta",
        description: error.message.includes("already")
          ? "Este e-mail já possui conta. Faça login."
          : "Verifique os dados e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    // Com confirmação de e-mail ativa, signUp NÃO retorna sessão.
    if (!data.session) {
      setAwaitingConfirmation(true);
      return;
    }

    await igApi
      .bootstrap({ full_name: form.name.trim(), company: form.company.trim() })
      .catch(() => undefined);
    navigate("/IG/dashboard", { replace: true });
  };

  if (awaitingConfirmation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
          <h1 className="text-lg font-bold">Confirme seu e-mail</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Enviamos um link de confirmação para <strong>{form.email}</strong>. Após confirmar, você entra
            direto no painel e poderá conectar seu Instagram.
          </p>
          <Button asChild variant="outline" className="mt-6 w-full">
            <Link to="/IG/login">Ir para o login</Link>
          </Button>
        </div>
      </div>
    );
  }

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
          <h1 className="text-xl font-bold">Criar conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Comece agora e conecte seu Instagram.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ig-name">Nome</Label>
              <Input id="ig-name" required value={form.name} onChange={update("name")} autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ig-company">Empresa</Label>
              <Input id="ig-company" value={form.company} onChange={update("company")} autoComplete="organization" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ig-email-register">E-mail</Label>
              <Input
                id="ig-email-register"
                type="email"
                required
                value={form.email}
                onChange={update("email")}
                autoComplete="email"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ig-password-register">Senha</Label>
                <Input
                  id="ig-password-register"
                  type="password"
                  required
                  value={form.password}
                  onChange={update("password")}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ig-confirm">Confirmar senha</Label>
                <Input
                  id="ig-confirm"
                  type="password"
                  required
                  value={form.confirm}
                  onChange={update("confirm")}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              CRIAR CONTA
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/IG/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default IgRegister;
