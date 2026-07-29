import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { RefreshCw, Undo2, Search, Link2, Mail, Clock, User } from 'lucide-react';

/** Estado anterior de cada acesso envolvido na unificação. */
interface MergeAccountSnapshot {
  table?: string;
  tool?: string;
  id?: string;
  username?: string;
  previous_email?: string | null;
  changed?: boolean;
}

interface MergeLog {
  id: string;
  target_email: string;
  primary_username: string | null;
  primary_tool: string | null;
  reason: string | null;
  accounts: MergeAccountSnapshot[] | null;
  email_sent: boolean;
  reverted: boolean;
  reverted_at: string | null;
  created_at: string;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * Painel administrativo com o histórico completo de unificações de acesso.
 * Permite desfazer uma unificação, devolvendo cada acesso ao e-mail anterior.
 */
export default function MergeLogsPanel() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<MergeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [undoing, setUndoing] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('hub-api', { body: { action: 'admin_list_merges' } });
      setLogs(Array.isArray(data?.merges) ? (data.merges as MergeLog[]) : []);
    } catch {
      toast({ title: 'Erro ao carregar as unificações', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUndo = async (log: MergeLog) => {
    if (!window.confirm(`Desfazer a unificação de ${log.target_email}? Os acessos voltam ao e-mail anterior.`)) return;
    setUndoing(log.id);
    try {
      const { data } = await supabase.functions.invoke('hub-api', { body: { action: 'admin_undo_merge', id: log.id } });
      if (!data?.success) {
        toast({ title: data?.error || 'Não foi possível desfazer', variant: 'destructive' });
        return;
      }
      toast({ title: 'Unificação desfeita', description: `${data.restored || 0} acesso(s) voltaram ao estado anterior.` });
      await load();
    } catch {
      toast({ title: 'Erro ao desfazer a unificação', variant: 'destructive' });
    } finally {
      setUndoing(null);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return logs;
    return logs.filter(
      (l) =>
        l.target_email?.toLowerCase().includes(term) ||
        (l.primary_username || '').toLowerCase().includes(term) ||
        (l.accounts || []).some((a) => (a.username || '').toLowerCase().includes(term)),
    );
  }, [logs, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Unificações de Acesso</h2>
          <p className="text-sm text-muted-foreground">
            Histórico de todas as unificações feitas pelos clientes no dashboard. É possível desfazer qualquer uma.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por e-mail ou usuário..."
          className="pl-9"
        />
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhuma unificação registrada até o momento.
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((log) => (
          <div key={log.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-bold text-foreground break-all">{log.target_email}</span>
                  {log.reverted ? (
                    <Badge variant="destructive">Desfeita</Badge>
                  ) : (
                    <Badge variant="secondary">Ativa</Badge>
                  )}
                  {log.email_sent && <Badge variant="outline">E-mail enviado</Badge>}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Principal: <strong className="text-foreground">{log.primary_username || '—'}</strong>
                    {log.primary_tool ? ` (${log.primary_tool})` : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(log.created_at)}
                  </span>
                  {log.reverted && log.reverted_at && (
                    <span className="flex items-center gap-1">
                      <Undo2 className="h-3 w-3" />
                      Desfeita em {formatDate(log.reverted_at)}
                    </span>
                  )}
                </div>

                {log.reason && <p className="text-xs text-muted-foreground">{log.reason}</p>}

                <div className="flex flex-wrap gap-2 pt-1">
                  {(log.accounts || []).map((a, i) => (
                    <span
                      key={`${a.id || a.username}-${i}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs"
                    >
                      <Link2 className="h-3 w-3 text-muted-foreground" />
                      <strong className="text-foreground">{a.username}</strong>
                      <span className="text-muted-foreground">{a.tool}</span>
                      {a.changed && (
                        <span className="text-muted-foreground">
                          · antes: {a.previous_email || 'sem e-mail'}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <div className="shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={log.reverted || undoing === log.id}
                  onClick={() => void handleUndo(log)}
                >
                  <Undo2 className="mr-2 h-4 w-4" />
                  {undoing === log.id ? 'Desfazendo...' : 'Desfazer unificação'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
