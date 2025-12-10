import { useState, useRef, useEffect } from 'react';
import { Check, X, ExternalLink } from 'lucide-react';
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
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Facebook Pixel and start audio/vibration immediately
  useEffect(() => {
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

    const noscript = document.createElement('noscript');
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=569414052132145&ev=PageView&noscript=1" />`;
    document.body.appendChild(noscript);

    // Try to start ringtone automatically (muted first to bypass autoplay)
    if (ringtoneRef.current) {
      ringtoneRef.current.volume = 1;
      ringtoneRef.current.loop = true;
      ringtoneRef.current.play().catch(() => {
        // If autoplay fails, try with user interaction
        document.addEventListener('click', () => {
          if (ringtoneRef.current && callState === 'ringing') {
            ringtoneRef.current.play().catch(console.error);
          }
        }, { once: true });
      });
    }

    // Start vibration pattern
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 300, 500, 300, 500]);
      vibrationIntervalRef.current = setInterval(() => {
        if (callState === 'ringing') {
          navigator.vibrate([500, 300, 500, 300, 500]);
        }
      }, 2500);
    }

    return () => {
      document.head.removeChild(script);
      document.body.removeChild(noscript);
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
      }
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
      }
      navigator.vibrate(0);
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

    // Stop vibration
    navigator.vibrate(0);
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
    }

    setCallState('connected');
    
    // Start playing call audio at max volume
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
    if (window.fbq) {
      window.fbq('track', 'Lead');
    }
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
    <div className="min-h-screen bg-black flex flex-col">
      {/* Hidden audio elements */}
      <audio 
        ref={ringtoneRef} 
        src="http://maisresultadosonline.com.br/ligacaoaudio.mp3"
        preload="auto"
      />
      <audio 
        ref={audioRef} 
        src="https://maisresultadosonline.com.br/3b301aa2-e372-4b47-b35b-34d4b55bcdd9.mp3"
        onEnded={handleAudioEnded}
        preload="auto"
      />

      {callState === 'ringing' && (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4">
            <button className="text-white/60">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6,9 12,15 18,9" />
              </svg>
            </button>
            <button className="text-white/60">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            {/* Profile Image */}
            <div className="w-28 h-28 rounded-full overflow-hidden mb-6 border-2 border-white/20">
              <img 
                src={profileImage} 
                alt="Mais Resultados Online"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Instagram Audio Label */}
            <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <defs>
                  <linearGradient id="instagramGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f09433" />
                    <stop offset="25%" stopColor="#e6683c" />
                    <stop offset="50%" stopColor="#dc2743" />
                    <stop offset="75%" stopColor="#cc2366" />
                    <stop offset="100%" stopColor="#bc1888" />
                  </linearGradient>
                </defs>
                <path fill="url(#instagramGradient)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
              </svg>
              <span>Áudio de Instagram...</span>
            </div>

            {/* Username */}
            <h1 className="text-white text-3xl font-semibold">
              @maisresultadosonline
            </h1>
          </div>

          {/* Bottom Buttons */}
          <div className="pb-16 px-8">
            <div className="flex items-center justify-between max-w-xs mx-auto">
              {/* Decline Button - Disabled */}
              <div className="flex flex-col items-center">
                <button 
                  className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center opacity-50 cursor-not-allowed"
                  disabled
                >
                  <X className="w-10 h-10 text-white" />
                </button>
                <span className="text-white/60 text-sm mt-3">Recusar</span>
              </div>

              {/* Accept Button */}
              <div className="flex flex-col items-center">
                <button
                  onClick={handleAnswer}
                  className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-400 transition-all transform hover:scale-105 shadow-lg shadow-green-500/30 animate-pulse"
                >
                  <Check className="w-10 h-10 text-white" />
                </button>
                <span className="text-white text-sm mt-3">Aceitar</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {callState === 'connected' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          {/* Profile Image */}
          <div className="w-32 h-32 rounded-full overflow-hidden mb-6 border-2 border-green-500">
            <img 
              src={profileImage} 
              alt="Mais Resultados Online"
              className="w-full h-full object-cover"
            />
          </div>

          <h2 className="text-white text-2xl font-semibold mb-2">Mais Resultados Online</h2>
          
          <p className="text-green-400 text-sm flex items-center gap-2 mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Chamada ativa • {formatDuration(callDuration)}
          </p>

          {/* Sound wave animation */}
          <div className="flex items-center gap-1 h-12 mb-4">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="w-1.5 bg-gradient-to-t from-green-500 to-green-400 rounded-full"
                style={{
                  height: `${20 + Math.sin(i * 0.5) * 15 + Math.random() * 10}px`,
                  animation: `pulse 0.5s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>

          <p className="text-white/60 text-sm">Ouça a mensagem...</p>
        </div>
      )}

      {callState === 'ended' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          {/* Profile Image */}
          <div className="w-28 h-28 rounded-full overflow-hidden mb-6 border-2 border-yellow-500">
            <img 
              src={profileImage} 
              alt="Mais Resultados Online"
              className="w-full h-full object-cover"
            />
          </div>

          <p className="text-white/60 text-sm mb-2">Chamada finalizada</p>
          <h2 className="text-white text-xl font-semibold mb-8">Mais Resultados Online</h2>

          <div className="w-full max-w-sm bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl p-6 border border-yellow-500/30 mb-6">
            <p className="text-yellow-400 text-xl font-bold text-center mb-2">
              Aproveite agora mesmo!
            </p>
            <p className="text-white text-center text-lg">
              Planos a partir de{' '}
              <span className="text-yellow-400 font-bold text-2xl">R$33</span>
              {' '}mensal
            </p>
          </div>
          
          <Button
            onClick={handleAccessSite}
            size="lg"
            className="w-full max-w-sm py-6 text-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold rounded-full shadow-lg shadow-yellow-500/30"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            Acessar o Site
          </Button>
        </div>
      )}
    </div>
  );
};

export default Ligacao;
