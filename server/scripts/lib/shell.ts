/** Execução de comandos externos (psql, pg_dump) com erro explícito. */

import { spawn } from "node:child_process";

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export function run(
  command: string,
  args: string[],
  options: { env?: NodeJS.ProcessEnv; input?: string; cwd?: string } = {},
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...options.env },
      cwd: options.cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));

    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));

    if (options.input !== undefined) child.stdin.write(options.input);
    child.stdin.end();
  });
}

export async function runOrThrow(
  command: string,
  args: string[],
  options: { env?: NodeJS.ProcessEnv; input?: string; cwd?: string } = {},
): Promise<string> {
  const result = await run(command, args, options);
  if (result.code !== 0) {
    throw new Error(
      `Comando falhou (${command} ${args.join(" ")}):\n${result.stderr || result.stdout}`,
    );
  }
  return result.stdout;
}

/** Pipe de dois processos: `producer | consumer`. Usado no COPY entre bancos. */
export function pipe(
  producer: { command: string; args: string[]; env?: NodeJS.ProcessEnv },
  consumer: { command: string; args: string[]; env?: NodeJS.ProcessEnv },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const source = spawn(producer.command, producer.args, {
      env: { ...process.env, ...producer.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const sink = spawn(consumer.command, consumer.args, {
      env: { ...process.env, ...consumer.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let sourceError = "";
    let sinkError = "";
    source.stderr.on("data", (chunk) => (sourceError += chunk));
    sink.stderr.on("data", (chunk) => (sinkError += chunk));

    source.stdout.pipe(sink.stdin);

    source.on("error", reject);
    sink.on("error", reject);

    sink.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Falha ao gravar dados: ${sinkError || sourceError}`));
        return;
      }
      if (sourceError.trim() && /error|fatal/i.test(sourceError)) {
        reject(new Error(`Falha ao ler dados: ${sourceError}`));
        return;
      }
      resolve();
    });
  });
}
