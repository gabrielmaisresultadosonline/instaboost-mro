import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, Volume2, VolumeX, Lock, Maximize, CheckCircle2, Shield, Crown, Sparkles, Zap, Infinity as InfinityIcon, Bot, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

type PlanKey = "trial" | "solo" | "pro" | "lifetime";
const PLANS: Record<PlanKey, { name: string; price: number; installment: string; accounts: number; durationLabel: string; badge?: string; icon: React.ComponentType<{ className?: string }> }> = {
  trial: { name: "Teste 1 Dia", price: 97, installment: "8", accounts: 4, durationLabel: "1 dia · liberação imediata", badge: "COMECE AQUI", icon: Zap },
  solo: { name: "Anual Solo", price: 247, installment: "25", accounts: 1, durationLabel: "1 ano de acesso", icon: Crown },
  pro: { name: "Anual Pro", price: 397, installment: "40", accounts: 4, durationLabel: "1 ano de acesso", badge: "MAIS VENDIDO", icon: Sparkles },
  lifetime: { name: "Agência Vitalício", price: 1197, installment: "122,83", accounts: 12, durationLabel: "Pagamento único · Vitalício", badge: "MELHOR CUSTO", icon: InfinityIcon },
};
const formatBRL = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const VIDEO_SERVER = "https://video.maisresultadosonline.com.br";

function getVisitorId(): string {
  try {
    let id = localStorage.getItem("fmp:visitor_id");
    if (!id) {
      id = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now()).toString();
      localStorage.setItem("fmp:visitor_id", id);
    }
    return id;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2);
  }
}

function track(event_type: string, extra?: Record<string, unknown>) {
  try {
    supabase.functions.invoke("ferramentamropromo-video", {
      body: {
        action: "track",
        visitor_id: getVisitorId(),
        event_type,
        user_agent: navigator.userAgent,
        referrer: document.referrer,
        path: window.location.pathname,
        ...(extra || {}),
      },
    }).catch(() => {});
  } catch {}
}

