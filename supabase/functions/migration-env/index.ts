import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { verifyAdminSessionToken } from "../_shared/admin-session.ts";

/**
 * Gera o arquivo `.env` completo do backend próprio (VPS), já preenchido com:
 *  - chaves novas (JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY) geradas aqui;
 *  - os valores REAIS dos segredos de integração, lidos do ambiente da função;
 *  - as variáveis LEGACY_* necessárias durante a migração.
 *
 * Segurança: exige token de sessão do admin principal (`mro-main-admin`).
 * O conteúdo nunca é logado e só é devolvido ao admin autenticado.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Segredos de integração que as funções esperam encontrar no ambiente. */
const INTEGRATION_SECRETS = [
  "BRIGHTDATA_API_TOKEN",
  "BRIGHTDATA_WEB_UNLOCKER_ZONE",
  "DEEPSEEK_API_KEY",
  "FACEBOOK_APP_ID",
  "FACEBOOK_APP_SECRET",
  "IG_ADMIN_EMAIL",
  "IG_ADMIN_INITIAL_PASSWORD",
  "IG_ADMIN_SESSION_SECRET",
  "INSTAGRAM_SESSION_ID",
  "LOVABLE_API_KEY",
  "META_CONVERSIONS_API_TOKEN",
  "MRO_ADMIN_EMAIL",
  "MRO_ADMIN_PASSWORD",
  "MRO_ADMIN_SESSION_SECRET",
  "RAPIDAPI_KEY",
  "SMTP_PASSWORD",
  "STRIPE_SECRET_KEY",
  "SUPABASE_JWKS",
  "SUPABASE_PUBLISHABLE_KEYS",
  "SUPABASE_SECRET_KEYS",
  "WPP_BOT_TOKEN",
] as const;

