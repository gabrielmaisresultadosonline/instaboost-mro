/** /IG/admin/dashboard — visão global da plataforma. */
import { useCallback, useEffect, useState } from "react";
import IgAdminShell from "@/components/ig/IgAdminShell";
import { IgError, IgSkeletonCards } from "@/components/ig/IgStates";
import { igAdminApi, type IgAdminStats } from "@/lib/ig/adminApi";

const CARDS: Array<{ key: keyof IgAdminStats; label: string }> = [
  { key: "users", label: "Usuários" },
  { key: "tenants", label: "Workspaces" },
  { key: "instagram_accounts", label: "Instagrams conectados" },
  { key: "messages", label: "Mensagens" },
  { key: "comments", label: "Comentários" },
  { key: "automations", label: "Automações" },
  { key: "ai_calls", label: "Uso de IA" },
  { key: "webhook_events", label: "Eventos da Meta" },
  { key: "failed_jobs", label: "Erros na fila" },
];

const IgAdminDashboard = () => {
  const [stats, setStats] = useState<IgAdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await igAdminApi.dashboard();
      setStats(result.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <IgAdminShell title="Dashboard global">
      {error ? (
        <IgError message={error} onRetry={load} />
      ) : loading || !stats ? (
        <IgSkeletonCards count={9} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map(({ key, label }) => (
            <div key={key} className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-3 text-2xl font-bold">{stats[key].toLocaleString("pt-BR")}</p>
            </div>
          ))}
        </div>
      )}
    </IgAdminShell>
  );
};

export default IgAdminDashboard;
