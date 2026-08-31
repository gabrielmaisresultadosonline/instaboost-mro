/**
 * Etapa 3 — Mídias (vídeos, imagens, PDFs, JSONs de usuário).
 *
 * Baixa todos os objetos dos 9 buckets para o disco da VPS e registra cada um
 * em public.storage_objects, de modo que o backend local passe a servi-los.
 *
 * Repetível: arquivos já baixados com o mesmo tamanho são ignorados, então
 * a sincronização pode rodar várias vezes durante a transição.
 */

import fs from "node:fs";
import path from "node:path";
import { env, requireLegacy } from "../src/env.js";
import { pool } from "../src/db.js";
import { log } from "./lib/log.js";

interface LegacyObject {
  name: string;
  id: string | null;
  metadata: { size?: number; mimetype?: string } | null;
}

async function legacyRequest(pathname: string, init: RequestInit = {}): Promise<Response> {
  const legacy = requireLegacy();
  return fetch(`${legacy.url}${pathname}`, {
    ...init,
    headers: {
      apikey: legacy.serviceKey,
      authorization: `Bearer ${legacy.serviceKey}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function listBuckets(): Promise<{ id: string; name: string; public: boolean }[]> {
  const response = await legacyRequest("/storage/v1/bucket");
  if (!response.ok) {
    throw new Error(`Não foi possível listar buckets: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as { id: string; name: string; public: boolean }[];
}

/**
 * Lista recursivamente: a API retorna "pastas" como entradas sem `id`,
 * então descemos um nível por vez.
 */
async function listObjects(bucket: string, prefix = ""): Promise<LegacyObject[]> {
  const collected: LegacyObject[] = [];
  const pageSize = 1000;
  let offset = 0;

  for (;;) {
    const response = await legacyRequest(`/storage/v1/object/list/${bucket}`, {
      method: "POST",
      body: JSON.stringify({
        prefix,
        limit: pageSize,
        offset,
        sortBy: { column: "name", order: "asc" },
      }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao listar ${bucket}/${prefix}: ${response.status}`);
    }

    const page = (await response.json()) as LegacyObject[];
    if (page.length === 0) break;

    for (const entry of page) {
      const fullName = prefix ? `${prefix}${entry.name}` : entry.name;
      if (entry.id === null) {
        // É pasta: desce um nível.
        collected.push(...(await listObjects(bucket, `${fullName}/`)));
      } else {
        collected.push({ ...entry, name: fullName });
      }
    }

    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return collected;
}

/** Objeto listado mas irrecuperável na origem (linha órfã no Storage). */
class MissingAtSource extends Error {}

async function downloadObject(bucket: string, name: string, destination: string): Promise<number> {
  const encoded = name.split("/").map(encodeURIComponent).join("/");
  const paths = [
    `/storage/v1/object/${bucket}/${encoded}`,
    `/storage/v1/object/public/${bucket}/${encoded}`,
  ];
  let lastStatus = 0;
  let buffer: Buffer | null = null;

  for (const pathname of paths) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await legacyRequest(pathname);
      lastStatus = response.status;
      if (response.ok) {
        buffer = Buffer.from(await response.arrayBuffer());
        break;
      }
      // 4xx não transitório: tenta imediatamente a rota pública alternativa.
      if (response.status >= 400 && response.status < 500) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
    if (buffer) break;
  }

  if (!buffer) {
    // 400/404 nas duas rotas = o objeto não existe mais na origem. Não há o que
    // baixar, então isso não pode bloquear o corte: nada será perdido.
    if (lastStatus === 400 || lastStatus === 404) {
      throw new MissingAtSource(`ausente na origem (${lastStatus})`);
    }
    throw new Error(`download falhou após novas tentativas (${lastStatus})`);
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, buffer);
  return buffer.byteLength;
}

export async function migrateStorage(onlyBucket?: string): Promise<void> {
  log.step("Etapa 3/5 — Arquivos de mídia");

  const legacy = requireLegacy();
  if (!legacy.serviceKey) {
    log.warn("LEGACY_SUPABASE_SERVICE_KEY ausente: pulando a migração de arquivos.");
    return;
  }

  const buckets = (await listBuckets()).filter((bucket) => !onlyBucket || bucket.id === onlyBucket);
  log.info(`${buckets.length} buckets encontrados.`);

  const summary: Record<string, unknown>[] = [];
  let totalFailures = 0;

  for (const bucket of buckets) {
    await pool.query(
      `INSERT INTO public.storage_buckets (id, name, public)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public`,
      [bucket.id, bucket.name, bucket.public],
    );

    let objects: LegacyObject[];
    try {
      objects = await listObjects(bucket.id);
    } catch (error) {
      totalFailures += 1;
      log.error(`${bucket.id}: ${(error as Error).message}`);
      summary.push({ bucket: bucket.id, total: 0, baixados: 0, existentes: 0, falhas: 1 });
      continue;
    }

    let downloaded = 0;
    let skipped = 0;
    let failed = 0;
    let orphans = 0;
    let bytes = 0;

    for (const object of objects) {
      const destination = path.join(env.storage.root, bucket.id, object.name);
      const expectedSize = object.metadata?.size ?? null;

      if (fs.existsSync(destination)) {
        const stats = fs.statSync(destination);
        if (expectedSize === null || stats.size === expectedSize) {
          skipped += 1;
          await registerObject(bucket.id, object, stats.size);
          continue;
        }
      }

      try {
        const size = await downloadObject(bucket.id, object.name, destination);
        bytes += size;
        downloaded += 1;
        await registerObject(bucket.id, object, size);
      } catch (error) {
        failed += 1;
        log.error(`${bucket.id}/${object.name}: ${(error as Error).message}`);
      }
    }

    log.ok(
      `${bucket.id}: ${downloaded} baixados, ${skipped} já existentes, ${failed} falhas ` +
        `(${(bytes / 1024 / 1024).toFixed(1)} MB).`,
    );
    summary.push({ bucket: bucket.id, total: objects.length, baixados: downloaded, existentes: skipped, falhas: failed });
    totalFailures += failed;
  }

  log.table(summary);
  if (totalFailures > 0) {
    throw new Error(`${totalFailures} arquivos não puderam ser baixados. O corte foi bloqueado para evitar mídia ausente.`);
  }
}

async function registerObject(bucketId: string, object: LegacyObject, size: number): Promise<void> {
  await pool.query(
    `INSERT INTO public.storage_objects (bucket_id, name, size, content_type)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (bucket_id, name)
       DO UPDATE SET size = EXCLUDED.size,
                     content_type = COALESCE(EXCLUDED.content_type, public.storage_objects.content_type),
                     updated_at = now()`,
    [bucketId, object.name, size, object.metadata?.mimetype ?? null],
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrateStorage(process.argv[2])
    .then(() => pool.end())
    .catch((error: Error) => {
      log.error(error.message);
      process.exit(1);
    });
}
