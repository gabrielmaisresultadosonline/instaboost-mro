import { useState, useRef, useEffect } from 'react';
import { Phone, PhoneCall, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import profileImage from '@/assets/mro-profile-call.jpg';

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
  }
}

const Ligacao = () => {
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [callDuration, setCallDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const ringtoneRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Facebook Pixel and start ringtone
  useEffect(() => {
    // Load Facebook Pixel script
    const script = document.createElement('script');
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '569414052132145');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    // Add noscript fallback
    const noscript = document.createElement('noscript');
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=569414052132145&ev=PageView&noscript=1" />`;
    document.body.appendChild(noscript);

    // Start ringtone loop
    if (ringtoneRef.current) {
      ringtoneRef.current.volume = 1;
      ringtoneRef.current.loop = true;
      ringtoneRef.current.play().catch(console.error);
    }

    return () => {
      document.head.removeChild(script);
      document.body.removeChild(noscript);
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = () => {
    // Stop ringtone
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }

    setCallState('connected');
    
    // Start playing audio at max volume
    if (audioRef.current) {
      audioRef.current.volume = 1;
      audioRef.current.play();
    }

    // Start duration counter
    intervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const handleAudioEnded = () => {
    setCallState('ended');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleAccessSite = () => {
    // Track Lead event on Facebook Pixel
    if (window.fbq) {
      window.fbq('track', 'Lead');
    }
    
    // Redirect to the site
    window.location.href = 'https://acessar.click/mrointeligente';
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23] flex items-center justify-center p-4">
      {/* Ringtone audio - loops until answered */}
      <audio 
        ref={ringtoneRef} 
        src="http://maisresultadosonline.com.br/ligacaoaudio.mp3"
        preload="auto"
      />

      {/* Call audio */}
      <audio 
        ref={audioRef} 
        src="https://maisresultadosonline.com.br/3b301aa2-e372-4b47-b35b-34d4b55bcdd9.mp3"
        onEnded={handleAudioEnded}
        preload="auto"
      />

      <div className="w-full max-w-sm">
        {/* Phone Call Interface */}
        <div className="relative rounded-[40px] bg-gradient-to-b from-[#262626] to-[#1a1a1a] p-8 shadow-2xl border border-white/10">
          {/* Instagram gradient bar at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888] rounded-full" />

          {/* Status indicator */}
          <div className="text-center mb-8 mt-4">
            {callState === 'ringing' && (
              <p className="text-white/60 text-sm animate-pulse">Chamada de vídeo do Instagram</p>
            )}
            {callState === 'connected' && (
              <p className="text-green-400 text-sm flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Chamada ativa em andamento... • {formatDuration(callDuration)}
              </p>
            )}
            {callState === 'ended' && (
              <p className="text-yellow-400 text-sm">Chamada finalizada</p>
            )}
          </div>

          {/* Profile Picture */}
          <div className="flex flex-col items-center mb-8">
            <div className={`relative ${callState === 'ringing' ? 'animate-pulse' : ''}`}>
              {/* Outer ring animation for ringing state */}
              {callState === 'ringing' && (
                <>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] animate-ping opacity-30 scale-110" />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] animate-pulse opacity-50 scale-105" />
                </>
              )}
              
              {/* Profile image container */}
              <div className="relative w-32 h-32 rounded-full p-[3px] bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888]">
                <img 
                  src={profileImage} 
                  alt="Mais Resultados Online"
                  className="w-full h-full rounded-full object-cover border-4 border-[#262626]"
                />
              </div>
            </div>

            {/* Caller name */}
            <h2 className="text-white text-2xl font-semibold mt-6">
              Mais Resultados Online
            </h2>
            <p className="text-white/50 text-sm mt-1">@maisresultadosonline</p>
          </div>

          {/* Call State Content */}
          {callState === 'ringing' && (
            <div className="space-y-6">
              <p className="text-white/70 text-center text-lg">
                Ligando para você...
              </p>
              
              {/* Answer button only */}
              <div className="flex justify-center">
                <button
                  onClick={handleAnswer}
                  className="w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 transition-all duration-300 animate-bounce"
                >
                  <Phone className="w-10 h-10 text-white" />
                </button>
              </div>
              
              <p className="text-white/50 text-center text-sm">
                Deslize para atender
              </p>
            </div>
          )}

          {callState === 'connected' && (
            <div className="space-y-6">
              {/* Sound wave animation */}
              <div className="flex justify-center items-center gap-1 h-16">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 bg-gradient-to-t from-green-500 to-green-400 rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 40 + 20}px`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '0.5s'
                    }}
                  />
                ))}
              </div>
              
              <div className="text-center">
                <PhoneCall className="w-12 h-12 text-green-400 mx-auto animate-pulse" />
                <p className="text-white/70 mt-4">Ouça a mensagem...</p>
              </div>
            </div>
          )}

          {callState === 'ended' && (
            <div className="space-y-6 text-center">
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl p-6 border border-yellow-500/30">
                <p className="text-yellow-400 text-xl font-bold mb-2">
                  Aproveite agora mesmo!
                </p>
                <p className="text-white text-lg">
                  Planos a partir de{' '}
                  <span className="text-yellow-400 font-bold text-2xl">R$33</span>
                  {' '}mensal
                </p>
              </div>
              
              <Button
                onClick={handleAccessSite}
                size="lg"
                className="w-full py-6 text-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-background font-bold rounded-full shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all duration-300"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Acessar o Site
              </Button>
              
              <p className="text-white/40 text-xs">
                Clique para conhecer a I.A MRO
              </p>
            </div>
          )}
        </div>

        {/* Instagram branding */}
        <div className="text-center mt-6">
          <p className="text-white/30 text-xs flex items-center justify-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Chamada via Instagram
          </p>
        </div>
      </div>
    </div>
  );
};

export default Ligacao;
