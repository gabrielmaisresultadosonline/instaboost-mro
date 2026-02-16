import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Radio, ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Hls from "hls.js";

const Live = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fakeViewers, setFakeViewers] = useState(0);
  const [watchPercentage, setWatchPercentage] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const [hlsReady, setHlsReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const visitorIdRef = useRef(
    localStorage.getItem("live_visitor_id") || `v_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );

  useEffect(() => {
    localStorage.setItem("live_visitor_id", visitorIdRef.current);
  }, []);

  useEffect(() => {
    fetchLive();
  }, []);

  const fetchLive = async () => {
    try {
      const { data } = await supabase.functions.invoke("live-admin", {
        body: { action: "getActiveLive" },
      });
      setSession(data?.session || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Setup HLS or direct video
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !session || session.status !== "active") return;

    const videoUrl = session.video_url;
    if (!videoUrl) return;

    // Determine the base URL for the VPS
    const baseUrl = window.location.origin;

    // Check if we have an HLS URL (either stored or derived)
    const hlsUrl = session.hls_url || null;
    const isRelativeUrl = videoUrl.startsWith("/videos/");
    const fullVideoUrl = isRelativeUrl ? `${baseUrl}${videoUrl}` : videoUrl;
    const fullHlsUrl = hlsUrl ? (hlsUrl.startsWith("/") ? `${baseUrl}${hlsUrl}` : hlsUrl) : null;

    // Try HLS first for adaptive streaming
    if (fullHlsUrl && Hls.isSupported()) {
      const tryHls = async () => {
        try {
          // Check if HLS manifest exists
          const response = await fetch(fullHlsUrl, { method: "HEAD" });
          if (response.ok) {
            const hls = new Hls({
              startLevel: 0, // Start at lowest quality (480p)
              capLevelToPlayerSize: true,
              maxBufferLength: 30,
              maxMaxBufferLength: 60,
            });
            hls.loadSource(fullHlsUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setHlsReady(true);
              video.play().catch(() => {});
            });
            hls.on(Hls.Events.ERROR, (_, data) => {
              if (data.fatal) {
                console.warn("HLS fatal error, falling back to direct video");
                hls.destroy();
                loadDirectVideo(video, fullVideoUrl);
              }
            });
            hlsRef.current = hls;
            return;
          }
        } catch {
          // HLS not available yet, use direct
        }
        loadDirectVideo(video, fullVideoUrl);
      };
      tryHls();
    } else if (video.canPlayType("application/vnd.apple.mpegurl") && fullHlsUrl) {
      // Native HLS (Safari)
      video.src = fullHlsUrl;
      video.play().catch(() => {});
    } else {
      loadDirectVideo(video, fullVideoUrl);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [session]);

  const loadDirectVideo = (video: HTMLVideoElement, url: string) => {
    video.src = url;
    video.preload = "auto";
    video.play().catch(() => {});
  };

  // Fake viewers ticker
  useEffect(() => {
    if (!session || session.status !== "active") return;
    const min = session.fake_viewers_min || 14;
    const max = session.fake_viewers_max || 200;
    setFakeViewers(min + Math.floor(Math.random() * 10));

    const interval = setInterval(() => {
      setFakeViewers((prev) => {
        const delta = Math.floor(Math.random() * 7) - 2;
        const next = prev + delta;
        return Math.max(min, Math.min(max, next));
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [session]);

  // Track analytics
  const sendAnalytics = useCallback(
    async (percentage: number) => {
      if (!session) return;
      try {
        await supabase.functions.invoke("live-admin", {
          body: {
            action: "trackAnalytics",
            session_id: session.id,
            visitor_id: visitorIdRef.current,
            watch_percentage: Math.round(percentage),
            device_type: /Mobi/.test(navigator.userAgent) ? "mobile" : "desktop",
            user_agent: navigator.userAgent.slice(0, 200),
          },
        });
      } catch (e) {
        console.error(e);
      }
    },
    [session]
  );

  // Video progress tracking
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !session) return;

    const handleTimeUpdate = () => {
      if (video.duration) {
        const pct = (video.currentTime / video.duration) * 100;
        setWatchPercentage(pct);
      }
    };

    const handleEnded = () => {
      setVideoEnded(true);
      setWatchPercentage(100);
      sendAnalytics(100);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    const analyticsInterval = setInterval(() => {
      if (video.duration) {
        const pct = (video.currentTime / video.duration) * 100;
        sendAnalytics(pct);
      }
    }, 10000);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
      clearInterval(analyticsInterval);
    };
  }, [session, sendAnalytics]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500" />
      </div>
    );
  }

  // No active live or paused
  if (!session || session.status === "paused") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/10 border border-red-500/30 rounded-full p-6 mb-6">
          <Radio className="w-16 h-16 text-red-400" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          🔴 LIVE ENCERRADA
        </h1>
        <p className="text-gray-400 text-lg mb-8 max-w-md">
          Aguarde no grupo do WhatsApp para ser notificado sobre a próxima live!
        </p>
        {session?.whatsapp_group_link && (
          <a href={session.whatsapp_group_link} target="_blank" rel="noopener noreferrer">
            <Button className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-6 rounded-xl gap-3">
              <MessageCircle className="w-6 h-6" />
              Entrar no Grupo do WhatsApp
            </Button>
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      {/* Header */}
      <div className="bg-red-600/90 backdrop-blur-sm py-3 px-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <div className="absolute inset-0 w-3 h-3 bg-white rounded-full animate-ping" />
          </div>
          <span className="text-white font-bold text-sm md:text-base">AO VIVO</span>
        </div>
        <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full">
          <Users className="w-4 h-4 text-white" />
          <span className="text-white font-semibold text-sm">{fakeViewers} assistindo</span>
        </div>
      </div>

      {/* Title */}
      <div className="text-center py-6 px-4">
        <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
          {session.title || "Fazendo 5k com a MRO"}
        </h1>
        <p className="text-gray-400 text-sm md:text-base">
          {session.description || "Veja abaixo, estamos ao vivo 🔴"}
        </p>
      </div>

      {/* Video Player */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl shadow-red-500/10 border border-white/10">
          {session.video_url ? (
            <video
              ref={videoRef}
              controls
              autoPlay
              playsInline
              className="w-full aspect-video bg-black"
              style={{ objectFit: "contain" }}
            />
          ) : (
            <div className="aspect-video flex items-center justify-center">
              <p className="text-gray-500">Aguardando vídeo...</p>
            </div>
          )}

          {/* Live badge overlay */}
          <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded flex items-center gap-1.5">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </div>

          {/* Quality indicator */}
          {hlsReady && (
            <div className="absolute top-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded">
              HD Adaptativo
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mt-2 bg-gray-800 rounded-full h-1">
          <div
            className="bg-red-500 h-1 rounded-full transition-all duration-300"
            style={{ width: `${watchPercentage}%` }}
          />
        </div>
      </div>

      {/* CTA after video ends */}
      {videoEnded && (
        <div className="max-w-4xl mx-auto px-4 pb-12 animate-fade-in">
          {session.cta_button_link && (
            <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-8 mb-8 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                {session.cta_button_text || "Acesse o GRUPO para liberar o desconto"}
              </h2>
              <p className="text-green-300 mb-6">e você faturar 5k! 🚀</p>
              <a href={session.cta_button_link} target="_blank" rel="noopener noreferrer">
                <Button className="bg-green-600 hover:bg-green-700 text-white text-lg px-10 py-6 rounded-xl gap-3 animate-pulse">
                  <ExternalLink className="w-5 h-5" />
                  {session.cta_button_text || "Acessar Grupo"}
                </Button>
              </a>
            </div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-4">
              {session.cta_title || "Fature mais de 5k prestando serviço para as empresas"}
            </h3>
            <p className="text-gray-300 leading-relaxed mb-6">
              {session.cta_description ||
                "Rode a ferramenta na sua maquina/notebook/pc e cobre mensalmente das empresas por isso. Receba todo o passo a passo de como fechar contratos, de como apresentar esse serviço e como faturar de verdade."}
            </p>
            {session.whatsapp_group_link && (
              <a href={session.whatsapp_group_link} target="_blank" rel="noopener noreferrer">
                <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Entrar no Grupo
                </Button>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Live;
