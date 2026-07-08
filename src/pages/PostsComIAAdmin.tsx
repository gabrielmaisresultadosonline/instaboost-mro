import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, LogOut, RefreshCw, CheckCircle2, Trash2, DollarSign, Users, Clock, TrendingUp, Mail, Video, Plus, Pencil, X } from "lucide-react";


const STORAGE_KEY = "postscomia_admin_auth";

interface Order {
  id: string;
  name: string;
  email: string;
  whatsapp: string | null;
  amount: number;
  orderbump: boolean;
  nsu_order: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  infinitepay_link: string | null;
}

interface Stats {
  total: number;
  paid: number;
  pending: number;
  revenue: number;
  bumpCount: number;
}

export default function PostsComIAAdmin() {
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [pwInput, setPwInput] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"all" | "paid" | "pending">("all");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setCreds(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (creds) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creds]);

  async function refresh() {
    if (!creds) return;
    setLoading(true);
    try {
      const [ordersR, statsR] = await Promise.all([
        supabase.functions.invoke("postscomia-admin", { body: { action: "list_orders", ...creds } }),
        supabase.functions.invoke("postscomia-admin", { body: { action: "stats", ...creds } }),
      ]);
      setOrders(ordersR.data?.orders || []);
      setStats(statsR.data || null);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginErr("");
    try {
      const { data } = await supabase.functions.invoke("postscomia-admin", {
        body: { action: "login", email: emailInput, password: pwInput },
      });
      if (data?.success) {
        const c = { email: emailInput.trim().toLowerCase(), password: pwInput };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
        setCreds(c);
      } else {
        setLoginErr("Credenciais inválidas");
      }
    } catch {
      setLoginErr("Erro ao entrar");
    } finally {
      setLoggingIn(false);
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setCreds(null);
  }

  async function markPaid(id: string) {
    if (!creds) return;
    if (!confirm("Marcar como PAGO manualmente?")) return;
    await supabase.functions.invoke("postscomia-admin", {
      body: { action: "mark_paid", id, ...creds },
    });
    refresh();
  }

  async function deleteOrder(id: string) {
    if (!creds) return;
    if (!confirm("Excluir esse pedido?")) return;
    await supabase.functions.invoke("postscomia-admin", {
      body: { action: "delete_order", id, ...creds },
    });
    refresh();
  }

  if (!creds) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md bg-gradient-to-b from-neutral-900 to-black border border-yellow-400/30 rounded-2xl p-8 shadow-[0_0_60px_rgba(250,204,21,0.15)]"
        >
          <div className="text-center mb-6">
            <div className="text-xs font-black tracking-widest text-yellow-400 mb-2">
              POSTSCOMIA / ADMIN
            </div>
            <h1 className="text-2xl font-black">Área Administrativa</h1>
          </div>
          <input
            type="email"
            placeholder="E-mail"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            required
            className="w-full mb-3 bg-black border border-neutral-800 focus:border-yellow-400/60 rounded-lg px-4 py-3 outline-none"
          />
          <input
            type="password"
            placeholder="Senha"
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            required
            className="w-full mb-3 bg-black border border-neutral-800 focus:border-yellow-400/60 rounded-lg px-4 py-3 outline-none"
          />
          {loginErr && <div className="text-red-400 text-sm mb-3">{loginErr}</div>}
          <button
            type="submit"
            disabled={loggingIn}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-black tracking-wide hover:shadow-[0_0_40px_rgba(250,204,21,0.4)] disabled:opacity-60"
          >
            {loggingIn ? "Entrando..." : "ENTRAR"}
          </button>
        </form>
      </div>
    );
  }

  const filtered = orders.filter((o) =>
    tab === "all" ? true : tab === "paid" ? o.status === "paid" : o.status === "pending"
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-neutral-900 sticky top-0 bg-black/80 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-black tracking-widest text-yellow-400">POSTSCOMIA</div>
            <h1 className="text-xl font-black">Painel Administrativo</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={loading}
              className="px-3 py-2 rounded-lg border border-neutral-800 hover:border-yellow-400/60 text-sm flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Atualizar
            </button>
            <button
              onClick={logout}
              className="px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-sm flex items-center gap-2 text-neutral-400"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={<Users className="w-4 h-4" />} label="Total pedidos" value={stats?.total ?? 0} />
          <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Pagos" value={stats?.paid ?? 0} color="text-green-400" />
          <StatCard icon={<Clock className="w-4 h-4" />} label="Pendentes" value={stats?.pending ?? 0} color="text-yellow-400" />
          <StatCard
            icon={<DollarSign className="w-4 h-4" />}
            label="Receita"
            value={`R$${(stats?.revenue ?? 0).toFixed(2)}`}
            color="text-yellow-400"
          />
        </div>

        {stats?.bumpCount ? (
          <div className="mb-4 p-3 rounded-lg bg-yellow-400/10 border border-yellow-400/30 text-sm text-yellow-200 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            {stats.bumpCount} clientes compraram o Orderbump (Atualizações Vitalícias)
          </div>
        ) : null}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(["all", "paid", "pending"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                tab === t
                  ? "bg-yellow-400 text-black"
                  : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
              }`}
            >
              {t === "all" ? "Todos" : t === "paid" ? "Pagos" : "Pendentes"}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-neutral-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-950 text-neutral-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Contato</th>
                  <th className="text-left px-4 py-3">Valor</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Data</th>
                  <th className="text-right px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-neutral-600">
                      Nenhum pedido {tab === "paid" ? "pago" : tab === "pending" ? "pendente" : ""} ainda.
                    </td>
                  </tr>
                )}
                {filtered.map((o) => (
                  <tr key={o.id} className="border-t border-neutral-900 hover:bg-neutral-950">
                    <td className="px-4 py-3">
                      <div className="font-bold">{o.name}</div>
                      <div className="text-neutral-500 text-xs">{o.nsu_order}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{o.email}</div>
                      {o.whatsapp && <div className="text-neutral-500 text-xs">{o.whatsapp}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-yellow-400">R${Number(o.amount).toFixed(2)}</div>
                      {o.orderbump && (
                        <div className="text-[10px] text-yellow-300 font-bold">+ BUMP</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-neutral-400 text-xs">
                      {new Date(o.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      {o.status === "pending" && (
                        <>
                          {o.infinitepay_link && (
                            <a
                              href={o.infinitepay_link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs"
                            >
                              Link
                            </a>
                          )}
                          <button
                            onClick={() => markPaid(o.id)}
                            className="inline-block px-2 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs"
                          >
                            Marcar pago
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteOrder(o.id)}
                        className="inline-flex items-center px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-900">
      <div className="flex items-center gap-2 text-neutral-500 text-xs mb-1">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-black ${color ?? "text-white"}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-green-500/15 text-green-400 border-green-500/30",
    pending: "bg-yellow-400/15 text-yellow-300 border-yellow-400/30",
    expired: "bg-neutral-700/30 text-neutral-400 border-neutral-700",
    cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${
        map[status] || map.pending
      }`}
    >
      {status.toUpperCase()}
    </span>
  );
}
