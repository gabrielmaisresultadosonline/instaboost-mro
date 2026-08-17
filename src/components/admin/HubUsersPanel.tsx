import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Search,
  RefreshCw,
  Lock,
  Unlock,
  Mail,
  ShieldBan,
  ShieldCheck,
  Users,
} from "lucide-react";

/** Produto do hub retornado pela API admin. */
interface HubProductLite {
  id: string;
  slug: string;
  title: string;
  access_source: string;
}

/** Status de acesso do cliente para um produto específico. */
interface HubUserProduct {
  id: string;
  slug: string;
  title: string;
  unlocked: boolean;
  manual: boolean;
  origin: string | null;
}

/** Cliente unificado (MRO, ZAPMRO, Posts com IA, compras e liberações manuais). */
interface HubUser {
  key: string;
  username: string | null;
  email: string | null;
  name: string | null;
  password: string | null;
  sources: string[];
  /** Todos os e-mails/usernames vinculados à mesma identidade (busca). */
  aliases?: string[];
  /** Origem da conta desta linha (mro_tool, zapmro, ...). */
  account_source?: string | null;
  blocked: boolean;

  products: HubUserProduct[];
}

const PAGE_SIZE = 50;

export default function HubUsersPanel() {
  const { toast } = useToast();
  const [users, setUsers] = useState<HubUser[]>([]);
  const [products, setProducts] = useState<HubProductLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("hub-api", {
        body: { action: "admin_list_users" },
      });
      if (error) throw error;
      if (data?.success) {
        setUsers((data.users || []) as HubUser[]);
        setProducts((data.products || []) as HubProductLite[]);
      } else {
        toast({ title: data?.error || "Erro ao carregar usuários", variant: "destructive" });
      }
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Erro ao carregar usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) =>
      [u.name, u.email, u.username, ...(u.aliases || [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );

  }, [users, search]);

  // Mostra apenas os primeiros 50 para não pesar a página, a menos que haja busca.
  const visible = search.trim() || showAll ? filtered : filtered.slice(0, PAGE_SIZE);

  const runAction = async (user: HubUser, body: Record<string, unknown>, successMsg: string) => {
    setBusyKey(user.key);
    try {
      const { data, error } = await supabase.functions.invoke("hub-api", { body });
      if (error) throw error;
      if (data?.success) {
        toast({ title: successMsg });
        await load();
      } else {
        toast({ title: data?.error || "Falha na operação", variant: "destructive" });
      }
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Falha na operação",
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const toggleProduct = (user: HubUser, product: HubUserProduct) => {
    // Liberar = grava liberação manual. Bloquear = remove a liberação manual.
    if (product.unlocked && !product.manual) {
      toast({
        title: "Acesso vem do plano do cliente",
        description: `Remova o acesso em ${product.origin || "origem do plano"} para bloquear este produto.`,
      });
      return;
    }
    runAction(
      user,
      {
        action: product.manual ? "admin_revoke_access" : "admin_grant_access",
        product_id: product.id,
        email: user.email || "",
        username: user.username || "",
      },
      product.manual ? "Acesso removido" : "Acesso liberado",
    );
  };

  const toggleBlock = (user: HubUser) =>
    runAction(
      user,
      {
        action: "admin_toggle_block",
        email: user.email || "",
        username: user.username || "",
        blocked: !user.blocked,
      },
      user.blocked ? "Usuário desbloqueado" : "Usuário bloqueado",
    );

  const sendAccess = (user: HubUser) => {
    if (!user.email) {
      toast({ title: "Cliente sem email cadastrado", variant: "destructive" });
      return;
    }
    if (!user.password) {
      toast({ title: "Senha não disponível — defina uma senha no painel do produto", variant: "destructive" });
      return;
    }
    runAction(
      user,
      {
        action: "admin_send_access",
        email: user.email,
        username: user.username || user.email,
        password: user.password,
      },
      "Acesso reenviado por email",
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5" /> Usuários da Dashboard ({filtered.length})
          </h3>
          <p className="text-sm text-muted-foreground">
            Todos os clientes de todos os produtos. Libere ou bloqueie módulos manualmente e reenvie o acesso.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Pesquisar em todos os clientes (nome, email, usuário)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

      </div>

      <div className="space-y-3">
        {visible.map((user) => (
          <Card key={user.key} className={user.blocked ? "border-destructive/40" : undefined}>
            <CardContent className="pt-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {user.name || user.username || user.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.username ? `@${user.username}` : "sem usuário"} · {user.email || "sem email"}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {user.sources.map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">
                        {s}
                      </Badge>
                    ))}
                    {user.blocked && <Badge variant="destructive" className="text-[10px]">Bloqueado</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyKey === user.key || !user.email}
                    onClick={() => sendAccess(user)}
                  >
                    <Mail className="h-4 w-4" /> Reenviar acesso
                  </Button>
                  <Button
                    size="sm"
                    variant={user.blocked ? "default" : "outline"}
                    disabled={busyKey === user.key}
                    onClick={() => toggleBlock(user)}
                  >
                    {user.blocked ? <ShieldCheck className="h-4 w-4" /> : <ShieldBan className="h-4 w-4" />}
                    {user.blocked ? "Desbloquear" : "Bloquear"}
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-3 flex flex-wrap gap-2">
                {products.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum produto cadastrado ainda.</p>
                )}
                {user.products.map((p) => (
                  <Button
                    key={p.id}
                    size="sm"
                    variant={p.unlocked ? "default" : "outline"}
                    disabled={busyKey === user.key}
                    onClick={() => toggleProduct(user, p)}
                    title={p.origin || "Sem acesso"}
                  >
                    {p.unlocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    {p.title}
                    {p.manual && <span className="text-[10px] opacity-70">(manual)</span>}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!search.trim() && !showAll && filtered.length > PAGE_SIZE && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setShowAll(true)}>
            Ver todos ({filtered.length})
          </Button>
        </div>
      )}
    </div>
  );
}
