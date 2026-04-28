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
  Image as ImageIcon,
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
  const [kanbanView, setKanbanView] = useState(false);
  const [draggedContact, setDraggedContact] = useState<any>(null);
  
  // Broadcast State
  const [broadcast, setBroadcast] = useState({
    name: '',
    message_text: '',
    status: 'pending'
  });

  // Chat State
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
  
  // Flow Editor State
  const [isFlowEditorOpen, setIsFlowEditorOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const [newStep, setNewStep] = useState<any>({
    step_type: 'text',
    message_text: '',
    delay_seconds: 5,
    media_url: '',
    media_type: ''
  });


  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate('/crm/login');
      return;
    }
    fetchData();

    console.log("Setting up Realtime subscription...");
    
    // Subscribe to ALL changes in messages and contacts for real-time updates
    const messageChannel = supabase
      .channel('crm_global_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_messages' },
        (payload) => {
          console.log("Realtime message update:", payload);
          
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new;
            
            // If the message belongs to the current open chat, update UI
            if (selectedContactRef.current && newMessage.contact_id === selectedContactRef.current.id) {
              setChatMessages(prev => {
                // Evitar duplicados
                if (prev.find(m => m.id === newMessage.id)) return prev;
                return [...prev, newMessage];
              });
            }
          }
          
          // Sempre atualizar a lista de contatos para refletir a última interação e status
          fetchContacts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_contacts' },
        (payload) => {
          console.log("Realtime contact update:", payload);
          fetchContacts();
          
          // Se o contato selecionado for atualizado, refletir no cabeçalho do chat
          if (selectedContactRef.current && payload.new && (payload.new as any).id === selectedContactRef.current.id) {
            setSelectedContact((prev: any) => ({ ...prev, ...payload.new }));
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
        if (status === 'SUBSCRIBED') {
          console.log("Successfully subscribed to real-time updates");
        }
      });

    return () => {
      console.log("Cleaning up Realtime subscription");
      supabase.removeChannel(messageChannel);
    };
  }, [navigate]); // Removed selectedContact from dependencies to avoid re-subscribing on every chat switch

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
      // Fetch Settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('crm_settings')
        .select('*')
        .maybeSingle();
      
      if (settingsError) console.error("Error fetching settings:", settingsError);
      if (settingsData) {
        setMetaSettings(settingsData);
      } else {
        // Initialize settings if none exist
        const defaultSettings = {
          id: '00000000-0000-0000-0000-000000000001',
          meta_access_token: '',
          meta_phone_number_id: '',
          meta_waba_id: '',
          openai_api_key: '',
          ai_agent_enabled: false,
          ai_agent_trigger: 'first_message',
          initial_auto_response_enabled: true,
          initial_response_text: '',
          initial_response_buttons: []
        };
        setMetaSettings(defaultSettings);
        // Silently try to create them if missing
        await supabase.from('crm_settings').insert(defaultSettings);
      }

      // Fetch Metrics (Current day)
      const { data: metricsData } = await supabase
        .from('crm_metrics')
        .select('*')
        .eq('date', new Date().toISOString().split('T')[0])
        .maybeSingle();
      
      if (metricsData) {
        setMetrics(metricsData);
      } else {
        // Calculate from contacts
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

      // Fetch Flows - separate steps fetch is handled by handleSaveFlow but we need steps here too
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

      // Fetch Templates from DB
      const { data: templatesData } = await supabase
        .from('crm_templates')
        .select('*');
      setTemplates(templatesData || []);

    } catch (error) {
      console.error("Error fetching data:", error);
      // We don't always want to show a scary toast for background fetches
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Remove any fields that aren't in the DB to avoid errors
      const { id, created_at, updated_at, webhook_verify_token, ...rest } = metaSettings;
      
      const settingsToUpsert = {
        meta_access_token: rest.meta_access_token || '',
        meta_phone_number_id: rest.meta_phone_number_id || '',
        meta_waba_id: rest.meta_waba_id || '',
        openai_api_key: rest.openai_api_key || '',
        ai_agent_enabled: rest.ai_agent_enabled ?? false,
        ai_agent_trigger: rest.ai_agent_trigger || 'first_message',
        initial_auto_response_enabled: rest.initial_auto_response_enabled ?? true,
        initial_response_text: rest.initial_response_text || '',
        initial_response_buttons: rest.initial_response_buttons || [],
        id: '00000000-0000-0000-0000-000000000001',
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('crm_settings')
        .upsert(settingsToUpsert, { onConflict: 'id' });

      if (error) throw error;

      toast({
        title: "Configurações salvas!",
        description: "Suas credenciais e parâmetros de IA foram atualizados."
      });
      fetchData(); // Refresh state
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Verifique os dados e tente novamente.",
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

  const handleTriggerFlow = async (flowId: string) => {
    if (!selectedContact) return;
    setSendingMessage(true);
    try {
      const { error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: {
          action: 'startFlow',
          contactId: selectedContact.id,
          waId: selectedContact.wa_id,
          flowId
        }
      });

      if (error) throw error;
      
      toast({ 
        title: "Fluxo Iniciado!",
        description: "A sequência de mensagens começará em breve."
      });
      fetchMessages(selectedContact.id);
    } catch (err) {
      console.error("Error triggering flow:", err);
      toast({ title: "Erro ao iniciar fluxo", variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  const syncTemplates = async () => {
    setSyncingTemplates(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { action: 'getTemplates' }
      });

      if (error) throw error;
      
      toast({
        title: "Templates Sincronizados",
        description: `${data.templates?.length || 0} templates importados da Meta.`
      });
      fetchData();
    } catch (err) {
      console.error("Error syncing templates:", err);
      toast({ title: "Erro ao sincronizar templates", variant: "destructive" });
    } finally {
      setSyncingTemplates(false);
    }
  };

  const handleSendTemplate = async (templateName: string, language: string) => {
    if (!selectedContact) return;
    setSendingMessage(true);
    try {
      const { error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: {
          action: 'sendTemplate',
          to: selectedContact.wa_id,
          templateName,
          languageCode: language
        }
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
        await uploadAndSendMedia(audioBlob, 'audio');
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      toast({ title: "Erro ao acessar microfone", variant: "destructive" });
    }
  };

  const getWindowInfo = (lastInteraction: string) => {
    if (!lastInteraction) return null;
    const last = new Date(lastInteraction).getTime();
    const now = new Date().getTime();
    const diffMs = now - last;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      hours: diffHours,
      minutes: diffMinutes,
      isExpired: diffHours >= 24,
      label: `${diffHours}h ${diffMinutes}m desde o último contato`
    };
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  const uploadAndSendMedia = async (file: File | Blob, type: 'audio' | 'image' | 'video' | 'document') => {
    if (!selectedContact) return;
    
    setSendingMessage(true);
    try {
      const fileName = `${Date.now()}-${type}.${type === 'audio' ? 'ogg' : (file as File).name?.split('.').pop() || 'bin'}`;
      const filePath = `chat/${selectedContact.id}/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('crm-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('crm-media')
        .getPublicUrl(filePath);

      const payload: any = {
        action: 'sendMessage',
        to: selectedContact.wa_id,
      };

      if (type === 'audio') payload.audioUrl = publicUrl;
      else if (type === 'image') payload.imageUrl = publicUrl;
      else if (type === 'video') payload.videoUrl = publicUrl;
      else if (type === 'document') {
        payload.documentUrl = publicUrl;
        payload.fileName = (file as File).name || 'document.pdf';
      }

      const { error: invokeError } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: payload
      });

      if (invokeError) throw invokeError;

      fetchMessages(selectedContact.id);
      toast({ title: "Arquivo enviado!" });
    } catch (err) {
      console.error("Error sending media:", err);
      toast({ title: "Erro ao enviar arquivo", variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'document') => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadAndSendMedia(file, type);
    }
    event.target.value = '';
  };

  const handleCreateFlow = () => {
    setEditingFlow({
      name: 'Novo Fluxo',
      trigger_keywords: [],
      is_active: true,
      steps: []
    });
    setIsFlowEditorOpen(true);
  };

  const addStepToFlow = () => {
    setEditingFlow({
      ...editingFlow,
      steps: [...(editingFlow.steps || []), { ...newStep, id: crypto.randomUUID() }]
    });
    setNewStep({
      step_type: 'text',
      message_text: '',
      delay_seconds: 5,
      media_url: '',
      media_type: ''
    });
  };

  const removeStepFromFlow = (index: number) => {
    const steps = [...editingFlow.steps];
    steps.splice(index, 1);
    setEditingFlow({ ...editingFlow, steps });
  };

  const handleSaveFlow = async () => {
    if (!editingFlow.name) {
      toast({ title: "Dê um nome ao fluxo", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { steps, id, crm_flow_steps, created_at, updated_at, ...flowData } = editingFlow;
      let flowId = id;

      if (flowId) {
        const { error } = await supabase.from('crm_flows').update(flowData).eq('id', flowId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('crm_flows').insert(flowData).select().single();
        if (error) throw error;
        flowId = data.id;
      }

      // Sync steps
      await supabase.from('crm_flow_steps').delete().eq('flow_id', flowId);
      if (steps && steps.length > 0) {
        const stepsToInsert = steps.map((s: any, i: number) => {
          const { id: _, ...stepData } = s;
          return { ...stepData, flow_id: flowId, step_order: i };
        });
        const { error } = await supabase.from('crm_flow_steps').insert(stepsToInsert);
        if (error) throw error;
      }

      toast({ title: "Fluxo salvo com sucesso!" });
      fetchData();
      setIsFlowEditorOpen(false);
    } catch (err) {
      console.error("Error saving flow:", err);
      toast({ title: "Erro ao salvar fluxo", variant: "destructive" });
    } finally {
      setSaving(false);
    }
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
              <TabsTrigger value="templates" className="flex-1 md:flex-none gap-2">
                <GitBranch className="w-4 h-4" /> Templates Meta
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

          {/* Contacts/CRM Content - WhatsApp Style */}
          <TabsContent value="contacts" className="m-0 h-[calc(100vh-220px)] border rounded-xl overflow-hidden glass-card flex">
            {/* Sidebar: Contacts List */}
            <div className={`w-full md:w-[350px] border-r flex flex-col bg-card/30 ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
              <div className="p-4 border-b space-y-4 bg-secondary/10">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">Conversas</h3>
                  <div className="flex items-center gap-1">
                    <input
                      type="file"
                      id="vcard-upload"
                      accept=".vcf"
                      className="hidden"
                      onChange={handleVCardImport}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      title="Importar Contatos"
                      onClick={() => document.getElementById('vcard-upload')?.click()}
                    >
                      <FileUp className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchContacts}>
                      <RefreshCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="pl-10 h-9 bg-background/50">
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
              
              <ScrollArea className="flex-1">
                <div className="divide-y">
                  {filteredContacts.length === 0 ? (
                    <div className="p-10 text-center text-sm text-muted-foreground">
                      Nenhum contato encontrado.
                    </div>
                  ) : (
                    filteredContacts.map(contact => (
                      <button 
                        key={contact.id} 
                        onClick={() => openChat(contact)}
                        className={`w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/30 transition-colors relative ${selectedContact?.id === contact.id ? 'bg-secondary/40 border-l-4 border-primary' : ''}`}
                      >
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary shrink-0">
                            {contact.name?.charAt(0) || contact.wa_id.slice(-2)}
                          </div>
                          {contact.status === 'new' && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-background" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                            <p className="font-semibold truncate pr-2">{contact.name || "Sem Nome"}</p>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {new Date(contact.last_interaction).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground truncate italic">
                              {contact.wa_id}
                            </p>
                            <Badge variant="outline" className={`text-[9px] uppercase h-4 px-1 ${getStatusColor(contact.status)}`}>
                              {contact.status}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col bg-secondary/5 relative ${!selectedContact ? 'hidden md:flex items-center justify-center text-center p-10' : 'flex'}`}>
              {!selectedContact ? (
                <div className="max-w-md space-y-4 opacity-40">
                  <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="w-12 h-12 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">Mais Resultados CRM</h3>
                  <p className="text-muted-foreground">Selecione uma conversa para começar a atender seus leads em tempo real.</p>
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={() => setSelectedContact(null)}>
                        <ArrowRight className="w-5 h-5 rotate-180" />
                      </Button>
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary shrink-0">
                        {selectedContact.name?.charAt(0) || selectedContact.wa_id.slice(-2)}
                      </div>
                      <div>
                        <h3 className="font-bold leading-none">{selectedContact.name || "Sem Nome"}</h3>
                        <div className="flex flex-col gap-1 mt-1">
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online • +{selectedContact.wa_id}
                          </p>
                          {selectedContact.last_interaction && (
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                                getWindowInfo(selectedContact.last_interaction)?.isExpired 
                                  ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                                  : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                              }`}>
                                <Clock className="w-2.5 h-2.5" />
                                {getWindowInfo(selectedContact.last_interaction)?.label}
                              </span>
                              {getWindowInfo(selectedContact.last_interaction)?.isExpired && (
                                <span className="text-[9px] text-red-400 font-semibold animate-pulse">
                                  ⚠️ Janela de 24h expirada (Cobra custo por envio)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="hidden lg:flex items-center gap-1 border rounded-lg p-1 bg-background/50">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-[10px] uppercase font-bold"
                          onClick={() => updateContactStatus(selectedContact.id, { status: 'qualified', is_qualified: true })}
                          disabled={selectedContact.status === 'qualified' || selectedContact.status === 'closed'}
                        >
                          Qualificar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-[10px] uppercase font-bold text-green-500"
                          onClick={() => updateContactStatus(selectedContact.id, { status: 'closed', sale_closed: true })}
                          disabled={selectedContact.status === 'closed'}
                        >
                          Venda
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Message Container */}
                  <ScrollArea className="flex-1 p-4 md:p-6" id="chat-scroll-area">
                    <div className="space-y-6 pb-4">
                      {chatMessages.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                          <p className="text-sm bg-secondary/50 inline-block px-4 py-1 rounded-full">Início da conversa</p>
                        </div>
                      ) : (
                        chatMessages.map((msg, idx) => {
                          const showDate = idx === 0 || new Date(chatMessages[idx-1].created_at).toDateString() !== new Date(msg.created_at).toDateString();
                          return (
                            <div key={msg.id} className="space-y-4">
                              {showDate && (
                                <div className="flex justify-center my-6">
                                  <span className="text-[10px] bg-secondary/80 px-3 py-1 rounded-md text-muted-foreground uppercase font-bold tracking-wider">
                                    {new Date(msg.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              <div className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[85%] md:max-w-[70%] space-y-1 ${msg.direction === 'inbound' ? 'items-start' : 'items-end flex flex-col'}`}>
                                  <div className={`p-3 rounded-2xl text-sm shadow-sm relative ${
                                    msg.direction === 'inbound' 
                                      ? 'bg-card text-foreground rounded-tl-none border' 
                                      : 'bg-primary text-primary-foreground rounded-tr-none'
                                  }`}>
                                    {msg.message_type === 'audio' ? (
                                      <div className="flex items-center gap-3 min-w-[200px]">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${msg.direction === 'inbound' ? 'bg-secondary' : 'bg-primary-foreground/20'}`}>
                                          <Play className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                           <div className={`h-1 rounded-full w-full ${msg.direction === 'inbound' ? 'bg-secondary' : 'bg-primary-foreground/20'}`}></div>
                                           <p className="text-[10px] opacity-70">Mensagem de voz</p>
                                        </div>
                                      </div>
                                    ) : msg.message_type === 'image' ? (
                                      <div className="space-y-2">
                                        <img src={msg.content.includes('http') ? msg.content : '#'} alt="Image" className="rounded-lg max-w-full h-auto max-h-60 object-cover" />
                                        {msg.content.includes('http') ? null : <p>{msg.content}</p>}
                                      </div>
                                    ) : (
                                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                    )}
                                    <span className={`text-[9px] block mt-1 text-right opacity-60`}>
                                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={scrollRef} />
                    </div>
                  </ScrollArea>

                  {/* Automation Quick Actions */}
                  <div className="px-4 py-2 border-t bg-secondary/5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Acionadores:</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      {flows.filter(f => f.is_active).map(flow => (
                        <Button 
                          key={flow.id} 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-[11px] whitespace-nowrap bg-background border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all"
                          onClick={() => {
                            if (confirm(`Deseja iniciar o fluxo "${flow.name}" para este contato?`)) {
                              handleTriggerFlow(flow.id);
                            }
                          }}
                        >
                          <Bot className="w-3.5 h-3.5 mr-1.5 text-purple-500" /> {flow.name}
                        </Button>
                      ))}
                      {templates.filter(t => t.status === 'APPROVED').slice(0, 5).map(tpl => (
                        <Button 
                          key={tpl.id} 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-[11px] whitespace-nowrap bg-background border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/5"
                          onClick={() => handleSendTemplate(tpl.name, tpl.language)}
                        >
                          <GitBranch className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> {tpl.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Input Area */}
                  <div className="p-4 border-t bg-card/80 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground" onClick={() => fileInputRef.current?.click()}>
                          <Paperclip className="w-5 h-5" />
                        </Button>
                        <input 
                          type="file" 
                          className="hidden" 
                          ref={fileInputRef} 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.type.startsWith('image/')) uploadAndSendMedia(file, 'image');
                              else if (file.type.startsWith('video/')) uploadAndSendMedia(file, 'video');
                              else uploadAndSendMedia(file, 'document');
                            }
                          }}
                        />
                      </div>
                      <div className="flex-1 relative">
                        <Input 
                          placeholder="Mensagem" 
                          className="h-11 bg-secondary/20 border-none pr-12 focus-visible:ring-1"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                      </div>
                      <div className="flex shrink-0">
                        {newMessage.trim() ? (
                          <Button 
                            className="h-11 w-11 rounded-full p-0 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                            onClick={handleSendMessage}
                            disabled={sendingMessage}
                          >
                            <Send className="w-5 h-5 text-primary-foreground" />
                          </Button>
                        ) : (
                          <Button 
                            variant={isRecording ? "destructive" : "secondary"}
                            className={`h-11 w-11 rounded-full p-0 shadow-lg ${isRecording ? 'animate-pulse' : ''}`}
                            onClick={isRecording ? stopRecording : startRecording}
                          >
                            {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
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
              <div>
                <h2 className="text-2xl font-bold">Automação de Fluxos</h2>
                <p className="text-muted-foreground text-sm">Crie sequências inteligentes com mensagens, áudios e esperas.</p>
              </div>
              <Button onClick={handleCreateFlow} className="gap-2">
                <Plus className="w-4 h-4" /> Novo Fluxo
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {flows.length === 0 ? (
                <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl bg-secondary/5">
                  <GitBranch className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                  <p className="text-muted-foreground font-medium text-lg">Crie sequências inteligentes</p>
                  <p className="text-xs text-muted-foreground mt-2">Envie áudios, mensagens e espere respostas automaticamente.</p>
                  <Button variant="outline" className="mt-4" onClick={handleCreateFlow}>Começar agora</Button>
                </div>
              ) : (
                flows.map(flow => (
                  <Card key={flow.id} className="glass-card overflow-hidden border-primary/10 hover:border-primary/30 transition-all">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{flow.name}</CardTitle>
                        <Switch checked={flow.is_active} onCheckedChange={async (val) => {
                          await supabase.from('crm_flows').update({ is_active: val }).eq('id', flow.id);
                          fetchData();
                        }} />
                      </div>
                      <CardDescription>
                        {flow.trigger_keywords?.length > 0 
                          ? `Gatilhos: ${flow.trigger_keywords.join(', ')}` 
                          : "Sem gatilhos de palavra-chave"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {flow.crm_flow_steps?.length || 0} passos</span>
                        <Badge variant="outline" className={flow.is_active ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}>
                          {flow.is_active ? "ATIVO" : "INATIVO"}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                          setEditingFlow(flow);
                          setIsFlowEditorOpen(true);
                        }}>Editar Fluxo</Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => {
                          if (confirm('Deseja excluir este fluxo?')) {
                            await supabase.from('crm_flows').delete().eq('id', flow.id);
                            fetchData();
                          }
                        }}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>


          {/* Templates Content */}
          <TabsContent value="templates">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Templates da Meta</h2>
                <p className="text-muted-foreground text-sm">Visualize e utilize as mensagens aprovadas no Gerenciador da Meta</p>
              </div>
              <Button onClick={syncTemplates} disabled={syncingTemplates} className="gap-2">
                <RefreshCcw className={`w-4 h-4 ${syncingTemplates ? 'animate-spin' : ''}`} />
                Sincronizar com Meta
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.length === 0 ? (
                <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl bg-secondary/5">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                  <p className="text-muted-foreground font-medium">Nenhum template encontrado</p>
                  <Button variant="link" onClick={syncTemplates}>Sincronizar agora</Button>
                </div>
              ) : (
                templates.map(template => (
                  <Card key={template.id} className="glass-card flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-bold truncate max-w-[200px]">{template.name}</CardTitle>
                        <Badge variant="outline" className={template.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' : ''}>
                          {template.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-[10px] uppercase">{template.category} • {template.language}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                      <div className="bg-secondary/30 p-3 rounded-lg text-xs font-mono whitespace-pre-wrap min-h-[80px]">
                        {template.components?.find((c: any) => c.type === 'BODY')?.text || "Sem conteúdo de texto"}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                          toast({ title: "Edição de templates deve ser feita no Painel da Meta" });
                        }}>
                          Ver Detalhes
                        </Button>
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
              
              {/* Webhook Configuration Information */}
              <Card className="glass-card border-blue-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-500"><GitBranch className="w-5 h-5" /> Webhook da Meta</CardTitle>
                  <CardDescription>Configure estas informações no Portal do Desenvolvedor da Meta (WhatsApp &rarr; Configuração)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-secondary/50 rounded-lg border border-blue-500/10 space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">URL de Retorno (Callback URL)</Label>
                      <div className="flex items-center gap-2">
                        <code className="bg-background/80 p-1.5 rounded text-[11px] flex-1 truncate select-all">
                          {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-webhook`}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={() => {
                            const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-webhook`;
                            navigator.clipboard.writeText(url);
                            toast({ title: "URL Copiada!" });
                          }}
                        >
                          <Paperclip className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Token de Verificação (Verify Token)</Label>
                      <div className="flex items-center gap-2">
                        <code className="bg-background/80 p-1.5 rounded text-[11px] flex-1 select-all">
                          {metaSettings.webhook_verify_token || "0999a884-d967-404e-afff-6a9c8c155299"}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={() => {
                            navigator.clipboard.writeText(metaSettings.webhook_verify_token || "0999a884-d967-404e-afff-6a9c8c155299");
                            toast({ title: "Token Copiado!" });
                          }}
                        >
                          <Paperclip className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground bg-blue-500/5 p-3 rounded border border-blue-500/10">
                    <p className="font-bold text-blue-400 mb-1">Passos na Meta:</p>
                    <ol className="list-decimal ml-4 space-y-1">
                      <li>Acesse developers.facebook.com</li>
                      <li>Vá em seu App &rarr; WhatsApp &rarr; Configuração</li>
                      <li>Clique em "Editar" no Webhook</li>
                      <li>Cole a URL e o Token acima</li>
                      <li>Em "Campos do Webhook", selecione <b>messages</b></li>
                    </ol>
                  </div>
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

      {/* Flow Editor Dialog */}
      <Dialog open={isFlowEditorOpen} onOpenChange={setIsFlowEditorOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 glass-card">
          <DialogHeader className="p-6 border-b">
            <DialogTitle>Editor de Fluxo Automático</DialogTitle>
            <DialogDescription>Configure a sequência de atendimento inteligente.</DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Fluxo</Label>
                  <Input 
                    value={editingFlow?.name || ''} 
                    onChange={e => setEditingFlow({...editingFlow, name: e.target.value})} 
                    placeholder="Ex: Boas-vindas"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Palavras-chave (Gatilhos)</Label>
                  <Input 
                    placeholder="oi, olá, quero saber (separado por vírgula)" 
                    value={editingFlow?.trigger_keywords?.join(', ') || ''}
                    onChange={e => setEditingFlow({...editingFlow, trigger_keywords: e.target.value.split(',').map((s: string) => s.trim().toLowerCase())})}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-bold flex items-center gap-2"><GitBranch className="w-4 h-4" /> Sequência de Passos</h3>
                
                {editingFlow?.steps?.map((step: any, index: number) => (
                  <div key={step.id || index} className="p-4 rounded-xl border bg-secondary/10 relative group">
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                      {index + 1}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeStepFromFlow(index)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-1">
                        <Label className="text-[10px] uppercase">Tipo</Label>
                        <div className="flex items-center gap-2 mt-1">
                          {step.step_type === 'text' && <MessageSquare className="w-4 h-4" />}
                          {step.step_type === 'audio' && <Mic className="w-4 h-4" />}
                          {step.step_type === 'delay' && <Clock className="w-4 h-4" />}
                          {step.step_type === 'wait_response' && <RefreshCcw className="w-4 h-4" />}
                          <span className="text-xs font-bold uppercase">{step.step_type}</span>
                        </div>
                      </div>
                      <div className="md:col-span-3">
                        <p className="text-sm">{step.message_text || (step.step_type === 'delay' ? `Aguardar ${step.delay_seconds} segundos` : 'Aguardar resposta do cliente')}</p>
                        {step.media_url && <p className="text-[10px] text-primary truncate mt-1">{step.media_url}</p>}
                      </div>
                    </div>
                  </div>
                ))}

                {/* New Step Form */}
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo do Passo</Label>
                      <Select value={newStep.step_type} onValueChange={val => setNewStep({...newStep, step_type: val})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Mensagem de Texto</SelectItem>
                          <SelectItem value="audio">Mensagem de Áudio</SelectItem>
                          <SelectItem value="image">Imagem</SelectItem>
                          <SelectItem value="video">Vídeo</SelectItem>
                          <SelectItem value="document">Documento</SelectItem>
                          <SelectItem value="delay">Aguardar (Segundos)</SelectItem>
                          <SelectItem value="wait_response">Aguardar Resposta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newStep.step_type === 'delay' && (
                      <div className="space-y-2">
                        <Label>Segundos</Label>
                        <Input type="number" value={newStep.delay_seconds} onChange={e => setNewStep({...newStep, delay_seconds: parseInt(e.target.value)})} />
                      </div>
                    )}
                  </div>

                  {['text', 'audio', 'image', 'video', 'document'].includes(newStep.step_type) && (
                    <div className="space-y-2">
                      <Label>{newStep.step_type === 'text' ? 'Conteúdo da Mensagem' : 'URL da Mídia (ou Texto de Legenda)'}</Label>
                      <Textarea 
                        value={newStep.message_text} 
                        onChange={e => setNewStep({...newStep, message_text: e.target.value})}
                        placeholder="Escreva aqui..."
                      />
                    </div>
                  )}

                  {['audio', 'image', 'video', 'document'].includes(newStep.step_type) && (
                    <div className="space-y-2">
                      <Label>Link Direto do Arquivo</Label>
                      <Input 
                        value={newStep.media_url} 
                        onChange={e => setNewStep({...newStep, media_url: e.target.value})}
                        placeholder="https://..."
                      />
                      <p className="text-[10px] text-muted-foreground">Dica: Use a aba 'Remarketing' para subir arquivos e pegar o link.</p>
                    </div>
                  )}

                  <Button variant="outline" className="w-full border-primary/50 text-primary hover:bg-primary/10" onClick={addStepToFlow}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Passo na Sequência
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter className="p-6 border-t bg-secondary/20">
            <Button variant="ghost" onClick={() => setIsFlowEditorOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveFlow} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? "Salvando..." : <><Save className="w-4 h-4 mr-2" /> Salvar Fluxo Completo</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRM;
