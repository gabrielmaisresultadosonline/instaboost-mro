import { useState, useRef, useEffect } from 'react';
import { Check, X, ExternalLink, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import profileImage from '@/assets/mro-profile-call.jpg';
import fundoChamada from '@/assets/fundo-chamada.jpg';
import gabrielImage from '@/assets/gabriel-transparente.png';

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
  }
}

const Ligacao = () => {
  const [callState, setCallState] = useState<'landing' | 'ringing' | 'connected' | 'ended'>('landing');
  const [callDuration, setCallDuration] = useState(0);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const ringtoneVideoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Facebook Pixel on mount
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

    return () => {
      document.head.removeChild(script);
      document.body.removeChild(noscript);
    };
  }, []);

  // Start ringtone and vibration when entering ringing state
  useEffect(() => {
    if (callState !== 'ringing') return;

    // Try to play video with sound
    const playWithSound = async () => {
      if (ringtoneVideoRef.current) {
        ringtoneVideoRef.current.volume = 1;
        ringtoneVideoRef.current.loop = true;
        ringtoneVideoRef.current.muted = false;
        
        try {
          await ringtoneVideoRef.current.play();
        } catch (error) {
          // Autoplay with sound blocked - show tap message
          setNeedsInteraction(true);
          // Try muted as fallback
          ringtoneVideoRef.current.muted = true;
          ringtoneVideoRef.current.play().catch(console.error);
        }
      }
    };
    playWithSound();

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
      if (ringtoneVideoRef.current) {
        ringtoneVideoRef.current.pause();
      }
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
      }
      navigator.vibrate(0);
    };
  }, [callState]);

  const handleEnableSound = () => {
    if (ringtoneVideoRef.current && needsInteraction) {
      ringtoneVideoRef.current.muted = false;
      ringtoneVideoRef.current.play().catch(console.error);
      setNeedsInteraction(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReceiveCall = () => {
    setCallState('ringing');
  };

  const handleAnswer = () => {
    // Stop ringtone video
    if (ringtoneVideoRef.current) {
      ringtoneVideoRef.current.pause();
      ringtoneVideoRef.current.currentTime = 0;
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
      {/* Hidden video for ringtone */}
      <video 
        ref={ringtoneVideoRef} 
        src="http://maisresultadosonline.com.br/1207.mp4"
        className="hidden"
        playsInline
        muted
        loop
      />
      <audio 
        ref={audioRef} 
        src="https://maisresultadosonline.com.br/3b301aa2-e372-4b47-b35b-34d4b55bcdd9.mp3"
        onEnded={handleAudioEnded}
        preload="auto"
      />

      {/* Landing Page */}
      {callState === 'landing' && (
        <div 
          className="flex-1 flex flex-col items-center justify-center relative"
          style={{
            backgroundImage: `url(${fundoChamada})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/60" />
          
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center px-6 text-center">
            {/* Gabriel Image - muito próximo do texto */}
            <img 
              src={gabrielImage} 
              alt="Gabriel"
              className="w-72 h-auto -mb-16"
            />

            {/* Text */}
            <h1 className="text-white text-2xl font-bold italic leading-tight mb-8 max-w-sm">
              <span className="text-yellow-400">Gabriel</span> esta agora
              <br />disponível para uma
              <br />chamada, atenda para
              <br />entender <span className="text-yellow-400">como não Gastar
              <br />mais com anúncios!</span>
            </h1>

            {/* CTA Button */}
            <button
              onClick={handleReceiveCall}
              className="bg-[#4ade80] hover:bg-[#22c55e] text-black font-bold py-4 px-8 rounded-full flex items-center gap-3 text-lg transition-all transform hover:scale-105 shadow-lg shadow-green-500/30"
            >
              Receber chamada agora
              <Phone className="w-5 h-5 animate-pulse" />
            </button>
          </div>
        </div>
      )}

      {callState === 'ringing' && (
        <div className="flex-1 flex flex-col" onClick={needsInteraction ? handleEnableSound : undefined}>
          {/* Tap to enable sound overlay */}
          {needsInteraction && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
              <div className="text-center animate-pulse">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                </div>
                <p className="text-white text-lg font-semibold">Toque para ativar o som</p>
              </div>
            </div>
          )}

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
        <div className="flex-1 flex flex-col bg-gradient-to-b from-[#3d2c2c] via-[#2a1f1f] to-[#1a1212]">
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

          {/* User placeholder at top right */}
          <div className="absolute top-20 right-4">
            <div className="w-16 h-20 bg-[#3a3a3a] rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-white/40" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          </div>

          {/* Main Content - Profile Photo */}
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-white/20">
              <img 
                src={profileImage} 
                alt="Mais Resultados Online"
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-white/60 text-sm text-center">
              A câmera de Mais Resultados Online está desativada
            </p>
          </div>

          {/* Bottom Call Controls */}
          <div className="pb-8 px-4">
            <div className="flex items-center justify-center gap-6">
              {/* Camera Off */}
              <button className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16.5 9.4l-2-2.1M2 4l20 20M9 9c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v4"/>
                  <rect x="2" y="6" width="14" height="12" rx="2"/>
                  <path d="M22 8l-6 4 6 4V8z"/>
                  <line x1="2" y1="2" x2="22" y2="22" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Microphone */}
              <button className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
                </svg>
              </button>

              {/* Camera Switch */}
              <button className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 11.5V13H9v2.5L5.5 12 9 8.5V11h6V8.5l3.5 3.5-3.5 3.5z"/>
                </svg>
              </button>

              {/* End Call */}
              <button className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center">
                <svg className="w-7 h-7 text-white transform rotate-135" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
                </svg>
              </button>
            </div>
          </div>
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
