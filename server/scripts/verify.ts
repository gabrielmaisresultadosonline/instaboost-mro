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
import dns from "node:dns/promises";
import { env, requireLegacy } from "../src/env.js";
import { pool } from "../src/db.js";
import { runOrThrow, run } from "./lib/shell.js";
import { log } from "./lib/log.js";
import { verifySchema, type SchemaDivergence } from "./verify-schema.js";

/**
 * Resultado de uma checagem que pode passar pelo backend local mas não pelo
 * domínio público. Distinguir os dois é essencial: "só local funciona" é
 * pendência de DNS/Nginx (infra, não migração) e não pode marcar dados/mídia
 * como corrompidos.
 */
type CheckResult = "ok" | "somente-local" | "falha";

/**
 * Diagnostica o domínio público uma única vez: DNS resolve? Para onde?
 * `fetch failed` sozinho não distingue "domínio não existe" de "Nginx caiu".
 */
let domainDiagnosis: { host: string; addresses: string[]; resolves: boolean } | null = null;

async function diagnoseDomain(): Promise<{ host: string; addresses: string[]; resolves: boolean }> {
  if (domainDiagnosis) return domainDiagnosis;
  const host = (() => {
    try {
      return new URL(env.publicUrl).hostname;
    } catch {
      return env.publicUrl;
    }
  })();
  try {
    const records = await dns.lookup(host, { all: true });
    domainDiagnosis = { host, addresses: records.map((r) => r.address), resolves: records.length > 0 };
  } catch {
    domainDiagnosis = { host, addresses: [], resolves: false };
  }
  return domainDiagnosis;
}

/** Explica, em uma linha, por que o domínio não respondeu. */
async function explainDomainFailure(): Promise<void> {
  const { host, addresses, resolves } = await diagnoseDomain();
  if (!resolves) {
    log.warn(
      `O domínio ${host} não resolve neste servidor (DNS). Crie o registro A de ${host} ` +
        "apontando para o IP público da VPS (ou, se estiver na Cloudflare, verifique se o registro existe e está proxied).",
    );
    return;
  }
  log.warn(
    `${host} resolve para ${addresses.join(", ")}, mas a conexão falhou. ` +
      `Verifique o vhost do Nginx para ${host} (proxy_pass http://127.0.0.1:${env.port}), ` +
      "o certificado TLS (certbot) e as portas 80/443 liberadas no firewall.",
  );
}

/**
 * Tenta pelo domínio; se a falha for de rede (DNS/TLS/porta), repete no backend
 * local com o cabeçalho Host, o que prova que a rota e o arquivo estão certos e
 * isola a pendência à camada de infraestrutura.
 */
/**
 * Um 200 não prova nada quando o HTTPS do subdomínio cai no "default server"
 * (o site React): o Nginx devolve index.html para /health e /rest, 405 para
 * POST e 404 para arquivos. Detectar o HTML evita um verde falso.
 */
async function servesFrontendHtml(response: Response): Promise<boolean> {
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) return false;
  const body = await response.clone().text().catch(() => "");
  return /<!doctype html|<div id="root"/i.test(body);
}

async function fetchDomainWithLocalFallback(
  pathname: string,
  init?: RequestInit,
): Promise<{ result: CheckResult; status: number | string }> {
  try {
    const response = await fetch(`${env.publicUrl}${pathname}`, init);
    if (await servesFrontendHtml(response)) {
      return { result: "falha", status: "devolveu o HTML do site (vhost da API não atende em HTTPS)" };
    }
    return { result: "ok", status: response.status };
  } catch (error) {
    const { host } = await diagnoseDomain();
    try {
      const local = await fetch(`http://127.0.0.1:${env.port}${pathname}`, {
        ...init,
        headers: { ...(init?.headers ?? {}), host },
      });
      return { result: "somente-local", status: local.status };
    } catch {
      return { result: "falha", status: (error as Error).message };
    }
  }
}


interface Divergence {
  tabela: string;
  antigo: number;
  novo: number;
  diferenca: number;
  tipo: "faltando" | "excedente";
  [key: string]: unknown;
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
async function verifyPublicReads(): Promise<CheckResult> {
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
    return "falha";
  }

  const failures: Record<string, unknown>[] = [];
  let somenteLocal = 0;

