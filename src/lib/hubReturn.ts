/**
 * Controle de "voltar para o Dashboard".
 *
 * Quando o cliente abre uma ferramenta a partir de /dashboard, marcamos a
 * sessão para que qualquer página saiba que o retorno deve ser para o hub
 * (/dashboard) e não para a home da ferramenta.
 */

const RETURN_KEY = "hub_return_to_dashboard";
export const HUB_DASHBOARD_ROUTE = "/dashboard";

/** Marca que a navegação atual começou no Dashboard. */
export function markHubReturn(): void {
  try {
    sessionStorage.setItem(RETURN_KEY, "true");
  } catch {
    /* sessionStorage indisponível (modo privado): ignora silenciosamente */
  }
}

/** Limpa a marcação (usado quando o cliente já está no Dashboard). */
export function clearHubReturn(): void {
  try {
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    /* ignore */
  }
}

/** Indica se a página atual foi aberta a partir do Dashboard. */
export function shouldReturnToHub(): boolean {
  try {
    return sessionStorage.getItem(RETURN_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Retorna a rota de "voltar" correta: o Dashboard quando o fluxo veio de lá,
 * caso contrário o fallback informado pela própria página.
 */
export function resolveBackRoute(fallback: string): string {
  return shouldReturnToHub() ? HUB_DASHBOARD_ROUTE : fallback;
}
