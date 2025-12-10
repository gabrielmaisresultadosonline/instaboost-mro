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
  const ringtoneRef = useRef<HTMLAudioElement>(null);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (vibrationIntervalRef.current) clearInterval(vibrationIntervalRef.current);
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      navigator.vibrate?.(0);
    };
  }, []);

  // Handle ringing state - play ringtone
  useEffect(() => {
    if (callState !== 'ringing') return;

    const playRingtone = async () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.loop = true;
        ringtoneRef.current.volume = 1;
        try {
          await ringtoneRef.current.play();
        } catch {
          setNeedsInteraction(true);
        }
      }
    };
    playRingtone();

    // Vibration
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 300, 500, 300, 500]);
      vibrationIntervalRef.current = setInterval(() => {
        navigator.vibrate([500, 300, 500, 300, 500]);
      }, 2500);
    }

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
      }
      navigator.vibrate?.(0);
    };
  }, [callState]);

  const handleEnableSound = () => {
    if (ringtoneRef.current && needsInteraction) {
      ringtoneRef.current.play().catch(console.error);
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
    // 1. STOP ringtone FIRST
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }

    // 2. Stop vibration
    navigator.vibrate?.(0);
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }

    // 3. Change state IMMEDIATELY
    setCallState('connected');

    // 4. Start call duration timer
    intervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    // 5. Play call audio after small delay to ensure ringtone stopped
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 1;
        audioRef.current.play().catch(() => {
          console.log('Call audio blocked on iOS');
        });
      }
    }, 100);
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
      {/* Audio elements */}
      <audio 
        ref={ringtoneRef} 
        src="https://maisresultadosonline.com.br/1207.mp3"
        preload="auto"
        playsInline
      />
      <audio 
        ref={audioRef} 
        src="https://maisresultadosonline.com.br/3b301aa2-e372-4b47-b35b-34d4b55bcdd9.mp3"
        onEnded={handleAudioEnded}
        preload="auto"
        playsInline
      />

      {/* Landing Page */}
      {callState === 'landing' && (
        <div 
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: '2rem',
            position: 'relative',
            backgroundImage: `url(${fundoChamada})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} />
          
          <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 1rem', textAlign: 'center' }}>
            <img 
              src={gabrielImage} 
              alt="Gabriel"
              style={{ width: '12rem', height: 'auto', marginBottom: '-2.5rem' }}
            />

            <h1 style={{ color: '#fff', fontSize: '1.125rem', fontWeight: 'bold', fontStyle: 'italic', lineHeight: 1.3, marginBottom: '1rem', maxWidth: '280px' }}>
              <span style={{ color: '#facc15' }}>Gabriel</span> esta agora
              <br />disponível para uma
              <br />chamada, atenda para
              <br />entender <span style={{ color: '#facc15' }}>como não Gastar
              <br />mais com anúncios!</span>
            </h1>

            <button
              onClick={handleReceiveCall}
              style={{
                backgroundColor: '#4ade80',
                color: '#000',
                fontWeight: 'bold',
                padding: '0.75rem 1.5rem',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 10px 15px -3px rgba(74, 222, 128, 0.3)',
              }}
            >
              Receber chamada agora
              <Phone style={{ width: '1.25rem', height: '1.25rem' }} />
            </button>
          </div>
        </div>
      )}

      {/* Ringing State */}
      {callState === 'ringing' && (
        <div 
          style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#000' }}
          onClick={needsInteraction ? handleEnableSound : undefined}
        >
          {needsInteraction && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg style={{ width: '2rem', height: '2rem', color: '#fff' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                </div>
                <p style={{ color: '#fff', fontSize: '1.125rem', fontWeight: 600 }}>Toque para ativar o som</p>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem' }}>
            <button style={{ color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none' }}>
              <svg style={{ width: '1.75rem', height: '1.75rem' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6,9 12,15 18,9" />
              </svg>
            </button>
            <button style={{ color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none' }}>
              <svg style={{ width: '1.25rem', height: '1.25rem' }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '2rem', paddingLeft: '2rem', paddingRight: '2rem' }}>
            <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', overflow: 'hidden', marginBottom: '0.75rem', border: '2px solid rgba(255,255,255,0.2)' }}>
              <img src={profileImage} alt="Mais Resultados Online" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              <span>Áudio de Instagram...</span>
            </div>

            <h1 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600 }}>
              @maisresultadosonline
            </h1>
          </div>

          <div style={{ paddingBottom: '5rem', paddingLeft: '2rem', paddingRight: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '280px', margin: '0 auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button 
                  style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', backgroundColor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, cursor: 'not-allowed', border: 'none' }}
                  disabled
                >
                  <X style={{ width: '1.75rem', height: '1.75rem', color: '#fff' }} />
                </button>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginTop: '0.5rem' }}>Recusar</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button
                  onClick={handleAnswer}
                  style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', backgroundColor: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(34, 197, 94, 0.3)' }}
                >
                  <Check style={{ width: '1.75rem', height: '1.75rem', color: '#fff' }} />
                </button>
                <span style={{ color: '#fff', fontSize: '0.75rem', marginTop: '0.5rem' }}>Aceitar</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connected State */}
      {callState === 'connected' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#2a1f1f' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem' }}>
            <button style={{ color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none' }}>
              <svg style={{ width: '1.75rem', height: '1.75rem' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6,9 12,15 18,9" />
              </svg>
            </button>
            <button style={{ color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none' }}>
              <svg style={{ width: '1.25rem', height: '1.25rem' }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '3rem', paddingLeft: '2rem', paddingRight: '2rem' }}>
            <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', overflow: 'hidden', marginBottom: '0.75rem', border: '2px solid rgba(255,255,255,0.2)' }}>
              <img src={profileImage} alt="Mais Resultados Online" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', textAlign: 'center', marginBottom: '0.25rem' }}>
              Chamada ativa em andamento...
            </p>
            <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 500 }}>
              {formatDuration(callDuration)}
            </p>
          </div>

          <div style={{ paddingBottom: '5rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <button style={{ width: '2.75rem', height: '2.75rem', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}>
                <svg style={{ width: '1.25rem', height: '1.25rem', color: '#fff' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="6" width="14" height="12" rx="2"/>
                  <path d="M22 8l-6 4 6 4V8z"/>
                  <line x1="2" y1="2" x2="22" y2="22" strokeLinecap="round"/>
                </svg>
              </button>

              <button style={{ width: '2.75rem', height: '2.75rem', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}>
                <svg style={{ width: '1.25rem', height: '1.25rem', color: '#fff' }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
                </svg>
              </button>

              <button style={{ width: '2.75rem', height: '2.75rem', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}>
                <svg style={{ width: '1.25rem', height: '1.25rem', color: '#fff' }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 11.5V13H9v2.5L5.5 12 9 8.5V11h6V8.5l3.5 3.5-3.5 3.5z"/>
                </svg>
              </button>

              <button style={{ width: '2.75rem', height: '2.75rem', borderRadius: '50%', backgroundColor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}>
                <svg style={{ width: '1.25rem', height: '1.25rem', color: '#fff', transform: 'rotate(135deg)' }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ended State */}
      {callState === 'ended' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '3rem', paddingLeft: '1.5rem', paddingRight: '1.5rem', backgroundColor: '#000' }}>
          <div style={{ width: '6rem', height: '6rem', borderRadius: '50%', overflow: 'hidden', marginBottom: '1rem', border: '2px solid #eab308' }}>
            <img src={profileImage} alt="Mais Resultados Online" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Chamada finalizada</p>
          <h2 style={{ color: '#fff', fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>Mais Resultados Online</h2>

          <div style={{ width: '100%', maxWidth: '24rem', background: 'linear-gradient(to right, rgba(234,179,8,0.2), rgba(249,115,22,0.2))', borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(234,179,8,0.3)', marginBottom: '1rem' }}>
            <p style={{ color: '#facc15', fontSize: '1.125rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '0.25rem' }}>
              Aproveite agora mesmo!
            </p>
            <p style={{ color: '#fff', textAlign: 'center' }}>
              Planos a partir de{' '}
              <span style={{ color: '#facc15', fontWeight: 'bold', fontSize: '1.25rem' }}>R$33</span>
              {' '}mensal
            </p>
          </div>
          
          <Button
            onClick={handleAccessSite}
            size="lg"
            className="w-full max-w-sm py-5 text-base bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold rounded-full shadow-lg shadow-yellow-500/30"
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
