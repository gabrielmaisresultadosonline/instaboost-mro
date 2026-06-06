import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Trash2, 
  UserCheck, 
  Lock, 
  Mail, 
  ShieldCheck,
  LayoutDashboard,
  Users,
  Search
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { trackPurchase } from "@/lib/facebookTracking";

export default function VenderAdmin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminAuth, setAdminAuth] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ pendente: 0, pago: 0, expirado: 0 });
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: usersData, error } = await supabase
        .from('vender_usuarios')
        .select('*, vender_pagamentos(*)');

      if (error) throw error;
      setUsers(usersData || []);

      const s = { pendente: 0, pago: 0, expirado: 0 };
      usersData?.forEach(u => {
        const status = u.vender_pagamentos?.[0]?.status || 'pendente';
        if (status === 'pago') s.pago++;
        else if (status === 'expirado') s.expirado++;
        else s.pendente++;
      });
      setStats(s);
    } catch (err) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = () => {
      const saved = localStorage.getItem('vender_admin_auth');
      if (saved === 'true') {
        setIsLoggedIn(true);
        fetchData();
      } else {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminAuth.email === 'mro@gmail.com' && adminAuth.password === 'Ga145523@') {
      setIsLoggedIn(true);
      localStorage.setItem('vender_admin_auth', 'true');
      fetchData();
      toast.success("Acesso administrativo autorizado");
    } else {
      toast.error("Credenciais inválidas");
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const { error: uError } = await supabase
        .from('vender_usuarios')
        .update({ acesso_liberado: true })
        .eq('id', userId);
      
      if (uError) throw uError;

      const { error: pError } = await supabase
        .from('vender_pagamentos')
        .update({ status: 'pago' })
        .eq('usuario_id', userId);

      if (pError) throw pError;

      toast.success("Acesso liberado manualmente!");
      fetchData();
    } catch (err) {
      toast.error("Erro ao aprovar");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Tem certeza que deseja deletar este usuário?")) return;
    try {
      const { error } = await supabase.from('vender_usuarios').delete().eq('id', userId);
      if (error) throw error;
      toast.success("Usuário removido");
      fetchData();
    } catch (err) {
      toast.error("Erro ao deletar");
    }
  };

  const filteredUsers = users.filter(u => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.whatsapp.includes(searchTerm)
  );

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-white shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center mb-2">
              <Logo size="lg" />
            </div>
            <CardTitle className="text-2xl font-black italic uppercase">Painel de Controle</CardTitle>
            <CardDescription className="text-gray-400">Restrito para administradores MRO</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-yellow-500" /> E-mail Admin
                </label>
                <Input 
                  type="email" 
                  className="bg-black border-zinc-800 focus:border-yellow-500 h-12" 
                  value={adminAuth.email}
                  onChange={e => setAdminAuth({...adminAuth, email: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4 text-yellow-500" /> Senha
                </label>
                <Input 
                  type="password" 
                  className="bg-black border-zinc-800 focus:border-yellow-500 h-12" 
                  value={adminAuth.password}
                  onChange={e => setAdminAuth({...adminAuth, password: e.target.value})}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-black h-12 uppercase italic">
                Acessar Administração
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center">
              <LayoutDashboard className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase">Vender na Internet</h1>
              <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Painel Administrativo v1.0</p>
            </div>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <Button onClick={fetchData} variant="outline" className="gap-2 border-zinc-800 hover:bg-zinc-900 font-bold flex-1 md:flex-none h-12">
              <RefreshCw className={loading ? "animate-spin w-4 h-4" : "w-4 h-4"} /> Atualizar
            </Button>
            <Button variant="ghost" className="text-red-500 font-bold h-12" onClick={() => {
              localStorage.removeItem('vender_admin_auth');
              setIsLoggedIn(false);
            }}>Sair</Button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-12">
          <Card className="bg-zinc-900/50 border-zinc-800 text-white backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> Acessos Pagos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl md:text-5xl font-black text-green-500 italic">{stats.pago}</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800 text-white backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" /> Aguardando
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl md:text-5xl font-black text-yellow-500 italic">{stats.pendente}</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800 text-white backdrop-blur-sm col-span-2 md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" /> Expirados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl md:text-5xl font-black text-red-500 italic">{stats.expirado}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-zinc-800 bg-zinc-950/50 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="text-yellow-500 w-5 h-5" />
              <h2 className="font-black italic uppercase">Gestão de Usuários</h2>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input 
                placeholder="Buscar por nome, e-mail ou whats..." 
                className="pl-10 bg-black border-zinc-800 focus:border-yellow-500 h-11 text-sm rounded-xl"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-gray-500 text-[10px] uppercase font-black tracking-widest">
                <tr>
                  <th className="px-6 py-5">Perfil do Usuário</th>
                  <th className="px-6 py-5">WhatsApp</th>
                  <th className="px-6 py-5">Status Financeiro</th>
                  <th className="px-6 py-5">Data</th>
                  <th className="px-6 py-5 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredUsers.map(u => {
                  const status = u.vender_pagamentos?.[0]?.status || 'pendente';
                  return (
                    <tr key={u.id} className="hover:bg-zinc-950/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center font-black text-yellow-500">
                            {u.nome.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-yellow-500 transition-colors">{u.nome}</div>
                            <div className="text-xs text-gray-500 font-medium">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="border-zinc-700 text-gray-400 font-mono">
                          {u.whatsapp}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge 
                          variant={status === 'pago' ? 'default' : (status === 'pendente' ? 'secondary' : 'destructive')} 
                          className={`gap-1 px-3 py-1 font-black italic rounded-lg ${
                            status === 'pago' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                            status === 'pendente' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 
                            'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}
                        >
                          {status === 'pago' && <CheckCircle className="w-3 h-3" />}
                          {status === 'pendente' && <Clock className="w-3 h-3" />}
                          {status === 'expirado' && <XCircle className="w-3 h-3" />}
                          {status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-600">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {status !== 'pago' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-green-500 border-green-500/20 hover:bg-green-500/10 hover:border-green-500 h-9 px-4 rounded-xl font-bold gap-2" 
                              onClick={() => handleApprove(u.id)}
                            >
                              <UserCheck className="w-4 h-4" /> Aprovar
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-500 border-red-500/20 hover:bg-red-500/10 hover:border-red-500 h-9 w-9 rounded-xl" 
                            onClick={() => handleDelete(u.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center">
                          <Search className="text-gray-700 w-8 h-8" />
                        </div>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Nenhum registro encontrado</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="mt-12 text-center text-gray-700 text-xs font-bold uppercase tracking-widest">
          <ShieldCheck className="inline-block mr-2 w-4 h-4" /> Sistema de Segurança MRO Ativo
        </footer>
      </div>
    </div>
  );
}
