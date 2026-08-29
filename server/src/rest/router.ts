/**
 * Rotas REST compatíveis com PostgREST/Supabase.
 *
 * Cobre a superfície que o app realmente usa: select (com filtros, ordenação,
 * paginação, contagem e relacionamentos embutidos), insert, upsert, update,
 * delete e chamadas RPC. Tudo executado sob RLS, com bind parameters.
 */

import { Router, type Request, type Response } from "express";
import { withSession } from "../db.js";
import { resolveAuth } from "../auth-context.js";
import { buildOrderBy, buildWhere, createParamBag } from "./filters.js";
import { buildProjection, parseSelect } from "./select.js";
import { getPrimaryKey, tableExists } from "./schema-cache.js";
import { quoteIdent, RestError } from "./identifiers.js";

export const restRouter = Router();

interface PreferOptions {
  returnRepresentation: boolean;
  mergeDuplicates: boolean;
  ignoreDuplicates: boolean;
  count: "exact" | "planned" | "estimated" | null;
  singleObject: boolean;
}

function parsePrefer(req: Request): PreferOptions {
  const prefer = (req.header("prefer") ?? "").toLowerCase();
  const accept = (req.header("accept") ?? "").toLowerCase();
  const countMatch = /count=(exact|planned|estimated)/.exec(prefer);

  return {
    returnRepresentation: prefer.includes("return=representation"),
    mergeDuplicates: prefer.includes("resolution=merge-duplicates"),
    ignoreDuplicates: prefer.includes("resolution=ignore-duplicates"),
    count: countMatch ? (countMatch[1] as PreferOptions["count"]) : null,
    singleObject: accept.includes("application/vnd.pgrst.object+json"),
  };
}

/** Range: 0-49 (paginação do SDK via `.range()`). */
function parseRange(req: Request): { offset: number; limit: number } | null {
  const header = req.header("range");
  if (!header) return null;
  const match = /^(\d+)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const start = Number.parseInt(match[1], 10);
  if (match[2] === "") return { offset: start, limit: Number.MAX_SAFE_INTEGER };
  const end = Number.parseInt(match[2], 10);
  return { offset: start, limit: Math.max(0, end - start + 1) };
}

async function assertTable(table: string): Promise<void> {
  if (!(await tableExists(table))) {
    throw new RestError(404, `Tabela não encontrada: ${table}`, undefined, "42P01");
  }
}

restRouter.get("/:table", async (req, res) => {
  await handleSelect(req, res);
});

// O SDK usa POST + `Prefer` para leituras muito longas em alguns casos.
restRouter.head("/:table", async (req, res) => {
  await handleSelect(req, res);
});

async function handleSelect(req: Request, res: Response): Promise<void> {
  const table = req.params.table;
  await assertTable(table);

  const prefer = parsePrefer(req);
  const auth = resolveAuth(req);
  const projection = await buildProjection(table, parseSelect(req.query.select));

  const bag = createParamBag();
  const where = buildWhere(req.query as Record<string, unknown>, bag);
  const orderBy = buildOrderBy(req.query.order);

  const range = parseRange(req);
  const limitParam = typeof req.query.limit === "string" ? Number(req.query.limit) : null;
  const offsetParam = typeof req.query.offset === "string" ? Number(req.query.offset) : null;

  const limit = limitParam ?? range?.limit ?? null;
  const offset = offsetParam ?? range?.offset ?? 0;

  const clauses = [
    `SELECT ${projection} FROM ${quoteIdent(table)}`,
    where.sql,
    orderBy,
    limit !== null && Number.isFinite(limit) ? `LIMIT ${Math.max(0, Math.trunc(limit))}` : "",
    offset > 0 ? `OFFSET ${Math.trunc(offset)}` : "",
  ].filter(Boolean);

  const { rows, total } = await withSession(auth, async (client) => {
    const result = await client.query(clauses.join(" "), bag.values());

    let count: number | null = null;
    if (prefer.count) {
      const countBag = createParamBag();
      const countWhere = buildWhere(req.query as Record<string, unknown>, countBag);
      const countSql = `SELECT count(*)::bigint AS total FROM ${quoteIdent(table)} ${countWhere.sql}`;
      const countResult = await client.query(countSql, countBag.values());
      count = Number(countResult.rows[0]?.total ?? 0);
    }

    return { rows: result.rows, total: count };
  });

  if (total !== null) {
    const from = offset;
    const to = offset + rows.length - 1;
    res.setHeader("Content-Range", `${from}-${to < from ? from : to}/${total}`);
  }

  if (prefer.singleObject) {
    if (rows.length === 0) {
      // `single()` espera erro; `maybeSingle()` trata este código como null.
      res.status(406).json({
        code: "PGRST116",
        details: "Results contain 0 rows",
        hint: null,
        message: "JSON object requested, multiple (or no) rows returned",
      });
      return;
    }
    res.json(rows[0]);
    return;
  }

  res.json(rows);
}

