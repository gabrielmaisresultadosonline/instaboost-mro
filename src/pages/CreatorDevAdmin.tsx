import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MessageSquare, Phone, User, Calendar, Trash2, Settings, Save } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CreatorDevAdmin = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    const auth = sessionStorage.getItem('creatordev_admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchData();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [requestsRes, settingsRes] = await Promise.all([
        supabase.from('creatordev_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('creatordev_settings').select('*').eq('key', 'admin_notification_email').single()
      ]);

      if (requestsRes.error) throw requestsRes.error;
      setRequests(requestsRes.data || []);
      
      if (settingsRes.data) {
        setAdminEmail(settingsRes.data.value);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple password check as requested "admin" style
    if (password === 'admin123') { // Replace with a more secure way if needed, but for now this is the requested flow
      sessionStorage.setItem('creatordev_admin_auth', 'true');
      setIsAuthenticated(true);
      fetchData();
    } else {
      toast.error("Senha incorreta");
    }
  };

  const updateAdminEmail = async () => {
    setIsUpdatingEmail(true);
    try {
      const { error } = await supabase
        .from('creatordev_settings')
        .upsert({ key: 'admin_notification_email', value: adminEmail }, { onConflict: 'key' });

      if (error) throw error;
      toast.success("Email de notificação atualizado!");
    } catch (error: any) {
      toast.error("Erro ao atualizar email: " + error.message);
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const deleteRequest = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta solicitação?")) return;
    
    try {
      const { error } = await supabase.from('creatordev_requests').delete().eq('id', id);
      if (error) throw error;
      setRequests(requests.filter(r => r.id !== id));
      toast.success("Solicitação excluída");
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-white/5 border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-2xl text-center">CreatorDev Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm">Senha de Acesso</label>
                <Input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10"
                  placeholder="Digite a senha admin"
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Entrar</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Painel Administrativo CreatorDev</h1>
          
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-xl">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 block">Email para notificações</label>
              <div className="flex gap-2">
                <Input 
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="bg-white/5 border-white/10 h-9 w-64"
                  placeholder="seu@email.com"
                />
                <Button 
                  size="sm" 
                  onClick={updateAdminEmail} 
                  disabled={isUpdatingEmail}
                  className="bg-blue-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/5 border-white/10 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total de Solicitações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{requests.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/5 border-white/10 text-white overflow-hidden">
          <CardHeader>
            <CardTitle>Solicitações de Projeto</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-gray-400">Data</TableHead>
                    <TableHead className="text-gray-400">Cliente</TableHead>
                    <TableHead className="text-gray-400">Contato</TableHead>
                    <TableHead className="text-gray-400">Projeto</TableHead>
                    <TableHead className="text-gray-400 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          {format(new Date(req.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-400" />
                          {req.full_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3 h-3 text-green-400" />
                            {req.whatsapp}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3 h-3 text-purple-400" />
                            {req.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="flex gap-2">
                          <MessageSquare className="w-4 h-4 text-orange-400 shrink-0 mt-1" />
                          <p className="text-sm text-gray-300 line-clamp-3">{req.project_description}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          onClick={() => deleteRequest(req.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {requests.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                        Nenhuma solicitação recebida ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreatorDevAdmin;
