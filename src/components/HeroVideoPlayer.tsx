import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  src: string;
  hlsSrc?: string;
  poster?: string;
  videoId: string;
  videoTitle: string;
}

export default function HeroVideoPlayer({ src, hlsSrc, poster, videoId, videoTitle }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const fired = useRef<Set<string>>(new Set());
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  function track(event_type: string) {
    if (fired.current.has(event_type)) return;
    fired.current.add(event_type);
    const sid = sessionStorage.getItem("pcia_sid") || "";
    supabase.functions
      .invoke("postscomia-admin", {
        body: { action: "track", event_type, video_id: videoId, video_title: videoTitle, session_id: sid },
      })
      .catch(() => {});
  }

  // Attach HLS if provided and supported
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const url = hlsSrc || src;
    if (!url) return;

    let hls: any = null;
    if (hlsSrc && !v.canPlayType("application/vnd.apple.mpegurl")) {
      // Lazy-load hls.js only when needed
      import("hls.js")
        .then((mod) => {
          const Hls = mod.default;
          if (Hls?.isSupported()) {
            hls = new Hls();
            hls.loadSource(hlsSrc);
            hls.attachMedia(v);
          } else {
            v.src = src;
          }
        })
        .catch(() => {
          v.src = src;
        });
    } else {
      v.src = url;
    }

    // Autoplay muted
    v.muted = true;
    v.play().catch(() => {});

    return () => {
      if (hls) hls.destroy();
    };
  }, [src, hlsSrc]);

  function togglePlay() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }
  function toggleMute() {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  return (
    <div className="absolute inset-0 w-full h-full group">
      <video
        ref={ref}
        poster={poster}
        autoPlay
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full bg-black object-contain"
        onPlay={() => { setPlaying(true); track("video_start"); }}
        onPause={() => setPlaying(false)}
        onClick={togglePlay}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (!v.duration || !isFinite(v.duration)) return;
          const pct = (v.currentTime / v.duration) * 100;
          if (pct >= 25) track("video_25");
          if (pct >= 50) track("video_50");
          if (pct >= 75) track("video_75");
        }}
        onEnded={() => track("video_100")}
      />

      {/* Custom overlay controls — no seek bar */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pausar" : "Reproduzir"}
          className="w-10 h-10 rounded-full bg-[#eab308] text-black flex items-center justify-center hover:scale-105 transition-transform"
        >
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Ativar som" : "Silenciar"}
          className="w-10 h-10 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Big unmute hint while muted */}
      {muted && (
        <button
          type="button"
          onClick={toggleMute}
          className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/70 border border-[#eab308]/50 text-[11px] font-bold text-[#eab308] uppercase tracking-widest flex items-center gap-1.5 hover:bg-black/90"
        >
          <VolumeX className="w-3.5 h-3.5" /> Toque para ativar som
        </button>
      )}
    </div>
  );
}
