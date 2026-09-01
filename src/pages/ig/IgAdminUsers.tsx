/**
 * /IG/admin/users — cadastro completo dos clientes: listagem, busca, bloqueio,
 * detalhes e recuperação/troca de senha (todas as ações são auditadas no backend).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, KeyRound, Link2, Search, ShieldCheck } from "lucide-react";
import IgAdminShell from "@/components/ig/IgAdminShell";
import { IgEmpty, IgError, IgLoading } from "@/components/ig/IgStates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { igAdminApi } from "@/lib/ig/adminApi";

type UsersResponse = Awaited<ReturnType<typeof igAdminApi.users>>;
type IgAdminUser = UsersResponse["users"][number];

const PAGE_SIZE = 50;

const IgAdminUsers = () => {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Estado do modal de recuperação de senha.
  const [target, setTarget] = useState<IgAdminUser | null>(null);
  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [recoveryLink, setRecoveryLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await igAdminApi.users());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os usuários.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const users = data?.users ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      [user.email, user.full_name, user.company].some((field) => field?.toLowerCase().includes(term)),
    );
  }, [data, search]);

  const visible = showAll || search.trim() ? filtered : filtered.slice(0, PAGE_SIZE);

  const tenantOf = (userId: string) => {
    const membership = data?.memberships.find((m) => m.user_id === userId);
    if (!membership) return null;
    return data?.tenants.find((t) => t.id === membership.tenant_id) ?? null;
  };

  const toggleBlock = async (userId: string, blocked: boolean) => {
    setBusy(userId);
    try {
      await igAdminApi.setUserBlocked(userId, blocked);
      toast({ title: blocked ? "Usuário bloqueado" : "Usuário desbloqueado" });
      await load();
    } catch (err) {
      toast({
        title: "Ação não concluída",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const openPasswordDialog = (user: IgAdminUser) => {
    setTarget(user);
    setPassword("");
    setRecoveryLink(null);
  };

  const submitPassword = async () => {
    if (!target) return;
    if (password.trim().length < 8) {
      toast({ title: "Senha muito curta", description: "Use no mínimo 8 caracteres.", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      await igAdminApi.setUserPassword(target.user_id, password.trim());
      toast({ title: "Senha alterada", description: `Nova senha definida para ${target.email ?? "o usuário"}.` });
      setPassword("");
    } catch (err) {
      toast({
        title: "Não foi possível alterar a senha",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const generateLink = async () => {
    if (!target?.email) {
      toast({ title: "Usuário sem e-mail cadastrado", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const { link } = await igAdminApi.userRecoveryLink(target.user_id, target.email);
      setRecoveryLink(link);
    } catch (err) {
      toast({
        title: "Não foi possível gerar o link",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const copyLink = async () => {
    if (!recoveryLink) return;
    try {
      await navigator.clipboard.writeText(recoveryLink);
      toast({ title: "Link copiado" });
    } catch {
      toast({ title: "Copie manualmente o link exibido", variant: "destructive" });
    }
  };

  return (
    <IgAdminShell title="Usuários cadastrados">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            className="pl-9"
            placeholder="Pesquisar por nome, e-mail ou empresa"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Pesquisar usuários"
          />
        </div>
        {!search.trim() && filtered.length > PAGE_SIZE ? (
          <Button variant="outline" size="sm" onClick={() => setShowAll((current) => !current)}>
            {showAll ? "Mostrar 50" : `Ver todos (${filtered.length})`}
          </Button>
        ) : null}
        <Badge variant="secondary" className="ml-auto">
          {filtered.length} cadastro(s)
        </Badge>
      </div>

      {error ? (
        <IgError message={error} onRetry={load} />
      ) : loading ? (
        <IgLoading label="Carregando usuários..." />
      ) : visible.length === 0 ? (
        <IgEmpty title="Nenhum usuário encontrado" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Cadastro</th>
                <th className="px-4 py-3">Último acesso</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((user) => {
                const tenant = tenantOf(user.user_id);
                return (
                  <tr key={user.user_id} className="border-b border-border/60 last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <span className="font-medium">{user.full_name ?? "—"}</span>
                      {user.company ? (
                        <span className="block text-xs text-muted-foreground">{user.company}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email ?? "—"}</td>
                    <td className="px-4 py-3 uppercase text-muted-foreground">{tenant?.plan_id ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.is_blocked ? "destructive" : "secondary"}>
                        {user.is_blocked ? "Bloqueado" : "Ativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openPasswordDialog(user)}>
                          <KeyRound className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                          Senha
                        </Button>
                        <Button
                          size="sm"
                          variant={user.is_blocked ? "secondary" : "outline"}
                          disabled={busy === user.user_id}
                          onClick={() => void toggleBlock(user.user_id, !user.is_blocked)}
                        >
                          {user.is_blocked ? "Desbloquear" : "Bloquear"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(target)} onOpenChange={(open) => (open ? null : setTarget(null))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar acesso</DialogTitle>
            <DialogDescription>
              {target?.email ?? "Usuário"} — defina uma nova senha ou gere um link de redefinição.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="ig-new-pass">
                Nova senha (mínimo 8 caracteres)
              </label>
              <Input
                id="ig-new-pass"
                type="text"
                autoComplete="off"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite a nova senha do cliente"
              />
              <Button className="w-full" disabled={savingPassword} onClick={() => void submitPassword()}>
                <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />
                Definir nova senha
              </Button>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Button
                variant="outline"
                className="w-full"
                disabled={savingPassword}
                onClick={() => void generateLink()}
              >
                <Link2 className="mr-2 h-4 w-4" aria-hidden />
                Gerar link de redefinição
              </Button>
              {recoveryLink ? (
                <div className="space-y-2 rounded-lg bg-muted p-3">
                  <p className="break-all text-xs text-muted-foreground">{recoveryLink}</p>
                  <Button size="sm" variant="secondary" onClick={() => void copyLink()}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    Copiar link
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </IgAdminShell>
  );
};

export default IgAdminUsers;
