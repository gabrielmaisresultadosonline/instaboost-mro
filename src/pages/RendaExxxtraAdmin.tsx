import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  LogIn,
  RefreshCw,
  Users,
  ShoppingCart,
  AlertTriangle,
  Mail,
  MessageCircle,
  Instagram,
  KeyRound,
  RotateCcw,
} from "lucide-react";

const SESSION_KEY = "rendaexxxtra_admin_session";

interface RendaExxxtraOrder {
  id: string;
  email: string;
  username: string | null;
  phone: string | null;
  amount: number | null;
  status: string;
  nsu_order: string | null;
  created_at: string;
}

interface RendaExxxtraInstagramAccount {
  id: string;
  instagram_username: string | null;
  created_at: string;
  is_trial: boolean;
}

interface RendaExxxtraUser {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  expires_at: string | null;
  expired: boolean;
  expired_email_sent_at: string | null;
  days_remaining: number | null;
  is_active: boolean;
  last_access: string | null;
  created_at: string;
  instagram_accounts: RendaExxxtraInstagramAccount[];
}

interface RendaExxxtraStats {
  total_orders: number;
  paid: number;
  attempts: number;
  active_users: number;
  expired_users: number;
  revenue: number;
}

type TabKey = "compradores" | "tentativas" | "expirados";

const fmtDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("pt-BR");
};

