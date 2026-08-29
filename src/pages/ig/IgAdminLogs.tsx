/** /IG/admin/logs — auditoria global (nunca registra segredos). */
import { useCallback, useEffect, useState } from "react";
import IgAdminShell from "@/components/ig/IgAdminShell";
import { IgEmpty, IgError, IgLoading } from "@/components/ig/IgStates";
import { Badge } from "@/components/ui/badge";
import { igAdminApi } from "@/lib/ig/adminApi";

type Logs = Awaited<ReturnType<typeof igAdminApi.logs>>["logs"];

const IgAdminLogs = () => {
  const [logs, setLogs] = useState<Logs>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await igAdminApi.logs();
      setLogs(result.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <IgAdminShell title="Logs de auditoria">
      {error ? (
        <IgError message={error} onRetry={load} />
      ) : loading ? (
        <IgLoading label="Carregando logs..." />
      ) : logs.length === 0 ? (
        <IgEmpty title="Nenhum registro ainda" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Autor</th>
                <th className="px-4 py-3">Alvo</th>
                <th className="px-4 py-3">Resultado</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 font-medium">{log.action}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.actor_type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.target ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={log.result === "success" ? "secondary" : "destructive"}>{log.result}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{log.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </IgAdminShell>
  );
};

export default IgAdminLogs;
