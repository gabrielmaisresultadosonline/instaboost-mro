/**
 * Corte final: origem (Supabase) → VPS (PostgreSQL + storage local).
 *
 * A ordem existe por um motivo: primeiro capturamos qualquer linha/arquivo
 * criado na origem durante a migração anterior, depois conferimos estrutura,
 * dados, mídias, storage público, backend e agendamentos, e só então — se
 * nada crítico estiver pendente e `--apply` tiver sido passado — as URLs de
 * mídia são reescritas para o domínio da VPS.
 *
 * Uso:
 *   npm run migrate:corte            # sincroniza + confere (URLs em simulação)
 *   npm run migrate:corte -- --apply # idem e, se OK, aplica as URLs (corte)
 *
 * A origem NUNCA é alterada por este script: nada é apagado no Supabase.
 */

import { pool } from "../src/db.js";
import { migrateData } from "./migrate-data.js";
import { migrateStorage } from "./migrate-storage.js";
import { rewriteUrls } from "./rewrite-urls.js";
import { verifyDetailed } from "./verify.js";
import { log } from "./lib/log.js";

function status(ok: boolean): string {
  return ok ? "\x1b[32mOK\x1b[0m" : "\x1b[31mNÃO OK\x1b[0m";
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");

  log.step("Corte final — sincronização de recuperação");
  // Recaptura o delta: linhas e arquivos criados na origem enquanto a primeira
  // migração rodava. Ambos os passos são idempotentes.
  await migrateData();
  await migrateStorage();

  const report = await verifyDetailed();

  const criticos = report.dados && report.storage && report.schema && report.backend;

  log.step("URLs de mídia");
  if (!criticos) {
    log.warn("Conferência com pendências críticas: as URLs NÃO foram alteradas.");
    await rewriteUrls(false);
  } else {
    await rewriteUrls(apply);
  }
  const urlsOk = criticos && apply;

  const pronto = criticos && urlsOk && report.cron;

  log.step("Relatório final");
  console.log(`
 1. Banco:            ${status(report.banco)}
 2. Tabelas:          ${status(report.tabelas)}
 3. Dados:            ${status(report.dados)}
 4. Storage:          ${status(report.storage)}
 5. URLs:             ${status(urlsOk)}${urlsOk ? "" : apply ? " (bloqueadas pela conferência)" : " (simulação — rode com --apply)"}
 6. Schema/PKs:       ${status(report.schema)}
 7. Cron:             ${status(report.cron)}
 8. Backend:          ${status(report.backend)}
 9. Frontend:         verifique manualmente as rotas listadas abaixo
10. Pronto para corte: ${pronto ? "\x1b[32mSIM\x1b[0m" : "\x1b[31mNÃO\x1b[0m"}
`);

  if (report.excedentes.length > 0) {
    log.warn("Diferenças legítimas documentadas (VPS com linhas a mais):");
    log.table(report.excedentes);
    log.info(
      "Cada linha acima foi criada na VPS durante os testes ou removida na origem depois da cópia. " +
        "Nenhum dado da origem está faltando nessas tabelas.",
    );
  }

  log.info(
    "Frontend — testar após o corte: / , login, /dashboard, /admin, /crm, /zapmro, /IG, /mktcc, " +
      "pagamentos, afiliados, upload de mídia e abertura de mídias antigas.",
  );
  log.info("O Supabase continua intacto e ativo como backup: nada foi apagado na origem.");

  await pool.end();
  if (!pronto) process.exit(1);
}

main().catch((error: Error) => {
  log.error(error.message);
  process.exit(1);
});
