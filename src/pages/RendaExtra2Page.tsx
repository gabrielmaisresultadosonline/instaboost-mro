import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Briefcase, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackPageView } from '@/lib/facebookTracking';
import { supabase } from '@/integrations/supabase/client';
import Hls from 'hls.js';

const VIDEO_SERVER = 'https://video.maisresultadosonline.com.br';

const trackEvent = (page: string) => {
  supabase.functions.invoke('estrutura4-discount', { body: { action: 'track_visit', page } }).catch(() => {});
};

const RendaExtraPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'choice' | 'prestar'>('choice');
  const [videoCfg, setVideoCfg] = useState<{ video_url: string | null; hls_url: string | null; video_title: string | null }>({ video_url: null, hls_url: null, video_title: null });
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    trackPageView('Renda Extra 2');
    trackEvent('/renda-extra2');
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
    const fullVideo = video_url ? (isRel(video_url) ? `${VIDEO_SERVER}${video_url}` : video_url) : null;
    const fullHls = hls_url ? (isRel(hls_url) ? `${VIDEO_SERVER}${hls_url}` : hls_url) : null;
    const loadDirect = () => { if (fullVideo) { video.src = fullVideo; video.play().catch(() => {}); } };

    if (fullHls && Hls.isSupported()) {
      (async () => {
        try {
          const res = await fetch(fullHls, { method: 'HEAD' });
          if (!res.ok) return loadDirect();
          const hls = new Hls({ startLevel: 0, capLevelToPlayerSize: true, enableWorker: true });
          hls.loadSource(fullHls);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
          hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) { hls.destroy(); loadDirect(); } });
          hlsRef.current = hls;
        } catch { loadDirect(); }
      })();
    } else if (fullHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = fullHls; video.play().catch(() => {});
    } else {
      loadDirect();
    }
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [mode, videoCfg]);



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
              onClick={() => { trackEvent('click:renda-extra2:prestar'); setMode('prestar'); }}
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
              onClick={() => { trackEvent('click:renda-extra2:licenciado'); navigate('/licenciado'); }}
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
      <div className="max-w-4xl mx-auto space-y-12 text-center relative">
        <div className="flex justify-start">
            <Button 
                variant="ghost" 
                onClick={() => setMode('choice')} 
                className="text-white/60 hover:text-white hover:bg-white/5"
            >
                <ArrowLeft className="w-5 h-5 mr-2" /> Voltar
            </Button>
        </div>

        <div className="space-y-6">
          <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-black uppercase tracking-[0.2em] mb-2">Treinamento Exclusivo</div>
          <h3 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase italic">Você já conhece como isso funciona?</h3>
          <p className="text-white/40 text-sm md:text-lg leading-relaxed font-medium max-w-2xl mx-auto">
            Ainda não? Veja então esta live por completo antes de acessar sua área de prestação de serviços.
          </p>
        </div>

        <div className="max-w-3xl mx-auto w-full aspect-video rounded-[2.5rem] overflow-hidden bg-black shadow-2xl border border-white/5">
          <iframe
            src="https://www.youtube.com/embed/-0CHlqHVe0g"
            title="Live MRO Renda Extra"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>

        <div className="flex justify-center pt-4 pb-12">
          <Button
            onClick={() => { trackEvent('click:renda-extra2:acessar-renda-extra-agora'); navigate('/estruturarendaextra4'); }}
            className="w-full max-w-md flex items-center justify-center gap-3 px-8 py-8 rounded-2xl bg-emerald-500 text-black font-black text-xl transition-all hover:scale-[1.05] active:scale-95 uppercase tracking-widest shadow-[0_0_30px_rgba(16,185,129,0.3)] group"
          >
            ACESSAR RENDA EXTRA AGORA <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RendaExtraPage;
