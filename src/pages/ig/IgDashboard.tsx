/** /IG/dashboard — visão geral do tenant ativo, somente com dados reais. */
import { useCallback, useEffect, useState } from "react";
import { Instagram, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IgLayout from "@/components/ig/IgLayout";
import IgGuard from "@/components/ig/IgGuard";
import IgSyncButton from "@/components/ig/IgSyncButton";
import IgConnectInstagram from "@/components/ig/IgConnectInstagram";
import { IgEmpty, IgError, IgSkeletonCards } from "@/components/ig/IgStates";
import { igApi, type IgDashboard as IgDashboardData } from "@/lib/ig/api";
import { resolveEntitlements } from "@/lib/ig/useIgSession";

const PERIODS = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
];

const CARDS: Array<{ key: string; label: string }> = [
  { key: "followers", label: "Seguidores" },
  { key: "media", label: "Publicações" },
  { key: "messages_received", label: "Directs recebidos" },
  { key: "messages_sent", label: "Directs enviados" },
  { key: "comments_processed", label: "Comentários" },
  { key: "automations_executed", label: "Automações executadas" },
  { key: "leads", label: "Leads gerados" },
  { key: "webhook_events", label: "Eventos da Meta" },
];

function formatValue(value: number | null): string {
  if (value === null || value === undefined) return "Sem dados";
  return value.toLocaleString("pt-BR");
}

const IgDashboardContent = ({
  tenantId,
  tenants,
  activeTenantId,
  onTenantChange,
  planName,
}: {
  tenantId: string;
  tenants: Parameters<typeof IgLayout>[0]["tenants"];
  activeTenantId: string | null;
  onTenantChange: (id: string) => void;
  planName: string | null;
}) => {
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState<IgDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await igApi.dashboard(tenantId, period));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o dashboard.");
    } finally {
      setLoading(false);
    }
  }, [tenantId, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const account = data?.accounts?.[0];

  return (
    <IgLayout
      title="Dashboard"
      description={planName ? `Plano ${planName}` : undefined}
      tenants={tenants}
      activeTenantId={activeTenantId}
      onTenantChange={onTenantChange}
      actions={
        <div className="flex items-center gap-2">
          <IgSyncButton tenantId={tenantId} onDone={() => void load()} />
          <Button variant="outline" size="icon" onClick={() => void load()} aria-label="Atualizar dados">
            <RefreshCcw className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      }
    >
      {error ? (
        <IgError message={error} onRetry={load} />
      ) : loading ? (
        <IgSkeletonCards count={8} />
      ) : !data?.has_account ? (
        <IgEmpty
          icon={<Instagram className="h-6 w-6" aria-hidden />}
          title="Conecte seu Instagram para começar."
          description="Assim que a conta profissional estiver conectada, seus dados reais aparecem aqui. Nenhum número é estimado."
          action={<IgConnectInstagram tenantId={tenantId} />}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Badge variant={account?.connection_state === "connected" ? "secondary" : "destructive"}>
                {account?.connection_state === "connected" ? "🟢 Conectado" : "🟠 Reconexão necessária"}
              </Badge>
              {account?.username ? (
                <span className="text-sm text-muted-foreground">@{account.username}</span>
              ) : null}
            </div>

            <Tabs value={period} onValueChange={setPeriod}>
              <TabsList>
                {PERIODS.map((item) => (
                  <TabsTrigger key={item.value} value={item.value}>
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CARDS.map(({ key, label }) => (
              <div key={key} className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-3 text-2xl font-bold">{formatValue(data.metrics[key] ?? null)}</p>
              </div>
            ))}
          </div>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide">Crescimento</h2>
            <div className="mt-4">
              <IgEmpty
                title="Sem dados disponíveis"
                description="O histórico de crescimento é montado a partir das sincronizações de Insights da Meta. Ele aparece aqui conforme os dados chegam."
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide">Resumo inteligente</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              O resumo por IA é gerado a partir de dados reais do seu perfil. Ele fica disponível assim que
              houver histórico suficiente sincronizado.
            </p>
          </section>
        </div>
      )}
    </IgLayout>
  );
};

const IgDashboard = () => (
  <IgGuard>
    {({ me, activeTenantId, setActiveTenantId }) => {
      const entitlements = resolveEntitlements(me, activeTenantId);
      if (!activeTenantId) {
        return (
          <IgLayout title="Dashboard">
            <IgEmpty title="Workspace não encontrado" description="Recarregue a página para continuar." />
          </IgLayout>
        );
      }
      return (
        <IgDashboardContent
          tenantId={activeTenantId}
          tenants={me?.tenants ?? []}
          activeTenantId={activeTenantId}
          onTenantChange={setActiveTenantId}
          planName={entitlements.plan?.name ?? null}
        />
      );
    }}
  </IgGuard>
);

export default IgDashboard;
