import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Briefcase, Crown, Sparkles, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { trackPageView } from '@/lib/facebookTracking';
import { supabase } from '@/integrations/supabase/client';
import Hls from 'hls.js';

const VIDEO_SERVER = 'https://video.maisresultadosonline.com.br';

const trackEvent = (page: string) => {
  supabase.functions.invoke('estrutura4-discount', { body: { action: 'track_visit', page } }).catch(() => {});
};

const RendaExtraDescontoPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'gate' | 'choice' | 'prestar'>(() => {
    try { return localStorage.getItem('rendaextra-desconto:email') ? 'prestar' : 'gate'; } catch { return 'gate'; }
  });
  const [gateEmail, setGateEmail] = useState('');
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState('');
  const [leadEmail, setLeadEmail] = useState<string>(() => {
    try { return localStorage.getItem('rendaextra-desconto:email') || ''; } catch { return ''; }
  });
  const [leadName, setLeadName] = useState<string>(() => {
    try { return localStorage.getItem('rendaextra-desconto:name') || ''; } catch { return ''; }
  });
  const [videoCfg, setVideoCfg] = useState<{ video_url: string | null; hls_url: string | null; video_title: string | null }>({ video_url: null, hls_url: null, video_title: null });
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [unlockedPersisted, setUnlockedPersisted] = useState<boolean>(() => {
    try { return localStorage.getItem('rendaextra-desconto:video-unlocked') === '1'; } catch { return false; }
  });
  const [sendingUnlock, setSendingUnlock] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef<number | null>(null);

  const UNLOCK_PERCENT = 0.9;
  const CONTROLS_HIDE_MS = 3 * 1000;

  const revealControls = () => {
    setShowControls(true);
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = window.setTimeout(() => setShowControls(false), CONTROLS_HIDE_MS);
  };

  const handleGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateError('');
    const email = gateEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setGateError('Informe um email valido.');
      return;
    }
    setGateLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('rendaextra-desconto-access', {
        body: { action: 'verify_email', email },
      });
      if (error || !data?.success) {
        setGateError(data?.message || 'Email nao encontrado no cadastro do /rendaextra.');
        setGateLoading(false);
        return;
      }
      setLeadEmail(data.email);
      setLeadName(data.name || '');
      try {
        localStorage.setItem('rendaextra-desconto:email', data.email);
        localStorage.setItem('rendaextra-desconto:name', data.name || '');
      } catch {}
      if (data.unlocked || (data.percent_watched || 0) >= 50) {
        try { localStorage.setItem('rendaextra-desconto:video-unlocked', '1'); } catch {}
        setUnlockedPersisted(true);
      }
      setMode('prestar');
    } catch (err) {
      setGateError('Erro ao verificar. Tente novamente.');
    } finally {
      setGateLoading(false);
    }
  };

  useEffect(() => {
    trackPageView('Renda Extra Desconto');
    trackEvent('/rendaextra-desconto');
    supabase.functions.invoke('estrutura4-discount', { body: { action: 'get_video' } })
      .then(({ data }) => { if (data) setVideoCfg(data); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (mode !== 'prestar') return;
    const video = videoRef.current;
    if (!video) return;
    const { video_url, hls_url } = videoCfg;
    if (!video_url && !hls_url) return;

    const isRel = (u: string) => u.startsWith('/');
    const hlsCandidate = hls_url || (video_url?.includes('.m3u8') ? video_url : null);
    const directCandidate = video_url && !video_url.includes('.m3u8') ? video_url : null;
    const fullVideo = directCandidate ? (isRel(directCandidate) ? `${VIDEO_SERVER}${directCandidate}` : directCandidate) : null;
    const fullHls = hlsCandidate ? (isRel(hlsCandidate) ? `${VIDEO_SERVER}${hlsCandidate}` : hlsCandidate) : null;
    const loadDirect = () => { if (fullVideo) { video.src = fullVideo; } };

    if (fullHls && Hls.isSupported()) {
      (async () => {
        try {
          const res = await fetch(fullHls, { method: 'HEAD' });
          if (!res.ok) return loadDirect();
          const hls = new Hls({ startLevel: 0, capLevelToPlayerSize: true, enableWorker: true });
          hls.loadSource(fullHls);
          hls.attachMedia(video);
          hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) { hls.destroy(); loadDirect(); } });
          hlsRef.current = hls;
        } catch { loadDirect(); }
      })();
    } else if (fullHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = fullHls;
    } else {
      loadDirect();
    }
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [mode, videoCfg]);

  // Block seeking: if user tries to seek (via keyboard, media keys, etc.), snap back.
  const progressMarksRef = useRef<{ p25: boolean; p50: boolean; p75: boolean; p100: boolean; startSent: boolean }>({ p25: false, p50: false, p75: false, p100: false, startSent: false });
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let lastTime = 0;
    const onTime = () => {
      const t = video.currentTime;
      // allow forward progression up to ~1.5s per tick (normal playback)
      if (t > lastTime + 1.5) {
        video.currentTime = lastTime;
      } else {
        lastTime = t;
      }
      setCurrentTime(video.currentTime);
      // milestone tracking
      const d = video.duration || 0;
      if (d > 0) {
        const pct = (video.currentTime / d) * 100;
        const m = progressMarksRef.current;
        const reportPct = (n: number) => {
          if (leadEmail) {
            supabase.functions.invoke('rendaextra-desconto-access', {
              body: { action: 'track_progress', email: leadEmail, percent: n },
            }).catch(() => {});
          }
        };
        if (pct >= 25 && !m.p25) { m.p25 = true; trackEvent('video:rendaextra-desconto:25'); reportPct(25); }
        if (pct >= 50 && !m.p50) { m.p50 = true; trackEvent('video:rendaextra-desconto:50'); reportPct(50); }
        if (pct >= 75 && !m.p75) { m.p75 = true; trackEvent('video:rendaextra-desconto:75'); reportPct(75); }
      }
    };
    const onSeeking = () => {
      if (Math.abs(video.currentTime - lastTime) > 1.5) {
        video.currentTime = lastTime;
      }
    };
    const onLoaded = () => setDuration(video.duration || 0);
    const onPlay = () => {
      setPlaying(true);
      if (!progressMarksRef.current.startSent) {
        progressMarksRef.current.startSent = true;
        trackEvent('video:rendaextra-desconto:start');
      }
    };
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false); lastTime = 0;
      if (!progressMarksRef.current.p100) {
        progressMarksRef.current.p100 = true;
        trackEvent('video:rendaextra-desconto:100');
      }
    };
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('durationchange', onLoaded);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('durationchange', onLoaded);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, [mode, started]);


  const handleStart = () => {
    const v = videoRef.current;
    if (!v) return;
    setStarted(true);
    v.play().catch(() => {});
  };
  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  };
  const toggleMute = () => {
    const v = videoRef.current; if (!v) return;
    v.muted = !v.muted; setMuted(v.muted);
  };
  const changeVolume = (val: number) => {
    const v = videoRef.current; if (!v) return;
    v.volume = val; setVolume(val);
    if (val > 0 && v.muted) { v.muted = false; setMuted(false); }
  };
  const toggleFullscreen = async () => {
    const el = containerRef.current;
    const v = videoRef.current as any;
    try {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        await (document.exitFullscreen?.() ?? (document as any).webkitExitFullscreen?.());
        return;
      }
      if (el?.requestFullscreen) { await el.requestFullscreen(); return; }
      if ((el as any)?.webkitRequestFullscreen) { (el as any).webkitRequestFullscreen(); return; }
      // iOS Safari fallback: only video can go fullscreen
      if (v?.webkitEnterFullscreen) { v.webkitEnterFullscreen(); return; }
    } catch { /* ignore */ }
  };
  const restart = () => {
    const v = videoRef.current; if (!v) return;
    v.currentTime = 0; v.play().catch(() => {});
  };

  // Count actual watched seconds (only while playing) for unlocking the CTA
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setWatchedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing]);

  // Auto-hide controls after 3 minutes of inactivity
  useEffect(() => {
    if (!started) return;
    revealControls();
    return () => { if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current); };
  }, [started]);

  const requiredSeconds = duration > 0 ? Math.floor(duration * UNLOCK_PERCENT) : 0;
  const buttonUnlocked = unlockedPersisted || (requiredSeconds > 0 && watchedSeconds >= requiredSeconds);

  // Persist unlock state across visits
  useEffect(() => {
    if (buttonUnlocked && !unlockedPersisted) {
      try { localStorage.setItem('rendaextra-desconto:video-unlocked', '1'); } catch {}
      setUnlockedPersisted(true);
    }
  }, [buttonUnlocked, unlockedPersisted]);

  const progressPct = duration > 0 ? Math.max(0, Math.min(100, (1 - currentTime / duration) * 100)) : 100;





  if (mode === 'gate') {
    return (
      <div className="min-h-screen bg-[#0a0a14] text-white p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-md bg-[#0d0d16] border border-white/10 rounded-3xl p-7 md:p-9 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-[0.25em] mb-4">Area Exclusiva</div>
            <h1 className="text-2xl md:text-3xl font-black uppercase italic leading-tight">Acesso ao Desconto MRO</h1>
            <p className="text-white/50 text-sm mt-3 font-medium">Informe o mesmo email que voce cadastrou no renda extra !</p>
          </div>
          <form onSubmit={handleGateSubmit} className="space-y-3">
            <input
              type="email"
              autoComplete="email"
              required
              value={gateEmail}
              onChange={(e) => setGateEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 focus:border-amber-500/60 focus:outline-none text-white placeholder:text-white/30"
            />
            {gateError && <p className="text-red-400 text-xs font-medium">{gateError}</p>}
            <Button
              type="submit"
              disabled={gateLoading}
              className="w-full py-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(16,185,129,0.3)] h-auto"
            >
              {gateLoading ? 'Verificando...' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'choice') {
    return (
      <div className="min-h-screen bg-[#0a0a14] text-white p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-10 relative pt-6">


          <div className="text-center space-y-4">
            <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-black uppercase tracking-[0.2em]">
              Renda Extra MRO
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight italic uppercase">
              Como você quer faturar com a MRO?
            </h1>
            <p className="text-white/40 max-w-2xl mx-auto font-medium">
              Escolha o caminho ideal para você gerar receita usando toda a estrutura da MRO.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pt-4">
            {/* Prestar serviço com a MRO */}
            <button
              onClick={() => { trackEvent('click:rendaextra-desconto:prestar'); setMode('prestar'); }}
              className="group relative p-8 md:p-10 rounded-[2.5rem] bg-[#0d0d16] border border-emerald-500/30 transition-all duration-500 hover:-translate-y-2 hover:border-emerald-500/60 hover:shadow-[0_20px_50px_rgba(16,185,129,0.15)] flex flex-col items-center text-center gap-6 overflow-hidden shadow-2xl"
            >
              <div className="absolute top-5 right-5 bg-emerald-500 text-black text-[9px] font-black px-3 py-1 rounded-full shadow-lg animate-pulse">
                POPULAR
              </div>

              <div className="w-20 h-20 rounded-[1.75rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-all duration-500">
                <Briefcase className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">Prestar Serviço com a MRO</h3>
                <p className="text-white/40 text-sm font-medium leading-relaxed">
                  Você já tem a MRO, é só aplicar e prestar serviço para empresas.
                </p>
              </div>
              <div className="mt-2 flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-xs group-hover:bg-emerald-500 group-hover:text-black group-hover:border-emerald-500 transition-all duration-500 uppercase tracking-[0.2em]">
                ACESSAR ÁREA <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Licenciado MRO */}
            <button
              onClick={() => { trackEvent('click:rendaextra-desconto:licenciado'); navigate('/licenciado'); }}
              className="group relative p-8 md:p-10 rounded-[2.5rem] bg-[#0d0d16] border border-amber-500/20 transition-all duration-500 hover:-translate-y-2 hover:border-amber-500/50 hover:shadow-[0_20px_50px_rgba(245,158,11,0.15)] flex flex-col items-center text-center gap-6 overflow-hidden shadow-2xl"
            >
              <div className="absolute top-5 right-5 bg-amber-500 text-black text-[9px] font-black px-3 py-1 rounded-full shadow-lg animate-pulse">
                70% DE COMISSÃO
              </div>
              <div className="w-20 h-20 rounded-[1.75rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-all duration-500">
                <Crown className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">Seja um Licenciado MRO</h3>
                <p className="text-white/40 text-sm font-medium leading-relaxed">
                  Ganhe <span className="text-amber-500 font-black">70% em todas as suas vendas</span> com a estrutura completa da MRO.
                </p>
              </div>
              <div className="mt-2 flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-amber-500 text-black font-black text-xs uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <Sparkles className="w-4 h-4" /> SAIBA MAIS <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-12 text-center relative pt-6">

        <div className="space-y-6">
          <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-black uppercase tracking-[0.2em] mb-2">Treinamento Exclusivo</div>
          {leadName && (
            <p className="text-emerald-400 text-sm md:text-base font-bold uppercase tracking-[0.2em]">Seja bem-vindo(a), {leadName.split(' ')[0]}!</p>
          )}
          <h3 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase italic">{videoCfg.video_title || 'Você já conhece como isso funciona?'}</h3>
          <p className="text-white/40 text-sm md:text-lg leading-relaxed font-medium max-w-2xl mx-auto">
            Assista a apresentacao por completo para liberar seu acesso ao desconto exclusivo.
          </p>
        </div>



        <div
          ref={containerRef}
          onMouseMove={revealControls}
          onTouchStart={revealControls}
          onClick={revealControls}
          className="relative max-w-3xl mx-auto w-full aspect-video rounded-[2.5rem] overflow-hidden bg-black shadow-2xl border border-white/5 group"
        >
          {(videoCfg.video_url || videoCfg.hls_url) ? (
            <>
              <video
                ref={videoRef}
                playsInline
                onClick={() => { if (started) togglePlay(); }}
                onContextMenu={(e) => e.preventDefault()}
                className="w-full h-full cursor-pointer"
                style={{ objectFit: 'contain' }}
              />

              {/* Initial play overlay */}
              {!started && (
                <button
                  onClick={handleStart}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 hover:bg-black/50 transition-colors"
                >
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:scale-110 transition-transform">
                    <Play className="w-10 h-10 md:w-12 md:h-12 ml-1" fill="currentColor" />
                  </div>
                  <span className="text-white font-bold text-sm md:text-base uppercase tracking-[0.2em]">Clique para assistir</span>
                </button>
              )}

              {/* Pause overlay icon (subtle) */}
              {started && !playing && (
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/30"
                >
                  <div className="w-16 h-16 rounded-full bg-white/90 text-black flex items-center justify-center">
                    <Play className="w-8 h-8 ml-1" fill="currentColor" />
                  </div>
                </button>
              )}

              {/* Custom controls */}
              {started && (
                <div className={`absolute bottom-0 left-0 right-0 p-3 md:p-4 bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-2 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  {/* Fake shrinking progress bar (non-interactive) */}
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden pointer-events-none select-none">
                    <div className="h-full bg-emerald-500 rounded-full transition-[width] duration-300" style={{ width: `${progressPct}%` }} />
                  </div>
                  <div className="flex items-center gap-3 text-white">
                    <button onClick={togglePlay} className="hover:text-emerald-400 transition-colors">
                      {playing ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
                    </button>
                    <button onClick={restart} className="hover:text-emerald-400 transition-colors" title="Reiniciar">
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <button onClick={toggleMute} className="hover:text-emerald-400 transition-colors">
                      {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={muted ? 0 : volume}
                      onChange={(e) => changeVolume(parseFloat(e.target.value))}
                      className="w-20 accent-emerald-500"
                    />
                    <div className="flex-1" />
                    <button onClick={toggleFullscreen} className="hover:text-emerald-400 transition-colors" title="Tela cheia">
                      <Maximize className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
              Vídeo ainda não configurado.
            </div>
          )}
        </div>


        <div className="flex flex-col items-center gap-3 pt-4 pb-12 px-2">
          {!buttonUnlocked ? (
            <div className="w-full max-w-md flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  toast.warning('Assista o vídeo para liberar', {
                    description: 'Você precisa assistir pelo menos 50% do vídeo para acessar.',
                  });
                }}
                className="w-full flex items-center justify-center gap-3 px-4 sm:px-6 py-4 sm:py-5 rounded-2xl bg-zinc-800/70 border border-amber-500/30 text-white/70 font-black text-sm sm:text-base uppercase tracking-widest select-none hover:bg-zinc-800 transition-colors animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.15)]"
              >
                <span>Assista para liberar o botão</span>
              </button>
            </div>
          ) : (
            <Button
              disabled={sendingUnlock}
              onClick={async () => {
                trackEvent('click:rendaextra-desconto:acessar-promo');
                if (!leadEmail) { navigate('/rendaextra/desconto/promo'); return; }
                setSendingUnlock(true);
                try {
                  await supabase.functions.invoke('rendaextra-desconto-access', {
                    body: { action: 'unlock_and_send', email: leadEmail },
                  });
                } catch {}
                navigate(`/rendaextra/desconto/promo?email=${encodeURIComponent(leadEmail)}`);
              }}
              className="w-full max-w-md flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-8 py-5 sm:py-7 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm sm:text-lg md:text-xl transition-all hover:scale-[1.03] active:scale-95 uppercase tracking-wider sm:tracking-widest shadow-[0_0_30px_rgba(16,185,129,0.3)] group whitespace-normal text-center leading-tight h-auto"
            >
              <span>{sendingUnlock ? 'LIBERANDO...' : 'ACESSAR DESCONTO AGORA'}</span>
              <ArrowRight className="w-4 h-4 sm:w-6 sm:h-6 shrink-0 group-hover:translate-x-1 sm:group-hover:translate-x-2 transition-transform" />
            </Button>
          )}
        </div>

      </div>
    </div>
  );
};

export default RendaExtraDescontoPage;
