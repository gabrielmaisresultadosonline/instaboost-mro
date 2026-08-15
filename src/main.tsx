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
 * Importações dinâmicas podem falhar por instabilidade de rede ou por chunks
 * invalidados após um novo deploy. Nesses casos tentamos novamente e, se ainda
 * falhar, recorremos ao roteador completo para evitar tela branca.
 */
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
    root.render(<App />);
  });

const path = window.location.pathname;

if (path === "/lotargrupos") {
  loadWithRetry(() => import("./pages/LotarGrupos.tsx"))
    .then(({ default: LotarGrupos }) => root.render(<LotarGrupos />))
    .catch(renderApp);
} else if (path === "/renddx" || path === "/") {
  loadWithRetry(() => import("./pages/Renddx.tsx"))
    .then(({ default: Renddx }) => root.render(<Renddx />))
    .catch(renderApp);
} else {
  renderApp();
}

