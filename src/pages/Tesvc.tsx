import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, Volume2, VolumeX, Lock, Maximize, CheckCircle2, Shield, Crown, Sparkles, Zap, Infinity as InfinityIcon, Bot, ShieldCheck, Target, MessageCircle, Gift, User, ArrowRight, Lightbulb, UserPlus, Users, Filter, Send, Rocket, Heart, Flame, RefreshCw, MousePointerClick, Brain, FileText, CreditCard, X, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import logoMro from "@/assets/logo-mro.png";

type PlanKey = "pro" | "lifetime";
const PLANS: Record<PlanKey, { name: string; price: number; installment: string; accounts: number; durationLabel: string; badge?: string; icon: React.ComponentType<{ className?: string }> }> = {
  pro: { name: "Anual Pro", price: 397, installment: "40", accounts: 4, durationLabel: "Acesso por 1 ano", badge: "MAIS POPULAR", icon: Sparkles },
  lifetime: { name: "Agência Vitalício", price: 1197, installment: "122,83", accounts: 12, durationLabel: "Acesso vitalício — sem renovação", badge: "⭐ PREMIUM VITALÍCIO", icon: InfinityIcon },
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
  // Replicando a lógica de watched, mas mantendo a independência
  const [watched, setWatched] = useState(true);
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

    // Restore unlock (persistent across visits)
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
      // Meta Pixel Lead
      // @ts-ignore
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
          <img src={logoMro} alt="MRO" className="h-16 sm:h-20 md:h-28 mx-auto mb-6 sm:mb-8 object-contain" />
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">
            NÃO GASTE MAIS COM ANÚNCIOS
          </h1>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4 text-green-400">
            UTILIZE A MRO INTELIGENTE!
          </h2>
          <p className="text-gray-400 mb-8">
            Instale em seu notebook, macbook ou computador de mesa!
          </p>

          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/50 rounded-full px-6 py-2 mb-8">
            <span className="text-white font-bold text-sm">NOVA VERSÃO V8.6 — A MAIS COMPLETA</span>
          </div>

          <button 
            onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: 'smooth' })}
            className="block w-full max-w-sm mx-auto bg-green-600 hover:bg-green-500 text-white font-black text-xl py-5 rounded-full shadow-lg shadow-green-500/20 mb-12"
          >
            GARANTIR MEU ACESSO AGORA
          </button>
        </div>

        <div className="mt-16">
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

          <div id="planos" className="mt-16 text-center">
            <h2 className="text-3xl font-black mb-4">GARANTIA TOTAL</h2>
            <p className="text-xl font-bold mb-8">30 Dias de Resultados Garantidos</p>
            <p className="mb-8">Se em 30 dias não tiver resultados, devolvemos seu dinheiro.</p>
            <div className="flex justify-center gap-8 mb-12 text-sm">
              <div className="flex flex-col items-center gap-2"><span>🔒</span> Compra Segura</div>
              <div className="flex flex-col items-center gap-2"><span>💰</span> Reembolso</div>
              <div className="flex flex-col items-center gap-2"><span>✅</span> Garantido</div>
            </div>
          </div>
        </div>

        {/* Plans reveal - unlocked by default for this page */}
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

            <div className="grid sm:grid-cols-2 max-w-4xl mx-auto gap-8">
              {(Object.keys(PLANS) as PlanKey[]).map((key) => {
                const p = PLANS[key];
                const Icon = p.icon;
                const themes: Record<PlanKey, string> = {
                  pro: "border-amber-500/70 ring-amber-500/30 from-amber-500/10 lg:scale-[1.03]",
                  lifetime: "border-violet-500/60 ring-violet-500/20 from-violet-500/10",
                };
                const btns: Record<PlanKey, string> = {
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
                      to="/pagamentotesvc"
                      onClick={handleCtaClick}
                      className={`mt-5 block w-full text-center py-3 rounded-xl font-black text-sm transition ${btns[key]}`}
                    >
                      {key === 'pro' ? 'QUERO O PLANO ANUAL' : 'QUERO O VITALÍCIO'}
                    </Link>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 max-w-2xl mx-auto flex items-center justify-center gap-3 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 p-4">
              <Shield className="w-6 h-6 text-emerald-400 shrink-0" />
              <p className="font-black text-emerald-300 text-base">Garantia de 30 dias</p>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/50">
              <ShieldCheck className="w-4 h-4" /> Checkout 100% seguro
            </div>
          </div>
        ) : null}
      </div>

      {true && (
        <a
          href={`https://wa.me/555192835863?text=${encodeURIComponent("Olá vim pela Tesvc, gostaria de tirar algumas dúvidas.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-5 right-5 z-[60] flex items-center gap-3 pl-4 pr-5 py-3 rounded-full bg-[#25D366] hover:bg-[#20b957] text-white shadow-[0_10px_40px_rgba(37,211,102,0.5)] transition-all hover:scale-105 animate-fade-in"
          aria-label="Tire suas dúvidas no WhatsApp"
        >
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />
          <svg viewBox="0 0 32 32" className="relative w-6 h-6 fill-white shrink-0" aria-hidden="true">
            <path d="M16 .396C7.164.396 0 7.56 0 16.396c0 2.876.756 5.688 2.192 8.164L.06 32l7.664-2.008a15.94 15.94 0 0 0 8.276 2.312c8.836 0 16-7.164 16-16S24.836.396 16 .396Zm7.56 20.928c-.412-.208-2.44-1.204-2.816-1.34-.376-.14-.652-.208-.928.208-.276.412-1.064 1.34-1.304 1.616-.24.276-.48.312-.892.104-.412-.208-1.74-.64-3.312-2.04-1.224-1.092-2.052-2.436-2.292-2.848-.24-.412-.024-.632.18-.836.184-.184.412-.48.616-.72.208-.24.276-.412.412-.688.14-.276.068-.516-.036-.72-.104-.208-.928-2.24-1.276-3.064-.336-.808-.68-.696-.928-.708l-.792-.012c-.276 0-.72.104-1.096.516-.376.412-1.44 1.408-1.44 3.436 0 2.028 1.476 3.988 1.68 4.264.208.276 2.904 4.428 7.036 6.204.984.424 1.752.68 2.352.868.988.316 1.888.272 2.6.164.792-.116 2.44-.996 2.784-1.96.344-.964.344-1.788.24-1.96Z"/>
          </svg>
          <span className="relative text-sm font-bold whitespace-nowrap hidden sm:inline">Tire suas dúvidas</span>
        </a>
      )}
    </div>
  );
}
