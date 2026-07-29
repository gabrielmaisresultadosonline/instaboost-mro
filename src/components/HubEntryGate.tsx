import { useLocation, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { HUB_DASHBOARD_ROUTE } from "@/lib/hubReturn";

/** Indica se a URL atual está em modo embed (iframe/extensão). */
function isEmbedded(search: string): boolean {
  try {
    const params = new URLSearchParams(search);
    if (params.get("embed") === "1" || params.get("embed") === "true") return true;
  } catch {
    /* ignore */
  }
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin: quase sempre significa que estamos dentro de um iframe
    return true;
  }
}

interface HubEntryGateProps {
  /** Página original que deve ser renderizada quando o acesso é permitido. */
  children: ReactNode;
  /** Quando true, o modo embed/iframe nunca é redirecionado (ex.: /mro-ferramenta). */
  allowEmbed?: boolean;
}

/**
 * Redireciona o acesso direto (digitar a URL / atualizar a página) para o
 * /dashboard. Depois disso, qualquer navegação interna — inclusive a partir do
 * próprio Dashboard — abre a página normalmente.
 */
export function HubEntryGate({ children, allowEmbed = false }: HubEntryGateProps) {
  const location = useLocation();

  // location.key === "default" identifica a primeira entrada da sessão de
  // navegação, ou seja: URL digitada, link externo ou F5 na própria página.
  const isDirectEntry = location.key === "default";
  const embedded = allowEmbed && isEmbedded(location.search);

  // Entrada direta (URL digitada ou F5) sempre volta ao hub, mesmo que a sessão
  // já tenha a marcação de retorno ao Dashboard.
  if (isDirectEntry && !embedded) {
    return <Navigate to={HUB_DASHBOARD_ROUTE} replace />;
  }

  return <>{children}</>;
}

export default HubEntryGate;
