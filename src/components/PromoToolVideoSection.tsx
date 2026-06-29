import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

const VIDEO_SERVER = "https://video.maisresultadosonline.com.br";
const MILESTONES = [25, 50, 75, 100];
const isRel = (u: string) => u.startsWith("/");

const PromoToolVideoSection = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const sentRef = useRef<Set<number>>(new Set());
  const [cfg, setCfg] = useState<{ video_url: string | null; hls_url: string | null; video_title: string | null }>({
    video_url: null, hls_url: null, video_title: null,
  });
  const [started, setStarted] = useState(false);
  const [percent, setPercent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);


  useEffect(() => {
    supabase.functions
      .invoke("instagrammnew-discount", { body: { action: "get_video" } })
      .then(({ data }) => { if (data) setCfg(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!started) return;
    const video = videoRef.current;
    if (!video) return;
    const { video_url, hls_url } = cfg;
    if (!video_url && !hls_url) return;

    const hlsCandidate = hls_url || (video_url?.includes(".m3u8") ? video_url : null);
    const directCandidate = video_url && !video_url.includes(".m3u8") ? video_url : null;
    const fullVideo = directCandidate ? (isRel(directCandidate) ? `${VIDEO_SERVER}${directCandidate}` : directCandidate) : null;
    const fullHls = hlsCandidate ? (isRel(hlsCandidate) ? `${VIDEO_SERVER}${hlsCandidate}` : hlsCandidate) : null;
    const loadDirect = () => { if (fullVideo) video.src = fullVideo; };

    if (fullHls && Hls.isSupported()) {
      try {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(fullHls);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_e, d) => { if (d.fatal) loadDirect(); });
      } catch { loadDirect(); }
    } else if (fullHls && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = fullHls;
    } else {
      loadDirect();
    }
    video.play().catch(() => {});

    const getEmail = () => {
      try {
        return (
          new URLSearchParams(window.location.search).get("email") ||
          localStorage.getItem("rendaextra-desconto:email") ||
          ""
        );
      } catch { return ""; }
    };

    const onTime = () => {
      const d = video.duration || 0;
      if (d <= 0) return;
      const pct = Math.min(100, Math.floor((video.currentTime / d) * 100));
      setPercent(pct);
      for (const m of MILESTONES) {
        if (pct >= m && !sentRef.current.has(m)) {
          sentRef.current.add(m);
          const email = getEmail();
          if (email) {
            supabase.functions
              .invoke("rendaextra-desconto-access", {
                body: { action: "track_promo_progress", email, percent: m },
              })
              .catch(() => {});
          }
        }
      }
    };

    video.addEventListener("timeupdate", onTime);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      try { hlsRef.current?.destroy(); } catch { /* noop */ }
      hlsRef.current = null;
    };
  }, [started, cfg]);

  return (
    <section className="py-14 sm:py-20 px-3 sm:px-4 bg-gradient-to-b from-black via-gray-950 to-black">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3 leading-tight">
            VEJA COMO A <span className="text-yellow-400">FERRAMENTA TRABALHA</span>
          </h2>
          <p className="text-gray-300 text-sm sm:text-lg max-w-2xl mx-auto">
            E os resultados reais que ela pode trazer para voce todos os meses.
          </p>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-yellow-500/20 shadow-[0_0_40px_rgba(234,179,8,0.15)] bg-black aspect-video group">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-contain bg-black"
            playsInline
            preload="metadata"
            disablePictureInPicture
            controlsList="nodownload noplaybackrate nofullscreen noremoteplayback"
            onContextMenu={(e) => e.preventDefault()}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          {!started && (
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="absolute inset-0 w-full h-full group flex items-center justify-center bg-black/50"
              aria-label="Reproduzir video"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-yellow-400 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                <Play className="w-9 h-9 sm:w-11 sm:h-11 text-black ml-1" fill="currentColor" />
              </div>
            </button>
          )}

          {started && (
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => {
                  const v = videoRef.current; if (!v) return;
                  if (v.paused) v.play().catch(() => {}); else v.pause();
                }}
                className="w-10 h-10 rounded-full bg-black/70 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/90 transition"
                aria-label={isPlaying ? "Pausar" : "Reproduzir"}
              >
                {isPlaying ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  const v = videoRef.current; if (!v) return;
                  v.muted = !v.muted; setIsMuted(v.muted);
                }}
                className="w-10 h-10 rounded-full bg-black/70 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/90 transition"
                aria-label={isMuted ? "Ativar som" : "Silenciar"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};


export default PromoToolVideoSection;