export default function FerramentaMROPromo() {
  const [cfg, setCfg] = useState<{ video_url: string | null; hls_url: string | null; video_title: string | null }>({
    video_url: null,
    hls_url: null,
    video_title: null,
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [watched, setWatched] = useState(false);
  const milestonesRef = useRef<Set<number>>(new Set());
  const [showNotice, setShowNotice] = useState(true);

  useEffect(() => {
    if (!showNotice) return;
    const t = setTimeout(() => setShowNotice(false), 5000);
    return () => clearTimeout(t);
  }, [showNotice]);

  useEffect(() => {
    document.title = "Ferramenta MRO — Desconto exclusivo";
    track("page_view");
    supabase.functions
      .invoke("ferramentamropromo-video", { body: { action: "get_video" } })
      .then(({ data }) => {
        if (data) setCfg(data);
      })
      .catch(() => {});

    // Restore unlock (persistent across visits)
    if (localStorage.getItem("ferramentamropromo:unlocked") === "1") {
      setWatched(true);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const { video_url, hls_url } = cfg;
    if (!video_url && !hls_url) return;
    const isRel = (u: string) => u.startsWith("/");
    const hlsCandidate = hls_url || (video_url?.includes(".m3u8") ? video_url : null);
    const directCandidate = video_url && !video_url.includes(".m3u8") ? video_url : null;
    const fullVideo = directCandidate ? (isRel(directCandidate) ? `${VIDEO_SERVER}${directCandidate}` : directCandidate) : null;
    const fullHls = hlsCandidate ? (isRel(hlsCandidate) ? `${VIDEO_SERVER}${hlsCandidate}` : hlsCandidate) : null;
    const tryBgAutoplay = () => {
      if (started) return;
      try {
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {}
    };
    const loadDirect = () => {
      if (fullVideo) {
        video.src = fullVideo;
        video.addEventListener("loadedmetadata", tryBgAutoplay, { once: true });
      }
    };
    if (fullHls && Hls.isSupported()) {
      (async () => {
        try {
          const res = await fetch(fullHls, { method: "HEAD" });
          if (!res.ok) return loadDirect();
          const hls = new Hls({ startLevel: 0, capLevelToPlayerSize: true, enableWorker: true });
          hls.loadSource(fullHls);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, tryBgAutoplay);
          hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) { hls.destroy(); loadDirect(); } });
          hlsRef.current = hls;
        } catch { loadDirect(); }
      })();
    } else if (fullHls && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = fullHls;
      video.addEventListener("loadedmetadata", tryBgAutoplay, { once: true });
    } else {
      loadDirect();
    }
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [cfg]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => {
      const d = video.duration || 0;
      if (d <= 0) return;
      const pct = (video.currentTime / d) * 100;
      for (const m of [25, 50, 75, 100]) {
        if (pct >= m && !milestonesRef.current.has(m)) {
          milestonesRef.current.add(m);
          track("video_progress", { progress_pct: m });
        }
      }
      if (pct >= 50 && !watched) {
        setWatched(true);
        localStorage.setItem("ferramentamropromo:unlocked", "1");
      }
    };
    const onEnded = () => {
      if (!milestonesRef.current.has(100)) {
        milestonesRef.current.add(100);
        track("video_progress", { progress_pct: 100 });
      }
      setWatched(true);
      localStorage.setItem("ferramentamropromo:unlocked", "1");
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("ended", onEnded);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [watched, cfg]);

  const handleStart = () => {
    const v = videoRef.current;
    if (!v) return;
    setStarted(true);
    track("video_start");
    try {
      v.loop = false;
      v.currentTime = 0;
    } catch {}
    v.muted = false;
    setMuted(false);
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => {});
    });
  };

  const handleCtaClick = () => {
    track("cta_click");
    try {
      // Meta Pixel Lead
      // @ts-ignore
      if (typeof window !== "undefined" && typeof (window as any).fbq === "function") {
        (window as any).fbq("track", "Lead", { source: "ferramentamropromo" });
      }
    } catch {}
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const toggleFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    const anyDoc = document as any;
    const anyV = v as any;
    if (anyDoc.fullscreenElement || anyDoc.webkitFullscreenElement) {
      (anyDoc.exitFullscreen || anyDoc.webkitExitFullscreen)?.call(document);
    } else {
      (anyV.requestFullscreen || anyV.webkitEnterFullscreen || anyV.webkitRequestFullscreen)?.call(v);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-16">
        <div className="text-center">
          <span className="inline-block px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/40 mb-6">
            Oferta exclusiva
          </span>
          <h1
            className="text-5xl md:text-8xl leading-[0.95] tracking-tight bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_4px_30px_rgba(251,191,36,0.4)]"
            style={{ fontWeight: 900 }}
          >
            Não gaste com anúncios
          </h1>
          <p className="mt-4 text-base md:text-xl font-semibold text-white/90">
            Utilize a{" "}
            <span className="relative inline-block text-amber-400 font-bold">
              Ferramenta MRO
              <span className="absolute left-0 -bottom-1 h-[2px] w-full bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
            </span>{" "}
            e pague <span className="underline decoration-amber-500 decoration-2 underline-offset-4">apenas uma vez!</span>
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="h-px w-6 md:w-10 bg-gradient-to-r from-transparent to-amber-500/50" />
            <p className="text-[11px] md:text-xs font-medium text-amber-200/80 uppercase tracking-[0.2em]">
              Assista ao vídeo todo para entender e receber o desconto
            </p>
            <span className="h-px w-6 md:w-10 bg-gradient-to-l from-transparent to-amber-500/50" />
          </div>
        </div>

        {/* Video */}
        <div className="mt-8 relative rounded-2xl overflow-hidden bg-black ring-1 ring-amber-500/30 shadow-[0_0_60px_rgba(251,191,36,0.15)]">
          <div className="relative aspect-video">
            <video
              ref={videoRef}
              className={`w-full h-full bg-black transition-opacity duration-500 ${started ? "opacity-100" : "opacity-10"}`}
              playsInline
              controls={false}
              muted={!started}
              autoPlay
              loop={!started}
              preload="metadata"
            />
            {!started && (
              <button
                onClick={handleStart}
                className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition"
                aria-label="Reproduzir"
              >
                <span className="w-20 h-20 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center shadow-2xl animate-pulse">
                  <Play className="w-10 h-10 text-black ml-1" fill="currentColor" />
                </span>
              </button>
            )}
            {started && (
              <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-black/70 hover:bg-black flex items-center justify-center"
                  aria-label={playing ? "Pausar" : "Reproduzir"}
                >
                  {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleMute}
                  className="w-10 h-10 rounded-full bg-black/70 hover:bg-black flex items-center justify-center"
                  aria-label={muted ? "Ativar som" : "Silenciar"}
                >
                  {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="ml-auto w-10 h-10 rounded-full bg-black/70 hover:bg-black flex items-center justify-center"
                  aria-label="Tela cheia"
                >
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Plans reveal - unlocks at 50% */}
        {watched ? (
          <div className="mt-14 animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-4 border border-amber-500/40">
                <Sparkles className="w-3 h-3" /> Desconto liberado
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.05] bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent">
                Mais vendas sem gastar com anúncios
              </h2>
              <p className="mt-3 text-sm md:text-lg text-white/80 max-w-2xl mx-auto">
                <strong className="text-amber-300">Ferramenta completa + Inteligência Artificial</strong> incluso em todos os planos.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {(Object.keys(PLANS) as PlanKey[]).map((key) => {
                const p = PLANS[key];
                const Icon = p.icon;
                const themes: Record<PlanKey, string> = {
                  trial: "border-emerald-500/60 ring-emerald-500/20 from-emerald-500/10",
                  solo: "border-sky-500/60 ring-sky-500/20 from-sky-500/10",
                  pro: "border-amber-500/70 ring-amber-500/30 from-amber-500/10 lg:scale-[1.03]",
                  lifetime: "border-violet-500/60 ring-violet-500/20 from-violet-500/10",
                };
                const btns: Record<PlanKey, string> = {
                  trial: "bg-emerald-500 hover:bg-emerald-400 text-white",
                  solo: "bg-sky-500 hover:bg-sky-400 text-white",
                  pro: "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black",
                  lifetime: "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white",
                };
                return (
                  <div
                    key={key}
                    className={`relative rounded-2xl border-2 bg-gradient-to-b to-zinc-950/60 p-5 ring-4 ${themes[key]} shadow-xl`}
                  >
                    {p.badge && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black px-3 py-1 rounded-full bg-amber-500 text-black tracking-wider shadow-md">
                        {p.badge}
                      </span>
                    )}
                    <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 mb-3">
                      <Icon className="w-5 h-5 text-amber-300" />
                    </div>
                    <div className="font-bold text-lg">{p.name}</div>
                    <div className="text-[11px] text-white/60 mb-3">{p.durationLabel}</div>
                    <div className="text-3xl font-black">{formatBRL(p.price)}</div>
                    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md mt-1 mb-4">
                      12x de R$ {p.installment}
                    </div>
                    <div className="space-y-2 text-sm text-white/80 border-t border-white/10 pt-3">
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /><span><strong>{p.accounts}</strong> {p.accounts === 1 ? "conta" : "contas"} Instagram</span></div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />Ferramenta MRO completa</div>
                      <div className="flex items-center gap-2"><Bot className="w-4 h-4 text-emerald-400 shrink-0" />Inteligência Artificial</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />Área VIP + Suporte</div>
                    </div>
                    <Link
                      to="/pagamentomro"
                      onClick={handleCtaClick}
                      className={`mt-5 block w-full text-center py-3 rounded-xl font-black text-sm transition ${btns[key]}`}
                    >
                      Aproveitar agora →
                    </Link>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 max-w-2xl mx-auto flex items-center gap-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 p-5">
              <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <Shield className="w-7 h-7" />
              </div>
              <div>
                <p className="font-black text-emerald-300 text-lg">Garantia incondicional de 30 dias</p>
                <p className="text-sm text-white/70">Se não gostar, devolvemos 100% do seu dinheiro.</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/50">
              <ShieldCheck className="w-4 h-4" /> Checkout 100% seguro
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center">
            <button
              disabled
              className="inline-flex items-center gap-2 md:gap-3 px-4 py-3 md:px-8 md:py-5 rounded-xl md:rounded-2xl bg-zinc-800 text-zinc-400 font-bold text-sm md:text-xl cursor-not-allowed ring-1 ring-zinc-700 animate-pulse"
            >
              <Lock className="w-4 h-4 md:w-6 md:h-6" />
              Assista o vídeo para liberar os valores
            </button>
            <p className="mt-4 text-sm text-zinc-500 text-center max-w-md">
              Os planos serão liberados automaticamente ao chegar em 50% do vídeo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
