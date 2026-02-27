import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MessageCircle, Settings, BarChart3, Plus, Trash2, Send, Users, Bot,
  Heart, AtSign, Zap, RefreshCw, Eye, CheckCircle2, XCircle, Clock
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

async function api(action: string, data: Record<string, unknown> = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/mro-direct-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ action, ...data }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}

const typeLabels: Record<string, { label: string; icon: typeof MessageCircle; color: string }> = {
  dm_reply: { label: "Auto-Resposta DM", icon: MessageCircle, color: "bg-blue-500" },
  comment_reply: { label: "Resposta Comentário", icon: AtSign, color: "bg-green-500" },
  welcome_follower: { label: "Boas-vindas Seguidor", icon: Heart, color: "bg-pink-500" },
};

const MRODirectMais = () => {
  const [tab, setTab] = useState("dashboard");
  const [settings, setSettings] = useState<any>(null);
  const [automations, setAutomations] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [igInfo, setIgInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Settings form
  const [tokenInput, setTokenInput] = useState("");
  const [igIdInput, setIgIdInput] = useState("");
  const [isActive, setIsActive] = useState(false);

  // New automation form
  const [showNewAuto, setShowNewAuto] = useState(false);
  const [newType, setNewType] = useState("dm_reply");
  const [newMessage, setNewMessage] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [newPostId, setNewPostId] = useState("");
  const [newDelay, setNewDelay] = useState("0");

  // Test message
  const [testRecipient, setTestRecipient] = useState("");
  const [testMessage, setTestMessage] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, autoRes, statsRes] = await Promise.all([
        api("get-settings"),
        api("list-automations"),
        api("get-stats"),
      ]);
      setSettings(settingsRes.settings);
      setAutomations(autoRes.automations);
      setStats(statsRes.stats);
      if (settingsRes.settings) {
        setTokenInput(settingsRes.settings.page_access_token || "");
        setIgIdInput(settingsRes.settings.instagram_account_id || "");
        setIsActive(settingsRes.settings.is_active || false);
      }
    } catch (e: any) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadLogs = async () => {
    try {
      const res = await api("get-logs");
      setLogs(res.logs);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const loadIgInfo = async () => {
    try {
      const res = await api("get-ig-info");
      setIgInfo(res.info);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const saveSettings = async () => {
    try {
      await api("save-settings", {
        instagram_account_id: igIdInput,
        page_access_token: tokenInput,
        is_active: isActive,
      });
      toast.success("Configurações salvas!");
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const createAutomation = async () => {
    if (!newMessage.trim()) return toast.error("Mensagem é obrigatória");
    try {
      await api("create-automation", {
        automation_type: newType,
        reply_message: newMessage,
        trigger_keywords: newKeywords ? newKeywords.split(",").map((k) => k.trim()) : [],
        target_post_id: newPostId || null,
        delay_seconds: parseInt(newDelay) || 0,
      });
      toast.success("Automação criada!");
      setShowNewAuto(false);
      setNewMessage("");
      setNewKeywords("");
      setNewPostId("");
      setNewDelay("0");
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleAutomation = async (id: string, active: boolean) => {
    try {
      await api("toggle-automation", { id, is_active: active });
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteAutomation = async (id: string) => {
    if (!confirm("Tem certeza?")) return;
    try {
      await api("delete-automation", { id });
      toast.success("Automação removida");
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const sendTest = async () => {
    if (!testRecipient || !testMessage) return toast.error("Preencha todos os campos");
    try {
      await api("send-test-message", { recipient_id: testRecipient, message: testMessage });
      toast.success("Mensagem de teste enviada!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const webhookUrl = `${SUPABASE_URL}/functions/v1/mro-direct-webhook`;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/60 via-gray-950 to-pink-900/40 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2.5 rounded-xl">
              <Bot className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                MRO Direct+
              </h1>
              <p className="text-sm text-gray-400">Automação de DMs via Instagram Graph API</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-600" : ""}>
                {isActive ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-gray-900 border border-white/10 mb-6">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-purple-600">
              <BarChart3 className="h-4 w-4 mr-1" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="automations" className="data-[state=active]:bg-purple-600">
              <Zap className="h-4 w-4 mr-1" /> Automações
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-purple-600" onClick={loadLogs}>
              <Eye className="h-4 w-4 mr-1" /> Logs
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-purple-600">
              <Settings className="h-4 w-4 mr-1" /> Config
            </TabsTrigger>
          </TabsList>

          {/* ── DASHBOARD ── */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {[
                { label: "Mensagens Hoje", value: stats?.todaySent || 0, icon: Send, color: "text-blue-400" },
                { label: "Esta Semana", value: stats?.weekSent || 0, icon: BarChart3, color: "text-purple-400" },
                { label: "Total Enviadas", value: stats?.totalSent || 0, icon: MessageCircle, color: "text-green-400" },
                { label: "Automações Ativas", value: stats?.activeAutomations || 0, icon: Zap, color: "text-yellow-400" },
                { label: "Erros", value: stats?.errors || 0, icon: XCircle, color: "text-red-400" },
              ].map((s, i) => (
                <Card key={i} className="bg-gray-900 border-white/10">
                  <CardContent className="p-4 text-center">
                    <s.icon className={`h-6 w-6 mx-auto mb-2 ${s.color}`} />
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Instagram Profile Info */}
            <Card className="bg-gray-900 border-white/10 mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white text-lg">Perfil Conectado</CardTitle>
                <Button size="sm" variant="outline" onClick={loadIgInfo} className="border-white/20 text-white">
                  <RefreshCw className="h-4 w-4 mr-1" /> Verificar
                </Button>
              </CardHeader>
              <CardContent>
                {igInfo ? (
                  <div className="flex items-center gap-4">
                    {igInfo.profile_picture_url && (
                      <img src={igInfo.profile_picture_url} className="h-14 w-14 rounded-full" alt="" />
                    )}
                    <div>
                      <p className="font-bold text-white">@{igInfo.username || igInfo.name}</p>
                      <p className="text-sm text-gray-400">ID: {igInfo.id}</p>
                      {igInfo.followers_count != null && (
                        <p className="text-sm text-gray-400">{igInfo.followers_count.toLocaleString()} seguidores</p>
                      )}
                    </div>
                    <Badge className="bg-green-600 ml-auto">Conectado</Badge>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Clique em "Verificar" para testar a conexão com o token.</p>
                )}
              </CardContent>
            </Card>

            {/* Send Test */}
            <Card className="bg-gray-900 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Send className="h-5 w-5 text-purple-400" /> Enviar Mensagem Teste
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="IGSID do destinatário (ex: 123456789)"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="bg-gray-800 border-white/10 text-white"
                />
                <Textarea
                  placeholder="Mensagem de teste..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="bg-gray-800 border-white/10 text-white"
                />
                <Button onClick={sendTest} className="bg-purple-600 hover:bg-purple-700">
                  <Send className="h-4 w-4 mr-2" /> Enviar Teste
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── AUTOMATIONS ── */}
          <TabsContent value="automations">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Automações Configuradas</h2>
              <Dialog open={showNewAuto} onOpenChange={setShowNewAuto}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-4 w-4 mr-2" /> Nova Automação
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-white/10 text-white max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Criar Automação</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Tipo</label>
                      <Select value={newType} onValueChange={setNewType}>
                        <SelectTrigger className="bg-gray-800 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-white/10 text-white">
                          <SelectItem value="dm_reply">Auto-Resposta DM</SelectItem>
                          <SelectItem value="comment_reply">Resposta a Comentário</SelectItem>
                          <SelectItem value="welcome_follower">Boas-vindas Seguidor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Mensagem de Resposta *</label>
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Olá! Obrigado por entrar em contato..."
                        className="bg-gray-800 border-white/10 text-white"
                        rows={4}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">
                        Palavras-chave (separadas por vírgula, vazio = todas)
                      </label>
                      <Input
                        value={newKeywords}
                        onChange={(e) => setNewKeywords(e.target.value)}
                        placeholder="preço, promoção, desconto"
                        className="bg-gray-800 border-white/10 text-white"
                      />
                    </div>
                    {newType === "comment_reply" && (
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">
                          ID do Post (vazio = todos os posts)
                        </label>
                        <Input
                          value={newPostId}
                          onChange={(e) => setNewPostId(e.target.value)}
                          placeholder="ID do post no Instagram"
                          className="bg-gray-800 border-white/10 text-white"
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Atraso (segundos)</label>
                      <Input
                        type="number"
                        value={newDelay}
                        onChange={(e) => setNewDelay(e.target.value)}
                        className="bg-gray-800 border-white/10 text-white w-32"
                      />
                    </div>
                    <Button onClick={createAutomation} className="w-full bg-purple-600 hover:bg-purple-700">
                      Criar Automação
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {automations.length === 0 ? (
              <Card className="bg-gray-900 border-white/10">
                <CardContent className="p-12 text-center">
                  <Bot className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">Nenhuma automação criada ainda</p>
                  <p className="text-gray-500 text-sm">Clique em "Nova Automação" para começar</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {automations.map((auto) => {
                  const info = typeLabels[auto.automation_type] || typeLabels.dm_reply;
                  const Icon = info.icon;
                  return (
                    <Card key={auto.id} className="bg-gray-900 border-white/10">
                      <CardContent className="p-4 flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${info.color}`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white">{info.label}</span>
                            <Badge variant={auto.is_active ? "default" : "secondary"} className={auto.is_active ? "bg-green-600" : ""}>
                              {auto.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-300 mb-1 line-clamp-2">"{auto.reply_message}"</p>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                            {auto.trigger_keywords?.length > 0 && (
                              <span>Keywords: {auto.trigger_keywords.join(", ")}</span>
                            )}
                            {auto.delay_seconds > 0 && <span>Delay: {auto.delay_seconds}s</span>}
                            {auto.target_post_id && <span>Post: {auto.target_post_id}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={auto.is_active}
                            onCheckedChange={(v) => toggleAutomation(auto.id, v)}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteAutomation(auto.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── LOGS ── */}
          <TabsContent value="logs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Histórico de Mensagens</h2>
              <Button size="sm" variant="outline" onClick={loadLogs} className="border-white/20 text-white">
                <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
              </Button>
            </div>
            {logs.length === 0 ? (
              <Card className="bg-gray-900 border-white/10">
                <CardContent className="p-12 text-center">
                  <Clock className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">Nenhum log ainda</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <Card key={log.id} className="bg-gray-900 border-white/10">
                    <CardContent className="p-3 flex items-center gap-3">
                      {log.status === "sent" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs border-white/20 text-gray-300">
                            {log.event_type}
                          </Badge>
                          {log.sender_username && (
                            <span className="text-xs text-gray-400">@{log.sender_username}</span>
                          )}
                          <span className="text-xs text-gray-500 ml-auto">
                            {new Date(log.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 truncate mt-1">{log.message_sent}</p>
                        {log.error_message && (
                          <p className="text-xs text-red-400 mt-1">{log.error_message}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── SETTINGS ── */}
          <TabsContent value="settings">
            <div className="max-w-2xl space-y-6">
              <Card className="bg-gray-900 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Configurações da API</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Instagram Account ID (IGSID)</label>
                    <Input
                      value={igIdInput}
                      onChange={(e) => setIgIdInput(e.target.value)}
                      placeholder="Ex: 17841400123456789"
                      className="bg-gray-800 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Page Access Token</label>
                    <Textarea
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="Token de acesso da página..."
                      className="bg-gray-800 border-white/10 text-white font-mono text-xs"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                    <label className="text-sm text-gray-300">Sistema ativo (receber e responder webhooks)</label>
                  </div>
                  <Button onClick={saveSettings} className="bg-purple-600 hover:bg-purple-700 w-full">
                    Salvar Configurações
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Webhook do Instagram</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Callback URL</label>
                    <div className="flex items-center gap-2">
                      <Input value={webhookUrl} readOnly className="bg-gray-800 border-white/10 text-white font-mono text-xs" />
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(webhookUrl);
                          toast.success("URL copiada!");
                        }}
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Verify Token</label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={settings?.webhook_verify_token || ""}
                        readOnly
                        className="bg-gray-800 border-white/10 text-white font-mono text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(settings?.webhook_verify_token || "");
                          toast.success("Token copiado!");
                        }}
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Use esses valores no Facebook Developer → Webhooks → Instagram para configurar
                    os eventos de <strong>messages</strong>, <strong>comments</strong> e <strong>messaging_optins</strong>.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MRODirectMais;
