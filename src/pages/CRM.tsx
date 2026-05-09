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
                  <Card>
                    <CardHeader className="p-4 border-b">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <Input 
                          placeholder="Pesquisar contatos..." 
                          className="max-w-sm border-none shadow-none focus-visible:ring-0"
                          value={statusFilter === 'all' ? '' : statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value || 'all')}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {filteredContacts.map(contact => (
                          <Card key={contact.id} className="overflow-hidden hover:shadow-md transition-all cursor-pointer" onClick={() => openChat(contact)}>
                            <CardContent className="p-4 flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {contact.name?.[0] || contact.wa_id?.[0] || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold truncate">{contact.name || contact.wa_id}</p>
                                <p className="text-xs text-muted-foreground">{contact.wa_id}</p>
                              </div>
                              <Badge className={getStatusColor(contact.status)}>
                                {getStatusLabel(contact.status)}
                              </Badge>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {templates.map(template => (
                        <Card key={template.id} className="hover:shadow-md transition-all">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-sm font-bold truncate max-w-[150px]">{template.name}</CardTitle>
                              <Badge variant={template.status === 'APPROVED' ? "default" : "secondary"}>
                                {template.status}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="text-xs text-muted-foreground line-clamp-3 mb-4 min-h-[48px]">
                              {template.components?.find((c: any) => c.type === 'BODY')?.text}
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => {
                                setPreviewTemplate(template);
                                setIsFlowEditorOpen(false); // Using similar dialog structure
                              }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
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
                        <Card key={msg.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-full bg-primary/10 text-primary">
                              <Clock className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold">Para: {msg.crm_contacts?.name || msg.crm_contacts?.wa_id}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(msg.scheduled_for).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <Badge variant={msg.status === 'pending' ? "outline" : "default"}>
                            {msg.status === 'pending' ? 'Pendente' : msg.status}
                          </Badge>
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
                <div className="flex-1 flex flex-col min-h-0 relative">
                  {selectedContact ? (
                    <>
                      <div className="p-3 md:p-4 border-b flex justify-between items-center bg-card/80 backdrop-blur-md shadow-sm z-10 sticky top-0">
                        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                          <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setSelectedContact(null)}>
                            <ChevronLeft className="h-5 w-5" />
                          </Button>
                          <div className="flex flex-col min-w-0">
                            <p className="font-bold text-sm md:text-base truncate">{selectedContact.name || selectedContact.wa_id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openContactInfo(selectedContact)}>
                            <Info className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                      <ScrollArea className="flex-1 bg-[url('https://w0.peakpx.com/wallpaper/580/632/HD-wallpaper-whatsapp-background-dark-pattern.jpg')] bg-repeat overflow-y-auto h-full">
                        <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
                          {chatMessages.map((m, idx) => (
                            <div key={m.id || idx} className={cn("flex w-full mb-1", m.direction === 'inbound' ? 'justify-start' : 'justify-end')}>
                              <div className={cn("p-2.5 md:p-3 rounded-2xl max-w-[85%] md:max-w-[70%] shadow-sm", m.direction === 'inbound' ? 'bg-card text-card-foreground rounded-tl-none border' : 'bg-primary text-primary-foreground rounded-tr-none')}>
                                <p className="text-sm md:text-[15px] leading-relaxed break-words whitespace-pre-wrap">{m.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="bg-card px-4 py-3 flex items-end gap-2 border-t shrink-0">
                        <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                          placeholder="Digite uma mensagem..."
                          className="bg-muted/50 border-none h-11 rounded-xl text-sm"
                          rows={1}
                        />
                        <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sendingMessage} className="h-11 w-11 rounded-full">
                          {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center bg-muted/5">
                      <div className="text-center">
                        <MessageSquare className="w-16 h-16 text-primary/30 mx-auto mb-4" />
                        <h2 className="text-xl font-bold">Selecione uma conversa</h2>
                        <p className="text-muted-foreground text-sm">Escolha um contato na barra lateral para iniciar.</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="hidden lg:flex w-80 flex-col border-l bg-card overflow-hidden">
                  <div className="p-4 border-b font-bold flex items-center gap-2">
                    <ListFilter className="w-4 h-4" /> Conversas Recentes
                  </div>
                  <ScrollArea className="flex-1">
                    {filteredContacts.map(contact => (
                      <div 
                        key={contact.id} 
                        onClick={() => openChat(contact)}
                        className={cn(
                          "p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors flex items-center gap-3",
                          selectedContact?.id === contact.id ? "bg-primary/5 border-l-4 border-l-primary" : ""
                        )}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                          {contact.name?.[0] || contact.wa_id?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{contact.name || contact.wa_id}</p>
                          <p className="text-xs text-muted-foreground truncate">{contact.last_message || 'Nenhuma mensagem'}</p>
                        </div>
                        {contact.unread_count > 0 && (
                          <Badge className="bg-primary text-white rounded-full px-1.5 min-w-[20px] h-5 flex items-center justify-center">
                            {contact.unread_count}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </ScrollArea>
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
