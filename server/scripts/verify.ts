/**
 * Etapa 5 — Conferência.
 *
 * Compara contagem de linhas tabela por tabela entre os dois bancos, checa se
 * cada arquivo registrado existe no disco, valida a leitura pública pelo
 * domínio da VPS, o backend local e os agendamentos. É esta etapa que autoriza
 * (ou não) o corte: nada é apontado para a VPS com divergência crítica.
 *
 * Diferenças são classificadas:
 *  - FALTANDO (VPS < origem)  → crítico, bloqueia o corte.
 *  - EXCEDENTE (VPS > origem) → informativo (linhas gravadas na VPS durante
 *    os testes, ou removidas na origem depois da cópia). Fica documentado.
 */

import fs from "node:fs";
import path from "node:path";
import { env, requireLegacy } from "../src/env.js";
import { pool } from "../src/db.js";
import { runOrThrow, run } from "./lib/shell.js";
import { log } from "./lib/log.js";
import { verifySchema, type SchemaDivergence } from "./verify-schema.js";

interface Divergence {
  tabela: string;
  antigo: number;
  novo: number;
  diferenca: number;
  tipo: "faltando" | "excedente";
}

export interface VerifyReport {
  banco: boolean;
  tabelas: boolean;
  dados: boolean;
  storage: boolean;
  schema: boolean;
  cron: boolean;
  backend: boolean;
  faltando: Divergence[];
  excedentes: Divergence[];
  arquivosAusentes: string[];
  schemaDivergencias: SchemaDivergence[];
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

async function verifyRows(): Promise<{ divergences: Divergence[]; tabelas: number }> {
  const legacy = requireLegacy();
  if (!legacy.databaseUrl) {
    log.warn("LEGACY_DATABASE_URL ausente: comparação de linhas ignorada.");
    return { divergences: [], tabelas: 0 };
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
      divergences.push({
        tabela: table,
        antigo: oldCount,
        novo: newCount,
        diferenca: newCount - oldCount,
        tipo: newCount < oldCount ? "faltando" : "excedente",
      });
    }
  }

