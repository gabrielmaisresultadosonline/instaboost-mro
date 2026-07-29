/**
 * Embed mode (?embed=1) — permite abrir /mro-ferramenta dentro de um iframe
 * (extensão de navegador, outro site) já autenticado, sem exibir o layout completo.
 *
 * Duas formas de hidratar a sessão:
 *  1) Query string: /mro-ferramenta?embed=1&u=USUARIO&p=SENHA
 *     (ou &token=<base64 de {"u":"...","p":"..."}>)
 *  2) postMessage: a página envia { type: 'MRO_EMBED_READY' } para o parent e
 *     aguarda { type: 'MRO_EMBED_AUTH', username, password }.
 *
 * A página responde ao parent com:
 *   { type: 'MRO_EMBED_AUTH_RESULT', success: boolean, error?: string }
 */

export interface EmbedCredentials {
  username: string;
  password: string;
}

/** Detecta se a página está sendo renderizada em modo embed. */
export const isEmbedMode = (search: string = window.location.search): boolean => {
  try {
    const params = new URLSearchParams(search);
    return params.get('embed') === '1' || params.get('embed') === 'true';
  } catch {
    return false;
  }
};

/** Lê credenciais da query string, se existirem. */
export const readEmbedCredentialsFromUrl = (
  search: string = window.location.search
): EmbedCredentials | null => {
  try {
    const params = new URLSearchParams(search);

    const token = params.get('token');
    if (token) {
      const decoded = JSON.parse(atob(token)) as { u?: string; p?: string };
      if (decoded?.u && decoded?.p) {
        return { username: String(decoded.u), password: String(decoded.p) };
      }
    }

    const u = params.get('u') || params.get('username');
    const p = params.get('p') || params.get('password');
    if (u && p) return { username: u, password: p };

    return null;
  } catch {
    return null;
  }
};

/** Remove credenciais da URL depois do login (evita vazamento em logs/histórico). */
export const scrubEmbedUrl = (): void => {
  try {
    const url = new URL(window.location.href);
    ['u', 'p', 'username', 'password', 'token'].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, '', url.toString());
  } catch {
    /* noop */
  }
};

/** Envia uma mensagem para o parent (extensão / site host). */
export const postToHost = (payload: Record<string, unknown>): void => {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, '*');
    }
  } catch {
    /* noop */
  }
};

/**
 * Escuta credenciais enviadas via postMessage pelo host.
 * Retorna a função de cleanup.
 */
export const listenForEmbedCredentials = (
  onCredentials: (creds: EmbedCredentials) => void
): (() => void) => {
  const handler = (event: MessageEvent) => {
    const data = event.data as
      | { type?: string; username?: string; password?: string }
      | undefined;
    if (!data || data.type !== 'MRO_EMBED_AUTH') return;
    if (!data.username || !data.password) return;
    onCredentials({ username: String(data.username), password: String(data.password) });
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
};
