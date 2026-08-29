/**
 * Camada de acesso ao PostgreSQL local.
 *
 * Ponto crítico: preservar o comportamento de RLS que as 219 tabelas já têm.
 * O Supabase faz isso definindo `role` e `request.jwt.claims` na conexão antes
 * de cada query. Reproduzimos exatamente esse contrato: toda requisição roda
 * dentro de uma transação com `SET LOCAL`, então as políticas existentes
 * continuam valendo sem reescrever uma única policy.
 */

import { Pool, type PoolClient } from "pg";
import { env } from "./env.js";

export const pool = new Pool({
  connectionString: env.database.url,
  max: env.database.poolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (error) => {
  // Um erro no cliente idle não deve derrubar o processo.
  console.error("[db] Erro em conexão idle do pool:", error.message);
});

export type DbRole = "anon" | "authenticated" | "service_role";

export interface SessionContext {
  role: DbRole;
  /** Claims do JWT (sub, email, role, ...) ou null para requisições anônimas. */
  claims: Record<string, unknown> | null;
}

export const ANON_SESSION: SessionContext = { role: "anon", claims: null };
export const SERVICE_SESSION: SessionContext = { role: "service_role", claims: null };

/**
 * Executa `fn` dentro de uma transação com o contexto de RLS aplicado.
 *
 * `service_role` faz BYPASSRLS no Postgres (assim como no Supabase), então
 * funções internas continuam com acesso total.
 */
export async function withSession<T>(
  session: SessionContext,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL statement_timeout = ${env.database.statementTimeoutMs}`);
    // `SET LOCAL ROLE` não aceita parâmetro vinculado; a role é validada abaixo.
    await client.query(`SET LOCAL ROLE ${assertRole(session.role)}`);
    await client.query("SELECT set_config('request.jwt.claims', $1, true)", [
      session.claims ? JSON.stringify(session.claims) : "",
    ]);
    if (session.claims?.sub) {
      await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [
        String(session.claims.sub),
      ]);
    }
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // A conexão pode já estar inutilizável; ignoramos o erro do rollback.
    }
    throw error;
  } finally {
    client.release();
  }
}

const ALLOWED_ROLES = new Set<DbRole>(["anon", "authenticated", "service_role"]);

function assertRole(role: string): DbRole {
  if (!ALLOWED_ROLES.has(role as DbRole)) {
    throw new Error(`[db] Role inválida: ${role}`);
  }
  return role as DbRole;
}

/** Query administrativa (sem RLS). Usar apenas em rotinas internas. */
export async function adminQuery<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

export async function healthCheck(): Promise<{ ok: boolean; latencyMs: number }> {
  const startedAt = Date.now();
  await pool.query("SELECT 1");
  return { ok: true, latencyMs: Date.now() - startedAt };
}
