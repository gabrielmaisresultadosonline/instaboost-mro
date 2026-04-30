import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdminLoggedIn, logoutAdmin } from '@/lib/adminConfig';
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
  ArrowRight,
  Check,
  Clock as ClockIcon,
  AlertCircle,
  FileCheck2,
  ListFilter,
  Zap,
  Eye,
  LayoutDashboard,
  Menu,
  ChevronLeft
} from "lucide-react";
import TemplatePreview from "@/components/whatsapp/TemplatePreview";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import TemplateBuilder from "@/components/whatsapp/TemplateBuilder";
import FlowEditor from "@/components/crm/FlowEditor";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const CRM = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metaSettings, setMetaSettings] = useState<any>({
    meta_access_token: '',
    meta_phone_number_id: '',
    meta_waba_id: '',
    meta_app_id: '',
    meta_app_secret: '',
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
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const selectedContactRef = useRef<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isPreviewingAudio, setIsPreviewingAudio] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isFlowEditorOpen, setIsFlowEditorOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<any>(null);
  const [uploadType, setUploadType] = useState<'image' | 'video' | 'audio' | 'document' | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [confirmSend, setConfirmSend] = useState<{
    type: 'template' | 'flow';
    id: string;
    name: string;
    language?: string;
  } | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);

  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  useEffect(() => {
    let interval: any;
    if (selectedContact?.next_execution_time) {
      const updateCountdown = () => {
        const next = new Date(selectedContact.next_execution_time).getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, Math.floor((next - now) / 1000));
        setCountdown(diff);
        if (diff <= 0) {
          clearInterval(interval);
          setCountdown(null);
        }
      };
      updateCountdown();
      interval = setInterval(updateCountdown, 1000);
    } else {
      setCountdown(null);
    }
    return () => clearInterval(interval);
  }, [selectedContact?.next_execution_time, selectedContact?.id]);

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
      const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { action: 'sendMessage', to: selectedContact.wa_id, text: newMessage }
      });
      if (error) throw error;
      if (!data.success) {
        throw new Error(data.error || "Erro ao enviar mensagem pela Meta");
      }
      await fetchMessages(selectedContact.id);
      setNewMessage('');
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        const mimeType = MediaRecorder.isTypeSupported('audio/ogg; codecs=opus') 
          ? 'audio/ogg; codecs=opus' 
          : 'audio/webm; codecs=opus';
        const audioBlob = new Blob(chunks, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setRecordedAudioBlob(audioBlob);
        setRecordedAudioUrl(audioUrl);
        setIsPreviewingAudio(true);
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      setAudioChunks(chunks);
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      toast({ title: "Erro ao acessar microfone", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const cancelAudioPreview = () => {
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setIsPreviewingAudio(false);
  };

  const sendRecordedAudio = async () => {
    if (recordedAudioBlob) {
      await handleSendMedia(recordedAudioBlob, 'audio', true);
      cancelAudioPreview();
    }
  };

  const handleSendMedia = async (file: File | Blob, type: 'audio' | 'video' | 'image' | 'document', isVoice = false) => {
    if (!selectedContact) return;
    setSendingMessage(true);
    try {
      const fileExt = file instanceof File ? file.name.split('.').pop() : (isVoice ? 'ogg' : 'bin');
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `chat-media/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('crm-media')
        .upload(filePath, file, {
          contentType: file.type || (type === 'audio' ? 'audio/ogg; codecs=opus' : undefined)
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('crm-media')
        .getPublicUrl(filePath);

      const params: any = { action: 'sendMessage', to: selectedContact.wa_id };
      if (type === 'audio') {
        params.audioUrl = publicUrl;
        params.isVoice = isVoice;
      } else if (type === 'image') {
        params.imageUrl = publicUrl;
      } else if (type === 'video') {
        params.videoUrl = publicUrl;
      } else if (type === 'document') {
        params.documentUrl = publicUrl;
        params.fileName = file instanceof File ? file.name : 'document';
      }

      const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', { body: params });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      await fetchMessages(selectedContact.id);
      toast({ title: "Mídia enviada!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar mídia", description: err.message, variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadType) return;
    
    const isVoice = uploadType === 'audio';
    handleSendMedia(file, uploadType, isVoice);
    e.target.value = '';
  };

  const handleTriggerFlow = async (flowId: string) => {
    if (!selectedContact) return;
    
    const flow = flows.find(f => f.id === flowId);
    if (!confirmSend || confirmSend.id !== flowId) {
      setConfirmSend({ type: 'flow', id: flowId, name: flow?.name || 'Fluxo' });
      return;
    }

    setConfirmSend(null);
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
    
    const template = templates.find(t => t.name === templateName);
    
    if (!confirmSend || confirmSend.id !== templateName) {
      setConfirmSend({ type: 'template', id: templateName, name: templateName, language });
      return;
    }

    setConfirmSend(null);
    setSendingMessage(true);
    try {
      const components: any[] = [];
      const bodyComponent = template?.components?.find((c: any) => c.type === 'BODY');
      const headerComponent = template?.components?.find((c: any) => c.type === 'HEADER');
      
      if (headerComponent) {
        if (headerComponent.format === 'IMAGE') {
          const handleOrUrl = headerComponent.example?.header_handle?.[0];
          if (handleOrUrl && handleOrUrl.startsWith('http') && !handleOrUrl.includes('whatsapp.net')) {
            components.push({
              type: "header",
              parameters: [{ type: "image", image: { link: handleOrUrl } }]
            });
          }
        } else if (headerComponent.format === 'TEXT' && headerComponent.text) {
          const headerVariables = headerComponent.text.match(/\{\{\d+\}\}/g);
          if (headerVariables) {
            components.push({
              type: "header",
              parameters: headerVariables.map(() => ({ type: "text", text: "---" }))
            });
          }
        }
      }

      if (bodyComponent?.text) {
        const bodyVariables = bodyComponent.text.match(/\{\{\d+\}\}/g);
        if (bodyVariables) {
          const parameters = bodyVariables.map((_: any, index: number) => {
            if (index === 0 && selectedContact.name) return { type: "text", text: selectedContact.name };
            const exampleData = bodyComponent.example?.body_text?.[0] || [];
            let val = "---";
            if (Array.isArray(exampleData)) {
              if (exampleData.length === 1 && typeof exampleData[0] === 'string' && bodyVariables.length > 1) {
                const splitExamples = exampleData[0].split(' ');
                val = splitExamples[index] || "---";
              } else {
                val = exampleData[index] || "---";
              }
            } else if (typeof exampleData === 'string') {
              const splitExamples = exampleData.split(' ');
              val = splitExamples[index] || "---";
            }
            return { type: "text", text: val };
          });
          components.push({ type: "body", parameters: parameters });
        }
      }

      const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { 
          action: 'sendTemplate', 
          to: selectedContact.wa_id, 
          templateName, 
          languageCode: language,
          components: components
        }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao enviar template pela Meta");
      toast({ title: "Template enviado!" });
      await fetchMessages(selectedContact.id);
    } catch (err: any) {
      toast({ title: "Erro ao enviar template", description: err.message, variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSaveTemplate = async (template: any) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { action: 'createTemplate', ...template }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao criar template na Meta");
      toast({ title: "Template enviado para aprovação!" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Erro ao criar template", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (name: string) => {
    try {
      const { error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { action: 'deleteTemplate', name }
      });
      if (error) throw error;
      toast({ title: "Template excluído" });
      fetchData();
    } catch (err) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const openChat = (contact: any) => {
    setSelectedContact(contact);
    fetchMessages(contact.id);
  };

  const handleSaveFlow = async (flow: any) => {
    try {
      const { id, ...flowData } = flow;
      if (id) {
        const { error } = await supabase
          .from('crm_flows')
          .update({
            name: flowData.name,
            trigger_type: flowData.trigger_type,
            trigger_keywords: flowData.trigger_keywords,
            is_active: flowData.is_active,
            nodes: flowData.nodes,
            edges: flowData.edges,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('crm_flows')
          .insert([{
            name: flowData.name,
            trigger_type: flowData.trigger_type,
            trigger_keywords: flowData.trigger_keywords,
            is_active: flowData.is_active,
            nodes: flowData.nodes,
            edges: flowData.edges
          }]);
        if (error) throw error;
      }
      toast({ title: "Fluxo salvo com sucesso!" });
      setIsFlowEditorOpen(false);
      setEditingFlow(null);
      fetchData();
    } catch (err: any) {
      toast({ title: "Erro ao salvar fluxo", description: err.message, variant: "destructive" });
    }
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
    <SidebarProvider>
      <div className="h-screen w-full flex overflow-hidden bg-background">
        <Sidebar className="border-r shadow-sm">
          <SidebarHeader className="p-4 border-b flex items-center justify-center">
            <Logo size="sm" />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Navegação</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {[
                    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                    { id: 'contacts', label: 'Conversas', icon: MessageSquare },
                    { id: 'flows', label: 'Fluxos', icon: GitBranch },
                    { id: 'templates', label: 'Templates', icon: FileText },
                    { id: 'settings', label: 'Ajustes', icon: Settings },
                  ].map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton 
                        isActive={activeTab === item.id} 
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                          activeTab === item.id ? "bg-primary/10 text-primary shadow-sm" : "hover:bg-muted"
                        )}
                      >
                        <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-primary" : "text-muted-foreground")} />
                        <span className="font-semibold">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => { logoutAdmin(); navigate('/crm/login'); }}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col flex-1 h-full overflow-hidden">
          <header className="h-16 border-b flex items-center px-6 bg-card/50 backdrop-blur-sm z-10 shrink-0 justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="h-4 w-px bg-border mx-2 hidden md:block" />
              <h1 className="text-xl font-bold tracking-tight capitalize">{activeTab}</h1>
            </div>
            {activeTab === 'contacts' && (
              <Button variant="outline" size="sm" onClick={() => setKanbanView(!kanbanView)}>
                {kanbanView ? <MessageSquare className="w-4 h-4 mr-2" /> : <BarChart3 className="w-4 h-4 mr-2" />}
                {kanbanView ? 'Lista' : 'Kanban'}
              </Button>
            )}
          </header>
          
          <main className="flex-1 overflow-hidden relative flex flex-col">
            {activeTab === 'dashboard' && (
              <ScrollArea className="flex-1 p-8">
                <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">Métricas Gerais</h2>
                    <p className="text-muted-foreground">Visão geral do desempenho da sua operação.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Mensagens Enviadas', value: metrics.sent_count, icon: Send, color: 'blue' },
                      { label: 'Respondidas', value: metrics.responded_count, icon: MessageSquare, color: 'yellow' },
                      { label: 'Contatos Qualificados', value: metrics.qualified_count, icon: CheckCircle2, color: 'purple' },
                      { label: 'Vendas Fechadas', value: metrics.sales_count, icon: DollarSign, color: 'green' },
                    ].map((stat, i) => (
                      <Card key={i} className="relative overflow-hidden group hover:shadow-lg transition-all border-zinc-100 dark:border-zinc-800">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardDescription className="font-bold text-xs uppercase tracking-wider">{stat.label}</CardDescription>
                          <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-black">{stat.value}</div>
                          <div className={`mt-2 h-1 w-full bg-${stat.color}-500/10 rounded-full overflow-hidden`}>
                            <div className={`h-full bg-${stat.color}-500 transition-all duration-1000`} style={{ width: '70%' }} />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'contacts' && (
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
                      <div className="p-4 border-b flex gap-2">
                        <Input placeholder="Buscar..." onChange={e => setStatusFilter(e.target.value || 'all')} />
                      </div>
                      <ScrollArea className="flex-1 min-h-0">
                        {filteredContacts.map(contact => (
                          <button key={contact.id} onClick={() => openChat(contact)} className={`w-full p-4 text-left border-b hover:bg-secondary/30 ${selectedContact?.id === contact.id ? 'bg-secondary/50' : ''}`}>
                            <p className="font-bold truncate">{contact.name || contact.wa_id}</p>
                            <Badge variant="outline" className={getStatusColor(contact.status)}>{contact.status}</Badge>
                          </button>
                        ))}
                      </ScrollArea>
                    </div>
                    <div className={`flex-1 flex flex-col min-h-0 ${!selectedContact ? 'hidden md:flex items-center justify-center opacity-50' : 'flex'}`}>
                      {selectedContact ? (
                        <>
                          <div className="p-4 border-b flex justify-between items-center bg-card shadow-sm z-10">
                            <div className="flex items-center gap-4">
                              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedContact(null)}>
                                <ArrowRight className="h-5 w-5 rotate-180" />
                              </Button>
                              <div className="flex flex-col">
                                <p className="font-bold flex items-center gap-2 text-sm md:text-base">
                                  {selectedContact.name || selectedContact.wa_id}
                                </p>
                              </div>
                            </div>
                          </div>
                          <ScrollArea className="flex-1 p-4">
                            {chatMessages.map(m => (
                              <div key={m.id} className={`flex ${m.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`p-3 rounded-lg max-w-[80%] ${m.direction === 'inbound' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                                  {m.content}
                                </div>
                              </div>
                            ))}
                            <div ref={scrollRef} />
                          </ScrollArea>
                          <div className="p-4 border-t flex gap-2">
                            <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Mensagem..." />
                            <Button onClick={handleSendMessage} disabled={sendingMessage}>Enviar</Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center">Selecione um contato</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'flows' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Fluxos</h2>
                  <Button onClick={() => { setEditingFlow(null); setIsFlowEditorOpen(true); }}>Novo Fluxo</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {flows.map(flow => (
                    <Card key={flow.id} className="p-4">
                      <h3 className="font-bold">{flow.name}</h3>
                      <Button variant="outline" className="mt-4 w-full" onClick={() => { setEditingFlow(flow); setIsFlowEditorOpen(true); }}>Editar</Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Templates</h2>
                  <Button onClick={syncTemplates}>Sincronizar</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {templates.map(t => (
                    <Card key={t.id} className="p-4">
                      <h3 className="font-bold">{t.name}</h3>
                      <Badge>{t.status}</Badge>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="p-6 max-w-2xl">
                <h2 className="text-2xl font-bold mb-6">Configurações</h2>
                <Card className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Token Meta</Label>
                    <Input value={metaSettings.meta_access_token} onChange={e => setMetaSettings({...metaSettings, meta_access_token: e.target.value})} />
                  </div>
                  <Button onClick={handleSaveSettings}>Salvar</Button>
                </Card>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
      {isFlowEditorOpen && (
        <FlowEditor 
          flow={editingFlow} 
          onSave={handleSaveFlow} 
          onClose={() => { setIsFlowEditorOpen(false); setEditingFlow(null); }} 
        />
      )}
    </SidebarProvider>
  );
};

export default CRM;
