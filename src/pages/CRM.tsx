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
  Bot,
  BarChart3,
  CheckCircle2,
  XCircle,
  Mic,
  DollarSign,
  TrendingUp,
  Filter,
  FileUp
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const CRM = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings State
  const [metaSettings, setMetaSettings] = useState<any>({
    meta_access_token: '',
    meta_phone_number_id: '',
    meta_waba_id: '',
    openai_api_key: '',
    ai_agent_enabled: false,
    ai_agent_trigger: 'first_message',
    initial_auto_response_enabled: true,
    initial_response_text: '',
    initial_response_buttons: []
  });

  // Analytics State
  const [metrics, setMetrics] = useState<any>({
    sent_count: 0,
    responded_count: 0,
    qualified_count: 0,
    sales_count: 0
  });

  // Flows State
  const [flows, setFlows] = useState<any[]>([]);
  
  // Contacts State
  const [contacts, setContacts] = useState<any[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Broadcast State
  const [broadcast, setBroadcast] = useState({
    name: '',
    message_text: '',
    status: 'pending'
  });

  // Chat State
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate('/crm/login');
      return;
    }
    fetchData();
  }, [navigate]);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredContacts(contacts);
    } else {
      setFilteredContacts(contacts.filter(c => c.status === statusFilter));
    }
  }, [statusFilter, contacts]);

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

      // Fetch Metrics (Current day)
      const { data: metricsData } = await supabase
        .from('crm_metrics')
        .select('*')
        .eq('date', new Date().toISOString().split('T')[0])
        .single();
      
      if (metricsData) {
        setMetrics(metricsData);
      } else {
        // Fallback: sum from contacts
        const { data: contactsSummary } = await supabase
          .from('crm_contacts')
          .select('status, is_qualified, sale_closed, total_messages_sent, total_messages_received');
        
        const summary = (contactsSummary || []).reduce((acc: any, curr: any) => {
          acc.sent += curr.total_messages_sent || 0;
          if (curr.total_messages_received > 0) acc.responded += 1;
          if (curr.is_qualified) acc.qualified += 1;
          if (curr.sale_closed) acc.sales += 1;
          return acc;
        }, { sent: 0, responded: 0, qualified: 0, sales: 0 });

        setMetrics({
          sent_count: summary.sent,
          responded_count: summary.responded,
          qualified_count: summary.qualified,
          sales_count: summary.sales
        });
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
      const { id, created_at, updated_at, webhook_verify_token, ...updatableSettings } = metaSettings;
      
      const { error } = await supabase
        .from('crm_settings')
        .update(updatableSettings)
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;

      toast({
        title: "Configurações salvas!",
        description: "Suas credenciais e parâmetros de IA foram atualizados."
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

  const updateContactStatus = async (contactId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('crm_contacts')
        .update(updates)
        .eq('id', contactId);
      
      if (error) throw error;
      
      setContacts(contacts.map(c => c.id === contactId ? { ...c, ...updates } : c));
      toast({ title: "Status atualizado!" });
      
      // Update local metrics if status changed
      fetchData();
    } catch (err) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const fetchMessages = async (contactId: string) => {
    try {
      const { data, error } = await supabase
        .from('crm_messages')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setChatMessages(data || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || sendingMessage) return;
    
    setSendingMessage(true);
    try {
      // 1. Send via Edge Function
      const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: {
          action: 'sendMessage',
          to: selectedContact.wa_id,
          text: newMessage
        }
      });

      if (error) throw error;

      // 2. Refresh messages
      await fetchMessages(selectedContact.id);
      setNewMessage('');
    } catch (err) {
      console.error("Error sending message:", err);
      toast({ title: "Erro ao enviar", variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  const openChat = (contact: any) => {
    setSelectedContact(contact);
    fetchMessages(contact.id);
  };

  const handleVCardImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const cards = text.split('BEGIN:VCARD');
      const contactsToUpsert: any[] = [];

      cards.forEach(card => {
        if (!card.trim()) return;
        
        // Extract Name (FN or N)
        let name = '';
        const fnMatch = card.match(/FN:(.*)/);
        if (fnMatch) {
          name = fnMatch[1].trim();
        } else {
          const nMatch = card.match(/N:(.*)/);
          if (nMatch) {
            name = nMatch[1].replace(/;/g, ' ').trim();
          }
        }

        // Extract Phone (TEL)
        const telMatches = card.matchAll(/TEL.*:(.*)/g);
        for (const match of telMatches) {
          let phone = match[1].replace(/\D/g, ''); // Keep only digits
          if (phone.length >= 10) {
            // Basic WhatsApp ID validation
            contactsToUpsert.push({
              wa_id: phone,
              name: name || phone,
              status: 'new',
              last_interaction: new Date().toISOString()
            });
          }
        }
      });

      if (contactsToUpsert.length > 0) {
        try {
          // Chunk upserts if too many
          const chunkSize = 50;
          for (let i = 0; i < contactsToUpsert.length; i += chunkSize) {
            const chunk = contactsToUpsert.slice(i, i + chunkSize);
            const { error } = await supabase
              .from('crm_contacts')
              .upsert(chunk, { onConflict: 'wa_id' });
            
            if (error) throw error;
          }

          toast({
            title: "Contatos importados!",
            description: `${contactsToUpsert.length} contatos foram adicionados ou atualizados.`
          });
          fetchData();
        } catch (error) {
          console.error("Error importing VCard:", error);
          toast({
            title: "Erro na importação",
            description: "Não foi possível salvar os contatos no banco de dados.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Nenhum contato encontrado",
          description: "O arquivo VCard não parece conter contatos válidos.",
          variant: "destructive"
        });
      }
      setLoading(false);
    };
    reader.readAsText(file);
    // Clear input
    event.target.value = '';
  };

  const handleLogout = () => {
    logoutAdmin();
    navigate('/crm/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'responded': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'qualified': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'closed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'lost': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
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
            <h1 className="text-xl font-bold font-display hidden md:block">CRM Mais Resultados</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 mt-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <div className="flex overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <TabsList className="bg-card border w-full md:w-auto flex md:inline-flex">
              <TabsTrigger value="dashboard" className="flex-1 md:flex-none gap-2">
                <BarChart3 className="w-4 h-4" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex-1 md:flex-none gap-2">
                <Users className="w-4 h-4" /> Contatos/CRM
              </TabsTrigger>
              <TabsTrigger value="broadcast" className="flex-1 md:flex-none gap-2">
                <Send className="w-4 h-4" /> Remarketing
              </TabsTrigger>
              <TabsTrigger value="flows" className="flex-1 md:flex-none gap-2">
                <GitBranch className="w-4 h-4" /> Automação
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 md:flex-none gap-2">
                <Settings className="w-4 h-4" /> Configurações
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Dashboard Content */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2"><Send className="w-4 h-4" /> Mensagens Enviadas</CardDescription>
                  <CardTitle className="text-3xl font-bold">{metrics.sent_count}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Respondidas</CardDescription>
                  <CardTitle className="text-3xl font-bold">{metrics.responded_count}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Qualificadas</CardDescription>
                  <CardTitle className="text-3xl font-bold">{metrics.qualified_count}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="glass-card border-green-500/20">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2 text-green-500"><DollarSign className="w-4 h-4" /> Vendas Fechadas</CardDescription>
                  <CardTitle className="text-3xl font-bold text-green-500">{metrics.sales_count}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Funil de Vendas</CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex flex-col justify-end gap-2">
                  {/* Funnel Visualization */}
                  <div className="w-full bg-blue-500/20 h-12 rounded-t-lg flex items-center justify-center text-xs font-bold border-t border-x border-blue-500/30">NOVOS: {contacts.length}</div>
                  <div className="w-[90%] mx-auto bg-yellow-500/20 h-12 flex items-center justify-center text-xs font-bold border-x border-yellow-500/30">RECONHECIDOS: {metrics.responded_count}</div>
                  <div className="w-[80%] mx-auto bg-purple-500/20 h-12 flex items-center justify-center text-xs font-bold border-x border-purple-500/30">QUALIFICADOS: {metrics.qualified_count}</div>
                  <div className="w-[70%] mx-auto bg-green-500/20 h-12 rounded-b-lg flex items-center justify-center text-xs font-bold border-b border-x border-green-500/30">VENDAS: {metrics.sales_count}</div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Bot className="w-5 h-5" /> Status da Automação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-sm">Agente IA (GPT)</span>
                    <Badge variant={metaSettings.ai_agent_enabled ? "default" : "outline"} className={metaSettings.ai_agent_enabled ? "bg-green-600" : ""}>
                      {metaSettings.ai_agent_enabled ? "ATIVO" : "INATIVO"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-sm">Resposta Automática Inicial</span>
                    <Badge variant={metaSettings.initial_auto_response_enabled ? "default" : "outline"} className={metaSettings.initial_auto_response_enabled ? "bg-blue-600" : ""}>
                      {metaSettings.initial_auto_response_enabled ? "ATIVO" : "INATIVO"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Contacts/CRM Content */}
          <TabsContent value="contacts">
            <Card className="glass-card">
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Gestão de Leads</CardTitle>
                  <CardDescription>Gerencie seus contatos e o progresso no funil</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <input
                      type="file"
                      id="vcard-upload"
                      accept=".vcf"
                      className="hidden"
                      onChange={handleVCardImport}
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => document.getElementById('vcard-upload')?.click()}
                    >
                      <FileUp className="w-4 h-4" /> Importar VCard
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="new">Novos</SelectItem>
                        <SelectItem value="responded">Respondidos</SelectItem>
                        <SelectItem value="qualified">Qualificados</SelectItem>
                        <SelectItem value="closed">Vendas</SelectItem>
                        <SelectItem value="lost">Perdidos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-4">
                    {filteredContacts.length === 0 ? (
                      <div className="text-center py-20 text-muted-foreground">
                        Nenhum contato encontrado para este filtro.
                      </div>
                    ) : (
                      filteredContacts.map(contact => (
                        <div key={contact.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-secondary/20 border hover:bg-secondary/40 transition-colors gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xl">
                              {contact.name?.charAt(0) || contact.wa_id.slice(-2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{contact.name || "Sem Nome"}</p>
                                <Badge variant="outline" className={`text-[10px] uppercase ${getStatusColor(contact.status)}`}>
                                  {contact.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">+{contact.wa_id}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">Interação: {new Date(contact.last_interaction).toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs border-purple-500/20 text-purple-500 hover:bg-purple-500/10"
                              onClick={() => updateContactStatus(contact.id, { status: 'qualified', is_qualified: true })}
                              disabled={contact.status === 'qualified' || contact.status === 'closed'}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Qualificar
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs border-green-500/20 text-green-500 hover:bg-green-500/10"
                              onClick={() => updateContactStatus(contact.id, { status: 'closed', sale_closed: true })}
                              disabled={contact.status === 'closed'}
                            >
                              <DollarSign className="w-3 h-3 mr-1" /> Venda
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs border-red-500/20 text-red-500 hover:bg-red-500/10"
                              onClick={() => updateContactStatus(contact.id, { status: 'lost' })}
                              disabled={contact.status === 'lost' || contact.status === 'closed'}
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Perdido
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openChat(contact)}>
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Remarketing / Broadcast Content */}
          <TabsContent value="broadcast">
            <Card className="glass-card max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle>Disparo de Remarketing</CardTitle>
                <CardDescription>Envie ofertas ou lembretes para grupos específicos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Público Alvo</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os contatos ({contacts.length})</SelectItem>
                        <SelectItem value="new">Apenas Novos ({contacts.filter(c => c.status === 'new').length})</SelectItem>
                        <SelectItem value="qualified">Qualificados ({contacts.filter(c => c.is_qualified).length})</SelectItem>
                        <SelectItem value="not_closed">Sem Venda ({contacts.filter(c => !c.sale_closed).length})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome da Campanha</Label>
                    <Input placeholder="Ex: Remarketing Alunos" value={broadcast.name} onChange={e => setBroadcast({...broadcast, name: e.target.value})} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Mensagem da Campanha</Label>
                  <Textarea 
                    value={broadcast.message_text} 
                    onChange={e => setBroadcast({...broadcast, message_text: e.target.value})}
                    placeholder="Oi {{name}}! Notamos que você ainda não aproveitou..." 
                    className="min-h-[150px]"
                  />
                </div>

                <div className="p-4 rounded-xl border border-dashed flex flex-col items-center gap-3 bg-secondary/10">
                   <Mic className="w-8 h-8 text-muted-foreground" />
                   <p className="text-xs text-muted-foreground">Arraste um áudio (.ogg) para enviar no disparo ou grave aqui</p>
                   <Button variant="outline" size="sm" className="gap-2">
                     <Plus className="w-4 h-4" /> Anexar Áudio
                   </Button>
                </div>

                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg font-bold" 
                  disabled={!broadcast.message_text || contacts.length === 0}
                  onClick={() => toast({ title: "Disparo agendado!" })}
                >
                  <Send className="w-5 h-5 mr-2" /> Iniciar Disparo
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Flows Content */}
          <TabsContent value="flows">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Automação de Fluxos</h2>
              <Button onClick={() => toast({ title: "Funcionalidade de Designer Visual vindo em breve!" })}>
                <Plus className="w-4 h-4 mr-2" /> Novo Fluxo
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {flows.length === 0 ? (
                <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl bg-secondary/5">
                  <GitBranch className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                  <p className="text-muted-foreground font-medium text-lg">Crie sequências inteligentes</p>
                  <p className="text-xs text-muted-foreground mt-2">Envie áudios, mensagens e espere respostas automaticamente.</p>
                </div>
              ) : (
                flows.map(flow => (
                  <Card key={flow.id} className="glass-card overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{flow.name}</CardTitle>
                      <CardDescription>Gatilho: {flow.trigger_keyword || "Nenhum"}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{flow.crm_flow_steps?.length || 0} passos</span>
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">ATIVO</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">Configurar</Button>
                        <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Settings Content */}
          <TabsContent value="settings">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Meta API Settings */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Configurações da Meta</CardTitle>
                  <CardDescription>Conecte sua API do WhatsApp Business</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Access Token Permanente</Label>
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
                    <Label>WhatsApp Business Account ID</Label>
                    <Input 
                      value={metaSettings.meta_waba_id} 
                      onChange={e => setMetaSettings({...metaSettings, meta_waba_id: e.target.value})}
                    />
                  </div>
                  <Button onClick={handleSaveSettings} disabled={saving} className="w-full mt-4">
                    {saving ? "Salvando..." : <><Save className="w-4 h-4 mr-2" /> Atualizar Credenciais</>}
                  </Button>
                </CardContent>
              </Card>

              {/* AI & Automation Settings */}
              <Card className="glass-card border-purple-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-purple-500" /> Agente de IA (ChatGPT)</CardTitle>
                  <CardDescription>Configure o comportamento do robô nas conversas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                    <div className="space-y-0.5">
                      <Label className="text-base font-bold">Ativar Agente de IA</Label>
                      <p className="text-xs text-muted-foreground text-purple-200/60">O robô responderá usando sua API Key do OpenAI</p>
                    </div>
                    <Switch 
                      checked={metaSettings.ai_agent_enabled}
                      onCheckedChange={val => setMetaSettings({...metaSettings, ai_agent_enabled: val})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>OpenAI API Key (Token)</Label>
                    <Input 
                      type="password"
                      placeholder="sk-..."
                      value={metaSettings.openai_api_key} 
                      onChange={e => setMetaSettings({...metaSettings, openai_api_key: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Gatilho da IA</Label>
                    <Select 
                      value={metaSettings.ai_agent_trigger} 
                      onValueChange={val => setMetaSettings({...metaSettings, ai_agent_trigger: val})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as mensagens (Full Auto)</SelectItem>
                        <SelectItem value="first_message">Apenas primeira mensagem</SelectItem>
                        <SelectItem value="keyword">Palavra-chave específica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label>Auto-Resposta Padrão (Sem IA)</Label>
                      <Switch 
                        checked={metaSettings.initial_auto_response_enabled}
                        onCheckedChange={val => setMetaSettings({...metaSettings, initial_auto_response_enabled: val})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mensagem Inicial</Label>
                      <Textarea 
                        value={metaSettings.initial_response_text} 
                        onChange={e => setMetaSettings({...metaSettings, initial_response_text: e.target.value})}
                        placeholder="Ex: Olá! Como podemos ajudar?"
                        className="h-20"
                      />
                    </div>
                  </div>

                  <Button onClick={handleSaveSettings} disabled={saving} variant="secondary" className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    {saving ? "Salvando..." : <><Save className="w-4 h-4 mr-2" /> Salvar Configurações de IA</>}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CRM;
