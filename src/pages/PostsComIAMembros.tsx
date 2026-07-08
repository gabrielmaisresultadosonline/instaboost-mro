import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Play, ExternalLink, Sparkles, Cpu, Loader2, LayoutGrid, Gift, Maximize2, X, BookOpen, Crown, HelpCircle, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TrackedVideo from "@/components/TrackedVideo";
import { openWhatsAppChat } from "@/lib/whatsapp";

const HELP_WHATSAPP = "5551992835863";

const BONUS_VIDEOS: Module[] = [
  {
    id: "bonus-vender-sem-anuncios",
    title: "Como Vender Sem Gastar Com Anúncios",
    description: "Estratégias 100% orgânicas para vender todos os dias sem investir em tráfego pago.",
    cover_url: "https://img.youtube.com/vi/5u3d1ZVb7tM/maxresdefault.jpg",
    video_url: "https://www.youtube.com/watch?v=5u3d1ZVb7tM",
    order_index: 0,
  },
  {
    id: "bonus-renda-extra-mro",
    title: "Renda Extra: +R$5.000 com a MRO",
    description: "Passo a passo real de quem está faturando mais de 5 mil por mês com a MRO.",
    cover_url: "https://img.youtube.com/vi/-0CHlqHVe0g/maxresdefault.jpg",
    video_url: "https://www.youtube.com/watch?v=-0CHlqHVe0g",
    order_index: 1,
  },
];

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
      localStorage.setItem("postsprompts_buyer_email", member.email);
    }
    window.open("/postsprompts", "_blank", "noopener,noreferrer");
  }

  const [bonusLoading, setBonusLoading] = useState(false);
  async function openPromptsMROBonus() {
    if (!member?.email || bonusLoading) return;
    setBonusLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("postscomia-admin", {
        body: { action: "bonus_prompts_provision", email: member.email },
      });
      if (error || !data?.success) throw new Error(data?.error || "Erro ao liberar bônus");
      sessionStorage.setItem("prompts_mro_user", JSON.stringify(data.user));
      navigate("/prompts/dashboard");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao liberar bônus");
    } finally {
      setBonusLoading(false);
    }
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

        {/* CONTAINER 1 — Bônus & Ferramentas */}
        <section className="mb-14 p-5 md:p-7 rounded-3xl border border-[#eab308]/20 bg-gradient-to-br from-[#0b0b0b] to-[#050505]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#eab308]/15 border border-[#eab308]/30 flex items-center justify-center">
                <Gift className="w-5 h-5 text-[#eab308]" />
              </div>
              <div>
                <div className="text-[10px] tracking-[0.25em] uppercase text-[#eab308] font-bold">Container 01</div>
                <h2 className="text-xl md:text-2xl font-black" style={heading}>Bônus & Ferramentas</h2>
              </div>
            </div>
            <span className="hidden md:inline text-[10px] text-[#71717a] font-mono">3 acessos liberados</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={openChatGPT}
              className="group relative overflow-hidden text-left p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a0a0a] to-[#111] hover:border-[#eab308]/50 transition"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#eab308] opacity-[0.06] blur-3xl rounded-full group-hover:opacity-[0.12] transition" />
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#10a37f] flex items-center justify-center flex-shrink-0">
                  <Cpu className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] tracking-[0.2em] uppercase text-[#eab308] font-bold mb-1">Ferramenta</div>
                  <div className="text-base font-black" style={heading}>ChatGPT</div>
                  <div className="text-xs text-[#a1a1aa]">Abrir em nova aba</div>
                </div>
                <ExternalLink className="w-4 h-4 text-[#71717a] group-hover:text-[#eab308] transition" />
              </div>
            </button>

            <button
              onClick={openPostsPrompts}
              className="group relative overflow-hidden text-left p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a0a0a] to-[#111] hover:border-[#eab308]/50 transition"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#eab308] opacity-[0.08] blur-3xl rounded-full group-hover:opacity-[0.16] transition" />
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#eab308] flex items-center justify-center flex-shrink-0">
                  <LayoutGrid className="w-6 h-6 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] tracking-[0.2em] uppercase text-[#eab308] font-bold mb-1">Bônus</div>
                  <div className="text-base font-black" style={heading}>Posts Prompts</div>
                  <div className="text-xs text-[#a1a1aa]">Acesso direto sem login</div>
                </div>
                <ExternalLink className="w-4 h-4 text-[#71717a] group-hover:text-[#eab308] transition" />
              </div>
            </button>

            <button
              onClick={openPromptsMROBonus}
              disabled={bonusLoading}
              className="group relative overflow-hidden text-left p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a0a0a] to-[#111] hover:border-[#eab308]/50 transition disabled:opacity-60 disabled:cursor-wait"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#eab308] opacity-[0.08] blur-3xl rounded-full group-hover:opacity-[0.16] transition" />
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#eab308] to-[#facc15] flex items-center justify-center flex-shrink-0">
                  {bonusLoading ? <Loader2 className="w-6 h-6 text-black animate-spin" /> : <BookOpen className="w-6 h-6 text-black" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] tracking-[0.2em] uppercase text-[#eab308] font-bold mb-1">Bônus Exclusivo</div>
                  <div className="text-base font-black" style={heading}>Prompts MRO</div>
                  <div className="text-xs text-[#a1a1aa]">Entrar direto — sem pedir e-mail</div>
                </div>
                <ExternalLink className="w-4 h-4 text-[#71717a] group-hover:text-[#eab308] transition" />
              </div>
            </button>
          </div>
        </section>

        {/* CONTAINER 2 — Módulos do Curso */}
        <section className="p-5 md:p-7 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b0b0b] to-[#050505]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-[#eab308]" />
              </div>
              <div>
                <div className="text-[10px] tracking-[0.25em] uppercase text-[#eab308] font-bold">Container 02</div>
                <h2 className="text-xl md:text-2xl font-black" style={heading}>Módulos do Curso</h2>
              </div>
            </div>
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
        </section>
      </main>

      {/* Video Modal (popup) */}
      {selected && (
        <VideoPopup module={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function VideoPopup({ module: m, onClose }: { module: Module; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const onFsChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.fullscreenElement) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (containerRef.current) await containerRef.current.requestFullscreen();
    } catch { /* ignore */ }
  }

  const isYoutube = m.video_url && (m.video_url.includes("youtube") || m.video_url.includes("youtu.be"));

  return (
    <div
      className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-2 md:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="w-full max-w-5xl bg-[#0a0a0a] border border-[#eab308]/30 rounded-2xl overflow-hidden shadow-[0_0_120px_rgba(234,179,8,0.25)] flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-white/10 bg-black/60">
          <h3 className="font-black truncate text-sm md:text-base" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>{m.title}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleFullscreen}
              title={isFs ? "Sair da tela cheia" : "Preencher a tela"}
              className="w-9 h-9 rounded-lg hover:bg-white/10 text-[#a1a1aa] hover:text-[#eab308] flex items-center justify-center transition"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title="Fechar"
              className="w-9 h-9 rounded-lg hover:bg-white/10 text-[#a1a1aa] hover:text-white flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className={`bg-black flex-1 ${isFs ? "" : "aspect-video"}`}>
          {m.video_url ? (
            isYoutube ? (
              <iframe
                className="w-full h-full"
                src={toEmbed(m.video_url)}
                title={m.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <TrackedVideo src={m.video_url} videoId={m.id} videoTitle={m.title} className="w-full h-full bg-black object-contain" />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#71717a]">
              Vídeo em breve.
            </div>
          )}
        </div>
        {m.description && !isFs && (
          <div className="p-4 text-sm text-[#a1a1aa]">{m.description}</div>
        )}
      </div>
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
