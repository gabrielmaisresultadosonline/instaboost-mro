/**
 * Parser do parâmetro `select` no formato PostgREST.
 *
 * Suporta:
 *   *                          → todas as colunas
 *   id,nome                    → colunas específicas
 *   apelido:coluna             → alias
 *   filhos(id,nome)            → relacionamento embutido (1 nível de nesting
 *                                aninhado recursivamente quando necessário)
 *   count                      → contagem via header Prefer
 */

import { findRelationship } from "./schema-cache.js";
import { quoteIdent, RestError } from "./identifiers.js";

interface SelectNode {
  alias: string;
  /** Nome da coluna ou da tabela relacionada. */
  target: string;
  children: SelectNode[] | null;
}

export function parseSelect(raw: unknown): SelectNode[] {
  if (typeof raw !== "string" || raw.trim() === "" || raw.trim() === "*") {
    return [{ alias: "*", target: "*", children: null }];
  }
  return parseNodes(raw.trim());
}

function parseNodes(input: string): SelectNode[] {
  const nodes: SelectNode[] = [];
  let depth = 0;
  let current = "";

  const flush = () => {
    const piece = current.trim();
    current = "";
    if (piece === "") return;
    nodes.push(parseNode(piece));
  };

  for (const char of input) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      flush();
      continue;
    }
    current += char;
  }
  flush();

  return nodes;
}

function parseNode(piece: string): SelectNode {
  const parenIndex = piece.indexOf("(");

  if (parenIndex === -1) {
    const [aliasOrTarget, maybeTarget] = piece.split(":");
    const target = (maybeTarget ?? aliasOrTarget).trim();
    const alias = maybeTarget ? aliasOrTarget.trim() : target;
    // Descartamos casts (`coluna::text`) por não serem usados no app.
    return { alias, target: target.split("::")[0], children: null };
  }

  if (!piece.endsWith(")")) {
    throw new RestError(400, `select inválido: ${piece}`);
  }

  const head = piece.slice(0, parenIndex).trim();
  const body = piece.slice(parenIndex + 1, -1);
  const [aliasOrTarget, maybeTarget] = head.split(":");
  const target = (maybeTarget ?? aliasOrTarget).trim();
  const alias = maybeTarget ? aliasOrTarget.trim() : target;
  // Ex.: `perfis!inner(...)` — o modificador de join não altera nosso plano.
  const cleanTarget = target.split("!")[0];

  return { alias, target: cleanTarget, children: parseNodes(body) };
}

/**
 * Converte os nós em uma lista de expressões SQL para a projeção.
 * Relacionamentos embutidos viram subqueries correlacionadas com json_agg,
 * o que evita duplicação de linhas (problema clássico do JOIN + array).
 */
export async function buildProjection(
  table: string,
  nodes: SelectNode[],
): Promise<string> {
  const expressions: string[] = [];

  for (const node of nodes) {
    if (node.children === null) {
      if (node.target === "*") {
        expressions.push(`${quoteIdent(table)}.*`);
        continue;
      }
      expressions.push(
        `${quoteIdent(table)}.${quoteIdent(node.target)} AS ${quoteIdent(node.alias)}`,
      );
      continue;
    }

    const relationship = await findRelationship(table, node.target);
    if (!relationship) {
      throw new RestError(
        400,
        `Não foi possível resolver o relacionamento entre "${table}" e "${node.target}". ` +
          `Verifique se existe uma foreign key entre as tabelas.`,
      );
    }

    const childProjection = await buildProjection(node.target, node.children);
    const childTable = quoteIdent(node.target);
    const join =
      `${childTable}.${quoteIdent(relationship.foreignColumn)} = ` +
      `${quoteIdent(table)}.${quoteIdent(relationship.localColumn)}`;

    if (relationship.kind === "many") {
      expressions.push(
        `COALESCE((
           SELECT json_agg(sub)
             FROM (SELECT ${childProjection} FROM ${childTable} WHERE ${join}) sub
         ), '[]'::json) AS ${quoteIdent(node.alias)}`,
      );
    } else {
      expressions.push(
        `(
           SELECT row_to_json(sub)
             FROM (SELECT ${childProjection} FROM ${childTable} WHERE ${join} LIMIT 1) sub
         ) AS ${quoteIdent(node.alias)}`,
      );
    }
  }

  return expressions.join(", ");
}
