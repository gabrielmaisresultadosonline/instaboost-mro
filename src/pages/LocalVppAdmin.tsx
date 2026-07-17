import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, Save, Mail, Users, Laptop, XCircle, CheckCircle2, Send } from "lucide-react";

interface Lead {
  id: string;
  nome_completo: string;
  email: string | null;
  whatsapp: string;
  business_type: string;
  device_type: string;
  instagram: string | null;
  created_at: string;
}

const LocalVppAdmin = () => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [creds, setCreds] = useState({ email: "", password: "" });
  const [keepConnected, setKeepConnected] = useState(true);
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [settings, setSettings] = useState({
    whatsapp_group_link: "",
    aula_data: "20/07",
    aula_titulo: "",
    preco: 10,
  });
  const [testEmail, setTestEmail] = useState("");
  const [filter, setFilter] = useState<"all" | "com_maquina" | "sem_maquina">("all");

  useEffect(() => { document.title = "LocalVPP - Admin"; }, []);

  // Auto-login from saved session
  useEffect(() => {
    try {
      const saved = localStorage.getItem("localvpp_admin_auth");
      if (!saved) return;
      const parsed = JSON.parse(saved) as { email: string; password: string };
      if (parsed?.email && parsed?.password) {
        setCreds(parsed);
        (async () => {
          try {
            const { data, error } = await supabase.functions.invoke("localvpp-admin", {
              body: { action: "login", email: parsed.email, password: parsed.password },
            });
            if (error || !data?.success) throw new Error("invalid");
            setLoggedIn(true);
            // load initial data
            const s = await supabase.functions.invoke("localvpp-admin", {
              body: { action: "get_settings", email: parsed.email, password: parsed.password },
            });
            if (s.data?.settings) setSettings((prev) => ({ ...prev, ...s.data.settings }));
            const l = await supabase.functions.invoke("localvpp-admin", {
              body: { action: "list_leads", email: parsed.email, password: parsed.password },
            });
            if (l.data?.leads) setLeads(l.data.leads);
          } catch {
            localStorage.removeItem("localvpp_admin_auth");
          }
        })();
      }
    } catch {
      localStorage.removeItem("localvpp_admin_auth");
    }
  }, []);

  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("localvpp-admin", {
      body: { action, email: creds.email, password: creds.password, ...extra },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "erro");
    return data;
  };

  const refreshAll = async () => {
    try {
      const s = await call("get_settings");
      if (s.settings) setSettings((prev) => ({ ...prev, ...s.settings }));
      const l = await call("list_leads");
      setLeads(l.leads || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await call("login");
      setLoggedIn(true);
      if (keepConnected) {
        localStorage.setItem("localvpp_admin_auth", JSON.stringify(creds));
      } else {
        localStorage.removeItem("localvpp_admin_auth");
      }
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Credenciais inválidas");
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("localvpp_admin_auth");
    setLoggedIn(false);
    setCreds({ email: "", password: "" });
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      await call("save_settings", settings);
      toast.success("Configurações salvas!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally { setLoading(false); }
  };

  const sendTest = async () => {
    if (!testEmail.includes("@")) return toast.error("E-mail inválido");
    setLoading(true);
    try {
      await call("send_test_email", { test_email: testEmail });
      toast.success("E-mail de teste enviado!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally { setLoading(false); }
  };

  const resendLeadEmail = async (id: string) => {
    try {
      await call("resend_lead_email", { lead_id: id });
      toast.success("E-mail reenviado!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
          <CardHeader><CardTitle>LocalVPP - Admin</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label>E-mail</Label>
                <Input type="email" required value={creds.email} onChange={(e) => setCreds({ ...creds, email: e.target.value })} className="bg-slate-800 border-slate-700" />
              </div>
              <div>
                <Label>Senha</Label>
                <Input type="password" required value={creds.password} onChange={(e) => setCreds({ ...creds, password: e.target.value })} className="bg-slate-800 border-slate-700" />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={keepConnected}
                  onChange={(e) => setKeepConnected(e.target.checked)}
                  className="w-4 h-4 rounded accent-yellow-500"
                />
                Manter conectado neste dispositivo
              </label>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const total = leads.length;
  const comMaquina = leads.filter((l) => l.device_type !== "nenhum").length;
  const semMaquina = leads.filter((l) => l.device_type === "nenhum").length;

  const filtered = leads.filter((l) => {
    if (filter === "com_maquina") return l.device_type !== "nenhum";
    if (filter === "sem_maquina") return l.device_type === "nenhum";
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold">LocalVPP - Admin</h1>
          <Button onClick={refreshAll} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4"><div className="flex items-center gap-3"><Users className="w-8 h-8 text-blue-400" /><div><div className="text-xs text-gray-400">Total de cadastros</div><div className="text-2xl font-bold">{total}</div></div></div></CardContent></Card>
          <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4"><div className="flex items-center gap-3"><Laptop className="w-8 h-8 text-green-400" /><div><div className="text-xs text-gray-400">Com máquina</div><div className="text-2xl font-bold">{comMaquina}</div></div></div></CardContent></Card>
          <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4"><div className="flex items-center gap-3"><XCircle className="w-8 h-8 text-red-400" /><div><div className="text-xs text-gray-400">Sem máquina</div><div className="text-2xl font-bold">{semMaquina}</div></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="leads">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="leads">Cadastros</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Todos ({total})</Button>
              <Button size="sm" variant={filter === "com_maquina" ? "default" : "outline"} onClick={() => setFilter("com_maquina")}>Com máquina ({comMaquina})</Button>
              <Button size="sm" variant={filter === "sem_maquina" ? "default" : "outline"} onClick={() => setFilter("sem_maquina")}>Sem máquina ({semMaquina})</Button>
            </div>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50 text-xs uppercase text-gray-400">
                    <tr>
                      <th className="text-left px-4 py-3">Data</th>
                      <th className="text-left px-4 py-3">Nome</th>
                      <th className="text-left px-4 py-3">WhatsApp</th>
                      <th className="text-left px-4 py-3">E-mail</th>
                      <th className="text-left px-4 py-3">Negócio</th>
                      <th className="text-left px-4 py-3">Dispositivo</th>
                      <th className="text-left px-4 py-3">Instagram</th>
                      <th className="text-right px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Nenhum cadastro</td></tr>
                    )}
                    {filtered.map((l) => {
                      const noDevice = l.device_type === "nenhum";
                      return (
                        <tr key={l.id} className={`border-t border-slate-800 ${noDevice ? "bg-red-950/20" : ""}`}>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-400">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                          <td className="px-4 py-3 font-semibold">{l.nome_completo}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{l.whatsapp}</td>
                          <td className="px-4 py-3">{l.email || "—"}</td>
                          <td className="px-4 py-3 capitalize">{l.business_type}</td>
                          <td className="px-4 py-3">
                            {noDevice ? (
                              <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Sem máquina</Badge>
                            ) : (
                              <Badge className="bg-green-600 hover:bg-green-600 gap-1"><CheckCircle2 className="w-3 h-3" /> {l.device_type}</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">{l.instagram ? `@${l.instagram}` : "—"}</td>
                          <td className="px-4 py-3 text-right">
                            {!noDevice && l.email && (
                              <Button size="sm" variant="outline" onClick={() => resendLeadEmail(l.id)}>
                                <Send className="w-3 h-3 mr-1" /> Reenviar
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader><CardTitle className="text-lg">Grupo do WhatsApp</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Link do grupo do WhatsApp</Label>
                  <Input
                    placeholder="https://chat.whatsapp.com/..."
                    value={settings.whatsapp_group_link}
                    onChange={(e) => setSettings({ ...settings, whatsapp_group_link: e.target.value })}
                    className="bg-slate-800 border-slate-700 mt-1.5"
                  />
                  <p className="text-xs text-gray-400 mt-1">Este link é enviado no e-mail e mostrado no final do cadastro.</p>
                </div>
                <Button onClick={saveSettings} disabled={loading} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
                  <Save className="w-4 h-4 mr-2" /> Salvar
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Mail className="w-5 h-5" /> Testar envio de e-mail</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="bg-slate-800 border-slate-700"
                />
                <Button onClick={sendTest} disabled={loading} variant="outline">
                  <Send className="w-4 h-4 mr-2" /> Enviar e-mail de teste
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LocalVppAdmin;
