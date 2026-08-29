import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Publishable (safe) fallbacks: garantem que builds em servidores externos (VPS)
// funcionem mesmo sem o arquivo .env presente no deploy.
const FALLBACK_SUPABASE_URL = "https://adljdeekwifwcdcgbpit.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkbGpkZWVrd2lmd2NkY2dicGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjk0MDMsImV4cCI6MjA4MDcwNTQwM30.odKBOAuEEW0WJEburLRTL9Qj1EbitETmhxqNoE_F_g4";
const FALLBACK_SUPABASE_PROJECT_ID = "adljdeekwifwcdcgbpit";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Corte para o backend próprio: um único switch troca a origem de dados de
  // todo o app. Enquanto for "false", nada muda e o Supabase continua ativo.
  const useLocalBackend = env.VITE_USE_LOCAL_BACKEND === "true";
  const apiUrl = env.VITE_API_URL || "https://api.maisresultadosonline.com.br";

  return {
  base: "/",
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
      env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL
    ),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
      env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_PUBLISHABLE_KEY
    ),
    // Compatibilidade com builds antigos que ainda referenciem o nome legado.
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
      env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_PUBLISHABLE_KEY
    ),
    "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(
      env.VITE_SUPABASE_PROJECT_ID || FALLBACK_SUPABASE_PROJECT_ID
    ),
    "import.meta.env.VITE_API_URL": JSON.stringify(apiUrl),
    "import.meta.env.VITE_API_ANON_KEY": JSON.stringify(
      env.VITE_API_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_PUBLISHABLE_KEY
    ),
    "import.meta.env.VITE_USE_LOCAL_BACKEND": JSON.stringify(String(useLocalBackend)),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: [
      // Redireciona as 213 páginas para o backend da VPS sem editá-las.
      ...(useLocalBackend
        ? [
            {
              find: /^@\/integrations\/supabase\/client$/,
              replacement: path.resolve(__dirname, "./src/integrations/backend/client.ts"),
            },
          ]
        : []),
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },

  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Use default hashing for better cache busting
      },
    },
  },
  };
});