  log.ok(`${oldCounts.size} tabelas comparadas; ${divergences.length} com diferença.`);
  return { divergences, tabelas: oldCounts.size };
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

/**
 * Leitura pública real pelo domínio: um arquivo por bucket e, além disso, um
 * de cada tipo relevante (imagem, vídeo, PDF, JSON). Arquivo no disco não
 * prova que o Nginx e as permissões estão certos.
 */
async function verifyPublicReads(): Promise<boolean> {
  log.info(`Testando leitura pública em ${env.publicUrl}/storage/v1/object/public/ ...`);

  const { rows } = await pool.query<{ bucket_id: string; name: string; content_type: string | null }>(`
    WITH ranked AS (
      SELECT o.bucket_id, o.name, o.content_type,
             row_number() OVER (
               PARTITION BY o.bucket_id,
                            coalesce(split_part(o.content_type, '/', 1), 'outros')
               ORDER BY o.size NULLS LAST
             ) AS rn
        FROM public.storage_objects o
        JOIN public.storage_buckets b ON b.id = o.bucket_id
       WHERE b.public
    )
    SELECT bucket_id, name, content_type FROM ranked WHERE rn = 1 LIMIT 40
  `);

  if (rows.length === 0) {
    log.warn("Nenhum arquivo público registrado para testar.");
    return false;
  }

  const failures: Record<string, unknown>[] = [];
  for (const row of rows) {
    const encoded = row.name.split("/").map(encodeURIComponent).join("/");
    const url = `${env.publicUrl}/storage/v1/object/public/${row.bucket_id}/${encoded}`;
    try {
      const response = await fetch(url, { method: "GET", headers: { range: "bytes=0-1023" } });
      if (!response.ok && response.status !== 206) {
        failures.push({ arquivo: `${row.bucket_id}/${row.name}`, status: response.status });
        continue;
      }
      await response.arrayBuffer();
    } catch (error) {
      failures.push({ arquivo: `${row.bucket_id}/${row.name}`, status: (error as Error).message });
    }
  }

  if (failures.length > 0) {
    log.error(`${failures.length}/${rows.length} arquivos públicos não abriram pelo domínio:`);
    log.table(failures.slice(0, 20));
    log.warn(
      `Confira o Nginx (proxy para 127.0.0.1:${env.port}) e as permissões de ${env.storage.root} ` +
        "(dono do processo Node precisa de leitura; 750 é suficiente).",
    );
    return false;
  }

  log.ok(`${rows.length} arquivos públicos (imagem, vídeo, PDF, JSON) abriram pelo domínio.`);
  return true;
}

/** Permissões do diretório de uploads: leitura pelo processo do backend. */
function verifyStoragePermissions(): boolean {
  try {
    fs.accessSync(env.storage.root, fs.constants.R_OK | fs.constants.X_OK);
    log.ok(`${env.storage.root} legível pelo processo atual.`);
    return true;
  } catch (error) {
    log.error(`${env.storage.root} inacessível: ${(error as Error).message}`);
    return false;
  }
}

async function verifyFunctions(): Promise<void> {
  const { listAvailableFunctions } = await import("../src/functions/host.js");
  const functions = listAvailableFunctions();
  log.ok(`${functions.length} funções disponíveis para execução local.`);
}

/**
 * Agendamentos. O projeto não usa pg_cron: os jobs (sync de dias de acesso,
 * remarketing, mensagens agendadas) são chamados por HTTP. Portanto validamos
 * o cron do sistema, que é quem os dispara na VPS.
 */
async function verifyCron(): Promise<boolean> {
  const usesPgCron = await pool
    .query<{ count: string }>(
      `SELECT count(*)::text AS count FROM pg_extension WHERE extname = 'pg_cron'`,
    )
    .then((r) => Number(r.rows[0]?.count ?? 0) > 0)
    .catch(() => false);

  if (usesPgCron) {
    log.ok("pg_cron instalado localmente.");
    return true;
  }

  const crontab = await run("bash", ["-lc", "crontab -l 2>/dev/null; cat /etc/cron.d/mro* 2>/dev/null"]);
  const content = crontab.stdout;
  const expected = [
    { nome: "sync de dias de acesso (zapmro/hub)", padrao: /zapmro-api|sync_zapmro_days|hub-api/ },
    { nome: "mensagens agendadas do CRM", padrao: /processScheduled|meta-whatsapp-crm|zapi/ },
  ];

  const missing = expected.filter((job) => !job.padrao.test(content));
  if (missing.length === 0) {
    log.ok("Agendamentos presentes no cron do sistema (pg_cron não é necessário).");
    return true;
  }

  log.warn("pg_cron indisponível e faltam agendamentos no cron do sistema:");
  for (const job of missing) log.warn(`- ${job.nome}`);
  log.warn(
    "Adicione em /etc/cron.d/mro (exemplo):\n" +
      `  */10 * * * * root curl -s -X POST ${env.publicUrl}/functions/v1/zapmro-api -H 'content-type: application/json' -d '{\"action\":\"syncDays\"}' >/dev/null\n` +
      `  */5  * * * * root curl -s -X POST ${env.publicUrl}/functions/v1/meta-whatsapp-crm -H 'content-type: application/json' -d '{\"action\":\"processScheduled\"}' >/dev/null`,
  );
  return false;
}

/** Backend: health, banco, auth, storage e funções, pelo localhost e pelo domínio. */
async function verifyBackend(): Promise<boolean> {
  const targets = [`http://127.0.0.1:${env.port}`, env.publicUrl];
  let allOk = true;

  for (const base of targets) {
    const checks: { nome: string; url: string; init?: RequestInit; aceitos: number[] }[] = [
      { nome: "health", url: `${base}/health`, aceitos: [200] },
      {
        nome: "banco (REST)",
        url: `${base}/rest/v1/hub_products?select=id&limit=1`,
        init: { headers: { apikey: env.auth.anonKey, authorization: `Bearer ${env.auth.anonKey}` } },
        aceitos: [200, 401, 403],
      },
      // 400 aqui é resposta legítima: credencial inválida foi processada pelo auth.
      {
        nome: "auth (login inválido responde)",
        url: `${base}/auth/v1/token?grant_type=password`,
        init: {
          method: "POST",
          headers: { "content-type": "application/json", apikey: env.auth.anonKey },
          body: JSON.stringify({ email: "verify@invalid.local", password: "x" }),
        },
        aceitos: [400, 401],
      },
      { nome: "funções", url: `${base}/functions/v1/`, aceitos: [200, 404, 400] },
    ];

    for (const check of checks) {
      try {
        const response = await fetch(check.url, check.init);
        if (!check.aceitos.includes(response.status)) {
          log.error(`${base} → ${check.nome}: HTTP ${response.status}`);
          allOk = false;
        } else {
          log.ok(`${base} → ${check.nome}: HTTP ${response.status}`);
        }
      } catch (error) {
        log.error(`${base} → ${check.nome}: ${(error as Error).message}`);
        allOk = false;
      }
    }
  }

  return allOk;
}

export async function verifyDetailed(): Promise<VerifyReport> {
  log.step("Etapa 5/5 — Conferência final");

  const { divergences } = await verifyRows();
  const files = await verifyFiles();
  await verifyFunctions();
  const schemaDivergencias = await verifySchema();
  const permissoesOk = verifyStoragePermissions();
  const leituraOk = await verifyPublicReads();
  const cronOk = await verifyCron();
  const backendOk = await verifyBackend();

  const faltando = divergences.filter((item) => item.tipo === "faltando");
  const excedentes = divergences.filter((item) => item.tipo === "excedente");

  if (faltando.length > 0) {
    log.error("Tabelas com linhas FALTANDO na VPS (crítico):");
    log.table(faltando.slice(0, 40));
  }
  if (excedentes.length > 0) {
    log.warn(
      "Tabelas com linhas a MAIS na VPS — legítimo quando a linha foi criada na VPS " +
        "durante os testes ou apagada na origem após a cópia (documentado, não bloqueia):",
    );
    log.table(excedentes.slice(0, 40));
  }
  if (files.faltando.length > 0) {
    log.warn("Arquivos ausentes (primeiros 20):");
    for (const item of files.faltando.slice(0, 20)) log.warn(item);
  }

  const schemaCritico = schemaDivergencias.filter((item) => item.situacao === "ausente na VPS");

  const report: VerifyReport = {
    banco: true,
    tabelas: schemaCritico.length === 0,
    dados: faltando.length === 0,
    storage: files.faltando.length === 0 && permissoesOk && leituraOk,
    schema: schemaCritico.length === 0,
    cron: cronOk,
    backend: backendOk,
    faltando,
    excedentes,
    arquivosAusentes: files.faltando,
    schemaDivergencias,
  };

  if (report.dados && report.storage && report.schema) {
    log.ok("Migração íntegra: estrutura, dados e arquivos conferem.");
  } else {
    log.warn("Há pendências críticas. Rode `npm run migrate:data` e `npm run migrate:storage` novamente.");
  }

  return report;
}

/** Compatibilidade com o fluxo antigo: true quando nada crítico está pendente. */
export async function verify(): Promise<boolean> {
  const report = await verifyDetailed();
  return report.dados && report.storage && report.schema;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  verify()
    .then((clean) => pool.end().then(() => process.exit(clean ? 0 : 1)))
    .catch((error: Error) => {
      log.error(error.message);
      process.exit(1);
    });
}
