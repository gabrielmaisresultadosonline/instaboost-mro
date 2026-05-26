import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Lock, Save, Users, Link as LinkIcon, RefreshCw, Mail,
  Search, Building2, Package, Wrench, Smartphone, CheckCircle2, XCircle, TrendingUp,
  Send, Megaphone, History,
} from "lucide-react";
import { Logo } from "@/components/Logo";

const ADMIN_EMAIL = "mro@gmail.com";
const ADMIN_PASSWORD = "Ga145523@";

interface Lead {
  id: string;
  nome_completo: string;
  whatsapp: string;
  email: string;
  tem_empresa: string | null;
  vende_produto: string | null;
  presta_servico: string | null;
  iniciando_digital: string | null;
  marca_e_passa: string | null;
  dispositivo: string | null;
  email_confirmacao_enviado: boolean | null;
  created_at: string;
}

interface Settings {
  id: string;
  whatsapp_group_link: string;
  page_title: string | null;
  page_subtitle: string | null;
}

interface EmailLog {
  id: string;
  email_to: string;
  email_type: string;
  subject: string | null;
  status: string | null;
  created_at: string;
}

const perfilOf = (l: Lead) => {
  if (l.tem_empresa === "sim") return { label: "Tem empresa", icon: Building2 };
  if (l.vende_produto === "sim") return { label: "Vende produto", icon: Package };
  if (l.presta_servico === "sim") return { label: "Presta serviço", icon: Wrench };
  if (l.iniciando_digital === "sim") return { label: "Iniciando digital", icon: Smartphone };
  return { label: "—", icon: Users };
};

const DISPOSITIVO_LABELS: Record<string, string> = {
  celular: "Celular",
  computador: "Computador",
  notebook: "Notebook",
  nenhum: "Nenhum",
};
const dispositivoLabel = (v: string | null) => (v && DISPOSITIVO_LABELS[v]) || "—";

