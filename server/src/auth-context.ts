/**
 * Resolução do contexto de autenticação a partir dos headers da requisição.
 *
 * Mantemos compatibilidade total com o cliente `@supabase/supabase-js`, que
 * envia `apikey` + `Authorization: Bearer <token>`. Isso permite que o
 * frontend (213 páginas) e as funções continuem usando o mesmo SDK.
 */

import jwt from "jsonwebtoken";
import type { Request } from "express";
import { env } from "./env.js";
import { ANON_SESSION, type DbRole, type SessionContext } from "./db.js";

export interface AuthResult extends SessionContext {
  token: string | null;
  userId: string | null;
}

const VALID_ROLES: DbRole[] = ["anon", "authenticated", "service_role"];

export function resolveAuth(req: Request): AuthResult {
  const token = extractBearer(req) ?? extractApiKey(req);

  if (!token) {
    return { ...ANON_SESSION, token: null, userId: null };
  }

  try {
    const claims = jwt.verify(token, env.auth.jwtSecret, {
      algorithms: ["HS256"],
    }) as Record<string, unknown>;

    const rawRole = typeof claims.role === "string" ? claims.role : "anon";
    const role: DbRole = VALID_ROLES.includes(rawRole as DbRole)
      ? (rawRole as DbRole)
      : "authenticated";

    const userId = typeof claims.sub === "string" ? claims.sub : null;

    return { role, claims, token, userId };
  } catch {
    // Token inválido/expirado degrada para anônimo — as políticas de RLS
    // decidem o que fica visível, exatamente como no comportamento atual.
    return { ...ANON_SESSION, token, userId: null };
  }
}

function extractBearer(req: Request): string | null {
  const header = req.header("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

function extractApiKey(req: Request): string | null {
  const apiKey = req.header("apikey");
  return apiKey && apiKey.trim() !== "" ? apiKey.trim() : null;
}

/** Emite um token no mesmo formato do Supabase (HS256 + claims equivalentes). */
export function signToken(payload: {
  sub?: string;
  email?: string;
  role: DbRole;
  ttlSeconds?: number;
  extra?: Record<string, unknown>;
}): { token: string; expiresAt: number } {
  const ttl = payload.ttlSeconds ?? env.auth.accessTokenTtlSeconds;
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + ttl;

  const token = jwt.sign(
    {
      ...(payload.extra ?? {}),
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      aud: payload.role === "service_role" ? "service_role" : "authenticated",
      iss: env.publicUrl,
      iat: issuedAt,
      exp: expiresAt,
    },
    env.auth.jwtSecret,
    { algorithm: "HS256" },
  );

  return { token, expiresAt };
}

export function isServiceRole(auth: AuthResult): boolean {
  return auth.role === "service_role";
}
