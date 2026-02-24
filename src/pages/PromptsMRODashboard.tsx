import { useState, useEffect } from "react";
import { Sparkles, LogOut, Copy, Check, Search, Image, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PromptItem {
  id: string;
  folder_name: string;
  prompt_text: string;
  image_url: string | null;
  category: string | null;
  order_index: number;
}

interface UserData {
  id: string;
  name: string;
  email: string;
}

const PromptsMRODashboard = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLogging, setIsLogging] = useState(false);

  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Check session
  useEffect(() => {
    const saved = sessionStorage.getItem("prompts_mro_user");
    if (saved) {
      setUser(JSON.parse(saved));
    }
  }, []);

  // Load prompts when user is logged in
  useEffect(() => {
    if (user) loadPrompts();
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLogging(true);
    try {
      const { data, error } = await supabase.functions.invoke("prompts-mro-auth", {
        body: { email: loginEmail, password: loginPassword },
        headers: { "Content-Type": "application/json" },
      });

      // Handle edge function returning error in body
      const params = new URLSearchParams();
      params.set("action", "login");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prompts-mro-auth?action=login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email: loginEmail, password: loginPassword }),
        }
      );

      const result = await res.json();

      if (!res.ok || result.error) {
        toast.error(result.error || "Erro ao fazer login");
        return;
      }

      setUser(result.user);
      sessionStorage.setItem("prompts_mro_user", JSON.stringify(result.user));
      toast.success(`Bem-vindo(a), ${result.user.name}!`);
    } catch (err) {
      toast.error("Erro ao conectar ao servidor");
    } finally {
      setIsLogging(false);
    }
  };

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prompts-mro-auth?action=get-prompts`,
        {
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const result = await res.json();
      setPrompts(result.prompts || []);
    } catch {
      toast.error("Erro ao carregar prompts");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Prompt copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("prompts_mro_user");
    setUser(null);
    setPrompts([]);
  };

  const filteredPrompts = prompts.filter(p => {
    const matchesSearch = p.folder_name.toLowerCase().includes(search.toLowerCase()) || p.prompt_text.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || (p.category || "geral") === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: "all", label: "Todos", icon: "🌐" },
    { value: "feminino", label: "Feminino", icon: "👩" },
    { value: "masculino", label: "Masculino", icon: "👨" },
    { value: "geral", label: "Geral", icon: "🎯" },
  ];

  // LOGIN SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-[#050508] text-white flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-600/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-purple-600/8 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md">
          <div className="bg-[#111118] border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl shadow-purple-900/10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <span className="font-bold text-xl">PROMPTS <span className="text-purple-400">MRO</span></span>
              </div>
              <h1 className="text-2xl font-bold mb-2">Acesse sua conta</h1>
              <p className="text-gray-400 text-sm">Entre com suas credenciais para acessar os prompts</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">E-mail</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">Senha</label>
                <input
                  type="password"
                  placeholder="Sua senha"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isLogging}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-purple-600/25"
              >
                {isLogging ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <p className="text-xs text-gray-600 mt-6 text-center">
              Não tem conta? Entre em contato para obter acesso.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // DASHBOARD
  return (
    <div className="min-h-screen bg-[#050508] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#050508]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span className="font-bold text-lg">PROMPTS <span className="text-purple-400">MRO</span></span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block">Olá, <span className="text-white font-medium">{user.name}</span></span>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-red-500/50 text-sm text-gray-400 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Seus Prompts</h1>
          <p className="text-gray-400">Encontre e copie prompts profissionais para gerar suas fotos com IA</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar prompts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setFilterCategory(cat.value)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  filterCategory === cat.value
                    ? "bg-purple-600 text-white"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-purple-500/30"
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-6 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <Image className="w-4 h-4 text-purple-400" />
            <span>{filteredPrompts.length} prompts</span>
          </div>
          {filterCategory !== "all" && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-pink-400" />
              <span>Filtro: {categories.find(c => c.value === filterCategory)?.label}</span>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Prompts Grid */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPrompts.map(prompt => (
              <div key={prompt.id} className="group bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all">
                {/* Image */}
                {prompt.image_url && (
                  <div className="aspect-[3/4] overflow-hidden bg-black/20">
                    <img
                      src={prompt.image_url}
                      alt={prompt.folder_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm truncate flex-1">{prompt.folder_name}</h3>
                    {(prompt.category || "geral") === "feminino" && (
                      <span className="text-xs bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full ml-2">👩</span>
                    )}
                    {(prompt.category || "geral") === "masculino" && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full ml-2">👨</span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mb-3 line-clamp-3 leading-relaxed">
                    {prompt.prompt_text.substring(0, 120)}...
                  </p>

                  <button
                    onClick={() => handleCopy(prompt.prompt_text, prompt.id)}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                      copiedId === prompt.id
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-purple-600/20 text-purple-300 border border-purple-500/20 hover:bg-purple-600/30 hover:border-purple-500/40"
                    }`}
                  >
                    {copiedId === prompt.id ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar Prompt
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredPrompts.length === 0 && (
          <div className="text-center py-20">
            <Image className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">Nenhum prompt encontrado</h3>
            <p className="text-gray-600 text-sm">Tente alterar os filtros ou buscar por outro termo</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default PromptsMRODashboard;