const EmpresasAdmin = () => {
  const [auth, setAuth] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [settings, setSettings] = useState<Settings | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("empresas-admin-auth") === "1") setAuth(true);
  }, []);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      sessionStorage.setItem("empresas-admin-auth", "1");
      setAuth(true);
    } else toast.error("Credenciais inválidas");
  };

  const logout = () => {
    sessionStorage.removeItem("empresas-admin-auth");
    setAuth(false);
  };

  const loadAll = async () => {
    setLoading(true);
    const [{ data: s }, { data: l }, { data: lg }] = await Promise.all([
      supabase.from("empresas_settings").select("*").limit(1).maybeSingle(),
      supabase.from("empresas_leads").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("empresas_email_logs").select("id,email_to,email_type,subject,status,created_at").order("created_at", { ascending: false }).limit(500),
    ]);
    setSettings(s as Settings | null);
    setLeads((l as Lead[]) || []);
    setLogs((lg as EmailLog[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (auth) loadAll(); }, [auth]);

  const saveSettings = async () => {
    if (!settings) return;
    const { error } = await supabase
      .from("empresas_settings")
      .update({
        whatsapp_group_link: settings.whatsapp_group_link,
        page_title: settings.page_title,
        page_subtitle: settings.page_subtitle,
      })
      .eq("id", settings.id);
    if (error) toast.error(error.message);
    else toast.success("Configurações salvas");
  };

  const [sending, setSending] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testName, setTestName] = useState("Teste");

  const sendBroadcast = async (
    campaign: "link_corrigido" | "remarketing",
    mode: "all" | "pending" | "test",
  ) => {
    const label = campaign === "link_corrigido" ? "Link Corrigido" : "Remarketing";

    const payload: Record<string, unknown> = { campaign };
    let audienceMsg = "";
    if (mode === "test") {
      const e = testEmail.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        toast.error("Informe um email de teste válido");
        return;
      }
      payload.test_email = e;
      payload.test_name = testName.trim() || "Teste";
      audienceMsg = `email de teste ${e}`;
    } else {
      payload.only_failed = mode === "pending";
      audienceMsg = mode === "pending" ? "apenas pendentes" : "TODOS os leads";
    }

    if (!confirm(`Enviar campanha "${label}" para ${audienceMsg}?`)) return;
    setSending(`${campaign}-${mode}`);
    const t = toast.loading(`Enviando ${label}...`);
    try {
      const { data, error } = await supabase.functions.invoke("empresas-broadcast", {
        body: payload,
      });
      toast.dismiss(t);
      if (error || !(data as any)?.success) {
        toast.error((data as any)?.error || error?.message || "Falha ao enviar");
      } else {
        const d = data as any;
        if (d.test) toast.success(`Email de teste enviado! (${d.sent} sucesso, ${d.failed} falha)`);
        else toast.success(`Enviados: ${d.sent} · Falhas: ${d.failed} · Total: ${d.total}`);
        if (mode !== "test") loadAll();
      }
    } catch (e) {
      toast.dismiss(t);
      toast.error(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setSending(null);
    }
  };

  if (!auth) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
        <div className="pointer-events-none fixed inset-0 opacity-30">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-yellow-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-yellow-400 text-black flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl">Admin · Empresas</h1>
              <p className="text-xs text-gray-500">Painel de gestão</p>
            </div>
          </div>
          <form onSubmit={login} className="space-y-4">
            <div>
              <Label className="text-gray-300">Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-white/[0.03] border-white/10 text-white focus-visible:ring-yellow-400/40 focus-visible:border-yellow-400"
              />
            </div>
            <div>
              <Label className="text-gray-300">Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 bg-white/[0.03] border-white/10 text-white focus-visible:ring-yellow-400/40 focus-visible:border-yellow-400"
              />
            </div>
            <Button type="submit" className="w-full h-11 bg-yellow-400 hover:bg-yellow-500 text-black font-bold">
              Entrar
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const total = leads.length;
  const enviados = leads.filter((l) => l.email_confirmacao_enviado).length;
  const hoje = leads.filter((l) => {
    const d = new Date(l.created_at);
    const n = new Date();
    return d.toDateString() === n.toDateString();
  }).length;
  const comEmpresa = leads.filter((l) => l.tem_empresa === "sim").length;

  const filtered = leads.filter((l) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      l.nome_completo?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.whatsapp?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-20">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-yellow-400/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur sticky top-0">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <div className="hidden sm:block">
              <div className="text-[11px] uppercase tracking-widest text-yellow-400 font-semibold">Admin</div>
              <div className="font-bold text-sm">/empresas</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadAll}
              disabled={loading}
              className="text-gray-300 hover:text-white hover:bg-white/5"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-gray-400 hover:text-white hover:bg-white/5"
            >
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard label="Total de leads" value={total} icon={Users} accent />
          <StatCard label="Cadastros hoje" value={hoje} icon={TrendingUp} />
          <StatCard label="Emails enviados" value={enviados} icon={Mail} />
          <StatCard label="Com empresa" value={comEmpresa} icon={Building2} />
        </div>

        <Tabs defaultValue="leads">
          <TabsList className="bg-[#111] border border-white/10 p-1 h-auto">
            <TabsTrigger
              value="leads"
              className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black text-gray-400 px-4 py-2"
            >
              <Users className="w-4 h-4 mr-2" /> Leads ({total})
            </TabsTrigger>
            <TabsTrigger
              value="campanhas"
              className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black text-gray-400 px-4 py-2"
            >
              <Megaphone className="w-4 h-4 mr-2" /> Campanhas
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black text-gray-400 px-4 py-2"
            >
              <History className="w-4 h-4 mr-2" /> Histórico ({logs.length})
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black text-gray-400 px-4 py-2"
            >
              <LinkIcon className="w-4 h-4 mr-2" /> Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="mt-5">
            <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-4 md:p-5 border-b border-white/10 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <h2 className="font-bold text-lg">Cadastros do grupo</h2>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Buscar nome, email ou WhatsApp..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9 bg-white/[0.03] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-yellow-400/40 focus-visible:border-yellow-400"
                  />
                </div>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-white/5">
                {filtered.length === 0 && (
                  <div className="p-8 text-center text-gray-500 text-sm">Nenhum cadastro.</div>
                )}
                {filtered.map((l) => {
                  const p = perfilOf(l);
                  return (
                    <div key={l.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{l.nome_completo}</div>
                          <div className="text-xs text-gray-400 truncate">{l.email}</div>
                          <div className="text-xs text-gray-500">{l.whatsapp}</div>
                        </div>
                        {l.email_confirmacao_enviado ? (
                          <Badge className="bg-yellow-400 text-black hover:bg-yellow-400 shrink-0">Enviado</Badge>
                        ) : (
                          <Badge variant="outline" className="border-white/20 text-gray-300 shrink-0">Pendente</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <p.icon className="w-3.5 h-3.5 text-yellow-400" />
                        {p.label}
                        <span className="ml-auto text-gray-600">
                          {new Date(l.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.02] text-gray-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold">Data</th>
                      <th className="text-left px-5 py-3 font-semibold">Nome</th>
                      <th className="text-left px-5 py-3 font-semibold">Email</th>
                      <th className="text-left px-5 py-3 font-semibold">WhatsApp</th>
                      <th className="text-left px-5 py-3 font-semibold">Perfil</th>
                      <th className="text-left px-5 py-3 font-semibold">Email enviado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((l) => {
                      const p = perfilOf(l);
                      return (
                        <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                            {new Date(l.created_at).toLocaleString("pt-BR")}
                          </td>
                          <td className="px-5 py-3 font-medium">{l.nome_completo}</td>
                          <td className="px-5 py-3 text-gray-300">{l.email}</td>
                          <td className="px-5 py-3 text-gray-300 whitespace-nowrap">{l.whatsapp}</td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1.5 text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                              <p.icon className="w-3 h-3 text-yellow-400" />
                              {p.label}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            {l.email_confirmacao_enviado ? (
                              <span className="inline-flex items-center gap-1 text-yellow-400 text-xs font-semibold">
                                <CheckCircle2 className="w-4 h-4" /> Enviado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-gray-500 text-xs">
                                <XCircle className="w-4 h-4" /> Pendente
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-gray-500 py-12 text-sm">
                          Nenhum cadastro encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="campanhas" className="mt-5 space-y-4">
            {/* Test email panel */}
            <div className="bg-[#111] border border-yellow-400/30 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
                  <Send className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-bold">Envio de teste</h3>
                  <p className="text-xs text-gray-400">Teste qualquer campanha em um email antes do disparo em massa.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <Label className="text-gray-300 text-xs">Email de teste</Label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="h-10 bg-white/[0.03] border-white/10 text-white focus-visible:ring-yellow-400/40 focus-visible:border-yellow-400"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Nome (opcional)</Label>
                  <Input
                    placeholder="Teste"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    className="h-10 bg-white/[0.03] border-white/10 text-white focus-visible:ring-yellow-400/40 focus-visible:border-yellow-400"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => sendBroadcast("link_corrigido", "test")}
                  disabled={sending !== null}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sending === "link_corrigido-test" ? "Enviando..." : "Testar Link Corrigido"}
                </Button>
                <Button
                  onClick={() => sendBroadcast("remarketing", "test")}
                  disabled={sending !== null}
                  variant="outline"
                  className="flex-1 border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10 hover:text-yellow-300"
                >
                  <Megaphone className="w-4 h-4 mr-2" />
                  {sending === "remarketing-test" ? "Enviando..." : "Testar Remarketing"}
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <CampaignCard
                title="Link Corrigido"
                description='Reenvio com mensagem: "Link corrigido MRO! Acesse o GRUPO." Ideal para quem teve problema com o link anterior.'
                badge="Reenvio"
                accent
                disabled={sending !== null}
                loading={sending === "link_corrigido-all" || sending === "link_corrigido-pending"}
                onSendAll={() => sendBroadcast("link_corrigido", "all")}
                onSendPending={() => sendBroadcast("link_corrigido", "pending")}
                pendingCount={leads.filter((l) => !l.email_confirmacao_enviado).length}
                totalCount={leads.length}
              />
              <CampaignCard
                title="Remarketing"
                description='Mensagem: "Não deixe de participar do nosso grupo." Com o link atual salvo nas configurações.'
                badge="Remarketing"
                disabled={sending !== null}
                loading={sending === "remarketing-all" || sending === "remarketing-pending"}
                onSendAll={() => sendBroadcast("remarketing", "all")}
                onSendPending={() => sendBroadcast("remarketing", "pending")}
                pendingCount={leads.filter((l) => !l.email_confirmacao_enviado).length}
                totalCount={leads.length}
              />
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Os emails usam o <span className="text-yellow-400 font-semibold">link do grupo</span> salvo na aba Configurações. Envio com pequeno delay anti-spam.
            </p>
          </TabsContent>

          <TabsContent value="historico" className="mt-5">
            <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-4 md:p-5 border-b border-white/10 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold text-lg">Histórico de envios</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Todos os emails enviados (confirmação, link corrigido e remarketing).</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 px-3 py-1 rounded-full font-semibold">
                    Confirmação: {logs.filter(x => x.email_type === "confirmacao").length}
                  </span>
                  <span className="bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 px-3 py-1 rounded-full font-semibold">
                    Link Corrigido: {logs.filter(x => x.email_type === "link_corrigido").length}
                  </span>
                  <span className="bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 px-3 py-1 rounded-full font-semibold">
                    Remarketing: {logs.filter(x => x.email_type === "remarketing").length}
                  </span>
                </div>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-white/5">
                {logs.length === 0 && (
                  <div className="p-8 text-center text-gray-500 text-sm">Nenhum envio registrado ainda.</div>
                )}
                {logs.map((log) => (
                  <div key={log.id} className="p-4 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm truncate">{log.email_to}</div>
                      {log.status === "sent" ? (
                        <Badge className="bg-yellow-400 text-black hover:bg-yellow-400 shrink-0 text-[10px]">Enviado</Badge>
                      ) : (
                        <Badge variant="outline" className="border-red-400/40 text-red-400 shrink-0 text-[10px]">Falhou</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="bg-white/5 border border-white/10 text-gray-300 px-2 py-0.5 rounded-full">
                        {log.email_type === "confirmacao" ? "Confirmação"
                          : log.email_type === "link_corrigido" ? "Link Corrigido"
                          : log.email_type === "remarketing" ? "Remarketing"
                          : log.email_type}
                      </span>
                      <span className="text-gray-500 ml-auto">{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.02] text-gray-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold">Data</th>
                      <th className="text-left px-5 py-3 font-semibold">Email</th>
                      <th className="text-left px-5 py-3 font-semibold">Tipo</th>
                      <th className="text-left px-5 py-3 font-semibold">Assunto</th>
                      <th className="text-left px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {logs.map((log) => {
                      const tipo = log.email_type === "confirmacao" ? "Confirmação"
                        : log.email_type === "link_corrigido" ? "Link Corrigido"
                        : log.email_type === "remarketing" ? "Remarketing"
                        : log.email_type;
                      return (
                        <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("pt-BR")}
                          </td>
                          <td className="px-5 py-3 text-gray-200">{log.email_to}</td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1.5 text-xs bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 px-2.5 py-1 rounded-full font-semibold">
                              {tipo}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-400 text-xs max-w-md truncate">{log.subject || "—"}</td>
                          <td className="px-5 py-3">
                            {log.status === "sent" ? (
                              <span className="inline-flex items-center gap-1 text-yellow-400 text-xs font-semibold">
                                <CheckCircle2 className="w-4 h-4" /> Enviado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-400 text-xs font-semibold">
                                <XCircle className="w-4 h-4" /> Falhou
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-gray-500 py-12 text-sm">
                          Nenhum envio registrado ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>



          <TabsContent value="settings" className="mt-5">
            <div className="bg-[#111] border border-white/10 rounded-2xl p-5 md:p-7 max-w-2xl">
              <h2 className="font-bold text-lg mb-1">Configurações da página</h2>
              <p className="text-sm text-gray-400 mb-6">
                Estas configurações afetam a página <span className="text-yellow-400 font-semibold">/empresas</span>.
              </p>

              {settings && (
                <div className="space-y-5">
                  <div>
                    <Label className="text-gray-300">Link do Grupo do WhatsApp</Label>
                    <Input
                      value={settings.whatsapp_group_link}
                      onChange={(e) => setSettings({ ...settings, whatsapp_group_link: e.target.value })}
                      placeholder="https://chat.whatsapp.com/..."
                      className="h-11 bg-white/[0.03] border-white/10 text-white focus-visible:ring-yellow-400/40 focus-visible:border-yellow-400"
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      Este link é enviado por email para todos os cadastrados.
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-300">Título da página</Label>
                    <Input
                      value={settings.page_title || ""}
                      onChange={(e) => setSettings({ ...settings, page_title: e.target.value })}
                      className="h-11 bg-white/[0.03] border-white/10 text-white focus-visible:ring-yellow-400/40 focus-visible:border-yellow-400"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Subtítulo</Label>
                    <Textarea
                      value={settings.page_subtitle || ""}
                      onChange={(e) => setSettings({ ...settings, page_subtitle: e.target.value })}
                      rows={3}
                      className="bg-white/[0.03] border-white/10 text-white focus-visible:ring-yellow-400/40 focus-visible:border-yellow-400"
                    />
                  </div>
                  <Button onClick={saveSettings} className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold">
                    <Save className="w-4 h-4 mr-2" /> Salvar configurações
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const StatCard = ({
  label, value, icon: Icon, accent,
}: { label: string; value: number; icon: typeof Users; accent?: boolean }) => (
  <div
    className={`rounded-2xl border p-4 md:p-5 ${
      accent
        ? "bg-gradient-to-br from-yellow-400/10 to-transparent border-yellow-400/30"
        : "bg-[#111] border-white/10"
    }`}
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">{label}</span>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
        accent ? "bg-yellow-400 text-black" : "bg-white/5 text-yellow-400"
      }`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div className="text-2xl md:text-3xl font-extrabold">{value}</div>
  </div>
);

const CampaignCard = ({
  title, description, badge, accent, disabled, loading,
  onSendAll, onSendPending, pendingCount, totalCount,
}: {
  title: string;
  description: string;
  badge: string;
  accent?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onSendAll: () => void;
  onSendPending: () => void;
  pendingCount: number;
  totalCount: number;
}) => (
  <div
    className={`rounded-2xl border p-5 md:p-6 ${
      accent
        ? "bg-gradient-to-br from-yellow-400/10 to-transparent border-yellow-400/30"
        : "bg-[#111] border-white/10"
    }`}
  >
    <div className="flex items-start justify-between mb-3 gap-3">
      <div>
        <h3 className="font-extrabold text-lg">{title}</h3>
        <Badge className="bg-yellow-400/15 text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400/15 mt-1.5">
          {badge}
        </Badge>
      </div>
      <div className="w-10 h-10 rounded-lg bg-yellow-400 text-black flex items-center justify-center shrink-0">
        <Send className="w-5 h-5" />
      </div>
    </div>
    <p className="text-sm text-gray-400 mb-5 leading-relaxed">{description}</p>
    <div className="flex flex-col sm:flex-row gap-2">
      <Button
        onClick={onSendAll}
        disabled={disabled || totalCount === 0}
        className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold disabled:opacity-50"
      >
        {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
        Enviar p/ todos ({totalCount})
      </Button>
      <Button
        onClick={onSendPending}
        disabled={disabled || pendingCount === 0}
        variant="outline"
        className="flex-1 border-white/15 bg-white/[0.02] text-white hover:bg-white/5 hover:text-white disabled:opacity-50"
      >
        Só pendentes ({pendingCount})
      </Button>
    </div>
  </div>
);

export default EmpresasAdmin;
