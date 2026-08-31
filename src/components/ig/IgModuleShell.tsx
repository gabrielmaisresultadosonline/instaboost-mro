/**
 * Casca comum dos módulos do /IG: guard de sessão, layout, seletor de
 * workspace, checagem de conta conectada e botão de sincronização.
 */
import type { ReactNode } from "react";
import IgLayout from "@/components/ig/IgLayout";
import IgGuard from "@/components/ig/IgGuard";
import IgConnectInstagram from "@/components/ig/IgConnectInstagram";
import IgSyncButton from "@/components/ig/IgSyncButton";
import { IgEmpty } from "@/components/ig/IgStates";

export interface IgModuleShellProps {
  title: string;
  description?: string;
  /** Recebe o tenant ativo e um contador que muda a cada sincronização. */
  children: (context: { tenantId: string; syncToken: number }) => ReactNode;
  extraActions?: ReactNode;
}

export function IgModuleShell({ title, description, children, extraActions }: IgModuleShellProps) {
  return (
    <IgGuard>
      {({ me, activeTenantId, setActiveTenantId, reload }) => {
        const hasAccount = (me?.accounts ?? []).some((account) => account.tenant_id === activeTenantId);

        return (
          <IgLayout
            title={title}
            description={description}
            tenants={me?.tenants ?? []}
            activeTenantId={activeTenantId}
            onTenantChange={setActiveTenantId}
            actions={
              hasAccount && activeTenantId ? (
                <div className="flex items-center gap-2">
                  {extraActions}
                  <IgSyncButton tenantId={activeTenantId} onDone={() => void reload()} />
                </div>
              ) : null
            }
          >
            {hasAccount && activeTenantId ? (
              children({ tenantId: activeTenantId, syncToken: 0 })
            ) : (
              <IgEmpty
                title="Conecte seu Instagram para começar."
                description="Este módulo trabalha exclusivamente com dados reais vindos da API oficial da Meta."
                action={<IgConnectInstagram tenantId={activeTenantId} />}
              />
            )}
          </IgLayout>
        );
      }}
    </IgGuard>
  );
}

export default IgModuleShell;
