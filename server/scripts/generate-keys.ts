/**
 * Gera JWT_SECRET, ANON_KEY e SERVICE_ROLE_KEY.
 *
 * As chaves têm o mesmo formato de hoje (JWT HS256 com claim `role`), então o
 * frontend e as funções continuam usando os mesmos cabeçalhos `apikey` e
 * `Authorization` sem nenhuma alteração de código.
 *
 * Uso: npm run keys
 */

import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const secret = crypto.randomBytes(32).toString("hex");
const issuedAt = Math.floor(Date.now() / 1000);
const tenYears = issuedAt + 60 * 60 * 24 * 365 * 10;

function makeKey(role: "anon" | "service_role"): string {
  return jwt.sign({ role, iss: "mro-vps", iat: issuedAt, exp: tenYears }, secret, {
    algorithm: "HS256",
  });
}

const anonKey = makeKey("anon");
const serviceKey = makeKey("service_role");

console.log(`
Cole em server/.env  (o SERVICE_ROLE_KEY nunca vai para o frontend):

JWT_SECRET=${secret}
ANON_KEY=${anonKey}
SERVICE_ROLE_KEY=${serviceKey}
SUPABASE_ANON_KEY=${anonKey}
SUPABASE_SERVICE_ROLE_KEY=${serviceKey}

E no .env do frontend (build do site):

VITE_API_URL=https://api.maisresultadosonline.com.br
VITE_API_ANON_KEY=${anonKey}
VITE_USE_LOCAL_BACKEND=true
`);
