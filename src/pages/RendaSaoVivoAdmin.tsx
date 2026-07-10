import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, Send, Save, Mail, Eye, DollarSign, Users, Upload } from "lucide-react";

interface Order {
  id: string; nome_completo: string; email: string; whatsapp: string;
  amount: number; status: string; email_sent: boolean;
  created_at: string; paid_at: string | null; nsu_order: string;
}

const RendaSaoVivoAdmin = () => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [creds, setCreds] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const [settings, setSettings] = useState({
    whatsapp_group_link: "", aula_data: "18/07",
    aula_titulo: "Aula Ao Vivo - Renda Ao Vivo", preco: 19,
    hero_video_url: "", hero_video_hls_url: "",
  });
  const [uploading, setUploading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [visitsTotal, setVisitsTotal] = useState(0);
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => { document.title = "Admin - Renda Ao Vivo"; }, []);

  const call = async (action: string, extra: any = {}) => {
    const { data, error } = await supabase.functions.invoke("rendasaovivo-admin", {
      body: { action, email: creds.email, password: creds.password, ...extra },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "erro");
    return data;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await call("login");
      setLoggedIn(true);
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally { setLoading(false); }
  };

  const refreshAll = async () => {
    try {
      const s = await call("get_settings");
      if (s.settings) setSettings(s.settings);
      const o = await call("list_orders");
      setOrders(o.orders || []);
      const v = await call("list_visits");
      setVisits(v.visits || []);
      setVisitsTotal(v.total || 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar");
    }
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

  const handleVideoUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) return toast.error("Máximo 500MB");
    setUploading(true);
    try {
      const path = `rendasaovivo/hero_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      // Upload direto do browser para o Storage (evita limite de CPU do edge function)
      const { error: upErr } = await supabase.storage
        .from("assets")
        .upload(path, file, {
          contentType: file.type || "video/mp4",
          upsert: true,
          cacheControl: "3600",
        });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("assets").getPublicUrl(path);
      const newSettings = { ...settings, hero_video_url: pub.publicUrl };
      setSettings(newSettings);
      await call("save_settings", newSettings);
      toast.success("Vídeo enviado e publicado automaticamente!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally { setUploading(false); }
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

  const resendEmail = async (order_id: string) => {
    try {
      await call("resend_email", { order_id });
      toast.success("E-mail reenviado!");
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
          <CardHeader><CardTitle>Admin - Renda Ao Vivo</CardTitle></CardHeader>
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
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const paidOrders = orders.filter((o) => o.status === "paid");
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const revenue = paidOrders.reduce((s, o) => s + Number(o.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold">Renda Ao Vivo - Admin</h1>
          <Button onClick={refreshAll} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4"><div className="flex items-center gap-3"><Users className="w-8 h-8 text-blue-400" /><div><div className="text-xs text-gray-400">Visitas</div><div className="text-2xl font-bold">{visitsTotal}</div></div></div></CardContent></Card>
          <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4"><div className="flex items-center gap-3"><Eye className="w-8 h-8 text-yellow-400" /><div><div className="text-xs text-gray-400">Pendentes</div><div className="text-2xl font-bold">{pendingOrders.length}</div></div></div></CardContent></Card>
          <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4"><div className="flex items-center gap-3"><Mail className="w-8 h-8 text-green-400" /><div><div className="text-xs text-gray-400">Pagos</div><div className="text-2xl font-bold">{paidOrders.length}</div></div></div></CardContent></Card>
          <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4"><div className="flex items-center gap-3"><DollarSign className="w-8 h-8 text-emerald-400" /><div><div className="text-xs text-gray-400">Receita</div><div className="text-2xl font-bold">R$ {revenue.toFixed(0)}</div></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="orders">
          <TabsList className="bg-slate-900">
            <TabsTrigger value="orders">Vendas</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
            <TabsTrigger value="test">Teste de E-mail</TabsTrigger>
            <TabsTrigger value="visits">Visitas</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader><CardTitle>Pedidos ({orders.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-gray-400 border-b border-slate-800">
                      <tr><th className="p-2">Data</th><th className="p-2">Nome</th><th className="p-2">E-mail</th><th className="p-2">WhatsApp</th><th className="p-2">Valor</th><th className="p-2">Status</th><th className="p-2">E-mail</th><th className="p-2">Ações</th></tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id} className="border-b border-slate-800/50">
                          <td className="p-2 text-xs">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                          <td className="p-2">{o.nome_completo}</td>
                          <td className="p-2 text-xs">{o.email}</td>
                          <td className="p-2 text-xs">{o.whatsapp}</td>
                          <td className="p-2">R$ {Number(o.amount).toFixed(0)}</td>
                          <td className="p-2"><Badge variant={o.status === "paid" ? "default" : "secondary"} className={o.status === "paid" ? "bg-green-600" : ""}>{o.status}</Badge></td>
                          <td className="p-2">{o.email_sent ? "✅" : "—"}</td>
                          <td className="p-2">
                            {o.status === "paid" && (
                              <Button size="sm" variant="outline" onClick={() => resendEmail(o.id)}>
                                <Send className="w-3 h-3 mr-1" /> Reenviar
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {orders.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-gray-500">Nenhum pedido ainda</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader><CardTitle>Configurações</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Link do grupo do WhatsApp (será enviado por email)</Label>
                  <Input value={settings.whatsapp_group_link} onChange={(e) => setSettings({ ...settings, whatsapp_group_link: e.target.value })} placeholder="https://chat.whatsapp.com/..." className="bg-slate-800 border-slate-700 mt-1" />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Data da aula</Label>
                    <Input value={settings.aula_data} onChange={(e) => setSettings({ ...settings, aula_data: e.target.value })} className="bg-slate-800 border-slate-700 mt-1" />
                  </div>
                  <div>
                    <Label>Título</Label>
                    <Input value={settings.aula_titulo} onChange={(e) => setSettings({ ...settings, aula_titulo: e.target.value })} className="bg-slate-800 border-slate-700 mt-1" />
                  </div>
                  <div>
                    <Label>Preço (R$)</Label>
                    <Input type="number" value={settings.preco} onChange={(e) => setSettings({ ...settings, preco: Number(e.target.value) })} className="bg-slate-800 border-slate-700 mt-1" />
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <div>
                    <Label className="text-yellow-400">Vídeo do Hero (página /rendasaovivo)</Label>
                    <p className="text-xs text-gray-400 mt-1">
                      Envie um MP4 (até 100MB). O vídeo será servido via CDN com <b>range requests</b> (streaming progressivo), começando em qualidade baixa e melhorando conforme a conexão — sem travar. Para transcoding adaptativo (HLS), cole a URL <code>.m3u8</code> no campo abaixo.
                    </p>
                  </div>
                  <div className="flex flex-col md:flex-row gap-3">
                    <label className="inline-flex">
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])}
                      />
                      <span className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-sm font-medium cursor-pointer ${uploading ? "bg-slate-700 text-gray-400" : "bg-yellow-500 hover:bg-yellow-400 text-black"}`}>
                        {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><Upload className="w-4 h-4" /> Enviar novo vídeo</>}
                      </span>
                    </label>
                  </div>
                  <div>
                    <Label>URL do vídeo MP4</Label>
                    <Input value={settings.hero_video_url} onChange={(e) => setSettings({ ...settings, hero_video_url: e.target.value })} placeholder="https://... .mp4" className="bg-slate-800 border-slate-700 mt-1 font-mono text-xs" />
                  </div>
                  <div>
                    <Label>URL HLS (adaptativo, opcional) — evita travas em qualquer conexão</Label>
                    <Input value={settings.hero_video_hls_url} onChange={(e) => setSettings({ ...settings, hero_video_hls_url: e.target.value })} placeholder="https://... .m3u8" className="bg-slate-800 border-slate-700 mt-1 font-mono text-xs" />
                  </div>
                  {settings.hero_video_url && (
                    <video src={settings.hero_video_url} controls className="w-full max-w-md rounded-md border border-slate-800" />
                  )}
                </div>

                <Button onClick={saveSettings} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" /> Salvar
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader><CardTitle>Enviar e-mail de teste</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-400">Usa as configurações atuais (link do grupo, data da aula).</p>
                <div>
                  <Label>E-mail de destino</Label>
                  <Input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="voce@email.com" className="bg-slate-800 border-slate-700 mt-1" />
                </div>
                <Button onClick={sendTest} disabled={loading}>
                  <Send className="w-4 h-4 mr-2" /> Enviar teste
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visits">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader><CardTitle>Visitas recentes (total: {visitsTotal})</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-xs">
                    <thead className="text-left text-gray-400 border-b border-slate-800">
                      <tr><th className="p-2">Data</th><th className="p-2">Referrer</th><th className="p-2">User Agent</th></tr>
                    </thead>
                    <tbody>
                      {visits.map((v) => (
                        <tr key={v.id} className="border-b border-slate-800/50">
                          <td className="p-2">{new Date(v.created_at).toLocaleString("pt-BR")}</td>
                          <td className="p-2">{v.referrer || "—"}</td>
                          <td className="p-2 truncate max-w-[300px]">{v.user_agent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RendaSaoVivoAdmin;
