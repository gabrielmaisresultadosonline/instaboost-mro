import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, 
  Lock, 
  LogOut, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  XCircle,
  Mail,
  User,
  Calendar,
  DollarSign,
  Copy,
  Phone,
  AlertTriangle,
  Trash2,
  ChevronDown,
  ChevronRight,
  Settings,
  Save,
  Users
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ptBR } from "date-fns/locale";

const ADMIN_EMAIL = "mro@gmail.com";
const ADMIN_PASSWORD = "Ga145523@";

// Configurações do template de mensagem
const MEMBER_LINK = "https://maisresultadosonline.com.br/instagram";
const GROUP_LINK = "https://chat.whatsapp.com/JdEHa4jeLSUKTQFCNp7YXi";

interface MROOrder {
  id: string;
  email: string;
  username: string;
  phone: string | null;
  plan_type: string;
  amount: number;
  status: string;
  nsu_order: string;
  infinitepay_link: string | null;
  api_created: boolean | null;
  email_sent: boolean | null;
  paid_at: string | null;
  completed_at: string | null;
  expired_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function InstagramNovaAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [orders, setOrders] = useState<MROOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "paid" | "completed" | "expired">("all");
  
  const autoCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(true);
  const [lastAutoCheck, setLastAutoCheck] = useState<Date | null>(null);
  
