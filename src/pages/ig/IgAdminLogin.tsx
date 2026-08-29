/**
 * /IG/admin/login — login administrativo isolado.
 * A senha inicial vem apenas do secret do servidor e a troca é obrigatória
 * no primeiro acesso.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { igAdminApi, setAdminToken } from "@/lib/ig/adminApi";

const IgAdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mustChange, setMustChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await igAdminApi.login(email.trim(), password);
      setAdminToken(result.token);
      if (result.must_change_password) {
        setMustChange(true);
        return;
      }
      navigate("/IG/admin/dashboard", { replace: true });
    } catch (error) {
      toast({
        title: "Acesso negado",
        description: error instanceof Error ? error.message : "Verifique suas credenciais.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (newPassword.length < 12) {
      toast({ title: "Senha fraca", description: "Use no mínimo 12 caracteres.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirm) {
      toast({ title: "Senhas diferentes", description: "Confirme a mesma senha.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await igAdminApi.changePassword(newPassword);
      toast({ title: "Senha atualizada", description: "Sua nova senha já está ativa." });
      navigate("/IG/admin/dashboard", { replace: true });
    } catch (error) {
      toast({
        title: "Não foi possível alterar a senha",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8">
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-widest">Acesso administrativo</span>
        </div>

        {mustChange ? (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <h1 className="text-lg font-bold">Defina uma nova senha</h1>
            <p className="text-sm text-muted-foreground">
              A troca de senha é obrigatória no primeiro acesso.
            </p>
            <div className="space-y-2">
              <Label htmlFor="ig-admin-new">Nova senha (mín. 12 caracteres)</Label>
              <Input
                id="ig-admin-new"
                type="password"
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ig-admin-confirm">Confirmar senha</Label>
              <Input
                id="ig-admin-confirm"
                type="password"
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              SALVAR SENHA
            </Button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <h1 className="text-lg font-bold">Entrar como administrador</h1>
            <div className="space-y-2">
              <Label htmlFor="ig-admin-email">E-mail</Label>
              <Input
                id="ig-admin-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ig-admin-password">Senha</Label>
              <Input
                id="ig-admin-password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              ENTRAR
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default IgAdminLogin;