restRouter.post("/:table", async (req, res) => {
  const table = req.params.table;
  await assertTable(table);

  const prefer = parsePrefer(req);
  const auth = resolveAuth(req);
  const payload = Array.isArray(req.body) ? req.body : [req.body];

  if (payload.length === 0) {
    res.status(prefer.returnRepresentation ? 200 : 201).json([]);
    return;
  }

  // Toda linha do lote precisa usar o mesmo conjunto de colunas para um único
  // INSERT multi-valores. Unificamos as chaves e completamos com DEFAULT.
  const columns = [...new Set(payload.flatMap((row) => Object.keys(row ?? {})))];
  if (columns.length === 0) {
    throw new RestError(400, "Payload vazio para insert.");
  }

  const bag = createParamBag();
  const valueTuples = payload.map((row) => {
    const placeholders = columns.map((column) => {
      const value = (row ?? {})[column];
      return value === undefined ? "DEFAULT" : bag.push(normalizeValue(value));
    });
    return `(${placeholders.join(", ")})`;
  });

  let conflictClause = "";
  if (prefer.mergeDuplicates || prefer.ignoreDuplicates) {
    const onConflict =
      typeof req.query.on_conflict === "string" && req.query.on_conflict.trim() !== ""
        ? req.query.on_conflict.split(",").map((c) => c.trim())
        : await getPrimaryKey(table);

    if (onConflict.length === 0) {
      throw new RestError(400, `Não há chave de conflito definida para ${table}.`);
    }

    const target = onConflict.map(quoteIdent).join(", ");
    if (prefer.ignoreDuplicates) {
      conflictClause = `ON CONFLICT (${target}) DO NOTHING`;
    } else {
      const updatable = columns.filter((column) => !onConflict.includes(column));
      conflictClause = updatable.length
        ? `ON CONFLICT (${target}) DO UPDATE SET ${updatable
            .map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`)
            .join(", ")}`
        : `ON CONFLICT (${target}) DO NOTHING`;
    }
  }

  const returning = prefer.returnRepresentation
    ? `RETURNING ${await buildProjection(table, parseSelect(req.query.select))}`
    : "";

  const sql = [
    `INSERT INTO ${quoteIdent(table)} (${columns.map(quoteIdent).join(", ")})`,
    `VALUES ${valueTuples.join(", ")}`,
    conflictClause,
    returning,
  ]
    .filter(Boolean)
    .join(" ");

  const rows = await withSession(auth, async (client) => {
    const result = await client.query(sql, bag.values());
    return result.rows;
  });

  if (!prefer.returnRepresentation) {
    res.status(201).end();
    return;
  }

  res.status(201).json(prefer.singleObject ? (rows[0] ?? null) : rows);
});

restRouter.patch("/:table", async (req, res) => {
  const table = req.params.table;
  await assertTable(table);

  const prefer = parsePrefer(req);
  const auth = resolveAuth(req);
  const payload = req.body ?? {};
  const columns = Object.keys(payload);

  if (columns.length === 0) {
    throw new RestError(400, "Payload vazio para update.");
  }

  const bag = createParamBag();
  const assignments = columns
    .map((column) => `${quoteIdent(column)} = ${bag.push(normalizeValue(payload[column]))}`)
    .join(", ");

  const where = buildWhere(req.query as Record<string, unknown>, bag);
  if (!where.sql) {
    // Sem filtro, um PATCH atualizaria a tabela inteira. O PostgREST bloqueia
    // e nós fazemos o mesmo — protege contra bugs catastróficos no frontend.
    throw new RestError(400, "UPDATE sem filtro é bloqueado por segurança.");
  }

  const returning = prefer.returnRepresentation
    ? `RETURNING ${await buildProjection(table, parseSelect(req.query.select))}`
    : "";

  const sql = [`UPDATE ${quoteIdent(table)} SET ${assignments}`, where.sql, returning]
    .filter(Boolean)
    .join(" ");

  const rows = await withSession(auth, async (client) => {
    const result = await client.query(sql, bag.values());
    return result.rows;
  });

  if (!prefer.returnRepresentation) {
    res.status(204).end();
    return;
  }
  res.status(200).json(prefer.singleObject ? (rows[0] ?? null) : rows);
});

restRouter.delete("/:table", async (req, res) => {
  const table = req.params.table;
  await assertTable(table);

  const prefer = parsePrefer(req);
  const auth = resolveAuth(req);

  const bag = createParamBag();
  const where = buildWhere(req.query as Record<string, unknown>, bag);
  if (!where.sql) {
    throw new RestError(400, "DELETE sem filtro é bloqueado por segurança.");
  }

  const returning = prefer.returnRepresentation
    ? `RETURNING ${await buildProjection(table, parseSelect(req.query.select))}`
    : "";

  const sql = [`DELETE FROM ${quoteIdent(table)}`, where.sql, returning]
    .filter(Boolean)
    .join(" ");

  const rows = await withSession(auth, async (client) => {
    const result = await client.query(sql, bag.values());
    return result.rows;
  });

  if (!prefer.returnRepresentation) {
    res.status(204).end();
    return;
  }
  res.status(200).json(prefer.singleObject ? (rows[0] ?? null) : rows);
});

/**
 * `supabase.rpc('nome', args)` → SELECT public.nome(args).
 * Argumentos nomeados evitam qualquer dependência de ordem dos parâmetros.
 */
restRouter.post("/rpc/:fn", async (req, res) => {
  const fn = quoteIdent(req.params.fn);
  const auth = resolveAuth(req);
  const args = (req.body ?? {}) as Record<string, unknown>;
  const prefer = parsePrefer(req);

  const bag = createParamBag();
  const argExpressions = Object.entries(args).map(
    ([key, value]) => `${quoteIdent(key)} => ${bag.push(normalizeValue(value))}`,
  );

  const sql = `SELECT * FROM public.${fn}(${argExpressions.join(", ")})`;

  const result = await withSession(auth, async (client) => client.query(sql, bag.values()));

  // Funções escalares vêm como { nome_da_funcao: valor }; o PostgREST devolve
  // o valor cru nesse caso, e o SDK conta com isso.
  const rows = result.rows;
  if (rows.length === 1 && Object.keys(rows[0]).length === 1) {
    const [onlyValue] = Object.values(rows[0]);
    res.json(onlyValue);
    return;
  }
  if (rows.length === 0) {
    res.json(prefer.singleObject ? null : []);
    return;
  }
  res.json(prefer.singleObject ? rows[0] : rows);
});

/** jsonb/array precisam ir como JSON string para o driver `pg`. */
function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    // Arrays de escalares podem ser text[]/jsonb; JSON cobre os dois casos
    // quando a coluna é jsonb e o driver converte quando é array nativo.
    return value.every((item) => typeof item === "string" || typeof item === "number")
      ? value
      : JSON.stringify(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}
