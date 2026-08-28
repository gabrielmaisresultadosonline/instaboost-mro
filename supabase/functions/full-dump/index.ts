import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { verifyAdminSessionToken } from "../_shared/admin-session.ts";

/**
 * Exportação completa (dump) do backend: schema, dados de todas as tabelas
 * do schema public, buckets/objetos de storage e metadados.
 *
 * Segurança: exige token de sessão do admin principal (mro-main-admin).
 * Nunca retorna chaves de serviço nem valores de secrets.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const createServiceClient = (url: string, serviceKey: string) => {
  const isOpaqueKey = serviceKey.startsWith("sb_secret_");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: isOpaqueKey
      ? {
          fetch: (input: RequestInfo | URL, init: RequestInit = {}) => {
            const headers = new Headers(init.headers);
            if (headers.get("Authorization") === `Bearer ${serviceKey}`) headers.delete("Authorization");
            return fetch(input, { ...init, headers });
          },
        }
      : undefined,
  });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Método não permitido" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const sessionSecret = Deno.env.get("MRO_ADMIN_SESSION_SECRET");
    if (!url || !serviceKey || !sessionSecret) {
      return json({ success: false, error: "Configuração do servidor incompleta" }, 500);
    }

    const raw = await req.text();
    let body: Record<string, unknown>;
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return json({ success: false, error: "Requisição inválida" }, 400);
    }

    const token = typeof body.token === "string" ? body.token : "";
    const admin = await verifyAdminSessionToken(token, sessionSecret, "mro-main-admin").catch(() => null);
    if (!admin) {
      return json({ success: false, error: "Acesso não autorizado" }, 401);
    }


    const action = typeof body.action === "string" ? body.action : "";
    const db = createServiceClient(url, serviceKey);

    // 1) Manifesto: todas as tabelas + contagem de linhas
    if (action === "manifest") {
      const { data, error } = await db.rpc("dump_list_tables");
      if (error) return json({ success: false, error: error.message }, 500);

      const { data: buckets } = await db.storage.listBuckets();
      return json({
        success: true,
        generated_at: new Date().toISOString(),
        tables: data ?? [],
        buckets: (buckets ?? []).map((b) => ({ name: b.name, public: b.public })),
      });
    }

    // 2) Estrutura completa do banco
    if (action === "schema") {
      const { data, error } = await db.rpc("dump_schema_info");
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, schema: data });
    }

    // 3) Dados paginados de uma tabela
    if (action === "table") {
      const table = typeof body.table === "string" ? body.table : "";
      const limit = Number(body.limit ?? 1000);
      const offset = Number(body.offset ?? 0);
      if (!table) return json({ success: false, error: "Tabela não informada" }, 400);

      const { data, error } = await db.rpc("dump_table_rows", {
        p_table: table,
        p_limit: Number.isFinite(limit) ? limit : 1000,
        p_offset: Number.isFinite(offset) ? offset : 0,
      });
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, table, rows: data ?? [] });
    }

    // 4) Listagem recursiva de objetos de um bucket
    if (action === "storage") {
      const bucket = typeof body.bucket === "string" ? body.bucket : "";
      if (!bucket) return json({ success: false, error: "Bucket não informado" }, 400);

      const files: Array<Record<string, unknown>> = [];
      const walk = async (prefix: string, depth = 0): Promise<void> => {
        if (depth > 6) return;
        const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 1000, sortBy: { column: "name", order: "asc" } });
        if (error || !data) return;
        for (const entry of data) {
          const path = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.id === null && !entry.metadata) {
            await walk(path, depth + 1);
          } else {
            files.push({
              path,
              size: (entry.metadata as { size?: number } | null)?.size ?? null,
              mimetype: (entry.metadata as { mimetype?: string } | null)?.mimetype ?? null,
              updated_at: entry.updated_at ?? null,
              public_url: db.storage.from(bucket).getPublicUrl(path).data.publicUrl,
            });
          }
        }
      };
      await walk("");
      return json({ success: true, bucket, files });
    }

    // 5) Usuários do Auth (sem senhas — hashes não são expostos pela API)
    if (action === "auth_users") {
      const page = Number(body.page ?? 1);
      const { data, error } = await db.auth.admin.listUsers({ page: Number.isFinite(page) ? page : 1, perPage: 200 });
      if (error) return json({ success: false, error: error.message }, 500);
      return json({
        success: true,
        page,
        users: (data?.users ?? []).map((u) => ({
          id: u.id,
          email: u.email,
          phone: u.phone,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          email_confirmed_at: u.email_confirmed_at,
          app_metadata: u.app_metadata,
          user_metadata: u.user_metadata,
        })),
        has_more: (data?.users ?? []).length === 200,
      });
    }

    return json({ success: false, error: "Ação desconhecida" }, 400);
  } catch (error) {
    console.error("full-dump error", error);
    return json({ success: false, error: "Erro interno" }, 500);
  }
});
