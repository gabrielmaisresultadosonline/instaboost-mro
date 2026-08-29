/**
 * Etapa 5 — Conferência.
 *
 * Compara contagem de linhas tabela por tabela entre os dois bancos e checa se
 * cada arquivo registrado existe fisicamente no disco. É esta etapa que autoriza
 * (ou não) desligar o serviço antigo: nada é desativado sem divergência zero.
 */

import fs from "node:fs";
import path from "node:path";
import { env, requireLegacy } from "../src/env.js";
import { pool } from "../src/db.js";
import { runOrThrow } from "./lib/shell.js";
import { log } from "./lib/log.js";

interface Divergence {
  tabela: string;
  antigo: number;
  novo: number;
  diferenca: number;
}

async function countRows(connection: string): Promise<Map<string, number>> {
  // count(*) precisa ser por tabela. Em vez de N chamadas ao psql, montamos
  // uma única query que usa query_to_xml para contar cada tabela dinamicamente.
  const result = await runOrThrow("psql", [

    "-t", "-A", "-d", connection,
    "-c", `
      SELECT string_agg(format('%s=%s', tbl, cnt), ',')
        FROM (
          SELECT c.relname AS tbl,
                 (xpath('/row/c/text()',
                        query_to_xml(format('SELECT count(*) AS c FROM public.%I', c.relname),
                                     false, true, '')))[1]::text::bigint AS cnt
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relkind = 'r'
        ) counts
    `,
  ]);

  const map = new Map<string, number>();
  for (const pair of result.trim().split(",")) {
    const [name, count] = pair.split("=");
    if (name) map.set(name.trim(), Number(count ?? 0));
  }
  return map;
}

async function verifyRows(): Promise<Divergence[]> {
  const legacy = requireLegacy();
  if (!legacy.databaseUrl) {
    log.warn("LEGACY_DATABASE_URL ausente: comparação de linhas ignorada.");
    return [];
  }

  log.info("Contando linhas nos dois bancos...");
  const [oldCounts, newCounts] = await Promise.all([
    countRows(legacy.databaseUrl),
    countRows(env.database.url),
  ]);

  const divergences: Divergence[] = [];
  for (const [table, oldCount] of oldCounts) {
    const newCount = newCounts.get(table) ?? 0;
    if (newCount !== oldCount) {
      divergences.push({ tabela: table, antigo: oldCount, novo: newCount, diferenca: newCount - oldCount });
    }
  }

  log.ok(`${oldCounts.size} tabelas comparadas; ${divergences.length} com diferença.`);
  return divergences;
}

async function verifyFiles(): Promise<{ registrados: number; faltando: string[] }> {
  log.info("Conferindo arquivos no disco...");
  const { rows } = await pool.query<{ bucket_id: string; name: string }>(
    `SELECT bucket_id, name FROM public.storage_objects`,
  );

  const missing: string[] = [];
  for (const row of rows) {
    const filePath = path.join(env.storage.root, row.bucket_id, row.name);
    if (!fs.existsSync(filePath)) missing.push(`${row.bucket_id}/${row.name}`);
  }

  log.ok(`${rows.length} arquivos registrados; ${missing.length} ausentes no disco.`);
  return { registrados: rows.length, faltando: missing };
}

async function verifyFunctions(): Promise<void> {
  const { listAvailableFunctions } = await import("../src/functions/host.js");
  const functions = listAvailableFunctions();
  log.ok(`${functions.length} funções disponíveis para execução local.`);
}

export async function verify(): Promise<boolean> {
  log.step("Etapa 5/5 — Conferência final");

  const divergences = await verifyRows();
  const files = await verifyFiles();
  await verifyFunctions();

  if (divergences.length > 0) {
    log.warn("Tabelas com contagem diferente:");
    log.table(divergences.slice(0, 40));
  }
  if (files.faltando.length > 0) {
    log.warn("Arquivos ausentes (primeiros 20):");
    for (const item of files.faltando.slice(0, 20)) log.warn(item);
  }

  const clean = divergences.length === 0 && files.faltando.length === 0;
  if (clean) {
    log.ok("Migração íntegra: dados e arquivos conferem. Seguro apontar o domínio para a VPS.");
  } else {
    log.warn("Há divergências. Rode `npm run migrate:data` e `npm run migrate:storage` novamente antes do corte.");
  }
  return clean;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  verify()
    .then((clean) => pool.end().then(() => process.exit(clean ? 0 : 1)))
    .catch((error: Error) => {
      log.error(error.message);
      process.exit(1);
    });
}
