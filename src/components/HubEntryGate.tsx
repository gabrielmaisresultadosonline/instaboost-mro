import { useLocation, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { HUB_DASHBOARD_ROUTE, shouldReturnToHub } from "@/lib/hubReturn";

/**
 * Marca se este é o primeiro render da aplicação (carregamento "frio" da URL).
 *
 * Só o carregamento direto de uma URL protegida deve cair no /dashboard.
 * Navegações internas (SPA) sempre abrem a página normalmente.
 */
let coldStart = true;

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

  const wasColdStart = coldStart;
  coldStart = false;

  const embedded = allowEmbed && isEmbedded(location.search);
  const cameFromHub = shouldReturnToHub();

  if (wasColdStart && !embedded && !cameFromHub) {
    return <Navigate to={HUB_DASHBOARD_ROUTE} replace />;
  }

  return <>{children}</>;
}

export default HubEntryGate;
