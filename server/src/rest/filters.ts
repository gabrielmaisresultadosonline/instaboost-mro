/**
 * Tradutor dos filtros no estilo PostgREST para SQL parametrizado.
 *
 * O SDK do Supabase serializa `.eq('id', x)` como `?id=eq.x`. Reproduzir esse
 * contrato é o que permite manter as 213 páginas sem reescrita.
 */

import { quoteColumnRef, RestError } from "./identifiers.js";

export interface SqlFragment {
  sql: string;
  params: unknown[];
}

/** Parâmetros de query que não são filtros de coluna. */
export const RESERVED_PARAMS = new Set([
  "select",
  "order",
  "limit",
  "offset",
  "on_conflict",
  "columns",
]);

export interface ParamBag {
  /** Próximo índice de placeholder ($1, $2, ...). */
  next(): number;
  push(value: unknown): string;
  values(): unknown[];
}

export function createParamBag(initial: unknown[] = []): ParamBag {
  const params = [...initial];
  return {
    next: () => params.length + 1,
    push(value) {
      params.push(value);
      return `$${params.length}`;
    },
    values: () => params,
  };
}

const SIMPLE_OPERATORS: Record<string, string> = {
  eq: "=",
  neq: "<>",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  like: "LIKE",
  ilike: "ILIKE",
  match: "~",
  imatch: "~*",
};

const ARRAY_OPERATORS: Record<string, string> = {
  cs: "@>", // contains
  cd: "<@", // contained by
  ov: "&&", // overlaps
};

/**
 * Constrói a cláusula WHERE a partir dos query params.
 * Suporta: eq, neq, gt, gte, lt, lte, like, ilike, is, in, cs, cd, ov, not.*,
 * fts/plfts (busca textual) e os agrupadores `or`/`and`.
 */
export function buildWhere(
  query: Record<string, unknown>,
  bag: ParamBag,
): SqlFragment {
  const clauses: string[] = [];

  for (const [key, rawValue] of Object.entries(query)) {
    if (RESERVED_PARAMS.has(key)) continue;

    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (typeof value !== "string") continue;

      if (key === "or" || key === "and") {
        clauses.push(buildLogicalGroup(key, value, bag));
        continue;
      }
      clauses.push(buildCondition(key, value, bag));
    }
  }

  return {
    sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params: bag.values(),
  };
}

/** `or=(col.eq.1,col2.is.null)` → `(col = $1 OR col2 IS NULL)` */
function buildLogicalGroup(kind: "or" | "and", raw: string, bag: ParamBag): string {
  const inner = stripOuterParens(raw);
  const parts = splitTopLevel(inner, ",");
  const joiner = kind === "or" ? " OR " : " AND ";

  const conditions = parts.map((part) => {
    const trimmed = part.trim();
    if (trimmed.startsWith("or(") || trimmed.startsWith("and(")) {
      const nestedKind = trimmed.startsWith("or(") ? "or" : "and";
      const nestedBody = trimmed.slice(nestedKind.length);
      return buildLogicalGroup(nestedKind, nestedBody, bag);
    }
    const dotIndex = trimmed.indexOf(".");
    if (dotIndex === -1) {
      throw new RestError(400, `Filtro lógico inválido: ${trimmed}`);
    }
    const column = trimmed.slice(0, dotIndex);
    const expression = trimmed.slice(dotIndex + 1);
    return buildCondition(column, expression, bag);
  });

  return `(${conditions.join(joiner)})`;
}

function buildCondition(column: string, expression: string, bag: ParamBag): string {
  const dotIndex = expression.indexOf(".");
  if (dotIndex === -1) {
    // Sem operador explícito o PostgREST assume igualdade.
    return `${quoteColumnRef(column)} = ${bag.push(expression)}`;
  }

  let operator = expression.slice(0, dotIndex).toLowerCase();
  let operand = expression.slice(dotIndex + 1);
  let negated = false;

  if (operator === "not") {
    negated = true;
    const nextDot = operand.indexOf(".");
    if (nextDot === -1) {
      throw new RestError(400, `Operador "not" incompleto em ${column}`);
    }
    operator = operand.slice(0, nextDot).toLowerCase();
    operand = operand.slice(nextDot + 1);
  }

  const col = quoteColumnRef(column);
  let condition: string;

  if (operator === "is") {
    condition = `${col} IS ${parseIsOperand(operand)}`;
  } else if (operator === "in") {
    const items = parseInList(operand);
    condition = items.length
      ? `${col} = ANY(${bag.push(items)})`
      : "FALSE";
  } else if (operator in SIMPLE_OPERATORS) {
    condition = `${col} ${SIMPLE_OPERATORS[operator]} ${bag.push(decodeOperand(operand))}`;
  } else if (operator in ARRAY_OPERATORS) {
    condition = `${col} ${ARRAY_OPERATORS[operator]} ${bag.push(decodeOperand(operand))}`;
  } else if (operator === "fts" || operator === "plfts" || operator === "wfts") {
    const fn = operator === "plfts" ? "plainto_tsquery" : "to_tsquery";
    condition = `to_tsvector(${col}::text) @@ ${fn}(${bag.push(decodeOperand(operand))})`;
  } else {
    throw new RestError(400, `Operador não suportado: ${operator}`);
  }

  return negated ? `NOT (${condition})` : condition;
}

function parseIsOperand(operand: string): string {
  const normalized = operand.toLowerCase();
  if (normalized === "null") return "NULL";
  if (normalized === "true") return "TRUE";
  if (normalized === "false") return "FALSE";
  if (normalized === "unknown") return "UNKNOWN";
  throw new RestError(400, `Valor inválido para "is": ${operand}`);
}

function parseInList(operand: string): string[] {
  const inner = stripOuterParens(operand);
  if (inner.trim() === "") return [];
  return splitTopLevel(inner, ",").map((item) => {
    const trimmed = item.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
      return trimmed.slice(1, -1).replace(/\\"/g, '"');
    }
    return trimmed;
  });
}

function decodeOperand(operand: string): string {
  if (operand.startsWith('"') && operand.endsWith('"') && operand.length >= 2) {
    return operand.slice(1, -1).replace(/\\"/g, '"');
  }
  // O SDK usa `*` como curinga em like/ilike.
  return operand.replace(/\*/g, "%");
}

function stripOuterParens(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/** Split respeitando parênteses e strings entre aspas. */
function splitTopLevel(value: string, separator: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inQuotes = false;
  let current = "";

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char === '"' && value[i - 1] !== "\\") {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }
    if (!inQuotes) {
      if (char === "(") depth += 1;
      if (char === ")") depth -= 1;
      if (char === separator && depth === 0) {
        out.push(current);
        current = "";
        continue;
      }
    }
    current += char;
  }
  if (current.trim() !== "") out.push(current);
  return out;
}

/** `order=created_at.desc.nullslast,name.asc` → ORDER BY ... */
export function buildOrderBy(order: unknown): string {
  if (typeof order !== "string" || order.trim() === "") return "";

  const parts = order.split(",").map((piece) => {
    const [column, ...modifiers] = piece.trim().split(".");
    const normalized = modifiers.map((m) => m.toLowerCase());
    const direction = normalized.includes("desc") ? "DESC" : "ASC";
    const nulls = normalized.includes("nullsfirst")
      ? " NULLS FIRST"
      : normalized.includes("nullslast")
        ? " NULLS LAST"
        : "";
    return `${quoteColumnRef(column)} ${direction}${nulls}`;
  });

  return `ORDER BY ${parts.join(", ")}`;
}
