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
  Search,
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
  AlertCircle,
  FileCheck2,
  ListFilter,
  Zap,
  Eye,
  EyeOff,
  LayoutDashboard,
  Menu,
  ChevronLeft,
  Facebook,
  Link as LinkIcon,
  UserPlus,
  Download,
  Upload,
  User,
  CalendarClock,
  Calendar,
  MapPin,
  Smile,
  MoreHorizontal,
  Webhook,
  Layers,
  CreditCard,
  Copy,
  Pencil,
  Camera,
  LayoutList,
  MessageCircle,
  Loader2,
  Info
} from "lucide-react";
import * as LucideIcons from 'lucide-react';
const Instagram = (LucideIcons as any).Instagram || Camera;
import TemplatePreview from "@/components/whatsapp/TemplatePreview";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import TemplateBuilder from "@/components/whatsapp/TemplateBuilder";
import FlowEditor from "@/components/crm/FlowEditor";
import { MediaPopup } from "@/components/MediaPopup";
import Broadcaster from "@/components/crm/Broadcaster";
import ModuleManager from "@/components/admin/ModuleManager";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
    google_client_id: '',
    google_client_secret: '',
    openai_api_key: '',
    ai_agent_enabled: false,
    ai_operation_mode: 'chat',
    auto_generate_strategy: false,
    strategy_generation_prompt: 'Analise o histórico acima e gere 3 estratégias personalizadas para converter este cliente. Sugira também 2 perguntas que eliminem as principais dúvidas dele sob o cabeçalho "### Perguntas para Eliminar Dúvidas".',
    ai_system_prompt: 'Você é um assistente de vendas profissional para a empresa Mais Resultados Online. Responda em Português do Brasil.',
    ai_agent_trigger: 'all',
    ai_agent_trigger_keyword: '',
    initial_auto_response_enabled: true,
    initial_response_text: '',
    initial_response_buttons: [],
    shortcut_size: 100,
    tag_size: 100,
    business_hours_enabled: false,
    business_hours_start: '08:00',
    business_hours_end: '18:00',
    business_hours_tz: 'America/Sao_Paulo',
    outside_hours_message: 'Nossos administradores não estão ativos no momento. Seguiremos com o atendimento automatizado e em breve retornaremos com um atendimento humano.',
    google_auto_sync: false,
    vps_transcoder_url: '',
    vps_status: 'unknown' as 'unknown' | 'online' | 'offline',
    important_instructions: '',
    read_templates_enabled: true
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
  const [sourceFilter, setSourceFilter] = useState('all');
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
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [showFlows, setShowFlows] = useState(true);
  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [contactToView, setContactToView] = useState<any>(null);
  const [now, setNow] = useState(Date.now());
  const [isSchedulingOpen, setIsSchedulingOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleType, setScheduleType] = useState<'message' | 'template' | 'flow'>('message');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [updatingKnowledge, setUpdatingKnowledge] = useState<string | null>(null);
  const [improvingPrompt, setImprovingPrompt] = useState(false);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [isNewWebhookDialogOpen, setIsNewWebhookDialogOpen] = useState(false);
  const [newWebhook, setNewWebhook] = useState({ name: '', response_type: 'text' as 'text' | 'template', template_id: '', secret_token: '', is_active: true, default_status: 'new' });
  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [allScheduledMessages, setAllScheduledMessages] = useState<any[]>([]);
  const [showAllContacts, setShowAllContacts] = useState(false);
  const [kanbanStatuses, setKanbanStatuses] = useState<any[]>([]);
  const [isNewStatusDialogOpen, setIsNewStatusDialogOpen] = useState(false);
  const [isEditStatusDialogOpen, setIsEditStatusDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<any>(null);
  const [newStatusData, setNewStatusData] = useState({ label: '', color: 'blue', value: '' });

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (metaSettings.vps_transcoder_url) {
      const checkVps = async () => {
        try {
          const url = metaSettings.vps_transcoder_url.replace(/\/$/, '');
          await fetch(url, { method: 'GET', mode: 'no-cors', signal: AbortSignal.timeout(5000) });
          setMetaSettings(prev => ({ ...prev, vps_status: 'online' }));
        } catch (e) {
          setMetaSettings(prev => ({ ...prev, vps_status: 'offline' }));
        }
      };
      checkVps();
      const interval = setInterval(checkVps, 60000);
      return () => clearInterval(interval);
    }
  }, [metaSettings.vps_transcoder_url]);

  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

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

  const fetchWebhooks = async () => {
    const { data } = await supabase.from('crm_webhooks').select('*').order('created_at', { ascending: false });
    setWebhooks(data || []);
  };

  const fetchStatuses = async () => {
    const { data } = await supabase.from('crm_statuses').select('*').order('sort_order', { ascending: true });
    setKanbanStatuses(data || []);
  };

  const fetchContacts = async () => {
    const { data: contactsData } = await supabase
      .from('crm_contacts')
      .select('*')
      .order('last_interaction', { ascending: false, nullsFirst: false })
      .limit(10000);
    setContacts(contactsData || []);
  };

  useEffect(() => {
    let filtered = contacts;
    if (activeTab === 'contacts') {
      filtered = filtered.filter(c => c.last_interaction !== null);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => 
        c.status === statusFilter || 
        c.name?.toLowerCase().includes(statusFilter.toLowerCase()) || 
        c.wa_id?.includes(statusFilter)
      );
    }
    setFilteredContacts(filtered);
  }, [statusFilter, contacts, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: settingsData } = await supabase.from('crm_settings').select('*').eq('id', '00000000-0000-0000-0000-000000000001').maybeSingle();
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
        .order('last_interaction', { ascending: false, nullsFirst: false })
        .limit(10000);
      setContacts(contactsData || []);

      const { data: templatesData } = await supabase.from('crm_templates').select('*');
      setTemplates(templatesData || []);

      await fetchWebhooks();
      await fetchStatuses();
      await fetchAllScheduledMessages();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { id, created_at, updated_at, webhook_verify_token, vps_status, ...rest } = metaSettings;
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

  const handleImprovePrompt = async () => {
    if (!metaSettings.ai_system_prompt?.trim() || improvingPrompt) {
      toast({ title: "Aviso", description: "Escreva algo no prompt primeiro para que eu possa melhorar." });
      return;
    }
    setImprovingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { action: 'improvePrompt', prompt: metaSettings.ai_system_prompt }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao melhorar prompt");
      setMetaSettings(prev => ({ ...prev, ai_system_prompt: data.improvedPrompt }));
      toast({ title: "Prompt melhorado!" });
    } catch (err: any) {
      toast({ title: "Erro ao melhorar prompt", description: err.message, variant: "destructive" });
    } finally {
      setImprovingPrompt(false);
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
    const textToSend = newMessage.trim();
    setNewMessage('');
    setSendingMessage(true);
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      contact_id: selectedContact.id,
      content: textToSend,
      direction: 'outbound',
      message_type: 'text',
      created_at: new Date().toISOString(),
      isOptimistic: true
    };
    setChatMessages(prev => [...prev, optimisticMessage]);
    try {
      const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { action: 'sendMessage', to: selectedContact.wa_id, text: textToSend }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao enviar mensagem");
      setChatMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      await fetchMessages(selectedContact.id);
    } catch (err: any) {
      setChatMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(textToSend);
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateTemplateKnowledge = async (templateId: string, knowledge: string) => {
    setUpdatingKnowledge(templateId);
    try {
      const { error } = await supabase.from('crm_templates').update({ knowledge_description: knowledge }).eq('id', templateId);
      if (error) throw error;
      setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, knowledge_description: knowledge } : t));
      toast({ title: "Conhecimento atualizado!" });
    } catch (err) {
      toast({ title: "Erro ao atualizar conhecimento", variant: "destructive" });
    } finally {
      setUpdatingKnowledge(null);
    }
  };

  const handleCreateWebhook = async () => {
    if (!newWebhook.name) return;
    setSaving(true);
    try {
      const token = newWebhook.secret_token || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const { error } = await supabase.from('crm_webhooks').insert([{
        name: newWebhook.name,
        response_type: newWebhook.response_type,
        template_id: newWebhook.template_id || null,
        secret_token: token,
        is_active: true,
        default_status: newWebhook.default_status || 'new'
      }]);
      if (error) throw error;
      toast({ title: "Webhook criado!" });
      fetchWebhooks();
      setIsNewWebhookDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Erro ao criar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      const { error } = await supabase.from('crm_webhooks').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Webhook excluído!" });
      fetchWebhooks();
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  };

  const toggleWebhookStatus = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.from('crm_webhooks').update({ is_active: !current }).eq('id', id);
      if (error) throw error;
      fetchWebhooks();
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    }
  };

  const handleCreateStatus = async () => {
    if (!newStatusData.label) return;
    setSaving(true);
    try {
      const value = newStatusData.value || newStatusData.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
      const sortOrder = (kanbanStatuses.length + 1) * 10;
      const { error } = await supabase.from('crm_statuses').insert([{
        label: newStatusData.label,
        value: value,
        color: newStatusData.color,
        sort_order: sortOrder
      }]);
      if (error) throw error;
      toast({ title: "Etiqueta criada!" });
      fetchStatuses();
      setIsNewStatusDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Erro ao criar etiqueta", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!editingStatus || !editingStatus.label) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('crm_statuses').update({ label: editingStatus.label, color: editingStatus.color }).eq('id', editingStatus.id);
      if (error) throw error;
      toast({ title: "Etiqueta atualizada!" });
      fetchStatuses();
      setIsEditStatusDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStatus = async (id: string) => {
    try {
      const { error } = await supabase.from('crm_statuses').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Etiqueta removida!" });
      fetchStatuses();
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    }
  };

  const fetchAllScheduledMessages = async () => {
    const { data, error } = await supabase
      .from('crm_scheduled_messages')
      .select('*, crm_contacts (name, wa_id)')
      .order('scheduled_for', { ascending: true });
    if (error) console.error(error);
    else setAllScheduledMessages(data || []);
  };

  const fetchScheduledMessages = async (contactId: string) => {
    const { data } = await supabase
      .from('crm_scheduled_messages')
      .select('*')
      .eq('contact_id', contactId)
      .eq('status', 'pending')
      .order('scheduled_for', { ascending: true });
    setScheduledMessages(data || []);
  };

  const handleSaveFlow = async (flow: any) => {
    setSaving(true);
    try {
      const { id, ...flowData } = flow;
      const payload = {
        name: flowData.name,
        trigger_type: flowData.trigger_type || 'manual',
        trigger_keywords: flowData.trigger_keywords || [],
        is_active: flowData.is_active !== false,
        nodes: flowData.nodes || [],
        edges: flowData.edges || [],
        updated_at: new Date().toISOString()
      };
      if (id) await supabase.from('crm_flows').update(payload).eq('id', id);
      else await supabase.from('crm_flows').insert([payload]);
      toast({ title: "Fluxo salvo!" });
      setIsFlowEditorOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusObj = kanbanStatuses.find(s => s.value === status);
    if (statusObj) {
      switch (statusObj.color) {
        case 'blue': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        case 'yellow': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
        case 'purple': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
        case 'green': return 'bg-green-500/10 text-green-500 border-green-500/20';
        case 'red': return 'bg-red-500/10 text-red-500 border-red-500/20';
        case 'orange': return 'bg-orange-500 text-white border-orange-600 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]';
        case 'indigo': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
        case 'pink': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
        default: return 'bg-gray-500/10 text-gray-500';
      }
    }
    switch (status) {
      case 'new': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'responded': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'qualified': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'closed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'lost': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'human': return 'bg-orange-500 text-white border-orange-600 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusObj = kanbanStatuses.find(s => s.value === status);
    return statusObj ? statusObj.label : status.toUpperCase();
  };

  const openChat = (contact: any) => {
    setSelectedContact(contact);
    fetchMessages(contact.id);
    fetchScheduledMessages(contact.id);
  };

  const openContactInfo = (contact: any) => {
    setContactToView(contact);
    setIsContactInfoOpen(true);
  };

  if (loading && !contacts.length) return <div className="min-h-screen flex items-center justify-center"><RefreshCcw className="animate-spin" /></div>;

  return (
    <SidebarProvider>
      <div className="h-[100dvh] w-full flex overflow-hidden bg-background">
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
                    { id: 'contact-list', label: 'Contatos', icon: Users },
                    { id: 'broadcast', label: 'Disparador', icon: Zap },
                    { id: 'scheduling', label: 'Agendamentos', icon: Calendar },
                    { id: 'flows', label: 'Fluxos', icon: GitBranch },
                    { id: 'templates', label: 'Templates', icon: FileText },
                    { id: 'ai-agent', label: 'Agente IA', icon: Bot },
                    { id: 'settings', label: 'Ajustes', icon: Settings },
                    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
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
          <header className="h-16 border-b flex items-center px-4 md:px-6 bg-card/50 backdrop-blur-sm z-10 shrink-0 justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="h-4 w-px bg-border mx-2 hidden md:block" />
                {activeTab === 'contact-list' ? 'Contatos' : 
                 activeTab === 'contacts' ? 'Conversas' : 
                 activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </div>
          </header>
          
          <main className="flex-1 overflow-hidden relative flex flex-col bg-background h-full">
            {activeTab === 'dashboard' && (
              <ScrollArea className="flex-1 p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-1">
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Métricas Gerais</h2>
                    <p className="text-muted-foreground text-sm">Visão geral do desempenho da sua operação.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {[
                      { label: 'Mensagens Enviadas', value: metrics.sent_count, icon: Send, color: 'blue' },
                      { label: 'Respondidas', value: metrics.responded_count, icon: MessageSquare, color: 'yellow' },
                      { label: 'Contatos Qualificados', value: metrics.qualified_count, icon: CheckCircle2, color: 'purple' },
                      { label: 'Vendas Fechadas', value: metrics.sales_count, icon: DollarSign, color: 'green' },
                    ].map((stat, i) => (
                      <Card key={i} className="relative overflow-hidden group hover:shadow-lg transition-all border-zinc-100 dark:border-zinc-800">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardDescription className="font-bold text-[10px] md:text-xs uppercase tracking-wider">{stat.label}</CardDescription>
                          <stat.icon className={cn("w-4 h-4 md:w-5 md:h-5", {
                            "text-blue-500": stat.color === 'blue',
                            "text-yellow-500": stat.color === 'yellow',
                            "text-purple-500": stat.color === 'purple',
                            "text-green-500": stat.color === 'green',
                          })} />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl md:text-3xl font-black">{stat.value}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'contact-list' && (
              <ScrollArea className="flex-1 p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">Lista de Contatos</h2>
                      <p className="text-muted-foreground text-sm">Gerencie todos os seus leads e contatos em um só lugar.</p>
                    </div>
                  </div>
                  <Card className="rounded-2xl shadow-sm border overflow-hidden">
                    <CardHeader className="p-4 border-b bg-muted/20">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 w-full sm:max-w-md">
                          <Search className="w-4 h-4 text-muted-foreground" />
                          <Input 
                            placeholder="Pesquisar por nome ou número..." 
                            className="border-none shadow-none focus-visible:ring-0 bg-transparent"
                            value={statusFilter === 'all' ? '' : statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value || 'all')}
                          />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button variant="outline" size="sm" className="flex-1 sm:flex-none rounded-xl">
                            <Download className="w-4 h-4 mr-2" /> Exportar
                          </Button>
                          <Button size="sm" className="flex-1 sm:flex-none rounded-xl">
                            <Plus className="w-4 h-4 mr-2" /> Novo Contato
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 md:p-6 bg-muted/5">
                        {filteredContacts.length === 0 ? (
                          <div className="col-span-full py-12 text-center text-muted-foreground">
                            Nenhum contato encontrado.
                          </div>
                        ) : filteredContacts.map(contact => (
                          <Card key={contact.id} className="overflow-hidden hover:shadow-lg transition-all cursor-pointer border-zinc-100 dark:border-zinc-800 group rounded-2xl" onClick={() => openChat(contact)}>
                            <CardContent className="p-5 flex flex-col gap-4">
                              <div className="flex items-center justify-between">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg group-hover:scale-110 transition-transform">
                                  {contact.name?.[0] || contact.wa_id?.[0] || '?'}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <Badge className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", getStatusColor(contact.status))}>
                                    {getStatusLabel(contact.status)}
                                  </Badge>
                                </div>
                              </div>
                              <div className="min-w-0">
                                <p className="font-black text-sm truncate">{contact.name || contact.wa_id}</p>
                                <p className="text-xs text-muted-foreground font-medium">{contact.wa_id}</p>
                              </div>
                              <div className="flex items-center gap-2 pt-2 border-t mt-1">
                                <Button variant="ghost" size="sm" className="flex-1 h-8 text-[10px] font-bold rounded-lg hover:bg-primary/10 hover:text-primary">
                                  <MessageCircle className="w-3 h-3 mr-1.5" /> Conversar
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg hover:bg-muted" onClick={(e) => {
                                  e.stopPropagation();
                                  openContactInfo(contact);
                                }}>
                                  <Info className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'broadcast' && (
              <div className="flex-1 overflow-hidden">
                <Broadcaster templates={templates} flows={flows} contacts={contacts} />
              </div>
            )}

            {activeTab === 'flows' && (
              <div className="flex-1 h-full relative">
                <div className="p-4 border-b flex justify-between items-center">
                  <h2 className="text-xl font-bold">Fluxos de Automação</h2>
                  <Button onClick={() => { setEditingFlow(null); setIsFlowEditorOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" /> Novo Fluxo
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {flows.map(flow => (
                    <Card key={flow.id} className="hover:shadow-md transition-all">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{flow.name}</CardTitle>
                          <Badge variant={flow.is_active ? "default" : "secondary"}>
                            {flow.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center mt-4">
                          <Button variant="outline" size="sm" onClick={() => { setEditingFlow(flow); setIsFlowEditorOpen(true); }}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => {
                            if (confirm('Deseja excluir este fluxo?')) {
                              await supabase.from('crm_flows').delete().eq('id', flow.id);
                              fetchData();
                            }
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {isFlowEditorOpen && (
                  <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
                    <FlowEditor 
                      flow={editingFlow} 
                      onSave={handleSaveFlow} 
                      onClose={() => setIsFlowEditorOpen(false)} 
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center shrink-0">
                  <h2 className="text-xl font-bold">Templates do WhatsApp</h2>
                  <Button onClick={() => { setPreviewTemplate(null); setPreviewMedia(null); setShowTemplates(false); }}>
                    <Plus className="w-4 h-4 mr-2" /> Novo Template
                  </Button>
                </div>
                {!showTemplates ? (
                  <ScrollArea className="flex-1">
                    <TemplateBuilder 
                      onSave={async (temp) => {
                        const { error } = await supabase.from('crm_templates').insert([temp]);
                        if (error) toast({ title: "Erro ao salvar template", variant: "destructive" });
                        else {
                          toast({ title: "Template criado com sucesso!" });
                          setShowTemplates(true);
                          fetchData();
                        }
                      }}
                    />
                  </ScrollArea>
                ) : (
                  <ScrollArea className="flex-1 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                      {templates.map(template => {
                        const bodyComponent = template.components?.find((c: any) => c.type === 'BODY');
                        const headerComponent = template.components?.find((c: any) => c.type === 'HEADER');
                        const footerComponent = template.components?.find((c: any) => c.type === 'FOOTER');
                        const buttonsComponent = template.components?.find((c: any) => c.type === 'BUTTONS');
                        
                        return (
                          <Card key={template.id} className="hover:shadow-lg transition-all border-zinc-200 dark:border-zinc-800 flex flex-col h-full bg-card group overflow-hidden">
                            <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden shrink-0">
                              {headerComponent?.format === 'IMAGE' ? (
                                <img 
                                  src={headerComponent.example?.header_handle?.[0] || template.header_url || "https://maisonline.com.br/wp-content/uploads/2023/07/mais-resultados-online.png"} 
                                  alt={template.name}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                              ) : headerComponent?.format === 'VIDEO' ? (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                  <Play className="w-12 h-12 text-white/50" />
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FileText className="w-12 h-12 text-zinc-300" />
                                </div>
                              )}
                              <div className="absolute top-2 right-2">
                                <Badge variant={template.status === 'APPROVED' ? "default" : "secondary"} className="shadow-sm">
                                  {template.status}
                                </Badge>
                              </div>
                            </div>
                            <CardHeader className="p-4 pb-2">
                              <CardTitle className="text-sm font-black truncate text-primary">{template.name}</CardTitle>
                              <CardDescription className="text-[10px] uppercase font-bold tracking-widest">{template.category}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between">
                              <p className="text-xs text-muted-foreground line-clamp-3 mb-4 italic leading-relaxed">
                                "{bodyComponent?.text}"
                              </p>
                              <div className="flex justify-between items-center gap-2 pt-2 border-t mt-auto">
                                <Badge variant="outline" className="text-[9px] h-5 bg-muted/30">{template.language}</Badge>
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary" onClick={() => {
                                    setPreviewTemplate(template);
                                  }}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {activeTab === 'scheduling' && (
              <ScrollArea className="flex-1 p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Agendamentos</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {allScheduledMessages.length === 0 ? (
                      <Card className="p-12 text-center text-muted-foreground">
                        Nenhuma mensagem agendada no momento.
                      </Card>
                    ) : (
                      allScheduledMessages.map(msg => (
                        <Card key={msg.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-md transition-all border-l-4 border-l-primary">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                              <Clock className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-sm md:text-base truncate">Para: {msg.crm_contacts?.name || msg.crm_contacts?.wa_id}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground font-medium">
                                  {format(new Date(msg.scheduled_for), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[9px] uppercase tracking-tighter h-4">
                                  {msg.type === 'template' ? 'Template' : msg.type === 'flow' ? 'Fluxo' : 'Mensagem'}
                                </Badge>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                  {msg.content || msg.template_id || msg.flow_id}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                            <Badge variant={msg.status === 'pending' ? "outline" : "default"} className={cn(
                              "text-[10px] font-bold uppercase",
                              msg.status === 'pending' ? "border-amber-500 text-amber-500 bg-amber-500/10" : "bg-emerald-500 text-white"
                            )}>
                              {msg.status === 'pending' ? 'Pendente' : msg.status === 'sent' ? 'Enviado' : msg.status}
                            </Badge>
                            <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 hover:bg-destructive/10" onClick={async () => {
                              if (confirm('Deseja cancelar este agendamento?')) {
                                await supabase.from('crm_scheduled_messages').delete().eq('id', msg.id);
                                fetchAllScheduledMessages();
                              }
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'webhooks' && (
              <ScrollArea className="flex-1 p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold">Webhooks de Entrada</h2>
                      <p className="text-muted-foreground">Conecte ferramentas externas como Typeform ou Hotmart.</p>
                    </div>
                    <Button onClick={() => setIsNewWebhookDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" /> Novo Webhook
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {webhooks.map(webhook => (
                      <Card key={webhook.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-lg">{webhook.name}</p>
                            <p className="text-xs font-mono text-muted-foreground mt-1">ID: {webhook.id}</p>
                          </div>
                          <Switch 
                            checked={webhook.is_active} 
                            onCheckedChange={() => toggleWebhookStatus(webhook.id, webhook.is_active)} 
                          />
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/functions/v1/webhook-handler?id=${webhook.id}&token=${webhook.secret_token}`);
                            toast({ title: "Link copiado!" });
                          }}>
                            <Copy className="w-4 h-4 mr-2" /> Copiar Link
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteWebhook(webhook.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'contacts' && (
              <div className="flex-1 flex overflow-hidden">
                {/* Mobile sidebar for contacts list when no contact is selected */}
                <div className={cn(
                  "w-full lg:w-80 flex flex-col border-r bg-card overflow-hidden transition-all duration-300",
                  selectedContact ? "hidden lg:flex" : "flex"
                )}>
                  <div className="p-4 border-b font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListFilter className="w-4 h-4 text-primary" /> 
                      <span>Conversas Recentes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Conectar Google">
                        <LinkIcon className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Novo Contato">
                        <UserPlus className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Buscar conversa..." 
                        className="pl-9 bg-muted/50 border-none h-9 rounded-xl text-xs"
                        value={statusFilter === 'all' ? '' : statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value || 'all')}
                      />
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    {filteredContacts.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        Nenhuma conversa encontrada.
                      </div>
                    ) : (
                      filteredContacts.map(contact => (
                        <div 
                          key={contact.id} 
                          onClick={() => openChat(contact)}
                          className={cn(
                            "p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors flex items-center gap-3 relative group",
                            selectedContact?.id === contact.id ? "bg-primary/5 border-l-4 border-l-primary" : "border-l-4 border-l-transparent"
                          )}
                        >
                          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 shadow-sm">
                            {contact.name?.[0] || contact.wa_id?.[0] || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <p className="font-bold text-sm truncate pr-1">{contact.name || contact.wa_id}</p>
                              {contact.last_interaction && (
                                <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                                  {format(new Date(contact.last_interaction), "HH:mm", { locale: ptBR })}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">{contact.last_message || 'Inicie uma conversa'}</p>
                          </div>
                          {contact.unread_count > 0 && (
                            <Badge className="bg-primary text-white rounded-full px-1.5 min-w-[20px] h-5 flex items-center justify-center shadow-sm">
                              {contact.unread_count}
                            </Badge>
                          )}
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </div>

                {/* Chat window */}
                <div className={cn(
                  "flex-1 flex flex-col min-h-0 relative",
                  !selectedContact ? "hidden lg:flex" : "flex"
                )}>
                  {selectedContact ? (
                    <>
                      <div className="p-3 md:p-4 border-b flex justify-between items-center bg-card/80 backdrop-blur-md shadow-sm z-20 sticky top-0">
                        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                          <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={() => setSelectedContact(null)}>
                            <ChevronLeft className="h-5 w-5" />
                          </Button>
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 hidden sm:flex">
                            {selectedContact.name?.[0] || selectedContact.wa_id?.[0] || '?'}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <p className="font-bold text-sm md:text-base truncate">{selectedContact.name || selectedContact.wa_id}</p>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                              <span className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-wider">{getStatusLabel(selectedContact.status)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => openContactInfo(selectedContact)}>
                            <Info className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex-1 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat relative overflow-hidden flex flex-col">
                        <div className="absolute inset-0 bg-background/90 backdrop-blur-[2px]"></div>
                        <ScrollArea className="flex-1 relative z-10">
                          <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto flex flex-col">
                            {chatMessages.length === 0 ? (
                              <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-40 grayscale">
                                <MessageCircle className="w-16 h-16 mb-4" />
                                <p className="text-sm font-medium">Nenhuma mensagem nesta conversa</p>
                              </div>
                            ) : (
                              chatMessages.map((m, idx) => (
                                <div key={m.id || idx} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300", m.direction === 'inbound' ? 'justify-start' : 'justify-end')}>
                                  <div className={cn(
                                    "p-3 md:p-4 rounded-2xl max-w-[85%] md:max-w-[70%] shadow-md relative group",
                                    m.direction === 'inbound' 
                                      ? 'bg-card text-card-foreground rounded-tl-none border border-border/50' 
                                      : 'bg-primary text-primary-foreground rounded-tr-none'
                                  )}>
                                    <p className="text-sm md:text-[15px] leading-relaxed break-words whitespace-pre-wrap font-medium">{m.content}</p>
                                    <div className={cn(
                                      "text-[9px] mt-1.5 opacity-60 flex items-center justify-end gap-1",
                                      m.direction === 'inbound' ? 'text-muted-foreground' : 'text-primary-foreground/80'
                                    )}>
                                      {format(new Date(m.created_at), "HH:mm", { locale: ptBR })}
                                      {m.direction === 'outbound' && <Check className="w-3 h-3" />}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                            <div ref={scrollRef} />
                          </div>
                        </ScrollArea>
                      </div>

                      <div className="bg-card/80 backdrop-blur-md px-4 py-4 md:px-6 md:py-5 flex items-end gap-2 md:gap-4 border-t z-20 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                        <div className="flex-1 relative group">
                          <Textarea 
                            value={newMessage} 
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => { 
                              if (e.key === 'Enter' && !e.shiftKey) { 
                                e.preventDefault(); 
                                handleSendMessage(); 
                              } 
                            }}
                            placeholder="Escreva sua mensagem aqui..."
                            className="bg-muted/50 border-none min-h-[48px] max-h-32 rounded-2xl text-sm md:text-base pr-12 transition-all focus-visible:ring-primary/20 focus-visible:bg-muted/80 py-3 resize-none scrollbar-none"
                            rows={1}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-2 bottom-1.5 h-9 w-9 rounded-xl text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Smile className="w-5 h-5" />
                          </Button>
                        </div>
                        <Button 
                          onClick={handleSendMessage} 
                          disabled={!newMessage.trim() || sendingMessage} 
                          className="h-12 w-12 rounded-2xl shadow-lg shadow-primary/30 transition-all active:scale-95 shrink-0"
                        >
                          {sendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-muted/5 p-8 text-center animate-in fade-in duration-500">
                      <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-xl shadow-primary/5">
                        <MessageSquare className="w-12 h-12" />
                      </div>
                      <h2 className="text-2xl font-black tracking-tight mb-2">Central de Atendimento</h2>
                      <p className="text-muted-foreground text-sm md:text-base max-w-sm leading-relaxed">
                        Selecione uma conversa na barra lateral para visualizar o histórico e enviar novas mensagens.
                      </p>
                      <div className="mt-8 flex gap-3">
                        <Button variant="outline" className="rounded-xl px-6" onClick={() => setActiveTab('contact-list')}>
                          <Users className="w-4 h-4 mr-2" /> Ver Contatos
                        </Button>
                        <Button className="rounded-xl px-6" onClick={() => setIsImportExportOpen(true)}>
                          <LinkIcon className="w-4 h-4 mr-2" /> Conectar Google
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'ai-agent' && (

              <ScrollArea className="flex-1 bg-muted/5">
                <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 md:space-y-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-4 md:p-6 rounded-2xl border shadow-sm gap-4">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Bot className="w-6 h-6 text-primary" /> Agente de Inteligência Artificial
                      </h2>
                      <p className="text-muted-foreground text-xs md:text-sm">Personalize o comportamento e as instruções da sua IA.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/20 p-2 rounded-xl border w-full sm:w-auto justify-between sm:justify-start">
                      <Label htmlFor="ai-agent-enabled" className="text-xs md:text-sm font-bold">Ativação Geral</Label>
                      <Switch 
                        id="ai-agent-enabled"
                        checked={metaSettings.ai_agent_enabled}
                        onCheckedChange={(val) => setMetaSettings({...metaSettings, ai_agent_enabled: val})}
                      />
                    </div>
                  </div>

                  <Card className="rounded-2xl shadow-sm border overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b p-4 md:p-6">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Bot className="w-5 h-5 text-primary" />
                          <div>
                            <CardTitle className="text-base md:text-lg">Instruções do Agente (Cérebro)</CardTitle>
                            <CardDescription className="text-xs">Defina a personalidade e o objetivo do seu robô</CardDescription>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleImprovePrompt}
                          disabled={improvingPrompt}
                          className="h-8 md:h-9 text-[10px] md:text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 border-indigo-500 text-white shadow-md transition-all active:scale-95 rounded-xl w-full sm:w-auto"
                        >
                          {improvingPrompt ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />}
                          Melhorar Prompt com I.A
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6">
                      <Textarea 
                        rows={12}
                        className="resize-none font-mono text-[11px] md:text-xs leading-relaxed bg-muted/10 rounded-xl"
                        placeholder="Ex: Você é um consultor de vendas especializado em..."
                        value={metaSettings.ai_system_prompt}
                        onChange={(e) => setMetaSettings({...metaSettings, ai_system_prompt: e.target.value})}
                      />
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <Card className="rounded-2xl shadow-sm border overflow-hidden">
                      <CardHeader className="bg-primary/5 border-b p-4">
                        <CardTitle className="text-sm md:text-base flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-primary" /> Instruções Importantes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <Textarea 
                          rows={6}
                          className="resize-none font-mono text-[11px] md:text-xs leading-relaxed bg-muted/10 rounded-xl"
                          placeholder="Instruções específicas sobre o que a IA deve ou não fazer..."
                          value={metaSettings.important_instructions}
                          onChange={(e) => setMetaSettings({...metaSettings, important_instructions: e.target.value})}
                        />
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl shadow-sm border overflow-hidden">
                      <CardHeader className="bg-primary/5 border-b p-4">
                        <CardTitle className="text-sm md:text-base flex items-center gap-2">
                          <Layers className="w-4 h-4 text-primary" /> Conhecimento dos Templates
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-xs font-bold">Leitura de Templates</Label>
                            <p className="text-[10px] text-muted-foreground">Permitir que a IA utilize o conteúdo dos templates aprovados.</p>
                          </div>
                          <Switch 
                            checked={metaSettings.read_templates_enabled}
                            onCheckedChange={(val) => setMetaSettings({...metaSettings, read_templates_enabled: val})}
                          />
                        </div>
                        <p className="text-[11px] bg-muted/30 p-3 rounded-lg italic text-muted-foreground border border-dashed">
                          O agente analisará automaticamente os templates aprovados para sugerir respostas baseadas neles quando for pertinente.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveSettings} 
                      disabled={saving}
                      size="lg"
                      className="px-8 h-12 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform w-full sm:w-auto"
                    >
                      {saving ? <RefreshCcw className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                      Salvar Agente I.A
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'settings' && (
              <ScrollArea className="flex-1 bg-muted/5">
                <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 md:space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card p-4 md:p-6 rounded-2xl border shadow-sm gap-4">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight">Ajustes e Configurações</h2>
                      <p className="text-muted-foreground text-xs md:text-sm">Gerencie integrações e a aparência do seu CRM.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-card">
                      <CardHeader className="bg-muted/30 border-b p-4 md:p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary"><MessageSquare className="w-5 h-5" /></div>
                          <div>
                            <CardTitle className="text-base md:text-lg">WhatsApp API</CardTitle>
                            <CardDescription className="text-[11px]">Meta Business Platform.</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 md:p-6 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground">Access Token</Label>
                          <Input type="password" placeholder="EAA..." className="bg-muted/30 border-none h-10 rounded-xl text-sm" value={metaSettings.meta_access_token} onChange={e => setMetaSettings({...metaSettings, meta_access_token: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground">Phone ID</Label>
                          <Input placeholder="Ex: 109..." className="bg-muted/30 border-none h-10 rounded-xl text-sm" value={metaSettings.meta_phone_number_id} onChange={e => setMetaSettings({...metaSettings, meta_phone_number_id: e.target.value})} />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-card">
                      <CardHeader className="bg-muted/30 border-b p-4 md:p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary"><Settings className="w-5 h-5" /></div>
                          <div>
                            <CardTitle className="text-base md:text-lg">OpenAI API</CardTitle>
                            <CardDescription className="text-[11px]">Configurações de I.A.</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 md:p-6 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground">OpenAI API Key</Label>
                          <Input type="password" placeholder="sk-..." className="bg-muted/30 border-none h-10 rounded-xl text-sm" value={metaSettings.openai_api_key} onChange={e => setMetaSettings({...metaSettings, openai_api_key: e.target.value})} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveSettings} disabled={saving} size="lg" className="px-8 h-12 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform w-full sm:w-auto">
                      {saving ? <RefreshCcw className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                      Salvar Ajustes
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default CRM;
