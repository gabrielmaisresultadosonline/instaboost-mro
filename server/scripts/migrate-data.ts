/**
 * Etapa 2 — Dados (leads, usuários, pedidos, históricos: as 219 tabelas).
 *
 * Estratégia: COPY em streaming do banco atual direto para uma tabela
 * temporária local, seguido de INSERT ... ON CONFLICT DO NOTHING na tabela
 * final. Isso torna o script repetível — pode rodar quantas vezes quiser
 * durante o período em que os dois bancos coexistem, sem duplicar linhas.
 *
 * Não usamos `pg_dump --data-only` direto porque ele falharia no segundo
 * uso (chaves duplicadas) e não permite sincronização incremental.
 */

import { env, requireLegacy } from "../src/env.js";
import { pool } from "../src/db.js";
import { pipe, runOrThrow } from "./lib/shell.js";
import { log } from "./lib/log.js";
import { quoteIdentifier } from "../src/rest/identifiers.js";

/** Tabelas gerenciadas pelo backend local — não vêm do banco antigo. */
const EXCLUDED = new Set([
  "storage_buckets",
  "storage_objects",
  "migration_runs",
]);

interface TableInfo {
  name: string;
  columns: string[];
  hasPrimaryKey: boolean;
}

async function listLocalTables(): Promise<TableInfo[]> {
  const { rows } = await pool.query<{ table_name: string; columns: string[]; has_pk: boolean }>(`
    SELECT c.relname AS table_name,
           array_agg(a.attname::text ORDER BY a.attnum) AS columns,
           EXISTS (
             SELECT 1 FROM pg_constraint k
              WHERE k.conrelid = c.oid AND k.contype = 'p'
           ) AS has_pk
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       -- colunas geradas não podem ser inseridas
       AND a.attgenerated = ''
     GROUP BY c.relname, c.oid
     ORDER BY c.relname
  `);

  return rows
    .filter((row) => !EXCLUDED.has(row.table_name))
    .map((row) => ({ name: row.table_name, columns: row.columns, hasPrimaryKey: row.has_pk }));
}

async function legacyColumns(legacyUrl: string, table: string): Promise<Set<string>> {
  const output = await runOrThrow("psql", [
    "-t", "-A", "-d", legacyUrl,
    "-c", `SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = '${table}'`,
  ]);
  return new Set(output.split("\n").map((line) => line.trim()).filter(Boolean));
}

