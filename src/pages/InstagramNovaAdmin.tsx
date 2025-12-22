import { useState, useEffect } from "react";
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
  DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ADMIN_EMAIL = "mro@gmail.com";
const ADMIN_PASSWORD = "Ga145523@";

interface MROOrder {
  id: string;
  email: string;
  username: string;
  plan_type: string;
  amount: number;
  status: string;
  nsu_order: string;
  infinitepay_link: string | null;
  api_created: boolean | null;
  email_sent: boolean | null;
  paid_at: string | null;
  completed_at: string | null;
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
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "paid" | "completed">("all");

  // Check if already authenticated
  useEffect(() => {
    const auth = localStorage.getItem("mro_admin_auth");
    if (auth === "true") {
      setIsAuthenticated(true);
      loadOrders();
    }
  }, []);

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

      setOrders(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Completo</Badge>;
      case "paid":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Pago</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30"><XCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.nsu_order.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === "all" || order.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    paid: orders.filter(o => o.status === "paid").length,
    completed: orders.filter(o => o.status === "completed").length,
    totalRevenue: orders.filter(o => o.status === "completed").reduce((sum, o) => sum + Number(o.amount), 0)
  };

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
          </div>
          <div className="flex gap-2">
            <Button
              onClick={loadOrders}
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
              placeholder="Buscar por email, usuário ou NSU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
            />
          </div>
          <div className="flex gap-2">
            {["all", "pending", "paid", "completed"].map((status) => (
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
                {status === "all" ? "Todos" : status === "pending" ? "Pendentes" : status === "paid" ? "Pagos" : "Completos"}
              </Button>
            ))}
          </div>
        </div>

        {/* Orders List */}
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
            {filteredOrders.map((order) => (
              <Card key={order.id} className="bg-zinc-800/50 border-zinc-700">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="flex items-center gap-1 text-zinc-400 text-xs mb-1">
                          <Mail className="w-3 h-3" /> Email
                        </div>
                        <p className="text-white text-sm font-medium truncate">{order.email}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-zinc-400 text-xs mb-1">
                          <User className="w-3 h-3" /> Usuário/Senha
                        </div>
                        <p className="text-white text-sm font-mono">{order.username}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-zinc-400 text-xs mb-1">
                          <DollarSign className="w-3 h-3" /> Plano/Valor
                        </div>
                        <p className="text-white text-sm">
                          {order.plan_type === "annual" ? "Anual" : "Vitalício"} - R$ {Number(order.amount).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-zinc-400 text-xs mb-1">
                          <Calendar className="w-3 h-3" /> Data
                        </div>
                        <p className="text-white text-sm">
                          {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {getStatusBadge(order.status)}
                      
                      {order.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => checkPayment(order)}
                          className="bg-blue-500 hover:bg-blue-600"
                          disabled={loading}
                        >
                          Verificar
                        </Button>
                      )}
                      
                      {order.api_created && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          API ✓
                        </Badge>
                      )}
                      
                      {order.email_sent && (
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                          Email ✓
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-zinc-700/50 flex items-center gap-4 text-xs text-zinc-500">
                    <span>NSU: {order.nsu_order}</span>
                    {order.paid_at && (
                      <span>Pago: {format(new Date(order.paid_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                    )}
                    {order.completed_at && (
                      <span>Completo: {format(new Date(order.completed_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
