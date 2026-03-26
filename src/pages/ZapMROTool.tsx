import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  MessageSquare, QrCode, Users, Send, Workflow, BarChart3,
  LogOut, Wifi, WifiOff, Plus, Trash2, Phone, Image as ImageIcon,
  Mic, FileText, Settings, Bot, ArrowRight, Clock, CheckCheck,
  RefreshCw, Search, Download, Upload, Globe, Zap
} from "lucide-react";

const API_BASE = "/whatsapp-api";

interface Session {
  sessionId: string;
  status: string;
  phoneNumber?: string;
  name?: string;
  connectedAt?: string;
}

interface Contact {
  id: string;
  name: string;
  number: string;
  isGroup: boolean;
}

interface Message {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  fromMe: boolean;
  type: string;
}

interface Flow {
  id: string;
  name: string;
  trigger: string;
  steps: FlowStep[];
  isActive: boolean;
}

interface FlowStep {
  id: string;
  type: "message" | "delay" | "condition" | "media";
  content: string;
  delay?: number;
}

interface CRMContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags: string[];
  notes: string;
  stage: string;
  lastContact?: string;
}

const ZapMROTool = () => {
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchContacts, setSearchContacts] = useState("");
  const [flows, setFlows] = useState<Flow[]>(() => {
    const saved = localStorage.getItem("zapmro_flows");
    return saved ? JSON.parse(saved) : [];
  });
  const [crmContacts, setCrmContacts] = useState<CRMContact[]>(() => {
    const saved = localStorage.getItem("zapmro_crm");
    return saved ? JSON.parse(saved) : [];
  });
  const [newFlowName, setNewFlowName] = useState("");
  const [newFlowTrigger, setNewFlowTrigger] = useState("");
  const [crmForm, setCrmForm] = useState({ name: "", phone: "", email: "", tags: "", notes: "", stage: "lead" });
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkNumbers, setBulkNumbers] = useState("");
  const pollRef = useRef<number>();

  // Auth check
  useEffect(() => {
    if (sessionStorage.getItem("zapmro_tool_auth") !== "true") {
      navigate("/zapmrologin");
    }
  }, [navigate]);

  // Check backend status
  const checkBackend = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/`, { method: "GET" });
      setBackendStatus(res.ok ? "online" : "offline");
    } catch {
      setBackendStatus("offline");
    }
  }, []);

  useEffect(() => {
    checkBackend();
    pollRef.current = window.setInterval(checkBackend, 10000);
    return () => window.clearInterval(pollRef.current);
  }, [checkBackend]);

  // Fetch sessions
  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/active-sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (backendStatus === "online") {
      fetchSessions();
      const t = setInterval(fetchSessions, 5000);
      return () => clearInterval(t);
    }
  }, [backendStatus]);

  // Create session
  const createSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/create-session`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Sessão criada! Aguarde o QR Code...");
        setActiveSession(data.sessionId);
        // Poll for QR
        const pollQR = setInterval(async () => {
          try {
            const qrRes = await fetch(`${API_BASE}/api/qr/${data.sessionId}`);
            if (qrRes.ok) {
              const qrData = await qrRes.json();
              if (qrData.qr) {
                setQrCode(qrData.qr);
                clearInterval(pollQR);
              }
            }
          } catch { /* wait */ }
        }, 2000);
        setTimeout(() => clearInterval(pollQR), 120000);
      }
    } catch {
      toast.error("Erro ao criar sessão");
    }
  };

  // Disconnect session
  const disconnectSession = async (sessionId: string) => {
    try {
      await fetch(`${API_BASE}/api/disconnect-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      toast.success("Sessão desconectada");
      if (activeSession === sessionId) setActiveSession(null);
      fetchSessions();
    } catch {
      toast.error("Erro ao desconectar");
    }
  };

  // Fetch contacts
  const fetchContacts = async (sessionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/contacts/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch { /* ignore */ }
  };

  // Send message
  const sendMessage = async () => {
    if (!activeSession || !selectedContact || !messageText.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession,
          number: selectedContact.number || selectedContact.id,
          message: messageText,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Mensagem enviada!");
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          from: "me",
          to: selectedContact.id,
          body: messageText,
          timestamp: Date.now() / 1000,
          fromMe: true,
          type: "chat",
        }]);
        setMessageText("");
      }
    } catch {
      toast.error("Erro ao enviar mensagem");
    }
  };

  // Bulk send
  const sendBulkMessages = async () => {
    if (!activeSession || !bulkMessage.trim() || !bulkNumbers.trim()) return;
    const numbers = bulkNumbers.split("\n").map(n => n.trim()).filter(Boolean);
    let sent = 0;
    for (const number of numbers) {
      try {
        await fetch(`${API_BASE}/api/send-message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: activeSession, number, message: bulkMessage }),
        });
        sent++;
        await new Promise(r => setTimeout(r, 2000)); // delay between messages
      } catch { /* continue */ }
    }
    toast.success(`${sent}/${numbers.length} mensagens enviadas!`);
  };

  // Save flows to localStorage
  useEffect(() => {
    localStorage.setItem("zapmro_flows", JSON.stringify(flows));
  }, [flows]);

  // Save CRM to localStorage
  useEffect(() => {
    localStorage.setItem("zapmro_crm", JSON.stringify(crmContacts));
  }, [crmContacts]);

  // Add flow
  const addFlow = () => {
    if (!newFlowName.trim() || !newFlowTrigger.trim()) return;
    const flow: Flow = {
      id: Date.now().toString(),
      name: newFlowName,
      trigger: newFlowTrigger,
      steps: [{ id: "1", type: "message", content: "Olá! Como posso ajudar?" }],
      isActive: true,
    };
    setFlows(prev => [...prev, flow]);
    setNewFlowName("");
    setNewFlowTrigger("");
    toast.success("Fluxo criado!");
  };

  // Add CRM contact
  const addCrmContact = () => {
    if (!crmForm.name.trim() || !crmForm.phone.trim()) return;
    const contact: CRMContact = {
      id: Date.now().toString(),
      name: crmForm.name,
      phone: crmForm.phone,
      email: crmForm.email || undefined,
      tags: crmForm.tags.split(",").map(t => t.trim()).filter(Boolean),
      notes: crmForm.notes,
      stage: crmForm.stage,
      lastContact: new Date().toISOString(),
    };
    setCrmContacts(prev => [...prev, contact]);
    setCrmForm({ name: "", phone: "", email: "", tags: "", notes: "", stage: "lead" });
    toast.success("Contato CRM adicionado!");
  };

  const logout = () => {
    sessionStorage.removeItem("zapmro_tool_auth");
    sessionStorage.removeItem("zapmro_tool_user");
    navigate("/zapmrologin");
  };

  const connectedSessions = sessions.filter(s => s.status === "connected");
  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchContacts.toLowerCase()) ||
    (c.number || "").includes(searchContacts)
  );

  const stageColors: Record<string, string> = {
    lead: "bg-blue-500/20 text-blue-400",
    prospect: "bg-yellow-500/20 text-yellow-400",
    negotiation: "bg-purple-500/20 text-purple-400",
    customer: "bg-green-500/20 text-green-400",
    lost: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-[#30363d] bg-[#161b22] sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold">ZAP MRO Cloud</h1>
              <p className="text-xs text-gray-500">WhatsApp CRM & Automação</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge className={backendStatus === "online" ? "bg-green-500/20 text-green-400 border-green-500/30" : backendStatus === "offline" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}>
              {backendStatus === "online" ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
              {backendStatus === "online" ? "Online" : backendStatus === "offline" ? "Offline" : "Verificando..."}
            </Badge>
            <Badge className="bg-[#25D366]/20 text-[#25D366] border-[#25D366]/30">
              {connectedSessions.length} sessões
            </Badge>
            <Button variant="ghost" size="sm" onClick={logout} className="text-gray-400 hover:text-white hover:bg-[#30363d]">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Offline Warning */}
      {backendStatus === "offline" && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-3">
          <div className="max-w-[1600px] mx-auto text-sm text-red-400">
            ⚠️ Backend offline. Verifique se o servidor WhatsApp está rodando na VPS (PM2: <code className="bg-red-500/20 px-1 rounded">pm2 status whatsapp-multi</code>)
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto p-4">
        <Tabs defaultValue="connection" className="w-full">
          <TabsList className="bg-[#161b22] border border-[#30363d] p-1 mb-4 flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="connection" className="data-[state=active]:bg-[#25D366] data-[state=active]:text-white text-gray-400 gap-1.5 text-xs">
              <QrCode className="w-3.5 h-3.5" /> Conexão
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-[#25D366] data-[state=active]:text-white text-gray-400 gap-1.5 text-xs">
              <MessageSquare className="w-3.5 h-3.5" /> Chat
            </TabsTrigger>
            <TabsTrigger value="contacts" className="data-[state=active]:bg-[#25D366] data-[state=active]:text-white text-gray-400 gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5" /> Contatos
            </TabsTrigger>
            <TabsTrigger value="bulk" className="data-[state=active]:bg-[#25D366] data-[state=active]:text-white text-gray-400 gap-1.5 text-xs">
              <Send className="w-3.5 h-3.5" /> Envio em Massa
            </TabsTrigger>
            <TabsTrigger value="flows" className="data-[state=active]:bg-[#25D366] data-[state=active]:text-white text-gray-400 gap-1.5 text-xs">
              <Workflow className="w-3.5 h-3.5" /> Fluxos
            </TabsTrigger>
            <TabsTrigger value="funnels" className="data-[state=active]:bg-[#25D366] data-[state=active]:text-white text-gray-400 gap-1.5 text-xs">
              <ArrowRight className="w-3.5 h-3.5" /> Funis
            </TabsTrigger>
            <TabsTrigger value="crm" className="data-[state=active]:bg-[#25D366] data-[state=active]:text-white text-gray-400 gap-1.5 text-xs">
              <BarChart3 className="w-3.5 h-3.5" /> CRM
            </TabsTrigger>
            <TabsTrigger value="bot" className="data-[state=active]:bg-[#25D366] data-[state=active]:text-white text-gray-400 gap-1.5 text-xs">
              <Bot className="w-3.5 h-3.5" /> Bot IA
            </TabsTrigger>
          </TabsList>

          {/* === CONNECTION TAB === */}
          <TabsContent value="connection">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Create Session */}
              <Card className="bg-[#161b22] border-[#30363d]">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-[#25D366]" /> Nova Conexão
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={createSession} disabled={backendStatus !== "online"} className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white">
                    <Plus className="w-4 h-4 mr-2" /> Criar Nova Sessão WhatsApp
                  </Button>

                  {qrCode && (
                    <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-xl">
                      <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                      <p className="text-black text-sm font-medium">Escaneie com seu WhatsApp</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Active Sessions */}
              <Card className="bg-[#161b22] border-[#30363d]">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Phone className="w-5 h-5 text-[#25D366]" /> Sessões Ativas
                    </span>
                    <Button variant="ghost" size="sm" onClick={fetchSessions} className="text-gray-400">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sessions.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-8">Nenhuma sessão ativa</p>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map(s => (
                        <div key={s.sessionId} className="flex items-center justify-between bg-[#0d1117] rounded-lg p-3 border border-[#30363d]">
                          <div>
                            <p className="text-sm font-medium text-white">{s.name || s.sessionId.slice(0, 20)}</p>
                            <p className="text-xs text-gray-500">{s.phoneNumber || "Aguardando..."}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={s.status === "connected" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                              {s.status}
                            </Badge>
                            {s.status === "connected" && (
                              <Button size="sm" variant="ghost" onClick={() => { setActiveSession(s.sessionId); fetchContacts(s.sessionId); }} className="text-[#25D366] hover:bg-[#25D366]/10 text-xs">
                                Usar
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => disconnectSession(s.sessionId)} className="text-red-400 hover:bg-red-500/10">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* === CHAT TAB === */}
          <TabsContent value="chat">
            {!activeSession ? (
              <Card className="bg-[#161b22] border-[#30363d]">
                <CardContent className="py-16 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">Conecte uma sessão primeiro na aba Conexão</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
                {/* Contacts sidebar */}
                <Card className="bg-[#161b22] border-[#30363d] overflow-hidden">
                  <div className="p-3 border-b border-[#30363d]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        placeholder="Buscar contatos..."
                        value={searchContacts}
                        onChange={(e) => setSearchContacts(e.target.value)}
                        className="pl-9 bg-[#0d1117] border-[#30363d] text-white text-sm"
                      />
                    </div>
                  </div>
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    {filteredContacts.map(c => (
                      <div
                        key={c.id}
                        onClick={() => setSelectedContact(c)}
                        className={`flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-[#0d1117] transition-colors border-b border-[#30363d]/50 ${selectedContact?.id === c.id ? "bg-[#0d1117]" : ""}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{c.name}</p>
                          <p className="text-xs text-gray-500 truncate">{c.number}</p>
                        </div>
                      </div>
                    ))}
                    {filteredContacts.length === 0 && (
                      <p className="text-center text-gray-500 text-sm py-8">
                        {contacts.length === 0 ? "Carregue os contatos" : "Nenhum contato encontrado"}
                      </p>
                    )}
                  </ScrollArea>
                </Card>

                {/* Chat area */}
                <Card className="lg:col-span-2 bg-[#161b22] border-[#30363d] flex flex-col overflow-hidden">
                  {selectedContact ? (
                    <>
                      <div className="p-3 border-b border-[#30363d] flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white font-bold">
                          {selectedContact.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{selectedContact.name}</p>
                          <p className="text-xs text-gray-500">{selectedContact.number}</p>
                        </div>
                      </div>

                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-3">
                          {messages.filter(m => m.to === selectedContact.id || m.from === selectedContact.id).map(m => (
                            <div key={m.id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${m.fromMe ? "bg-[#25D366] text-white" : "bg-[#30363d] text-gray-200"}`}>
                                {m.body}
                                <div className="flex items-center justify-end gap-1 mt-1">
                                  <span className="text-[10px] opacity-60">
                                    {new Date(m.timestamp * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {m.fromMe && <CheckCheck className="w-3 h-3 opacity-60" />}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      <div className="p-3 border-t border-[#30363d]">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white shrink-0">
                            <ImageIcon className="w-5 h-5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white shrink-0">
                            <Mic className="w-5 h-5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white shrink-0">
                            <FileText className="w-5 h-5" />
                          </Button>
                          <Input
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                            placeholder="Digite uma mensagem..."
                            className="flex-1 bg-[#0d1117] border-[#30363d] text-white"
                          />
                          <Button onClick={sendMessage} className="bg-[#25D366] hover:bg-[#20bd5a] shrink-0">
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <MessageSquare className="w-16 h-16 text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-500">Selecione um contato para iniciar</p>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </TabsContent>

          {/* === CONTACTS TAB === */}
          <TabsContent value="contacts">
            <Card className="bg-[#161b22] border-[#30363d]">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#25D366]" /> Contatos ({contacts.length})
                  </span>
                  {activeSession && (
                    <Button size="sm" onClick={() => fetchContacts(activeSession)} className="bg-[#25D366] hover:bg-[#20bd5a]">
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!activeSession ? (
                  <p className="text-gray-500 text-sm text-center py-8">Conecte uma sessão primeiro</p>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Filtrar contatos..."
                      value={searchContacts}
                      onChange={(e) => setSearchContacts(e.target.value)}
                      className="bg-[#0d1117] border-[#30363d] text-white mb-3"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {filteredContacts.slice(0, 100).map(c => (
                        <div key={c.id} className="flex items-center gap-3 bg-[#0d1117] rounded-lg p-3 border border-[#30363d]">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-white truncate">{c.name}</p>
                            <p className="text-xs text-gray-500">{c.number}</p>
                            {c.isGroup && <Badge className="bg-blue-500/20 text-blue-400 text-[10px] mt-1">Grupo</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === BULK SEND TAB === */}
          <TabsContent value="bulk">
            <Card className="bg-[#161b22] border-[#30363d]">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Send className="w-5 h-5 text-[#25D366]" /> Envio em Massa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!activeSession ? (
                  <p className="text-gray-500 text-sm text-center py-8">Conecte uma sessão primeiro</p>
                ) : (
                  <>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Números (um por linha, com DDD + país)</label>
                      <Textarea
                        value={bulkNumbers}
                        onChange={(e) => setBulkNumbers(e.target.value)}
                        placeholder={"5511999999999\n5521888888888\n5531777777777"}
                        rows={6}
                        className="bg-[#0d1117] border-[#30363d] text-white font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Mensagem</label>
                      <Textarea
                        value={bulkMessage}
                        onChange={(e) => setBulkMessage(e.target.value)}
                        placeholder="Digite sua mensagem aqui..."
                        rows={4}
                        className="bg-[#0d1117] border-[#30363d] text-white"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {bulkNumbers.split("\n").filter(n => n.trim()).length} números • Delay de 2s entre envios
                      </p>
                      <Button onClick={sendBulkMessages} className="bg-[#25D366] hover:bg-[#20bd5a]">
                        <Send className="w-4 h-4 mr-2" /> Enviar para Todos
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === FLOWS TAB === */}
          <TabsContent value="flows">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="bg-[#161b22] border-[#30363d]">
                <CardHeader>
                  <CardTitle className="text-white text-base">Criar Fluxo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    value={newFlowName}
                    onChange={(e) => setNewFlowName(e.target.value)}
                    placeholder="Nome do fluxo"
                    className="bg-[#0d1117] border-[#30363d] text-white"
                  />
                  <Input
                    value={newFlowTrigger}
                    onChange={(e) => setNewFlowTrigger(e.target.value)}
                    placeholder="Palavra-chave gatilho (ex: oi, preço)"
                    className="bg-[#0d1117] border-[#30363d] text-white"
                  />
                  <Button onClick={addFlow} className="w-full bg-[#25D366] hover:bg-[#20bd5a]">
                    <Plus className="w-4 h-4 mr-2" /> Criar Fluxo
                  </Button>
                </CardContent>
              </Card>

              <div className="lg:col-span-2 space-y-3">
                {flows.length === 0 ? (
                  <Card className="bg-[#161b22] border-[#30363d]">
                    <CardContent className="py-12 text-center">
                      <Workflow className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">Nenhum fluxo criado ainda</p>
                    </CardContent>
                  </Card>
                ) : flows.map(flow => (
                  <Card key={flow.id} className="bg-[#161b22] border-[#30363d]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Workflow className="w-5 h-5 text-[#25D366]" />
                          <div>
                            <p className="text-sm font-medium text-white">{flow.name}</p>
                            <p className="text-xs text-gray-500">Gatilho: "{flow.trigger}"</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={flow.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                            {flow.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => setFlows(prev => prev.map(f => f.id === flow.id ? { ...f, isActive: !f.isActive } : f))} className="text-gray-400">
                            <Settings className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setFlows(prev => prev.filter(f => f.id !== flow.id))} className="text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {flow.steps.map((step, i) => (
                          <div key={step.id} className="flex items-center gap-2">
                            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-gray-300">
                              {step.type === "message" && <MessageSquare className="w-3 h-3 inline mr-1" />}
                              {step.type === "delay" && <Clock className="w-3 h-3 inline mr-1" />}
                              {step.content.slice(0, 30)}...
                            </div>
                            {i < flow.steps.length - 1 && <ArrowRight className="w-3 h-3 text-gray-600" />}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* === FUNNELS TAB === */}
          <TabsContent value="funnels">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {["Lead", "Qualificado", "Negociação", "Fechado"].map((stage, idx) => (
                <Card key={stage} className="bg-[#161b22] border-[#30363d]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm flex items-center justify-between">
                      {stage}
                      <Badge className="bg-[#25D366]/20 text-[#25D366] text-xs">
                        {crmContacts.filter(c => c.stage === ["lead", "prospect", "negotiation", "customer"][idx]).length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 min-h-[200px]">
                    {crmContacts.filter(c => c.stage === ["lead", "prospect", "negotiation", "customer"][idx]).map(contact => (
                      <div key={contact.id} className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3">
                        <p className="text-sm text-white font-medium">{contact.name}</p>
                        <p className="text-xs text-gray-500">{contact.phone}</p>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {contact.tags.map(tag => (
                            <Badge key={tag} className="bg-[#25D366]/10 text-[#25D366] text-[10px] px-1.5">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* === CRM TAB === */}
          <TabsContent value="crm">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="bg-[#161b22] border-[#30363d]">
                <CardHeader>
                  <CardTitle className="text-white text-base">Adicionar Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input value={crmForm.name} onChange={(e) => setCrmForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome" className="bg-[#0d1117] border-[#30363d] text-white" />
                  <Input value={crmForm.phone} onChange={(e) => setCrmForm(p => ({ ...p, phone: e.target.value }))} placeholder="Telefone (5511...)" className="bg-[#0d1117] border-[#30363d] text-white" />
                  <Input value={crmForm.email} onChange={(e) => setCrmForm(p => ({ ...p, email: e.target.value }))} placeholder="Email (opcional)" className="bg-[#0d1117] border-[#30363d] text-white" />
                  <Input value={crmForm.tags} onChange={(e) => setCrmForm(p => ({ ...p, tags: e.target.value }))} placeholder="Tags (separadas por vírgula)" className="bg-[#0d1117] border-[#30363d] text-white" />
                  <select value={crmForm.stage} onChange={(e) => setCrmForm(p => ({ ...p, stage: e.target.value }))} className="w-full bg-[#0d1117] border border-[#30363d] text-white rounded-md px-3 py-2 text-sm">
                    <option value="lead">Lead</option>
                    <option value="prospect">Qualificado</option>
                    <option value="negotiation">Negociação</option>
                    <option value="customer">Cliente</option>
                    <option value="lost">Perdido</option>
                  </select>
                  <Textarea value={crmForm.notes} onChange={(e) => setCrmForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observações..." rows={3} className="bg-[#0d1117] border-[#30363d] text-white" />
                  <Button onClick={addCrmContact} className="w-full bg-[#25D366] hover:bg-[#20bd5a]">
                    <Plus className="w-4 h-4 mr-2" /> Adicionar
                  </Button>
                </CardContent>
              </Card>

              <div className="lg:col-span-2">
                <Card className="bg-[#161b22] border-[#30363d]">
                  <CardHeader>
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-[#25D366]" /> CRM ({crmContacts.length} contatos)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {crmContacts.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-12">Nenhum contato no CRM</p>
                    ) : (
                      <div className="space-y-2">
                        {crmContacts.map(c => (
                          <div key={c.id} className="flex items-center justify-between bg-[#0d1117] rounded-lg p-3 border border-[#30363d]">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white font-bold text-sm shrink-0">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm text-white">{c.name}</p>
                                <p className="text-xs text-gray-500">{c.phone} {c.email ? `• ${c.email}` : ""}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={stageColors[c.stage] || "bg-gray-500/20 text-gray-400"}>
                                {c.stage}
                              </Badge>
                              <Button variant="ghost" size="sm" onClick={() => setCrmContacts(prev => prev.filter(x => x.id !== c.id))} className="text-red-400 hover:bg-red-500/10">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* === BOT IA TAB === */}
          <TabsContent value="bot">
            <Card className="bg-[#161b22] border-[#30363d]">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Bot className="w-5 h-5 text-[#25D366]" /> Bot com Inteligência Artificial
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-400 text-sm">
                  Configure respostas automáticas inteligentes usando IA. O bot responde automaticamente
                  às mensagens recebidas com base no contexto da conversa.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                    <h3 className="text-white text-sm font-medium mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" /> Resposta Rápida
                    </h3>
                    <p className="text-gray-500 text-xs mb-3">Responda automaticamente a perguntas frequentes</p>
                    <Textarea placeholder="Contexto do bot: Ex: Você é um atendente da empresa X, responda sobre preços e serviços..." rows={4} className="bg-[#161b22] border-[#30363d] text-white text-sm" />
                    <Button className="w-full mt-3 bg-[#25D366] hover:bg-[#20bd5a] text-sm">
                      Ativar Bot IA
                    </Button>
                  </div>
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                    <h3 className="text-white text-sm font-medium mb-2 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-400" /> Estatísticas
                    </h3>
                    <div className="space-y-3 mt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Mensagens respondidas</span>
                        <span className="text-white font-medium">0</span>
                      </div>
                      <Separator className="bg-[#30363d]" />
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Taxa de resolução</span>
                        <span className="text-white font-medium">0%</span>
                      </div>
                      <Separator className="bg-[#30363d]" />
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Tempo médio resposta</span>
                        <span className="text-white font-medium">--</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ZapMROTool;