const fmtMoney = (value?: number | null) =>
  (Number(value) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function RendaExxxtraAdmin() {
  const { toast } = useToast();

  const [creds, setCreds] = useState<{ email: string; password: string } | null>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as { email: string; password: string }) : null;
    } catch {
      return null;
    }
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<RendaExxxtraOrder[]>([]);
  const [users, setUsers] = useState<RendaExxxtraUser[]>([]);
  const [stats, setStats] = useState<RendaExxxtraStats | null>(null);
  const [whatsappLink, setWhatsappLink] = useState("");
  const [tab, setTab] = useState<TabKey>("compradores");
  const [search, setSearch] = useState("");
  const [busyUser, setBusyUser] = useState<string | null>(null);

  const callApi = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      if (!creds) return { success: false, error: "sem sessão" } as Record<string, unknown>;
      const { data, error } = await supabase.functions.invoke("renddx-admin", {
        body: { action, email: creds.email, password: creds.password, ...extra },
      });
      if (error) return { success: false, error: error.message } as Record<string, unknown>;
      return (data || { success: false }) as Record<string, unknown>;
    },
    [creds],
  );

  const loadData = useCallback(async () => {
    if (!creds) return;
    setLoading(true);
    try {
      const data = await callApi("list");
      if (data.success) {
        setOrders((data.orders as RendaExxxtraOrder[]) || []);
        setUsers((data.users as RendaExxxtraUser[]) || []);
        setStats((data.stats as RendaExxxtraStats) || null);
        setWhatsappLink(String(data.whatsapp_link || ""));
      } else {
        toast({ title: String(data.error || "Erro ao carregar dados"), variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [callApi, creds, toast]);

  useEffect(() => {
    if (creds) loadData();
  }, [creds, loadData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const { data, error } = await supabase.functions.invoke("renddx-admin", {
        body: { action: "login", email: email.trim(), password },
      });
      if (error || !data?.success) {
        toast({ title: "Credenciais inválidas", variant: "destructive" });
        return;
      }
      const next = { email: email.trim(), password };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      setCreds(next);
      toast({ title: "Bem-vindo!" });
    } finally {
      setLoggingIn(false);
    }
  };

  const sendExpiredEmail = async (user: RendaExxxtraUser) => {
    setBusyUser(user.id);
    try {
      const res = await callApi("send_expired_email", { user_id: user.id });
      if (res.success) toast({ title: "E-mail enviado!" });
      else toast({ title: String(res.error || "Erro ao enviar"), variant: "destructive" });
      loadData();
    } finally {
      setBusyUser(null);
    }
  };

  const renewUser = async (user: RendaExxxtraUser) => {
    setBusyUser(user.id);
    try {
      const res = await callApi("renew_access", { user_id: user.id });
      if (res.success) toast({ title: "Acesso renovado!" });
      else toast({ title: String(res.error || "Erro ao renovar"), variant: "destructive" });
      loadData();
    } finally {
      setBusyUser(null);
    }
  };

  const matchOrder = (o: RendaExxxtraOrder) =>
    o.email?.toLowerCase().includes(search.toLowerCase()) ||
    o.username?.toLowerCase().includes(search.toLowerCase());

  const matchUser = (u: RendaExxxtraUser) =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase());

  const filteredOrders = useMemo(() => {
    const list = orders.filter(matchOrder);
    if (tab === "compradores") return list.filter((o) => o.status === "paid");
    if (tab === "tentativas") return list.filter((o) => o.status !== "paid");
    return [];
  }, [orders, search, tab]);

  const filteredUsers = useMemo(() => {
    const list = users.filter(matchUser);
    if (tab === "expirados") return list.filter((u) => u.expired);
    return [];
  }, [users, search, tab]);

  const allStats = useMemo(() => {
    const map = new Map<string, RendaExxxtraUser>();
    users.forEach((u) => map.set(u.id, u));
    return stats;
  }, [users, stats]);

  if (!creds) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="mb-6 text-center">
              <KeyRound className="mx-auto mb-2 h-10 w-10 text-primary" />
              <h1 className="text-xl font-bold">Admin RendaExxxtra</h1>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@mro.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loggingIn}>
                {loggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin RendaExxxtra</h1>
            <p className="text-muted-foreground">Gerenciamento de Leads e Clientes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                sessionStorage.removeItem(SESSION_KEY);
                setCreds(null);
              }}
            >
              <LogIn className="h-4 w-4 rotate-180" />
            </Button>
          </div>
        </div>

        {allStats && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase">Receita</p>
                <p className="text-lg font-bold text-green-500">{fmtMoney(allStats.revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase">Vendas</p>
                <p className="text-lg font-bold">{allStats.paid}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase">Tentativas</p>
                <p className="text-lg font-bold text-orange-500">{allStats.attempts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase">Ativos</p>
                <p className="text-lg font-bold text-blue-500">{allStats.active_users}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase">Expirados</p>
                <p className="text-lg font-bold text-red-500">{allStats.expired_users}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase">Total Leads</p>
                <p className="text-lg font-bold">{allStats.total_orders}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex bg-muted p-1 rounded-lg">
            <Button
              variant={tab === "compradores" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("compradores")}
              className="px-4"
            >
              <ShoppingCart className="mr-2 h-4 w-4" /> Compradores
            </Button>
            <Button
              variant={tab === "tentativas" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("tentativas")}
              className="px-4"
            >
              <AlertTriangle className="mr-2 h-4 w-4" /> Tentativas
            </Button>
            <Button
              variant={tab === "expirados" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("expirados")}
              className="px-4"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Expirados
            </Button>
          </div>
          <div className="relative flex-1">
            <Input
              placeholder="Buscar por e-mail ou usuário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left font-medium">
                  <th className="p-4">Usuário / E-mail</th>
                  {tab === "expirados" ? (
                    <>
                      <th className="p-4 text-center">Ações</th>
                      <th className="p-4">Expiração</th>
                      <th className="p-4">WhatsApp</th>
                    </>
                  ) : (
                    <>
                      <th className="p-4">NSU</th>
                      <th className="p-4">Valor</th>
                      <th className="p-4">Data</th>
                      <th className="p-4">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {tab === "expirados"
                  ? filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b transition-colors hover:bg-muted/30">
                        <td className="p-4">
                          <div className="font-bold">{u.username}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                          {u.instagram_accounts.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {u.instagram_accounts.map((acc) => (
                                <Badge key={acc.id} variant="secondary" className="text-[10px] py-0">
                                  <Instagram className="mr-1 h-3 w-3" /> {acc.instagram_username}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              disabled={busyUser === u.id}
                              onClick={() => sendExpiredEmail(u)}
                            >
                              {busyUser === u.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                              <span className="hidden sm:ml-2 sm:inline">Aviso</span>
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8"
                              disabled={busyUser === u.id}
                              onClick={() => renewUser(u)}
                            >
                              {busyUser === u.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              <span className="hidden sm:ml-2 sm:inline">Renovar</span>
                            </Button>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-xs">
                            <span className="text-red-500 font-bold">Expirado em:</span>
                            <br />
                            {fmtDate(u.expires_at)}
                          </div>
                        </td>
                        <td className="p-4">
                          {whatsappLink && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-500"
                              asChild
                            >
                              <a
                                href={`${whatsappLink}&text=Olá%20${u.username}%2C%20seu%20acesso%20ao%20Renddx%20expirou.`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  : filteredOrders.map((o) => (
                      <tr key={o.id} className="border-b transition-colors hover:bg-muted/30">
                        <td className="p-4">
                          <div className="font-bold">{o.username || "-"}</div>
                          <div className="text-xs text-muted-foreground">{o.email}</div>
                          {o.phone && <div className="text-xs text-muted-foreground">{o.phone}</div>}
                        </td>
                        <td className="p-4 font-mono text-xs">{o.nsu_order || "-"}</td>
                        <td className="p-4 font-bold text-green-500">{fmtMoney(o.amount)}</td>
                        <td className="p-4 text-xs">{fmtDate(o.created_at)}</td>
                        <td className="p-4">
                          <Badge variant={o.status === "paid" ? "default" : "secondary"}>
                            {o.status === "paid" ? "Pago" : "Aguardando"}
                          </Badge>
                        </td>
                      </tr>
                    ))}

                {!loading && filteredOrders.length === 0 && filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
