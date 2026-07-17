import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bot, LogOut, Plus, MessageSquare, Settings2 } from "lucide-react";

type Account = {
  id: string;
  name: string;
  plan: string;
  meta_waba_id: string | null;
  meta_phone_number_id: string | null;
  meta_access_token: string | null;
  meta_verify_token: string | null;
};

type Agent = {
  id: string;
  account_id: string;
  name: string;
  system_prompt: string;
  model: string;
  temperature: number;
  is_active: boolean;
};

export default function AgenteMROPainel() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [newAccountName, setNewAccountName] = useState("");

  useEffect(() => {
    document.title = "Painel — AgenteMRO";
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate("/agentemro");
    });
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate("/agentemro");
      setUserEmail(session.user.email ?? "");
      await loadAccounts();
      setLoading(false);
    })();
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const loadAccounts = async () => {
    const { data, error } = await supabase
      .from("agentemro_accounts")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) return toast.error(error.message);
    setAccounts(data ?? []);
    if (data && data.length > 0 && !activeAccount) {
      setActiveAccount(data[0]);
      loadAgents(data[0].id);
    }
  };

  const loadAgents = async (accountId: string) => {
    const { data, error } = await supabase
      .from("agentemro_agents")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: true });
    if (error) return toast.error(error.message);
    setAgents(data ?? []);
  };

  const createAccount = async () => {
    if (!newAccountName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("agentemro_accounts")
      .insert({ name: newAccountName.trim(), owner_user_id: user.id })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setNewAccountName("");
    toast.success("Conta criada");
    setAccounts([...accounts, data]);
    setActiveAccount(data);
    loadAgents(data.id);
  };

  const saveMetaConfig = async () => {
    if (!activeAccount) return;
    const { error } = await supabase
      .from("agentemro_accounts")
      .update({
        meta_waba_id: activeAccount.meta_waba_id,
        meta_phone_number_id: activeAccount.meta_phone_number_id,
        meta_access_token: activeAccount.meta_access_token,
        meta_verify_token: activeAccount.meta_verify_token,
      })
      .eq("id", activeAccount.id);
    if (error) return toast.error(error.message);
    toast.success("Configuração Meta salva");
  };

  const createAgent = async () => {
    if (!activeAccount) return;
    const { data, error } = await supabase
      .from("agentemro_agents")
      .insert({
        account_id: activeAccount.id,
        name: "Novo Agente",
        system_prompt: "Você é um atendente cordial e objetivo. Responda de forma clara e educada.",
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setAgents([...agents, data]);
    toast.success("Agente criado");
  };

  const updateAgent = async (id: string, patch: Partial<Agent>) => {
    const { error } = await supabase.from("agentemro_agents").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setAgents(agents.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/agentemro");
  };

  if (loading) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">AgenteMRO</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden md:inline">{userEmail}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {accounts.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Crie sua primeira conta</CardTitle>
              <CardDescription>Uma conta agrupa seus agentes, números e conversas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Nome da conta / empresa" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} />
              <Button onClick={createAccount} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Criar conta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-[240px_1fr]">
            <aside className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Contas</div>
              {accounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { setActiveAccount(a); loadAgents(a.id); }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    activeAccount?.id === a.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  {a.name}
                  <Badge variant="secondary" className="ml-2 text-[10px]">{a.plan}</Badge>
                </button>
              ))}
              <div className="pt-4 space-y-2">
                <Input placeholder="Nova conta" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} />
                <Button size="sm" variant="outline" onClick={createAccount} className="w-full">
                  <Plus className="w-4 h-4 mr-1" /> Nova
                </Button>
              </div>
            </aside>

            {activeAccount && (
              <section>
                <Tabs defaultValue="agents">
                  <TabsList>
                    <TabsTrigger value="agents"><Bot className="w-4 h-4 mr-2" />Agentes</TabsTrigger>
                    <TabsTrigger value="conversations"><MessageSquare className="w-4 h-4 mr-2" />Conversas</TabsTrigger>
                    <TabsTrigger value="settings"><Settings2 className="w-4 h-4 mr-2" />Meta / WhatsApp</TabsTrigger>
                  </TabsList>

                  <TabsContent value="agents" className="space-y-4 mt-4">
                    <div className="flex justify-end">
                      <Button onClick={createAgent}><Plus className="w-4 h-4 mr-2" />Novo agente</Button>
                    </div>
                    {agents.length === 0 && (
                      <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhum agente ainda.</CardContent></Card>
                    )}
                    {agents.map((ag) => (
                      <Card key={ag.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <Input
                              className="max-w-xs font-semibold"
                              value={ag.name}
                              onChange={(e) => setAgents(agents.map((a) => a.id === ag.id ? { ...a, name: e.target.value } : a))}
                              onBlur={(e) => updateAgent(ag.id, { name: e.target.value })}
                            />
                            <Badge variant={ag.is_active ? "default" : "secondary"}>{ag.is_active ? "Ativo" : "Pausado"}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <Label>Prompt do agente</Label>
                            <Textarea
                              rows={4}
                              value={ag.system_prompt}
                              onChange={(e) => setAgents(agents.map((a) => a.id === ag.id ? { ...a, system_prompt: e.target.value } : a))}
                              onBlur={(e) => updateAgent(ag.id, { system_prompt: e.target.value })}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Modelo</Label>
                              <Input
                                value={ag.model}
                                onChange={(e) => setAgents(agents.map((a) => a.id === ag.id ? { ...a, model: e.target.value } : a))}
                                onBlur={(e) => updateAgent(ag.id, { model: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>Temperatura</Label>
                              <Input
                                type="number" step="0.1" min="0" max="2"
                                value={ag.temperature}
                                onChange={(e) => setAgents(agents.map((a) => a.id === ag.id ? { ...a, temperature: Number(e.target.value) } : a))}
                                onBlur={(e) => updateAgent(ag.id, { temperature: Number(e.target.value) })}
                              />
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => updateAgent(ag.id, { is_active: !ag.is_active })}>
                            {ag.is_active ? "Pausar" : "Ativar"}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="conversations" className="mt-4">
                    <Card>
                      <CardContent className="py-10 text-center text-muted-foreground">
                        As conversas do WhatsApp aparecerão aqui após conectar a API da Meta.
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="settings" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>WhatsApp Cloud API (Meta)</CardTitle>
                        <CardDescription>Cole as credenciais oficiais do Meta Business.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label>WABA ID</Label>
                          <Input value={activeAccount.meta_waba_id ?? ""} onChange={(e) => setActiveAccount({ ...activeAccount, meta_waba_id: e.target.value })} />
                        </div>
                        <div>
                          <Label>Phone Number ID</Label>
                          <Input value={activeAccount.meta_phone_number_id ?? ""} onChange={(e) => setActiveAccount({ ...activeAccount, meta_phone_number_id: e.target.value })} />
                        </div>
                        <div>
                          <Label>Access Token permanente</Label>
                          <Input type="password" value={activeAccount.meta_access_token ?? ""} onChange={(e) => setActiveAccount({ ...activeAccount, meta_access_token: e.target.value })} />
                        </div>
                        <div>
                          <Label>Verify Token do webhook</Label>
                          <Input value={activeAccount.meta_verify_token ?? ""} onChange={(e) => setActiveAccount({ ...activeAccount, meta_verify_token: e.target.value })} />
                        </div>
                        <Button onClick={saveMetaConfig}>Salvar</Button>
                        <p className="text-xs text-muted-foreground pt-2">
                          Webhook URL: <code>{`${window.location.origin.replace(/^https?:\/\//, "https://")}/functions/v1/agentemro-webhook?account=${activeAccount.id}`}</code>
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
