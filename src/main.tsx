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
 */
if (window.location.pathname === "/lotargrupos") {
  import("./pages/LotarGrupos.tsx").then(({ default: LotarGrupos }) => {
    root.render(<LotarGrupos />);
  });
} else if (window.location.pathname === "/renddx" || window.location.pathname === "/") {
  import("./pages/Renddx.tsx").then(({ default: Renddx }) => {
    root.render(<Renddx />);
  });
} else {
  import("./App.tsx").then(({ default: App }) => {
    root.render(<App />);
  });
}
