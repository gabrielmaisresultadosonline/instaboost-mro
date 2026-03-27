import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import {
  MessageSquare, Send, Settings, FileText,
  Mic, Search, ArrowLeft, Check, CheckCheck, Wifi, WifiOff,
  QrCode, Loader2, User, RefreshCw, Plus
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
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const callProxy = async (action: string, data: Record<string, unknown> = {}) => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/zapi-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
    },
    body: JSON.stringify({ action, data }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || 'Erro na integração Z-API');
  }
  return payload;
};

const normalizePhone = (value: string) => {
  const base = value.trim().split('@')[0] || '';
  return base.replace(/\D/g, '') || base;
};

export default function ApiWhatsAppAccess() {
  const [view, setView] = useState<'settings' | 'chats'>('settings');
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
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const formatPhone = (phone: string) => {
    const p = normalizePhone(phone);
    if (p.length === 13) return `+${p.slice(0, 2)} (${p.slice(2, 4)}) ${p.slice(4, 9)}-${p.slice(9)}`;
    if (p.length === 12) return `+${p.slice(0, 2)} (${p.slice(2, 4)}) ${p.slice(4, 8)}-${p.slice(8)}`;
    return phone;
  };

  const formatTime = (msg: Message) => {
    const date = msg.timestamp ? new Date(msg.timestamp) : new Date(msg.created_at);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const loadContacts = useCallback(async () => {
    try {
      const result = await callProxy('get-db-contacts');
      setContacts(Array.isArray(result.contacts) ? result.contacts : []);
    } catch (e) {
      console.error('Error loading contacts:', e);
    }
  }, []);

  const syncChats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await callProxy('sync-chats');
      if (Array.isArray(result.contacts)) {
        setContacts(result.contacts);
      } else {
        await loadContacts();
      }
      if (!silent) toast({ title: `${result.synced || 0} conversas sincronizadas!` });
    } catch {
      if (!silent) toast({ title: 'Erro ao sincronizar conversas', variant: 'destructive' });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [loadContacts]);

  const loadMessages = useCallback(async (phone: string, silent = false) => {
    const normalized = normalizePhone(phone);
    if (!normalized) return;

    if (!silent) setMessageLoading(true);

    try {
      await callProxy('sync-messages', { phone: normalized });
      const result = await callProxy('get-db-messages', { phone: normalized });
      setMessages(Array.isArray(result.messages) ? result.messages : []);
      await callProxy('mark-read', { phone: normalized });
      if (!silent) await loadContacts();
    } catch (e) {
      console.error('Error loading messages:', e);
    } finally {
      if (!silent) setMessageLoading(false);
    }
  }, [loadContacts]);

  const checkStatus = useCallback(async () => {
    try {
      const result = await callProxy('get-status');
      setConnected(result?.connected === true);
      if (!result?.connected) {
        const qr = await callProxy('get-qrcode');
        if (qr?.value) setQrCode(qr.value);
      }
    } catch (e) {
      console.error('Status error:', e);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const result = await callProxy('get-settings');
      const settings: ZApiSettings | null = result.settings;
      if (!settings) return;

      setInstanceId(settings.instance_id || '');
      setToken(settings.token || '');
      setClientToken(settings.client_token || '');
      setConnected(settings.is_connected || false);

      if (settings.instance_id && settings.token) {
        setView('chats');
        await syncChats(true);
        await checkStatus();
      }
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  }, [checkStatus, syncChats]);

  const saveSettings = async () => {
    setLoading(true);
    try {
      await callProxy('save-settings', {
        instance_id: instanceId,
        token,
        client_token: clientToken,
      });

      const webhookUrl = `${SUPABASE_URL}/functions/v1/zapi-webhook`;
      await callProxy('set-webhook', { webhookUrl });

      toast({ title: 'Instância conectada!' });
      setView('chats');
      await loadSettings();
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: String(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedContact || !messageText.trim()) return;
    setSendingMessage(true);

    try {
      await callProxy('send-text', {
        phone: normalizePhone(selectedContact.phone),
        message: messageText,
      });
      setMessageText('');
      await loadMessages(selectedContact.phone, true);
      await loadContacts();
    } catch {
      toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  };

  const selectContact = async (contact: Contact) => {
    setSelectedContact(contact);
    setShowMobileChat(true);
    await loadMessages(contact.phone);
  };

  const startNewChat = async () => {
    const phone = normalizePhone(newChatPhone);
    if (!phone || phone.length < 10) {
      toast({
        title: 'Número inválido',
        description: 'Digite com DDI + DDD. Ex: 5511999999999',
        variant: 'destructive',
      });
      return;
    }

    const contact: Contact = { phone, name: formatPhone(phone), unread_count: 0 };
    setShowNewChat(false);
    setNewChatPhone('');
    await selectContact(contact);
  };

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (view !== 'chats') return;
    const interval = setInterval(() => {
      loadContacts();
      checkStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, [view, loadContacts, checkStatus]);

  useEffect(() => {
    if (!selectedContact || view !== 'chats') return;
    const interval = setInterval(() => {
      loadMessages(selectedContact.phone, true);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedContact, view, loadMessages]);

  const filteredContacts = contacts.filter((c) =>
    (c.name || c.phone).toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const StatusIcon = ({ status }: { status?: string }) => {
    if (status === 'read') return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
    if (status === 'delivered') return <CheckCheck className="w-3.5 h-3.5 text-white/40" />;
    return <Check className="w-3.5 h-3.5 text-white/40" />;
  };

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
                onChange={(e) => setInstanceId(e.target.value)}
                placeholder="Ex: 3C9E1B2..."
                className="bg-[#2a3942] border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <label className="text-white/70 text-sm mb-1 block">Token</label>
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Seu token da instância"
                className="bg-[#2a3942] border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <label className="text-white/70 text-sm mb-1 block">Client Token (Segurança)</label>
              <Input
                value={clientToken}
                onChange={(e) => setClientToken(e.target.value)}
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#111b21] flex flex-col overflow-hidden">
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
          <Button variant="ghost" size="icon" onClick={() => setShowNewChat(true)} className="text-white/60 hover:text-white hover:bg-white/10">
            <Plus className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => syncChats()} className="text-white/60 hover:text-white hover:bg-white/10">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={checkStatus} className="text-white/60 hover:text-white hover:bg-white/10">
            <QrCode className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setView('settings')} className="text-white/60 hover:text-white hover:bg-white/10">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!connected && qrCode && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-[#202c33] rounded-2xl p-8 max-w-sm mx-4 text-center">
            <h2 className="text-white text-lg font-bold mb-2">Escaneie o QR Code</h2>
            <p className="text-white/50 text-sm mb-4">Abra o WhatsApp no celular e escaneie</p>
            <img src={qrCode} alt="QR Code" className="mx-auto rounded-lg bg-white p-2 max-w-[250px]" />
            <Button onClick={() => { setQrCode(null); checkStatus(); }} className="mt-4 bg-[#00a884] hover:bg-[#00a884]/80 text-white">
              Já escaneei
            </Button>
          </div>
        </div>
      )}

      {showNewChat && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-[#202c33] rounded-2xl p-6 max-w-sm mx-4 w-full">
            <h2 className="text-white text-lg font-bold mb-3">Nova conversa</h2>
            <Input
              value={newChatPhone}
              onChange={(e) => setNewChatPhone(e.target.value)}
              placeholder="5511999999999"
              className="bg-[#2a3942] border-white/10 text-white placeholder:text-white/30"
              onKeyDown={(e) => e.key === 'Enter' && startNewChat()}
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={startNewChat} className="flex-1 bg-[#00a884] hover:bg-[#00a884]/80 text-white">Iniciar</Button>
              <Button variant="ghost" onClick={() => setShowNewChat(false)} className="text-white/60">Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className={`${showMobileChat && selectedContact ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 bg-[#111b21] border-r border-white/5`}>
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar conversa"
                className="pl-10 bg-[#202c33] border-0 text-white placeholder:text-white/30 rounded-lg h-9 text-sm"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">Nenhuma conversa</p>
                <Button onClick={() => syncChats()} variant="ghost" className="mt-2 text-[#00a884] text-sm">
                  <RefreshCw className="w-3 h-3 mr-1" /> Sincronizar
                </Button>
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <div
                  key={contact.phone}
                  onClick={() => selectContact(contact)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#202c33] ${selectedContact?.phone === contact.phone ? 'bg-[#2a3942]' : ''}`}
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
                        <span className="text-white/30 text-xs ml-2">
                          {new Date(contact.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <span className="text-white/40 text-xs truncate block">{formatPhone(contact.phone)}</span>
                  </div>
                  {contact.unread_count > 0 && (
                    <span className="bg-[#00a884] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {contact.unread_count}
                    </span>
                  )}
                </div>
              ))
            )}
          </ScrollArea>
        </div>

        <div className={`${!showMobileChat && selectedContact ? 'hidden md:flex' : 'flex'} flex-col flex-1 ${!selectedContact ? 'hidden md:flex' : ''}`}>
          {!selectedContact ? (
            <div className="flex-1 flex items-center justify-center bg-[#222e35]">
              <div className="text-center">
                <h2 className="text-white/60 text-xl font-light">WhatsApp Z-API</h2>
                <p className="text-white/30 text-sm mt-1">Selecione uma conversa</p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-[#202c33] h-14 flex items-center gap-3 px-4 border-b border-white/5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-white/60 hover:text-white"
                  onClick={() => { setShowMobileChat(false); setSelectedContact(null); }}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="w-10 h-10 rounded-full bg-[#6b7b8d] flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-white/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{selectedContact.name || formatPhone(selectedContact.phone)}</p>
                  <p className="text-white/40 text-xs">{formatPhone(selectedContact.phone)}</p>
                </div>
                <Button variant="ghost" size="icon" className="text-white/60 hover:text-white" onClick={() => loadMessages(selectedContact.phone)}>
                  <RefreshCw className={`w-4 h-4 ${messageLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <ScrollArea className="flex-1 bg-[#0b141a]">
                <div className="p-4 space-y-1 min-h-full flex flex-col justify-end">
                  {messageLoading && messages.length === 0 && (
                    <div className="text-center py-8">
                      <Loader2 className="w-6 h-6 text-white/30 animate-spin mx-auto" />
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-1.5 ${msg.direction === 'outgoing' ? 'bg-[#005c4b] text-white rounded-tr-none' : 'bg-[#202c33] text-white rounded-tl-none'}`}>
                        {msg.message_type === 'image' && msg.media_url && (
                          <img src={msg.media_url} alt="Mídia" className="rounded max-w-full mb-1 max-h-64 object-contain" />
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

              <div className="bg-[#202c33] px-4 py-3 flex items-end gap-2 border-t border-white/5 shrink-0">
                <div className="flex-1">
                  <Textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
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
                <Button onClick={sendMessage} disabled={!messageText.trim() || sendingMessage} className="bg-[#00a884] hover:bg-[#00a884]/80 text-white rounded-full w-10 h-10 p-0">
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
