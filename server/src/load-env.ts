/**
 * Carrega `server/.env` para `process.env` sem dependências externas.
 *
 * Motivo: o PM2 executa `npm start` e NÃO lê arquivos `.env`. Sem isto,
 * `DATABASE_URL`/`JWT_SECRET` chegam vazios e o processo morre no boot
 * (status `errored` com dezenas de reinícios), mesmo com o `.env` correto
 * no disco. Variáveis já definidas no ambiente têm prioridade.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Procura o `.env` a partir de `server/` (src/ e dist/ ficam um nível abaixo). */
const candidates = [
  path.resolve(here, "../.env"),
  path.resolve(here, "../../.env"),
  path.resolve(process.cwd(), ".env"),
];

function parse(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const withoutExport = line.replace(/^export\s+/, "");
    const separator = withoutExport.indexOf("=");
    if (separator <= 0) continue;

    const key = withoutExport.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    let value = withoutExport.slice(separator + 1).trim();

    // Valores entre aspas podem conter `#`, espaços e `\n` escapado.
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      const quote = value[0];
      value = value.slice(1, -1);
      if (quote === '"') {
        value = value.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      }
    } else {
      const comment = value.indexOf(" #");
      if (comment >= 0) value = value.slice(0, comment).trim();
    }

    result[key] = value;
  }

  return result;
}

let loadedFrom: string | null = null;

for (const candidate of candidates) {
  if (!fs.existsSync(candidate)) continue;

  try {
    const parsed = parse(fs.readFileSync(candidate, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined || process.env[key] === "") {
        process.env[key] = value;
      }
    }
    loadedFrom = candidate;
    break;
  } catch (error) {
    console.error(`[env] falha ao ler ${candidate}: ${(error as Error).message}`);
  }
}

if (loadedFrom) {
  // Nunca imprimimos valores: apenas a origem do arquivo.
  console.log(`[env] variáveis carregadas de ${loadedFrom}`);
} else {
  console.warn("[env] nenhum arquivo .env encontrado; usando apenas o ambiente do processo.");
}

export {};
