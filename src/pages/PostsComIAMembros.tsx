import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Play, ExternalLink, Sparkles, Cpu, Loader2, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "postscomia_member";
const heading = { fontFamily: "'Sora', system-ui, sans-serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };

interface Module {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  video_url: string | null;
  order_index: number;
}

interface Member { email: string; name?: string }

export default function PostsComIAMembros() {
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Module | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      navigate("/postscomia/login");
      return;
    }
    try {
      setMember(JSON.parse(raw));
    } catch {
      navigate("/postscomia/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (!member) return;
    (async () => {
      const { data } = await supabase.functions.invoke("postscomia-admin", {
        body: { action: "list_modules_public" },
      });
      setModules(data?.modules || []);
      setLoading(false);
    })();
  }, [member]);

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    navigate("/postscomia/login");
  }

  function openChatGPT() {
    window.open("https://chat.openai.com", "_blank", "noopener,noreferrer");
  }

  function openPostsPrompts() {
    if (member?.email) {
      // Grant direct access — postsprompts checks localStorage
      localStorage.setItem("postsprompts_buyer_email", member.email);
    }
    window.open("/postsprompts", "_blank", "noopener,noreferrer");
  }

  if (!member) return null;

  return (
    <div className="min-h-screen bg-black text-[#f5f5f5] relative overflow-x-hidden" style={body}>
      {/* Ambient bg */}
      <div
        className="fixed inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(#f5f5f5 1px, transparent 1px), linear-gradient(90deg, #f5f5f5 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="fixed top-[-200px] right-[-100px] w-[500px] h-[500px] bg-[#eab308] opacity-[0.06] blur-[140px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-200px] left-[-100px] w-[500px] h-[500px] bg-[#eab308] opacity-[0.04] blur-[140px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-black/60 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#eab308] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] tracking-[0.25em] uppercase text-[#eab308] font-bold">Posts com I.A</div>
              <div className="text-sm font-bold truncate" style={heading}>
                Olá, {member.name || member.email.split("@")[0]}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="px-3 py-2 rounded-lg border border-white/10 hover:border-[#eab308]/50 text-xs font-bold flex items-center gap-1.5 text-[#a1a1aa] hover:text-white transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10">
        {/* Welcome */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#eab308]/30 bg-[#eab308]/5 text-[#eab308] text-[10px] font-bold tracking-[0.2em] uppercase mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#eab308] animate-pulse" />
            Acesso Vitalício Ativo
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3" style={heading}>
            Dashboard <span className="text-[#eab308]">de Membros</span>
          </h1>
          <p className="text-[#a1a1aa] max-w-2xl">
            Todos os módulos, ferramentas e bônus liberados. Acesse o ChatGPT e o Posts Prompts com um clique.
          </p>
        </div>

        {/* Quick Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <button
            onClick={openChatGPT}
            className="group relative overflow-hidden text-left p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a0a0a] to-[#111] hover:border-[#eab308]/50 transition"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#eab308] opacity-[0.06] blur-3xl rounded-full group-hover:opacity-[0.12] transition" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#10a37f] flex items-center justify-center flex-shrink-0">
                <Cpu className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] tracking-[0.2em] uppercase text-[#eab308] font-bold mb-1">Ferramenta Principal</div>
                <div className="text-lg font-black" style={heading}>ChatGPT</div>
                <div className="text-xs text-[#a1a1aa]">Abrir o ChatGPT em nova aba</div>
              </div>
              <ExternalLink className="w-5 h-5 text-[#71717a] group-hover:text-[#eab308] transition" />
            </div>
          </button>

          <button
            onClick={openPostsPrompts}
            className="group relative overflow-hidden text-left p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a0a0a] to-[#111] hover:border-[#eab308]/50 transition"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#eab308] opacity-[0.08] blur-3xl rounded-full group-hover:opacity-[0.16] transition" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#eab308] flex items-center justify-center flex-shrink-0">
                <LayoutGrid className="w-7 h-7 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] tracking-[0.2em] uppercase text-[#eab308] font-bold mb-1">Bônus Liberado</div>
                <div className="text-lg font-black" style={heading}>Posts Prompts</div>
                <div className="text-xs text-[#a1a1aa]">Acesso direto — sem precisar de login</div>
              </div>
              <ExternalLink className="w-5 h-5 text-[#71717a] group-hover:text-[#eab308] transition" />
            </div>
          </button>
        </div>

        {/* Modules */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black" style={heading}>
            Módulos do Curso
          </h2>
          <span className="text-xs text-[#71717a] font-mono">{modules.length} módulos</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#eab308]" />
          </div>
        ) : modules.length === 0 ? (
          <div className="p-10 rounded-2xl border border-dashed border-white/10 text-center text-[#71717a]">
            Nenhum módulo publicado ainda. Volte em breve.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {modules.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className="group text-left rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0a] hover:border-[#eab308]/50 transition"
              >
                <div className="relative aspect-video bg-[#111] overflow-hidden">
                  {m.cover_url ? (
                    <img
                      src={m.cover_url}
                      alt={m.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-[#eab308]/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute top-3 left-3 text-[10px] font-mono text-[#eab308] tracking-widest bg-black/60 px-2 py-1 rounded">
                    MÓDULO {String(idx + 1).padStart(2, "0")}
                  </div>
                  <div className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-[#eab308] flex items-center justify-center group-hover:scale-110 transition">
                    <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold mb-1 line-clamp-2" style={heading}>
                    {m.title}
                  </h3>
                  {m.description && (
                    <p className="text-xs text-[#a1a1aa] line-clamp-2">{m.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Video Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-4xl bg-[#0a0a0a] border border-[#eab308]/30 rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(234,179,8,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="font-black truncate" style={heading}>{selected.title}</h3>
              <button
                onClick={() => setSelected(null)}
                className="text-[#a1a1aa] hover:text-white text-2xl leading-none"
              >×</button>
            </div>
            <div className="aspect-video bg-black">
              {selected.video_url ? (
                selected.video_url.includes("youtube") || selected.video_url.includes("youtu.be") ? (
                  <iframe
                    className="w-full h-full"
                    src={toEmbed(selected.video_url)}
                    title={selected.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video src={selected.video_url} controls autoPlay className="w-full h-full" />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#71717a]">
                  Vídeo em breve.
                </div>
              )}
            </div>
            {selected.description && (
              <div className="p-4 text-sm text-[#a1a1aa]">{selected.description}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function toEmbed(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes("youtube")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  } catch {
    return url;
  }
}
