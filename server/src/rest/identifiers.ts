/**
 * Validação e citação de identificadores SQL.
 *
 * Nunca interpolamos nome de tabela/coluna vindo do cliente sem validar:
 * `SET ROLE`, nomes de tabela e nomes de coluna não aceitam bind parameters,
 * então a validação estrita é a única barreira contra injeção nesses pontos.
 */

const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function isValidIdentifier(value: string): boolean {
  return IDENTIFIER_RE.test(value) && value.length <= 63;
}

export function quoteIdent(value: string): string {
  if (!isValidIdentifier(value)) {
    throw new RestError(400, `Identificador inválido: ${value}`);
  }
  return `"${value}"`;
}

/** Aceita `coluna` ou `tabela.coluna`. */
export function quoteColumnRef(value: string): string {
  const parts = value.split(".");
  if (parts.length === 1) return quoteIdent(parts[0]);
  if (parts.length === 2) return `${quoteIdent(parts[0])}.${quoteIdent(parts[1])}`;
  throw new RestError(400, `Referência de coluna inválida: ${value}`);
}

export class RestError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: string,
    public code?: string,
  ) {
    super(message);
    this.name = "RestError";
  }
}
