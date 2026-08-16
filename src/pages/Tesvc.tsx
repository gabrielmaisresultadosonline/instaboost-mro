import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, Volume2, VolumeX, Lock, Maximize, CheckCircle2, Shield, Crown, Sparkles, Zap, Infinity as InfinityIcon, Bot, ShieldCheck, Target, MessageCircle, Gift, User, ArrowRight, Lightbulb, UserPlus, Users, Filter, Send, Rocket, Heart, Flame, RefreshCw, MousePointerClick, Brain, FileText, CreditCard, X, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import logoMro from "@/assets/logo-mro.png";

type PlanKey = "trial";
const PLANS: Record<PlanKey, { name: string; price: number; installment: string; accounts: number; durationLabel: string; badge?: string; icon: React.ComponentType<{ className?: string }> }> = {
  trial: { name: "Teste 30 Dias", price: 67, installment: "6", accounts: 1, durationLabel: "Acesso por 30 dias", badge: "OFERTA DE TESTE", icon: Zap },
};
const formatBRL = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const VIDEO_SERVER = "https://video.maisresultadosonline.com.br";

function getVisitorId(): string {
  try {
    let id = localStorage.getItem("tesvc:visitor_id");
    if (!id) {
      id = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now()).toString();
      localStorage.setItem("tesvc:visitor_id", id);
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
        source: "tesvc",
        ...(extra || {}),
      },
    }).catch(() => {});
  } catch {}
}

