import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
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
  MessageCircle
} from "lucide-react";
import * as LucideIcons from 'lucide-react';
const Instagram = (LucideIcons as any).Instagram || Camera;
import TemplatePreview from "@/components/whatsapp/TemplatePreview";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Progress } from "@/components/ui/progress";

const encodeAudioBufferToWav = (audioBuffer: AudioBuffer) => {
  const channels = Math.min(audioBuffer.numberOfChannels, 2);
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + samples * blockAlign);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples * blockAlign, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples * blockAlign, true);

  let offset = 44;
  const channelData = Array.from({ length: channels }, (_, index) => audioBuffer.getChannelData(index));
  for (let i = 0; i < samples; i++) {
    for (let channel = 0; channel < channels; channel++) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return buffer;
};

const createMobilePlayableAudioBlob = async (audioBlob: Blob) => {
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextCtor) return null;

  const context = new AudioContextCtor();
  try {
    const sourceBuffer = await audioBlob.arrayBuffer();
    const decoded = await context.decodeAudioData(sourceBuffer.slice(0));
    return new Blob([encodeAudioBufferToWav(decoded)], { type: 'audio/wav' });
  } catch (error) {
    console.warn('Não foi possível gerar cópia WAV para o histórico mobile:', error);
    return null;
  } finally {
    context.close?.();
  }
};

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
    google_client_id: '811195616147-3v5531d27p0v61st1e75m6lshk1m1n7f.apps.googleusercontent.com',
    google_client_secret: '',
    openai_api_key: '',
    ai_agent_enabled: false,
    ai_operation_mode: 'chat',
    auto_generate_strategy: false,
    strategy_generation_prompt: 'Analise o histórico acima e gere uma análise detalhada. Destaque pontos positivos da conversa e sugira o que dizer daqui para frente para converter este cliente. Sugira também 2 perguntas que eliminem as principais dúvidas dele sob o cabeçalho \"### Perguntas para Eliminar Dúvidas\".',
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
    business_description: 'Empresa especializada em soluções digitais e vendas online através do WhatsApp e redes sociais.',
    google_auto_sync: false,
    vps_transcoder_url: '',
    vps_status: 'unknown' as 'unknown' | 'online' | 'offline'
  });

  const [metrics, setMetrics] = useState<any>({
    sent_count: 0,
    responded_count: 0,
    qualified_count: 0,
    sales_count: 0,
    conv_24h_count: 0 // Nova métrica: conversas 24h
  });
  const [conversationStats, setConversationStats] = useState({
    paidThisMonth: 0,
    activeWindow24h: 0,
    monthLabel: '',
    paidThisWeek: 0,
    activeThisWeek: 0
  });
  const CONVERSATION_COST = 0.33;
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
  const [googleContactsEnabled, setGoogleContactsEnabled] = useState(localStorage.getItem('google_contacts_connected') === 'true');
  const [mediaUploadProgress, setMediaUploadProgress] = useState<{ [key: string]: number }>({});

  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [allScheduledMessages, setAllScheduledMessages] = useState<any[]>([]);
  const [showAllContacts, setShowAllContacts] = useState(false);

  // States for custom statuses
  const [kanbanStatuses, setKanbanStatuses] = useState<any[]>([]);
  const [isNewStatusDialogOpen, setIsNewStatusDialogOpen] = useState(false);
  const [isEditStatusDialogOpen, setIsEditStatusDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<any>(null);
  const [newStatusData, setNewStatusData] = useState({ label: '', color: 'blue', value: '' });
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [isMetricsListOpen, setIsMetricsListOpen] = useState(false);
  const [metricsListType, setMetricsListType] = useState<'paid' | 'active' | 'weekly_paid' | 'weekly_active' | null>(null);
  const [metricsListData, setMetricsListData] = useState<any[]>([]);
  const [metricsChartData, setMetricsChartData] = useState<any[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [activeFlowsView, setActiveFlowsView] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const computeConversationStats = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: monthMsgs } = await supabase
        .from('crm_messages')
        .select('contact_id, direction, created_at')
        .gte('created_at', startOfMonth)
        .order('created_at', { ascending: true })
        .limit(2000);

      const byContact: Record<string, any[]> = {};
      (monthMsgs || []).forEach((m: any) => {
        if (!m.contact_id) return;
        (byContact[m.contact_id] = byContact[m.contact_id] || []).push(m);
      });

      const DAY = 24 * 60 * 60 * 1000;
      let paidCount = 0;
      let paidWeek = 0;
      
      Object.values(byContact).forEach((msgs) => {
        let lastInbound = -Infinity;
        let lastPaidStart = -Infinity;
        const weekTime = new Date(startOfWeek).getTime();
        
        for (const m of msgs) {
          const t = new Date(m.created_at).getTime();
          if (m.direction === 'inbound') {
            lastInbound = t;
          } else if (m.direction === 'outbound') {
            const inFreeWindow = t - lastInbound < DAY;
            const inPaidWindow = t - lastPaidStart < DAY;
            if (!inFreeWindow && !inPaidWindow) {
              paidCount++;
              if (t >= weekTime) paidWeek++;
              lastPaidStart = t;
            }
          }
        }
      });

      const { data: recent } = await supabase
        .from('crm_messages')
        .select('contact_id, direction, created_at')
        .eq('direction', 'inbound')
        .gte('created_at', since24h)
        .limit(1000);

      const activeSet = new Set<string>();
      (recent || []).forEach((m: any) => m.contact_id && activeSet.add(m.contact_id));

      const { data: recentWeek } = await supabase
        .from('crm_messages')
        .select('contact_id')
        .eq('direction', 'inbound')
        .gte('created_at', startOfWeek)
        .limit(1000);
      const activeWeekSet = new Set<string>();
      (recentWeek || []).forEach((m: any) => m.contact_id && activeWeekSet.add(m.contact_id));

      setConversationStats({
        paidThisMonth: paidCount,
        activeWindow24h: activeSet.size,
        monthLabel: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        paidThisWeek: paidWeek,
        activeThisWeek: activeWeekSet.size
      });

      // Calcular dados do gráfico (últimos 7 dias)
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayLabel = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        let dayPaid = 0;
        let dayActive = 0;

        Object.values(byContact).forEach((msgs) => {
          let lastInbound = -Infinity;
          let lastPaidStart = -Infinity;
          let contactPaidForDay = false;
          let contactActiveForDay = false;

          msgs.forEach(m => {
            const mt = new Date(m.created_at).getTime();
            const mDate = m.created_at.split('T')[0];
            
            if (m.direction === 'inbound') {
              lastInbound = mt;
              if (mDate === dateStr) contactActiveForDay = true;
            } else if (m.direction === 'outbound') {
              const inFreeWindow = mt - lastInbound < DAY;
              const inPaidWindow = mt - lastPaidStart < DAY;
              if (!inFreeWindow && !inPaidWindow) {
                if (mDate === dateStr) contactPaidForDay = true;
                lastPaidStart = mt;
              }
            }
          });
          
          if (contactPaidForDay) dayPaid++;
          if (contactActiveForDay) dayActive++;
        });

        chartData.push({ name: dayLabel, pagos: dayPaid, ativos: dayActive });
      }
      setMetricsChartData(chartData);

    } catch (e) {
      console.error('Erro ao calcular estatísticas de conversas:', e);
    }
  };

  const handleOpenMetricsList = async (type: 'paid' | 'active' | 'weekly_paid' | 'weekly_active') => {
    setMetricsListType(type as any);
    setIsMetricsListOpen(true);
    setMetricsListData([]);

    try {
      const now = new Date();
      const DAY = 24 * 60 * 60 * 1000;
      let startTime: string;
      
      if (type === 'paid' || type === 'active') {
        startTime = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      } else {
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      }

      if (type === 'paid' || type === 'weekly_paid') {
        const { data: msgs } = await supabase
          .from('crm_messages')
          .select('contact_id, direction, created_at')
          .gte('created_at', startTime)
          .order('created_at', { ascending: true });

        const byContact: Record<string, any[]> = {};
        (msgs || []).forEach((m: any) => {
          if (!m.contact_id) return;
          (byContact[m.contact_id] = byContact[m.contact_id] || []).push(m);
        });

        const paidContactIds = new Set<string>();
        Object.entries(byContact).forEach(([cid, cMsgs]) => {
          let lastInbound = -Infinity;
          let lastPaidStart = -Infinity;
          for (const m of cMsgs) {
            const t = new Date(m.created_at).getTime();
            if (m.direction === 'inbound') {
              lastInbound = t;
            } else if (m.direction === 'outbound') {
              const inFreeWindow = t - lastInbound < DAY;
              const inPaidWindow = t - lastPaidStart < DAY;
              if (!inFreeWindow && !inPaidWindow) {
                paidContactIds.add(cid);
                lastPaidStart = t;
              }
            }
          }
        });

        const { data: contactDetails } = await supabase
          .from('crm_contacts')
          .select('id, name, wa_id, status')
          .in('id', Array.from(paidContactIds));
        
        setMetricsListData(contactDetails || []);
      } else {
        const filterTime = (type === 'active') ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() : startTime;
        const { data: recent } = await supabase
          .from('crm_messages')
          .select('contact_id')
          .eq('direction', 'inbound')
          .gte('created_at', filterTime);
        
        const activeIds = Array.from(new Set((recent || []).map(m => m.contact_id).filter(id => id)));
        
        const { data: contactDetails } = await supabase
          .from('crm_contacts')
          .select('id, name, wa_id, status')
          .in('id', activeIds);
          
        setMetricsListData(contactDetails || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      computeConversationStats();
    }
  }, [activeTab]);

  useEffect(() => {
    if (metaSettings.vps_transcoder_url) {
      const checkVps = async () => {
        try {
          const url = metaSettings.vps_transcoder_url.replace(/\/$/, '');
          // Using a simple health check or just validating the URL format
          // to avoid CORS issues if the server doesn't have the OPTIONS header for the health check
          const res = await fetch(url, { 
            method: 'GET', 
            mode: 'no-cors', // Changed to no-cors to avoid preflight issues during status check
            signal: AbortSignal.timeout(5000) 
          });
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
    if (selectedContact?.next_execution_time) {
      const next = new Date(selectedContact.next_execution_time).getTime();
      const diff = Math.max(0, Math.floor((next - now) / 1000));
      setCountdown(diff > 0 ? diff : null);
    } else {
      setCountdown(null);
    }
  }, [selectedContact?.next_execution_time, selectedContact?.id, now]);

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

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('App visível, atualizando dados...');
        fetchData();
        fetchContacts();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

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
        } else if (payload.eventType === 'UPDATE') {
          const updatedMessage = payload.new;
          if (selectedContactRef.current && updatedMessage.contact_id === selectedContactRef.current.id) {
            setChatMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
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

    // Interval for processing scheduled flow nodes (delays)
    const scheduledInterval = setInterval(async () => {
      try {
        const { data: contactsToProcess } = await supabase
          .from('crm_contacts')
          .select('id')
          .neq('flow_state', 'idle')
          .lte('next_execution_time', new Date().toISOString())
          .limit(1);
          
        if (contactsToProcess && contactsToProcess.length > 0) {
          console.log('Triggering scheduled flow processing...');
          await supabase.functions.invoke('meta-whatsapp-crm', {
            body: { action: 'processScheduled' }
          });
        }
      } catch (err) {
        console.error('Error in scheduled flow interval:', err);
      }
    }, 5000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(messageChannel);
      clearInterval(scheduledInterval);
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
    
    // In the "Conversations" tab, only show contacts that actually have an interaction history
    if (activeTab === 'contacts') {
      filtered = filtered.filter(c => c.last_interaction !== null || c.total_messages_received > 0);
    }

    if (statusFilter !== 'all') {
      // Allow searching by name/phone or filtering by status
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
        google_auto_sync: metaSettings.google_auto_sync,
        id: '00000000-0000-0000-0000-000000000001',
        strategy_generation_prompt: 'Analise o histórico acima e gere uma análise detalhada. Destaque pontos positivos da conversa e sugira o que dizer daqui para frente para converter este cliente. Sugira também 2 perguntas que eliminem as principais dúvidas dele sob o cabeçalho \"### Perguntas para Eliminar Dúvidas\". As perguntas devem ser diretas para copiar e colar.',
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

  const handleConnectGoogle = () => {
    if (!metaSettings.google_client_id) {
      toast({ title: "Aviso", description: "Configure o Google Client ID nas configurações primeiro.", variant: "destructive" });
      return;
    }
    // Para o domínio oficial, usamos o callback2. Para qualquer outro (como lovable.app), usamos o callback original.
    // No Lovable, usamos o domínio de preview. No domínio oficial, usamos o callback2.
    const redirectPath = window.location.origin.includes('lovable.app') ? '/google-callback' : '/google-callback2';
    const redirectUri = encodeURIComponent(window.location.origin + redirectPath);
    
    // Escopos: incluímos o de email/profile para identificar a conta e o de contatos para sincronizar
    const scopes = [
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ].join(' ');
    
    const scope = encodeURIComponent(scopes);
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${metaSettings.google_client_id}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
    window.location.href = url;
  };

  const handleSyncGoogleContacts = async () => {
    if (!googleContactsEnabled) {
      handleConnectGoogle();
      return;
    }

    setIsSyncingContacts(true);
    setSyncProgress(5);
    
    try {
      // Inicia a sincronização chamando a função
      const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { action: 'syncGoogleContacts' }
      });
      
      if (error) throw error;
      
      if (data.success) {
        setSyncProgress(100);
        console.log('[SYNC] Sincronização concluída com sucesso:', data);
        toast({ 
          title: "Sincronização concluída!", 
          description: `${data.count} números processados de ${data.totalFetched || 0} contatos Google.` 
        });
        
        // Atualiza a lista local de contatos
        await fetchContacts();
      } else {
        console.error('[SYNC] Erro retornado pela função:', data.error);
        throw new Error(data.error || "Erro desconhecido na sincronização");
      }
    } catch (err: any) {
      console.error('Erro na sincronização Google:', err);
      toast({ 
        title: "Erro na sincronização", 
        description: err.message, 
        variant: "destructive" 
      });
      if (err.message?.includes('token') || err.message?.includes('auth')) {
        handleConnectGoogle();
      }
    } finally {
      setTimeout(() => {
        setIsSyncingContacts(false);
        setSyncProgress(0);
      }, 1000);
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
      toast({ title: "Prompt melhorado!", description: "A I.A. refinou suas instruções com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro ao melhorar prompt", description: err.message, variant: "destructive" });
    } finally {
      setImprovingPrompt(false);
    }
  };

  const copyToClipboard = (text: string, label: string = "Texto") => {
    const cleanText = text.replace(/["']/g, '');
    navigator.clipboard.writeText(cleanText);
    toast({
      title: `${label} copiado!`,
      description: "Conteúdo pronto para enviar (sem aspas).",
    });
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
    
    // Optimistic update
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
      if (!data.success) {
        throw new Error(data.error || "Erro ao enviar mensagem pela Meta");
      }
      // Remove optimistic and fetch real
      setChatMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      await fetchMessages(selectedContact.id);
    } catch (err: any) {
      setChatMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(textToSend); // Restore text on failure
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateTemplateKnowledge = async (templateId: string, knowledge: string) => {
    setUpdatingKnowledge(templateId);
    try {
      const { error } = await supabase
        .from('crm_templates')
        .update({ knowledge_description: knowledge })
        .eq('id', templateId);
      
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
      
      const webhookData = {
        name: newWebhook.name,
        response_type: newWebhook.response_type,
        template_id: newWebhook.template_id || null,
        secret_token: token,
        is_active: true,
        default_status: newWebhook.default_status || 'new'
      };

      const { data, error } = await supabase.from('crm_webhooks').insert([webhookData]).select();
      
      if (error) {
        throw error;
      }

      toast({ title: "Webhook criado!" });
      fetchWebhooks();
      setIsNewWebhookDialogOpen(false);
      setNewWebhook({ name: '', response_type: 'text', template_id: '', secret_token: '', is_active: true, default_status: 'new' });
    } catch (err: any) {
      toast({ 
        title: "Erro ao criar", 
        description: err.message || "Ocorreu um erro ao salvar no banco de dados.", 
        variant: "destructive" 
      });
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
        sort_order: sortOrder,
        is_starred: false
      }]);

      if (error) throw error;
      toast({ title: "Etiqueta criada com sucesso!" });
      fetchStatuses();
      setIsNewStatusDialogOpen(false);
      setNewStatusData({ label: '', color: 'blue', value: '' });
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
      const { error } = await supabase
        .from('crm_statuses')
        .update({
          label: editingStatus.label,
          color: editingStatus.color,
          is_starred: !!editingStatus.is_starred
        })
        .eq('id', editingStatus.id);

      if (error) throw error;
      toast({ title: "Etiqueta atualizada com sucesso!" });
      fetchStatuses();
      setIsEditStatusDialogOpen(false);
      setEditingStatus(null);
    } catch (err: any) {
      toast({ title: "Erro ao atualizar etiqueta", description: err.message, variant: "destructive" });
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

  const handleMoveStatus = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = kanbanStatuses.findIndex(s => s.id === id);
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === kanbanStatuses.length - 1) return;

    const newStatuses = [...kanbanStatuses];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    [newStatuses[currentIndex], newStatuses[targetIndex]] = [newStatuses[targetIndex], newStatuses[currentIndex]];

    // Update sort orders
    const updates = newStatuses.map((s, idx) => ({
      id: s.id,
      sort_order: (idx + 1) * 10
    }));

    try {
      for (const update of updates) {
        await supabase.from('crm_statuses').update({ sort_order: update.sort_order }).eq('id', update.id);
      }
      fetchStatuses();
    } catch (err) {
      console.error(err);
    }
  };

  const startRecording = async () => {
    try {
      // Audio Recording logic
      const getSupportedMimeType = () => {
        const types = [
          'audio/ogg; codecs=opus',
          'audio/webm; codecs=opus',
          'audio/webm',
          'audio/aac',
          'audio/mp4'
        ];
        return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
      };

      const mimeType = getSupportedMimeType();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const recordedType = recorder.mimeType || 'audio/ogg';
        const audioBlob = new Blob(chunks, { type: recordedType });
        console.log(`Audio recording stopped. Size: ${audioBlob.size} bytes, Type: ${recordedType}`);
        
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioBlob(audioBlob);
        setRecordedAudioUrl(audioUrl);
        setIsPreviewingAudio(true);
        
        // Finalize stream
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
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
    if (recordedAudioBlob && !sendingMessage) {
      const blob = recordedAudioBlob;
      const previewUrl = recordedAudioUrl || URL.createObjectURL(blob);
      setRecordedAudioBlob(null);
      setRecordedAudioUrl(null);
      setIsPreviewingAudio(false);
      await handleSendMedia(blob, 'audio', true, previewUrl);
    }
  };

  const handleSendMedia = async (file: File | Blob, type: 'audio' | 'video' | 'image' | 'document', isVoice = false, previewUrl?: string) => {
    if (!selectedContact) return;
    setSendingMessage(true);
    const localPreviewUrl = previewUrl || (file instanceof File ? URL.createObjectURL(file) : (recordedAudioUrl || URL.createObjectURL(file)));
    const selectedContactId = selectedContact.id;
    
    // Optimistic update for media
    const optimisticMessage = {
      id: `temp-media-${Date.now()}`,
      contact_id: selectedContactId,
      content: isVoice ? '[Mensagem de Áudio...]' : `[${type.toUpperCase()}...]`,
      direction: 'outbound',
      message_type: type,
      created_at: new Date().toISOString(),
      isOptimistic: true,
      media_url: localPreviewUrl
    };
    setChatMessages(prev => [...prev, optimisticMessage]);

    let savedAudioMessage: any = null;
    const persistOutboundAudio = async (publicUrl: string, metaMsgId: string | null, source: string, contentType?: string, status = 'sent') => {
      const { data: savedMessage, error: persistError } = await supabase
        .from('crm_messages')
        .insert({
          contact_id: selectedContactId,
          direction: 'outbound',
          message_type: 'audio',
          content: '[Mensagem de Áudio]',
          media_url: publicUrl,
          status,
          meta_message_id: metaMsgId,
          metadata: { source, original_mime: contentType || null, is_voice: isVoice }
        })
        .select()
        .single();

      if (persistError) throw persistError;

      await supabase.from('crm_contacts')
        .update({ last_interaction: new Date().toISOString() })
        .eq('id', selectedContactId);

      if (selectedContactRef.current?.id === selectedContactId) {
        setChatMessages(prev => {
          const withoutTemp = prev.filter(m => m.id !== optimisticMessage.id && m.id !== savedMessage?.id);
          return savedMessage ? [...withoutTemp, savedMessage] : withoutTemp;
        });
      }
      savedAudioMessage = savedMessage;
      return savedMessage;
    };

    const updatePersistedAudio = async (status: string, source: string, metaMsgId?: string | null, errorMessage?: string) => {
      if (!savedAudioMessage?.id) return;
      const updateData: any = {
        status,
        metadata: { ...(savedAudioMessage.metadata || {}), source }
      };
      if (metaMsgId) updateData.meta_message_id = metaMsgId;
      if (errorMessage) updateData.error_message = errorMessage;
      const { data: updatedMessage } = await supabase
        .from('crm_messages')
        .update(updateData)
        .eq('id', savedAudioMessage.id)
        .select()
        .single();
      if (updatedMessage && selectedContactRef.current?.id === selectedContactId) {
        setChatMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
      }
    };

    try {
      // Use ogg extension for audio recordings and ensure proper MIME type for Meta Cloud API
      const isAudio = type === 'audio';
      const uploadId = `upload-${Date.now()}`;
      setMediaUploadProgress(prev => ({ ...prev, [selectedContactId]: 10 }));
      
      // Determine extension based on real mime type
      let fileExt = 'bin';
      let contentType = file.type || (isAudio ? (recordedAudioBlob?.type || 'audio/webm') : undefined);
      
      if (isAudio) {
        if (contentType?.includes('ogg')) fileExt = 'ogg';
        else if (contentType?.includes('webm')) fileExt = 'webm';
        else if (contentType?.includes('mp4') || contentType?.includes('aac')) fileExt = 'm4a';
        else if (contentType?.includes('mpeg')) fileExt = 'mp3';
        else fileExt = 'ogg'; // Default to ogg
      } else if (file instanceof File) {
        fileExt = file.name.split('.').pop() || 'bin';
      }

      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `chat-media/${fileName}`;

      setMediaUploadProgress(prev => ({ ...prev, [selectedContactId]: 30 }));

      const { error: uploadError } = await supabase.storage
        .from('crm-media')
        .upload(filePath, file, {
          contentType: contentType || 'application/octet-stream',
          upsert: true
        });

      if (uploadError) throw uploadError;
      setMediaUploadProgress(prev => ({ ...prev, [selectedContactId]: 60 }));

      const { data: { publicUrl } } = supabase.storage
        .from('crm-media')
        .getPublicUrl(filePath);

      let historyAudioUrl = publicUrl;
      let historyContentType = contentType;
      if (isAudio) {
        const wavBlob = await createMobilePlayableAudioBlob(file);
        if (wavBlob) {
          const wavPath = `chat-media/history_${fileName.replace(/\.[^.]+$/, '')}.wav`;
          const { error: wavUploadError } = await supabase.storage
            .from('crm-media')
            .upload(wavPath, wavBlob, { contentType: 'audio/wav', upsert: true });
          if (!wavUploadError) {
            const { data: { publicUrl: wavPublicUrl } } = supabase.storage.from('crm-media').getPublicUrl(wavPath);
            historyAudioUrl = wavPublicUrl;
            historyContentType = 'audio/wav';
          }
        }
        await persistOutboundAudio(historyAudioUrl, null, 'history_saved_before_send', historyContentType, 'sending');
      }
      setMediaUploadProgress(prev => ({ ...prev, [selectedContactId]: 80 }));


      if (type === 'audio' && metaSettings.vps_transcoder_url && metaSettings.vps_status !== 'offline') {
        console.log("Using VPS Transcoder for professional audio:", metaSettings.vps_transcoder_url);
        
        // Check for mixed content issues
        if (window.location.protocol === 'https:' && metaSettings.vps_transcoder_url.startsWith('http://')) {
          console.warn("Mixed Content Warning: Connecting to HTTP VPS from HTTPS site may be blocked by the browser.");
          toast({ 
            title: "Aviso de Segurança (Mixed Content)", 
            description: "Seu navegador pode bloquear o áudio porque o VPS usa HTTP e o CRM usa HTTPS. Tente usar HTTPS no VPS ou autorize conteúdo inseguro no navegador.",
            variant: "destructive"
          });
        }

        let vpsResult: any = null;
        try {
          const vpsUrl = metaSettings.vps_transcoder_url.replace(/\/$/, '');
          const response = await fetch(`${vpsUrl}/send-voice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: selectedContact.wa_id,
              audioUrl: publicUrl,
              metaToken: metaSettings.meta_access_token,
              phoneId: metaSettings.meta_phone_number_id,
              sendAsVoice: true
            })
          });
          
          vpsResult = await response.json().catch(() => ({}));
          if (!response.ok) {
            console.error("VPS returned error:", vpsResult);
            throw new Error(vpsResult.error || vpsResult.details || 'Erro no processamento do VPS');
          }
        } catch (vpsErr: any) {
          console.error("VPS/Meta Error; áudio não enviado para evitar incompatibilidade no celular:", vpsErr);
          toast({ 
            title: "Erro no transcoder da Meta", 
            description: "O áudio foi salvo no histórico, mas a Meta API não aceitou o envio convertido. Erro: " + vpsErr.message,
            variant: "destructive"
          });
          await updatePersistedAudio('failed', 'vps_bridge_failed', null, vpsErr.message);
          setSendingMessage(false);
          return;
        }

        if (vpsResult) {
          const metaMsgId = vpsResult?.messageId || vpsResult?.messages?.[0]?.id || null;
          await updatePersistedAudio('sent', 'vps_bridge', metaMsgId);
          toast({ title: "Áudio Profissional enviado!", description: "Convertido via VPS e salvo no histórico da conversa." });
          setMediaUploadProgress(prev => {
            const next = { ...prev };
            delete next[selectedContactId];
            return next;
          });
          setSendingMessage(false);
          return; // Exit early as VPS handled it
        }
      }

      setMediaUploadProgress(prev => ({ ...prev, [selectedContactId]: 90 }));

      const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', { 
        body: { 
          action: 'sendMessage', 
          to: selectedContact.wa_id,
          audioUrl: type === 'audio' ? publicUrl : undefined,
          imageUrl: type === 'image' ? publicUrl : undefined,
          videoUrl: type === 'video' ? publicUrl : undefined,
          documentUrl: type === 'document' ? publicUrl : undefined,
          fileName: type === 'document' ? (file instanceof File ? file.name : 'document') : undefined,
          isVoice: type === 'audio',
          skipLocalSave: type === 'audio' ? true : undefined
        } 
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setChatMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      if (type === 'audio') {
        const metaMsgId = data?.messageId || data?.messages?.[0]?.id || data?.result?.messages?.[0]?.id || null;
        await updatePersistedAudio('sent', 'standard_send', metaMsgId);
      }
      await fetchMessages(selectedContactId);
      toast({ title: "Mídia enviada!" });
    } catch (err: any) {
      setChatMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      toast({ title: "Erro ao enviar mídia", description: err.message, variant: "destructive" });
    } finally {
      setMediaUploadProgress(prev => {
        const next = { ...prev };
        delete next[selectedContactId];
        return next;
      });
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
      const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { action: 'startFlow', contactId: selectedContact.id, waId: selectedContact.wa_id, flowId }
      });
      if (error || !data?.success) throw error || new Error(data?.error || "Erro ao iniciar fluxo");
      toast({ title: "Fluxo Iniciado!" });
      await fetchMessages(selectedContact.id);
      await fetchContacts();
    } catch (err: any) {
      toast({ title: "Erro ao iniciar fluxo", description: err.message, variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCancelFlow = async (contactId: string) => {
    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('crm_contacts')
        .update({
          flow_state: 'idle',
          current_flow_id: null,
          current_step_index: null,
          current_node_id: null,
          next_execution_time: null
        })
        .eq('id', contactId);
        
      if (error) throw error;
      
      await supabase
        .from('crm_scheduled_messages')
        .delete()
        .eq('contact_id', contactId)
        .eq('status', 'pending');

      toast({ title: "Fluxo interrompido com sucesso!" });
      
      if (selectedContact?.id === contactId) {
        setSelectedContact((prev: any) => ({
          ...prev,
          flow_state: 'idle',
          current_flow_id: null,
          current_step_index: null,
          current_node_id: null,
          next_execution_time: null
        }));
      }
      fetchContacts();
    } catch (err: any) {
      toast({ title: "Erro ao interromper fluxo", description: err.message, variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleScheduleMessage = async () => {
    if (!selectedContact || !scheduleDate || !scheduleTime) {
      toast({ title: "Preencha a data e hora", variant: "destructive" });
      return;
    }

    setIsScheduling(true);
    try {
      const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      
      let messageData: any = { action: '' };
      
      if (scheduleType === 'message') {
        if (!newMessage.trim()) {
          toast({ title: "Digite a mensagem para agendar", variant: "destructive" });
          setIsScheduling(false);
          return;
        }
        messageData = { action: 'sendMessage', text: newMessage };
      } else if (scheduleType === 'template') {
        if (!selectedScheduleId) {
          toast({ title: "Selecione um template", variant: "destructive" });
          setIsScheduling(false);
          return;
        }
        messageData = { action: 'sendTemplate', templateName: selectedScheduleId, languageCode: 'pt_BR' };
      } else if (scheduleType === 'flow') {
        if (!selectedScheduleId) {
          toast({ title: "Selecione um fluxo", variant: "destructive" });
          setIsScheduling(false);
          return;
        }
        messageData = { action: 'startFlow', flowId: selectedScheduleId };
      }

      const { error } = await supabase.from('crm_scheduled_messages').insert({
        contact_id: selectedContact.id,
        scheduled_for: scheduledFor,
        message_data: messageData,
        status: 'pending'
      });

      if (error) throw error;

      toast({ title: "Mensagem agendada com sucesso!" });
      setIsSchedulingOpen(false);
      setNewMessage('');
      setScheduleDate('');
      setScheduleTime('');
      setSelectedScheduleId('');
      fetchScheduledMessages(selectedContact.id);
      fetchAllScheduledMessages();
    } catch (err: any) {
      toast({ title: "Erro ao agendar", description: err.message, variant: "destructive" });
    } finally {
      setIsScheduling(false);
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

  const handleSaveContactMetadata = async (contactId: string, metadata: any) => {
    try {
      const { error } = await supabase.from('crm_contacts').update({ metadata }).eq('id', contactId);
      if (error) throw error;
      toast({ title: "Informações salvas!" });
      fetchContacts();
      if (selectedContact?.id === contactId) {
        setSelectedContact({ ...selectedContact, metadata });
      }
    } catch (err) {
      toast({ title: "Erro ao salvar informações", variant: "destructive" });
    }
  };

  const handleExportContacts = (format: 'csv' | 'vcard' = 'csv') => {
    if (format === 'csv') {
      const data = contacts.map(c => ({
        Nome: c.name || '',
        Telefone: c.wa_id || '',
        Status: c.status || '',
        Bio: c.metadata?.bio || '',
        Instagram: c.metadata?.instagram || '',
        Facebook: c.metadata?.facebook || '',
        Links: c.metadata?.links || ''
      }));
      const csv = [
        Object.keys(data[0]).join(','),
        ...data.map(row => Object.values(row).map(v => `"${v}"`).join(','))
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contatos_crm_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else if (format === 'vcard') {
      const vcards = contacts.map(c => {
        return [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${c.name || c.wa_id}`,
          `TEL;TYPE=CELL:${c.wa_id}`,
          `NOTE:${c.metadata?.bio || ''} | IG: ${c.metadata?.instagram || ''} | FB: ${c.metadata?.facebook || ''}`,
          `URL:${c.metadata?.links || ''}`,
          'END:VCARD'
        ].join('\n');
      }).join('\n');
      
      const blob = new Blob([vcards], { type: 'text/vcard' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contatos_crm_${new Date().toISOString().split('T')[0]}.vcf`;
      a.click();
    }
  };

  const handleImportContacts = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const reader = new FileReader();

    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const contacts_to_import: any[] = [];

      if (fileName.endsWith('.vcf') || fileName.endsWith('.vcard')) {
        const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const vcardBlocks = normalizedContent.split(/BEGIN:VCARD/i).filter(block => block.trim());
        
        console.log(`vCard blocks found: ${vcardBlocks.length}`);

        for (const block of vcardBlocks) {
          const lines = block.split('\n');
          let currentContact: any = { metadata: {} };
          let foundName = false;
          let foundPhone = false;

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (/^FN[;:]/i.test(trimmedLine)) {
              currentContact.name = trimmedLine.split(':').slice(1).join(':').trim();
              foundName = true;
            } else if (/^N[;:]/i.test(trimmedLine) && !foundName) {
              const nameValue = trimmedLine.split(':').slice(1).join(':').trim();
              const parts = nameValue.split(';');
              currentContact.name = parts.filter(p => p).reverse().join(' ').trim();
              foundName = true;
            } else if (/^TEL[;:]/i.test(trimmedLine)) {
              const phoneValue = trimmedLine.split(':').slice(1).join(':').trim();
              const phone = phoneValue.replace(/\D/g, '');
              if (phone && phone.length >= 8) {
                currentContact.wa_id = phone;
                foundPhone = true;
              }
            } else if (trimmedLine.toUpperCase().startsWith('NOTE:')) {
              currentContact.metadata.bio = trimmedLine.substring(5).trim();
            } else if (trimmedLine.toUpperCase().startsWith('URL:')) {
              currentContact.metadata.links = trimmedLine.substring(4).trim();
            }
          }

          if (foundPhone) {
            if (!currentContact.name) currentContact.name = currentContact.wa_id;
            contacts_to_import.push(currentContact);
          }
        }
      } else {
        const lines = content.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 1) return;
        
        const firstLine = lines[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';
        
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
        const imported = lines.slice(1).map(line => {
          const values = line.split(delimiter).map(v => v.trim().replace(/"/g, ''));
          const obj: any = {};
          headers.forEach((h, i) => obj[h] = values[i]);
          return obj;
        });

        for (const contact of imported) {
          const phone = (contact.Telefone || contact.wa_id || contact.phone || contact.whatsapp || Object.values(contact)[0])?.toString();
          if (!phone) continue;
          
          const cleanPhone = phone.replace(/\D/g, '');
          if (cleanPhone.length < 8) continue;

          contacts_to_import.push({
            wa_id: cleanPhone,
            name: contact.Nome || contact.name || contact.full_name || cleanPhone,
            status: contact.Status || 'new',
            source_type: 'imported',
            metadata: {
              bio: contact.Bio || contact.bio,
              instagram: contact.Instagram || contact.instagram,
              facebook: contact.Facebook || contact.facebook,
              links: contact.Links || contact.links
            }
          });
        }
      }

      if (contacts_to_import.length === 0) {
        toast({ title: "Nenhum contato válido encontrado no arquivo", variant: "destructive" });
        return;
      }

      const batchSize = 100;
      let successCount = 0;
      
      toast({ title: `Importando ${contacts_to_import.length} contatos...` });

      // Processamento em lotes maiores
      for (let i = 0; i < contacts_to_import.length; i += batchSize) {
        const batch = contacts_to_import.slice(i, i + batchSize).map(contact => ({
          wa_id: contact.wa_id,
          name: contact.name,
          status: contact.status || 'new',
          source_type: 'imported',
          metadata: contact.metadata || {},
          last_interaction: null
        }));

        const { error } = await supabase.from('crm_contacts').upsert(batch, { onConflict: 'wa_id' });
        if (!error) {
          successCount += batch.length;
          // Atualiza a lista periodicamente para feedback visual
          if (successCount % 500 === 0) fetchContacts();
        } else {
          console.error("Batch error:", error);
        }
      }

      toast({ title: `Importação concluída: ${successCount} contatos!` });
      fetchContacts();
    };
    reader.readAsText(file);
  };

  const openContactInfo = (contact: any) => {
    setContactToView(contact);
    setIsContactInfoOpen(true);
  };

  const openChat = (contact: any) => {
    setSelectedContact(contact);
    fetchMessages(contact.id);
    fetchScheduledMessages(contact.id);
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

  const fetchAllScheduledMessages = async () => {
    const { data, error } = await supabase
      .from('crm_scheduled_messages')
      .select(`
        *,
        crm_contacts (
          name,
          wa_id
        )
      `)
      .order('scheduled_for', { ascending: true });
    
    if (error) {
      console.error("Error fetching all scheduled messages:", error);
      return;
    }
    setAllScheduledMessages(data || []);
  };

  const handleSaveFlow = async (flow: any) => {
    setSaving(true);
    try {
      const { id, ...flowData } = flow;
      
      if (!flowData.name || flowData.name.trim() === '') {
        throw new Error("O fluxo precisa de um nome.");
      }

      const payload = {
        name: flowData.name,
        trigger_type: flowData.trigger_type || 'manual',
        trigger_keywords: flowData.trigger_keywords || [],
        is_active: flowData.is_active !== false,
        nodes: flowData.nodes || [],
        edges: flowData.edges || [],
        updated_at: new Date().toISOString()
      };

      let result;
      if (id) {
        result = await supabase
          .from('crm_flows')
          .update(payload)
          .eq('id', id);
      } else {
        result = await supabase
          .from('crm_flows')
          .insert([payload])
          .select();
      }

      if (result.error) {
        throw result.error;
      }
      
      toast({ title: "Fluxo salvo com sucesso!" });
      setIsFlowEditorOpen(false);
      setEditingFlow(null);
      fetchData();
    } catch (err: any) {
      toast({ 
        title: "Erro ao salvar fluxo", 
        description: err.message || "Ocorreu um erro inesperado.", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateFlow = async (flow: any) => {
    setSaving(true);
    try {
      const { id, created_at, updated_at, ...flowData } = flow;
      
      const nodeMap: Record<string, string> = {};
      const newNodes = (flowData.nodes || []).map((node: any) => {
        const newId = `${node.type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        nodeMap[node.id] = newId;
        return { ...node, id: newId };
      });

      const newEdges = (flowData.edges || []).map((edge: any) => ({
        ...edge,
        id: `e_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        source: nodeMap[edge.source] || edge.source,
        target: nodeMap[edge.target] || edge.target
      }));

      const newFlow = {
        name: `${flowData.name} (Cópia)`,
        trigger_type: flowData.trigger_type || 'manual',
        trigger_keywords: flowData.trigger_keywords || [],
        is_active: false,
        nodes: newNodes,
        edges: newEdges,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('crm_flows')
        .insert([newFlow])
        .select();

      if (error) {
        throw error;
      }
      
      toast({ title: "Fluxo duplicado com sucesso!" });
      fetchData();
    } catch (err: any) {
      console.error("Erro ao duplicar fluxo:", err);
      toast({ 
        title: "Erro ao duplicar fluxo", 
        description: err.message || "Verifique se há campos obrigatórios faltando ou conflitos.", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
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
                    ...(metaSettings.openai_api_key ? [{ id: 'ai-analysis', label: 'Análises IA', icon: TrendingUp }] : []),
                    { id: 'help', label: 'Ajuda', icon: LucideIcons.HelpCircle },
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
          <header className="h-16 border-b flex items-center px-4 md:px-6 bg-card/50 backdrop-blur-sm z-10 shrink-0 justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="h-4 w-px bg-border mx-2 hidden md:block" />
                {activeTab === 'contact-list' ? 'Contatos' : 
                 activeTab === 'contacts' ? 'Conversas' : 
                 activeTab}
            </div>
            {activeTab === 'contacts' && (
              <div className="flex items-center gap-2 md:gap-3">
                <Button 
                  variant={activeFlowsView ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => { setActiveFlowsView(!activeFlowsView); setKanbanView(false); }} 
                  className={cn("font-bold h-8 px-2 md:px-3 text-[10px] md:text-sm", activeFlowsView && "bg-primary text-white")}
                >
                  <GitBranch className="w-4 h-4 mr-2" />
                  FLUXOS ATIVOS
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setKanbanView(!kanbanView); setActiveFlowsView(false); }} 
                  className="font-bold h-8 px-2 md:px-3 text-[10px] md:text-sm"
                >
                  {kanbanView ? <MessageSquare className="w-4 h-4 mr-2" /> : <BarChart3 className="w-4 h-4 mr-2" />}
                  {kanbanView ? 'LISTA' : 'KANBAN'}
                </Button>
              </div>
            )}
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
                      { label: 'Mensagens Enviadas', value: metrics.sent_count, icon: Send, color: 'blue', type: 'sent' },
                      { label: 'Respondidas', value: metrics.responded_count, icon: MessageSquare, color: 'yellow', type: 'responded' },
                      { label: 'Contatos Qualificados', value: metrics.qualified_count, icon: CheckCircle2, color: 'purple', type: 'qualified' },
                      { label: 'Conversas 24h (Hoje)', value: conversationStats.activeWindow24h, icon: Clock, color: 'green', type: 'active_today' },
                    ].map((stat, i) => (
                      <Card 
                        key={i} 
                        className="relative overflow-hidden group hover:shadow-lg transition-all border-zinc-100 dark:border-zinc-800 cursor-pointer"
                        onClick={() => {
                          if (stat.type === 'responded') setStatusFilter('responded');
                          else if (stat.type === 'qualified') setStatusFilter('qualified');
                          else if (stat.type === 'active_today') handleOpenMetricsList('active');
                          else setStatusFilter('all');
                          setActiveTab('contacts');
                        }}
                      >
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
                          <div className={cn("mt-2 h-1 w-full rounded-full overflow-hidden", {
                            "bg-blue-500/10": stat.color === 'blue',
                            "bg-yellow-500/10": stat.color === 'yellow',
                            "bg-purple-500/10": stat.color === 'purple',
                            "bg-green-500/10": stat.color === 'green',
                          })}>
                            <div className={cn("h-full transition-all duration-1000", {
                              "bg-blue-500": stat.color === 'blue',
                              "bg-yellow-500": stat.color === 'yellow',
                              "bg-purple-500": stat.color === 'purple',
                              "bg-green-500": stat.color === 'green',
                            })} style={{ width: '70%' }} />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <Card 
                      className="relative overflow-hidden border-orange-200/50 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/60 to-transparent dark:from-orange-950/20 cursor-pointer hover:shadow-md transition-all"
                      onClick={() => handleOpenMetricsList('paid')}
                    >
                      <CardHeader className="flex flex-row items-start justify-between pb-2 gap-2">
                        <div className="min-w-0">
                          <CardDescription className="font-bold text-[10px] md:text-xs uppercase tracking-wider text-orange-700 dark:text-orange-400">
                            Conversas Pagas (Mês)
                          </CardDescription>
                          <p className="text-[10px] text-muted-foreground mt-0.5 capitalize truncate">
                            R$ {CONVERSATION_COST.toFixed(2).replace('.', ',')} por conversa
                          </p>
                        </div>
                        <DollarSign className="w-5 h-5 text-orange-500 shrink-0" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <div className="text-2xl md:text-3xl font-black text-orange-600 dark:text-orange-400">
                            R$ {(conversationStats.paidThisMonth * CONVERSATION_COST).toFixed(2).replace('.', ',')}
                          </div>
                          <Badge variant="outline" className="text-[10px] font-bold border-orange-300 text-orange-700 dark:text-orange-400">
                            {conversationStats.paidThisMonth} conv.
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card 
                      className="relative overflow-hidden border-emerald-200/50 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/60 to-transparent dark:from-emerald-950/20 cursor-pointer hover:shadow-md transition-all"
                      onClick={() => handleOpenMetricsList('active')}
                    >
                      <CardHeader className="flex flex-row items-start justify-between pb-2 gap-2">
                        <div className="min-w-0">
                          <CardDescription className="font-bold text-[10px] md:text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                            Conversas Grátis (Janela 24h)
                          </CardDescription>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Janela aberta de resposta gratuita
                          </p>
                        </div>
                        <Clock className="w-5 h-5 text-emerald-500 shrink-0" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <div className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                            {conversationStats.activeWindow24h}
                          </div>
                          <Badge variant="outline" className="text-[10px] font-bold border-emerald-300 text-emerald-700 dark:text-emerald-400">
                            ativas
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card 
                      className="relative overflow-hidden border-blue-200/50 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/60 to-transparent dark:from-blue-950/20 cursor-pointer hover:shadow-md transition-all"
                    >
                      <CardHeader className="flex flex-row items-start justify-between pb-2 gap-2">
                        <div className="min-w-0">
                          <CardDescription className="font-bold text-[10px] md:text-xs uppercase tracking-wider text-blue-700 dark:text-blue-400">
                            Resumo Semanal (7 dias)
                          </CardDescription>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Interações na última semana
                          </p>
                        </div>
                        <Calendar className="w-5 h-5 text-blue-500 shrink-0" />
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1 cursor-pointer hover:bg-blue-500/5 p-2 rounded-lg transition-colors" onClick={() => handleOpenMetricsList('weekly_paid')}>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Pagas</p>
                            <div className="text-xl font-black text-blue-600">
                              {conversationStats.paidThisWeek}
                            </div>
                          </div>
                          <div className="space-y-1 cursor-pointer hover:bg-blue-500/5 p-2 rounded-lg transition-colors" onClick={() => handleOpenMetricsList('weekly_active')}>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Ativas</p>
                            <div className="text-xl font-black text-blue-600">
                              {conversationStats.activeThisWeek}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="p-6">
                    <CardHeader className="px-0 pt-0">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        Histórico de Conversas Pagas
                      </CardTitle>
                      <CardDescription>Envios realizados nos últimos 7 dias</CardDescription>
                    </CardHeader>
                    <CardContent className="px-0 pb-0 pt-4">
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={metricsChartData}>
                            <defs>
                              <linearGradient id="colorPagos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="rgb(249, 115, 22)" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="rgb(249, 115, 22)" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorAtivos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="rgb(16, 185, 129)" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="rgb(16, 185, 129)" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fontSize: 10}}
                              dy={10}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fontSize: 10}}
                            />
                            <RechartsTooltip 
                              contentStyle={{ 
                                borderRadius: '12px', 
                                border: 'none', 
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                              }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="pagos" 
                              name="Conversas Pagas"
                              stroke="rgb(249, 115, 22)" 
                              strokeWidth={3}
                              fillOpacity={1} 
                              fill="url(#colorPagos)" 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="ativos" 
                              name="Janela Grátis"
                              stroke="rgb(16, 185, 129)" 
                              strokeWidth={3}
                              fillOpacity={1} 
                              fill="url(#colorAtivos)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'contacts' && (
              <div className="flex-1 flex overflow-hidden">
                {activeFlowsView ? (
                  <div className="flex-1 overflow-y-auto p-4 bg-muted/5">
                    <div className="max-w-5xl mx-auto space-y-4">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h2 className="text-xl font-bold tracking-tight">Fluxos em Andamento</h2>
                          <p className="text-muted-foreground text-sm">Contatos que estão interagindo com automações agora.</p>
                        </div>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black px-3 py-1">
                          {contacts.filter(c => c.flow_state && c.flow_state !== 'idle').length} ATIVOS
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {contacts.filter(c => c.flow_state && c.flow_state !== 'idle').length === 0 ? (
                          <div className="py-20 text-center bg-card rounded-2xl border-2 border-dashed border-muted">
                            <GitBranch className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                            <h3 className="text-lg font-medium">Nenhum fluxo ativo no momento</h3>
                            <p className="text-sm text-muted-foreground">Novos fluxos aparecerão aqui conforme os gatilhos forem acionados.</p>
                          </div>
                        ) : (
                          contacts.filter(c => c.flow_state && c.flow_state !== 'idle').map(contact => {
                            const flow = flows.find(f => f.id === contact.current_flow_id);
                            return (
                              <Card key={contact.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow rounded-xl">
                                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                      <User className="w-6 h-6 text-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-sm md:text-base truncate">{contact.name || contact.wa_id}</h4>
                                        <Badge className="text-[10px] bg-primary/10 text-primary hover:bg-primary/20 border-none">
                                          {flow?.name || 'Fluxo Desconhecido'}
                                        </Badge>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                          <div className={cn("w-1.5 h-1.5 rounded-full animate-ping", contact.flow_state === 'error' ? "bg-red-500" : "bg-green-500")} />
                                          <span className="capitalize font-medium">{contact.flow_state}</span>
                                        </div>
                                        {contact.next_execution_time && (
                                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary tabular-nums">
                                            <Clock className="w-3 h-3" />
                                            Próxima ação em: {(() => {
                                              const next = new Date(contact.next_execution_time).getTime();
                                              const diff = Math.max(0, Math.floor((next - now) / 1000));
                                              return diff > 0 ? `${Math.floor(diff / 60)}m ${diff % 60}s` : 'Processando...';
                                            })()}
                                          </div>
                                        )}
                                        {contact.last_flow_interaction && (
                                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                            <CalendarClock className="w-3 h-3" />
                                            Última interação: {new Date(contact.last_flow_interaction).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-9 px-4 font-bold border-primary/20 text-primary hover:bg-primary/5"
                                      onClick={() => {
                                        openChat(contact);
                                        setActiveFlowsView(false);
                                      }}
                                    >
                                      VER CONVERSA
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      size="sm" 
                                      className="h-9 px-4 font-bold shadow-sm"
                                      onClick={() => handleCancelFlow(contact.id)}
                                    >
                                      <StopCircle className="w-4 h-4 mr-2" />
                                      PARAR FLUXO
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                ) : kanbanView ? (
                  <div className="flex-1 overflow-x-auto p-3 md:p-4 flex gap-3 md:gap-4 bg-muted/5 snap-x relative group/kanban">
                    <div className="absolute top-0 left-0 p-2 z-10 opacity-0 group-hover/kanban:opacity-100 transition-opacity">
                      <Button 
                        size="sm" 
                        className="rounded-full bg-primary shadow-lg h-8 w-8 p-0"
                        onClick={() => setIsNewStatusDialogOpen(true)}
                        title="Nova Etiqueta"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {(kanbanStatuses.length > 0 ? kanbanStatuses : [
                      { value: 'new', label: 'Novo Lead', color: 'blue' },
                      { value: 'responded', label: 'Em Atendimento', color: 'yellow' },
                      { value: 'qualified', label: 'Qualificado', color: 'purple' },
                      { value: 'human', label: '+ HUMANO', color: 'orange' },
                      { value: 'closed', label: 'Venda Fechada', color: 'green' },
                      { value: 'lost', label: 'Perdido', color: 'red' }
                    ]).map(status => (
                      <div 
                        key={status.value} 
                        className="w-72 md:w-80 shrink-0 flex flex-col bg-card/50 rounded-xl border border-border shadow-sm group/column transition-all hover:shadow-md hover:bg-card snap-center" 
                        onDragOver={e => e.preventDefault()} 
                        onDrop={() => handleDrop(status.value)}
                      >
                        <div className={cn(
                          "p-4 border-b font-black uppercase text-[11px] flex justify-between items-center rounded-t-xl",
                          status.value === 'human' || status.color === 'orange' ? "bg-orange-500/10 text-orange-700" : "bg-muted/30"
                        )}>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              status.color === 'blue' && 'bg-blue-500',
                              status.color === 'yellow' && 'bg-yellow-500',
                              status.color === 'purple' && 'bg-purple-500',
                              status.color === 'green' && 'bg-green-500',
                              status.color === 'red' && 'bg-red-500',
                              status.color === 'orange' && 'bg-orange-500',
                              status.color === 'indigo' && 'bg-indigo-500',
                              status.color === 'pink' && 'bg-pink-500'
                            )} />
                            {status.label}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-background/80 shadow-sm border font-black">{contacts.filter(c => c.status === status.value && c.last_interaction !== null).length}</Badge>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover/column:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const sObj = kanbanStatuses.find(s => s.value === status.value);
                                  if (sObj) handleMoveStatus(sObj.id, 'up');
                                }}
                                className="hover:text-primary p-0.5"
                                title="Mover p/ Esquerda"
                              >
                                <LucideIcons.ChevronLeft className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const sObj = kanbanStatuses.find(s => s.value === status.value);
                                  if (sObj) handleMoveStatus(sObj.id, 'down');
                                }}
                                className="hover:text-primary p-0.5"
                                title="Mover p/ Direita"
                              >
                                <LucideIcons.ChevronRight className="w-3 h-3" />
                              </button>
                              {kanbanStatuses.some(s => s.id && s.value === status.value) && (
                                <>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const sObj = kanbanStatuses.find(s => s.value === status.value);
                                      if (sObj) {
                                        setEditingStatus(sObj);
                                        setIsEditStatusDialogOpen(true);
                                      }
                                    }}
                                    className="hover:text-primary p-0.5"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const sObj = kanbanStatuses.find(s => s.value === status.value);
                                      if (sObj) {
                                        if (confirm(`Remover etiqueta "${sObj.label}"?`)) {
                                          handleDeleteStatus(sObj.id);
                                        }
                                      }
                                    }}
                                    className="hover:text-red-500 p-0.5"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <ScrollArea className="flex-1 p-3">
                          {contacts.filter(c => c.status === status.value && c.last_interaction !== null).map(contact => (
                            <Card 
                              key={contact.id} 
                              draggable 
                              onDragStart={() => handleDragStart(contact)} 
                              className="p-4 mb-3 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-md border-zinc-100 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2" 
                              onClick={() => { openChat(contact); setKanbanView(false); }}
                            >
                              <p className="text-sm font-bold truncate">{contact.name || contact.wa_id}</p>
                              <div className="flex justify-between items-center mt-3">
                                {contact.last_interaction && (
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                    <Clock className="w-3 h-3 opacity-50" />
                                    {new Date(contact.last_interaction).toLocaleDateString([], {day: '2-digit', month: '2-digit'})}
                                  </div>
                                )}
                                {contact.total_messages_received > 0 && (
                                  <Badge variant="outline" className="text-[9px] font-bold opacity-70">
                                    <MessageSquare className="w-2 h-2 mr-1" /> {contact.total_messages_received}
                                  </Badge>
                                )}
                              </div>
                            </Card>
                          ))}
                          {contacts.filter(c => c.status === status.value && c.last_interaction !== null).length === 0 && (
                            <div className="h-20 flex items-center justify-center border-2 border-dashed border-muted rounded-xl opacity-40">
                              <p className="text-[10px] font-bold uppercase tracking-widest">Vazio</p>
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className={cn(
                      "w-full md:w-[350px] border-r flex flex-col bg-card/30 backdrop-blur-sm h-full",
                      selectedContact ? 'hidden md:flex' : 'flex'
                    )}>
                      <div className="p-4 border-b flex flex-col gap-3">
                        <div className="space-y-3">
                          <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                              placeholder="Buscar contatos..." 
                              className="pl-9 bg-muted/50 border-none h-10"
                              onChange={e => setStatusFilter(e.target.value || 'all')} 
                            />
                          </div>
                        </div>
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="tags" className="border-none">
                            <AccordionTrigger className="py-2 hover:no-underline text-xs font-semibold text-muted-foreground flex gap-2">
                              <ListFilter className="w-3.5 h-3.5" />
                              Filtrar por Etiquetas
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="flex flex-wrap gap-1 pb-1 pt-1">
                                {['all', ...(kanbanStatuses.length > 0 ? kanbanStatuses.map(s => s.value) : ['new', 'responded', 'human', 'qualified', 'closed', 'lost'])].map(s => (
                                  <Badge 
                                    key={s} 
                                    variant={statusFilter === s ? 'default' : 'outline'} 
                                    style={{ height: `${16 * ((metaSettings.tag_size || 100) / 100)}px`, fontSize: `${9 * ((metaSettings.tag_size || 100) / 100)}px` }}
                                    className={cn(
                                      "cursor-pointer capitalize whitespace-nowrap px-2 font-black transition-all",
                                      statusFilter === s ? "shadow-md scale-105" : "hover:bg-muted"
                                    )}
                                    onClick={() => setStatusFilter(s)}
                                  >
                                    {s === 'all' ? '🚀 Todos' : getStatusLabel(s)}
                                  </Badge>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                      <ScrollArea className="flex-1 min-h-0 h-full overflow-y-auto">
                        {filteredContacts.length > 0 ? (
                          filteredContacts.map(contact => (
                            <button 
                              key={contact.id} 
                              onClick={() => openChat(contact)} 
                              className={cn(
                                "w-full p-4 text-left border-b transition-all flex flex-col gap-1 relative",
                                selectedContact?.id === contact.id ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-muted/50 border-l-4 border-l-transparent"
                              )}
                            >
                              <div className="flex justify-between items-start w-full">
                                <p className="font-bold truncate text-sm flex-1 flex items-center gap-2">
                                  {contact.name || contact.wa_id}
                                  {contact.google_sync_account_id && (
                                    <span className="w-3.5 h-3.5 bg-[#4285F4] rounded-full flex items-center justify-center shrink-0">
                                       <span className="text-[6px] font-bold text-white">G</span>
                                    </span>
                                  )}
                                </p>
                                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                  {contact.last_interaction ? new Date(contact.last_interaction).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                </span>
                              </div>
                                <div className="flex justify-between items-center">
                                  <Badge 
                                    variant="outline" 
                                    style={{ height: `${16 * ((metaSettings.tag_size || 100) / 100)}px`, fontSize: `${9 * ((metaSettings.tag_size || 100) / 100)}px` }}
                                    className={cn("px-2 capitalize font-black shadow-sm", getStatusColor(contact.status))}
                                  >
                                    {getStatusLabel(contact.status)}
                                  </Badge>
                                   {contact.flow_state && contact.flow_state !== 'idle' && (
                                     <div className="flex flex-col items-end gap-1">
                                       <div className="flex items-center gap-1">
                                         <Badge 
                                           variant="secondary" 
                                           style={{ height: `${14 * ((metaSettings.tag_size || 100) / 100)}px`, fontSize: `${8 * ((metaSettings.tag_size || 100) / 100)}px` }}
                                           className={cn(
                                             "px-1 capitalize font-medium",
                                             contact.flow_state === 'error' ? "bg-red-500/10 text-red-600 border-red-200" : 
                                             contact.flow_state === 'waiting_response' ? "bg-amber-100 text-amber-700 border-amber-200" :
                                             "bg-primary/10 text-primary animate-pulse border-primary/20"
                                           )}
                                         >
                                           {contact.flow_state === 'error' ? 'Erro' : 
                                            contact.flow_state === 'waiting_response' ? 'Aguardando' : 'Ativo'}
                                         </Badge>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCancelFlow(contact.id);
                                          }}
                                          className="text-red-500 hover:text-red-700 p-0.5 rounded-full hover:bg-red-50"
                                          title="Parar Fluxo"
                                        >
                                          <StopCircle className="h-3 w-3" />
                                        </button>
                                      </div>
                                      {(contact.next_execution_time || contact.flow_state === 'waiting_response') && (
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-primary tabular-nums">
                                          <Clock className="w-2 h-2" />
                                          {(() => {
                                            if (contact.flow_state === 'waiting_response') {
                                              const lastInteraction = new Date(contact.last_flow_interaction || Date.now()).getTime();
                                              const elapsedSeconds = Math.floor((now - lastInteraction) / 1000);
                                              return `Aguardando: ${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`;
                                            }
                                            const next = new Date(contact.next_execution_time).getTime();
                                            const diff = Math.max(0, Math.floor((next - now) / 1000));
                                            return diff > 0 ? `${Math.floor(diff / 60)}m ${diff % 60}s` : 'Próximo...';
                                          })()}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-8 text-center text-muted-foreground text-sm italic">
                            Nenhum contato encontrado
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                    
                    <div className={cn(
                      "flex-1 flex flex-col min-h-0 relative",
                      !selectedContact ? 'hidden md:flex items-center justify-center bg-muted/5' : 'flex'
                    )}>
                      {selectedContact ? (
                        <>
                          <div className="p-3 md:p-4 border-b flex flex-col md:flex-row md:justify-between md:items-center gap-3 bg-card/80 backdrop-blur-md shadow-sm z-10 shrink-0">
                            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0 w-full">
                              <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setSelectedContact(null)}>
                                <ChevronLeft className="h-5 w-5" />
                              </Button>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                                  <p className="font-bold text-sm md:text-base hover:text-primary cursor-pointer transition-colors flex items-center gap-1.5 md:gap-2 truncate" onClick={() => openContactInfo(selectedContact)}>
                                    <span className="truncate">{selectedContact.name || selectedContact.wa_id}</span>
                                    {selectedContact.google_sync_account_id && (
                                      <span className="w-4 h-4 bg-[#4285F4] rounded-full flex items-center justify-center shrink-0">
                                         <span className="text-[7px] font-bold text-white">G</span>
                                      </span>
                                    )}

                                    <Badge 
                                      variant="outline" 
                                      style={{ height: `${14 * ((metaSettings.tag_size || 100) / 100)}px`, fontSize: `${8 * ((metaSettings.tag_size || 100) / 100)}px` }}
                                      className="font-normal opacity-60 shrink-0 hidden sm:inline-flex"
                                    >
                                      Info
                                    </Badge>
                                  </p>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                      "h-8 w-8 rounded-full transition-all duration-300",
                                      selectedContact.ai_active && metaSettings.ai_agent_enabled ? "text-primary bg-primary/10 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse" : "text-muted-foreground grayscale"
                                    )}
                                    onClick={async () => {
                                      const newStatus = !selectedContact.ai_active;
                                      await updateContactStatus(selectedContact.id, { ai_active: newStatus });
                                    }}
                                    title={selectedContact.ai_active ? "Desativar IA para este contato" : "Ativar IA para este contato"}
                                  >
                                    <Bot className={cn("w-4 h-4", selectedContact.ai_active && metaSettings.ai_agent_enabled && "fill-primary/20")} />
                                  </Button>

                                  {selectedContact.flow_state && selectedContact.flow_state !== 'idle' && (
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-1">
                                        <Badge 
                                          variant="outline" 
                                          style={{ height: `${14 * ((metaSettings.tag_size || 100) / 100)}px`, fontSize: `${9 * ((metaSettings.tag_size || 100) / 100)}px` }}
                                          className={cn(
                                            "px-1 flex items-center gap-1 font-medium",
                                            selectedContact.flow_state === 'error' ? "bg-red-500/10 text-red-600 border-red-200" : "bg-primary/10 text-primary border-primary/20"
                                          )}
                                        >
                                          <div className={cn("w-1.5 h-1.5 rounded-full", selectedContact.flow_state === 'error' ? "bg-red-500" : "bg-primary animate-ping")} />
                                          {selectedContact.flow_state === 'error' ? 'Erro no Fluxo' : `Fluxo: ${selectedContact.flow_state}`}
                                        </Badge>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-5 w-5 text-red-500 hover:text-red-700 hover:bg-red-50/50" 
                                          onClick={() => handleCancelFlow(selectedContact.id)}
                                          title="Parar Fluxo"
                                        >
                                          <StopCircle className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                      {(countdown !== null && countdown > 0 || selectedContact.flow_state === 'waiting_response') && (
                                        <div className="flex items-center gap-1.5 px-1 py-0.5 bg-primary/5 rounded border border-primary/10 animate-in fade-in zoom-in-95 duration-200">
                                          <Clock className="w-2.5 h-2.5 text-primary animate-pulse" />
                                          <span className="text-[10px] font-bold text-primary tabular-nums">
                                            {(() => {
                                              if (selectedContact.flow_state === 'waiting_response') {
                                                const lastInteraction = new Date(selectedContact.last_flow_interaction || Date.now()).getTime();
                                                const elapsedSeconds = Math.floor((now - lastInteraction) / 1000);
                                                return `Aguardando há: ${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`;
                                              }
                                              return `Aguardando: ${Math.floor(countdown! / 60)}m ${countdown! % 60}s`;
                                            })()}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {selectedContact.last_interaction && (
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Clock className={cn("w-3 h-3", getWindowInfo(selectedContact.last_interaction)?.isExpired ? 'text-destructive' : 'text-green-500')} />
                                    <span className={cn("text-[10px] font-medium uppercase tracking-tight", getWindowInfo(selectedContact.last_interaction)?.isExpired ? 'text-destructive' : 'text-green-500')}>
                                      {getWindowInfo(selectedContact.last_interaction)?.label}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                              {kanbanStatuses.filter(s => s.is_starred).map(status => (
                                <Button 
                                  key={status.id}
                                  size="sm" 
                                  variant="outline" 
                                  className={cn("h-8 text-[11px] font-bold border-zinc-200 hover:bg-zinc-50 transition-all shadow-sm")}
                                  onClick={() => updateContactStatus(selectedContact.id, { status: status.value })}
                                >
                                  {status.label}
                                </Button>
                              ))}
                              
                              <Select onValueChange={(val) => updateContactStatus(selectedContact.id, { status: val })}>
                                <SelectTrigger className="w-fit h-8 text-[11px] font-bold border-zinc-200 bg-zinc-50/50">
                                  <SelectValue placeholder="Outros" />
                                </SelectTrigger>
                                <SelectContent>
                                  {kanbanStatuses.map(s => (
                                    <SelectItem key={s.id} value={s.value}>{s.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="bg-muted/5 border-b px-2 py-1 flex flex-col gap-1 z-[5] backdrop-blur-md overflow-hidden transition-all duration-300 shrink-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <button 
                                onClick={() => setShowTemplates(!showTemplates)}
                                className="text-[9px] font-black uppercase text-muted-foreground/70 shrink-0 flex items-center gap-1 bg-muted/30 px-1.2 py-0.5 rounded-sm border border-border/20 hover:bg-muted/50 transition-colors group"
                              >
                                <FileText className="w-2.5 h-2.5 text-emerald-500" /> 
                                <span>Modelos</span>
                                {showTemplates ? <Eye className="w-2 h-2 ml-0.5 opacity-40 group-hover:opacity-100" /> : <EyeOff className="w-2 h-2 ml-0.5 opacity-100 text-emerald-500" />}
                              </button>
                              
                              {showTemplates && (
                                <div className="flex flex-wrap gap-1 flex-1 animate-in fade-in slide-in-from-left-2 duration-200">
                                  {templates.slice(0, 10).map(t => (
                                    <Button 
                                      key={t.id} 
                                      variant="outline" 
                                      size="sm" 
                                      style={{ height: `${20 * ((metaSettings.shortcut_size || 100) / 100)}px`, fontSize: `${9 * ((metaSettings.shortcut_size || 100) / 100)}px` }}
                                      className="px-2 rounded-md border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all font-bold whitespace-nowrap shadow-none" 
                                      onClick={() => handleSendTemplate(t.name, t.language || 'pt_BR')} 
                                      disabled={sendingMessage}
                                    >
                                      {t.name}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className={cn(
                              "flex items-center gap-1.5 min-w-0 pt-1 border-t border-border/5",
                              !showFlows && !showTemplates && "pt-0 border-t-0"
                            )}>
                              <button 
                                onClick={() => setShowFlows(!showFlows)}
                                className="text-[9px] font-black uppercase text-muted-foreground/70 shrink-0 flex items-center gap-1 bg-muted/30 px-1.2 py-0.5 rounded-sm border border-border/20 hover:bg-muted/50 transition-colors group"
                              >
                                <Zap className="w-2.5 h-2.5 text-blue-500" /> 
                                <span>Fluxos</span>
                                {showFlows ? <Eye className="w-2 h-2 ml-0.5 opacity-40 group-hover:opacity-100" /> : <EyeOff className="w-2 h-2 ml-0.5 opacity-100 text-blue-500" />}
                              </button>
                              
                              {showFlows && (
                                <div className="flex flex-wrap gap-1 flex-1 animate-in fade-in slide-in-from-left-2 duration-200">
                                  {flows.filter(f => f.is_active).slice(0, 10).map(f => (
                                    <Button 
                                      key={f.id} 
                                      variant="outline" 
                                      size="sm" 
                                      style={{ height: `${20 * ((metaSettings.shortcut_size || 100) / 100)}px`, fontSize: `${9 * ((metaSettings.shortcut_size || 100) / 100)}px` }}
                                      className="px-2 rounded-md border-blue-500/20 bg-blue-500/5 text-blue-600 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all font-bold whitespace-nowrap shadow-none" 
                                      onClick={() => handleTriggerFlow(f.id)} 
                                      disabled={sendingMessage}
                                    >
                                      {f.name}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <ScrollArea className="flex-1 bg-[url('https://w0.peakpx.com/wallpaper/580/632/HD-wallpaper-whatsapp-background-dark-pattern.jpg')] bg-repeat overflow-y-auto">
                            <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
                              {scheduledMessages.length > 0 && (
                                <div className="space-y-2 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                  <div className="flex items-center gap-2 px-1">
                                    <CalendarClock className="w-3 h-3 text-primary" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mensagens Agendadas</span>
                                  </div>
                                  {scheduledMessages.map((msg) => (
                                    <div key={msg.id} className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex justify-between items-center shadow-sm backdrop-blur-sm">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Badge variant="outline" className="text-[9px] h-4 bg-primary/10 text-primary border-primary/20 font-bold">
                                            {msg.message_data?.action === 'sendMessage' ? 'Mensagem' : 
                                             msg.message_data?.action === 'sendTemplate' ? 'Template' : 'Fluxo'}
                                          </Badge>
                                          <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" />
                                            {new Date(msg.scheduled_for).toLocaleString()}
                                          </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate italic">
                                          {msg.message_data?.text || msg.message_data?.templateName || msg.message_data?.flowId || 'Agendamento'}
                                        </p>
                                      </div>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={async () => {
                                          if (confirm('Deseja cancelar este agendamento?')) {
                                            await supabase.from('crm_scheduled_messages').delete().eq('id', msg.id);
                                            fetchScheduledMessages(selectedContact.id);
                                          }
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {mediaUploadProgress[selectedContact.id] && (
                                <div className="p-3 mb-2 bg-primary/5 rounded-xl border border-primary/20 animate-in fade-in slide-in-from-top-2">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
                                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Convertendo e Enviando...</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-primary">{mediaUploadProgress[selectedContact.id]}%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-primary transition-all duration-300" 
                                      style={{ width: `${mediaUploadProgress[selectedContact.id]}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              {[...chatMessages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((m, idx) => {
                                const isTemplate = m.message_type === 'template' || m.content?.includes('[Template:');
                                const templateName = m.content?.match(/\[Template: (.*?)\]/)?.[1];
                                let template = isTemplate ? templates.find(t => t.name === templateName) : null;

                                if (isTemplate && !template && m.content) {
                                  template = templates.find(t => {
                                    const bodyComponent = t.components?.find((c: any) => c.type === 'BODY');
                                    const bodyText = bodyComponent?.text;
                                    if (!bodyText) return false;
                                    
                                    const cleanContent = m.content.replace(/\[Template: .*?\]\s*/, '').trim();
                                    const normalizedBody = bodyText.replace(/\{\{\d+\}\}/g, '').trim();
                                    
                                    return cleanContent.includes(normalizedBody.substring(0, 30)) || 
                                           bodyText.includes(cleanContent.substring(0, 30));
                                  });
                                }


                                
                                return (
                                  <div key={m.id || idx} className={cn(
                                    "flex w-full mb-1",
                                    m.direction === 'inbound' ? 'justify-start' : 'justify-end'
                                  )}>
                                    <div className={cn(
                                      "p-2.5 md:p-3 rounded-2xl max-w-[85%] md:max-w-[70%] shadow-sm relative",
                                      m.direction === 'inbound' 
                                        ? 'bg-card text-card-foreground rounded-tl-none border border-border/50' 
                                        : 'bg-primary text-primary-foreground rounded-tr-none',
                                      m.isOptimistic && 'opacity-70 grayscale-[0.5]'
                                    )}>
                                      {isTemplate && template ? (
                                        <div className="overflow-hidden rounded-xl bg-white dark:bg-zinc-900 shadow-lg border border-border/50 max-w-[300px]">
                                          {template.components?.find((c: any) => c.type === 'HEADER')?.format !== 'NONE' && (
                                            <div className="max-h-[150px] aspect-video bg-muted/20 flex items-center justify-center relative overflow-hidden border-b border-border/10">
                                              {(() => {
                                                const header = template.components.find((c: any) => c.type === 'HEADER');
                                                let mediaUrl = m.media_url || header?.example?.header_handle?.[0];
                                                
                                                const isNumericId = mediaUrl && /^\d+$/.test(mediaUrl.toString());
                                                
                                                if (header?.format === 'IMAGE' && mediaUrl && !isNumericId) {
                                                  return <img src={mediaUrl} alt="Header" className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewMedia({ url: mediaUrl, type: 'image' })} />;
                                                } else if (header?.format === 'VIDEO' && mediaUrl) {
                                                  return (
                                                    <div className="w-full h-full relative cursor-pointer" onClick={() => setPreviewMedia({ url: mediaUrl, type: 'video' })}>
                                                      <video src={mediaUrl} className="w-full h-full object-cover" />
                                                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                        <Play className="w-8 h-8 text-white" />
                                                      </div>
                                                    </div>
                                                  );
                                                } else if (header?.format === 'TEXT') {
                                                  return <div className="p-3 font-bold text-sm text-foreground w-full">{header.text}</div>;
                                                }
                                                return <div className="text-[10px] text-muted-foreground flex flex-col items-center gap-1"><ImageIcon className="w-5 h-5 opacity-20" /> Sem mídia</div>;
                                              })()}
                                            </div>
                                          )}
                                          <div className="p-3 space-y-2">
                                            <div className="text-[13px] md:text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                                              {m.content?.includes('[Template:') 
                                                ? m.content.replace(/\[Template: .*?\]\s*/, '') 
                                                : (template?.components?.find((c: any) => c.type === 'BODY')?.text || m.content)}
                                            </div>

                                            {template.components?.find((c: any) => c.type === 'FOOTER') && (
                                              <div className="text-[10px] opacity-60 uppercase font-medium">
                                                {template.components.find((c: any) => c.type === 'FOOTER').text}
                                              </div>
                                            )}
                                          </div>
                                          {template.components?.find((c: any) => c.type === 'BUTTONS')?.buttons?.map((btn: any, bIdx: number) => (
                                            <div key={bIdx} className="flex items-center justify-center p-2 border-t border-border/30 text-blue-500 text-xs font-bold hover:bg-muted/5 transition-colors cursor-default">
                                              {btn.text}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <>
                                          {m.message_type === 'image' && m.media_url && !/^\d+$/.test(m.media_url.toString()) && (
                                            <div className="mb-2 overflow-hidden rounded-lg border border-border/20 shadow-sm bg-muted/20 max-w-fit">
                                              <img 
                                                src={m.media_url} 
                                                alt="Mídia" 
                                                className="max-h-[180px] w-auto object-cover cursor-zoom-in transition-transform hover:scale-[1.02] duration-300" 
                                                onClick={() => setPreviewMedia({ url: m.media_url, type: 'image' })} 
                                              />
                                            </div>
                                          )}
                                          {m.message_type === 'sticker' && m.media_url && (
                                            <div className="mb-2 max-w-[150px]">
                                              <img 
                                                src={m.media_url} 
                                                alt="Sticker" 
                                                className="w-full h-auto cursor-zoom-in" 
                                                onClick={() => setPreviewMedia({ url: m.media_url, type: 'image' })}
                                              />
                                            </div>
                                          )}
                                          {m.message_type === 'image' && m.media_url && /^\d+$/.test(m.media_url.toString()) && (
                                            <div className="mb-2 p-4 rounded-lg border border-dashed border-border flex flex-col items-center justify-center bg-muted/5">
                                              <ImageIcon className="w-8 h-8 text-muted-foreground opacity-20 mb-2" />
                                              <span className="text-[10px] text-muted-foreground">ID de Mídia Meta: {m.media_url}</span>
                                            </div>
                                          )}
                                          {m.message_type === 'video' && m.media_url && (
                                            <div 
                                              className="mb-2 overflow-hidden rounded-lg border border-border/20 shadow-sm bg-muted/20 relative group cursor-pointer max-w-fit"
                                              onClick={() => setPreviewMedia({ url: m.media_url, type: 'video' })}
                                            >
                                              <video src={m.media_url} className="max-h-[180px] w-auto object-cover rounded-lg shadow-inner" />
                                              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                                <Play className="w-10 h-10 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                                              </div>
                                            </div>
                                          )}
                                          {(m.message_type === 'audio' || m.message_type === 'voice') && m.media_url && (
                                            <div className="mb-1 rounded-xl bg-black/10 dark:bg-white/5 w-[260px] sm:w-[280px] max-w-full">
                                              <audio
                                                src={m.media_url}
                                                controls
                                                preload="metadata"
                                                controlsList="nodownload noplaybackrate"
                                                className="block w-full h-10 sm:h-9 rounded-xl"
                                                style={{ minWidth: 0, maxWidth: '100%' }}
                                              />
                                            </div>
                                          )}
                                          {m.message_type === 'document' && m.media_url && (
                                            <div 
                                              onClick={() => window.open(m.media_url, '_blank')}
                                              className="mb-2 p-3 rounded-xl bg-muted/20 border border-border/20 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                                            >
                                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-primary" />
                                              </div>
                                              <div className="flex-1 overflow-hidden">
                                                <div className="text-[13px] font-medium truncate">Documento</div>
                                                <div className="text-[10px] opacity-60">Clique para abrir</div>
                                              </div>
                                            </div>
                                          )}
                                          {m.message_type === 'location' && (
                                            <div className="mb-2 p-3 rounded-xl bg-muted/20 border border-border/20 flex flex-col gap-2">
                                              <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-primary" />
                                                <span className="text-xs font-bold">Localização Recebida</span>
                                              </div>
                                              <div className="text-[10px] opacity-60 truncate">{m.content}</div>
                                              <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                className="w-full text-[10px] h-7"
                                                onClick={() => {
                                                  const lat = m.metadata?.location?.latitude || m.content?.match(/Lat: (.*?),/)?.[1];
                                                  const lng = m.metadata?.location?.longitude || m.content?.match(/Long: (.*?)(\s|$)/)?.[1];
                                                  if (lat && lng) window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                                                }}
                                              >
                                                Ver no Google Maps
                                              </Button>
                                            </div>
                                          )}
                                          {m.message_type === 'reaction' && (
                                            <div className="absolute -bottom-3 right-0 bg-zinc-800 border border-white/10 rounded-full px-1.5 py-0.5 text-xs shadow-md z-10">
                                              {m.content?.replace('[Reação] ', '')}
                                            </div>
                                          )}
                                          {m.message_type === 'contacts' && (
                                            <div className="mb-2 p-3 rounded-xl bg-muted/20 border border-border/20 flex items-center gap-3">
                                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <UserPlus className="w-5 h-5 text-primary" />
                                              </div>
                                              <div className="flex-1 overflow-hidden">
                                                <div className="text-[13px] font-medium truncate">{m.content?.replace('[Contato] ', '')}</div>
                                                <div className="text-[10px] opacity-60">Contato compartilhado</div>
                                              </div>
                                            </div>
                                          )}
                                          {(m.message_text || m.content) && m.message_type !== 'reaction' && m.message_type !== 'audio' && m.message_type !== 'voice' && !((m.message_text || m.content || '').trim() === '[Mensagem de Áudio]') && (
                                            <div className="text-sm md:text-[15px] leading-relaxed break-words whitespace-pre-wrap px-0.5">
                                              {m.message_text || m.content}
                                            </div>
                                          )}
                                          {m.message_type === 'unsupported' && (
                                            <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20 text-[10px] text-red-400">
                                              Mensagem com formato ainda não suportado pela interface. 
                                              {m.metadata && (
                                                <details className="mt-1 cursor-pointer">
                                                  <summary>Ver dados brutos</summary>
                                                  <pre className="mt-1 text-[8px] whitespace-pre-wrap bg-black/20 p-1 rounded">
                                                    {JSON.stringify(m.metadata, null, 2)}
                                                  </pre>
                                                </details>
                                              )}
                                            </div>
                                          )}
                                        </>
                                      )}
                                      <div className={cn(
                                        "text-[9px] mt-1 text-right opacity-60 flex items-center justify-end gap-1",
                                        m.direction === 'inbound' ? 'text-muted-foreground' : 'text-primary-foreground'
                                      )}>
                                        {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        {m.direction === 'outbound' && <Check className="w-3 h-3" />}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              <div ref={scrollRef} className="h-4" />
                            </div>
                          </ScrollArea>
                          
                          <div className="p-2 sm:p-3 md:p-4 bg-card border-t shadow-lg z-10 space-y-2 sm:space-y-3 shrink-0">
                            {selectedContact ? (
                              <>
                                <div className="flex flex-col gap-2 p-2 sm:p-3 bg-muted/20 rounded-xl border border-border/50">
                                  {/* Atenção: Robô Desativado Geral hidden as requested */}

                                  <div className="flex items-center justify-end gap-2 flex-wrap">
                                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap opacity-0 pointer-events-none absolute h-0 w-0 overflow-hidden">
                                      <div className="flex items-center gap-1.5 sm:gap-2">
                                        <Bot className={cn("w-4 h-4 shrink-0", selectedContact.ai_active && metaSettings.ai_agent_enabled ? "text-primary" : "text-muted-foreground")} />
                                        <span className="text-[10px] sm:text-[11px] font-bold">Assistente IA</span>
                                        <Switch 
                                          checked={selectedContact.ai_active}
                                          disabled={!metaSettings.ai_agent_enabled}
                                          onCheckedChange={async (val: boolean) => {
                                            await updateContactStatus(selectedContact.id, { ai_active: val });
                                          }}
                                        />
                                      </div>
                                      <div className="w-px h-4 bg-border hidden sm:block" />
                                      <div className="flex items-center gap-1.5 sm:gap-2">
                                        <TrendingUp className={cn("w-4 h-4 shrink-0", selectedContact.ai_strategy_active ? "text-indigo-500" : "text-muted-foreground")} />
                                        <span className="text-[10px] sm:text-[11px] font-bold">Estratégias IA</span>
                                        <Switch 
                                          checked={selectedContact.ai_strategy_active}
                                          onCheckedChange={async (val: boolean) => {
                                            await updateContactStatus(selectedContact.id, { ai_strategy_active: val });
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-8 text-[11px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 shrink-0 border border-indigo-100 rounded-xl px-4"
                                          disabled={!metaSettings.openai_api_key}
                                        >
                                          <Bot className="w-4 h-4 mr-2" /> <span>Analises IA</span>
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-[600px] rounded-3xl">
                                        <DialogHeader>
                                          <DialogTitle className="flex items-center gap-2 text-xl">
                                            <Zap className="w-6 h-6 text-indigo-600 animate-pulse" />
                                            Análise Estratégica Inteligente
                                          </DialogTitle>
                                          <DialogDescription>
                                            Histórico de análises e ferramentas de vendas para <strong>{selectedContact.name || selectedContact.wa_id}</strong>.
                                          </DialogDescription>
                                        </DialogHeader>
                                        
                                        <Tabs defaultValue="current" className="w-full mt-4">
                                          <TabsList className="grid w-full grid-cols-2 bg-muted/50 rounded-xl p-1">
                                            <TabsTrigger value="current" className="rounded-lg font-bold text-xs">Análise Atual</TabsTrigger>
                                            <TabsTrigger value="history" className="rounded-lg font-bold text-xs">Histórico (Analises IA)</TabsTrigger>
                                          </TabsList>
                                          
                                          <TabsContent value="current" className="space-y-4 py-4">
                                            {selectedContact.last_ai_strategy ? (
                                              <div className="bg-muted/30 border rounded-2xl p-5 max-h-[350px] overflow-y-auto">
                                                <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
                                                  {selectedContact.last_ai_strategy}
                                                </p>
                                              </div>
                                            ) : (
                                              <div className="text-center py-12 bg-muted/20 rounded-2xl border-2 border-dashed flex flex-col items-center gap-3">
                                                <Bot className="w-8 h-8 opacity-20" />
                                                <p className="text-sm font-bold text-muted-foreground">Nenhuma análise gerada para este contato.</p>
                                              </div>
                                            )}
                                            
                                            <div className="grid grid-cols-2 gap-3 pt-2">
                                              <Button 
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 rounded-xl shadow-lg shadow-indigo-500/20"
                                                onClick={async () => {
                                                  setSendingMessage(true);
                                                  try {
                                                    const { data, error } = await supabase.functions.invoke('generate-strategy', {
                                                      body: { contactId: selectedContact.id, action: 'crm_strategy' }
                                                    });
                                                    if (error) throw error;
                                                    toast({ title: "Estratégia de venda gerada!" });
                                                    fetchContacts();
                                                  } catch (err: any) {
                                                    toast({ title: "Erro ao gerar", description: err.message, variant: "destructive" });
                                                  } finally {
                                                    setSendingMessage(false);
                                                  }
                                                }}
                                                disabled={sendingMessage}
                                              >
                                                {sendingMessage ? <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                                                Gerar Estratégia Venda
                                              </Button>
                                              
                                              <Button 
                                                variant="secondary"
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl shadow-lg shadow-emerald-500/20"
                                                onClick={async () => {
                                                  setSendingMessage(true);
                                                  try {
                                                    const { data, error } = await supabase.functions.invoke('generate-strategy', {
                                                      body: { contactId: selectedContact.id, action: 'analyze_interaction' }
                                                    });
                                                    if (error) throw error;
                                                    toast({ title: "Análise de atendimento concluída!" });
                                                    fetchContacts();
                                                  } catch (err: any) {
                                                    toast({ title: "Erro ao gerar análise", description: err.message, variant: "destructive" });
                                                  } finally {
                                                    setSendingMessage(false);
                                                  }
                                                }}
                                                disabled={sendingMessage}
                                              >
                                                {sendingMessage ? <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> : <BarChart3 className="w-4 h-4 mr-2" />}
                                                Analisar Atendimento
                                              </Button>
                                            </div>
                                          </TabsContent>
                                          
                                          <TabsContent value="history" className="py-4">
                                            <ScrollArea className="h-[400px] pr-4">
                                              <div className="space-y-4">
                                                {(selectedContact.ai_strategy_history || []).length > 0 ? (
                                                  selectedContact.ai_strategy_history.map((item: any, idx: number) => (
                                                    <div key={idx} className="p-4 rounded-2xl bg-card border shadow-sm space-y-2 group hover:shadow-md transition-shadow">
                                                      <div className="flex justify-between items-center border-b pb-2 mb-2">
                                                        <Badge variant="outline" className="text-[10px] font-bold uppercase">{item.type || 'Estratégia'}</Badge>
                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                          {new Date(item.created_at).toLocaleString('pt-BR')}
                                                        </span>
                                                      </div>
                                                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap italic text-muted-foreground group-hover:text-foreground transition-colors">
                                                        {item.strategy}
                                                      </p>
                                                      <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-7 text-[10px] font-bold w-full mt-2 opacity-50 hover:opacity-100"
                                                        onClick={() => copyToClipboard(item.strategy, "Análise IA")}
                                                      >
                                                        <Copy className="w-3 h-3 mr-1" /> Copiar Texto
                                                      </Button>
                                                    </div>
                                                  ))
                                                ) : (
                                                  <div className="text-center py-20 opacity-30 italic text-sm">Sem histórico disponível.</div>
                                                )}
                                              </div>
                                            </ScrollArea>
                                          </TabsContent>
                                        </Tabs>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                </div>
                                {isPreviewingAudio && recordedAudioUrl ? (
                                  <div className="flex flex-col gap-2 p-3 bg-primary/5 rounded-xl border border-primary/20 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex items-center gap-3">
                                      <audio src={recordedAudioUrl} controls className="h-8 flex-1" />
                                      <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" onClick={cancelAudioPreview} className="text-destructive hover:bg-destructive/10"><XCircle className="w-5 h-5" /></Button>
                                        <Button size="icon" onClick={sendRecordedAudio} className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20"><Send className="w-5 h-5" /></Button>
                                      </div>
                                    </div>
                                    <p className="text-[10px] text-center text-muted-foreground font-medium uppercase tracking-tighter">Clique no verde para enviar ou no vermelho para descartar</p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2 max-w-5xl mx-auto w-full">
                                    {isRecording && (
                                      <div className="flex items-center justify-between px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl animate-pulse">
                                        <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                          <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Gravando Áudio...</span>
                                        </div>
                                        <span className="text-xs font-mono font-bold text-red-600">
                                          {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1 sm:gap-2 w-full px-1">
                                      <Button variant="ghost" size="icon" onClick={() => { setUploadType('image'); fileInputRef.current?.click(); }} className="text-muted-foreground shrink-0"><ImageIcon className="w-5 h-5" /></Button>
                                      <div className="flex-1 relative flex items-center">
                                        <Input 
                                          placeholder={isRecording ? "Gravando..." : "Escreva sua mensagem..."}
                                          value={newMessage} 
                                          disabled={isRecording}
                                          onChange={e => setNewMessage(e.target.value)}
                                          onKeyDown={e => e.key === 'Enter' && !isRecording && handleSendMessage()}
                                          className="bg-muted/50 border-none h-11 pr-10 rounded-xl"
                                        />
                                        {isRecording && (
                                          <div className="absolute right-3 flex items-center gap-2">
                                            <Button 
                                              size="icon" 
                                              variant="ghost" 
                                              className="h-8 w-8 text-red-500 hover:bg-red-50"
                                              onClick={stopRecording}
                                            >
                                              <StopCircle className="w-5 h-5" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                      {!isRecording && (
                                        <div className="flex items-center gap-1">
                                          <div className="relative">
                                            <Button 
                                              size="icon" 
                                              variant="ghost" 
                                              className={cn(
                                                "h-11 w-11 shrink-0 rounded-full",
                                                !metaSettings.vps_transcoder_url || metaSettings.vps_status === 'offline' 
                                                  ? "text-orange-500 bg-orange-50 hover:bg-orange-100" 
                                                  : "text-primary hover:bg-primary/10"
                                              )}
                                              onClick={startRecording}
                                            >
                                              <Mic className="w-5 h-5" />
                                            </Button>
                                            {(!metaSettings.vps_transcoder_url || metaSettings.vps_status === 'offline') && (
                                              <div className="absolute -top-1 -right-1">
                                                <div className="bg-orange-500 rounded-full p-0.5 border-2 border-white">
                                                  <AlertCircle className="w-2.5 h-2.5 text-white" />
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                          <Button 
                                            size="icon" 
                                            onClick={handleSendMessage} 
                                            disabled={!newMessage.trim() || sendingMessage}
                                            className="h-11 w-11 shrink-0 shadow-md rounded-full"
                                          >
                                            <Send className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
                                <MessageSquare className="w-10 h-10 text-primary/30" />
                                <h3 className="text-lg font-bold">Gerenciador de Conversas</h3>
                                <p className="text-muted-foreground text-sm max-w-[280px]">Selecione um contato para começar.</p>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
                          <MessageSquare className="w-10 h-10 text-primary/30" />
                          <h3 className="text-lg font-bold">Gerenciador de Conversas</h3>
                          <p className="text-muted-foreground text-sm max-w-[280px]">Selecione um contato para começar.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            {activeTab === 'scheduling' && (
              <ScrollArea className="flex-1 p-3 sm:p-4 md:p-8 bg-muted/5">
                <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-card p-4 md:p-6 rounded-2xl border shadow-sm">
                    <div className="min-w-0">
                      <h2 className="text-lg md:text-2xl font-bold tracking-tight">Agendamentos</h2>
                      <p className="text-muted-foreground text-xs md:text-sm">Visualize e gerencie todas as mensagens agendadas e o histórico de envios.</p>
                    </div>
                    <Button variant="outline" onClick={fetchAllScheduledMessages} className="shrink-0 self-start sm:self-auto">
                      <RefreshCcw className="w-4 h-4 mr-2" /> Atualizar
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <Card className="border-none shadow-md overflow-hidden rounded-2xl">
                      <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg">Próximos Agendamentos</CardTitle>
                        <CardDescription>Mensagens aguardando o horário de envio.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        {/* Mobile cards */}
                        <div className="md:hidden divide-y">
                          {allScheduledMessages.filter(m => m.status === 'pending').length > 0 ? (
                            allScheduledMessages.filter(m => m.status === 'pending').map((msg) => (
                              <div key={msg.id} className="p-4 flex flex-col gap-2">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="min-w-0">
                                    <p className="font-bold text-sm truncate">{msg.crm_contacts?.name || msg.crm_contacts?.wa_id || 'Desconhecido'}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                      {msg.message_data?.text || msg.message_data?.templateName || msg.message_data?.flowId || '-'}
                                    </p>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0"
                                    onClick={async () => {
                                      if (confirm('Deseja cancelar este agendamento?')) {
                                        await supabase.from('crm_scheduled_messages').update({ status: 'canceled' }).eq('id', msg.id);
                                        fetchAllScheduledMessages();
                                      }
                                    }}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                                  <Badge variant="outline" className="capitalize text-[10px]">
                                    {msg.message_data?.action === 'sendMessage' ? 'Texto' : 
                                     msg.message_data?.action === 'sendTemplate' ? 'Template' : 
                                     msg.message_data?.action === 'startFlow' ? 'Fluxo' : msg.message_data?.action}
                                  </Badge>
                                  <span className="text-muted-foreground font-medium">
                                    {new Date(msg.scheduled_for).toLocaleString('pt-BR')}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center text-muted-foreground italic text-xs">
                              Nenhum agendamento pendente encontrado.
                            </div>
                          )}
                        </div>
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground border-b">
                              <tr>
                                <th className="px-6 py-3">Contato</th>
                                <th className="px-6 py-3">Tipo</th>
                                <th className="px-6 py-3">Conteúdo</th>
                                <th className="px-6 py-3">Agendado Para</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {allScheduledMessages.filter(m => m.status === 'pending').length > 0 ? (
                                allScheduledMessages.filter(m => m.status === 'pending').map((msg) => (
                                  <tr key={msg.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-6 py-4 font-bold">
                                      {msg.crm_contacts?.name || msg.crm_contacts?.wa_id || 'Desconhecido'}
                                    </td>
                                    <td className="px-6 py-4">
                                      <Badge variant="outline" className="capitalize">
                                        {msg.message_data?.action === 'sendMessage' ? 'Texto' : 
                                         msg.message_data?.action === 'sendTemplate' ? 'Template' : 
                                         msg.message_data?.action === 'startFlow' ? 'Fluxo' : msg.message_data?.action}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4 max-w-xs truncate text-muted-foreground">
                                      {msg.message_data?.text || msg.message_data?.templateName || msg.message_data?.flowId || '-'}
                                    </td>
                                    <td className="px-6 py-4 font-medium">
                                      {new Date(msg.scheduled_for).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-destructive hover:bg-destructive/10"
                                        onClick={async () => {
                                          if (confirm('Deseja cancelar este agendamento?')) {
                                            await supabase.from('crm_scheduled_messages').update({ status: 'canceled' }).eq('id', msg.id);
                                            fetchAllScheduledMessages();
                                          }
                                        }}
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground italic">
                                    Nenhum agendamento pendente encontrado.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-md overflow-hidden rounded-2xl">
                      <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg">Histórico de Envios</CardTitle>
                        <CardDescription>Registro de mensagens enviadas ou com erro.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        {/* Mobile cards */}
                        <div className="md:hidden divide-y">
                          {allScheduledMessages.filter(m => m.status !== 'pending').length > 0 ? (
                            allScheduledMessages.filter(m => m.status !== 'pending')
                              .sort((a, b) => new Date(b.scheduled_for).getTime() - new Date(a.scheduled_for).getTime())
                              .slice(0, 20)
                              .map((msg) => (
                              <div key={msg.id} className="p-4 flex flex-col gap-2">
                                <div className="flex justify-between items-start gap-2">
                                  <p className="font-bold text-sm truncate min-w-0">{msg.crm_contacts?.name || msg.crm_contacts?.wa_id || 'Desconhecido'}</p>
                                  <Badge 
                                    variant={msg.status === 'sent' ? 'default' : 'destructive'}
                                    className={cn(
                                      "capitalize text-[10px] shrink-0",
                                      msg.status === 'sent' ? "bg-green-500/10 text-green-600 border-green-200" : ""
                                    )}
                                  >
                                    {msg.status === 'sent' ? 'Enviado' : msg.status === 'canceled' ? 'Cancelado' : 'Erro'}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                                  <Badge variant="outline" className="capitalize text-[10px]">
                                    {msg.message_data?.action === 'sendMessage' ? 'Texto' : 
                                     msg.message_data?.action === 'sendTemplate' ? 'Template' : 
                                     msg.message_data?.action === 'startFlow' ? 'Fluxo' : msg.message_data?.action}
                                  </Badge>
                                  <span className="text-muted-foreground">{new Date(msg.scheduled_for).toLocaleString('pt-BR')}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center text-muted-foreground italic text-xs">
                              Nenhum histórico encontrado.
                            </div>
                          )}
                        </div>
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground border-b">
                              <tr>
                                <th className="px-6 py-3">Contato</th>
                                <th className="px-6 py-3">Tipo</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Enviado Em</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {allScheduledMessages.filter(m => m.status !== 'pending').length > 0 ? (
                                allScheduledMessages.filter(m => m.status !== 'pending')
                                  .sort((a, b) => new Date(b.scheduled_for).getTime() - new Date(a.scheduled_for).getTime())
                                  .slice(0, 20)
                                  .map((msg) => (
                                  <tr key={msg.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-6 py-4 font-bold">
                                      {msg.crm_contacts?.name || msg.crm_contacts?.wa_id || 'Desconhecido'}
                                    </td>
                                    <td className="px-6 py-4">
                                      <Badge variant="outline" className="capitalize">
                                        {msg.message_data?.action === 'sendMessage' ? 'Texto' : 
                                         msg.message_data?.action === 'sendTemplate' ? 'Template' : 
                                         msg.message_data?.action === 'startFlow' ? 'Fluxo' : msg.message_data?.action}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                      <Badge 
                                        variant={msg.status === 'sent' ? 'default' : 'destructive'}
                                        className={cn(
                                          "capitalize",
                                          msg.status === 'sent' ? "bg-green-500/10 text-green-600 border-green-200" : ""
                                        )}
                                      >
                                        {msg.status === 'sent' ? 'Enviado' : msg.status === 'canceled' ? 'Cancelado' : 'Erro'}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                      {new Date(msg.scheduled_for).toLocaleString('pt-BR')}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground italic">
                                    Nenhum histórico encontrado.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'flows' && (
              <ScrollArea className="flex-1 p-3 sm:p-4 md:p-8 bg-muted/5">
                <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-card p-4 md:p-6 rounded-2xl border shadow-sm">
                    <div className="min-w-0">
                      <h2 className="text-lg md:text-2xl font-bold tracking-tight">Fluxos de Automação</h2>
                      <p className="text-muted-foreground text-xs md:text-sm">Crie gatilhos e sequências automáticas de mensagens inteligentes.</p>
                    </div>
                    <Button onClick={() => { setEditingFlow(null); setIsFlowEditorOpen(true); }} className="shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 shrink-0 self-start sm:self-auto">
                      <Plus className="w-4 h-4 mr-2" /> Novo Fluxo Visual
                    </Button>
                  </div>

                  <Accordion type="single" collapsible className="w-full space-y-4">
                    <AccordionItem value="flows-list" className="border-none">
                      <AccordionTrigger className="bg-card p-6 rounded-2xl border shadow-sm hover:no-underline">
                        <div className="flex flex-col items-start text-left">
                          <h3 className="text-xl font-bold tracking-tight">Lista de Fluxos</h3>
                          <p className="text-muted-foreground text-sm font-normal">Clique para ver e gerenciar seus fluxos de automação.</p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                          {flows.length > 0 ? (
                            flows.map((flow) => (
                              <Card key={flow.id} className="group overflow-hidden border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-all">
                                <CardHeader className="bg-muted/30 pb-4 border-b">
                                  <div className="flex justify-between items-start mb-2">
                                    <Badge variant={flow.is_active ? "default" : "secondary"} className={cn("text-[10px]", flow.is_active ? "bg-green-500/10 text-green-600 border-green-200" : "")}>
                                      {flow.is_active ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                    <div className="flex gap-1">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 text-primary hover:bg-primary/10" 
                                        onClick={() => handleDuplicateFlow(flow)}
                                        title="Duplicar Fluxo"
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={async () => {
                                        if (confirm('Deseja excluir este fluxo?')) {
                                          await supabase.from('crm_flows').delete().eq('id', flow.id);
                                          fetchData();
                                        }
                                      }}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                  <CardTitle className="text-lg truncate">{flow.name}</CardTitle>
                                  <CardDescription className="text-[11px] flex items-center gap-1.5 mt-1 font-medium">
                                    <Zap className="w-3 h-3 text-amber-500" /> Gatilho: <span className="text-foreground">{flow.trigger_type || 'Manual'}</span>
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 bg-card">
                                  <Button variant="outline" size="sm" className="w-full hover:bg-primary hover:text-white transition-colors h-9" onClick={() => { setEditingFlow(flow); setIsFlowEditorOpen(true); }}>
                                    <GitBranch className="w-4 h-4 mr-2" /> Abrir Editor Visual
                                  </Button>
                                </CardContent>
                              </Card>
                            ))
                          ) : (
                            <div className="col-span-full py-20 text-center bg-card rounded-2xl border-2 border-dashed border-muted flex flex-col items-center justify-center gap-4">
                              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                <GitBranch className="w-8 h-8 text-muted-foreground/50" />
                              </div>
                              <div className="max-w-xs mx-auto">
                                <h3 className="font-bold text-lg">Nenhum fluxo criado</h3>
                                <p className="text-sm text-muted-foreground">Comece criando um novo fluxo visual para automatizar suas mensagens do WhatsApp.</p>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => setIsFlowEditorOpen(true)}>Criar meu primeiro fluxo</Button>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'ai-agent' && (
              <ScrollArea className="flex-1 p-3 sm:p-4 md:p-8 bg-muted/5">
                <div className="max-w-4xl mx-auto space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-card p-4 md:p-6 rounded-2xl border shadow-sm">
                    <div className="min-w-0">
                      <h2 className="text-lg md:text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Bot className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" /> <span className="truncate">Agente de Inteligência Artificial</span>
                      </h2>
                      <p className="text-muted-foreground text-xs md:text-sm">Configure como a IA deve interagir com seus clientes.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label htmlFor="ai-agent-enabled" className="text-sm font-bold">Ativação Geral</Label>
                      <Switch 
                        id="ai-agent-enabled"
                        checked={metaSettings.ai_agent_enabled}
                        onCheckedChange={(val) => setMetaSettings({...metaSettings, ai_agent_enabled: val})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="rounded-2xl shadow-sm border overflow-hidden flex flex-col">
                      <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <LinkIcon className="w-4 h-4 text-zinc-600" /> Motor da IA
                        </CardTitle>
                        <CardDescription>Conexão e Modo de Operação</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6 flex-1">
                        <div className="space-y-2">
                          <Label className="text-sm font-bold flex items-center gap-2">
                            OpenAI API Key
                          </Label>
                          <Input 
                            type="password"
                            placeholder="sk-..."
                            value={metaSettings.openai_api_key}
                            onChange={(e) => setMetaSettings({...metaSettings, openai_api_key: e.target.value})}
                          />
                          <p className="text-[10px] text-muted-foreground italic">Use uma chave da OpenAI (GPT-4o recomendado).</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-bold flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" /> Modo de Operação
                          </Label>
                          <Select 
                            value={metaSettings.ai_operation_mode || 'chat'} 
                            onValueChange={(val) => setMetaSettings({...metaSettings, ai_operation_mode: val})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="chat">Apenas Conversar (I.A. Ativa)</SelectItem>
                              <SelectItem value="monitor">Apenas Qualificar (Passiva)</SelectItem>
                              <SelectItem value="hybrid">Híbrido (Conversa e Qualifica)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-muted-foreground italic">
                            "Passiva" fará com que a IA não envie mensagens, apenas analise o contato.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl shadow-sm border overflow-hidden flex flex-col md:col-span-2">
                      <CardHeader className="bg-primary/5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 space-y-0">
                        <div className="min-w-0">
                          <CardTitle className="text-base md:text-lg flex items-center gap-2 text-primary">
                            <Users className="w-5 h-5 shrink-0" /> <span className="truncate">Integração Google Contatos</span>
                          </CardTitle>
                          <CardDescription className="text-xs">Sincronize seus contatos com o Google para backup e organização</CardDescription>
                        </div>
                        <Badge variant={googleContactsEnabled ? "default" : "outline"} className="font-bold shrink-0 self-start sm:self-auto">
                          {googleContactsEnabled ? 'Conectado' : 'Desconectado'}
                        </Badge>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-bold flex items-center gap-2">
                                  <RefreshCcw className="w-4 h-4" /> Sincronização Automática
                                </Label>
                                <p className="text-xs text-muted-foreground">Novos contatos serão enviados ao Google automaticamente.</p>
                              </div>
                              <Switch 
                                checked={metaSettings.google_auto_sync} 
                                onCheckedChange={async (checked) => {
                                  setMetaSettings(prev => ({ ...prev, google_auto_sync: checked }));
                                  const { id, created_at, updated_at, webhook_verify_token, vps_status, ...rest } = metaSettings;
                                  await supabase.from('crm_settings').upsert({
                                    ...rest,
                                    google_auto_sync: checked,
                                    id: '00000000-0000-0000-0000-000000000001',
                                    updated_at: new Date().toISOString()
                                  });
                                  toast({ title: checked ? "Sincronização ativada" : "Sincronização desativada" });
                                }}
                              />
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                               <Button 
                                className="flex-1 font-bold h-11"
                                onClick={handleConnectGoogle}
                                variant="outline"
                              >
                                {googleContactsEnabled ? 'Conectar outra Conta' : 'Conectar Conta Google'}
                              </Button>

                              {googleContactsEnabled && (
                                <>
                                  <Button 
                                    className="flex-1 font-bold h-11 bg-[#00a884] hover:bg-[#00a884]/90"
                                    onClick={handleSyncGoogleContacts}
                                    disabled={isSyncingContacts}
                                  >
                                    <RefreshCcw className={cn("w-4 h-4 mr-2", isSyncingContacts && "animate-spin")} /> 
                                    {isSyncingContacts ? 'Sincronizando...' : 'Sincronizar Agora'}
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    className="h-11 px-3 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    title="Deslogar Google"
                                    onClick={() => {
                                      localStorage.removeItem('google_contacts_connected');
                                      localStorage.removeItem('google_contacts_auth_code');
                                      setGoogleContactsEnabled(false);
                                      toast({ title: "Google Desconectado" });
                                    }}
                                  >
                                    <LogOut className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div className="bg-blue-500/5 border border-blue-200 rounded-xl p-4 flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                              <Users className="w-5 h-5 text-blue-500" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-blue-700">Por que conectar?</h4>
                              <p className="text-[11px] text-blue-600/80 leading-relaxed">
                                Ao conectar sua conta Google, você pode importar contatos existentes e garantir que todos os seus leads do WhatsApp sejam salvos automaticamente na sua agenda do Google.
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl shadow-sm border overflow-hidden flex flex-col">
                      <CardHeader className="bg-amber-50 dark:bg-amber-900/10 border-b">
                        <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-500">
                          <TrendingUp className="w-4 h-4" /> Estratégias e Gatilhos
                        </CardTitle>
                        <CardDescription>Quando e como o agente entra em ação</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6 flex-1">
                        <div className="space-y-2">
                          <Label className="text-sm font-bold flex items-center gap-2">
                            Gatilho de Ativação
                          </Label>
                          <Select 
                            value={metaSettings.ai_agent_trigger || 'all'} 
                            onValueChange={(val) => setMetaSettings({...metaSettings, ai_agent_trigger: val})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Qualquer Mensagem (Sempre Ativo)</SelectItem>
                              <SelectItem value="keyword">Mensagem Específica (Palavra-chave)</SelectItem>
                              <SelectItem value="first_message">Primeira Mensagem do Cliente</SelectItem>
                              <SelectItem value="manual">Ativação Manual apenas</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {metaSettings.ai_agent_trigger === 'keyword' && (
                            <div className="space-y-2 mt-2 animate-in fade-in slide-in-from-top-1">
                              <Input 
                                placeholder="Ex: #aula, oi, quero saber"
                                value={metaSettings.ai_agent_trigger_keyword || ''}
                                onChange={(e) => setMetaSettings({...metaSettings, ai_agent_trigger_keyword: e.target.value})}
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-4 pt-4 border-t border-amber-100 dark:border-amber-900/20">
                          <div className="flex items-center justify-between p-3 bg-indigo-500/5 rounded-xl border border-indigo-200">
                            <div className="space-y-0.5">
                              <Label className="text-xs font-bold flex items-center gap-2">
                                <TrendingUp className="w-3.5 h-3.5 text-indigo-600" /> Auto-Estratégia
                              </Label>
                              <p className="text-[10px] text-muted-foreground">Gerar estratégias automáticas.</p>
                            </div>
                            <Switch 
                              checked={metaSettings.auto_generate_strategy}
                              onCheckedChange={(val) => setMetaSettings({...metaSettings, auto_generate_strategy: val})}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-bold">Prompt de Estratégia</Label>
                            <Textarea 
                              rows={2}
                              className="resize-none text-xs"
                              placeholder="Como a IA deve gerar as estratégias..."
                              value={metaSettings.strategy_generation_prompt}
                              onChange={(e) => setMetaSettings({...metaSettings, strategy_generation_prompt: e.target.value})}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl shadow-sm border overflow-hidden md:col-span-2">
                      <CardHeader className="bg-blue-50 dark:bg-blue-900/10 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 space-y-0">
                        <div className="min-w-0">
                          <CardTitle className="text-base md:text-lg flex items-center gap-2 text-blue-700 dark:text-blue-400">
                            <Clock className="w-4 h-4 shrink-0" /> <span className="truncate">Gestão de Horário Comercial</span>
                          </CardTitle>
                          <CardDescription className="text-xs">Defina quando o agente deve avisar sobre ausência</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                          <Label className="text-xs font-bold">Ativar Função</Label>
                          <Switch 
                            checked={metaSettings.business_hours_enabled}
                            onCheckedChange={(val) => setMetaSettings({...metaSettings, business_hours_enabled: val})}
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Início
                                </Label>
                                <Input 
                                  type="time" 
                                  className="h-10 text-sm"
                                  value={metaSettings.business_hours_start}
                                  onChange={(e) => setMetaSettings({...metaSettings, business_hours_start: e.target.value})}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Fim
                                </Label>
                                <Input 
                                  type="time" 
                                  className="h-10 text-sm"
                                  value={metaSettings.business_hours_end}
                                  onChange={(e) => setMetaSettings({...metaSettings, business_hours_end: e.target.value})}
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Fuso Horário</Label>
                              <Select 
                                value={metaSettings.business_hours_tz} 
                                onValueChange={(val) => setMetaSettings({...metaSettings, business_hours_tz: val})}
                              >
                                <SelectTrigger className="h-10 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                                  <SelectItem value="Europe/Lisbon">Lisboa (GMT+0)</SelectItem>
                                  <SelectItem value="UTC">UTC</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="md:col-span-2 space-y-2">
                            <Label className="text-sm font-bold flex items-center gap-2">
                              Mensagem de Ausência (Fora de Horário)
                            </Label>
                            <Textarea 
                              rows={4}
                              className="resize-none text-sm"
                              placeholder="Nossos administradores não estão ativos no momento..."
                              value={metaSettings.outside_hours_message}
                              onChange={(e) => setMetaSettings({...metaSettings, outside_hours_message: e.target.value})}
                            />
                            <p className="text-[10px] text-muted-foreground italic">
                              Esta mensagem será enviada pela IA caso ela seja acionada fora do horário comercial definido.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl shadow-sm border overflow-hidden md:col-span-2">
                      <CardHeader className="bg-primary/5 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Bot className="w-5 h-5 text-primary" /> Instruções do Agente (Cérebro)
                        </CardTitle>
                        <CardDescription>Defina a personalidade e o objetivo do seu robô</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 md:p-6 space-y-4">
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label className="text-sm font-bold flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary" /> O que sua empresa vende?
                            </Label>
                            <Textarea 
                              rows={4}
                              className="resize-none text-xs leading-relaxed bg-muted/30 border-none rounded-xl"
                              placeholder="Descreva detalhadamente seus produtos, serviços e diferenciais para que a IA gere estratégias mais precisas..."
                              value={metaSettings.business_description}
                              onChange={(e) => setMetaSettings({...metaSettings, business_description: e.target.value})}
                            />
                            <p className="text-[10px] text-muted-foreground italic">Esse resumo será usado pela IA para entender o contexto das suas vendas.</p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                              <Label className="text-sm font-bold">Prompt do System</Label>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleImprovePrompt}
                                disabled={improvingPrompt}
                                className="h-7 text-[10px] gap-1.5 bg-indigo-600 hover:bg-indigo-700 border-indigo-500 text-white shadow-md transition-all active:scale-95 self-start sm:self-auto"
                              >
                                {improvingPrompt ? (
                                  <RefreshCcw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                                )}
                                Melhorar Prompt com I.A
                              </Button>
                            </div>
                            <Textarea 
                              rows={8}
                              className="resize-none font-mono text-xs leading-relaxed bg-muted/30 border-none rounded-xl"
                              placeholder="Ex: Você é um consultor de vendas especializado em..."
                              value={metaSettings.ai_system_prompt}
                              onChange={(e) => setMetaSettings({...metaSettings, ai_system_prompt: e.target.value})}
                            />
                            <p className="text-[10px] text-muted-foreground">Instruções detalhadas de comportamento e conhecimento.</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="rounded-2xl shadow-sm border overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-primary" /> Conhecimento dos Templates e Fluxos
                      </CardTitle>
                      <CardDescription>A IA saberá quais botões e caminhos estão disponíveis para enviar automaticamente.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="bg-blue-500/5 border border-blue-200 rounded-xl p-4 flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                          <Eye className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-blue-700">Visão Contextual Ativa</h4>
                          <p className="text-sm text-blue-600/80 leading-relaxed">
                            O agente IA analisa automaticamente todos os seus <strong>Templates</strong> e <strong>Fluxos Visuais</strong> ativos. 
                            Ele entende o propósito de cada botão e pode escolher enviar um template específico se julgar necessário para o atendimento.
                          </p>
                        </div>
                      </div>
                      <div className="mt-8 space-y-4">
                        <h4 className="font-bold text-sm flex items-center gap-2">
                          <Settings className="w-4 h-4" /> Configurar Conhecimento Específico
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {templates.map((template) => (
                            <div key={template.id} className="p-4 rounded-xl border bg-card/50 space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-xs truncate max-w-[150px]">{template.name}</span>
                                <Badge variant="outline" className="text-[9px]">{template.category}</Badge>
                              </div>
                              <Textarea 
                                placeholder="Descreva quando usar e o que os botões deste template fazem..."
                                className="text-[11px] min-h-[80px] bg-muted/20 border-none resize-none"
                                defaultValue={template.knowledge_description || ''}
                                onBlur={(e) => {
                                  if (e.target.value !== (template.knowledge_description || '')) {
                                    handleUpdateTemplateKnowledge(template.id, e.target.value);
                                  }
                                }}
                              />
                              {updatingKnowledge === template.id && (
                                <div className="text-[9px] text-primary animate-pulse flex items-center gap-1">
                                  <RefreshCcw className="w-2 h-2 animate-spin" /> Salvando...
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-6 flex justify-end">
                        <Button 
                          onClick={handleSaveSettings} 
                          disabled={saving}
                          className="px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                        >
                          <Save className="w-4 h-4 mr-2" /> Salvar Configurações da IA
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'broadcast' && (
              <Broadcaster 
                templates={templates} 
                flows={flows} 
                contacts={contacts} 
                statuses={kanbanStatuses}
              />
            )}

            {activeTab === 'templates' && (
              <ScrollArea className="flex-1 p-4 md:p-8 bg-muted/5">
                <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-card p-4 md:p-6 rounded-2xl border shadow-sm gap-4">
                    <div className="space-y-1">
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight">Templates do WhatsApp</h2>
                      <p className="text-muted-foreground text-xs md:text-sm">Gerencie seus modelos oficiais aprovados pela Meta.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={syncTemplates} disabled={syncingTemplates} className="flex-1 sm:flex-none h-10 text-xs md:text-sm">
                        <RefreshCcw className={cn("w-3.5 h-3.5 md:w-4 md:h-4 mr-2", syncingTemplates && "animate-spin")} />
                        Sincronizar Meta
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="flex-1 sm:flex-none h-10 bg-primary shadow-lg shadow-primary/20 text-xs md:text-sm">
                            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2" /> Novo Template
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl w-[95vw] md:w-full h-[90vh] p-0 border-none rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl">
                          <ScrollArea className="h-full">
                            <TemplateBuilder onSave={handleSaveTemplate} isSaving={saving} />
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <Dialog open={!!confirmSend} onOpenChange={(open) => !open && setConfirmSend(null)}>
                    <DialogContent className="rounded-2xl border-none shadow-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                          <Send className="w-5 h-5 text-primary" /> Confirmar Envio
                        </DialogTitle>
                        <DialogDescription className="py-4 text-base leading-relaxed text-foreground/80">
                          Deseja enviar o {confirmSend?.type === 'template' ? 'template' : 'fluxo'} <span className="font-black text-primary underline underline-offset-4">"{confirmSend?.name}"</span> para <span className="font-bold">{selectedContact?.name || selectedContact?.wa_id}</span>?
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setConfirmSend(null)} className="rounded-xl h-11 px-6">Cancelar</Button>
                        <Button onClick={() => {
                          if (confirmSend?.type === 'template') {
                            handleSendTemplate(confirmSend.id, confirmSend.language || 'pt_BR');
                          } else if (confirmSend?.type === 'flow') {
                            handleTriggerFlow(confirmSend.id);
                          }
                        }} className="rounded-xl h-11 px-8 bg-primary shadow-lg shadow-primary/20">Sim, enviar agora</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Accordion type="single" collapsible className="w-full space-y-4">
                    <AccordionItem value="templates-list" className="border-none">
                      <AccordionTrigger className="bg-card p-4 md:p-6 rounded-2xl border shadow-sm hover:no-underline [&[data-state=open]>div>h3]:text-primary transition-all">
                        <div className="flex flex-col items-start text-left gap-1">
                          <h3 className="text-lg md:text-xl font-bold tracking-tight">Lista de Templates</h3>
                          <p className="text-muted-foreground text-xs md:text-sm font-normal">Clique para ver e gerenciar seus templates.</p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 md:pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-6">
                          {templates.length > 0 ? (
                            templates.map((template) => {
                              const header = template.components?.find((c: any) => c.type === 'HEADER');
                              const body = template.components?.find((c: any) => c.type === 'BODY');
                              const footer = template.components?.find((c: any) => c.type === 'FOOTER');
                              const buttonsComp = template.components?.find((c: any) => c.type === 'BUTTONS');
                              const carouselComp = template.components?.find((c: any) => c.type === 'CAROUSEL');

                              return (
                                <Card key={template.id} className="group overflow-hidden border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-all flex flex-col bg-card rounded-2xl">
                                  <CardHeader className="bg-muted/30 pb-4 border-b">
                                    <div className="flex justify-between items-start mb-2">
                                      <Badge variant={
                                        template.status === 'APPROVED' ? 'default' : 
                                        template.status === 'REJECTED' ? 'destructive' : 'secondary'
                                      } className={cn(
                                        "text-[9px] uppercase tracking-wider",
                                        template.status === 'APPROVED' ? "bg-green-500/10 text-green-600 border-green-200" : ""
                                      )}>
                                        {template.status === 'APPROVED' ? <Check className="w-3 h-3 mr-1" /> : 
                                        template.status === 'REJECTED' ? <XCircle className="w-3 h-3 mr-1" /> : 
                                        <Clock className="w-3 h-3 mr-1" />}
                                        {template.status}
                                      </Badge>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10" onClick={() => setPreviewTemplate(template)}>
                                          <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => {
                                          if (confirm(`Deseja realmente excluir o template "${template.name}"?`)) {
                                            handleDeleteTemplate(template.name);
                                          }
                                        }}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="flex justify-between items-center gap-2">
                                      <CardTitle className="text-sm md:text-base truncate font-bold flex items-center gap-1.5 min-w-0">
                                        <span className="truncate">{template.name}</span>
                                        <div className="flex gap-1 shrink-0">
                                          {template.is_carousel && <Layers className="w-3 h-3 text-primary" />}
                                          {template.is_pix && <CreditCard className="w-3 h-3 text-amber-500" />}
                                        </div>
                                      </CardTitle>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-xl text-primary hover:text-white hover:bg-primary shadow-sm hover:shadow-primary/20 transition-all border border-primary/10 active:scale-95"
                                        title="Copiar texto fácil (sem aspas)"
                                        onClick={() => {
                                          const bodyText = template.components?.find((c: any) => c.type === 'BODY')?.text || '';
                                          copyToClipboard(bodyText, "Texto do Template");
                                        }}
                                      >
                                        <Copy className="h-3.5 w-3.5 md:h-4 md:h-4" />
                                      </Button>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                      <Badge variant="outline" className="text-[8px] md:text-[9px] font-bold bg-muted/50 border-none px-1.5 py-0 md:py-0.5">{template.category}</Badge>
                                      <Badge variant="outline" className="text-[8px] md:text-[9px] font-bold bg-muted/50 border-none px-1.5 py-0 md:py-0.5">{template.language}</Badge>
                                      {template.is_pix && (
                                        <Badge variant="outline" className="text-[8px] md:text-[9px] font-bold bg-amber-500/10 text-amber-600 border-amber-200 px-1.5 py-0 md:py-0.5">PIX</Badge>
                                      )}
                                    </div>
                                  </CardHeader>
                            <CardContent className="p-4 flex-1 flex flex-col justify-between gap-4">
                              <div className="bg-muted/20 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/50 relative">
                                <div className="absolute top-2 right-2 w-4 h-4 text-muted-foreground/30"><MessageSquare className="w-full h-full" /></div>
                                {header && header.format === 'IMAGE' && header.example?.header_handle?.[0] && (
                                  <div className="mb-3 aspect-video overflow-hidden rounded-lg bg-muted shadow-inner">
                                    <img src={header.example.header_handle[0]} alt="Header" className="w-full h-full object-cover" />
                                  </div>
                                )}
                                {carouselComp && carouselComp.cards && (
                                  <div className="mb-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    {carouselComp.cards.map((card: any, cIdx: number) => {
                                      const cardHeader = card.components?.find((c: any) => c.type === 'HEADER');
                                      return (
                                        <div key={cIdx} className="min-w-[120px] aspect-square rounded-lg bg-muted overflow-hidden border border-zinc-200 dark:border-zinc-800">
                                          {cardHeader?.example?.header_handle?.[0] && (
                                            <img src={cardHeader.example.header_handle[0]} className="w-full h-full object-cover" />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                <div className="text-[12px] md:text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300 italic line-clamp-4 md:line-clamp-6">
                                  "{body?.text}"
                                </div>
                                {template.is_pix && template.pix_code && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full mt-3 h-8 text-[9px] md:text-[10px] bg-amber-50/50 hover:bg-amber-100 dark:bg-amber-900/10 dark:hover:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 gap-1.5 md:gap-2 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(template.pix_code);
                                      toast({ title: "PIX Copiado!", description: "Chave PIX copiada para a área de transferência." });
                                    }}
                                  >
                                    <Copy className="w-2.5 h-2.5 md:w-3 md:h-3 shrink-0" /> <span className="truncate">Copiar PIX</span>
                                  </Button>
                                )}
                              </div>
                              {buttonsComp?.buttons && buttonsComp.buttons.length > 0 && (
                                <div className="space-y-1.5">
                                  {buttonsComp.buttons.map((btn: any, idx: number) => (
                                    <div key={idx} className="bg-primary/5 p-2 rounded-lg text-[10px] text-center text-primary font-bold border border-primary/10">
                                      {btn.text}
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              <div className="mt-4 pt-4 border-t space-y-2">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                  <Bot className="w-3 h-3" /> Instruções para o Agente IA
                                </Label>
                                <Textarea 
                                  placeholder="Explique quando a IA deve usar este template ou o que os botões fazem..."
                                  className="text-xs min-h-[60px] resize-none bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                                  defaultValue={template.knowledge_description || ''}
                                  onBlur={(e) => {
                                    if (e.target.value !== (template.knowledge_description || '')) {
                                      handleUpdateTemplateKnowledge(template.id, e.target.value);
                                    }
                                  }}
                                />
                                {updatingKnowledge === template.id && (
                                  <div className="text-[9px] text-primary animate-pulse flex items-center gap-1">
                                    <RefreshCcw className="w-2 h-2 animate-spin" /> Salvando...
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    ) : (
                      <div className="col-span-full py-20 text-center bg-card rounded-2xl border-2 border-dashed border-muted flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                          <FileText className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="font-bold text-lg">Sem templates sincronizados</h3>
                        <p className="text-sm text-muted-foreground">Clique em "Sincronizar Meta" para carregar seus templates oficiais.</p>
                        <Button variant="outline" size="sm" onClick={syncTemplates} disabled={syncingTemplates}>Sincronizar agora</Button>
                      </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

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
              </ScrollArea>
            )}

            {activeTab === 'contact-list' && (
              <ScrollArea className="flex-1 p-3 sm:p-4 md:p-8 bg-muted/5">
                <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-20">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-card p-4 md:p-6 rounded-2xl border shadow-sm gap-6">
                    <div className="w-full lg:w-auto">
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight">Lista de Contatos</h2>
                      <p className="text-muted-foreground text-xs md:text-sm">Gerencie todos os seus contatos salvos e importados.</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-4 items-stretch sm:items-center">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-3 py-3 md:px-4 md:py-2 bg-primary/5 rounded-2xl border border-primary/20 shadow-sm flex-1 lg:flex-none">
                        <div className="flex items-center justify-between sm:justify-start gap-3 sm:pr-4 sm:border-r border-primary/10">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase text-primary leading-none mb-1">Google Contatos</span>
                              <div className="flex items-center gap-2">
                                <Switch 
                                  id="google-sync-list" 
                                  checked={metaSettings.google_auto_sync} 
                                  onCheckedChange={async (checked) => {
                                    setMetaSettings(prev => ({ ...prev, google_auto_sync: checked }));
                                    const { id, created_at, updated_at, webhook_verify_token, vps_status, ...rest } = metaSettings;
                                    await supabase.from('crm_settings').upsert({
                                      ...rest,
                                      google_auto_sync: checked,
                                      id: '00000000-0000-0000-0000-000000000001',
                                      updated_at: new Date().toISOString()
                                    });
                                    toast({ title: checked ? "Sincronização automática ativada" : "Sincronização automática desativada" });
                                  }}
                                />
                                <Label htmlFor="google-sync-list" className="text-[11px] font-bold cursor-pointer whitespace-nowrap">Sincronizar automático</Label>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="default" 
                          size="sm"
                          className={cn(
                            "h-9 text-[10px] md:text-xs font-bold rounded-xl px-5 shadow-sm w-full sm:w-auto",
                            googleContactsEnabled ? "bg-white text-primary border border-primary/20 hover:bg-primary/5" : "bg-primary/90 text-white"
                          )}
                          onClick={handleSyncGoogleContacts}
                        >
                          <RefreshCcw className={cn("w-3.5 h-3.5 mr-2", googleContactsEnabled && "animate-spin-slow")} />
                          {googleContactsEnabled ? 'SINCRONIZAR AGORA' : 'CONECTAR GOOGLE'}
                        </Button>
                      </div>
                      
                      <div className="flex flex-row gap-2 w-full sm:w-auto">
                        <Button variant="outline" onClick={() => setIsImportExportOpen(true)} className="h-10 md:h-11 rounded-xl text-[11px] md:text-xs flex-1 sm:flex-none sm:px-4">
                          <FileUp className="w-4 h-4 sm:mr-2 flex-shrink-0" /> <span className="hidden xs:inline">Importar/Exportar</span><span className="xs:hidden">Imp/Exp</span>
                        </Button>
                        <Button onClick={() => { setContactToView({ name: '', wa_id: '', metadata: {} }); setIsContactInfoOpen(true); }} className="bg-primary h-10 md:h-11 rounded-xl shadow-lg shadow-primary/20 text-[11px] md:text-xs flex-1 sm:flex-none sm:px-4">
                          <UserPlus className="w-4 h-4 sm:mr-2 flex-shrink-0" /> <span className="hidden xs:inline">Novo Contato</span><span className="xs:hidden">Novo</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-muted/30 flex flex-col md:flex-row gap-4 items-center justify-between">
                      <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          placeholder="Pesquisar por nome ou número..." 
                          className="pl-9 bg-background h-10 rounded-xl"
                          value={statusFilter === 'all' ? '' : statusFilter}
                          onChange={e => setStatusFilter(e.target.value || 'all')}
                        />
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Filtrar Origem:</span>
                        <div className="flex bg-muted p-1 rounded-lg w-full sm:w-auto">
                          <Button 
                            variant={sourceFilter === 'all' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="text-[9px] h-7 px-3 flex-1 sm:flex-none"
                            onClick={() => setSourceFilter('all')}
                          >
                            Todos
                          </Button>
                          <Button 
                            variant={sourceFilter === 'system' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="text-[9px] h-7 px-3 flex-1 sm:flex-none"
                            onClick={() => setSourceFilter('system')}
                          >
                            Sistema
                          </Button>
                          <Button 
                            variant={sourceFilter === 'imported' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="text-[9px] h-7 px-3 flex-1 sm:flex-none"
                            onClick={() => setSourceFilter('imported')}
                          >
                            Importados
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto w-full">
                      {/* Mobile view of contacts as cards */}
                      <div className="md:hidden divide-y divide-border">
                        {(() => {
                          const filtered = contacts.filter(c => {
                            const matchesSearch = statusFilter === 'all' || 
                              c.name?.toLowerCase().includes(statusFilter.toLowerCase()) || 
                              c.wa_id?.includes(statusFilter);
                            const matchesSource = sourceFilter === 'all' || c.source_type === sourceFilter;
                            return matchesSearch && matchesSource;
                          });
                          
                          const isSearching = statusFilter !== 'all';
                          const displayContacts = (showAllContacts || isSearching) ? filtered : filtered.slice(0, 10);

                          if (displayContacts.length === 0) {
                            return (
                              <div className="p-12 text-center text-muted-foreground italic text-xs">
                                Nenhum contato encontrado.
                              </div>
                            );
                          }

                          return (
                            <>
                              {displayContacts.map((contact) => (
                                <div key={contact.id} className="p-4 flex flex-col gap-4 bg-card/50 hover:bg-card transition-colors">
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                                        {contact.name?.charAt(0).toUpperCase() || <User className="w-5 h-5" />}
                                      </div>
                                      <div className="flex flex-col overflow-hidden">
                                        <span className="font-bold text-sm truncate">{contact.name || 'Sem nome'}</span>
                                        <span className="text-xs text-muted-foreground font-mono truncate">{contact.wa_id}</span>
                                      </div>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => { openChat(contact); setActiveTab('contacts'); }}>
                                        <MessageSquare className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => openContactInfo(contact)}>
                                        <Settings className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                    <div className="flex gap-1.5 flex-wrap">
                                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 uppercase font-bold tracking-tight">
                                        {contact.source_type === 'imported' ? 'Importado' : 'Sistema'}
                                      </Badge>
                                      <Badge variant="outline" className={cn("capitalize text-[9px] px-1.5 py-0 font-bold", getStatusColor(contact.status))}>
                                        {contact.status}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
                                      <Clock className="w-3 h-3" />
                                      <span>{contact.last_interaction ? new Date(contact.last_interaction).toLocaleDateString() : 'Nunca'}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {filtered.length > 10 && !showAllContacts && !isSearching && (
                                <div className="p-6 bg-muted/5 flex justify-center border-t">
                                  <Button variant="outline" size="sm" onClick={() => setShowAllContacts(true)} className="text-xs font-bold text-primary rounded-xl px-8 h-9 border-primary/20 hover:bg-primary/5">
                                    Ver Todos os {filtered.length} Contatos
                                  </Button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      {/* Desktop view of contacts as table */}
                      <table className="hidden md:table w-full text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground tracking-wider border-b">
                            <th className="px-6 py-4">Nome</th>
                            <th className="px-6 py-4">WhatsApp</th>
                            <th className="px-6 py-4">Origem</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Última Interação</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(() => {
                            const filtered = contacts.filter(c => {
                              const matchesSearch = statusFilter === 'all' || 
                                c.name?.toLowerCase().includes(statusFilter.toLowerCase()) || 
                                c.wa_id?.includes(statusFilter);
                              const matchesSource = sourceFilter === 'all' || c.source_type === sourceFilter;
                              return matchesSearch && matchesSource;
                            });
                            
                            const totalFiltered = filtered.length;
                            const isSearching = statusFilter !== 'all';
                            const displayContacts = (showAllContacts || isSearching) ? filtered : filtered.slice(0, 10);

                            return (
                              <>
                                {displayContacts.map((contact) => (
                                  <tr key={contact.id} className="hover:bg-muted/30 transition-colors group">
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                          {contact.name?.charAt(0) || <User className="w-4 h-4" />}
                                        </div>
                                        <span className="font-semibold text-sm">{contact.name || 'Sem nome'}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground font-mono">{contact.wa_id}</td>
                                    <td className="px-6 py-4">
                                      <Badge variant="secondary" className="text-[9px] uppercase font-bold">
                                        {contact.source_type === 'imported' ? 'Importado' : 'Sistema'}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                      <Badge variant="outline" className={cn("capitalize text-[10px]", getStatusColor(contact.status))}>
                                        {contact.status}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-[11px] text-muted-foreground">
                                      {contact.last_interaction ? new Date(contact.last_interaction).toLocaleString() : 'Nunca'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { openChat(contact); setActiveTab('contacts'); }}>
                                          <MessageSquare className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openContactInfo(contact)}>
                                          <Settings className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                                          if (confirm('Excluir este contato?')) {
                                            await supabase.from('crm_contacts').delete().eq('id', contact.id);
                                            fetchContacts();
                                          }
                                        }}>
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                                
                                {totalFiltered > 10 && !showAllContacts && !isSearching && (
                                  <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center bg-muted/5">
                                      <div className="flex flex-col items-center gap-3">
                                        <p className="text-sm text-muted-foreground">
                                          Mostrando 10 de <strong>{totalFiltered}</strong> contatos
                                        </p>
                                        <Button 
                                          variant="outline" 
                                          onClick={() => setShowAllContacts(true)}
                                          className="font-bold"
                                        >
                                          <Eye className="w-4 h-4 mr-2" /> Ver Todos os Contatos
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                                
                                {totalFiltered === 0 && (
                                  <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground italic text-sm">
                                      Nenhum contato encontrado. Importe uma lista vCard ou CSV para começar.
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'settings' && (
              <ScrollArea className="flex-1 p-3 sm:p-4 md:p-8 bg-muted/5">
                <div className="max-w-4xl mx-auto space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                  <div>
                    <h2 className="text-xl md:text-3xl font-bold tracking-tight text-primary">Configurações</h2>
                    <p className="text-muted-foreground text-xs md:text-sm font-medium">Gerencie as integrações e chaves de API do seu CRM.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                    <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-md transition-shadow bg-card">
                      <CardHeader className="bg-muted/30 border-b">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary"><MessageSquare className="w-5 h-5" /></div>
                          <div>
                            <CardTitle className="text-lg">WhatsApp API</CardTitle>
                            <CardDescription className="text-[11px]">Conecte com a plataforma Business da Meta.</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 md:p-6 space-y-5">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Access Token Permanente</Label>
                          <Input type="password" placeholder="EAA..." className="bg-muted/30 border-none h-11 rounded-xl" value={metaSettings.meta_access_token} onChange={e => setMetaSettings({...metaSettings, meta_access_token: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number ID</Label>
                          <Input placeholder="Ex: 109..." className="bg-muted/30 border-none h-11 rounded-xl" value={metaSettings.meta_phone_number_id} onChange={e => setMetaSettings({...metaSettings, meta_phone_number_id: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Business Account ID (WABA)</Label>
                          <Input placeholder="Ex: 105..." className="bg-muted/30 border-none h-11 rounded-xl" value={metaSettings.meta_waba_id} onChange={e => setMetaSettings({...metaSettings, meta_waba_id: e.target.value})} />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-md transition-shadow bg-card h-fit">
                      <CardHeader className="bg-muted/30 border-b">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            metaSettings.vps_status === 'online' ? "bg-green-100 text-green-600" : 
                            metaSettings.vps_status === 'offline' ? "bg-red-100 text-red-600" : 
                            "bg-primary/10 text-primary"
                          )}>
                            <RefreshCcw className={cn("w-5 h-5", metaSettings.vps_status === 'unknown' && "animate-spin")} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">Transcoder Profissional (VPS)</CardTitle>
                            <CardDescription className="text-[11px]">Conversão de áudio profissional para PTT (Gravado na hora).</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 md:p-6 space-y-5">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL do Transcoder (VPS)</Label>
                            <div className="flex gap-2">
                              <Input 
                                placeholder="http://seu-ip-vps:3000" 
                                className="bg-muted/30 border-none h-11 rounded-xl flex-1" 
                                value={metaSettings.vps_transcoder_url || ''} 
                                onChange={e => setMetaSettings({...metaSettings, vps_transcoder_url: e.target.value})} 
                              />
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-11 rounded-xl px-4 font-bold text-xs"
                                onClick={async () => {
                                  if (!metaSettings.vps_transcoder_url) {
                                    toast({ title: "Digite a URL primeiro", variant: "destructive" });
                                    return;
                                  }
                                  try {
                                    const url = metaSettings.vps_transcoder_url.replace(/\/$/, '');
                                    // Use no-cors for the test to avoid preflight issues if the server isn't fully CORS-ready
                                    // even if it won't let us read the JSON, getting a successful response (opaque) is a sign of life
                                    await fetch(url, { method: 'GET', mode: 'no-cors' });
                                    toast({ title: "Sinal detectado!", description: "A URL respondeu. Agora você pode SALVAR as configurações." });
                                  } catch (err: any) {
                                    toast({ 
                                      title: "Falha na Conexão", 
                                      description: "Não foi possível alcançar o VPS. Verifique se o servidor está rodando.",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                TESTAR
                              </Button>
                            </div>
                          </div>
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                            <p className="text-[10px] text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                              <strong>Dica Profissional:</strong> O VPS converte áudios para o formato nativo do WhatsApp (OGG Opus). Isso garante o microfone azul (gravado na hora).
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-md transition-shadow bg-card h-fit">
                      <CardHeader className="bg-muted/30 border-b">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary"><Bot className="w-5 h-5" /></div>
                          <div>
                            <CardTitle className="text-lg">Configurações de IA</CardTitle>
                            <CardDescription className="text-[11px]">Chave de API e configurações globais.</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 md:p-6 space-y-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">OpenAI API Key</Label>
                          <Input type="password" placeholder="sk-..." className="bg-muted/30 border-none h-11 rounded-xl" value={metaSettings.openai_api_key} onChange={e => setMetaSettings({...metaSettings, openai_api_key: e.target.value})} />
                          <p className="text-[10px] text-muted-foreground">A ativação geral do robô deve ser feita na aba <strong>Agente IA</strong>.</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-md transition-shadow bg-card">
                      <CardHeader className="bg-muted/30 border-b">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary"><Users className="w-5 h-5" /></div>
                          <div>
                            <CardTitle className="text-lg">Google Contatos</CardTitle>
                            <CardDescription className="text-[11px]">Sincronize seus contatos do Google em tempo real.</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 md:p-6 space-y-5">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Google Client ID</Label>
                          <Input 
                            placeholder="Seu Google Client ID" 
                            className="bg-muted/30 border-none h-11 rounded-xl" 
                            value={metaSettings.google_client_id || ''} 
                            onChange={e => setMetaSettings({...metaSettings, google_client_id: e.target.value})} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Google Client Secret</Label>
                          <Input 
                            type="password"
                            placeholder="Seu Google Client Secret" 
                            className="bg-muted/30 border-none h-11 rounded-xl" 
                            value={metaSettings.google_client_secret || ''} 
                            onChange={e => setMetaSettings({...metaSettings, google_client_secret: e.target.value})} 
                          />
                        </div>
                        <div className="flex flex-col gap-3 pt-2">
                          <Button 
                            variant="default" 
                            className="w-full h-11 rounded-xl font-bold bg-primary hover:scale-[1.02] transition-transform"
                            onClick={handleSaveSettings}
                            disabled={saving}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? 'Salvando...' : 'Salvar Dados do Google'}
                          </Button>
                          
                          {metaSettings.google_client_id && (
                            <div className="pt-4 border-t border-muted-foreground/10 space-y-3">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase text-center">Integração do Navegador</p>
                              <Button 
                                variant={googleContactsEnabled ? "outline" : "secondary"} 
                                className="w-full h-11 rounded-xl font-bold border-primary/20"
                                onClick={() => {
                                  const redirectUri = encodeURIComponent(window.location.origin + '/google-callback');
                                  const scope = encodeURIComponent('https://www.googleapis.com/auth/contacts');
                                  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${metaSettings.google_client_id}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
                                  window.location.href = url;
                                }}
                              >
                                <Users className="w-4 h-4 mr-2" />
                                {googleContactsEnabled ? 'Reconectar Navegador' : 'Conectar Navegador'}
                              </Button>
                              
                              {googleContactsEnabled && (
                                <Button 
                                  variant="ghost" 
                                  className="w-full h-11 rounded-xl font-bold text-destructive hover:bg-destructive/5"
                                  onClick={() => {
                                    localStorage.removeItem('google_contacts_connected');
                                    localStorage.removeItem('google_contacts_auth_code');
                                    setGoogleContactsEnabled(false);
                                    toast({ title: "Desconectado", description: "Conexão do navegador removida" });
                                  }}
                                >
                                  Desconectar Navegador
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                          * URL de redirecionamento autorizada: <code className="text-primary font-bold">{window.location.origin}/google-callback</code>
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-md transition-shadow bg-card">

                      <CardHeader className="bg-muted/30 border-b">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary"><Zap className="w-5 h-5" /></div>
                          <div>
                            <CardTitle className="text-lg">Customização da Interface</CardTitle>
                            <CardDescription className="text-[11px]">Ajuste o tamanho dos botões e etiquetas.</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 md:p-6 space-y-8">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tamanho dos Atalhos (Modelos/Fluxos)</Label>
                            <Badge variant="secondary" className="text-[10px]">{metaSettings.shortcut_size}%</Badge>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] text-muted-foreground">Menor</span>
                            <input 
                              type="range" 
                              min="70" 
                              max="150" 
                              step="5"
                              value={metaSettings.shortcut_size || 100} 
                              onChange={e => setMetaSettings({...metaSettings, shortcut_size: parseInt(e.target.value)})}
                              className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <span className="text-[10px] text-muted-foreground">Maior</span>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" style={{ height: `${20 * ((metaSettings.shortcut_size || 100) / 100)}px`, fontSize: `${9 * ((metaSettings.shortcut_size || 100) / 100)}px` }} className="px-2 rounded-md border-primary/20 bg-primary/5 text-primary pointer-events-none">Exemplo Atalho</Button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tamanho das Etiquetas (Status/Filtros)</Label>
                            <Badge variant="secondary" className="text-[10px]">{metaSettings.tag_size}%</Badge>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] text-muted-foreground">Menor</span>
                            <input 
                              type="range" 
                              min="70" 
                              max="150" 
                              step="5"
                              value={metaSettings.tag_size || 100} 
                              onChange={e => setMetaSettings({...metaSettings, tag_size: parseInt(e.target.value)})}
                              className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <span className="text-[10px] text-muted-foreground">Maior</span>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" style={{ height: `${14 * ((metaSettings.tag_size || 100) / 100)}px`, fontSize: `${8 * ((metaSettings.tag_size || 100) / 100)}px` }} className="px-1.2 font-bold pointer-events-none">Exemplo Etiqueta</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveSettings} disabled={saving} size="lg" className="px-10 h-14 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform">
                      {saving ? <RefreshCcw className="mr-3 h-5 w-5 animate-spin" /> : <Save className="mr-3 h-5 w-5" />}
                      Salvar Configurações
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'webhooks' && (
              <ScrollArea className="flex-1 p-8 bg-muted/5">
                <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col md:flex-row justify-between md:items-center bg-card p-6 rounded-2xl border shadow-sm gap-4">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">Webhooks (API Externa)</h2>
                      <p className="text-muted-foreground text-sm">Conecte sites externos para enviar mensagens automáticas.</p>
                    </div>
                    <Button onClick={() => setIsNewWebhookDialogOpen(true)} className="h-10 bg-primary shadow-lg shadow-primary/20">
                      <Plus className="w-4 h-4 mr-2" /> Novo Webhook
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {webhooks.length === 0 ? (
                      <Card className="p-12 text-center border-dashed border-2 bg-muted/20 rounded-2xl">
                        <Webhook className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                        <h3 className="text-lg font-medium">Nenhum webhook criado</h3>
                        <p className="text-sm text-muted-foreground">Crie um webhook para integrar seu site ou sistema externo.</p>
                      </Card>
                    ) : (
                      webhooks.map((webhook) => (
                        <Card key={webhook.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/10">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <Webhook className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-lg font-bold">{webhook.name}</CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant={webhook.is_active ? "default" : "secondary"} className="text-[10px]">
                                    {webhook.is_active ? "Ativo" : "Inativo"}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground font-mono">ID: {webhook.id}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch 
                                checked={webhook.is_active} 
                                onCheckedChange={() => toggleWebhookStatus(webhook.id, webhook.is_active)} 
                              />
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => {
                                if(confirm("Deseja excluir este webhook?")) handleDeleteWebhook(webhook.id);
                              }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-4">
                                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Configurações de Resposta</h4>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="p-3 bg-muted/30 rounded-xl border">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Tipo</Label>
                                    <p className="text-sm font-semibold capitalize">{webhook.response_type === 'text' ? 'Texto' : 'Template'}</p>
                                  </div>
                                  <div className="p-3 bg-muted/30 rounded-xl border">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Etapa Kanban</Label>
                                    <p className="text-sm font-semibold capitalize text-primary">{webhook.default_status || 'Novo'}</p>
                                  </div>
                                  {webhook.response_type === 'template' && (
                                    <div className="p-3 bg-muted/30 rounded-xl border">
                                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Template</Label>
                                      <p className="text-sm font-semibold truncate">{templates.find(t => t.id === webhook.template_id)?.name || 'N/A'}</p>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold uppercase text-muted-foreground">URL do Webhook (POST)</Label>
                                  <div className="flex gap-2">
                                    <Input 
                                      readOnly 
                                      value={`https://adljdeekwifwcdcgbpit.supabase.co/functions/v1/crm-webhook`} 
                                      className="font-mono text-[10px] bg-muted/50 rounded-xl"
                                    />
                                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => {
                                      navigator.clipboard.writeText(`https://adljdeekwifwcdcgbpit.supabase.co/functions/v1/crm-webhook`);
                                      toast({ title: "URL copiada!" });
                                    }}>
                                      <Paperclip className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground italic">* Esta URL recebe os dados do seu site para disparar o WhatsApp.</p>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs font-bold uppercase text-muted-foreground">Token de Autenticação</Label>
                                  <div className="flex gap-2">
                                    <Input 
                                      readOnly 
                                      type="password"
                                      value={webhook.secret_token} 
                                      className="font-mono text-[10px] bg-muted/50 rounded-xl"
                                    />
                                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => {
                                      navigator.clipboard.writeText(webhook.secret_token);
                                      toast({ title: "Token copiado!" });
                                    }}>
                                      <Paperclip className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-zinc-950 rounded-2xl p-6 text-zinc-300 overflow-hidden relative border border-white/5 shadow-2xl">
                                <div className="absolute top-4 right-4 text-zinc-700 font-mono text-[10px] tracking-widest">API DOCS</div>
                                <h4 className="text-primary font-bold text-sm mb-4 flex items-center gap-2">
                                  <Play className="w-3 h-3 fill-current" /> Guia de Integração
                                </h4>
                                <div className="space-y-4 font-mono text-[11px]">
                                  <p className="text-zinc-500">// Exemplo de requisição no seu site</p>
                                  <div className="bg-black/50 p-4 rounded-xl border border-white/5 overflow-x-auto whitespace-pre text-emerald-400">
{`fetch("https://adljdeekwifwcdcgbpit.supabase.co/functions/v1/crm-webhook", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    webhook_id: "${webhook.id}",
    token: "${webhook.secret_token}",
    to: "5511999999999",
    message: "Olá, seu acesso ao produto foi liberado!"
  })
});`}
                                  </div>
                                  <div className="space-y-2 pt-2 border-t border-white/5 text-zinc-400 font-sans">
                                    <p className="italic text-[10px]">
                                      <strong className="text-zinc-200">Parâmetros:</strong><br/>
                                      - <code className="text-primary">to</code>: Número do cliente (DDI+DDD+Número)<br/>
                                      - <code className="text-primary">message</code>: Conteúdo da mensagem (se tipo Texto)<br/>
                                      - <code className="text-primary">variables</code>: [Array] Valores para as variáveis do template (se tipo Template)
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>

                <Dialog open={isNewWebhookDialogOpen} onOpenChange={setIsNewWebhookDialogOpen}>
                  <DialogContent className="sm:max-w-[500px] rounded-3xl border-none shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-2xl font-black">
                        <Webhook className="w-6 h-6 text-primary" /> Novo Webhook
                      </DialogTitle>
                      <DialogDescription className="text-base">
                        Crie um ponto de entrada para disparar mensagens do seu site.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="space-y-2">
                        <Label className="font-bold">Nome de Identificação</Label>
                        <Input 
                          placeholder="Ex: Checkout - Produto A" 
                          value={newWebhook.name}
                          onChange={e => setNewWebhook({...newWebhook, name: e.target.value})}
                          className="rounded-2xl h-12"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="font-bold">Tipo da Mensagem</Label>
                          <Select 
                            value={newWebhook.response_type} 
                            onValueChange={(val: any) => setNewWebhook({...newWebhook, response_type: val, template_id: val === 'text' ? '' : newWebhook.template_id})}
                          >
                            <SelectTrigger className="rounded-2xl h-12">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-xl">
                              <SelectItem value="text" className="rounded-xl">Texto Livre</SelectItem>
                              <SelectItem value="template" className="rounded-xl">Template Meta</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold">Etapa Kanban</Label>
                          <Select 
                            value={newWebhook.default_status} 
                            onValueChange={(val: any) => setNewWebhook({...newWebhook, default_status: val})}
                          >
                            <SelectTrigger className="rounded-2xl h-12">
                              <SelectValue placeholder="Selecione a etapa" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-xl">
                              <SelectItem value="new" className="rounded-xl">Novo</SelectItem>
                              <SelectItem value="responded" className="rounded-xl">Respondido</SelectItem>
                              <SelectItem value="qualified" className="rounded-xl">Qualificado</SelectItem>
                              <SelectItem value="human" className="rounded-xl">+ Humano</SelectItem>
                              <SelectItem value="closed" className="rounded-xl">Vendido</SelectItem>
                              <SelectItem value="lost" className="rounded-xl">Perdido</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {newWebhook.response_type === 'template' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          <Label className="font-bold">Template Vinculado</Label>
                          <Select 
                            value={newWebhook.template_id} 
                            onValueChange={val => setNewWebhook({...newWebhook, template_id: val})}
                          >
                            <SelectTrigger className="rounded-2xl h-12">
                              <SelectValue placeholder="Selecione um template aprovado" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-xl">
                              {templates.filter(t => t.status === 'APPROVED').map(t => (
                                <SelectItem key={t.id} value={t.id} className="rounded-xl">{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button variant="ghost" onClick={() => setIsNewWebhookDialogOpen(false)} className="rounded-2xl h-12 px-6">Cancelar</Button>
                      <Button onClick={handleCreateWebhook} disabled={saving || !newWebhook.name} className="rounded-2xl h-12 px-8 bg-primary shadow-lg shadow-primary/20 font-bold">
                        {saving ? <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                        Salvar Webhook
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </ScrollArea>
            )}
            {activeTab === 'ai-analysis' && (
              <ScrollArea className="flex-1 p-3 sm:p-4 md:p-8 bg-muted/5">
                <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-card p-4 md:p-6 rounded-2xl border shadow-sm">
                    <div className="min-w-0">
                      <h2 className="text-lg md:text-2xl font-bold tracking-tight flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-indigo-600 shrink-0" /> <span>Histórico Global de Análises IA</span>
                      </h2>
                      <p className="text-muted-foreground text-xs md:text-sm">Registro cronológico de todas as estratégias e análises geradas.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {(() => {
                      // Create a flattened, sorted list of all analyses from all contacts
                      const allAnalyses = contacts.flatMap(contact => 
                        (contact.ai_strategy_history || []).map((analysis: any) => ({
                          ...analysis,
                          contactId: contact.id,
                          contactName: contact.name || contact.wa_id,
                          waId: contact.wa_id,
                          contactStatus: contact.status,
                          contactObj: contact
                        }))
                      ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                      if (allAnalyses.length === 0) {
                        return (
                          <div className="col-span-full py-20 text-center bg-card rounded-3xl border-2 border-dashed">
                            <Zap className="w-12 h-12 mx-auto mb-4 opacity-10" />
                            <p className="font-bold text-muted-foreground">Nenhuma análise foi gerada ainda.</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Gere análises diretamente nas conversas com os clientes.</p>
                          </div>
                        );
                      }

                      return allAnalyses.map((item, i) => (
                        <Card key={`${item.contactId}-${i}`} className="rounded-2xl border shadow-sm overflow-hidden flex flex-col h-[280px] hover:shadow-md transition-all group">
                          <CardHeader className="bg-muted/30 border-b p-4">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <User className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <CardTitle className="text-xs font-bold truncate">{item.contactName}</CardTitle>
                                  <p className="text-[9px] text-muted-foreground">{item.waId}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[8px] uppercase px-1.5 h-4 shrink-0">
                                {item.type || 'Estratégia'}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent 
                            className="p-4 flex-1 cursor-pointer overflow-hidden relative"
                            onClick={() => setSelectedAnalysis(item)}
                          >
                            <p className="text-xs leading-relaxed text-zinc-600 italic line-clamp-6">
                              {item.strategy}
                            </p>
                            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                          </CardContent>
                          <div className="p-3 bg-muted/10 border-t flex items-center justify-between gap-2">
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {new Date(item.created_at).toLocaleDateString('pt-BR')} {new Date(item.created_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                            </span>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-[9px] font-bold h-7 px-2 gap-1 hover:bg-primary/10"
                                onClick={() => {
                                  setSelectedContact(item.contactObj);
                                  setActiveTab('contacts');
                                }}
                              >
                                <MessageSquare className="w-3 h-3" /> Chat
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-[9px] font-bold h-7 px-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                onClick={() => setSelectedAnalysis(item)}
                              >
                                <Eye className="w-3 h-3" /> Ver
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ));
                    })()}
                  </div>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'help' && (
              <ScrollArea className="flex-1 p-3 sm:p-4 md:p-8 bg-muted/5">
                <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                  <div className="flex items-center gap-4 bg-card p-6 rounded-2xl border shadow-sm">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                      <LucideIcons.HelpCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">Centro de Ajuda e Tutoriais</h2>
                      <p className="text-muted-foreground">Guia completo para dominar todas as ferramentas do seu CRM.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <Card className="rounded-2xl border shadow-sm overflow-hidden">
                      <CardHeader className="bg-primary/5 border-b">
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-primary" /> Dashboard e Métricas
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h4 className="font-bold text-sm text-primary">Métricas Gerais</h4>
                            <ul className="text-xs space-y-2 text-muted-foreground list-disc pl-4">
                              <li><strong>Mensagens Enviadas:</strong> Total de mensagens que saíram do seu número.</li>
                              <li><strong>Respondidas:</strong> Contatos que enviaram ao menos uma mensagem de volta.</li>
                              <li><strong>Contatos Qualificados:</strong> Leads marcados com a etiqueta "Qualificado".</li>
                              <li><strong>Conversas 24h (Hoje):</strong> Volume de interações únicas nas últimas 24 horas.</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-bold text-sm text-primary">Custos e Janelas</h4>
                            <ul className="text-xs space-y-2 text-muted-foreground list-disc pl-4">
                              <li><strong>Conversas Pagas:</strong> Cobrança da Meta quando você inicia uma conversa fora da janela de 24h.</li>
                              <li><strong>Janela Grátis:</strong> Período de 24h após a última mensagem do cliente onde você não paga por envios.</li>
                              <li><strong>Resumo Semanal:</strong> Comparativo de performance dos últimos 7 dias.</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border shadow-sm overflow-hidden">
                      <CardHeader className="bg-emerald-500/5 border-b">
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-emerald-500" /> CRM Kanban e Conversas
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <p className="text-sm text-muted-foreground">O coração do seu atendimento. Organize leads por funil de vendas.</p>
                        <div className="space-y-3">
                          <div className="p-3 bg-muted/30 rounded-xl">
                            <h4 className="text-xs font-bold mb-1">Visualização Kanban</h4>
                            <p className="text-[11px] text-muted-foreground">Arraste e solte contatos entre as colunas (Novo Lead, Em Atendimento, Qualificado, etc.) para gerenciar seu progresso.</p>
                          </div>
                          <div className="p-3 bg-muted/30 rounded-xl">
                            <h4 className="text-xs font-bold mb-1">Chat em Tempo Real</h4>
                            <p className="text-[11px] text-muted-foreground">Envie textos, áudios (com transcrição), imagens e vídeos. O sistema detecta se o áudio foi "gravado na hora" para maior autoridade.</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border shadow-sm overflow-hidden">
                      <CardHeader className="bg-blue-500/5 border-b">
                        <CardTitle className="flex items-center gap-2">
                          <GitBranch className="w-5 h-5 text-blue-500" /> Fluxos e Gatilhos (Automação)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-bold text-sm">O que são Fluxos?</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                              Sequências lógicas de mensagens, perguntas e ações. Você pode criar caminhos onde o cliente clica em botões e o sistema responde automaticamente.
                            </p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border p-3 rounded-xl">
                              <h5 className="text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> Gatilhos (Triggers)</h5>
                              <p className="text-[10px] text-muted-foreground mt-1">Palavras-chave, primeira mensagem ou inatividade. Eles disparam o fluxo sozinho.</p>
                            </div>
                            <div className="border p-3 rounded-xl">
                              <h5 className="text-[11px] font-bold flex items-center gap-1"><UserPlus className="w-3 h-3" /> Etiqueta Automática</h5>
                              <p className="text-[10px] text-muted-foreground mt-1">Configure o fluxo para colocar o contato em uma etiqueta (Ex: "Interesse Produto X") logo no início.</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border shadow-sm overflow-hidden">
                      <CardHeader className="bg-purple-500/5 border-b">
                        <CardTitle className="flex items-center gap-2">
                          <Bot className="w-5 h-5 text-purple-500" /> Agente IA e Análises
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-purple-100 text-purple-600"><Bot className="w-4 h-4" /></div>
                            <div>
                              <h5 className="text-xs font-bold">Assistente Inteligente</h5>
                              <p className="text-[11px] text-muted-foreground">Responde seus clientes usando o conhecimento dos seus templates e fluxos. Pode ser ativado individualmente por contato.</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600"><TrendingUp className="w-4 h-4" /></div>
                            <div>
                              <h5 className="text-xs font-bold">Análises Estratégicas</h5>
                              <p className="text-[11px] text-muted-foreground">A IA analisa o histórico completo e diz se o cliente tem interesse, o que faltou oferecer e qual a melhor estratégia de venda para fechar o negócio.</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border shadow-sm overflow-hidden">
                      <CardHeader className="bg-orange-500/5 border-b">
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="w-5 h-5 text-orange-500" /> Disparador e Agendamentos
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <h4 className="font-bold text-sm">Disparador em Massa</h4>
                            <p className="text-xs text-muted-foreground">Envie uma mensagem ou inicie um fluxo para centenas de contatos filtrados por etiqueta de uma só vez.</p>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-bold text-sm">Agendamentos</h4>
                            <p className="text-xs text-muted-foreground">Programe mensagens para datas e horários específicos. Ideal para lembretes de reuniões ou follow-ups futuros.</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border shadow-sm overflow-hidden">
                      <CardHeader className="bg-zinc-500/5 border-b">
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-zinc-600" /> Contatos e Google
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                          <h4 className="font-bold text-sm">Sincronização Google</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Conecte sua conta Google para importar milhares de contatos. O sistema processa em segundo plano e filtra apenas números válidos para WhatsApp. Você também pode ativar a sincronização automática para novos leads.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </ScrollArea>
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
      {previewMedia && (
        <MediaPopup 
          url={previewMedia.url} 
          type={previewMedia.type} 
          onClose={() => setPreviewMedia(null)} 
        />
      )}

      <Dialog open={isSyncingContacts} onOpenChange={setIsSyncingContacts}>
        <DialogContent className="sm:max-w-md text-center py-10">
          <DialogHeader className="items-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <RefreshCcw className="w-8 h-8 text-primary animate-spin" />
            </div>
            <DialogTitle className="text-xl">Sincronizando Contatos</DialogTitle>
            <DialogDescription>
              Aguarde enquanto buscamos seus contatos do Google...
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <Progress value={syncProgress} className="h-2" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
              {syncProgress < 100 ? 'Sincronizando...' : 'Concluído!'}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isContactInfoOpen} onOpenChange={setIsContactInfoOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader className="items-center pb-4 border-b">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <User className="w-10 h-10 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold">{contactToView?.id ? 'Informações do Contato' : 'Novo Contato'}</DialogTitle>
            <DialogDescription>
              {contactToView?.id 
                ? `Visualize e edite os detalhes de ${contactToView?.name || contactToView?.wa_id}`
                : 'Adicione um novo contato manualmente à sua lista.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nome</Label>
                <Input 
                  value={contactToView?.name || ''} 
                  onChange={e => setContactToView({...contactToView, name: e.target.value})}
                  placeholder="Nome do contato"
                  className="bg-muted/30 border-none h-10 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">WhatsApp / ID</Label>
                <Input 
                  value={contactToView?.wa_id || ''} 
                  onChange={e => setContactToView({...contactToView, wa_id: e.target.value})}
                  readOnly={!!contactToView?.id}
                  placeholder="Ex: 5511999999999"
                  className={cn(
                    "bg-muted/30 border-none h-10 rounded-xl text-sm",
                    contactToView?.id && "opacity-70 cursor-not-allowed bg-muted/20"
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Biografia / Observações</Label>
              <Textarea 
                value={contactToView?.metadata?.bio || ''} 
                onChange={e => setContactToView({...contactToView, metadata: { ...contactToView?.metadata, bio: e.target.value }})}
                placeholder="Descreva informações importantes..."
                className="bg-muted/30 border-none rounded-xl min-h-[80px] text-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-2">
                  <Instagram className="w-3 h-3" /> Instagram
                </Label>
                <Input 
                  value={contactToView?.metadata?.instagram || ''} 
                  onChange={e => setContactToView({...contactToView, metadata: { ...contactToView?.metadata, instagram: e.target.value }})}
                  placeholder="@usuario ou link"
                  className="bg-muted/30 border-none h-10 rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-2">
                  <Facebook className="w-3 h-3" /> Facebook
                </Label>
                <Input 
                  value={contactToView?.metadata?.facebook || ''} 
                  onChange={e => setContactToView({...contactToView, metadata: { ...contactToView?.metadata, facebook: e.target.value }})}
                  placeholder="link da página"
                  className="bg-muted/30 border-none h-10 rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-2">
                  <LinkIcon className="w-3 h-3" /> Outros Links
                </Label>
                <Input 
                  value={contactToView?.metadata?.links || ''} 
                  onChange={e => setContactToView({...contactToView, metadata: { ...contactToView?.metadata, links: e.target.value }})}
                  placeholder="https://site.com"
                  className="bg-muted/30 border-none h-10 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsContactInfoOpen(false)} className="rounded-xl h-12 px-6">Fechar</Button>
            <Button 
              className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-primary/20"
              onClick={async () => {
                const { id, ...rest } = contactToView;
                if (id) {
                  await supabase.from('crm_contacts').update({ 
                    name: contactToView.name,
                    metadata: contactToView.metadata 
                  }).eq('id', id);
                } else {
                  const { error } = await supabase.from('crm_contacts').insert([{
                    name: contactToView.name,
                    wa_id: contactToView.wa_id,
                    metadata: contactToView.metadata,
                    status: 'new',
                    source_type: 'system'
                  }]);
                  if (error) {
                    toast({ title: "Erro ao criar contato", variant: "destructive" });
                    return;
                  }
                }
                toast({ title: id ? "Contato atualizado!" : "Contato criado!" });
                fetchContacts();
                if (selectedContact?.id === contactToView.id) {
                  setSelectedContact({ ...selectedContact, name: contactToView.name, metadata: contactToView.metadata });
                }
                setIsContactInfoOpen(false);
              }}
            >
              <Save className="w-4 h-4 mr-2" /> Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportExportOpen} onOpenChange={setIsImportExportOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileUp className="w-5 h-5 text-primary" /> Gerenciar Contatos
            </DialogTitle>
            <DialogDescription>Exporte sua lista atual ou importe novos contatos via CSV ou vCard.</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-4 py-6">
            <div className="p-4 rounded-2xl border-2 border-dashed border-muted bg-muted/5 flex flex-col items-center gap-4 text-center">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Exportar Lista</p>
                <p className="text-[10px] text-muted-foreground">Baixe todos os contatos para backups ou importação.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button variant="outline" size="sm" className="rounded-xl text-[11px]" onClick={() => handleExportContacts('csv')}>
                  <Download className="w-3 h-3 mr-1.5" /> CSV
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl text-[11px]" onClick={() => handleExportContacts('vcard')}>
                  <UserPlus className="w-3 h-3 mr-1.5" /> vCard
                </Button>
              </div>
            </div>

            <div className="p-6 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center gap-4 text-center">
              <div className="p-3 rounded-full bg-primary/20 text-primary">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold">Importar Lista</p>
                <p className="text-xs text-muted-foreground">Adicione contatos em massa enviando um arquivo CSV ou vCard.</p>
              </div>
              <Label htmlFor="import-file" className="w-full">
                <Button variant="default" className="w-full rounded-xl pointer-events-none">
                  Selecionar Arquivo
                </Button>
              </Label>
              <input 
                id="import-file" 
                type="file" 
                accept=".csv,.vcf,.vcard" 
                className="hidden" 
                onChange={(e) => {
                  handleImportContacts(e);
                  setIsImportExportOpen(false);
                }} 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsImportExportOpen(false)} className="w-full rounded-xl h-11">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSchedulingOpen} onOpenChange={setIsSchedulingOpen}>
        <DialogContent className="rounded-2xl border-none shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-primary" /> Agendar Mensagem
            </DialogTitle>
            <DialogDescription>
              Escolha quando e o que você deseja agendar para este contato.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input 
                  type="date" 
                  value={scheduleDate} 
                  onChange={(e) => setScheduleDate(e.target.value)} 
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input 
                  type="time" 
                  value={scheduleTime} 
                  onChange={(e) => setScheduleTime(e.target.value)} 
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Agendamento</Label>
              <Select value={scheduleType} onValueChange={(val: any) => { setScheduleType(val); setSelectedScheduleId(''); }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="message">Mensagem de Texto</SelectItem>
                  <SelectItem value="template">Template</SelectItem>
                  <SelectItem value="flow">Fluxo</SelectItem>
                </SelectContent>
              </Select>
            </div>


            {scheduleType === 'message' && (
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea 
                  placeholder="Digite o conteúdo da mensagem..." 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="rounded-xl min-h-[100px]"
                />
              </div>
            )}

            {scheduleType === 'template' && (
              <div className="space-y-2">
                <Label>Selecionar Template</Label>
                <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Escolha um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {scheduleType === 'flow' && (
              <div className="space-y-2">
                <Label>Selecionar Fluxo</Label>
                <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Escolha um fluxo" />
                  </SelectTrigger>
                  <SelectContent>
                    {flows.filter(f => f.is_active).map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSchedulingOpen(false)} className="rounded-xl h-11">Cancelar</Button>
            <Button 
              onClick={handleScheduleMessage} 
              disabled={isScheduling}
              className="rounded-xl h-11 bg-primary px-8 shadow-lg shadow-primary/20"
            >
              {isScheduling ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Agendar agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isMetricsListOpen} onOpenChange={setIsMetricsListOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {metricsListType === 'paid' && <><DollarSign className="w-5 h-5 text-orange-500" /> Conversas Pagas (Mês)</>}
              {metricsListType === 'active' && <><Clock className="w-5 h-5 text-emerald-500" /> Janela 24h Aberta (Grátis)</>}
              {metricsListType === 'weekly_paid' && <><DollarSign className="w-5 h-5 text-emerald-500" /> Pagas (Semanal)</>}
              {metricsListType === 'weekly_active' && <><Clock className="w-5 h-5 text-emerald-500" /> Ativas (Semanal)</>}
            </DialogTitle>
            <DialogDescription>
              {metricsListType === 'paid' && "Lista de contatos que iniciaram uma nova cobrança este mês."}
              {metricsListType === 'active' && "Contatos com janela de resposta gratuita ativa."}
              {metricsListType === 'weekly_paid' && "Contatos que geraram cobrança nos últimos 7 dias."}
              {metricsListType === 'weekly_active' && "Contatos únicos que interagiram na última semana."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {metricsListData.length > 0 ? metricsListData.map((contact) => (
                  <div 
                    key={contact.id} 
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedContact(contact);
                      setActiveTab('contacts');
                      setIsMetricsListOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{contact.name || contact.wa_id}</p>
                        <p className="text-[10px] text-muted-foreground">{contact.wa_id}</p>
                      </div>
                    </div>
                    <Badge className={cn("text-[10px] uppercase font-black", getStatusColor(contact.status))}>
                      {getStatusLabel(contact.status)}
                    </Badge>
                  </div>
                )) : (
                  <div className="text-center py-10 opacity-50">Nenhum contato encontrado.</div>
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsMetricsListOpen(false)} className="w-full rounded-xl">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedAnalysis} onOpenChange={(open) => !open && setSelectedAnalysis(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-3xl rounded-3xl p-6 border-none shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    {selectedAnalysis?.type || 'Estratégia de Venda'}
                  </DialogTitle>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3" /> {selectedAnalysis?.contactName} • {new Date(selectedAnalysis?.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="py-6">
            <div className="bg-muted/30 border-l-4 border-indigo-500 rounded-r-2xl p-6 max-h-[60vh] overflow-y-auto">
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 font-medium">
                {selectedAnalysis?.strategy}
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t pt-4">
            <Button 
              variant="outline" 
              className="flex-1 rounded-xl h-11 font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              onClick={() => copyToClipboard(selectedAnalysis?.strategy, "Análise IA")}
            >
              <Copy className="w-4 h-4 mr-2" /> Copiar Texto
            </Button>
            <Button 
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 font-bold shadow-lg shadow-indigo-500/20"
              onClick={() => {
                setSelectedContact(selectedAnalysis?.contactObj);
                setActiveTab('contacts');
                setSelectedAnalysis(null);
              }}
            >
              <MessageSquare className="w-4 h-4 mr-2" /> Abrir Conversa
            </Button>
            <Button 
              variant="ghost" 
              className="sm:w-24 rounded-xl h-11"
              onClick={() => setSelectedAnalysis(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNewStatusDialogOpen} onOpenChange={setIsNewStatusDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Nova Etiqueta Kanban</DialogTitle>
            <DialogDescription>Crie uma nova etapa para o seu funil de vendas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Etiqueta</Label>
              <Input 
                placeholder="Ex: Prospectando, Reunião Agendada..." 
                value={newStatusData.label}
                onChange={e => setNewStatusData({...newStatusData, label: e.target.value})}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Cor da Etiqueta</Label>
              <Select value={newStatusData.color} onValueChange={val => setNewStatusData({...newStatusData, color: val})}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">Azul</SelectItem>
                  <SelectItem value="yellow">Amarelo</SelectItem>
                  <SelectItem value="purple">Roxo</SelectItem>
                  <SelectItem value="green">Verde</SelectItem>
                  <SelectItem value="red">Vermelho</SelectItem>
                  <SelectItem value="orange">Laranja</SelectItem>
                  <SelectItem value="indigo">Índigo</SelectItem>
                  <SelectItem value="pink">Rosa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNewStatusDialogOpen(false)} className="rounded-xl h-11">Cancelar</Button>
            <Button onClick={handleCreateStatus} disabled={saving || !newStatusData.label} className="rounded-xl h-11 px-8 bg-primary">Criar Etiqueta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditStatusDialogOpen} onOpenChange={setIsEditStatusDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Editar Etiqueta</DialogTitle>
            <DialogDescription>Altere as informações da etapa do funil.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Etiqueta</Label>
              <Input 
                placeholder="Nome..." 
                value={editingStatus?.label || ''}
                onChange={e => setEditingStatus({...editingStatus, label: e.target.value})}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Cor da Etiqueta</Label>
              <Select value={editingStatus?.color} onValueChange={val => setEditingStatus({...editingStatus, color: val})}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">Azul</SelectItem>
                  <SelectItem value="yellow">Amarelo</SelectItem>
                  <SelectItem value="purple">Roxo</SelectItem>
                  <SelectItem value="green">Verde</SelectItem>
                  <SelectItem value="red">Vermelho</SelectItem>
                  <SelectItem value="orange">Laranja</SelectItem>
                  <SelectItem value="indigo">Índigo</SelectItem>
                  <SelectItem value="pink">Rosa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <RefreshCcw className={cn("w-4 h-4 text-zinc-500", editingStatus?.is_starred && "text-yellow-500 fill-yellow-500")} /> 
                  Destacar no Chat
                </Label>
                <p className="text-[10px] text-muted-foreground">Exibir como botão fixo no cabeçalho da conversa.</p>
              </div>
              <Switch 
                checked={editingStatus?.is_starred || false}
                onCheckedChange={(val) => setEditingStatus({...editingStatus, is_starred: val})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditStatusDialogOpen(false)} className="rounded-xl h-11">Cancelar</Button>
            <Button onClick={handleUpdateStatus} disabled={saving || !editingStatus?.label} className="rounded-xl h-11 px-8 bg-primary">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default CRM;
