/**
 * Cliente do backend próprio (VPS + PostgreSQL).
 *
 * Por que este arquivo existe: as 213 páginas importam
 * `@/integrations/supabase/client`. Em vez de editar 213 arquivos — o que
 * multiplicaria a chance de erro — o Vite redireciona aquele caminho para cá
 * quando `VITE_USE_LOCAL_BACKEND=true` (ver vite.config.ts).
 *
 * Continuamos usando o SDK @supabase/supabase-js porque ele é apenas um cliente
 * HTTP para uma API bem definida: nosso backend implementa a mesma superfície
 * (/rest/v1, /auth/v1, /storage/v1, /functions/v1, /realtime/v1). Assim
 * `.from().select()`, `.storage.from().upload()`, `.functions.invoke()` e
 * `.channel()` seguem funcionando sem nenhuma mudança nas telas.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/types";

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "";

const ANON_KEY =
  (import.meta.env.VITE_API_ANON_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  "";

if (!API_URL || !ANON_KEY) {
  // Falha explícita: um cliente sem URL gera erros de rede confusos em runtime.
  throw new Error(
    "[backend] VITE_API_URL e VITE_API_ANON_KEY são obrigatórios quando VITE_USE_LOCAL_BACKEND=true.",
  );
}

export const BACKEND_URL = API_URL.replace(/\/+$/, "");

export const supabase = createClient<Database>(BACKEND_URL, ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Sessões ficam no localStorage do domínio próprio, sem broker de preview.
    storageKey: "mro-auth-token",
  },
  global: {
    headers: { "x-client-info": "mro-vps/1.0.0" },
  },
});

/** Mesmo cliente sob outro nome, para código novo não falar em "supabase". */
export const backend = supabase;

/** URL pública de um arquivo servido pelo disco da VPS. */
export function publicFileUrl(bucket: string, filePath: string): string {
  const encoded = filePath.split("/").map(encodeURIComponent).join("/");
  return `${BACKEND_URL}/storage/v1/object/public/${bucket}/${encoded}`;
}

export default supabase;