export default function Tesvc() {
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
    document.title = "Tesvc — Desconto exclusivo";
    track("page_view");
    supabase.functions
      .invoke("ferramentamropromo-video", { body: { action: "get_video" } })
      .then(({ data }) => {
        if (data) setCfg(data);
      })
      .catch(() => {});

    if (localStorage.getItem("tesvc:unlocked") === "1") {
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
        localStorage.setItem("tesvc:unlocked", "1");
      }
    };
    const onEnded = () => {
      if (!milestonesRef.current.has(100)) {
        milestonesRef.current.add(100);
        track("video_progress", { progress_pct: 100 });
      }
      setWatched(true);
      localStorage.setItem("tesvc:unlocked", "1");
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
      if (typeof window !== "undefined" && typeof (window as any).fbq === "function") {
        (window as any).fbq("track", "Lead", { source: "tesvc" });
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
                className="absolute inset-0 w-full h-full flex items-center justify-center group z-10"
              >
                <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-amber-500 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.5)] group-hover:scale-110 transition-transform duration-300">
                  <Play className="w-8 h-8 md:w-12 md:h-12 text-black fill-current ml-1" />
                </div>
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-amber-400 font-bold uppercase tracking-[0.3em] text-[10px] md:text-xs">
                  Clique para iniciar
                </div>
              </button>
            )}

            {started && (
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between opacity-0 hover:opacity-100 transition-opacity z-20">
                <div className="flex items-center gap-4">
                  <button onClick={togglePlay} className="p-2 hover:bg-white/10 rounded-full transition">
                    {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                  </button>
                  <button onClick={toggleMute} className="p-2 hover:bg-white/10 rounded-full transition">
                    {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>
                <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-full transition">
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-16">
          <div className="flex justify-center mb-12">
            <button 
              onClick={() => {
                const el = document.getElementById("planos-container");
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="px-10 py-5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black text-xl uppercase tracking-wider shadow-[0_0_40px_rgba(245,158,11,0.3)] transition-all transform hover:scale-105 active:scale-95"
            >
              TESTE AGORA MESMO
            </button>
          </div>
          <h2 className="text-3xl font-black text-center mb-12">O QUE VOCÊ VAI RECEBER</h2>
          
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 mb-8">
            <h3 className="text-xl font-bold text-green-400 mb-6 flex items-center gap-2">
              <Sparkles className="w-6 h-6" /> Inteligência artificial automática
            </h3>
            <ul className="space-y-4 text-slate-300">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-green-500" /> Cria legendas prontas e otimizadas</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-green-500" /> Gera biografias profissionais</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-green-500" /> Melhores horários para postar</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-green-500" /> Recomenda hashtags quentes</li>
            </ul>
            <p className="mt-6 text-center font-bold">Tudo isso personalizado para você, em segundos!</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 mb-8">
            <h3 className="text-xl font-bold text-green-400 mb-6 flex items-center gap-2">
              <Zap className="w-6 h-6" /> FERRAMENTA MRO
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-slate-300">
              <p>• Curte fotos</p>
              <p>• Segue perfis estratégicos</p>
              <p>• Segue e deixa de seguir</p>
              <p>• Reage aos Stories com "amei"</p>
              <p>• Remove seguidores fakes</p>
              <p>• Interação com 200 pessoas/dia</p>
              <p>• Posta Stories automaticamente</p>
            </div>
            <p className="mt-6 text-center font-bold text-green-400">Resultados comprovados em até 7 horas de uso!</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 mb-8">
            <h3 className="text-xl font-bold text-green-400 mb-6 flex items-center gap-2">
              <Crown className="w-6 h-6" /> ÁREA DE MEMBROS VITALÍCIA
            </h3>
            <ul className="space-y-4 text-slate-300">
              <li>• Vídeos estratégicos passo a passo</li>
              <li>• Como deixar seu perfil profissional</li>
              <li>• Como agendar postagens no automático</li>
              <li>• Estratégias para bombar do zero</li>
            </ul>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 mb-12">
            <h3 className="text-xl font-bold text-green-400 mb-6 flex items-center gap-2">
              <MessageCircle className="w-6 h-6" /> GRUPO VIP DE SUPORTE
            </h3>
            <ul className="space-y-4 text-slate-300">
              <li>• Acesse o grupo VIP</li>
              <li>• Tire dúvidas</li>
              <li>• Compartilhe resultados</li>
              <li>• Atualizações em primeira mão</li>
            </ul>
          </div>

          <div className="flex justify-center mb-16">
            <button 
              onClick={() => {
                const el = document.getElementById("planos-container");
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="px-10 py-5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black text-xl uppercase tracking-wider shadow-[0_0_40px_rgba(245,158,11,0.3)] transition-all transform hover:scale-105 active:scale-95"
            >
              TESTE AGORA MESMO
            </button>
          </div>
        </div>

        {true ? (
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

            <div className="grid grid-cols-1 max-w-md mx-auto gap-8">
              {(Object.keys(PLANS) as PlanKey[]).map((key) => {
                const p = PLANS[key];
                const Icon = p.icon;
                const themes: Record<PlanKey, string> = {
                  trial: "border-amber-500/70 ring-amber-500/30 from-amber-500/10 lg:scale-[1.03]",
                };
                const btns: Record<PlanKey, string> = {
                  trial: "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black",
                };
                return (
                  <div
                    key={key}
                    id="planos-container"
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
                      to="/pagamentotesvc"
                      onClick={handleCtaClick}
                      className={`mt-5 block w-full text-center py-3 rounded-xl font-black text-sm transition ${btns[key]}`}
                    >
                      TESTE AGORA MESMO
                    </Link>
                    <div className="mt-2 text-center text-red-500 font-bold text-[11px] uppercase animate-pulse">
                      encerra amanha!
                    </div>
                    <div className="mt-4 flex flex-col items-center gap-1 text-[10px] opacity-60">
                      <span>Compra Segura</span>
                      <span>PIX ou Cartão</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-16 text-center">
              <p className="text-xl font-black text-amber-400 animate-pulse">Não perca essa oportunidade única!</p>
              <button 
                onClick={() => {
                  const el = document.getElementById("planos-container");
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="mt-6 inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/20 hover:border-white/40 transition-colors font-bold uppercase tracking-wider"
              >
                TESTE AGORA MESMO
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