  // State para seções colapsáveis
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    completed: true,
    paid: true,
    pending: false,
    expired: false
  });

  // Configuração de afiliado
  const [showAffiliateConfig, setShowAffiliateConfig] = useState(false);
  const [affiliateId, setAffiliateId] = useState("");
  const [affiliateEmail, setAffiliateEmail] = useState("");
  const [savingAffiliate, setSavingAffiliate] = useState(false);

  // Carregar configuração de afiliado do localStorage
  useEffect(() => {
    const savedAffiliateId = localStorage.getItem("mro_affiliate_id") || "mila";
    const savedAffiliateEmail = localStorage.getItem("mro_affiliate_email") || "";
    setAffiliateId(savedAffiliateId);
    setAffiliateEmail(savedAffiliateEmail);
  }, []);

  // Check if already authenticated
  useEffect(() => {
    const auth = localStorage.getItem("mro_admin_auth");
    if (auth === "true") {
      setIsAuthenticated(true);
      loadOrders();
    }
  }, []);

  // Verificação automática a cada 30 segundos
  useEffect(() => {
    if (isAuthenticated && autoCheckEnabled) {
      // Verificar imediatamente ao carregar
      checkPendingPayments();
      
      // Configurar intervalo de 30 segundos
      autoCheckIntervalRef.current = setInterval(() => {
        checkPendingPayments();
      }, 30000);
      
      return () => {
        if (autoCheckIntervalRef.current) {
          clearInterval(autoCheckIntervalRef.current);
        }
      };
    }
  }, [isAuthenticated, autoCheckEnabled]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    setTimeout(() => {
      if (loginEmail === ADMIN_EMAIL && loginPassword === ADMIN_PASSWORD) {
        localStorage.setItem("mro_admin_auth", "true");
        setIsAuthenticated(true);
        loadOrders();
        toast.success("Login realizado com sucesso!");
      } else {
        toast.error("Email ou senha incorretos");
      }
      setLoginLoading(false);
    }, 500);
  };

  const handleLogout = () => {
    localStorage.removeItem("mro_admin_auth");
    setIsAuthenticated(false);
    setOrders([]);
    if (autoCheckIntervalRef.current) {
      clearInterval(autoCheckIntervalRef.current);
    }
    toast.info("Logout realizado");
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("mro_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading orders:", error);
        toast.error("Erro ao carregar pedidos");
        return;
      }

      // Processar pedidos expirados
      const now = new Date();
      const processedOrders = (data || []).map(order => {
        // Se está pendente e passou de 30 minutos, marcar como expirado
        if (order.status === "pending" && order.expired_at) {
          const expiredAt = new Date(order.expired_at);
          if (now > expiredAt) {
            return { ...order, status: "expired" };
          }
        }
        return order;
      });

      setOrders(processedOrders);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  // Verificar pagamentos pendentes automaticamente
  const checkPendingPayments = async () => {
    try {
      const pendingOrders = orders.filter(o => o.status === "pending");
      
      if (pendingOrders.length === 0) {
        setLastAutoCheck(new Date());
        loadOrders(); // Recarregar para pegar novos pedidos
        return;
      }

      console.log(`[AUTO-CHECK] Verificando ${pendingOrders.length} pedidos pendentes...`);
      
      for (const order of pendingOrders) {
        // Verificar se expirou (mais de 30 minutos)
        if (order.expired_at) {
          const expiredAt = new Date(order.expired_at);
          if (new Date() > expiredAt) {
            console.log(`[AUTO-CHECK] Pedido ${order.nsu_order} expirado`);
            continue;
          }
        }

        // Verificar pagamento
        try {
          const { data } = await supabase.functions.invoke("check-mro-payment", {
            body: { nsu_order: order.nsu_order }
          });

          if (data?.status === "completed" || data?.status === "paid") {
            console.log(`[AUTO-CHECK] Pagamento confirmado para ${order.nsu_order}`);
            toast.success(`Pagamento confirmado: ${order.username}`);
          }
        } catch (e) {
          console.error(`[AUTO-CHECK] Erro ao verificar ${order.nsu_order}:`, e);
        }
      }

      setLastAutoCheck(new Date());
      loadOrders();
    } catch (error) {
      console.error("[AUTO-CHECK] Erro:", error);
    }
  };

  const checkPayment = async (order: MROOrder) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-mro-payment", {
        body: { nsu_order: order.nsu_order }
      });

      if (error) {
        toast.error("Erro ao verificar pagamento");
        return;
      }

      if (data.status === "completed") {
        toast.success("Pagamento confirmado e acesso liberado!");
      } else if (data.status === "paid") {
        toast.info("Pagamento confirmado! Processando acesso...");
      } else {
        toast.info("Pagamento ainda não confirmado");
      }

      loadOrders();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao verificar");
    } finally {
      setLoading(false);
    }
  };

  const generateCopyMessage = (order: MROOrder) => {
    return `Obrigado por fazer parte do nosso sistema!✅

🚀🔥 *Ferramenta para Instagram Vip acesso!*

Preciso que assista os vídeos da área de membros com o link abaixo:

( ${MEMBER_LINK} ) 

1 - Acesse Área Membros

2 - Acesse ferramenta para instagram

Para acessar a ferramenta e área de membros, utilize os acessos:

*usuário:* ${order.username}

*senha:* ${order.username}

⚠ Assista todos os vídeos, por favor!

Participe também do nosso GRUPO DE AVISOS

${GROUP_LINK}`;
  };

  const copyToClipboard = async (order: MROOrder) => {
    const message = generateCopyMessage(order);
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Mensagem copiada para área de transferência!");
    } catch (e) {
      toast.error("Erro ao copiar");
    }
  };

  const deleteOrder = async (order: MROOrder) => {
    if (!confirm(`Tem certeza que deseja excluir o pedido de ${order.username}?`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from("mro_orders")
        .delete()
        .eq("id", order.id);

      if (error) {
        console.error("Error deleting order:", error);
        toast.error("Erro ao excluir pedido");
        return;
      }

      toast.success("Pedido excluído com sucesso!");
      loadOrders();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao excluir pedido");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Completo</Badge>;
      case "paid":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Pago</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      case "expired":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><AlertTriangle className="w-3 h-3 mr-1" /> Expirado</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30"><XCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.nsu_order.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.phone && order.phone.includes(searchTerm));
    
    const matchesFilter = filterStatus === "all" || order.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  // Agrupar pedidos por status
  const groupedOrders = {
    completed: filteredOrders.filter(o => o.status === "completed"),
    paid: filteredOrders.filter(o => o.status === "paid"),
    pending: filteredOrders.filter(o => o.status === "pending"),
    expired: filteredOrders.filter(o => o.status === "expired"),
  };

  // Calcular dias restantes (365 dias a partir do pagamento)
  const getDaysRemaining = (order: MROOrder) => {
    if (!order.paid_at) return null;
    const paidDate = new Date(order.paid_at);
    const expirationDate = addDays(paidDate, 365);
    const daysLeft = differenceInDays(expirationDate, new Date());
    return daysLeft > 0 ? daysLeft : 0;
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const saveAffiliateConfig = () => {
    setSavingAffiliate(true);
    try {
      localStorage.setItem("mro_affiliate_id", affiliateId.trim().toLowerCase());
      localStorage.setItem("mro_affiliate_email", affiliateEmail.trim());
      toast.success("Configuração de afiliado salva com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configuração");
    } finally {
      setSavingAffiliate(false);
    }
  };

  // Contar vendas por afiliado
  const affiliateSales = orders.filter(o => 
    (o.status === "paid" || o.status === "completed") && 
    o.email.toLowerCase().startsWith(`${affiliateId.toLowerCase()}:`)
  );
  const affiliateRevenue = affiliateSales.reduce((sum, o) => sum + Number(o.amount), 0);

  // Stats corrigidos - incluindo "paid" e "completed" como pagos
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    paid: orders.filter(o => o.status === "paid" || o.status === "completed").length,
    completed: orders.filter(o => o.status === "completed").length,
    expired: orders.filter(o => o.status === "expired").length,
    totalRevenue: orders.filter(o => o.status === "paid" || o.status === "completed").reduce((sum, o) => sum + Number(o.amount), 0)
  };

  // Renderizar card de pedido compacto
  const renderOrderCard = (order: MROOrder, compact = false) => {
    const daysRemaining = getDaysRemaining(order);
    
    return (
      <div 
        key={order.id} 
        className={`bg-zinc-800/30 border border-zinc-700/50 rounded-lg ${compact ? "p-3" : "p-4"}`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className={`flex-1 grid grid-cols-2 ${compact ? "md:grid-cols-5" : "md:grid-cols-5"} gap-3`}>
            <div>
              <div className="flex items-center gap-1 text-zinc-400 text-xs mb-0.5">
                <Mail className="w-3 h-3" /> Email
              </div>
              <p className="text-white text-xs font-medium truncate">{order.email}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-zinc-400 text-xs mb-0.5">
                <User className="w-3 h-3" /> Usuário
              </div>
              <p className="text-white text-xs font-mono">{order.username}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-zinc-400 text-xs mb-0.5">
                <Phone className="w-3 h-3" /> Celular
              </div>
              <p className="text-white text-xs">{order.phone || "-"}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-zinc-400 text-xs mb-0.5">
                <DollarSign className="w-3 h-3" /> Valor
              </div>
              <p className="text-white text-xs">R$ {Number(order.amount).toFixed(2)}</p>
            </div>
            {daysRemaining !== null && (
              <div>
                <div className="flex items-center gap-1 text-zinc-400 text-xs mb-0.5">
                  <Calendar className="w-3 h-3" /> Dias Restantes
                </div>
                <p className={`text-xs font-bold ${daysRemaining > 30 ? "text-green-400" : daysRemaining > 7 ? "text-yellow-400" : "text-red-400"}`}>
                  {daysRemaining} dias
                </p>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 flex-wrap">
            {(order.status === "completed" || order.status === "paid") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(order)}
                className="border-green-500/50 text-green-400 hover:bg-green-500/10 h-7 px-2 text-xs"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copiar
              </Button>
            )}
            
            {order.status === "pending" && (
              <Button
                size="sm"
                onClick={() => checkPayment(order)}
                className="bg-blue-500 hover:bg-blue-600 h-7 px-2 text-xs"
                disabled={loading}
              >
                Verificar
              </Button>
            )}
            
            {order.api_created && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs py-0.5">
                API ✓
              </Badge>
            )}
            
            {order.email_sent && (
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs py-0.5">
                Email ✓
              </Badge>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteOrder(order)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0"
              title="Excluir pedido"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        
        <div className="mt-2 pt-2 border-t border-zinc-700/30 flex items-center gap-3 text-[10px] text-zinc-500 flex-wrap">
          <span>NSU: {order.nsu_order}</span>
          <span className="text-blue-400">
            Cadastro: {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
          {order.paid_at && (
            <span className="text-green-500">
              Pago: {format(new Date(order.paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          )}
          {order.status === "pending" && order.expired_at && (
            <span className="text-yellow-500">
              Expira: {format(new Date(order.expired_at), "dd/MM HH:mm", { locale: ptBR })}
            </span>
          )}
          {order.status === "expired" && (
            <span className="text-red-400">
              Tentativa: {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Configuração das seções
  const sections = [
    { key: "completed", label: "Completos", color: "green", icon: CheckCircle, orders: groupedOrders.completed },
    { key: "paid", label: "Pagos", color: "blue", icon: CheckCircle, orders: groupedOrders.paid },
    { key: "pending", label: "Pendentes", color: "yellow", icon: Clock, orders: groupedOrders.pending },
    { key: "expired", label: "Expirados", color: "red", icon: AlertTriangle, orders: groupedOrders.expired },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-800/80 border-zinc-700">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>
            <CardTitle className="text-xl text-white">Admin MRO Instagram</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="bg-zinc-700/50 border-zinc-600 text-white"
                  required
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Senha"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="bg-zinc-700/50 border-zinc-600 text-white"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
                disabled={loginLoading}
              >
                {loginLoading ? <Loader2 className="animate-spin" /> : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin MRO Instagram</h1>
            <p className="text-zinc-400 text-sm">Gerenciamento de pedidos /instagram-nova</p>
            {lastAutoCheck && (
              <p className="text-zinc-500 text-xs mt-1">
                Última verificação: {format(lastAutoCheck, "HH:mm:ss", { locale: ptBR })}
                {autoCheckEnabled && " (auto: 30s)"}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAffiliateConfig(!showAffiliateConfig)}
              variant="outline"
              size="sm"
              className={`border-zinc-600 ${showAffiliateConfig ? "text-purple-400 border-purple-500/50" : "text-zinc-400"}`}
            >
              <Settings className="w-4 h-4 mr-1" />
              Afiliados
            </Button>
            <Button
              onClick={() => setAutoCheckEnabled(!autoCheckEnabled)}
              variant="outline"
              size="sm"
              className={`border-zinc-600 ${autoCheckEnabled ? "text-green-400 border-green-500/50" : "text-zinc-400"}`}
            >
              {autoCheckEnabled ? "Auto ✓" : "Auto ✗"}
            </Button>
            <Button
              onClick={() => { loadOrders(); checkPendingPayments(); }}
              variant="outline"
              className="border-zinc-600 text-zinc-300"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        {/* Configuração de Afiliados */}
        {showAffiliateConfig && (
          <Card className="bg-purple-500/10 border-purple-500/30 mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-purple-400 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Configuração de Afiliado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">Identificador do Afiliado</label>
                  <Input
                    placeholder="ex: mila"
                    value={affiliateId}
                    onChange={(e) => setAffiliateId(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-600 text-white"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Usado como prefixo no email: {affiliateId || "afiliado"}:email@exemplo.com
                  </p>
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">Email do Afiliado</label>
                  <Input
                    type="email"
                    placeholder="email@afiliado.com"
                    value={affiliateEmail}
                    onChange={(e) => setAffiliateEmail(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-600 text-white"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Email para contato/comissões
                  </p>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={saveAffiliateConfig}
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                    disabled={savingAffiliate}
                  >
                    {savingAffiliate ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar Configuração
                  </Button>
                </div>
              </div>

              {/* Stats do afiliado atual */}
              {affiliateId && (
                <div className="mt-4 pt-4 border-t border-purple-500/20">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-xs text-zinc-400">Vendas via "{affiliateId}"</p>
                      <p className="text-xl font-bold text-purple-400">{affiliateSales.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Receita Afiliado</p>
                      <p className="text-xl font-bold text-purple-400">R$ {affiliateRevenue.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Link da Promo</p>
                      <p className="text-sm text-purple-300 font-mono">/instagram-promo-{affiliateId}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardContent className="p-4">
              <p className="text-zinc-400 text-sm">Total</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="p-4">
              <p className="text-yellow-400 text-sm">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-4">
              <p className="text-blue-400 text-sm">Pagos</p>
              <p className="text-2xl font-bold text-blue-400">{stats.paid}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-4">
              <p className="text-green-400 text-sm">Completos</p>
              <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-4">
              <p className="text-red-400 text-sm">Expirados</p>
              <p className="text-2xl font-bold text-red-400">{stats.expired}</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-4">
              <p className="text-amber-400 text-sm">Receita</p>
              <p className="text-2xl font-bold text-amber-400">R$ {stats.totalRevenue.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Buscar por email, usuário, telefone ou NSU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "pending", "paid", "completed", "expired"].map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(status as typeof filterStatus)}
                className={filterStatus === status 
                  ? "bg-amber-500 text-black" 
                  : "border-zinc-600 text-zinc-300"
                }
              >
                {status === "all" ? "Todos" : status === "pending" ? "Pendentes" : status === "paid" ? "Pagos" : status === "completed" ? "Completos" : "Expirados"}
              </Button>
            ))}
          </div>
        </div>

        {/* Orders List - Collapsible Sections */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardContent className="p-8 text-center">
              <p className="text-zinc-400">Nenhum pedido encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sections.map(({ key, label, color, icon: Icon, orders: sectionOrders }) => {
              if (sectionOrders.length === 0) return null;
              
              const isOpen = openSections[key];
              const colorClasses: Record<string, string> = {
                green: "bg-green-500/10 border-green-500/40 hover:bg-green-500/20",
                blue: "bg-blue-500/10 border-blue-500/40 hover:bg-blue-500/20",
                yellow: "bg-yellow-500/10 border-yellow-500/40 hover:bg-yellow-500/20",
                red: "bg-red-500/10 border-red-500/40 hover:bg-red-500/20",
              };
              const textClasses: Record<string, string> = {
                green: "text-green-400",
                blue: "text-blue-400",
                yellow: "text-yellow-400",
                red: "text-red-400",
              };
              
              return (
                <Collapsible key={key} open={isOpen} onOpenChange={() => toggleSection(key)}>
                  <CollapsibleTrigger asChild>
                    <div 
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${colorClasses[color]}`}
                    >
                      <div className="flex items-center gap-3">
                        {isOpen ? (
                          <ChevronDown className={`w-5 h-5 ${textClasses[color]}`} />
                        ) : (
                          <ChevronRight className={`w-5 h-5 ${textClasses[color]}`} />
                        )}
                        <Icon className={`w-5 h-5 ${textClasses[color]}`} />
                        <span className={`font-semibold ${textClasses[color]}`}>{label}</span>
                        <Badge className={`${colorClasses[color]} ${textClasses[color]} border-none`}>
                          {sectionOrders.length}
                        </Badge>
                      </div>
                      <span className="text-zinc-400 text-sm">
                        {isOpen ? "Clique para ocultar" : "Clique para expandir"}
                      </span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 space-y-2 pl-2 border-l-2 border-zinc-700/50 ml-4">
                      {sectionOrders.map((order) => renderOrderCard(order, true))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}