import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, Volume2, VolumeX, Lock, MessageCircle, Maximize } from "lucide-react";

const VIDEO_SERVER = "https://video.maisresultadosonline.com.br";
const WHATSAPP_URL =
  "https://wa.me/5551928358563?text=" +
  encodeURIComponent("Vim pelo site, Gostaria de saber sobre o desconto!");

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
      if (pct >= 98 && !watched) {
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
      {showNotice && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowNotice(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-gradient-to-br from-zinc-900 to-black ring-1 ring-amber-500/40 shadow-[0_0_60px_rgba(251,191,36,0.25)] p-6 md:p-8 text-center"
          >
            <button
              type="button"
              onClick={() => setShowNotice(false)}
              aria-label="Fechar"
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition flex items-center justify-center"
            >
              ✕
            </button>
            <div className="mx-auto mb-4 inline-flex px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/40">
              Aviso importante
            </div>
            <h2 className="text-xl md:text-2xl font-black leading-tight bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent">
              Estamos passando por uma atualização de preços
            </h2>
            <p className="mt-3 text-sm md:text-base text-zinc-300">
              Volte em <span className="font-bold text-amber-300">20 minutos</span> para conferir os novos valores.
            </p>
            <button
              type="button"
              onClick={() => setShowNotice(false)}
              className="mt-6 w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 transition"
            >
              Fechar
            </button>
            <p className="mt-3 text-[11px] text-zinc-500">Este aviso fecha automaticamente em 5s.</p>
          </div>
        </div>
      )}
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-16">
        <div className="text-center">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs md:text-sm font-bold uppercase tracking-[0.2em] bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/40 mb-5">
            Oferta exclusiva
          </span>
          <h1 className="text-4xl md:text-7xl font-black leading-[1.05] tracking-tight bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_4px_30px_rgba(251,191,36,0.35)]">
            Não gaste com anúncios
          </h1>
          <p className="mt-5 text-xl md:text-3xl font-extrabold text-white">
            Utilize a{" "}
            <span className="relative inline-block text-amber-400">
              Ferramenta MRO
              <span className="absolute left-0 -bottom-1 h-[3px] w-full bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
            </span>{" "}
            e pague <span className="underline decoration-amber-500 decoration-4 underline-offset-4">apenas uma vez!</span>
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className="h-px w-8 md:w-16 bg-gradient-to-r from-transparent to-amber-500/60" />
            <p className="text-sm md:text-base font-semibold text-amber-200/90 uppercase tracking-wider">
              Assista ao vídeo para entender tudo e receber o desconto!
            </p>
            <span className="h-px w-8 md:w-16 bg-gradient-to-l from-transparent to-amber-500/60" />
          </div>
        </div>

        {/* Video */}
        <div className="mt-8 relative rounded-2xl overflow-hidden bg-black ring-1 ring-amber-500/30 shadow-[0_0_60px_rgba(251,191,36,0.15)]">
          <div className="relative aspect-video">
            <video
              ref={videoRef}
              className="w-full h-full bg-black"
              playsInline
              controls={false}
              preload="metadata"
            />
            {!started && (
              <button
                onClick={handleStart}
                className="absolute inset-0 flex items-center justify-center bg-black/60 hover:bg-black/50 transition"
                aria-label="Reproduzir"
              >
                <span className="w-20 h-20 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center shadow-2xl">
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
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col items-center">
          {watched ? (
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleCtaClick}
              className="relative inline-flex items-center gap-3 px-8 py-5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black text-lg md:text-2xl shadow-[0_0_40px_rgba(34,197,94,0.5)] hover:scale-105 transition animate-pulse"
            >
              <MessageCircle className="w-7 h-7" />
              APROVEITAR O DESCONTO
            </a>
          ) : (
            <button
              disabled
              className="inline-flex items-center gap-3 px-8 py-5 rounded-2xl bg-zinc-800 text-zinc-400 font-bold text-lg md:text-xl cursor-not-allowed ring-1 ring-zinc-700"
            >
              <Lock className="w-6 h-6" />
              Assista o vídeo todo para liberar o desconto
            </button>
          )}
          <p className="mt-4 text-sm text-zinc-500 text-center max-w-md">
            O botão será liberado automaticamente assim que você concluir o vídeo.
          </p>
        </div>
      </div>
    </div>
  );
}
