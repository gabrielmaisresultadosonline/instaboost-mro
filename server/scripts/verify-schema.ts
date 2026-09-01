/**
 * Conferência estrutural: origem × VPS.
 *
 * Contar linhas não prova que a estrutura chegou inteira. Aqui comparamos,
 * objeto por objeto, o que realmente decide se a aplicação funciona igual:
 * chaves primárias, uniques, checks, foreign keys, índices, sequences,
 * triggers, funções e RLS/policies.
 *
 * Uso: npm run migrate:verify-schema
 */

import { env, requireLegacy } from "../src/env.js";
import { runOrThrow } from "./lib/shell.js";
import { log } from "./lib/log.js";

export interface SchemaDivergence {
  categoria: string;
  objeto: string;
  situacao: string;
}

/** Consultas que devolvem uma lista de "assinaturas" comparáveis entre bancos. */
const PROBES: { categoria: string; sql: string }[] = [
  {
    categoria: "primary key",
    sql: `SELECT conrelid::regclass::text || ' -> ' || pg_get_constraintdef(oid)
            FROM pg_constraint
           WHERE connamespace = 'public'::regnamespace AND contype = 'p'`,
  },
  {
    categoria: "unique",
    sql: `SELECT conrelid::regclass::text || ' -> ' || pg_get_constraintdef(oid)
            FROM pg_constraint
           WHERE connamespace = 'public'::regnamespace AND contype = 'u'`,
  },
  {
    categoria: "check",
    sql: `SELECT conrelid::regclass::text || ' -> ' || pg_get_constraintdef(oid)
            FROM pg_constraint
           WHERE connamespace = 'public'::regnamespace AND contype = 'c'`,
  },
  {
    categoria: "foreign key",
    // auth.users vira public.auth_users localmente: normalizamos para comparar.
    sql: `SELECT conrelid::regclass::text || ' -> ' ||
                 replace(pg_get_constraintdef(oid), 'auth.users', 'auth_users')
            FROM pg_constraint
           WHERE connamespace = 'public'::regnamespace AND contype = 'f'`,
  },
  {
    categoria: "index",
    sql: `SELECT tablename || ' -> ' || indexname FROM pg_indexes WHERE schemaname = 'public'`,
  },
  {
    categoria: "sequence",
    sql: `SELECT c.relname FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relkind = 'S'`,
  },
  {
    categoria: "trigger",
    sql: `SELECT c.relname || ' -> ' || t.tgname
            FROM pg_trigger t
            JOIN pg_class c ON c.oid = t.tgrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE NOT t.tgisinternal AND n.nspname = 'public'`,
  },
  {
    categoria: "function",
    sql: `SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.prokind IN ('f','p')`,
  },
  {
    categoria: "policy",
    sql: `SELECT tablename || ' -> ' || policyname FROM pg_policies WHERE schemaname = 'public'`,
  },
  {
    categoria: "rls habilitado",
    sql: `SELECT c.relname FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity`,
  },
];

async function collect(connection: string, sql: string): Promise<Set<string>> {
  const output = await runOrThrow("psql", ["-t", "-A", "-d", connection, "-c", sql]);
  return new Set(
    output
      .split("\n")
      .map((line) => line.trim().replace(/\s+/g, " "))
      .filter(Boolean),
  );
}

export async function verifySchema(): Promise<SchemaDivergence[]> {
  log.step("Conferência estrutural (PKs, FKs, índices, triggers, funções, policies)");

  const legacy = requireLegacy();
  if (!legacy.databaseUrl) {
    log.warn("LEGACY_DATABASE_URL ausente: comparação estrutural ignorada.");
    return [];
  }

  const divergences: SchemaDivergence[] = [];

  for (const probe of PROBES) {
    const [origem, destino] = await Promise.all([
      collect(legacy.databaseUrl, probe.sql),
      collect(env.database.url, probe.sql),
    ]);

    const faltando = [...origem].filter((item) => !destino.has(item));
    const extra = [...destino].filter((item) => !origem.has(item));

    for (const item of faltando) {
      divergences.push({ categoria: probe.categoria, objeto: item, situacao: "ausente na VPS" });
    }
    // Objetos extras na VPS vêm do bootstrap local (auth_users, storage_*) e
    // não impedem o corte, mas ficam registrados.
    for (const item of extra) {
      if (/auth_users|storage_(objects|buckets)|migration_runs/i.test(item)) continue;
      divergences.push({ categoria: probe.categoria, objeto: item, situacao: "só existe na VPS" });
    }

    const status = faltando.length === 0 ? log.ok : log.warn;
    status(`${probe.categoria}: origem ${origem.size} / VPS ${destino.size} — ${faltando.length} ausentes.`);
  }

  const criticos = divergences.filter((item) => item.situacao === "ausente na VPS");
  if (criticos.length > 0) {
    log.warn(`${criticos.length} objetos estruturais ausentes na VPS (primeiros 30):`);
    log.table(criticos.slice(0, 30));
  } else {
    log.ok("Estrutura completa: nada ausente na VPS.");
  }

  return divergences;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  verifySchema()
    .then((divergences) => {
      const criticos = divergences.filter((item) => item.situacao === "ausente na VPS");
      process.exit(criticos.length === 0 ? 0 : 1);
    })
    .catch((error: Error) => {
      log.error(error.message);
      process.exit(1);
    });
}
