import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, CheckCircle, XCircle, Clock, Trash2, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function VenderAdmin() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ pendente: 0, pago: 0, expirado: 0 });

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
      toast.error("Erro ao carrergar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (userId: string) => {
    try {
      // 1. Update user access
      const { error: uError } = await supabase
        .from('vender_usuarios')
        .update({ acesso_liberado: true })
        .eq('id', userId);
      
      if (uError) throw uError;

      // 2. Update payment status
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

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-black">Admin - Vender na Internet</h1>
        <Button onClick={fetchData} variant="outline" className="gap-2">
          <RefreshCw className={loading ? "animate-spin" : ""} /> Atualizar
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-500">{stats.pago}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-yellow-500">{stats.pendente}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Expirados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-red-500">{stats.expirado}</div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-zinc-950 text-gray-400 text-sm uppercase font-bold">
            <tr>
              <th className="px-6 py-4">Usuário</th>
              <th className="px-6 py-4">WhatsApp</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {users.map(u => {
              const status = u.vender_pagamentos?.[0]?.status || 'pendente';
              return (
                <tr key={u.id} className="hover:bg-zinc-950 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold">{u.nome}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{u.whatsapp}</td>
                  <td className="px-6 py-4">
                    <Badge variant={status === 'pago' ? 'default' : (status === 'pendente' ? 'secondary' : 'destructive')} className="gap-1">
                      {status === 'pago' && <CheckCircle className="w-3 h-3" />}
                      {status === 'pendente' && <Clock className="w-3 h-3" />}
                      {status === 'expirado' && <XCircle className="w-3 h-3" />}
                      {status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {status !== 'pago' && (
                        <Button size="sm" variant="outline" className="text-green-500 border-green-500/20 hover:bg-green-500/10" onClick={() => handleApprove(u.id)}>
                          <UserCheck className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="text-red-500 border-red-500/20 hover:bg-red-500/10" onClick={() => handleDelete(u.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">Nenhum registro encontrado</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
