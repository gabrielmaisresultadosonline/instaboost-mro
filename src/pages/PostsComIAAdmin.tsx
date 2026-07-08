import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, LogOut, RefreshCw, CheckCircle2, Trash2, DollarSign, Users, Clock, TrendingUp, Mail, Video, Plus, Pencil, X, UploadCloud, BarChart3, Settings, UserPlus, Eye } from "lucide-react";
import HeroVideoVPSUploader from "@/components/HeroVideoVPSUploader";


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
  const [section, setSection] = useState<"orders" | "modules" | "settings" | "analytics">("orders");
  const [modules, setModules] = useState<any[]>([]);
  const [editingModule, setEditingModule] = useState<any | null>(null);
  const [settings, setSettings] = useState<any>({});
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [showManual, setShowManual] = useState(false);


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
      const [ordersR, statsR, modR, setR] = await Promise.all([
        supabase.functions.invoke("postscomia-admin", { body: { action: "list_orders", ...creds } }),
        supabase.functions.invoke("postscomia-admin", { body: { action: "stats", ...creds } }),
        supabase.functions.invoke("postscomia-admin", { body: { action: "list_modules", ...creds } }),
        supabase.functions.invoke("postscomia-admin", { body: { action: "get_settings" } }),
      ]);
      setOrders(ordersR.data?.orders || []);
      setStats(statsR.data || null);
      setModules(modR.data?.modules || []);
      setSettings(setR.data?.settings || {});
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics(days = analyticsDays) {
    if (!creds) return;
    const { data } = await supabase.functions.invoke("postscomia-admin", {
      body: { action: "analytics", days, ...creds },
    });
    setAnalytics(data);
  }

  async function saveSettings(next: any) {
    if (!creds) return;
    await supabase.functions.invoke("postscomia-admin", {
      body: { action: "save_settings", ...next, ...creds },
    });
    setSettings(next);
    alert("Configurações salvas!");
  }

  async function manualGrant(nm: string, em: string) {
    if (!creds) return;
    const { data, error } = await supabase.functions.invoke("postscomia-admin", {
      body: { action: "manual_grant", name: nm, email: em, ...creds },
    });
    if (error || !data?.success) {
      alert(data?.error || "Erro ao liberar acesso");
      return;
    }
    alert("Acesso liberado e e-mail enviado!");
    setShowManual(false);
    refresh();
  }

  async function resendCredentials(id: string) {
    if (!creds) return;
    if (!confirm("Reenviar credenciais de acesso (nova senha) por e-mail?")) return;
    await supabase.functions.invoke("postscomia-admin", {
      body: { action: "resend_credentials", id, ...creds },
    });
    alert("Credenciais enviadas!");
  }

  async function saveModule(m: any) {
    if (!creds) return;
    await supabase.functions.invoke("postscomia-admin", {
      body: { action: "save_module", module: m, ...creds },
    });
    setEditingModule(null);
    refresh();
  }

  async function deleteModule(id: string) {
    if (!creds) return;
    if (!confirm("Excluir esse módulo?")) return;
    await supabase.functions.invoke("postscomia-admin", {
      body: { action: "delete_module", id, ...creds },
    });
    refresh();
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
        {/* Section switcher */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {([
            { k: "orders", label: "Pedidos", icon: <Users className="w-4 h-4" /> },
            { k: "modules", label: `Módulos (${modules.length})`, icon: <Video className="w-4 h-4" /> },
            { k: "settings", label: "Vídeo Principal + Pixel", icon: <Settings className="w-4 h-4" /> },
            { k: "analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
          ] as const).map((s) => (
            <button
              key={s.k}
              onClick={() => {
                setSection(s.k);
                if (s.k === "analytics") loadAnalytics();
              }}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${
                section === s.k ? "bg-yellow-400 text-black" : "bg-neutral-900 text-neutral-400 border border-neutral-800"
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {section === "modules" ? (
          <ModulesPanel
            modules={modules}
            onNew={() => setEditingModule({ title: "", description: "", cover_url: "", video_url: "", order_index: modules.length, is_active: true })}
            onEdit={(m) => setEditingModule(m)}
            onDelete={deleteModule}
            creds={creds!}
          />
        ) : section === "settings" ? (
          <SettingsPanel settings={settings} onSave={saveSettings} creds={creds!} />
        ) : section === "analytics" ? (
          <AnalyticsPanel
            data={analytics}
            days={analyticsDays}
            onDays={(d) => { setAnalyticsDays(d); loadAnalytics(d); }}
            onRefresh={() => loadAnalytics()}
          />
        ) : (
        <>
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

        <div className="mb-4">
          <button
            onClick={() => setShowManual(true)}
            className="px-4 py-2 rounded-lg bg-yellow-400 text-black font-black text-sm flex items-center gap-2 hover:bg-yellow-300"
          >
            <UserPlus className="w-4 h-4" /> Liberar acesso manual
          </button>
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
                      {o.status === "paid" && (
                        <button
                          onClick={() => resendCredentials(o.id)}
                          className="inline-flex items-center px-2 py-1 rounded bg-yellow-400/15 text-yellow-300 hover:bg-yellow-400/25 text-xs gap-1"
                          title="Reenviar credenciais"
                        >
                          <Mail className="w-3 h-3" /> Enviar acesso
                        </button>
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
        </>
        )}
      </div>

      {editingModule && (
        <ModuleEditor
          module={editingModule}
          onClose={() => setEditingModule(null)}
          onSave={saveModule}
          creds={creds!}
        />
      )}
      {showManual && (
        <ManualGrantModal onClose={() => setShowManual(false)} onSave={manualGrant} />
      )}
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

function ModulesPanel({
  modules,
  onNew,
  onEdit,
  onDelete,
  creds,
}: {
  modules: any[];
  onNew: () => void;
  onEdit: (m: any) => void;
  onDelete: (id: string) => void;
  creds: { email: string; password: string };
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black">Módulos da Área de Membros</h2>
        <button
          onClick={onNew}
          className="px-4 py-2 rounded-lg bg-yellow-400 text-black font-black text-sm flex items-center gap-2 hover:bg-yellow-300"
        >
          <Plus className="w-4 h-4" /> Novo módulo
        </button>
      </div>
      {modules.length === 0 ? (
        <div className="p-10 rounded-xl border border-dashed border-neutral-800 text-center text-neutral-500 text-sm">
          Nenhum módulo cadastrado ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => (
            <div key={m.id} className="rounded-xl border border-neutral-900 bg-neutral-950 overflow-hidden">
              <div className="aspect-video bg-neutral-900 relative">
                {m.cover_url ? (
                  <img src={m.cover_url} alt={m.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-700">
                    <Video className="w-8 h-8" />
                  </div>
                )}
                {!m.is_active && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-500/70 text-white text-[10px] font-bold">
                    INATIVO
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="text-xs text-neutral-500 font-mono mb-1">#{m.order_index}</div>
                <h3 className="font-bold mb-1 truncate">{m.title}</h3>
                <p className="text-xs text-neutral-500 line-clamp-2 mb-3 h-8">{m.description || "—"}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(m)}
                    className="flex-1 px-2 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 text-xs flex items-center justify-center gap-1"
                  >
                    <Pencil className="w-3 h-3" /> Editar
                  </button>
                  <button
                    onClick={() => onDelete(m.id)}
                    className="px-2 py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleEditor({
  module: m,
  onClose,
  onSave,
  creds,
}: {
  module: any;
  onClose: () => void;
  onSave: (m: any) => void;
  creds: { email: string; password: string };
}) {
  const [form, setForm] = useState(m);
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-lg bg-neutral-950 border border-yellow-400/30 rounded-2xl p-6 my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-black">{m.id ? "Editar módulo" : "Novo módulo"}</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <Field label="Título">
            <input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Descrição">
            <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Capa do vídeo (imagem)">
            <UploadField
              kind="cover"
              accept="image/*"
              value={form.cover_url || ""}
              onChange={(url) => setForm({ ...form, cover_url: url })}
              creds={creds}
            />
          </Field>
          <Field label="Vídeo (MP4 recomendado - H.264)">
            <UploadField
              kind="video"
              accept="video/mp4,video/webm,video/quicktime"
              value={form.video_url || ""}
              onChange={(url) => setForm({ ...form, video_url: url })}
              creds={creds}
            />
            <p className="text-[10px] text-neutral-500 mt-1">Ou cole uma URL do YouTube. Recomendado MP4 H.264 (compatível com todos os aparelhos).</p>
          </Field>
          <div className="flex items-center gap-3">
            <Field label="Ordem">
              <input type="number" value={form.order_index ?? 0} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} className="w-24 bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm" />
            </Field>
            <label className="flex items-center gap-2 text-sm mt-6">
              <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Ativo
            </label>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-neutral-900 text-sm">Cancelar</button>
          <button onClick={() => onSave(form)} className="flex-1 px-4 py-2 rounded-lg bg-yellow-400 text-black font-black text-sm">Salvar</button>
        </div>
      </div>
    </div>
  );
}

function UploadField({
  kind,
  accept,
  value,
  onChange,
  creds,
}: {
  kind: "video" | "cover";
  accept: string;
  value: string;
  onChange: (url: string) => void;
  creds: { email: string; password: string };
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFile(file: File) {
    setUploading(true);
    setProgress(0);
    try {
      const { data, error } = await supabase.functions.invoke("postscomia-admin", {
        body: { action: "sign_upload", filename: file.name, kind, ...creds },
      });
      if (error || !data?.token) throw new Error(data?.error || "Erro ao autorizar upload");
      const { error: upErr } = await supabase.storage
        .from("assets")
        .uploadToSignedUrl(data.path, data.token, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      setProgress(100);
      onChange(data.public_url);
    } catch (e: any) {
      alert(e.message || "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono"
          placeholder="URL (upload ou cole aqui)"
        />
        <label className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${uploading ? "bg-neutral-800 text-neutral-500" : "bg-yellow-400 text-black hover:bg-yellow-300"}`}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
          {uploading ? `${progress}%` : "Upload"}
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {value && kind === "cover" && <img src={value} alt="preview" className="max-h-32 rounded border border-neutral-800" />}
      {value && kind === "video" && !value.includes("youtube") && !value.includes("youtu.be") && (
        <video src={value} controls className="max-h-40 w-full rounded border border-neutral-800 bg-black" />
      )}
    </div>
  );
}

function SettingsPanel({
  settings,
  onSave,
  creds,
}: {
  settings: any;
  onSave: (s: any) => void;
  creds: { email: string; password: string };
}) {
  const [form, setForm] = useState<any>(settings || {});
  useEffect(() => { setForm(settings || {}); }, [settings]);
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-lg font-black mb-1">Vídeo Principal da Landing</h2>
        <p className="text-xs text-neutral-500">
          Faça upload direto no servidor de vídeo. O transcoding HLS gera múltiplas qualidades (480p/720p/1080p)
          para tocar em todos os aparelhos e telas. Você também pode reiniciar o transcoding a qualquer momento.
        </p>
      </div>

      <div className="space-y-5 rounded-2xl border border-neutral-900 bg-neutral-950 p-5">
        <HeroVideoVPSUploader form={form} setForm={setForm} onSave={onSave} />

        <div className="pt-4 border-t border-neutral-900">
          <Field label="Capa (thumbnail) do vídeo principal">
            <UploadField kind="cover" accept="image/*" value={form.hero_video_poster || ""} onChange={(url) => setForm({ ...form, hero_video_poster: url })} creds={creds} />
          </Field>
        </div>

        <div className="pt-4 border-t border-neutral-900">
          <Field label="Facebook Pixel ID (conversão de compra)">
            <input
              value={form.fb_pixel_id || ""}
              onChange={(e) => setForm({ ...form, fb_pixel_id: e.target.value })}
              className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono"
              placeholder="123456789012345"
            />
            <p className="text-[10px] text-neutral-500 mt-1">Quando o pagamento for aprovado, o evento <b>Purchase</b> é disparado automaticamente.</p>
          </Field>
          <button
            onClick={() => onSave(form)}
            className="mt-4 w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 text-white font-bold text-sm hover:bg-neutral-800"
          >
            Salvar capa + Pixel
          </button>
        </div>
      </div>
    </div>
  );
}

function AnalyticsPanel({
  data,
  days,
  onDays,
  onRefresh,
}: {
  data: any;
  days: number;
  onDays: (d: number) => void;
  onRefresh: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-lg font-black">Analytics — últimos {days} dias</h2>
        <div className="flex gap-2 items-center">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => onDays(d)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${days === d ? "bg-yellow-400 text-black" : "bg-neutral-900 text-neutral-400 border border-neutral-800"}`}>{d}d</button>
          ))}
          <button onClick={onRefresh} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-900 text-neutral-300 border border-neutral-800 flex items-center gap-1"><RefreshCw className="w-3 h-3" /></button>
        </div>
      </div>

      {!data ? (
        <div className="p-10 text-center text-neutral-500 text-sm"><Loader2 className="w-6 h-6 animate-spin inline" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <StatCard icon={<Eye className="w-4 h-4" />} label="Visitas totais" value={data.page_visits ?? 0} color="text-yellow-400" />
            <StatCard icon={<Users className="w-4 h-4" />} label="Visitantes únicos" value={data.unique_visitors ?? 0} />
            <StatCard icon={<Video className="w-4 h-4" />} label="Vídeos rastreados" value={(data.videos || []).length} />
          </div>

          <h3 className="text-sm font-black uppercase tracking-widest text-neutral-500 mb-3">Vídeos assistidos</h3>
          {(data.videos || []).length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-neutral-800 text-center text-neutral-500 text-sm">
              Nenhum vídeo foi assistido ainda no período.
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-900 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-950 text-[10px] uppercase tracking-widest text-neutral-500">
                  <tr>
                    <th className="text-left p-3">Vídeo</th>
                    <th className="p-3">Play</th>
                    <th className="p-3">25%</th>
                    <th className="p-3">50%</th>
                    <th className="p-3">75%</th>
                    <th className="p-3">100%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.videos.map((v: any) => (
                    <tr key={v.video_id} className="border-t border-neutral-900">
                      <td className="p-3">
                        <div className="font-bold text-sm">{v.video_title}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">{v.video_id}</div>
                      </td>
                      <td className="p-3 text-center font-bold text-yellow-400">{v.starts}</td>
                      <td className="p-3 text-center">{v.p25}</td>
                      <td className="p-3 text-center">{v.p50}</td>
                      <td className="p-3 text-center">{v.p75}</td>
                      <td className="p-3 text-center font-bold text-green-400">{v.p100}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ManualGrantModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string, email: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-neutral-950 border border-yellow-400/30 rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black flex items-center gap-2"><UserPlus className="w-5 h-5 text-yellow-400" /> Liberar acesso manual</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-neutral-500 mb-4">Cria o acesso, marca o pedido como pago e envia o e-mail com senha automaticamente.</p>
        <div className="space-y-3">
          <Field label="Nome">
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm" placeholder="Nome do cliente" />
          </Field>
          <Field label="E-mail">
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm" placeholder="email@cliente.com" type="email" />
          </Field>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-neutral-900 text-sm">Cancelar</button>
          <button
            onClick={() => {
              if (!email.includes("@")) { alert("E-mail inválido"); return; }
              onSave(name || "Cliente", email.trim().toLowerCase());
            }}
            className="flex-1 px-4 py-2 rounded-lg bg-yellow-400 text-black font-black text-sm"
          >
            Liberar + Enviar e-mail
          </button>
        </div>
      </div>
    </div>
  );
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold tracking-widest uppercase text-neutral-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
