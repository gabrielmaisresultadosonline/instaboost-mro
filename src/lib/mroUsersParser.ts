/**
 * Parser do formato de texto exportado da ferramenta MRO.
 *
 * Formato esperado (repetido N vezes):
 *   Usuário: nome
 *   Senha: senha
 *   Tempo de Expiração: 9999333
 *   Contas associadas:
 *   conta1
 *   ×
 *   conta2
 *   ×
 *   Lista de Testes:
 */

export interface ParsedMroUser {
  username: string;
  password: string;
  expiration_days: number;
  accounts: string[];
}

const USER_RE = /^usu[aá]rio\s*:/i;
const PASS_RE = /^senha\s*:/i;
const EXP_RE = /^tempo\s+de\s+expira[cç][aã]o\s*:/i;
const ACCOUNTS_RE = /^contas\s+associadas\s*:/i;
const TESTS_RE = /^lista\s+de\s+testes\s*:/i;

/** Remove o rótulo (tudo até o primeiro ":") e devolve o valor limpo. */
const valueOf = (line: string) => line.slice(line.indexOf(':') + 1).trim();

/** Converte o texto colado em uma lista estruturada de usuários. */
export function parseMroUsers(text: string): ParsedMroUser[] {
  const lines = String(text || '').split(/\r?\n/);
  const users: ParsedMroUser[] = [];

  let current: ParsedMroUser | null = null;
  let collectingAccounts = false;

  const push = () => {
    if (current && current.username) users.push(current);
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (USER_RE.test(line)) {
      push();
      collectingAccounts = false;
      current = { username: valueOf(line).toLowerCase(), password: '', expiration_days: 0, accounts: [] };
      continue;
    }

    if (!current) continue;

    if (PASS_RE.test(line)) {
      current.password = valueOf(line);
      collectingAccounts = false;
      continue;
    }

    if (EXP_RE.test(line)) {
      const digits = valueOf(line).replace(/[^\d]/g, '');
      current.expiration_days = digits ? Number(digits) : 0;
      collectingAccounts = false;
      continue;
    }

    if (ACCOUNTS_RE.test(line)) {
      collectingAccounts = true;
      continue;
    }

    if (TESTS_RE.test(line)) {
      collectingAccounts = false;
      continue;
    }

    if (collectingAccounts) {
      // Linhas com "×" são apenas o botão de remover da interface antiga.
      if (line === '×' || line === 'x' || line === 'X') continue;
      const handle = line
        .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
        .replace(/\/+$/, '')
        .replace(/^@/, '')
        .trim()
        .toLowerCase();
      if (handle && !current.accounts.includes(handle)) current.accounts.push(handle);
    }
  }

  push();
  return users;
}
