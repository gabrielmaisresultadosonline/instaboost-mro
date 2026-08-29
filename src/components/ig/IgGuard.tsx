/**
 * Rota protegida do módulo /IG: exige sessão do Supabase Auth e
 * garante perfil + tenant provisionados antes de renderizar a tela.
 */
import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { igApi } from "@/lib/ig/api";
import { useIgSession, type IgSessionState } from "@/lib/ig/useIgSession";
import { IgError, IgLoading } from "./IgStates";

export interface IgGuardProps {
  children: (session: IgSessionState) => ReactNode;
}

export function IgGuard({ children }: IgGuardProps) {
  const session = useIgSession();
  const location = useLocation();
  const { loading, session: authSession, me, reload } = session;

  // Se o usuário está autenticado mas ainda não tem tenant, provisiona.
  useEffect(() => {
    if (!loading && authSession && me && me.tenants.length === 0) {
      igApi
        .bootstrap({ full_name: me.profile?.full_name ?? undefined, company: me.profile?.company ?? undefined })
        .then(() => reload())
        .catch(() => undefined);
    }
  }, [loading, authSession, me, reload]);

  if (loading) return <IgLoading label="Carregando seu workspace..." className="min-h-screen" />;

  if (!authSession) {
    return <Navigate to="/IG/login" replace state={{ from: location.pathname }} />;
  }

  if (session.error) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <IgError message={session.error} onRetry={reload} />
      </div>
    );
  }

  if (!me) return <IgLoading label="Preparando seus dados..." className="min-h-screen" />;

  return <>{children(session)}</>;
}

export default IgGuard;
