/**
 * Parser da lista de usuários exportada da ferramenta ZAPMRO.
 *
 * Formato esperado (repetido N vezes):
 *   --- Usuário #1 ---
 *   👤 Usuário:    gleisonvipfull
 *   🔑 Senha:      gleisonvipfull
 *   📅 Cadastro:   28/05/2026
 *   📋 Plano:      Anual (302 dias restantes)
 *   ⚡ Status:     Ativo (302 dias)
 */

export interface ParsedZapmroUser {
  username: string;
  password: string;
  /** 999999 = vitalício */
  days_remaining: number;
  is_active: boolean;
  plan: string;
  created_label: string | null;
}

export const ZAPMRO_LIFETIME_DAYS = 999999;

const USER_RE = /^(?:👤\s*)?usu[aá]rio\s*:/i;
const PASS_RE = /^(?:🔑\s*)?senha\s*:/i;
const DATE_RE = /^(?:📅\s*)?cadastro\s*:/i;
const PLAN_RE = /^(?:📋\s*)?plano\s*:/i;
const STATUS_RE = /^(?:⚡\s*)?status\s*:/i;

/** Remove o rótulo (tudo até o primeiro ":") e devolve o valor limpo. */
const valueOf = (line: string) => line.slice(line.indexOf(':') + 1).trim();

/** Remove emojis/símbolos decorativos do início da linha. */
const clean = (line: string) =>
  line
    .replace(/^[\s\u2500-\u257F=\-•]+/, '')
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .trim();

function emptyUser(): ParsedZapmroUser {
  return {
    username: '',
    password: '',
    days_remaining: 0,
    is_active: true,
    plan: 'Anual',
    created_label: null,
  };
}

/** Converte o texto colado em uma lista estruturada de usuários. */
export function parseZapmroUsers(text: string): ParsedZapmroUser[] {
  const lines = String(text || '').split(/\r?\n/);
  const users: ParsedZapmroUser[] = [];

  let current: ParsedZapmroUser | null = null;

  const push = () => {
    if (current && current.username) users.push(current);
    current = null;
  };

  for (const rawLine of lines) {
    const line = clean(rawLine);
    if (!line) continue;

    if (USER_RE.test(line)) {
      push();
      current = emptyUser();
      current.username = valueOf(line).toLowerCase();
      // Senha padrão = próprio usuário, caso não venha no bloco.
      current.password = valueOf(line);
      continue;
    }

    if (!current) continue;

    if (PASS_RE.test(line)) {
      const pass = valueOf(line);
      if (pass) current.password = pass;
      continue;
    }

    if (DATE_RE.test(line)) {
      current.created_label = valueOf(line) || null;
      continue;
    }

    if (PLAN_RE.test(line)) {
      const plan = valueOf(line);
      if (/vital[ií]cio/i.test(plan)) {
        current.plan = 'Vitalício';
        current.days_remaining = ZAPMRO_LIFETIME_DAYS;
      } else {
        current.plan = plan.replace(/\s*\(.*\)\s*$/, '') || 'Anual';
        if (/expirado/i.test(plan)) {
          current.days_remaining = 0;
          current.is_active = false;
        } else {
          const m = plan.match(/(\d+)\s*dias/i);
          current.days_remaining = m ? Number(m[1]) : 0;
        }
      }
      continue;
    }

    if (STATUS_RE.test(line)) {
      const status = valueOf(line);
      if (/expirado|inativo|desativado/i.test(status)) {
        current.is_active = false;
        current.days_remaining = 0;
      } else if (/vital[ií]cio/i.test(status)) {
        current.is_active = true;
        current.days_remaining = ZAPMRO_LIFETIME_DAYS;
      } else {
        current.is_active = true;
        const m = status.match(/(\d+)\s*dias/i);
        if (m && !current.days_remaining) current.days_remaining = Number(m[1]);
      }
      continue;
    }
  }

  push();

  // Deduplica pelo username, mantendo o último bloco lido.
  const map = new Map<string, ParsedZapmroUser>();
  for (const u of users) map.set(u.username, u);
  return Array.from(map.values());
}
