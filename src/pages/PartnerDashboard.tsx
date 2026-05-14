import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Lock, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Phone,
  User,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Eye,
  ArrowUpRight,
  ArrowRight,
  LayoutDashboard,
  Users,
  Settings,
  CreditCard,
  QrCode,
  MessageCircle,
  LogOut,
  Calendar,
  Globe,
  Copy,
  Sparkles
} from "lucide-react";
import { format, subDays, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Order {
  id: string;
  email: string;
  username: string;
  phone: string | null;
  amount: number;
  status: string;
  created_at: string;
  payment_method: string | null;
}

interface TrialUser {
  id: string;
  email: string;
  username: string;
  password: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface Partner {
  id: string;
  name: string;
  slug: string;
  pix_key: string | null;
  whatsapp: string | null;
  password?: string | null;
}

const PartnerDashboard = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [partner, setPartner] = useState<Partner | null>(null);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [visitsCount, setVisitsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [trials, setTrials] = useState<TrialUser[]>([]);
  
  // Trial creation state
  const [isCreatingTrial, setIsCreatingTrial] = useState(false);
  const [newTrial, setNewTrial] = useState({ email: '', username: '', password: '' });
  const [trialLoading, setTrialLoading] = useState(false);
  
  // Settings edit mode
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editedSettings, setEditedSettings] = useState({ pix_key: '', whatsapp: '' });

  useEffect(() => {
    const checkAuth = async () => {
      const storedAuth = sessionStorage.getItem(`partner_auth_${slug}`);
      if (storedAuth === "true") {
        fetchPartnerData();
      } else {
        setLoading(false);
      }
    };
    checkAuth();
  }, [slug]);

  const fetchPartnerData = async () => {
    setLoading(true);
    try {
      // Fetch partner info
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('*')
        .eq('slug', slug)
        .single();

      if (partnerError || !partnerData) {
        toast({ title: "Parceiro não encontrado", variant: "destructive" });
        return;
      }

      setPartner(partnerData);
      setEditedSettings({ 
        pix_key: partnerData.pix_key || '', 
        whatsapp: partnerData.whatsapp || '' 
      });
      setIsAuthenticated(true);
      sessionStorage.setItem(`partner_auth_${slug}`, "true");

      // Fetch visits
      const { count: vCount } = await supabase
        .from('partner_visits')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerData.id);
      
      setVisitsCount(vCount || 0);

      // Fetch orders (Sales + Leads)
      // Attribution by partner_id OR email prefix
      const { data: ordersData, error: ordersError } = await supabase
        .from('mro_orders')
        .select('*')
        .or(`partner_id.eq.${partnerData.id},email.ilike.${slug}:%`)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // Fetch trials
      const { data: trialsData } = await supabase
        .from('trial_users')
        .select('*')
        .eq('partner_id', partnerData.id)
        .order('created_at', { ascending: false });
      
      setTrials(trialsData || []);

    } catch (error: any) {
      console.error(error);
      toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const { data, error } = await supabase
        .from('partners')
        .select('id, password')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        toast({ title: "Parceiro não encontrado", variant: "destructive" });
        return;
      }

      if (data.password === password) {
        fetchPartnerData();
      } else {
        toast({ title: "Senha incorreta", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro no login", variant: "destructive" });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    if (!partner) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('partners')
        .update({
          pix_key: editedSettings.pix_key,
          whatsapp: editedSettings.whatsapp
        })
        .eq('id', partner.id);

      if (error) throw error;
      
      setPartner({ ...partner, ...editedSettings });
      setIsEditingSettings(false);
      toast({ title: "Configurações atualizadas!" });
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(`partner_auth_${slug}`);
    setIsAuthenticated(false);
    setPartner(null);
  };

  if (loading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black uppercase tracking-tighter">Área de Parceiro Oficial</CardTitle>
            <p className="text-zinc-400 text-sm mt-2">Acesse seu dashboard de resultados</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-zinc-500">Senha de Acesso</label>
                <Input
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white h-12 text-center text-lg"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black h-12 uppercase"
                disabled={loginLoading}
              >
                {loginLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Entrar no Painel
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Stats Calculations
  const paidOrders = orders.filter(o => o.status === 'paid');
  const pendingOrders = orders.filter(o => o.status === 'pending');
  
  const totalSales = paidOrders.length;
  const totalLeads = pendingOrders.length;
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.amount), 0);
  
  // Commission logic: R$ 297 per sale (approx 70% of R$ 397)
  const totalCommission = paidOrders.length * 297;
  
  // Annual Revenue (Sales in current year)
  const currentYear = new Date().getFullYear();
  const annualSales = paidOrders.filter(o => new Date(o.created_at).getFullYear() === currentYear);
  const annualRevenue = annualSales.length * 397;
  const annualCommission = annualSales.length * 297;

  // Receivables logic
  // PIX = 1 day, Card = 8 days
  // For simplicity, we show current balance estimates
  const pixReceivables = paidOrders
    .filter(o => o.payment_method === 'pix')
    .reduce((sum, o) => sum + Number(o.amount) * 0.7, 0);
    
  const cardReceivables = paidOrders
    .filter(o => o.payment_method !== 'pix') // assuming card if not pix
    .reduce((sum, o) => sum + Number(o.amount) * 0.7, 0);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center font-black text-xl">
              {partner?.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter">
                Dashboard <span className="text-primary">Oficial</span>
              </h1>
              <p className="text-zinc-500 text-sm font-medium">Bem-vindo, {partner?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchPartnerData()} className="bg-zinc-900 border-zinc-800 gap-2">
              <RefreshCw size={14} /> Atualizar
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} className="text-zinc-500 hover:text-white gap-2">
              <LogOut size={14} /> Sair
            </Button>
          </div>
        </div>

        {/* Links de Divulgação - Main Card */}
        <Card className="bg-gradient-to-br from-zinc-900 to-black border-yellow-500/30 text-white overflow-hidden shadow-[0_0_20px_rgba(234,179,8,0.1)]">
          <CardHeader className="border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <ArrowUpRight size={16} className="text-yellow-500" /> Seu Link de Divulgação Oficial
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Sua Página de Vendas</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">
                      <Globe size={14} />
                    </div>
                    <Input readOnly value={`${window.location.origin}/instagram-nova?p=${slug}`} className="bg-zinc-800/50 border-zinc-700 text-xs h-11 pl-10" />
                  </div>
                  <Button variant="outline" className="h-11 px-6 gap-2 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700 font-bold" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/instagram-nova?p=${slug}`);
                    toast({ title: "Link copiado!" });
                  }}>
                    <Copy size={14} /> Copiar Link de Vendas
                  </Button>
                </div>
                <p className="text-xs text-zinc-400 italic">Este é o seu link exclusivo. Todas as vendas realizadas através dele garantem sua comissão de R$ 297,00.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-2">
                <Eye className="text-zinc-500" size={20} />
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-zinc-500 border-zinc-800">Site</Badge>
              </div>
              <p className="text-3xl font-black">{visitsCount}</p>
              <p className="text-xs text-zinc-500 font-bold uppercase mt-1">Visitas Totais</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardContent className="p-4 text-center">
              <div className="flex justify-between items-start mb-2">
                <Users className="text-zinc-500" size={20} />
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-zinc-500 border-zinc-800">Attempts</Badge>
              </div>
              <p className="text-3xl font-black">{totalLeads}</p>
              <p className="text-xs text-zinc-500 font-bold uppercase mt-1">Tentativas (Leads)</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-2">
                <CheckCircle className="text-green-500" size={20} />
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-green-500/50 border-green-500/10">Vendas</Badge>
              </div>
              <p className="text-3xl font-black">{totalSales}</p>
              <p className="text-xs text-zinc-500 font-bold uppercase mt-1">Vendas Concluídas</p>
            </CardContent>
          </Card>

          <Card className="bg-primary border-none text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-2">
                <DollarSign size={20} />
                <Badge variant="outline" className="text-[10px] uppercase font-bold bg-white/10 border-white/20">Receber</Badge>
              </div>
              <p className="text-3xl font-black">R$ {totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs opacity-80 font-bold uppercase mt-1">Comissão Acumulada</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left: Orders and Leads */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Annual Sales Summary */}
            <Card className="bg-zinc-900 border-zinc-800 text-white overflow-hidden">
              <CardHeader className="border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={16} className="text-primary" /> Faturamento Anual {currentYear}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <p className="text-sm text-zinc-500 font-bold uppercase mb-1">Total Vendido</p>
                    <p className="text-4xl font-black">R$ {annualRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <div className="mt-4 flex items-center gap-2 text-zinc-400 text-xs">
                      <TrendingUp size={14} className="text-green-500" />
                      <span>Progresso baseado nas vendas oficiais</span>
                    </div>
                  </div>
                  <div className="bg-zinc-800/30 rounded-2xl p-6 border border-zinc-800/50">
                    <p className="text-xs text-zinc-500 font-bold uppercase mb-2">Sua Parte Líquida (R$ 297 por venda)</p>
                    <p className="text-2xl font-black text-primary">R$ {annualCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-zinc-500 mt-2">* Taxa de plataforma 30% já descontada</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sales List */}
            <Card className="bg-zinc-900 border-zinc-800 text-white">
              <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800">
                <CardTitle className="text-lg font-black uppercase tracking-tighter">Vendas Concluídas</CardTitle>
                <Badge className="bg-green-500">{paidOrders.length}</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-zinc-500 font-bold uppercase text-[10px] border-b border-zinc-800">
                        <th className="px-6 py-4">Cliente / User</th>
                        <th className="px-6 py-4">Valor</th>
                        <th className="px-6 py-4">Pagamento</th>
                        <th className="px-6 py-4">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {paidOrders.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-10 text-center text-zinc-500">Nenhuma venda realizada ainda.</td>
                        </tr>
                      ) : (
                        paidOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold">@{order.username}</div>
                              <div className="text-[10px] text-zinc-500 truncate max-w-[150px]">{order.email.split(':').pop()}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-green-400 font-black">R$ {Number(order.amount).toFixed(2)}</div>
                              <div className="text-[10px] text-zinc-500">Comissão: R$ {(Number(order.amount) * 0.7).toFixed(2)}</div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className="bg-zinc-800 border-zinc-700 text-[10px] uppercase font-bold">
                                {order.payment_method === 'pix' ? 'PIX' : 'Cartão'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-xs text-zinc-400">
                              {format(new Date(order.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Leads / Remarketing List */}
            <Card className="bg-zinc-900 border-zinc-800 text-white">
              <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800">
                <CardTitle className="text-lg font-black uppercase tracking-tighter">Lista de Remarketing (Leads)</CardTitle>
                <Badge className="bg-zinc-800 border-zinc-700">{pendingOrders.length}</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-zinc-500 font-bold uppercase text-[10px] border-b border-zinc-800">
                        <th className="px-6 py-4">Contato</th>
                        <th className="px-6 py-4">Data Tentativa</th>
                        <th className="px-6 py-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {pendingOrders.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-10 text-center text-zinc-500">Nenhuma tentativa registrada.</td>
                        </tr>
                      ) : (
                        pendingOrders.map((lead) => (
                          <tr key={lead.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold">@{lead.username}</div>
                              <div className="text-[10px] text-zinc-500 truncate max-w-[200px]">{lead.email.split(':').pop()}</div>
                              {lead.phone && <div className="text-[10px] text-primary mt-0.5">{lead.phone}</div>}
                            </td>
                            <td className="px-6 py-4 text-xs text-zinc-400">
                              {format(new Date(lead.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {lead.phone && (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => window.open(`https://wa.me/55${lead.phone.replace(/\D/g, '')}`, '_blank')}>
                                  <MessageCircle size={18} />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar: Payouts and Settings */}
          <div className="space-y-8">
            
            {/* Payout Information */}
            <Card className="bg-zinc-900 border-zinc-800 text-white">
              <CardHeader className="border-b border-zinc-800">
                <CardTitle className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                  <CreditCard size={18} className="text-primary" /> Recebíveis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold uppercase text-zinc-500">
                    <span>Vendas no PIX</span>
                    <span className="text-green-500">1 Dia Útil</span>
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-4 flex justify-between items-center">
                    <span className="text-sm font-bold">R$ {pixReceivables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <QrCode size={20} className="text-zinc-600" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold uppercase text-zinc-500">
                    <span>Vendas no Cartão</span>
                    <span className="text-amber-500">8 Dias Úteis</span>
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-4 flex justify-between items-center">
                    <span className="text-sm font-bold">R$ {cardReceivables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <CreditCard size={20} className="text-zinc-600" />
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800">
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    * Os valores acima são estimativas baseadas nas vendas confirmadas. O recebimento oficial segue os prazos das adquirentes.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Settings Card */}
            <Card className="bg-zinc-900 border-zinc-800 text-white">
              <CardHeader className="border-b border-zinc-800">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                    <Settings size={18} className="text-zinc-500" /> Configurações
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setIsEditingSettings(!isEditingSettings)}>
                    <Settings size={16} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-800">
                  <p className="text-xs text-zinc-400 leading-relaxed italic">
                    Utilize o card de links acima para copiar seus links de divulgação e começar a vender agora mesmo!
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-500">Chave PIX</label>
                  {isEditingSettings ? (
                    <Input 
                      value={editedSettings.pix_key} 
                      onChange={(e) => setEditedSettings({...editedSettings, pix_key: e.target.value})} 
                      className="bg-zinc-800 border-zinc-700 text-sm h-9" 
                    />
                  ) : (
                    <p className="text-sm font-bold bg-zinc-800/50 p-2 rounded-lg border border-zinc-800">{partner?.pix_key || 'Não cadastrado'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-500">WhatsApp</label>
                  {isEditingSettings ? (
                    <Input 
                      value={editedSettings.whatsapp} 
                      onChange={(e) => setEditedSettings({...editedSettings, whatsapp: e.target.value})} 
                      className="bg-zinc-800 border-zinc-700 text-sm h-9" 
                    />
                  ) : (
                    <p className="text-sm font-bold bg-zinc-800/50 p-2 rounded-lg border border-zinc-800">{partner?.whatsapp || 'Não cadastrado'}</p>
                  )}
                </div>

                {isEditingSettings && (
                  <Button onClick={handleUpdateSettings} className="w-full h-9 text-xs font-bold" disabled={loading}>
                    {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : "Salvar Configurações"}
                  </Button>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboard;
