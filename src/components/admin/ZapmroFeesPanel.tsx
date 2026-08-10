import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, CheckCircle, Clock, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UpgradeFee {
  id: string;
  username: string;
  email: string;
  amount: number;
  status: string;
  nsu_order: string;
  paid_at: string | null;
  created_at: string;
}

const ZapmroFeesPanel = () => {
  const [fees, setFees] = useState<UpgradeFee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const loadFees = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.functions.invoke('zapmro-upgrade-fee', {
        body: { action: 'list' },
      });
      if (data?.success) {
        setFees(data.fees || []);
      } else {
        toast({ title: 'Erro ao carregar taxas', variant: 'destructive' });
      }
    } catch (error) {
      console.error('[ZapmroFees] load error', error);
      toast({ title: 'Erro ao carregar taxas', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveManual = async (id: string) => {
    try {
      const { data } = await supabase.functions.invoke('zapmro-upgrade-fee', {
        body: { action: 'approve_manual', id },
      });
      if (data?.success) {
        toast({ title: 'Taxa aprovada manualmente!' });
        loadFees();
      } else {
        toast({ title: 'Erro ao aprovar', variant: 'destructive' });
      }
    } catch (error) {
      console.error('[ZapmroFees] approve error', error);
      toast({ title: 'Erro na aprovação', variant: 'destructive' });
    }
  };

  useEffect(() => {
    loadFees();
  }, []);

  const term = search.toLowerCase().trim();
  const filtered = fees.filter(
    (f) => !term || f.username.toLowerCase().includes(term) || f.email.toLowerCase().includes(term),
  );
  const paid = filtered.filter((f) => f.status === 'paid');
  const pending = filtered.filter((f) => f.status !== 'paid');
  const total = paid.reduce((sum, f) => sum + Number(f.amount || 0), 0);

  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleString('pt-BR') : '—';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-foreground">Taxas Pagas — ZAPMRO</h3>
          <p className="text-muted-foreground text-sm">
            Usuários que pagaram a taxa única de atualização e estão com o download liberado.
          </p>
        </div>
        <Button onClick={loadFees} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-muted-foreground text-xs">Liberados</p>
          <p className="text-2xl font-bold text-foreground">{paid.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-muted-foreground text-xs">Pendentes</p>
          <p className="text-2xl font-bold text-foreground">{pending.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-muted-foreground text-xs">Total arrecadado</p>
          <p className="text-2xl font-bold text-foreground">
            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por usuário ou e-mail..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          Nenhuma taxa registrada ainda.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-muted-foreground">
                <th className="p-3">Usuário</th>
                <th className="p-3">E-mail</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Status</th>
                <th className="p-3">Pago em</th>
                <th className="p-3">Criado em</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((fee) => (
                <tr key={fee.id} className="border-t border-border">
                  <td className="p-3 font-medium text-foreground">{fee.username}</td>
                  <td className="p-3 text-muted-foreground">{fee.email}</td>
                  <td className="p-3 text-foreground">
                    R$ {Number(fee.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3">
                    {fee.status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                        <CheckCircle className="w-4 h-4" /> Liberado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                        <Clock className="w-4 h-4" /> Pendente
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">{formatDate(fee.paid_at)}</td>
                  <td className="p-3 text-muted-foreground">{formatDate(fee.created_at)}</td>
                  <td className="p-3">
                    {fee.status !== 'paid' && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1 font-bold"
                        onClick={() => handleApproveManual(fee.id)}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Aprovar Manual
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ZapmroFeesPanel;
