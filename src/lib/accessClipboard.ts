/**
 * Utilitário para copiar o acesso de um cliente (usuário + senha) no formato padrão
 * usado no atendimento/reenvio de acesso.
 */
export interface AccessCredentials {
  username: string;
  password?: string | null;
  email?: string | null;
}

/** Monta o texto padrão de acesso. */
export const buildAccessText = ({ username, password, email }: AccessCredentials): string =>
  [
    'Seu acesso é',
    '',
    `nome : ${username}`,
    '',
    `senha: ${password || '—'}`,
    ...(email ? ['', `email: ${email}`] : []),
    '',
    'Acesse área de membros maisresultadosonline.com.br/dashboard',
  ].join('\n');

/** Copia o acesso para a área de transferência (com fallback para navegadores antigos). */
export const copyAccessToClipboard = async (creds: AccessCredentials): Promise<boolean> => {
  const text = buildAccessText(creds);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      return true;
    } catch {
      return false;
    }
  }
};
