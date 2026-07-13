import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sparkles, TrendingUp, Users, CheckCircle2, Zap, Calendar, Clock, ArrowRight,
  ShieldCheck, Rocket, Brain, LineChart, Cpu, Target, RotateCcw,
} from "lucide-react";
import gabrielPhoneAsset from "@/assets/gabriel-phone.png.asset.json";
import heroVideoAsset from "@/assets/rendasaovivo-hero.mp4.asset.json";
import { assetUrl } from "@/lib/assetUrl";
import { X, Volume2, VolumeX } from "lucide-react";

const SalaoBel = () => {
  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preco, setPreco] = useState<number>(10);
  const [aulaData, setAulaData] = useState<string>("16/07");
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "" });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);
  const [audioGate, setAudioGate] = useState(true);
  const [videoEnded, setVideoEnded] = useState(false);
  const [heroVideoUrl, setHeroVideoUrl] = useState<string>(assetUrl(heroVideoAsset.url));
  const [heroVideoHls, setHeroVideoHls] = useState<string>("");

  useEffect(() => {
    document.title = "Salão Bel | Como a MRO ajuda salões de beleza a lotar a agenda";
    (async () => {
      const sid = crypto.randomUUID();
      try {
        await supabase.functions.invoke("salaobel-admin", {
          body: { action: "track_visit", session_id: sid, user_agent: navigator.userAgent, referrer: document.referrer },
        });
      } catch { /* ignore */ }
      try {
        const { data } = await supabase.functions.invoke("salaobel-admin", { body: { action: "get_public_settings" } });
        if (data?.settings) {
          setPreco(Number(data.settings.preco) || 10);
          setAulaData(data.settings.aula_data || "16/07");
          if (data.settings.hero_video_url) setHeroVideoUrl(data.settings.hero_video_url);
          if (data.settings.hero_video_hls_url) setHeroVideoHls(data.settings.hero_video_hls_url);
        }
      } catch { /* ignore */ }
      const fbq = (window as any).fbq;
      if (fbq) fbq("track", "PageView");
    })();
  }, []);

  // HLS adaptive streaming (evita travas: começa em bitrate baixo e sobe conforme a conexão)
  useEffect(() => {
    const v = heroVideoRef.current;
    if (!v || !heroVideoHls) return;
    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = heroVideoHls;
      return;
    }
    if (Hls.isSupported()) {
      const hls = new Hls({
        capLevelToPlayerSize: true,
        startLevel: 0,
        maxBufferLength: 30,
      });
      hls.loadSource(heroVideoHls);
      hls.attachMedia(v);
      return () => hls.destroy();
    }
  }, [heroVideoHls]);

  // Neural network AI canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);

    const dpr = window.devicePixelRatio;
    const NODES = 55;
    const nodes = Array.from({ length: NODES }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3 * dpr,
      vy: (Math.random() - 0.5) * 0.3 * dpr,
      r: (Math.random() * 1.5 + 0.5) * dpr,
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      }
      // connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          const max = 140 * dpr;
          if (dist < max) {
            const alpha = (1 - dist / max) * 0.35;
            ctx.strokeStyle = `rgba(250, 204, 21, ${alpha})`;
            ctx.lineWidth = 0.6 * dpr;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      // nodes
      for (const n of nodes) {
        ctx.fillStyle = "rgba(250, 204, 21, 0.9)";
        ctx.shadowColor = "rgba(250, 204, 21, 0.8)";
        ctx.shadowBlur = 8 * dpr;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(render);
    };
    render();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  const scrollToPreco = () => {
    const fbq = (window as any).fbq;
    if (fbq) fbq("track", "ViewContent", { content_name: "Salão Bel" });
    document.getElementById("preco")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openCheckout = () => {
    setOpenForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Capture Facebook cookies for CAPI attribution
      const getCookie = (name: string) => {
        const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return m ? decodeURIComponent(m[1]) : '';
      };
      let fbc = getCookie('_fbc');
      const fbp = getCookie('_fbp');
      if (!fbc) {
        const fbclid = new URLSearchParams(window.location.search).get('fbclid');
        if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
      }
      const { data, error } = await supabase.functions.invoke("salaobel-checkout", {
        body: { name: form.name, email: form.email, whatsapp: form.whatsapp, fbc, fbp },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao gerar pagamento");
      const fbq = (window as any).fbq;
      if (fbq) fbq("track", "InitiateCheckout",
        { value: preco, currency: "BRL", content_name: "Salão Bel" },
        { eventID: data.nsu_order }
      );
      window.location.href = data.payment_link;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden font-sans selection:bg-yellow-400 selection:text-black">
      {/* Audio Gate — disabled on /salaobel; kept for future re-enable */}
      {false && audioGate && (
        <button
          type="button"
          onClick={() => {
            const v = heroVideoRef.current;
            if (v) {
              try {
                v.muted = false;
                v.volume = 1;
                // Do NOT reset currentTime here — reseeking to 0 discards
                // the already-buffered range and causes audio stutter on
                // slow connections. Just unmute the ongoing playback.
                const p = v.play();
                if (p && typeof p.catch === "function") p.catch(() => {});
              } catch { /* ignore */ }
            }
            setVideoMuted(false);
            setAudioGate(false);
          }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-black/95 backdrop-blur-md cursor-pointer group"
          aria-label="Toque para ouvir"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.15),transparent_70%)]" />
          <div className="relative flex flex-col items-center gap-6 px-6 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-yellow-400 flex items-center justify-center shadow-[0_0_80px_rgba(250,204,21,0.6)] group-hover:scale-105 transition-transform">
              <span className="text-6xl md:text-7xl">🔊</span>
              <span className="absolute w-28 h-28 md:w-36 md:h-36 rounded-full border-2 border-yellow-400/60 animate-ping" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white">
              Toque para <span className="text-yellow-400">ouvir</span>
            </h2>
            <p className="text-neutral-400 text-sm md:text-base max-w-md">
              Clique em qualquer lugar para entrar e ativar o áudio da aula
            </p>
            <div className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-yellow-400 text-black font-black text-sm uppercase tracking-widest shadow-[0_0_40px_rgba(250,204,21,0.5)]">
              Entrar agora
            </div>
          </div>
        </button>
      )}

      {/* AI grid + neural background */}
      <div className="fixed inset-0 pointer-events-none">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-40" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
        <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] rounded-full bg-yellow-500/10 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-yellow-400/5 blur-[140px]" />
      </div>

      {/* NAV */}



      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-6 md:pt-12">
        {/* HERO */}
        <div className="max-w-3xl mx-auto text-center">
          <div className="space-y-7 flex flex-col items-center">

            <div className="inline-flex items-center gap-2 border border-yellow-400/30 bg-yellow-400/5 px-3 py-1.5 rounded-full">
              <Brain className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-yellow-400">MRO PARA SALÕES DE BELEZA · 2026</span>
            </div>

            {/* HERO IMAGE with PIX notifications */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-[1.02] tracking-tight uppercase">
              <span className="text-yellow-400">Salão de beleza</span> aumente seus clientes{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent">sem precisar investir em anúncios!</span>
                <span className="absolute inset-x-0 bottom-1 h-3 bg-yellow-400/20 blur-md -z-0" />
              </span>{" "}
              <span className="text-neutral-400 font-light italic normal-case">Aprenda como a MRO pode te ajudar!</span>
            </h1>

            {/* HERO IMAGE with PIX notifications emerging from behind */}
            <div className="relative w-full flex justify-center items-end min-h-[240px] md:min-h-[300px] -mt-2">
              {/* glow behind */}
              <div className="absolute inset-x-0 bottom-0 h-[70%] bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.22),transparent_60%)] blur-2xl" />

              {/* Client scheduled notifications loop — spawn behind image, drift sideways */}
              {[
                { delay: "0s",   side: "left",  top: "10%" },
                { delay: "1.5s", side: "right", top: "20%" },
                { delay: "3s",   side: "left",  top: "55%" },
                { delay: "4.5s", side: "right", top: "60%" },
                { delay: "6s",   side: "right", top: "35%" },
                { delay: "7.5s", side: "left",  top: "35%" },
              ].map((n, i) => (
                <div
                  key={i}
                  className={`absolute pix-notif pix-${n.side} z-0`}
                  style={{ top: n.top, animationDelay: n.delay }}
                >
                  <div className="flex items-center gap-2.5 bg-neutral-900/90 backdrop-blur border border-yellow-400/40 rounded-xl px-3.5 py-2.5 shadow-[0_0_20px_rgba(250,204,21,0.35)]">
                    <div className="w-7 h-7 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center text-black">
                      <Calendar className="w-4 h-4" strokeWidth={3} />
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold leading-none">Novo</div>
                      <div className="text-sm md:text-base font-black text-yellow-400 leading-tight whitespace-nowrap">Cliente agendado</div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="relative z-10 flex items-end justify-center gap-3 md:gap-5">
                <img
                  src={assetUrl(gabrielPhoneAsset.url)}
                  alt="Gabriel ao telefone"
                  className="h-[220px] md:h-[300px] w-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
                />
                {/* Hero video — hidden on /salaobel; kept for future re-enable */}
                {false && (
                <div
                  className="group relative rounded-2xl overflow-hidden border-2 border-yellow-400/60 shadow-[0_0_30px_rgba(250,204,21,0.4)] transition-all w-[130px] md:w-[190px] aspect-[9/16] bg-black cursor-pointer"
                  onClick={() => {
                    const v = heroVideoRef.current;
                    if (!v) return;
                    if (v.ended) {
                      v.currentTime = 0;
                      v.play().catch(() => {});
                      setVideoEnded(false);
                      return;
                    }
                    if (v.paused) v.play().catch(() => {});
                    else v.pause();
                  }}
                >
                  <video
                    ref={heroVideoRef}
                    src={heroVideoHls ? undefined : heroVideoUrl}
                    autoPlay
                    muted
                    playsInline
                    preload="auto"
                    className="w-full h-full object-cover"
                    onEnded={() => setVideoEnded(true)}
                    onPlay={() => setVideoEnded(false)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  {videoEnded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-yellow-400 flex items-center justify-center shadow-[0_0_30px_rgba(250,204,21,0.8)]">
                        <RotateCcw className="w-7 h-7 md:w-8 md:h-8 text-black" />
                      </div>
                    </div>
                  )}
                </div>
                )}
              </div>
            </div>



            <p className="text-base md:text-lg text-neutral-400 max-w-xl leading-relaxed">
              Já ajudamos <span className="text-yellow-400 font-bold">mais de 123 salões de beleza</span> a lotar a agenda e crescer o faturamento. Aprenda e entenda tudo por apenas <span className="text-yellow-400 font-bold">R$ {preco.toFixed(0)}</span>.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={scrollToPreco} size="lg" className="group bg-yellow-400 hover:bg-yellow-300 text-black font-black h-14 px-8 rounded-xl text-base tracking-wide shadow-[0_0_40px_rgba(250,204,21,0.35)] hover:shadow-[0_0_60px_rgba(250,204,21,0.6)] transition-all">
                QUERO LOTAR MEU SALÃO
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition" />
              </Button>
              <Button onClick={scrollToPreco} size="lg" variant="outline" className="h-14 px-8 rounded-xl border-neutral-700 bg-neutral-900/40 hover:bg-neutral-800 text-white font-bold text-base backdrop-blur">
                <Zap className="mr-2 w-4 h-4 text-yellow-400" />
                Aproveitar por R$ {preco.toFixed(0)}
              </Button>
            </div>

            {/* trust bar */}
            <div className="flex flex-wrap items-center gap-6 pt-4 text-neutral-500 text-xs uppercase tracking-widest font-semibold">
              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-yellow-400" /> Pagamento InfiniPay</div>
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-yellow-400" /> +123 salões atendidos</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-yellow-400" /> Método validado</div>
            </div>
          </div>

        </div>

        {/* DIVIDER */}
        <div className="my-20 md:my-32 flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-800 to-transparent" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-600">Salões que já cresceram com a MRO</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-800 to-transparent" />
        </div>

        {/* DESTAQUE */}
        <div className="relative rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-neutral-950 to-black p-8 md:p-14 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.08),transparent_70%)]" />
          <div className="relative grid md:grid-cols-[auto_1fr] gap-8 items-center">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border border-yellow-400/30 bg-yellow-400/5 flex items-center justify-center backdrop-blur">
              <TrendingUp className="w-12 h-12 md:w-16 md:h-16 text-yellow-400" />
            </div>
            <div>
              <div className="inline-block text-[10px] font-black tracking-[0.3em] text-yellow-400 uppercase mb-3">Prova real</div>
              <h2 className="text-2xl md:text-4xl font-black leading-tight text-white">
                Mais de <span className="text-yellow-400 border-b-2 border-yellow-400/40">123 salões de beleza</span> aplicando o método da MRO já lotaram a <span className="text-yellow-400">agenda</span> e aumentaram o faturamento.
              </h2>
              <p className="mt-4 text-neutral-400 text-base md:text-lg">
                Sem fórmulas mágicas, sem promessas vazias. Um passo a passo prático que qualquer dono(a) de salão consegue aplicar no dia seguinte.
              </p>
            </div>
          </div>
        </div>

        {/* BENEFÍCIOS */}
        <div className="mt-16 grid md:grid-cols-3 gap-4">
          {[
            { icon: Brain, title: "Método da MRO", text: "Testado em salões reais" },
            { icon: Target, title: "Mais clientes", text: "Agenda cheia todo mês" },
            { icon: Cpu, title: "Fácil de aplicar", text: "Sem enrolação, direto ao ponto" },
          ].map((b, i) => (
            <div key={i} className="group relative bg-neutral-950/60 border border-neutral-800 hover:border-yellow-400/40 p-6 rounded-2xl backdrop-blur transition-all overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 blur-3xl rounded-full group-hover:bg-yellow-400/10 transition" />
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mb-4">
                  <b.icon className="w-5 h-5 text-yellow-400" />
                </div>
                <h3 className="font-black text-lg text-white">{b.title}</h3>
                <p className="text-neutral-500 text-sm mt-1">{b.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CALLOUT GRANDE */}
        <div className="mt-20 md:mt-28 relative rounded-3xl border-2 border-yellow-400/40 bg-gradient-to-br from-yellow-400/10 via-black to-black p-8 md:p-16 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.15),transparent_60%)]" />
          <div className="relative text-center max-w-4xl mx-auto">
            <div className="inline-block text-[10px] md:text-xs font-black tracking-[0.3em] text-yellow-400 uppercase mb-5 border border-yellow-400/40 px-3 py-1.5 rounded-full">
              Atenção · Leia com calma
            </div>
            <p className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight text-white uppercase">
              Isso <span className="text-yellow-400">NÃO é para qualquer um.</span>
            </p>
            <p className="mt-6 text-xl md:text-3xl font-bold leading-snug text-neutral-200">
              Vai ter dono(a) de salão que não vai querer pagar <span className="text-yellow-400">nem R$ {preco.toFixed(0)}</span> para aprender a <span className="text-yellow-400">lotar a agenda</span> e crescer o próprio negócio.
            </p>
            <p className="mt-8 text-2xl md:text-4xl font-black text-white uppercase tracking-tight">
              Aproveite <span className="text-yellow-400">se isso é para você.</span>
            </p>
          </div>
        </div>

        {/* CTA MID */}
        <div className="mt-16 text-center">
          <Button onClick={scrollToPreco} size="lg" className="bg-neutral-900 hover:bg-neutral-800 text-yellow-400 border border-yellow-400/40 hover:border-yellow-400 font-black h-14 px-10 rounded-xl tracking-widest text-sm">
            <Rocket className="w-4 h-4 mr-2" /> QUERO PARTICIPAR AGORA
          </Button>
        </div>

        {/* PREÇO */}
        <div id="preco" className="mt-20 md:mt-28">
          <div className="max-w-2xl mx-auto relative">
            <div className="absolute -inset-px rounded-[2rem] bg-gradient-to-br from-yellow-400/40 via-transparent to-yellow-400/10 blur-sm" />
            <div className="relative bg-gradient-to-br from-neutral-950 to-black border border-yellow-400/30 rounded-[2rem] p-8 md:p-12 shadow-[0_0_80px_rgba(250,204,21,0.12)]">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 border border-red-500/40 bg-red-500/10 px-3 py-1.5 rounded-full mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">OFERTA ESPECIAL · SALÕES DE BELEZA</span>
                </div>

                <h3 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                  Participe do grupo
                </h3>
                <p className="text-neutral-500 mt-3 max-w-md mx-auto">
                  Vamos apresentar tudo no dia {aulaData} — passo a passo pra atrair mais clientes pro seu salão.
                </p>

                <div className="my-8 space-y-2.5 text-left">
                  {[
                    { icon: Calendar, text: `Apresentação · ${aulaData}` },
                    { icon: Users, text: "Como atrair mais clientes pro seu salão" },
                    { icon: Sparkles, text: "Estratégias validadas em +123 salões" },
                    { icon: ShieldCheck, text: "Acesso enviado no seu e-mail em segundos" },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 bg-neutral-900/60 border border-neutral-800 p-3.5 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center flex-shrink-0">
                        <f.icon className="w-4 h-4 text-yellow-400" />
                      </div>
                      <span className="text-sm md:text-base text-neutral-200">{f.text}</span>
                    </div>
                  ))}
                </div>

                <div className="my-8 flex flex-col items-center">
                  <div className="text-neutral-600 text-sm line-through">De R$ 97,00</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-yellow-400">R$</span>
                    <span className="text-7xl md:text-8xl font-black text-white leading-none">{preco.toFixed(0)}</span>
                  </div>
                  <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Pagamento único</div>
                </div>

                <Button onClick={openCheckout} size="lg" className="w-full bg-green-500 hover:bg-green-400 text-white font-black text-lg md:text-xl h-16 rounded-2xl shadow-[0_0_60px_rgba(34,197,94,0.5)] hover:shadow-[0_0_80px_rgba(34,197,94,0.75)] tracking-wide transition-all">
                  PAGAR E GARANTIR VAGA
                </Button>

                <p className="mt-4 text-neutral-600 text-[10px] flex items-center justify-center gap-2 uppercase tracking-widest font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Pagamento 100% seguro · InfiniPay
                </p>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-20 pt-8 border-t border-neutral-900 text-center pb-8">
          <p className="text-neutral-600 text-xs uppercase tracking-[0.3em] font-bold">© 2026 MRO · Mais Resultados Online</p>
        </footer>
      </div>

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="bg-neutral-950 border-yellow-400/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">Garanta sua vaga</DialogTitle>
            <DialogDescription className="text-neutral-500">
              Preencha seus dados para finalizar o pagamento de R$ {preco.toFixed(0)}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="name" className="text-neutral-400 text-xs uppercase tracking-widest font-bold">Nome completo</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-neutral-900 border-neutral-800 mt-1 focus:border-yellow-400" placeholder="Seu nome completo" />
            </div>
            <div>
              <Label htmlFor="email" className="text-neutral-400 text-xs uppercase tracking-widest font-bold">E-mail</Label>
              <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-neutral-900 border-neutral-800 mt-1 focus:border-yellow-400" placeholder="seu@email.com" />
            </div>
            <div>
              <Label htmlFor="whatsapp" className="text-neutral-400 text-xs uppercase tracking-widest font-bold">WhatsApp</Label>
              <Input id="whatsapp" required value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="bg-neutral-900 border-neutral-800 mt-1 focus:border-yellow-400" placeholder="(11) 99999-9999" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black h-14 text-base rounded-xl tracking-wide shadow-[0_0_30px_rgba(250,204,21,0.35)]">
              {loading ? "Gerando pagamento..." : `PAGAR R$ ${preco.toFixed(0)}`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalaoBel;
