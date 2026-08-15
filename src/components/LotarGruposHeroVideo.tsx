import { useRef, useState } from "react";
import { Volume2, VolumeX, Play, Pause, MousePointerClick } from "lucide-react";
import videoAsset from "@/assets/lotargrupos-apresentacao.mp4.asset.json";
import { assetUrl } from "@/lib/assetUrl";

/**
 * Vídeo de apresentação do Lotar Grupos.
 * - Inicia automaticamente em loop, sem áudio (compatível com políticas de autoplay).
 * - Tarja "Clique para assistir" acima do player.
 * - Ao clicar, reinicia do zero com áudio ativado e sem loop.
 */
const LotarGruposHeroVideo = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activated, setActivated] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

  const src = assetUrl(videoAsset.url);

  const activate = () => {
    const v = videoRef.current;
    if (!v) return;
    setActivated(true);
    v.loop = false;
    v.muted = false;
    setMuted(false);
    try {
      v.currentTime = 0;
    } catch {
      /* ignore */
    }
    v.play().catch(() => {});
    setPlaying(true);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-10">
      {/* Tarja */}
      <button
        type="button"
        onClick={activate}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-t-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs sm:text-sm uppercase tracking-widest animate-pulse hover:opacity-90 transition"
      >
        <MousePointerClick className="w-4 h-4 shrink-0" />
        <span className="text-center leading-tight">Clique para assistir com som</span>
      </button>

      <div className="relative w-full aspect-video bg-black rounded-b-2xl overflow-hidden border border-blue-500/30 shadow-2xl">
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain cursor-pointer"
          autoPlay
          loop
          muted
          playsInline
          preload="none"
          onClick={() => (activated ? togglePlay() : activate())}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />

        {!activated && (
          <button
            type="button"
            onClick={activate}
            aria-label="Assistir do início com áudio"
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition"
          >
            <span className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
              <Play className="w-9 h-9 text-white fill-white ml-1" />
            </span>
          </button>
        )}

        {activated && (
          <div className="absolute bottom-0 inset-x-0 flex items-center gap-3 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <button type="button" onClick={togglePlay} aria-label={playing ? "Pausar" : "Reproduzir"} className="text-white">
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button type="button" onClick={toggleMute} aria-label={muted ? "Ativar som" : "Silenciar"} className="text-white">
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LotarGruposHeroVideo;