const encoder = new TextEncoder();

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const randomHex = (bytes: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/** Assina um JWT HS256 no mesmo formato usado hoje (claim `role`). */
async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = toBase64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return `${data}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Escapa valores com espaços/quebras para o formato dotenv. */
const envLine = (name: string, value: string) => {
  const needsQuotes = /[\s#"'\\]/.test(value);
  const safe = needsQuotes ? `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"` : value;
  return `${name}=${safe}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Método não permitido" }, 405);

  try {
    const sessionSecret = Deno.env.get("MRO_ADMIN_SESSION_SECRET");
    if (!sessionSecret) return json({ success: false, error: "Configuração do servidor incompleta" }, 500);

    const raw = await req.text();
    let body: Record<string, unknown>;
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return json({ success: false, error: "Requisição inválida" }, 400);
    }

    const token = typeof body.token === "string" ? body.token : "";
    const admin = await verifyAdminSessionToken(token, sessionSecret, "mro-main-admin").catch(() => null);
    if (!admin) return json({ success: false, error: "Acesso não autorizado" }, 401);

    // ---- Parâmetros de infraestrutura (com padrões seguros) ----
    const str = (key: string, fallback: string) => {
      const value = body[key];
      return typeof value === "string" && value.trim() ? value.trim() : fallback;
    };

    const apiUrl = str("apiUrl", "https://api.maisresultadosonline.com.br");
    const siteUrl = str("siteUrl", "https://maisresultadosonline.com.br");
    const dbUser = str("dbUser", "mro");
    const dbName = str("dbName", "mro");
    const dbHost = str("dbHost", "127.0.0.1");
    const dbPort = str("dbPort", "5432");
    const dbPassword = str("dbPassword", randomHex(16));
    const storageRoot = str("storageRoot", "/var/www/uploads");
    const denoBin = str("denoBin", "/usr/local/bin/deno");

    const databaseUrl = `postgres://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;

    // ---- Chaves novas do backend próprio ----
    const jwtSecret = randomHex(32);
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60 * 24 * 365 * 10;
    const anonKey = await signJwt({ role: "anon", iss: "mro-vps", iat, exp }, jwtSecret);
    const serviceKey = await signJwt({ role: "service_role", iss: "mro-vps", iat, exp }, jwtSecret);

    // ---- Segredos de integração (valores reais do ambiente atual) ----
    const secretLines: string[] = [];
    const missing: string[] = [];
    for (const name of INTEGRATION_SECRETS) {
      const value = Deno.env.get(name);
      if (value) secretLines.push(envLine(name, value));
      else {
        secretLines.push(`# ${name}= (não configurado neste ambiente)`);
        missing.push(name);
      }
    }

    // ---- LEGACY_* para os scripts de migração ----
    const legacyUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const legacyServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const legacyAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const legacyDbUrl = Deno.env.get("SUPABASE_DB_URL") ?? "";
    if (!legacyDbUrl) missing.push("SUPABASE_DB_URL");

    const env = [
      "# ============================================================",
      "# server/.env — gerado automaticamente pelo /admin",
      `# Gerado em: ${new Date().toISOString()}`,
      "# ATENÇÃO: contém chaves privadas. Nunca comite este arquivo.",
      "# ============================================================",
      "",
      "NODE_ENV=production",
      "PORT=8787",
      envLine("PUBLIC_API_URL", apiUrl),
      envLine("CORS_ORIGINS", `${siteUrl},${siteUrl.replace("https://", "https://www.")}`),
      "",
      "# ---- PostgreSQL local ----",
      envLine("DATABASE_URL", databaseUrl),
      "DATABASE_POOL_MAX=20",
      "DATABASE_STATEMENT_TIMEOUT_MS=20000",
      `# Senha do banco em texto puro (use ao criar o usuário no Postgres): ${dbPassword}`,
      "",
      "# ---- JWT / chaves de API do backend próprio ----",
      envLine("JWT_SECRET", jwtSecret),
      "ACCESS_TOKEN_TTL=3600",
      "REFRESH_TOKEN_TTL=2592000",
      envLine("ANON_KEY", anonKey),
      envLine("SERVICE_ROLE_KEY", serviceKey),
      "",
      "# ---- Storage local ----",
      envLine("STORAGE_ROOT", storageRoot),
      "STORAGE_MAX_BYTES=314572800",
      "",
      "# ---- Host de funções (runtime Deno) ----",
      "FUNCTIONS_ENABLED=true",
      "FUNCTIONS_DIR=../supabase/functions",
      "FUNCTIONS_BASE_PORT=9100",
      "FUNCTIONS_TIMEOUT_MS=60000",
      envLine("DENO_BIN", denoBin),
      "",
      "# ============================================================",
      "# Variáveis que as funções esperam. SUPABASE_URL aponta para o",
      "# PRÓPRIO backend, então o SDK dentro das funções fala com o",
      "# Postgres local em vez do serviço externo.",
      "# ============================================================",
      envLine("SUPABASE_URL", apiUrl),
      envLine("SUPABASE_ANON_KEY", anonKey),
      envLine("SUPABASE_SERVICE_ROLE_KEY", serviceKey),
      envLine("SUPABASE_DB_URL", databaseUrl),
      "",
      "# ---- Segredos de integração (valores atuais, prontos para uso) ----",
      ...secretLines,
      "",
      "# ============================================================",
      "# Migração (mantenha só enquanto o backend antigo existir)",
      "# ============================================================",
      envLine("LEGACY_SUPABASE_URL", legacyUrl),
      envLine("LEGACY_SUPABASE_SERVICE_KEY", legacyServiceKey),
      envLine("LEGACY_SUPABASE_ANON_KEY", legacyAnonKey),
      legacyDbUrl
        ? envLine("LEGACY_DATABASE_URL", legacyDbUrl)
        : "# LEGACY_DATABASE_URL= (segredo SUPABASE_DB_URL não configurado)",
      "",
    ].join("\n");

    const frontendEnv = [
      "# .env do frontend (build do site na VPS)",
      `# Gerado em: ${new Date().toISOString()}`,
      "",
      envLine("VITE_API_URL", apiUrl),
      envLine("VITE_API_ANON_KEY", anonKey),
      "VITE_USE_LOCAL_BACKEND=true",
      "",
      "# Mantidos para compatibilidade dos módulos que leem estes nomes:",
      envLine("VITE_SUPABASE_URL", apiUrl),
      envLine("VITE_SUPABASE_PUBLISHABLE_KEY", anonKey),
      "",
    ].join("\n");

    return json({
      success: true,
      generated_at: new Date().toISOString(),
      env,
      frontend_env: frontendEnv,
      db_password: dbPassword,
      secrets_total: INTEGRATION_SECRETS.length,
      secrets_found: INTEGRATION_SECRETS.length - INTEGRATION_SECRETS.filter((n) => !Deno.env.get(n)).length,
      missing,
    });
  } catch (error) {
    console.error("[migration-env] erro inesperado", error instanceof Error ? error.message : error);
    return json({ success: false, error: "Erro interno ao gerar o .env" }, 500);
  }
});
