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
  ArrowRight,
  Check,
  Clock as ClockIcon,
  AlertCircle,
  FileCheck2,
  ListFilter,
  Zap,
  Eye
} from "lucide-react";
import TemplatePreview from "@/components/whatsapp/TemplatePreview";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import TemplateBuilder from "@/components/whatsapp/TemplateBuilder";
import FlowEditor from "@/components/crm/FlowEditor";

const CRM = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
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

  const [newStep, setNewStep] = useState<any>({
    step_type: 'text',
    message_text: '',
    delay_seconds: 5,
    media_url: '',
    media_type: ''
  });

  const [confirmSend, setConfirmSend] = useState<{
    type: 'template' | 'flow';
    id: string;
    name: string;
    language?: string;
  } | null>(null);

  const [previewTemplate, setPreviewTemplate] = useState<any>(null);

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
      // Upload to Supabase Storage
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
    
    // For audio files, we can ask or assume if they want it as PTT
    const isVoice = uploadType === 'audio'; // Default to true if user selects audio file in chat? Or maybe we can keep it as standard audio
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
    // A lógica de fallback para mensagens normais dentro de 24h agora é processada 
    // diretamente na Edge Function para maior confiabilidade.


    setSendingMessage(true);
    try {
      // Logic to handle template variables
      const components: any[] = [];
      const bodyComponent = template?.components?.find((c: any) => c.type === 'BODY');
      const headerComponent = template?.components?.find((c: any) => c.type === 'HEADER');
      
      // Handle Header variables or images
      if (headerComponent) {
        if (headerComponent.format === 'IMAGE') {
          // Use example image only if it's not a Meta CDN link
          const handleOrUrl = headerComponent.example?.header_handle?.[0];
          
          if (handleOrUrl && handleOrUrl.startsWith('http') && !handleOrUrl.includes('whatsapp.net')) {
            components.push({
              type: "header",
              parameters: [
                {
                  type: "image",
                  image: { link: handleOrUrl }
                }
              ]
            });
          }
          // If it's a Meta link, we don't send the parameter here
          // and let the Edge Function handle the fallback or use its own logic
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
            // Use contact name for {{1}} if available
            if (index === 0 && selectedContact.name) {
              return { type: "text", text: selectedContact.name };
            }
            
            // Try to get from example
            const exampleData = bodyComponent.example?.body_text?.[0] || [];
            
            // If exampleData is a string or array, try to extract values
            let val = "---";
            if (Array.isArray(exampleData)) {
              if (exampleData.length === 1 && typeof exampleData[0] === 'string' && bodyVariables.length > 1) {
                // Handle case where all examples are in one space-separated string
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
          
          components.push({
            type: "body",
            parameters: parameters
          });
        }
      }

      console.log('Sending template with components:', components);

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
      if (!data.success) {
        throw new Error(data.error || "Erro ao enviar template pela Meta");
      }
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
      
      if (!data.success) {
        throw new Error(data.error || "Erro ao criar template na Meta");
      }
      
      toast({ title: "Template enviado para aprovação!" });
      fetchData();
    } catch (err: any) {
      console.error('Error creating template:', err);
      toast({ 
        title: "Erro ao criar template", 
        description: err.message || "Verifique as configurações da API Meta",
        variant: "destructive" 
      });
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
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Logo size="sm" />
          <Button variant="ghost" size="sm" onClick={() => { logoutAdmin(); navigate('/crm/login'); }}><LogOut className="mr-2 h-4 w-4" /> Sair</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 flex-1 flex flex-col min-h-0 overflow-hidden">
        <Tabs defaultValue="contacts" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto gap-2 bg-transparent p-0 mb-6">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border shadow-sm py-2">Dashboard</TabsTrigger>
            <TabsTrigger value="contacts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border shadow-sm py-2">Contatos/CRM</TabsTrigger>
            <TabsTrigger value="flows" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border shadow-sm py-2">Fluxos</TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border shadow-sm py-2">Templates</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border shadow-sm py-2">Ajustes</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card><CardHeader><CardDescription>Enviadas</CardDescription><CardTitle>{metrics.sent_count}</CardTitle></CardHeader></Card>
              <Card><CardHeader><CardDescription>Respondidas</CardDescription><CardTitle>{metrics.responded_count}</CardTitle></CardHeader></Card>
              <Card><CardHeader><CardDescription>Qualificadas</CardDescription><CardTitle>{metrics.qualified_count}</CardTitle></CardHeader></Card>
              <Card><CardHeader><CardDescription>Vendas</CardDescription><CardTitle>{metrics.sales_count}</CardTitle></CardHeader></Card>
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="flex-1 flex flex-col min-h-0 border rounded-xl overflow-hidden glass-card shadow-lg bg-card/30 backdrop-blur-sm">
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
                    <div className="p-4 border-b flex gap-2">
                      <Input placeholder="Buscar..." onChange={e => setStatusFilter(e.target.value || 'all')} />
                    </div>
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
                          <div className="flex flex-col">
                            <p className="font-bold flex items-center gap-2">
                              {selectedContact.name || selectedContact.wa_id}
                              {selectedContact.flow_state && selectedContact.flow_state !== 'idle' && (
                                <div className="flex flex-col items-start gap-1">
                                  <Badge variant="outline" className={`text-[10px] animate-pulse flex items-center gap-1 ${selectedContact.flow_state === 'error' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-primary/10'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full animate-ping ${selectedContact.flow_state === 'error' ? 'bg-red-500' : 'bg-primary'}`} />
                                    {selectedContact.flow_state === 'error' ? 'Erro no Fluxo' : `Fluxo: ${selectedContact.flow_state}`}
                                  </Badge>
                                  {countdown !== null && countdown > 0 && (
                                    <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                      <Clock className="w-3 h-3" />
                                      Próxima msg em: {countdown}s
                                    </div>
                                  )}
                                </div>
                              )}
                            </p>
                            {selectedContact.last_interaction && (
                              <div className="flex items-center gap-1 mt-1">
                                <ClockIcon className={`w-3 h-3 ${getWindowInfo(selectedContact.last_interaction)?.isExpired ? 'text-destructive' : 'text-green-500'}`} />
                                <span className={`text-[10px] font-medium ${getWindowInfo(selectedContact.last_interaction)?.isExpired ? 'text-destructive' : 'text-green-500'}`}>
                                  {getWindowInfo(selectedContact.last_interaction)?.label}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => updateContactStatus(selectedContact.id, { status: 'qualified' })} className="hidden sm:flex">Qualificar</Button>
                            <Button size="sm" className="bg-green-600 hidden sm:flex text-white hover:bg-green-700" onClick={() => updateContactStatus(selectedContact.id, { status: 'closed' })}>Venda</Button>
                            
                            {selectedContact.flow_state && selectedContact.flow_state !== 'idle' ? (
                              <div className="flex gap-1">
                                {selectedContact.flow_state === 'paused' || selectedContact.flow_state === 'error' ? (
                                  <Button 
                                    size="sm" 
                                    variant="secondary" 
                                    className={`${selectedContact.flow_state === 'error' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white h-8`}
                                    onClick={async () => {
                                      const { error } = await supabase.functions.invoke('meta-whatsapp-crm', {
                                        body: { action: 'continueFlow', contactId: selectedContact.id, waId: selectedContact.wa_id }
                                      });
                                      if (error) toast({ title: "Erro ao continuar", variant: "destructive" });
                                      else {
                                        fetchMessages(selectedContact.id);
                                        toast({ title: selectedContact.flow_state === 'error' ? "Tentando novamente..." : "Fluxo retomado!" });
                                      }
                                    }}
                                  >
                                    {selectedContact.flow_state === 'error' ? <RefreshCcw className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />} 
                                    {selectedContact.flow_state === 'error' ? 'Tentar Denovo' : 'Retomar'}
                                  </Button>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="secondary" 
                                    className="bg-amber-500 text-white hover:bg-amber-600 h-8"
                                    onClick={async () => {
                                      const { error } = await supabase.from('crm_contacts').update({ flow_state: 'paused' }).eq('id', selectedContact.id);
                                      if (error) toast({ title: "Erro ao pausar", variant: "destructive" });
                                      else {
                                        setSelectedContact(prev => ({ ...prev, flow_state: 'paused' }));
                                        toast({ title: "Fluxo pausado!" });
                                      }
                                    }}
                                  >
                                    <StopCircle className="w-3 h-3 mr-1" /> Pausar
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  className="h-8"
                                  onClick={async () => {
                                    if (confirm('Deseja realmente CANCELAR este fluxo?')) {
                                      const { error } = await supabase.from('crm_contacts').update({ 
                                        flow_state: 'idle', 
                                        current_flow_id: null,
                                        current_node_id: null
                                      }).eq('id', selectedContact.id);
                                      
                                      if (error) toast({ title: "Erro ao cancelar", variant: "destructive" });
                                      else {
                                        setSelectedContact(prev => ({ ...prev, flow_state: 'idle', current_flow_id: null, current_node_id: null }));
                                        toast({ title: "Fluxo cancelado!" });
                                      }
                                    }
                                  }}
                                >
                                  <XCircle className="w-3 h-3 mr-1" /> Cancelar
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className="bg-muted/10 border-b px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar items-center">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground shrink-0 flex items-center gap-1"><Zap className="w-3 h-3" /> Atalhos:</span>
                          {templates.slice(0, 5).map(t => (
                            <Button 
                              key={t.id} 
                              variant="secondary" 
                              size="sm" 
                              className="h-7 text-[10px] px-2 whitespace-nowrap"
                              onClick={() => handleSendTemplate(t.name, t.language || 'pt_BR')}
                              disabled={sendingMessage}
                            >
                              {t.name}
                              {t.status !== 'APPROVED' && <ClockIcon className="w-2 h-2 ml-1 opacity-50" />}
                            </Button>
                          ))}
                          <div className="w-px h-4 bg-border mx-1" />
                          {flows.slice(0, 5).map(f => (
                            <Button 
                              key={f.id} 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-[10px] px-2 whitespace-nowrap border-primary/20 text-primary"
                              onClick={() => handleTriggerFlow(f.id)}
                              disabled={sendingMessage}
                            >
                              <GitBranch className="w-2 h-2 mr-1" /> {f.name}
                            </Button>
                          ))}
                        </div>
                        <ScrollArea className="flex-1 p-4">
                          <div className="space-y-4">
                            {chatMessages.map(m => (
                              <div key={m.id} className={`flex ${m.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`p-3 rounded-2xl max-w-[80%] shadow-sm ${m.direction === 'inbound' ? 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-none border border-zinc-100 dark:border-zinc-700' : 'bg-primary text-primary-foreground rounded-tr-none'}`}>
                                  {m.media_url && (
                                    <div className="mb-2 overflow-hidden rounded-lg">
                                      {m.message_type === 'image' || (m.message_type === 'template' && m.media_url.match(/\.(jpg|jpeg|png|gif|webp)/i)) ? (
                                        <img src={m.media_url} alt="Mídia" className="max-w-full h-auto cursor-pointer hover:opacity-90" onClick={() => window.open(m.media_url, '_blank')} />
                                      ) : m.message_type === 'video' ? (
                                        <video src={m.media_url} controls className="max-w-full rounded-lg" />
                                      ) : m.message_type === 'audio' ? (
                                        <audio src={m.media_url} controls className="max-w-full h-8" />
                                      ) : (
                                        <a href={m.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-black/5 dark:bg-white/5 rounded text-xs hover:bg-black/10 transition-colors">
                                          <Paperclip className="w-4 h-4" /> Ver anexo
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                                  <div className="text-[9px] mt-1 opacity-50 flex justify-end">
                                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              </div>
                            ))}
                            <div ref={scrollRef} />
                          </div>
                        </ScrollArea>
                        <div className="p-4 border-t bg-muted/20">
                          {isRecording ? (
                            <div className="flex items-center justify-between bg-primary/10 p-2 rounded-lg border border-primary/20 animate-pulse">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                <span className="text-xs font-mono">Gravando: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="ghost" onClick={() => { stopRecording(); setIsRecording(false); cancelAudioPreview(); }} className="text-destructive h-8 w-8 p-0">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button size="sm" onClick={stopRecording} className="bg-red-500 hover:bg-red-600 text-white h-8 px-3 text-xs">
                                  <StopCircle className="h-4 w-4 mr-1" /> Parar Gravação
                                </Button>
                              </div>
                            </div>
                          ) : isPreviewingAudio ? (
                            <div className="flex items-center gap-4 bg-primary/5 p-2 rounded-lg border border-primary/10">
                              <audio src={recordedAudioUrl || ""} controls className="h-8 flex-1" />
                              <div className="flex gap-2">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  onClick={cancelAudioPreview}
                                  className="h-9 w-9 text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  onClick={sendRecordedAudio}
                                  disabled={sendingMessage}
                                  className="h-9 w-9 bg-primary text-white hover:bg-primary/90"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2 items-center">
                              <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                onChange={handleFileSelect}
                                accept={uploadType === 'image' ? 'image/*' : uploadType === 'video' ? 'video/*' : uploadType === 'audio' ? 'audio/*' : '*'}
                              />
                              <div className="flex gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-9 w-9 text-muted-foreground hover:text-primary"
                                  onClick={() => { setUploadType('image'); setTimeout(() => fileInputRef.current?.click(), 100); }}
                                >
                                  <ImageIcon className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-9 w-9 text-muted-foreground hover:text-primary"
                                  onClick={() => { setUploadType('video'); setTimeout(() => fileInputRef.current?.click(), 100); }}
                                >
                                  <Video className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-9 w-9 text-muted-foreground hover:text-primary"
                                  onClick={() => { setUploadType('audio'); setTimeout(() => fileInputRef.current?.click(), 100); }}
                                >
                                  <Mic className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-9 w-9 text-muted-foreground hover:text-primary"
                                  onClick={() => { setUploadType('document'); setTimeout(() => fileInputRef.current?.click(), 100); }}
                                >
                                  <Paperclip className="h-4 w-4" />
                                </Button>
                              </div>

                              <Input 
                                value={newMessage} 
                                onChange={e => setNewMessage(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()} 
                                placeholder="Digite uma mensagem..." 
                                className="bg-background flex-1"
                              />
                              
                              <Button 
                                onClick={handleSendMessage} 
                                disabled={sendingMessage || (!newMessage.trim())} 
                                size="icon"
                                className={newMessage.trim() ? "bg-primary" : "bg-muted text-muted-foreground"}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              
                              <Button 
                                onClick={startRecording} 
                                disabled={sendingMessage} 
                                size="icon"
                                variant="outline"
                                className="h-10 w-10 rounded-full border-primary/20 text-primary hover:bg-primary/10"
                              >
                                <Mic className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-center space-y-4">
                        <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground opacity-20" />
                        <p className="text-muted-foreground">Selecione uma conversa para começar</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="flows" className="flex-1 flex flex-col min-h-0 border rounded-xl overflow-hidden glass-card shadow-lg bg-card/30 backdrop-blur-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Fluxos de Automação</h2>
                <p className="text-muted-foreground">Crie gatilhos e sequências automáticas de mensagens</p>
              </div>
              <Button onClick={() => { setEditingFlow(null); setIsFlowEditorOpen(true); }} className="shadow-md">
                <Plus className="w-4 h-4 mr-2" /> Novo Fluxo Visual
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
              {flows.map((flow) => (
                <Card key={flow.id} className="overflow-hidden border border-zinc-200 dark:border-zinc-800">
                  <CardHeader className="bg-muted/30 pb-3">
                    <CardTitle className="text-base truncate">{flow.name}</CardTitle>
                    <CardDescription className="text-xs">{flow.trigger_type || 'Gatilho Manual'}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingFlow(flow); setIsFlowEditorOpen(true); }}>
                        Editar Visual
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                        if (confirm('Deseja excluir este fluxo?')) {
                          await supabase.from('crm_flows').delete().eq('id', flow.id);
                          fetchData();
                        }
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="templates" className="flex-1 flex flex-col min-h-0 border rounded-xl overflow-hidden glass-card shadow-lg bg-card/30 backdrop-blur-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Templates do WhatsApp</h2>
                <p className="text-muted-foreground">Gerencie seus modelos de mensagem oficiais da Meta</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={syncTemplates} disabled={syncingTemplates}>
                  <RefreshCcw className={`w-4 h-4 mr-2 ${syncingTemplates ? 'animate-spin' : ''}`} />
                  Sincronizar com Meta
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button><Plus className="w-4 h-4 mr-2" /> Novo Template</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl h-[90vh] p-0">
                    <ScrollArea className="h-full">
                      <TemplateBuilder onSave={handleSaveTemplate} isSaving={saving} />
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Dialog open={!!confirmSend} onOpenChange={(open) => !open && setConfirmSend(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar Envio</DialogTitle>
                  <DialogDescription>
                    Você tem certeza que deseja enviar o {confirmSend?.type === 'template' ? 'template' : 'fluxo'} <strong>"{confirmSend?.name}"</strong> para {selectedContact?.name || selectedContact?.wa_id}?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmSend(null)}>Cancelar</Button>
                  <Button onClick={() => {
                    if (confirmSend?.type === 'template') {
                      handleSendTemplate(confirmSend.id, confirmSend.language || 'pt_BR');
                    } else if (confirmSend?.type === 'flow') {
                      handleTriggerFlow(confirmSend.id);
                    }
                  }}>Confirmar e Enviar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <ScrollArea className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
              {templates.map((template) => {
                const header = template.components?.find((c: any) => c.type === 'HEADER');
                const body = template.components?.find((c: any) => c.type === 'BODY');
                const footer = template.components?.find((c: any) => c.type === 'FOOTER');
                const buttonsComp = template.components?.find((c: any) => c.type === 'BUTTONS');

                return (
                  <Card key={template.id} className="overflow-hidden border-zinc-200 dark:border-zinc-800 flex flex-col">
                    <CardHeader className="bg-muted/30 pb-3">
                      <div className="flex justify-between items-start">
                        <Badge variant={
                          template.status === 'APPROVED' ? 'default' : 
                          template.status === 'REJECTED' ? 'destructive' : 'secondary'
                        } className="mb-2">
                          {template.status === 'APPROVED' ? <Check className="w-3 h-3 mr-1" /> : 
                           template.status === 'REJECTED' ? <XCircle className="w-3 h-3 mr-1" /> : 
                           <ClockIcon className="w-3 h-3 mr-1" />}
                          {template.status}
                        </Badge>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-primary" 
                            onClick={() => setPreviewTemplate(template)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive" 
                            onClick={() => {
                              if (confirm(`Deseja realmente excluir o template "${template.name}" da Meta? Esta ação é irreversível.`)) {
                                handleDeleteTemplate(template.name);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-base truncate">{template.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {template.category === 'MARKETING' ? '📢 Marketing' : 
                           template.category === 'UTILITY' ? '🛠️ Utilidade' : 
                           '🔐 Autenticação'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{template.language}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 bg-[#e5ddd5]/30 dark:bg-zinc-900/50 flex-1 flex flex-col justify-between">
                      <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-700">
                        {header && header.format === 'IMAGE' && header.example?.header_handle?.[0] && (
                          <div className="mb-2 aspect-video overflow-hidden rounded bg-muted">
                            <img 
                              src={header.example.header_handle[0]} 
                              alt="Header" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="text-[13px] text-zinc-800 dark:text-zinc-200 line-clamp-3">
                          {body?.text}
                        </div>
                        {footer?.text && (
                          <div className="text-[10px] text-muted-foreground mt-1 uppercase">
                            {footer.text}
                          </div>
                        )}
                      </div>
                      {buttonsComp?.buttons && buttonsComp.buttons.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {buttonsComp.buttons.map((btn: any, idx: number) => (
                            <div key={idx} className="bg-white/80 dark:bg-zinc-800/80 p-1.5 rounded text-[11px] text-center text-blue-500 font-medium border border-zinc-100 dark:border-zinc-700">
                              {btn.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              </div>
            </ScrollArea>

            <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
              <DialogContent className="max-w-md p-0 overflow-hidden bg-transparent border-none shadow-none">
                {previewTemplate && (
                  <TemplatePreview 
                    name={previewTemplate.name}
                    headerType={previewTemplate.components?.find((c: any) => c.type === 'HEADER')?.format || 'NONE'}
                    headerText={previewTemplate.components?.find((c: any) => c.type === 'HEADER')?.text}
                    headerUrl={previewTemplate.components?.find((c: any) => c.type === 'HEADER')?.example?.header_handle?.[0]}
                    bodyText={previewTemplate.components?.find((c: any) => c.type === 'BODY')?.text || ''}
                    footerText={previewTemplate.components?.find((c: any) => c.type === 'FOOTER')?.text}
                    buttons={previewTemplate.components?.find((c: any) => c.type === 'BUTTONS')?.buttons || []}
                  />
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações da API Meta</CardTitle>
                <CardDescription>Configure suas credenciais do Facebook Business</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Access Token (Permanente)</Label>
                    <Input type="password" value={metaSettings.meta_access_token} onChange={e => setMetaSettings({...metaSettings, meta_access_token: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number ID</Label>
                    <Input value={metaSettings.meta_phone_number_id} onChange={e => setMetaSettings({...metaSettings, meta_phone_number_id: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp Business Account ID</Label>
                    <Input value={metaSettings.meta_waba_id} onChange={e => setMetaSettings({...metaSettings, meta_waba_id: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Meta App ID (Opcional)</Label>
                    <Input value={metaSettings.meta_app_id} onChange={e => setMetaSettings({...metaSettings, meta_app_id: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Meta App Secret (Opcional)</Label>
                    <Input type="password" value={metaSettings.meta_app_secret} onChange={e => setMetaSettings({...metaSettings, meta_app_secret: e.target.value})} />
                  </div>
                </div>
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {isFlowEditorOpen && (
        <FlowEditor 
          flow={editingFlow} 
          onSave={handleSaveFlow} 
          onClose={() => {
            setIsFlowEditorOpen(false);
            setEditingFlow(null);
          }} 
        />
      )}
    </div>
  );
};

// Subcomponents for the Dialog
import { DialogTrigger } from "@/components/ui/dialog";

export default CRM;