async function copyTable(legacyUrl: string, table: TableInfo): Promise<{ copied: number; inserted: number }> {
  const available = await legacyColumns(legacyUrl, table.name);
  if (available.size === 0) {
    log.warn(`${table.name}: não existe no banco antigo; ignorada.`);
    return { copied: 0, inserted: 0 };
  }

  // Só migramos colunas presentes nos dois lados: schemas podem divergir
  // se alguma migração foi aplicada apenas de um lado.
  const columns = table.columns.filter((column) => available.has(column));
  if (columns.length === 0) {
    log.warn(`${table.name}: nenhuma coluna em comum; ignorada.`);
    return { copied: 0, inserted: 0 };
  }

  const columnList = columns.map(quoteIdentifier).join(", ");
  const staging = `_stg_${table.name}`.slice(0, 63);
  const target = `public.${quoteIdentifier(table.name)}`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL role service_role`);
    await client.query(
      `CREATE TEMP TABLE ${quoteIdentifier(staging)} (LIKE ${target} INCLUDING DEFAULTS) ON COMMIT DROP`,
    );
    await client.query("COMMIT");
  } finally {
    client.release();
  }

  // Tabela temporária não sobrevive à conexão; usamos uma tabela real
  // descartável para o COPY vindo do psql externo.
  const stagingReal = `public.${quoteIdentifier(staging)}`;
  await pool.query(`DROP TABLE IF EXISTS ${stagingReal}`);
  await pool.query(`CREATE UNLOGGED TABLE ${stagingReal} (LIKE ${target})`);

  try {
    await pipe(
      {
        command: "psql",
        args: [
          "-v", "ON_ERROR_STOP=1", "-d", legacyUrl,
          "-c", `COPY (SELECT ${columnList} FROM public.${quoteIdentifier(table.name)}) TO STDOUT WITH (FORMAT csv)`,
        ],
      },
      {
        command: "psql",
        args: [
          "-v", "ON_ERROR_STOP=1", "-d", env.database.url,
          "-c", `COPY ${stagingReal} (${columnList}) FROM STDIN WITH (FORMAT csv)`,
        ],
      },
    );

    const staged = await pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM ${stagingReal}`);
    const copied = Number(staged.rows[0]?.count ?? 0);

    // Sem PK não há como detectar duplicata: só inserimos se a tabela estiver vazia.
    if (!table.hasPrimaryKey) {
      const existing = await pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM ${target}`);
      if (Number(existing.rows[0]?.count ?? 0) > 0) {
        log.warn(`${table.name}: sem chave primária e já contém dados; sincronização ignorada para evitar duplicatas.`);
        return { copied, inserted: 0 };
      }
    }

    const conflictClause = table.hasPrimaryKey ? "ON CONFLICT DO NOTHING" : "";
    const inserted = await pool.query(
      `INSERT INTO ${target} (${columnList})
       SELECT ${columnList} FROM ${stagingReal}
       ${conflictClause}`,
    );

    return { copied, inserted: inserted.rowCount ?? 0 };
  } finally {
    await pool.query(`DROP TABLE IF EXISTS ${stagingReal}`);
  }
}

async function resetSequences(): Promise<void> {
  await pool.query(`
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN
        SELECT s.relname AS seq, t.relname AS tbl, a.attname AS col
          FROM pg_class s
          JOIN pg_depend d ON d.objid = s.oid AND d.classid = 'pg_class'::regclass
          JOIN pg_class t ON t.oid = d.refobjid
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
          JOIN pg_namespace n ON n.oid = s.relnamespace
         WHERE s.relkind = 'S' AND n.nspname = 'public'
      LOOP
        EXECUTE format(
          'SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM public.%I), 0) + 1, false)',
          'public.' || r.seq, r.col, r.tbl
        );
      END LOOP;
    END $$;
  `);
}

export async function migrateData(only?: string[]): Promise<void> {
  log.step("Etapa 2/5 — Dados das tabelas");

  const legacy = requireLegacy();
  if (!legacy.databaseUrl) {
    log.warn("LEGACY_DATABASE_URL ausente: pulando a cópia de dados.");
    return;
  }

  const tables = (await listLocalTables()).filter(
    (table) => !only || only.length === 0 || only.includes(table.name),
  );
  log.info(`${tables.length} tabelas para sincronizar.`);

  const summary: Record<string, unknown>[] = [];
  let failures = 0;

  for (const table of tables) {
    try {
      const result = await copyTable(legacy.databaseUrl, table);
      if (result.copied > 0) {
        log.ok(`${table.name}: ${result.inserted}/${result.copied} linhas novas.`);
      }
      summary.push({ tabela: table.name, lidas: result.copied, inseridas: result.inserted });
    } catch (error) {
      failures += 1;
      log.error(`${table.name}: ${(error as Error).message.split("\n")[0]}`);
      summary.push({ tabela: table.name, lidas: 0, inseridas: 0, erro: (error as Error).message.slice(0, 80) });
    }
  }

  log.info("Reajustando sequences...");
  await resetSequences();

  const totalRows = summary.reduce((sum, row) => sum + Number(row.inseridas ?? 0), 0);
  log.ok(`${totalRows} linhas importadas. ${failures} tabelas com erro.`);

  if (failures > 0) {
    log.table(summary.filter((row) => row.erro));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const only = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  migrateData(only)
    .then(() => pool.end())
    .catch((error: Error) => {
      log.error(error.message);
      process.exit(1);
    });
}
