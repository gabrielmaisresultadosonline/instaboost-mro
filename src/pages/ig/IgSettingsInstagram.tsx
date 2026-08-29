/** /IG/settings/instagram — contas conectadas, status e ações. */
import { useState } from "react";
import { Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import IgLayout from "@/components/ig/IgLayout";
import IgGuard from "@/components/ig/IgGuard";
import IgConnectInstagram from "@/components/ig/IgConnectInstagram";
import { IgEmpty } from "@/components/ig/IgStates";
import { igApi, type IgAccount, type IgTenant } from "@/lib/ig/api";
import { toast } from "@/hooks/use-toast";
import { resolveEntitlements } from "@/lib/ig/useIgSession";

interface PanelProps {
  tenantId: string;
  tenants: IgTenant[];
  accounts: IgAccount[];
  maxAccounts: number;
  onTenantChange: (id: string) => void;
  onReload: () => Promise<void>;
}

function InstagramPanel({ tenantId, tenants, accounts, maxAccounts, onTenantChange, onReload }: PanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleDisconnect = async (accountId: string) => {
    setBusyId(accountId);
    try {
      await igApi.disconnect(tenantId, accountId);
      toast({ title: "Conta desconectada", description: "A conexão com o Instagram foi removida." });
      await onReload();
    } catch (error) {
      toast({
        title: "Não foi possível desconectar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <IgLayout
      title="Instagram"
      description={`Contas conectadas: ${accounts.length} de ${maxAccounts}`}
      tenants={tenants}
      activeTenantId={tenantId}
      onTenantChange={onTenantChange}
    >
      <div className="space-y-6">
        {accounts.length === 0 ? (
          <IgEmpty
            icon={<Instagram className="h-6 w-6" aria-hidden />}
            title="Nenhuma conta conectada"
            description="Conecte uma conta profissional do Instagram para liberar Direct, comentários, publicação e Insights."
            action={<IgConnectInstagram tenantId={tenantId} />}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {accounts.map((account) => (
                <article key={account.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">@{account.username ?? "conta"}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        Instagram ID: {account.instagram_account_id ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Última sincronização:{" "}
                        {account.last_synced_at
                          ? new Date(account.last_synced_at).toLocaleString("pt-BR")
                          : "Sem dados disponíveis"}
                      </p>
                    </div>
                    <Badge variant={account.connection_state === "connected" ? "secondary" : "destructive"}>
                      {account.connection_state === "connected" ? "🟢 Conectado" : "🟠 Reconectar"}
                    </Badge>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <IgConnectInstagram tenantId={tenantId} size="sm" label="Reconectar" />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === account.id}
                      onClick={() => void handleDisconnect(account.id)}
                    >
                      Desconectar
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            {accounts.length < maxAccounts ? (
              <div className="rounded-xl border border-dashed border-border p-5">
                <p className="text-sm text-muted-foreground">
                  Você ainda pode conectar {maxAccounts - accounts.length} conta(s) neste plano.
                </p>
                <IgConnectInstagram tenantId={tenantId} size="sm" className="mt-3" />
              </div>
            ) : null}
          </>
        )}
      </div>
    </IgLayout>
  );
}

const IgSettingsInstagram = () => (
  <IgGuard>
    {({ me, activeTenantId, setActiveTenantId, reload }) => {
      if (!activeTenantId) {
        return (
          <IgLayout title="Instagram">
            <IgEmpty title="Workspace não encontrado" description="Recarregue a página para continuar." />
          </IgLayout>
        );
      }

      const accounts = (me?.accounts ?? []).filter((account) => account.tenant_id === activeTenantId);
      const maxAccounts = resolveEntitlements(me, activeTenantId).limit("max_accounts") ?? 1;

      return (
        <InstagramPanel
          tenantId={activeTenantId}
          tenants={me?.tenants ?? []}
          accounts={accounts}
          maxAccounts={maxAccounts}
          onTenantChange={setActiveTenantId}
          onReload={reload}
        />
      );
    }}
  </IgGuard>
);

export default IgSettingsInstagram;
