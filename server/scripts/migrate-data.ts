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
import { quoteIdent } from "../src/rest/identifiers.js";

/** Tabelas gerenciadas pelo backend local — não vêm do banco antigo. */
const EXCLUDED = new Set([
  "auth_users",
  "storage_buckets",
  "storage_objects",
  "migration_runs",
]);

interface TableInfo {
  name: string;
  columns: string[];
  hasPrimaryKey: boolean;
  dependencies: string[];
}

interface LocalTableRow {
  table_name: string;
  columns: string[];
  has_pk: boolean;
}

async function listLocalTables(): Promise<TableInfo[]> {
  const result = await pool.query<LocalTableRow>(`
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
  const rows: LocalTableRow[] = result.rows;

  const tables = rows
    .filter((row) => !EXCLUDED.has(row.table_name) && !row.table_name.startsWith("_stg_"))
    .map((row) => ({
      name: row.table_name,
      columns: row.columns,
      hasPrimaryKey: row.has_pk,
      dependencies: [] as string[],
    }));

  const byName = new Map(tables.map((table) => [table.name, table]));
  const foreignKeys = await pool.query<{ child_table: string; parent_table: string }>(`
    SELECT child.relname AS child_table, parent.relname AS parent_table
      FROM pg_constraint fk
      JOIN pg_class child ON child.oid = fk.conrelid
      JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
      JOIN pg_class parent ON parent.oid = fk.confrelid
      JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
     WHERE fk.contype = 'f'
       AND child_ns.nspname = 'public'
       AND parent_ns.nspname = 'public'
  `);

  for (const foreignKey of foreignKeys.rows) {
    const table = byName.get(foreignKey.child_table);
    if (
      table &&
      foreignKey.parent_table !== foreignKey.child_table &&
      byName.has(foreignKey.parent_table) &&
      !table.dependencies.includes(foreignKey.parent_table)
    ) {
      table.dependencies.push(foreignKey.parent_table);
    }
  }

  return tables;
}

/** Pais precisam ser copiados antes dos filhos para preservar todas as FKs. */
function sortByForeignKeys(tables: TableInfo[]): TableInfo[] {
  const selected = new Set(tables.map((table) => table.name));
  const pending = new Map(
    tables.map((table) => [
      table.name,
      new Set(table.dependencies.filter((dependency) => selected.has(dependency))),
    ]),
  );
  const ordered: TableInfo[] = [];

  while (pending.size > 0) {
    const ready = [...pending.entries()]
      .filter(([, dependencies]) => dependencies.size === 0)
      .map(([name]) => name)
      .sort();

    if (ready.length === 0) {
      const cyclic = [...pending.keys()].sort();
      log.warn(`Dependência circular detectada entre: ${cyclic.join(", ")}. Essas tabelas serão tentadas em múltiplas passagens.`);
      ordered.push(...cyclic.map((name) => tables.find((table) => table.name === name)).filter((table): table is TableInfo => Boolean(table)));
      break;
    }

    for (const name of ready) {
      const table = tables.find((candidate) => candidate.name === name);
      if (table) ordered.push(table);
      pending.delete(name);
      for (const dependencies of pending.values()) dependencies.delete(name);
    }
  }

  return ordered;
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

  const columnList = columns.map(quoteIdent).join(", ");
  const staging = `_stg_${table.name}`.slice(0, 63);
  const target = `public.${quoteIdent(table.name)}`;

  // Tabela de apoio real (não TEMP): o COPY vem de um processo psql externo,
  // que abre a própria conexão e não veria uma tabela temporária nossa.
  const stagingReal = `public.${quoteIdent(staging)}`;
  await pool.query(`DROP TABLE IF EXISTS ${stagingReal}`);
  await pool.query(`CREATE UNLOGGED TABLE ${stagingReal} (LIKE ${target})`);


  try {
    await pipe(
      {
        command: "psql",
        args: [
          "-v", "ON_ERROR_STOP=1", "-d", legacyUrl,
          "-c", `COPY (SELECT ${columnList} FROM public.${quoteIdent(table.name)}) TO STDOUT WITH (FORMAT csv)`,
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

  const tables = sortByForeignKeys((await listLocalTables()).filter(
    (table) => !only || only.length === 0 || only.includes(table.name),
  ));
  log.info(`${tables.length} tabelas para sincronizar.`);

  const summary: Record<string, unknown>[] = [];
  let pending = [...tables];
  const lastErrors = new Map<string, string>();

  // Uma nova passagem resolve dependências indiretas e bancos parcialmente
  // migrados sem apagar o que já foi copiado nas execuções anteriores.
  for (let pass = 1; pending.length > 0 && pass <= tables.length; pass += 1) {
    const failedThisPass: TableInfo[] = [];
    let progress = 0;

    for (const table of pending) {
      try {
        const result = await copyTable(legacy.databaseUrl, table);
        if (result.copied > 0) {
          log.ok(`${table.name}: ${result.inserted}/${result.copied} linhas novas.`);
        }
        summary.push({ tabela: table.name, lidas: result.copied, inseridas: result.inserted });
        lastErrors.delete(table.name);
        progress += 1;
      } catch (error) {
        const message = (error as Error).message;
        lastErrors.set(table.name, message);
        failedThisPass.push(table);
      }
    }

    pending = failedThisPass;
    if (pending.length === 0) break;
    if (progress === 0) break;
    log.info(`Nova passagem: ${pending.length} tabelas aguardando dependências.`);
  }

  for (const table of pending) {
    const message = lastErrors.get(table.name) ?? "erro desconhecido";
    log.error(`${table.name}: ${message.split("\n")[0]}`);
    summary.push({ tabela: table.name, lidas: 0, inseridas: 0, erro: message.slice(0, 160) });
  }

  log.info("Reajustando sequences...");
  await resetSequences();

  const totalRows = summary.reduce((sum, row) => sum + Number(row.inseridas ?? 0), 0);
  log.ok(`${totalRows} linhas importadas. ${pending.length} tabelas com erro.`);

  if (pending.length > 0) {
    log.table(summary.filter((row) => row.erro));
    throw new Error(`${pending.length} tabelas não puderam ser migradas. O corte foi bloqueado para evitar perda de dados.`);
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
