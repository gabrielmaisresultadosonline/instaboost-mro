/**
 * Tela de módulo em construção das fases seguintes do roadmap.
 * Mantém o shell, o isolamento por tenant e os estados de UI — nunca
 * exibe dados fictícios de Instagram.
 */
import IgLayout from "@/components/ig/IgLayout";
import IgGuard from "@/components/ig/IgGuard";
import IgConnectInstagram from "@/components/ig/IgConnectInstagram";
import { IgEmpty } from "@/components/ig/IgStates";

export interface IgModulePlaceholderProps {
  title: string;
  description: string;
  phase: string;
}

export function IgModulePlaceholder({ title, description, phase }: IgModulePlaceholderProps) {
  return (
    <IgGuard>
      {({ me, activeTenantId, setActiveTenantId }) => {
        const hasAccount = (me?.accounts ?? []).some((account) => account.tenant_id === activeTenantId);

        return (
          <IgLayout
            title={title}
            description={phase}
            tenants={me?.tenants ?? []}
            activeTenantId={activeTenantId}
            onTenantChange={setActiveTenantId}
          >
            {hasAccount ? (
              <IgEmpty title="Sem dados disponíveis" description={description} />
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

export default IgModulePlaceholder;