  for (const row of rows) {
    const encoded = row.name.split("/").map(encodeURIComponent).join("/");
    const pathname = `/storage/v1/object/public/${row.bucket_id}/${encoded}`;
    const { result, status } = await fetchDomainWithLocalFallback(pathname, {
      method: "GET",
      headers: { range: "bytes=0-1023" },
    });

    const httpOk = typeof status === "number" && (status < 400 || status === 206);
    if (result === "falha" || !httpOk) {
      failures.push({ arquivo: `${row.bucket_id}/${row.name}`, status });
      continue;
    }
    if (result === "somente-local") somenteLocal += 1;
  }

  if (failures.length > 0) {
    log.error(`${failures.length}/${rows.length} arquivos públicos não abriram:`);
    log.table(failures.slice(0, 20));
    log.warn(
      `Confira o Nginx (proxy para 127.0.0.1:${env.port}) e as permissões de ${env.storage.root} ` +
        "(dono do processo Node precisa de leitura; 750 é suficiente).",
    );
    await explainDomainFailure();
    return "falha";
  }

  if (somenteLocal > 0) {
    log.warn(
      `${somenteLocal}/${rows.length} arquivos públicos abriram pelo backend local (127.0.0.1:${env.port}) ` +
        "mas o domínio não respondeu. Os arquivos e as rotas estão corretos: falta a camada de rede.",
    );
    await explainDomainFailure();
    return "somente-local";
  }

  log.ok(`${rows.length} arquivos públicos (imagem, vídeo, PDF, JSON) abriram pelo domínio.`);
  return "ok";
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
    .then((r: { rows: { count: string }[] }) => Number(r.rows[0]?.count ?? 0) > 0)
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
async function verifyBackend(): Promise<{ local: boolean; dominio: CheckResult }> {
  const checks = (base: string): { nome: string; url: string; init?: RequestInit; aceitos: number[] }[] => [
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

  // 1) Localhost: é isto que diz se o backend em si está saudável.
  const localBase = `http://127.0.0.1:${env.port}`;
  let localOk = true;
  for (const check of checks(localBase)) {
    try {
      const response = await fetch(check.url, check.init);
      if (!check.aceitos.includes(response.status)) {
        log.error(`${localBase} → ${check.nome}: HTTP ${response.status}`);
        localOk = false;
      } else {
        log.ok(`${localBase} → ${check.nome}: HTTP ${response.status}`);
      }
    } catch (error) {
      log.error(`${localBase} → ${check.nome}: ${(error as Error).message}`);
      localOk = false;
    }
  }

  // 2) Domínio: falha de rede aqui é pendência de DNS/Nginx, não do backend.
  let dominio: CheckResult = "ok";
  for (const check of checks("")) {
    const pathname = check.url;
    const { result, status } = await fetchDomainWithLocalFallback(pathname, check.init);
    if (result === "ok" && typeof status === "number" && check.aceitos.includes(status)) {
      log.ok(`${env.publicUrl} → ${check.nome}: HTTP ${status}`);
      continue;
    }
    if (result === "somente-local") {
      log.warn(`${env.publicUrl} → ${check.nome}: domínio inacessível (local respondeu HTTP ${status}).`);
      if (dominio === "ok") dominio = "somente-local";
      continue;
    }
    log.error(`${env.publicUrl} → ${check.nome}: ${status}`);
    dominio = "falha";
  }

  if (dominio !== "ok") await explainDomainFailure();
  return { local: localOk, dominio };
}


export async function verifyDetailed(): Promise<VerifyReport> {
  log.step("Etapa 5/5 — Conferência final");

  const { divergences } = await verifyRows();
  const files = await verifyFiles();
  await verifyFunctions();
  const schemaDivergencias = await verifySchema();
  const permissoesOk = verifyStoragePermissions();
  const leitura = await verifyPublicReads();
  const cronOk = await verifyCron();
  const backend = await verifyBackend();

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

  // Mídia é considerada íntegra quando o arquivo existe, é legível e a rota
  // responde — seja pelo domínio, seja pelo backend local com o Host correto.
  // Domínio fora do ar é pendência de infraestrutura, tratada separadamente.
  const report: VerifyReport = {
    banco: true,
    tabelas: schemaCritico.length === 0,
    dados: faltando.length === 0,
    storage: files.faltando.length === 0 && permissoesOk && leitura !== "falha",
    schema: schemaCritico.length === 0,
    cron: cronOk,
    backend: backend.local,
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

  const dominioPendente = leitura === "somente-local" || backend.dominio !== "ok";
  if (dominioPendente) {
    log.warn(
      "Pendência de infraestrutura (não de migração): o domínio público não responde neste servidor. " +
        "O backend local está OK; resolva DNS/Nginx/TLS antes do corte.",
    );
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
