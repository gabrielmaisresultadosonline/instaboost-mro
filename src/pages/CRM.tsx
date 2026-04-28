import { useState, useEffect, useRef } from 'react';
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
  FileUp,
  Paperclip,
  Video,
  ImageIcon,
  FileText,
  StopCircle,
  Clock,
  Play,
  ArrowRight
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import TemplateBuilder from "@/components/whatsapp/TemplateBuilder";
import { 
  Check, 
  Clock as ClockIcon, 
  AlertCircle, 
  FileCheck2,
  ListFilter
} from "lucide-react";

const CRM = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
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

  const [metrics, setMetrics] = useState<any>({
    sent_count: 0,
    responded_count: 0,
    qualified_count: 0,
    sales_count: 0
  });

  const [flows, setFlows] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [kanbanView, setKanbanView] = useState(false);
  const [draggedContact, setDraggedContact] = useState<any>(null);
  
  const [broadcast, setBroadcast] = useState({
    name: '',
    message_text: '',
    status: 'pending'
  });

  const [selectedContact, setSelectedContact] = useState<any>(null);
  const selectedContactRef = useRef<any>(null);

  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isFlowEditorOpen, setIsFlowEditorOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<any>(null);

  const [newStep, setNewStep] = useState<any>({
    step_type: 'text',
    message_text: '',
    delay_seconds: 5,
    media_url: '',
    media_type: ''
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate('/crm/login');
      return;
    }
    fetchData();

    const messageChannel = supabase
      .channel('crm_global_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMessage = payload.new;
          if (selectedContactRef.current && newMessage.contact_id === selectedContactRef.current.id) {
            setChatMessages(prev => {
              if (prev.find(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }
        }
        fetchContacts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_contacts' }, (payload) => {
        fetchContacts();
        if (selectedContactRef.current && payload.new && (payload.new as any).id === selectedContactRef.current.id) {
          setSelectedContact((prev: any) => ({ ...prev, ...payload.new }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [navigate]);

  const fetchContacts = async () => {
    const { data: contactsData } = await supabase
      .from('crm_contacts')
      .select('*')
      .order('last_interaction', { ascending: false });
    setContacts(contactsData || []);
  };

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
      const { data: settingsData } = await supabase.from('crm_settings').select('*').maybeSingle();
      if (settingsData) setMetaSettings(settingsData);

      const { data: metricsData } = await supabase
        .from('crm_metrics')
        .select('*')
        .eq('date', new Date().toISOString().split('T')[0])
        .maybeSingle();
      
      if (metricsData) setMetrics(metricsData);

      const { data: flowsData } = await supabase.from('crm_flows').select('*, crm_flow_steps(*)');
      setFlows(flowsData || []);

      const { data: contactsData } = await supabase
        .from('crm_contacts')
        .select('*')
        .order('last_interaction', { ascending: false });
      setContacts(contactsData || []);

      const { data: templatesData } = await supabase.from('crm_templates').select('*');
      setTemplates(templatesData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { id, created_at, updated_at, webhook_verify_token, ...rest } = metaSettings;
      const { error } = await supabase.from('crm_settings').upsert({
        ...rest,
        id: '00000000-0000-0000-0000-000000000001',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      if (error) throw error;
      toast({ title: "Configurações salvas!" });
      fetchData();
    } catch (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateContactStatus = async (contactId: string, updates: any) => {
    try {
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, ...updates } : c));
      const { error } = await supabase.from('crm_contacts').update(updates).eq('id', contactId);
      if (error) {
        fetchContacts();
        throw error;
      }
      toast({ title: "Status atualizado!" });
      fetchData();
    } catch (err) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleDragStart = (contact: any) => setDraggedContact(contact);
  const handleDrop = async (status: string) => {
    if (!draggedContact || draggedContact.status === status) return;
    await updateContactStatus(draggedContact.id, { status });
    setDraggedContact(null);
  };

  const fetchMessages = async (contactId: string) => {
    const { data } = await supabase.from('crm_messages').select('*').eq('contact_id', contactId).order('created_at', { ascending: true });
    setChatMessages(data || []);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || sendingMessage) return;
    setSendingMessage(true);
    try {
      const { error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { action: 'sendMessage', to: selectedContact.wa_id, text: newMessage }
      });
      if (error) throw error;
      await fetchMessages(selectedContact.id);
      setNewMessage('');
    } catch (err) {
      toast({ title: "Erro ao enviar", variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleTriggerFlow = async (flowId: string) => {
    if (!selectedContact) return;
    setSendingMessage(true);
    try {
      const { error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { action: 'startFlow', contactId: selectedContact.id, waId: selectedContact.wa_id, flowId }
      });
      if (error) throw error;
      toast({ title: "Fluxo Iniciado!" });
      fetchMessages(selectedContact.id);
    } catch (err) {
      toast({ title: "Erro ao iniciar fluxo", variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  const syncTemplates = async () => {
    setSyncingTemplates(true);
    try {
      const { error } = await supabase.functions.invoke('meta-whatsapp-crm', { body: { action: 'getTemplates' } });
      if (error) throw error;
      toast({ title: "Templates Sincronizados" });
      fetchData();
    } catch (err) {
      toast({ title: "Erro ao sincronizar", variant: "destructive" });
    } finally {
      setSyncingTemplates(false);
    }
  };

  const handleSendTemplate = async (templateName: string, language: string) => {
    if (!selectedContact) return;
    setSendingMessage(true);
    try {
      const { error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { action: 'sendTemplate', to: selectedContact.wa_id, templateName, languageCode: language }
      });
      if (error) throw error;
      toast({ title: "Template enviado!" });
      fetchMessages(selectedContact.id);
    } catch (err) {
      toast({ title: "Erro ao enviar template", variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  const openChat = (contact: any) => {
    setSelectedContact(contact);
    fetchMessages(contact.id);
  };

  const getWindowInfo = (lastInteraction: string) => {
    if (!lastInteraction) return null;
    const last = new Date(lastInteraction).getTime();
    const now = new Date().getTime();
    const diffHours = (now - last) / (1000 * 60 * 60);
    const remaining = Math.max(0, 24 - diffHours);
    return {
      label: remaining > 0 ? `${remaining.toFixed(1)}h restantes` : "Janela expirada",
      isExpired: remaining <= 0
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'responded': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'qualified': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'closed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'lost': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  if (loading && !contacts.length) return <div className="min-h-screen flex items-center justify-center"><RefreshCcw className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size="sm" />
          <Button variant="ghost" size="sm" onClick={() => { logoutAdmin(); navigate('/crm/login'); }}><LogOut className="mr-2 h-4 w-4" /> Sair</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 mt-8">
        <Tabs defaultValue="contacts">
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="contacts">Contatos/CRM</TabsTrigger>
            <TabsTrigger value="broadcast">Remarketing</TabsTrigger>
            <TabsTrigger value="flows">Automação</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card><CardHeader><CardDescription>Enviadas</CardDescription><CardTitle>{metrics.sent_count}</CardTitle></CardHeader></Card>
              <Card><CardHeader><CardDescription>Respondidas</CardDescription><CardTitle>{metrics.responded_count}</CardTitle></CardHeader></Card>
              <Card><CardHeader><CardDescription>Qualificadas</CardDescription><CardTitle>{metrics.qualified_count}</CardTitle></CardHeader></Card>
              <Card><CardHeader><CardDescription>Vendas</CardDescription><CardTitle>{metrics.sales_count}</CardTitle></CardHeader></Card>
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="h-[calc(100vh-250px)] border rounded-xl overflow-hidden glass-card flex flex-col">
            <div className="flex items-center justify-between p-2 border-b bg-muted/30">
              <div className="flex gap-2">
                <Button variant={!kanbanView ? "default" : "ghost"} size="sm" onClick={() => setKanbanView(false)}><MessageSquare className="h-4 w-4 mr-1" /> Lista</Button>
                <Button variant={kanbanView ? "default" : "ghost"} size="sm" onClick={() => setKanbanView(true)}><BarChart3 className="h-4 w-4 mr-1" /> Kanban</Button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {kanbanView ? (
                <div className="flex-1 overflow-x-auto p-4 flex gap-4">
                  {['new', 'responded', 'qualified', 'closed', 'lost'].map(status => (
                    <div key={status} className="w-72 shrink-0 flex flex-col bg-muted/20 rounded-lg border" onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(status)}>
                      <div className="p-3 border-b font-bold uppercase text-xs flex justify-between">
                        {status} <Badge variant="secondary">{contacts.filter(c => c.status === status).length}</Badge>
                      </div>
                      <ScrollArea className="flex-1 p-2">
                        {contacts.filter(c => c.status === status).map(contact => (
                          <Card key={contact.id} draggable onDragStart={() => handleDragStart(contact)} className="p-3 mb-2 cursor-grab active:cursor-grabbing" onClick={() => { openChat(contact); setKanbanView(false); }}>
                            <p className="text-sm font-semibold truncate">{contact.name || contact.wa_id}</p>
                          </Card>
                        ))}
                      </ScrollArea>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className={`w-full md:w-[350px] border-r flex flex-col ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b"><Input placeholder="Buscar contatos..." onChange={e => setStatusFilter(e.target.value || 'all')} /></div>
                    <ScrollArea className="flex-1">
                      {filteredContacts.map(contact => (
                        <button key={contact.id} onClick={() => openChat(contact)} className={`w-full p-4 text-left border-b hover:bg-secondary/30 ${selectedContact?.id === contact.id ? 'bg-secondary/50' : ''}`}>
                          <p className="font-bold truncate">{contact.name || contact.wa_id}</p>
                          <Badge variant="outline" className={getStatusColor(contact.status)}>{contact.status}</Badge>
                        </button>
                      ))}
                    </ScrollArea>
                  </div>
                  <div className={`flex-1 flex flex-col ${!selectedContact ? 'hidden md:flex items-center justify-center opacity-50' : 'flex'}`}>
                    {selectedContact ? (
                      <>
                        <div className="p-4 border-b flex justify-between items-center bg-card">
                          <div>
                            <p className="font-bold">{selectedContact.name || selectedContact.wa_id}</p>
                            {selectedContact.last_interaction && <p className="text-[10px] text-muted-foreground">{getWindowInfo(selectedContact.last_interaction)?.label}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => updateContactStatus(selectedContact.id, { status: 'qualified' })}>Qualificar</Button>
                            <Button size="sm" className="bg-green-600" onClick={() => updateContactStatus(selectedContact.id, { status: 'closed' })}>Venda</Button>
                          </div>
                        </div>
                        <ScrollArea className="flex-1 p-4"><div className="space-y-4">{chatMessages.map(m => <div key={m.id} className={`flex ${m.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}><div className={`p-2 rounded-lg max-w-[80%] ${m.direction === 'inbound' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>{m.content}</div></div>)}<div ref={scrollRef} /></div></ScrollArea>
                        <div className="p-4 border-t flex gap-2"><Input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Mensagem..." /><Button onClick={handleSendMessage} disabled={sendingMessage}><Send className="h-4 w-4" /></Button></div>
                      </>
                    ) : <p>Selecione um contato</p>}
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CRM;
