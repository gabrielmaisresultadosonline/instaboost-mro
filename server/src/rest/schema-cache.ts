/**
 * Cache de metadados do schema (colunas, PKs e foreign keys).
 *
 * Precisamos disso para dois recursos que o app usa hoje:
 *  - `upsert` sem `onConflict` explícito (usa a PK)
 *  - `select` com relacionamento embutido, ex.: `select('*, ig_messages(*)')`
 *
 * Carregamos uma vez e revalidamos a cada 5 minutos: o schema muda por
 * migration, não por requisição.
 */

import { adminQuery } from "../db.js";

interface ForeignKey {
  /** Tabela que possui a coluna FK. */
  table: string;
  column: string;
  foreignTable: string;
  foreignColumn: string;
}

interface SchemaSnapshot {
  loadedAt: number;
  tables: Map<string, { columns: Set<string>; primaryKey: string[] }>;
  foreignKeys: ForeignKey[];
}

const TTL_MS = 5 * 60 * 1000;
let snapshot: SchemaSnapshot | null = null;
let loading: Promise<SchemaSnapshot> | null = null;

async function load(): Promise<SchemaSnapshot> {
  const columns = await adminQuery<{ table_name: string; column_name: string }>(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'`,
  );

  const primaryKeys = await adminQuery<{ table_name: string; column_name: string; ord: number }>(
    `SELECT tc.table_name, kcu.column_name, kcu.ordinal_position AS ord
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON kcu.constraint_name = tc.constraint_name
        AND kcu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY tc.table_name, kcu.ordinal_position`,
  );

  const fks = await adminQuery<ForeignKey>(
    `SELECT kcu.table_name       AS table,
            kcu.column_name      AS column,
            ccu.table_name       AS "foreignTable",
            ccu.column_name      AS "foreignColumn"
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON kcu.constraint_name = tc.constraint_name
        AND kcu.table_schema = tc.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'FOREIGN KEY'`,
  );

  const tables = new Map<string, { columns: Set<string>; primaryKey: string[] }>();
  for (const row of columns) {
    const entry = tables.get(row.table_name) ?? { columns: new Set<string>(), primaryKey: [] };
    entry.columns.add(row.column_name);
    tables.set(row.table_name, entry);
  }
  for (const row of primaryKeys) {
    const entry = tables.get(row.table_name);
    if (entry) entry.primaryKey.push(row.column_name);
  }

  return { loadedAt: Date.now(), tables, foreignKeys: fks };
}

export async function getSchema(): Promise<SchemaSnapshot> {
  if (snapshot && Date.now() - snapshot.loadedAt < TTL_MS) return snapshot;
  if (!loading) {
    loading = load()
      .then((fresh) => {
        snapshot = fresh;
        return fresh;
      })
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

export async function tableExists(table: string): Promise<boolean> {
  const schema = await getSchema();
  return schema.tables.has(table);
}

export async function getPrimaryKey(table: string): Promise<string[]> {
  const schema = await getSchema();
  return schema.tables.get(table)?.primaryKey ?? [];
}

/**
 * Descobre como duas tabelas se relacionam.
 * Retorna a direção para montarmos a subquery correta no select embutido.
 */
export async function findRelationship(
  fromTable: string,
  toTable: string,
): Promise<
  | { kind: "many"; localColumn: string; foreignColumn: string }
  | { kind: "one"; localColumn: string; foreignColumn: string }
  | null
> {
  const schema = await getSchema();

  // toTable aponta para fromTable → um-para-muitos (array de filhos)
  const child = schema.foreignKeys.find(
    (fk) => fk.table === toTable && fk.foreignTable === fromTable,
  );
  if (child) {
    return { kind: "many", localColumn: child.foreignColumn, foreignColumn: child.column };
  }

  // fromTable aponta para toTable → muitos-para-um (objeto único)
  const parent = schema.foreignKeys.find(
    (fk) => fk.table === fromTable && fk.foreignTable === toTable,
  );
  if (parent) {
    return { kind: "one", localColumn: parent.column, foreignColumn: parent.foreignColumn };
  }

  return null;
}

export function invalidateSchemaCache(): void {
  snapshot = null;
}
