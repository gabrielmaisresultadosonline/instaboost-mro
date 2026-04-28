import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdminLoggedIn, logoutAdmin } from '@/lib/adminConfig';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, 
  Settings, 
  Users, 
  Send, 
  GitBranch, 
  LogOut, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCcw,
  Bot
} from "lucide-react";
import { Logo } from "@/components/Logo";

const CRM = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings State
  const [metaSettings, setMetaSettings] = useState({
    meta_access_token: '',
    meta_phone_number_id: '',
    meta_waba_id: '',
    meta_app_id: '',
    meta_app_secret: '',
    initial_auto_response_enabled: true
  });

  // Flows State
  const [flows, setFlows] = useState<any[]>([]);
  
  // Contacts State
  const [contacts, setContacts] = useState<any[]>([]);
  
  // Broadcast State
  const [broadcast, setBroadcast] = useState({
    name: '',
    message_text: '',
    status: 'pending'
  });

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate('/crm/login');
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Settings
      const { data: settingsData } = await supabase
        .from('crm_settings')
        .select('*')
        .single();
      
      if (settingsData) {
        setMetaSettings(settingsData);
      }

      // Fetch Flows
      const { data: flowsData } = await supabase
        .from('crm_flows')
        .select('*, crm_flow_steps(*)');
      setFlows(flowsData || []);

      // Fetch Contacts
      const { data: contactsData } = await supabase
        .from('crm_contacts')
        .select('*')
        .order('last_interaction', { ascending: false });
      setContacts(contactsData || []);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro ao carregar dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('crm_settings')
        .update(metaSettings)
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;

      toast({
        title: "Configurações salvas!",
        description: "Suas credenciais Meta API foram atualizadas."
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Erro ao salvar",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    navigate('/crm/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCcw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <h1 className="text-xl font-bold font-display hidden md:block">Meta CRM Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 mt-8">
        <Tabs defaultValue="settings" className="space-y-6">
          <div className="flex overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <TabsList className="bg-card border w-full md:w-auto flex md:inline-flex">
              <TabsTrigger value="settings" className="flex-1 md:flex-none gap-2">
                <Settings className="w-4 h-4" /> Configurações
              </TabsTrigger>
              <TabsTrigger value="flows" className="flex-1 md:flex-none gap-2">
                <GitBranch className="w-4 h-4" /> Fluxos/Bots
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex-1 md:flex-none gap-2">
                <Users className="w-4 h-4" /> Contatos
              </TabsTrigger>
              <TabsTrigger value="broadcast" className="flex-1 md:flex-none gap-2">
                <Send className="w-4 h-4" /> Disparo em Massa
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Settings Content */}
          <TabsContent value="settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Credenciais Meta API</CardTitle>
                  <CardDescription>Configure os tokens da sua aplicação no Meta for Developers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Meta Access Token (Permanente)</Label>
                    <Input 
                      type="password" 
                      value={metaSettings.meta_access_token} 
                      onChange={e => setMetaSettings({...metaSettings, meta_access_token: e.target.value})}
                      placeholder="EAA..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number ID</Label>
                    <Input 
                      value={metaSettings.meta_phone_number_id} 
                      onChange={e => setMetaSettings({...metaSettings, meta_phone_number_id: e.target.value})}
                      placeholder="Identificador numérico"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>WABA ID (WhatsApp Business Account)</Label>
                    <Input 
                      value={metaSettings.meta_waba_id} 
                      onChange={e => setMetaSettings({...metaSettings, meta_waba_id: e.target.value})}
                    />
                  </div>
                  <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
                    {saving ? "Salvando..." : <><Save className="w-4 h-4 mr-2" /> Salvar Configurações</>}
                  </Button>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Automação Inicial</CardTitle>
                  <CardDescription>Comportamento quando um novo contato envia mensagem</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Resposta Automática Inicial</Label>
                      <p className="text-sm text-muted-foreground">Ativar resposta automática para novos contatos</p>
                    </div>
                    <Switch 
                      checked={metaSettings.initial_auto_response_enabled}
                      onCheckedChange={val => setMetaSettings({...metaSettings, initial_auto_response_enabled: val})}
                    />
                  </div>
                  
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" /> Webhook URL
                    </h3>
                    <p className="text-xs text-muted-foreground break-all bg-background p-2 rounded border">
                      https://adljdeekwifwcdcgbpit.supabase.co/functions/v1/meta-webhook
                    </p>
                    <div className="space-y-2">
                      <Label className="text-xs">Verify Token (Use no Meta Developer Portal)</Label>
                      <Input readOnly value={(metaSettings as any).webhook_verify_token || 'mro_token_verification'} className="h-8 text-xs font-mono" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Flows Content */}
          <TabsContent value="flows">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Fluxos de Mensagem</h2>
              <Button onClick={() => toast({ title: "Funcionalidade em desenvolvimento" })}>
                <Plus className="w-4 h-4 mr-2" /> Criar Fluxo
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {flows.length === 0 ? (
                <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl">
                  <GitBranch className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                  <p className="text-muted-foreground">Nenhum fluxo configurado ainda.</p>
                </div>
              ) : (
                flows.map(flow => (
                  <Card key={flow.id} className="glass-card overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{flow.name}</CardTitle>
                      <CardDescription>Gatilho: {flow.trigger_keyword || "Nenhum"}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        {flow.crm_flow_steps?.length || 0} passos configurados
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">Editar</Button>
                        <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Contacts Content */}
          <TabsContent value="contacts">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Base de Contatos</CardTitle>
                <CardDescription>Clientes que interagiram via WhatsApp</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {contacts.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        Nenhum contato sincronizado.
                      </div>
                    ) : (
                      contacts.map(contact => (
                        <div key={contact.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                              {contact.name?.charAt(0) || contact.wa_id.slice(-2)}
                            </div>
                            <div>
                              <p className="font-semibold">{contact.name || "Sem Nome"}</p>
                              <p className="text-xs text-muted-foreground">+{contact.wa_id}</p>
                            </div>
                          </div>
                          <div className="text-right text-xs">
                            <p className="text-muted-foreground">Última interação</p>
                            <p>{new Date(contact.last_interaction).toLocaleString()}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Broadcast Content */}
          <TabsContent value="broadcast">
            <Card className="glass-card max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Nova Campanha de Disparo</CardTitle>
                <CardDescription>Envie mensagens em massa com botões para seus contatos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Nome da Campanha</Label>
                  <Input 
                    value={broadcast.name} 
                    onChange={e => setBroadcast({...broadcast, name: e.target.value})}
                    placeholder="Ex: Promoção de Verão" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea 
                    value={broadcast.message_text} 
                    onChange={e => setBroadcast({...broadcast, message_text: e.target.value})}
                    placeholder="Olá! Temos uma novidade para você..." 
                    className="min-h-[150px]"
                  />
                  <p className="text-xs text-muted-foreground">Use {"{{name}}"} para personalizar com o nome do cliente.</p>
                </div>

                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Configurar Botões
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg bg-background flex items-center justify-between">
                      <span className="text-sm">Botão 1</span>
                      <Input placeholder="Texto do botão" className="h-8 w-32 text-xs" />
                    </div>
                    <Button variant="outline" className="border-dashed">
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Botão
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t flex flex-col gap-4">
                  <div className="flex justify-between items-center text-sm">
                    <span>Contatos selecionados: <strong className="text-primary">{contacts.length}</strong></span>
                    <Button variant="link" className="h-auto p-0">Filtrar contatos</Button>
                  </div>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700" 
                    size="lg"
                    disabled={!broadcast.message_text || contacts.length === 0}
                    onClick={() => toast({ title: "Disparo iniciado!", description: "As mensagens estão sendo processadas." })}
                  >
                    <Send className="w-4 h-4 mr-2" /> Iniciar Disparo em Massa
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CRM;