import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  CreditCard, 
  LogOut, 
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  RefreshCw,
  ExternalLink,
  Save,
  RotateCcw,
  Mail,
  Phone,
  Calendar
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  subscription_start: string;
  subscription_end: string;
  created_at: string;
  ads_client_data?: {
    niche: string;
    region: string;
    instagram: string;
    whatsapp: string;
    telegram_group: string;
    logo_url: string;
    observations: string;
    sales_page_url: string;
  }[];
  ads_orders?: {
    id: string;
    amount: number;
    status: string;
    paid_at: string;
    created_at: string;
  }[];
  ads_balance_orders?: {
    id: string;
    amount: number;
    leads_quantity: number;
    status: string;
    paid_at: string;
    created_at: string;
  }[];
}

interface Order {
  id: string;
  email: string;
  name: string;
  amount: number;
  status: string;
  paid_at: string | null;
  expired_at: string | null;
  created_at: string;
  infinitepay_link: string;
}

const AdsNewsAdmin = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [salesPageUrl, setSalesPageUrl] = useState("");
  const [savingUrl, setSavingUrl] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastVerification, setLastVerification] = useState<Date | null>(null);

  useEffect(() => {
    const storedAdmin = localStorage.getItem('ads_admin');
    if (storedAdmin) {
      setIsAdmin(true);
      loadAllData();
    } else {
      setLoading(false);
    }
  }, []);

  // Auto-refresh orders every 4 seconds
  useEffect(() => {
    if (!isAdmin) return;

    const interval = setInterval(() => {
      loadOrders();
      setLastVerification(new Date());
    }, 4000);

    return () => clearInterval(interval);
  }, [isAdmin]);

  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) {
      toast({
        title: "Erro",
        description: "Preencha email e senha",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ads-auth', {
        body: { 
          action: 'admin-login', 
          email: loginData.email, 
          password: loginData.password 
        }
      });

      if (error) throw error;

      if (data.success) {
        localStorage.setItem('ads_admin', JSON.stringify(data.admin));
        setIsAdmin(true);
        await loadAllData();
        toast({
          title: "Login realizado!",
          description: `Bem-vindo, ${data.admin.name || 'Admin'}`
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Credenciais inválidas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ads_admin');
    setIsAdmin(false);
  };

  const loadAllData = async () => {
    await Promise.all([loadUsers(), loadOrders()]);
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ads-auth', {
        body: { action: 'get-all-users' }
      });

      if (error) throw error;
      setUsers(data.users || []);
    } catch (error) {
      console.error('Load users error:', error);
    }
  };

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ads-auth', {
        body: { action: 'get-all-orders' }
      });

      if (error) throw error;
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Load orders error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
    toast({ title: "Dados atualizados!" });
  };

  const handleMarkAsPaid = async (orderId: string) => {
    try {
      const { error } = await supabase.functions.invoke('ads-auth', {
        body: { action: 'update-order-status', orderId, status: 'paid' }
      });

      if (error) throw error;
      
      await loadAllData();
      toast({ title: "Pedido marcado como pago!" });
    } catch (error) {
      console.error('Update order error:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar pedido",
        variant: "destructive"
      });
    }
  };

  const handleMarkAsExpired = async (orderId: string) => {
    try {
      const { error } = await supabase.functions.invoke('ads-auth', {
        body: { action: 'update-order-status', orderId, status: 'expired' }
      });

      if (error) throw error;
      
      await loadAllData();
      toast({ title: "Pedido marcado como expirado!" });
    } catch (error) {
      console.error('Update order error:', error);
    }
  };

  const handleSaveSalesPage = async () => {
    if (!selectedUser || !salesPageUrl) return;

    setSavingUrl(true);
    try {
      const { error } = await supabase.functions.invoke('ads-auth', {
        body: { 
          action: 'save-sales-page', 
          userId: selectedUser.id, 
          salesPageUrl 
        }
      });

      if (error) throw error;
      
      await loadUsers();
      toast({ title: "URL salva com sucesso!" });
    } catch (error) {
      console.error('Save URL error:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar URL",
        variant: "destructive"
      });
    } finally {
      setSavingUrl(false);
    }
  };

  const handleEnableRenewal = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('ads-auth', {
        body: { action: 'enable-renewal', userId }
      });

      if (error) throw error;
      
      await loadUsers();
      toast({ title: "Renovação habilitada!" });
    } catch (error) {
      console.error('Enable renewal error:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Pago</Badge>;
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Ativo</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case 'expired':
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" /> Expirado</Badge>;
      case 'renewal_pending':
        return <Badge className="bg-orange-500"><RotateCcw className="h-3 w-3 mr-1" /> Renovação</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <img src="/ads-news-full.png" alt="Ads News" className="h-12 mx-auto mb-4" />
            <CardTitle className="text-white">Admin Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-300">Email</Label>
              <Input
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                placeholder="admin@email.com"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Senha</Label>
              <Input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                placeholder="Sua senha"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleLogin}
            >
              Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/ads-news-full.png" alt="Ads News" className="h-10" />
            {lastVerification && (
              <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-900 px-3 py-1.5 rounded-lg">
                <RefreshCw className="h-3 w-3 text-green-400 animate-spin" />
                <span>Última verificação: <span className="text-green-400 font-medium">{lastVerification.toLocaleTimeString('pt-BR')}</span></span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-300">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="orders">
          <TabsList className="bg-gray-800 mb-6">
            <TabsTrigger value="orders" className="data-[state=active]:bg-blue-600">
              <CreditCard className="h-4 w-4 mr-2" />
              Pedidos ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-blue-600">
              <Users className="h-4 w-4 mr-2" />
              Usuários ({users.length})
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="grid gap-4">
              {orders.map((order) => (
                <Card key={order.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{order.name}</span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-gray-400 flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {order.email}
                        </p>
                        <p className="text-gray-500 text-sm">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {new Date(order.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-400">
                          R$ {order.amount.toFixed(2)}
                        </p>
                        {order.status === 'pending' && (
                          <div className="flex gap-2 mt-2">
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleMarkAsPaid(order.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Marcar Pago
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleMarkAsExpired(order.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Expirar
                            </Button>
                          </div>
                        )}
                        {order.infinitepay_link && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-2 border-gray-600"
                            onClick={() => window.open(order.infinitepay_link, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Ver Link
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {orders.length === 0 && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-8 text-center text-gray-400">
                    Nenhum pedido encontrado
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              {users.map((user) => (
                <Card 
                  key={user.id} 
                  className={`bg-gray-800 border-gray-700 cursor-pointer transition-colors ${
                    selectedUser?.id === user.id ? 'border-blue-500' : ''
                  }`}
                  onClick={() => {
                    setSelectedUser(user);
                    setSalesPageUrl(user.ads_client_data?.[0]?.sales_page_url || "");
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{user.name}</h3>
                        <p className="text-gray-400 text-sm">{user.email}</p>
                        {user.phone && (
                          <p className="text-gray-500 text-sm flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(user.status)}
                    </div>

                    {user.ads_client_data?.[0] && (
                      <div className="bg-gray-900 rounded p-3 mb-3 text-sm">
                        <p><strong>Nicho:</strong> {user.ads_client_data[0].niche || 'Não informado'}</p>
                        <p><strong>Região:</strong> {user.ads_client_data[0].region || 'Não informada'}</p>
                        <p><strong>WhatsApp:</strong> {user.ads_client_data[0].whatsapp || 'Não informado'}</p>
                        <p><strong>Instagram:</strong> {user.ads_client_data[0].instagram || 'Não informado'}</p>
                        {user.ads_client_data[0].telegram_group && (
                          <p><strong>Telegram:</strong> {user.ads_client_data[0].telegram_group}</p>
                        )}
                        {user.ads_client_data[0].observations && (
                          <p className="mt-2"><strong>Obs:</strong> {user.ads_client_data[0].observations}</p>
                        )}
                        {user.ads_client_data[0].logo_url && (
                          <a 
                            href={user.ads_client_data[0].logo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline mt-2 inline-block"
                          >
                            Ver Logo
                          </a>
                        )}
                      </div>
                    )}

                    {user.subscription_end && (
                      <p className="text-xs text-gray-500">
                        Expira: {new Date(user.subscription_end).toLocaleDateString('pt-BR')}
                      </p>
                    )}

                    <div className="flex gap-2 mt-3">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-gray-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(user);
                          setSalesPageUrl(user.ads_client_data?.[0]?.sales_page_url || "");
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                      {user.status === 'active' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-orange-500 text-orange-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEnableRenewal(user.id);
                          }}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Habilitar Renovação
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* User Details Panel */}
            {selectedUser && (
              <Card className="bg-gray-800 border-gray-700 mt-6">
                <CardHeader>
                  <CardTitle>Gerenciar: {selectedUser.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">URL da Página de Vendas</Label>
                    <div className="flex gap-2">
                      <Input
                        value={salesPageUrl}
                        onChange={(e) => setSalesPageUrl(e.target.value)}
                        placeholder="https://sua-pagina.com/cliente"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                      <Button 
                        onClick={handleSaveSalesPage}
                        disabled={savingUrl}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {savingUrl ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Balance Orders */}
                  {selectedUser.ads_balance_orders && selectedUser.ads_balance_orders.length > 0 && (
                    <div>
                      <Label className="text-gray-300 mb-2 block">Pedidos de Saldo</Label>
                      <div className="space-y-2">
                        {selectedUser.ads_balance_orders.map((order) => (
                          <div 
                            key={order.id}
                            className="flex justify-between items-center bg-gray-900 p-3 rounded"
                          >
                            <div>
                              <p className="font-medium">R$ {order.amount.toFixed(2)}</p>
                              <p className="text-sm text-gray-400">{order.leads_quantity} leads</p>
                            </div>
                            {getStatusBadge(order.status)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdsNewsAdmin;
