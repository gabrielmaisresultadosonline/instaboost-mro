import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import {
  MessageSquare, Send, Settings, Phone, Image, FileText,
  Mic, Search, ArrowLeft, Check, CheckCheck, Wifi, WifiOff,
  QrCode, Loader2, User, Paperclip, X, RefreshCw
} from 'lucide-react';

interface Contact {
  phone: string;
  name: string;
  profile_pic_url?: string;
  last_message_at?: string;
  unread_count: number;
}

interface Message {
  id: string;
  message_id?: string;
  phone: string;
  contact_name?: string;
  direction: string;
  message_type: string;
  content?: string;
  media_url?: string;
  status?: string;
  is_read: boolean;
  timestamp?: number;
  created_at: string;
}

interface ZApiSettings {
  instance_id?: string;
  token?: string;
  client_token?: string;
  is_connected?: boolean;
  phone_number?: string;
  webhook_url?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

const callProxy = async (action: string, data: Record<string, unknown> = {}) => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/zapi-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
    },
    body: JSON.stringify({ action, data }),
  });
  return res.json();
};

export default function ApiWhatsAppAccess() {
  const [view, setView] = useState<'settings' | 'chats'>('settings');
  const [settings, setSettings] = useState<ZApiSettings>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [connected, setConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [instanceId, setInstanceId] = useState('');
  const [token, setToken] = useState('');
  const [clientToken, setClientToken] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const hasSyncedRef = useRef(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Realtime subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel('zapi-messages-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'zapi_messages',
      }, (payload) => {
        const newMsg = payload.new as Message;
        if (selectedContact && newMsg.phone === selectedContact.phone) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
        loadContacts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedContact]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSettings = async () => {
    try {
      const result = await callProxy('get-settings');
      if (result.settings) {
        setSettings(result.settings);
        setInstanceId(result.settings.instance_id || '');
        setToken(result.settings.token || '');
        setClientToken(result.settings.client_token || '');
        setConnected(result.settings.is_connected || false);
        if (result.settings.instance_id && result.settings.token) {
          setView('chats');
          const { data: existingContacts } = await supabase
            .from('zapi_contacts')
            .select('phone')
            .limit(1);
          if (!existingContacts || existingContacts.length === 0) {
            // Auto-sync chats from Z-API on first load
            if (!hasSyncedRef.current) {
              hasSyncedRef.current = true;
              setTimeout(() => syncChats(), 500);
            }
          } else {
            loadContacts();
          }
          checkStatus();
        }
      }
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  };

  // Periodic polling for contacts refresh
  useEffect(() => {
    if (!connected || view !== 'chats') return;
    const interval = setInterval(() => {
      loadContacts();
    }, 10000);
    return () => clearInterval(interval);
  }, [connected, view, loadContacts]);

  const saveSettings = async () => {
    setLoading(true);
    try {
      await callProxy('save-settings', {
        instance_id: instanceId,
        token,
        client_token: clientToken,
      });
      toast({ title: 'Configurações salvas!' });

      // Set webhook URL
      const webhookUrl = `${SUPABASE_URL}/functions/v1/zapi-webhook`;
      await callProxy('set-webhook', { webhookUrl });
      toast({ title: 'Webhook configurado!' });

      await loadSettings();
      setView('chats');
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: String(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const result = await callProxy('get-status');
      setConnected(result?.connected === true);
      if (!result?.connected) {
        getQrCode();
      }
    } catch (e) {
      console.error('Status error:', e);
    }
  };

  const getQrCode = async () => {
    try {
      const result = await callProxy('get-qrcode');
      if (result?.value) {
        setQrCode(result.value);
      }
    } catch (e) {
      console.error('QR error:', e);
    }
  };

  const loadContacts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('zapi_contacts')
        .select('*')
        .order('last_message_at', { ascending: false });
      if (data) setContacts(data as Contact[]);
    } catch (e) {
      console.error('Error loading contacts:', e);
    }
  }, []);

  const loadMessages = async (phone: string) => {
    try {
      const { data } = await supabase
        .from('zapi_messages')
        .select('*')
        .eq('phone', phone)
        .order('created_at', { ascending: true });
      if (data) setMessages(data as Message[]);

      // Also try to fetch from Z-API if empty
      if (!data || data.length === 0) {
        setLoading(true);
        const apiMessages = await callProxy('get-messages', { phone });
        if (Array.isArray(apiMessages)) {
          // Save to DB and reload
          for (const msg of apiMessages.slice(-50)) {
            await supabase.from('zapi_messages').insert({
              message_id: msg.messageId || msg.zaapId,
              phone,
              contact_name: msg.senderName || msg.chatName,
              direction: msg.fromMe ? 'outgoing' : 'incoming',
              message_type: msg.image ? 'image' : msg.audio ? 'audio' : 'text',
              content: msg.text?.message || msg.text || msg.image?.caption || '',
              media_url: msg.image?.imageUrl || msg.audio?.audioUrl || null,
              status: 'delivered',
              timestamp: msg.momment || msg.timestamp,
            });
          }
          const { data: refreshed } = await supabase
            .from('zapi_messages')
            .select('*')
            .eq('phone', phone)
            .order('created_at', { ascending: true });
          if (refreshed) setMessages(refreshed as Message[]);
        }
        setLoading(false);
      }

      // Mark as read
      await supabase
        .from('zapi_contacts')
        .update({ unread_count: 0 })
        .eq('phone', phone);
      loadContacts();
    } catch (e) {
      console.error('Error loading messages:', e);
    }
  };

  const selectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowMobileChat(true);
    loadMessages(contact.phone);
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedContact) return;
    setSendingMessage(true);
    try {
      await callProxy('send-text', {
        phone: selectedContact.phone,
        message: messageText,
      });
      setMessageText('');
      // Reload messages
      setTimeout(() => loadMessages(selectedContact.phone), 500);
    } catch (e) {
      toast({ title: 'Erro ao enviar', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  };

  const syncChats = async () => {
    setLoading(true);
    try {
      const chats = await callProxy('get-chats');
      if (Array.isArray(chats)) {
        for (const chat of chats) {
          const phone = chat.phone?.replace(/\D/g, '') || chat.id?.replace(/\D/g, '');
          if (!phone) continue;
          await supabase.from('zapi_contacts').upsert({
            phone,
            name: chat.name || chat.chatName || phone,
            profile_pic_url: chat.profileThumbnail || null,
            last_message_at: chat.lastMessageTimestamp ? new Date(chat.lastMessageTimestamp * 1000).toISOString() : new Date().toISOString(),
            unread_count: chat.unreadMessages || 0,
          }, { onConflict: 'phone' });
        }
        await loadContacts();
        toast({ title: 'Conversas sincronizadas!' });
      } else {
        toast({ title: 'Nenhuma conversa encontrada', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Erro ao sincronizar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    if (phone.length === 13) return `+${phone.slice(0,2)} (${phone.slice(2,4)}) ${phone.slice(4,9)}-${phone.slice(9)}`;
    if (phone.length === 12) return `+${phone.slice(0,2)} (${phone.slice(2,4)}) ${phone.slice(4,8)}-${phone.slice(8)}`;
    return phone;
  };

  const formatTime = (msg: Message) => {
    const date = msg.timestamp ? new Date(msg.timestamp) : new Date(msg.created_at);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredContacts = contacts.filter(c =>
    (c.name || c.phone).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const StatusIcon = ({ status }: { status?: string }) => {
    if (status === 'read') return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
    if (status === 'delivered') return <CheckCheck className="w-3.5 h-3.5 text-white/40" />;
    return <Check className="w-3.5 h-3.5 text-white/40" />;
  };

  // Settings View
  if (view === 'settings') {
    return (
      <div className="min-h-screen bg-[#111b21] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#202c33] rounded-2xl p-8 shadow-2xl border border-white/5">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">WhatsApp Z-API</h1>
              <p className="text-white/50 text-sm">Configure sua instância</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-white/70 text-sm mb-1 block">Instance ID</label>
              <Input
                value={instanceId}
                onChange={e => setInstanceId(e.target.value)}
                placeholder="Ex: 3C9E1B2..."
                className="bg-[#2a3942] border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <label className="text-white/70 text-sm mb-1 block">Token</label>
              <Input
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Seu token da instância"
                className="bg-[#2a3942] border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <label className="text-white/70 text-sm mb-1 block">Client Token (Segurança)</label>
              <Input
                value={clientToken}
                onChange={e => setClientToken(e.target.value)}
                placeholder="Token de segurança da conta"
                className="bg-[#2a3942] border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <Button
              onClick={saveSettings}
              disabled={!instanceId || !token || loading}
              className="w-full bg-[#00a884] hover:bg-[#00a884]/80 text-white font-bold h-12"
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : null}
              Conectar Instância
            </Button>

            <p className="text-white/30 text-xs text-center mt-4">
              Acesse <a href="https://z-api.io" target="_blank" rel="noopener" className="text-[#00a884] underline">z-api.io</a> para criar sua conta e instância
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main Chat View
  return (
    <div className="h-screen bg-[#111b21] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#202c33] h-14 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold">WhatsApp Z-API</span>
          <span className={`flex items-center gap-1 text-xs ${connected ? 'text-[#00a884]' : 'text-red-400'}`}>
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {connected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={syncChats} className="text-white/60 hover:text-white hover:bg-white/10">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { checkStatus(); }} className="text-white/60 hover:text-white hover:bg-white/10">
            <QrCode className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setView('settings')} className="text-white/60 hover:text-white hover:bg-white/10">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* QR Code Overlay */}
      {!connected && qrCode && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-[#202c33] rounded-2xl p-8 max-w-sm mx-4 text-center">
            <h2 className="text-white text-lg font-bold mb-2">Escaneie o QR Code</h2>
            <p className="text-white/50 text-sm mb-4">Abra o WhatsApp no celular e escaneie</p>
            <img src={qrCode} alt="QR Code" className="mx-auto rounded-lg bg-white p-2 max-w-[250px]" />
            <Button onClick={() => { setQrCode(null); checkStatus(); }} className="mt-4 bg-[#00a884] hover:bg-[#00a884]/80 text-white">
              Já escaneei
            </Button>
            <Button variant="ghost" onClick={() => setQrCode(null)} className="mt-2 text-white/50">
              Fechar
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Contact List */}
        <div className={`${showMobileChat && selectedContact ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 bg-[#111b21] border-r border-white/5`}>
          {/* Search */}
          <div className="p-3 bg-[#111b21]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Pesquisar ou começar nova conversa"
                className="pl-10 bg-[#202c33] border-0 text-white placeholder:text-white/30 rounded-lg h-9 text-sm"
              />
            </div>
          </div>

          {/* Contacts */}
          <ScrollArea className="flex-1">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">Nenhuma conversa</p>
                <Button onClick={syncChats} variant="ghost" className="mt-2 text-[#00a884] text-sm">
                  <RefreshCw className="w-3 h-3 mr-1" /> Sincronizar conversas
                </Button>
              </div>
            ) : (
              filteredContacts.map(contact => (
                <div
                  key={contact.phone}
                  onClick={() => selectContact(contact)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#202c33] transition-colors ${
                    selectedContact?.phone === contact.phone ? 'bg-[#2a3942]' : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-[#6b7b8d] flex items-center justify-center shrink-0 overflow-hidden">
                    {contact.profile_pic_url ? (
                      <img src={contact.profile_pic_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-white/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-medium truncate">{contact.name || formatPhone(contact.phone)}</span>
                      {contact.last_message_at && (
                        <span className="text-white/30 text-xs shrink-0 ml-2">
                          {new Date(contact.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <span className="text-white/40 text-xs truncate block">{formatPhone(contact.phone)}</span>
                  </div>
                  {contact.unread_count > 0 && (
                    <span className="bg-[#00a884] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shrink-0">
                      {contact.unread_count}
                    </span>
                  )}
                </div>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className={`${!showMobileChat && selectedContact ? 'hidden md:flex' : 'flex'} flex-col flex-1 ${!selectedContact ? 'hidden md:flex' : ''}`}>
          {!selectedContact ? (
            <div className="flex-1 flex items-center justify-center bg-[#222e35]">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-[#00a884]/10 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-10 h-10 text-[#00a884]/40" />
                </div>
                <h2 className="text-white/60 text-xl font-light">WhatsApp Z-API</h2>
                <p className="text-white/30 text-sm mt-1">Selecione uma conversa para começar</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="bg-[#202c33] h-14 flex items-center gap-3 px-4 border-b border-white/5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-white/60 hover:text-white shrink-0"
                  onClick={() => { setShowMobileChat(false); setSelectedContact(null); }}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="w-10 h-10 rounded-full bg-[#6b7b8d] flex items-center justify-center shrink-0 overflow-hidden">
                  {selectedContact.profile_pic_url ? (
                    <img src={selectedContact.profile_pic_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-white/60" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{selectedContact.name || formatPhone(selectedContact.phone)}</p>
                  <p className="text-white/40 text-xs">{formatPhone(selectedContact.phone)}</p>
                </div>
                <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => loadMessages(selectedContact.phone)}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 bg-[#0b141a]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg opacity=\'0.03\'%3E%3Cpath d=\'M20 20h10v10H20z\' fill=\'%23fff\'/%3E%3Cpath d=\'M50 40h10v10H50z\' fill=\'%23fff\'/%3E%3Cpath d=\'M80 20h10v10H80z\' fill=\'%23fff\'/%3E%3Cpath d=\'M110 50h10v10h-10z\' fill=\'%23fff\'/%3E%3Cpath d=\'M140 30h10v10h-10z\' fill=\'%23fff\'/%3E%3Cpath d=\'M170 60h10v10h-10z\' fill=\'%23fff\'/%3E%3Cpath d=\'M30 80h10v10H30z\' fill=\'%23fff\'/%3E%3Cpath d=\'M60 100h10v10H60z\' fill=\'%23fff\'/%3E%3Cpath d=\'M90 80h10v10H90z\' fill=\'%23fff\'/%3E%3Cpath d=\'M120 110h10v10h-10z\' fill=\'%23fff\'/%3E%3Cpath d=\'M150 90h10v10h-10z\' fill=\'%23fff\'/%3E%3Cpath d=\'M180 120h10v10h-10z\' fill=\'%23fff\'/%3E%3Cpath d=\'M10 140h10v10H10z\' fill=\'%23fff\'/%3E%3Cpath d=\'M40 160h10v10H40z\' fill=\'%23fff\'/%3E%3Cpath d=\'M70 140h10v10H70z\' fill=\'%23fff\'/%3E%3Cpath d=\'M100 170h10v10h-10z\' fill=\'%23fff\'/%3E%3Cpath d=\'M130 150h10v10h-10z\' fill=\'%23fff\'/%3E%3Cpath d=\'M160 180h10v10h-10z\' fill=\'%23fff\'/%3E%3C/g%3E%3C/svg%3E")' }}>
                <div className="p-4 space-y-1 min-h-full flex flex-col justify-end">
                  {loading && messages.length === 0 && (
                    <div className="text-center py-8">
                      <Loader2 className="w-6 h-6 text-white/30 animate-spin mx-auto" />
                    </div>
                  )}
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%] rounded-lg px-3 py-1.5 relative ${
                        msg.direction === 'outgoing'
                          ? 'bg-[#005c4b] text-white rounded-tr-none'
                          : 'bg-[#202c33] text-white rounded-tl-none'
                      }`}>
                        {msg.message_type === 'image' && msg.media_url && (
                          <img src={msg.media_url} alt="" className="rounded max-w-full mb-1 max-h-64 object-contain" />
                        )}
                        {msg.message_type === 'audio' && msg.media_url && (
                          <div className="flex items-center gap-2 py-1">
                            <Mic className="w-4 h-4 text-white/60" />
                            <audio controls src={msg.media_url} className="max-w-[200px] h-8" />
                          </div>
                        )}
                        {msg.message_type === 'document' && (
                          <div className="flex items-center gap-2 py-1">
                            <FileText className="w-4 h-4 text-white/60" />
                            <span className="text-sm">{msg.content || 'Documento'}</span>
                          </div>
                        )}
                        {(msg.message_type === 'text' || msg.content) && msg.message_type !== 'document' && (
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        )}
                        <div className={`flex items-center gap-1 mt-0.5 ${msg.direction === 'outgoing' ? 'justify-end' : ''}`}>
                          <span className="text-[10px] text-white/40">{formatTime(msg)}</span>
                          {msg.direction === 'outgoing' && <StatusIcon status={msg.status} />}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="bg-[#202c33] px-4 py-3 flex items-end gap-2 border-t border-white/5 shrink-0">
                <div className="flex-1 relative">
                  <Textarea
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Digite uma mensagem"
                    className="bg-[#2a3942] border-0 text-white placeholder:text-white/30 rounded-lg resize-none min-h-[40px] max-h-[120px] py-2.5 text-sm"
                    rows={1}
                  />
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={!messageText.trim() || sendingMessage}
                  className="bg-[#00a884] hover:bg-[#00a884]/80 text-white rounded-full w-10 h-10 p-0 shrink-0"
                >
                  {sendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
