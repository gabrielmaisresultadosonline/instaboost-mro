/**
 * Wrapper Deno que roda uma função sem modificá-la.
 *
 * Executado como: `deno run --allow-all runner.ts <caminho/index.ts>`
 * com `FN_PORT` no ambiente.
 *
 * As funções chamam `serve(handler)` (std/http) ou `Deno.serve(handler)`, ambos
 * sem especificar porta — o padrão seria 8000 para todas, o que causaria
 * conflito. Interceptamos as duas APIs de rede para fixar a porta atribuída
 * pelo host antes de importar o módulo da função.
 */

const port = Number(Deno.env.get("FN_PORT") ?? "0");
const name = Deno.env.get("FN_NAME") ?? "unknown";
const entry = Deno.args[0];

if (!port || !entry) {
  console.error("[runner] FN_PORT e o caminho da função são obrigatórios.");
  Deno.exit(1);
}

// std/http `serve()` usa Deno.listen internamente.
const originalListen = Deno.listen.bind(Deno);
// deno-lint-ignore no-explicit-any
(Deno as any).listen = (options: any) => originalListen({ ...options, port });

// Funções mais novas usam Deno.serve diretamente.
// deno-lint-ignore no-explicit-any
const originalServe = (Deno as any).serve?.bind(Deno);
if (originalServe) {
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = (...args: any[]) => {
    if (typeof args[0] === "function") {
      return originalServe({ port }, args[0]);
    }
    const [options, handler] = args;
    return handler
      ? originalServe({ ...options, port }, handler)
      : originalServe({ ...options, port });
  };
}

console.log(`[runner] iniciando função "${name}" na porta ${port}`);

try {
  await import(`file://${entry}`);
} catch (error) {
  console.error(`[runner] falha ao carregar "${name}":`, error);
  Deno.exit(1);
}
