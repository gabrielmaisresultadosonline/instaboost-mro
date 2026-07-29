import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Loader2,
  RefreshCw,
  Search,
  LogOut,
  ShieldBan,
  ShieldCheck,
  Monitor,
  Wifi,
  WifiOff,
} from 'lucide-react';

export interface ZapmroSession {
  id: string;
  user_id: string | null;
  username: string;
  ip: string;
  user_agent: string | null;
  device_label: string | null;
  is_active: boolean | null;
  revoked_at: string | null;
  first_seen: string | null;
  last_seen: string | null;
}

export interface ZapmroBlockedIp {
  id: string;
  username: string | null;
  ip: string;
  reason: string | null;
  created_at: string;
}

/** Considera online quem deu heartbeat nos últimos 3 minutos. */
const ONLINE_WINDOW_MS = 3 * 60 * 1000;

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString('pt-BR') : '—';

const isOnline = (s: ZapmroSession) =>
  !!s.is_active &&
  !!s.last_seen &&
  Date.now() - new Date(s.last_seen).getTime() < ONLINE_WINDOW_MS;

/** Aba de Acessos / IPs: mostra clientes logados, IPs por usuário e permite deslogar/bloquear. */
export const ZapmroSessionsTab: React.FC = () => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ZapmroSession[]>([]);
  const [blockedIps, setBlockedIps] = useState<ZapmroBlockedIp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.functions.invoke('zapmro-api', {
        body: { action: 'list_sessions' },
      });
      if (data?.success) {
        setSessions(data.sessions || []);
        setBlockedIps(data.blocked_ips || []);
      } else {
        toast({ title: 'Erro ao carregar acessos', variant: 'destructive' });
      }
    } catch (error) {
      console.error('[ZapmroSessions] load', error);
      toast({ title: 'Erro ao carregar acessos', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
  }, [load]);

  const call = async (body: Record<string, unknown>, okMsg: string, key: string) => {
    setBusyId(key);
    try {
      const { data } = await supabase.functions.invoke('zapmro-api', { body });
      if (data?.success) {
        toast({ title: okMsg });
        await load();
      } else {
        toast({ title: data?.error || 'Erro na operação', variant: 'destructive' });
      }
    } catch (error) {
      console.error('[ZapmroSessions] action', error);
      toast({ title: 'Erro na operação', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const isBlocked = useCallback(
    (ip: string, username: string) =>
      blockedIps.some((b) => b.ip === ip && (!b.username || b.username === username)),
    [blockedIps],
  );

  /** Agrupa as sessões por usuário, numerando os IPs (1º, 2º, 3º…). */
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, ZapmroSession[]>();
    sessions
      .filter(
        (s) =>
          !q ||
          s.username?.toLowerCase().includes(q) ||
          s.ip?.toLowerCase().includes(q),
      )
      .forEach((s) => {
        const list = map.get(s.username) || [];
        list.push(s);
        map.set(s.username, list);
      });
    return Array.from(map.entries()).map(([username, list]) => ({
      username,
      sessions: [...list].sort(
        (a, b) =>
          new Date(a.first_seen || 0).getTime() - new Date(b.first_seen || 0).getTime(),
      ),
    }));
  }, [sessions, search]);

  const onlineCount = sessions.filter(isOnline).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuário ou IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary" className="gap-1">
          <Wifi className="w-3 h-3" /> {onlineCount} online
        </Badge>
        <Badge variant="outline">{sessions.length} acessos</Badge>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      {isLoading && sessions.length === 0 && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && groups.length === 0 && (
        <p className="text-center text-muted-foreground py-12 text-sm">
          Nenhum acesso registrado ainda.
        </p>
      )}

      {groups.map((group) => (
        <Card key={group.username} className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{group.username}</h3>
              <Badge variant="outline">{group.sessions.length} IP(s)</Badge>
            </div>
            <Button
              size="sm"
              variant="destructive"
              disabled={busyId === `all-${group.username}`}
              onClick={() =>
                void call(
                  { action: 'revoke_all_sessions', username: group.username },
                  'Todas as sessões encerradas',
                  `all-${group.username}`,
                )
              }
            >
              <LogOut className="w-4 h-4 mr-2" /> Deslogar todos
            </Button>
          </div>

          <div className="space-y-2">
            {group.sessions.map((s, index) => {
              const online = isOnline(s);
              const blocked = isBlocked(s.ip, s.username);
              return (
                <div
                  key={s.id}
                  className={cn(
                    'flex flex-wrap items-center gap-3 rounded-lg border p-3',
                    blocked && 'border-destructive/40 bg-destructive/5',
                  )}
                >
                  <span className="text-xs font-mono text-muted-foreground w-8">
                    {index + 1}º
                  </span>
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-semibold">{s.ip}</code>
                      {online ? (
                        <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
                          <Wifi className="w-3 h-3" /> Online
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <WifiOff className="w-3 h-3" /> Offline
                        </Badge>
                      )}
                      {blocked && <Badge variant="destructive">IP bloqueado</Badge>}
                      {s.is_active === false && !blocked && (
                        <Badge variant="outline">Deslogado</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Monitor className="w-3 h-3" />
                      {s.device_label || 'Dispositivo'} · 1º acesso {formatDate(s.first_seen)} ·
                      último {formatDate(s.last_seen)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === s.id || s.is_active === false}
                      onClick={() =>
                        void call(
                          { action: 'revoke_session', id: s.id },
                          'Sessão encerrada',
                          s.id,
                        )
                      }
                    >
                      <LogOut className="w-4 h-4 mr-1" /> Deslogar
                    </Button>
                    {blocked ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === `ip-${s.id}`}
                        onClick={() =>
                          void call(
                            { action: 'unblock_ip', ip: s.ip, username: s.username },
                            'IP desbloqueado',
                            `ip-${s.id}`,
                          )
                        }
                      >
                        <ShieldCheck className="w-4 h-4 mr-1" /> Desbloquear
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busyId === `ip-${s.id}`}
                        onClick={() =>
                          void call(
                            { action: 'block_ip', ip: s.ip, username: s.username },
                            'IP bloqueado',
                            `ip-${s.id}`,
                          )
                        }
                      >
                        <ShieldBan className="w-4 h-4 mr-1" /> Bloquear IP
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ZapmroSessionsTab;
