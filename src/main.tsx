import { createRoot } from "react-dom/client";
import "./index.css";
import "@fontsource/archivo-black/400.css";
import "@fontsource/hind/400.css";
import "@fontsource/hind/600.css";
import "@fontsource/sora/700.css";
import "@fontsource/sora/800.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/700.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemento raiz da aplicação não encontrado");
}

const root = createRoot(rootElement);

/**
 * A página pública de vendas é carregada isoladamente para não aguardar o
 * download das centenas de telas administrativas e produtos registradas no
 * roteador principal. As demais rotas mantêm exatamente o fluxo existente.
 *
 * Importações dinâmicas podem falhar por dois motivos bem diferentes, e cada um
 * exige um tratamento próprio:
 *
 *  1. Instabilidade de rede — o arquivo existe no servidor, então repetir a
 *     mesma requisição resolve. É o que `loadWithRetry` faz.
 *  2. Chunk invalidado por um novo deploy — o `index.html` em cache no
 *     navegador aponta para `assets/App-<hash>.js` de uma build anterior, que
 *     já não existe (404). Repetir a requisição nunca resolve: é preciso
 *     recarregar a página para buscar o `index.html` novo. Sem isso o usuário
 *     fica com tela branca até limpar o cache manualmente.
 */

/** Reconhece a falha de carregamento de módulo dinâmico em todos os navegadores. */
const isDynamicImportFailure = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to fetch/i.test(
    message,
  );
};

/**
 * Recarrega a página uma única vez para obter o `index.html` atualizado.
 * A trava em `sessionStorage` impede laço infinito de recarregamento caso o
 * problema não seja cache (ex.: servidor realmente fora do ar).
 */
const RELOAD_FLAG = "mro:stale-chunk-reload";

function recoverFromStaleChunk(error: unknown): boolean {
  if (!isDynamicImportFailure(error)) return false;

  let alreadyReloaded = false;
  try {
    alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === "1";
    if (!alreadyReloaded) sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    // Modo privativo pode bloquear o sessionStorage: seguimos sem a trava.
  }

  if (alreadyReloaded) return false;

  // `reload()` revalida o documento e, com ele, as URLs dos chunks.
  window.location.reload();
  return true;
}

/** Limpa a trava quando a aplicação conseguiu montar. */
function markLoadSuccess(): void {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    // Sem sessionStorage não há trava para limpar.
  }
}

function showFatalError(): void {
  root.render(
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">Não foi possível carregar a aplicação</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Isso costuma acontecer com uma versão antiga guardada no navegador. Atualize a página; se
        persistir, limpe o cache do site.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Atualizar agora
      </button>
    </div>,
  );
}

async function loadWithRetry<T>(loader: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await loader();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)));
    }
  }
  throw lastError;
}

const renderApp = () =>
  loadWithRetry(() => import("./App.tsx")).then(({ default: App }) => {
    markLoadSuccess();
    root.render(<App />);
  });

/** Último recurso: recarrega por causa de chunk velho ou mostra o aviso. */
const handleBootError = (error: unknown) => {
  if (recoverFromStaleChunk(error)) return;
  console.error("[boot] falha ao carregar a aplicação", error);
  showFatalError();
};

// O Vite emite este evento quando o preload de um chunk falha (deploy novo).
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  recoverFromStaleChunk(new Error("Failed to fetch dynamically imported module"));
});

const path = window.location.pathname;

if (path === "/lotargrupos") {
  loadWithRetry(() => import("./pages/LotarGrupos.tsx"))
    .then(({ default: LotarGrupos }) => {
      markLoadSuccess();
      root.render(<LotarGrupos />);
    })
    .catch(() => renderApp().catch(handleBootError));
} else if (path === "/renddx") {
  loadWithRetry(() => import("./pages/Renddx.tsx"))
    .then(({ default: Renddx }) => {
      markLoadSuccess();
      root.render(<Renddx />);
    })
    .catch(() => renderApp().catch(handleBootError));
} else {
  renderApp().catch(handleBootError);
}


