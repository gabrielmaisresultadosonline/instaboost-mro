/** /IG/admin/instagram — todas as contas conectadas na plataforma. */
import { useCallback, useEffect, useState } from "react";
import IgAdminShell from "@/components/ig/IgAdminShell";
import { IgEmpty, IgError, IgLoading } from "@/components/ig/IgStates";
import { Badge } from "@/components/ui/badge";
import { igAdminApi } from "@/lib/ig/adminApi";

type Response = Awaited<ReturnType<typeof igAdminApi.instagram>>;

const IgAdminInstagram = () => {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await igAdminApi.instagram());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as contas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <IgAdminShell title="Contas do Instagram">
      {error ? (
        <IgError message={error} onRetry={load} />
      ) : loading ? (
        <IgLoading label="Carregando contas..." />
      ) : (data?.accounts.length ?? 0) === 0 ? (
        <IgEmpty title="Nenhuma conta conectada" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Instagram</th>
                <th className="px-4 py-3">Instagram ID</th>
                <th className="px-4 py-3">Conexão</th>
                <th className="px-4 py-3">Webhook</th>
                <th className="px-4 py-3">Última sincronização</th>
              </tr>
            </thead>
            <tbody>
              {data?.accounts.map((account) => (
                <tr key={account.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    {data.tenants.find((t) => t.id === account.tenant_id)?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">@{account.username ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{account.instagram_account_id}</td>
                  <td className="px-4 py-3">
                    <Badge variant={account.connection_state === "connected" ? "secondary" : "destructive"}>
                      {account.connection_state === "connected" ? "🟢 Conectado" : "🟠 Atenção"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {account.webhook_subscribed ? "Assinado" : "Pendente"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {account.last_synced_at ? new Date(account.last_synced_at).toLocaleString("pt-BR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </IgAdminShell>
  );
};

export default IgAdminInstagram;
