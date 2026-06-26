import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const VIDEO_ID = "lecSwt54sa0";
const MILESTONES = [25, 50, 75, 100];

const loadYTApi = () =>
  new Promise<void>((resolve) => {
    if (window.YT && window.YT.Player) return resolve();
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!existing) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });

const PromoToolVideoSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const sentRef = useRef<Set<number>>(new Set());
  const [started, setStarted] = useState(false);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!started) return;
    let interval: number | undefined;
    let cancelled = false;

    (async () => {
      await loadYTApi();
      if (cancelled || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: VIDEO_ID,
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: (e: any) => e.target.playVideo(),
        },
      });

      interval = window.setInterval(() => {
        try {
          const p = playerRef.current;
          if (!p?.getDuration || !p?.getCurrentTime) return;
          const dur = p.getDuration();
          const cur = p.getCurrentTime();
          if (!dur || dur <= 0) return;
          const pct = Math.min(100, Math.floor((cur / dur) * 100));
          setPercent(pct);
          for (const m of MILESTONES) {
            if (pct >= m && !sentRef.current.has(m)) {
              sentRef.current.add(m);
              const email = (() => {
                try {
                  return (
                    new URLSearchParams(window.location.search).get("email") ||
                    localStorage.getItem("rendaextra-desconto:email") ||
                    ""
                  );
                } catch {
                  return "";
                }
              })();
              if (email) {
                supabase.functions
                  .invoke("rendaextra-desconto-access", {
                    body: { action: "track_promo_progress", email, percent: m },
                  })
                  .catch(() => {});
              }
            }
          }
        } catch {
          /* noop */
        }
      }, 1500);
    })();

    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* noop */
      }
    };
  }, [started]);

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

        <div className="relative rounded-2xl overflow-hidden border border-yellow-500/20 shadow-[0_0_40px_rgba(234,179,8,0.15)] bg-black aspect-video">
          {!started ? (
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="absolute inset-0 w-full h-full group"
              aria-label="Reproduzir video"
            >
              <img
                src={`https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`}
                alt="Veja como a ferramenta MRO trabalha"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-yellow-400 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                  <Play className="w-9 h-9 sm:w-11 sm:h-11 text-black ml-1" fill="currentColor" />
                </div>
              </div>
            </button>
          ) : (
            <div ref={containerRef} className="absolute inset-0 w-full h-full" />
          )}
        </div>

        {started && (
          <div className="mt-4 max-w-md mx-auto">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Progresso assistido</span>
              <span className="text-yellow-400 font-bold">{percent}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default PromoToolVideoSection;
