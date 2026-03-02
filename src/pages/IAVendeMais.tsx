import { useState, useRef, useEffect } from 'react';
import { Phone, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import profileImage from '@/assets/mro-profile-call.jpg';
import fundoChamada from '@/assets/fundo-chamada.jpg';
import gabrielImage from '@/assets/gabriel-transparente.png';

type FunnelStep = 
  | 'audio1' 
  | 'question1' 
  | 'confirm_yes' 
  | 'rejected' 
  | 'audio2' 
  | 'pricing' 
  | 'final_whatsapp';

const WHATSAPP_NUMBER = '5511999999999';
const WHATSAPP_MESSAGE = encodeURIComponent('Olá gostaria de saber mais sobre o sistema inovador!');

const IAVendeMais = () => {
  const [step, setStep] = useState<FunnelStep>('audio1');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    audio1Url: '/call-audio.mp3',
    audio2Url: '/call-audio.mp3',
    whatsappNumber: '5511999999999',
    whatsappMessage: 'Olá gostaria de saber mais sobre o sistema inovador!',
    profileUsername: '@iavendemais',
  });
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Load settings from cloud
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('iavendemais-storage', {
          body: { action: 'load' }
        });
        if (!error && data?.success && data?.data) {
          setSettings(prev => ({ ...prev, ...data.data }));
        }
      } catch (err) {
        console.error('[IAVendeMais] Error loading settings:', err);
      }
    };
    loadSettings();
  }, []);

  // Auto-play audio1 on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      playAudio('audio1');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const playAudio = (which: 'audio1' | 'audio2') => {
    if (!audioRef.current) return;
    const url = which === 'audio1' ? settings.audio1Url : settings.audio2Url;
    audioRef.current.src = url;
    audioRef.current.currentTime = 0;
    audioRef.current.volume = 1;
    setIsAudioPlaying(true);
    setAudioProgress(0);

    audioRef.current.play().catch(() => {
      // If autoplay fails, we need user interaction
      setIsAudioPlaying(false);
    });

    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = setInterval(() => {
      if (audioRef.current) {
        const progress = (audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100;
        setAudioProgress(progress);
        setAudioDuration(Math.floor(audioRef.current.currentTime));
      }
    }, 200);
  };

  const handleAudioEnded = () => {
    setIsAudioPlaying(false);
    if (progressInterval.current) clearInterval(progressInterval.current);
    
    if (step === 'audio1') {
      setStep('question1');
    } else if (step === 'audio2') {
      setStep('pricing');
    }
  };

  const handleUserTapToPlay = () => {
    if (step === 'audio1') {
      playAudio('audio1');
    }
  };

  const handleAnswer = (answer: 'sim' | 'nao') => {
    if (step === 'question1') {
      if (answer === 'sim') {
        setStep('confirm_yes');
      } else {
        setStep('rejected');
      }
    } else if (step === 'confirm_yes') {
      if (answer === 'sim') {
        setStep('audio2');
        setTimeout(() => playAudio('audio2'), 500);
      } else {
        setStep('rejected');
      }
    }
  };

  const handleSelectPrice = (price: string) => {
    setSelectedPrice(price);
    setStep('final_whatsapp');
  };

  const whatsappUrl = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(settings.whatsappMessage)}`;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const fullscreenStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
    margin: 0, padding: 0, overflow: 'hidden',
  };

  // Audio waveform animation bars
  const AudioWaveform = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '40px', justifyContent: 'center', marginBottom: '1rem' }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: '3px',
            backgroundColor: '#4ade80',
            borderRadius: '2px',
            height: isAudioPlaying ? `${12 + Math.random() * 28}px` : '8px',
            transition: 'height 0.15s ease',
            animation: isAudioPlaying ? `wave 0.5s ease-in-out ${i * 0.05}s infinite alternate` : 'none',
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          0% { height: 8px; }
          100% { height: ${12 + Math.random() * 28}px; }
        }
      `}</style>
    </div>
  );

  return (
    <>
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        preload="auto"
        playsInline
      />

      <div style={{
        ...fullscreenStyle,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0a',
        overflowY: 'auto',
      }}>

        {/* STEP: Audio 1 Playing */}
        {step === 'audio1' && (
          <div 
            onClick={handleUserTapToPlay}
            style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textAlign: 'center', cursor: !isAudioPlaying ? 'pointer' : 'default', width: '100%', maxWidth: '400px' 
            }}
          >
            <div style={{ width: '6rem', height: '6rem', borderRadius: '50%', overflow: 'hidden', marginBottom: '1rem', border: '3px solid #4ade80', boxShadow: '0 0 30px rgba(74, 222, 128, 0.3)' }}>
              <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <p style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem' }}>
              {isAudioPlaying ? '🔊 Ouvindo...' : '🎧 Toque para ouvir'}
            </p>

            <h2 style={{ color: '#fff', fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              Mensagem importante para você
            </h2>

            <AudioWaveform />

            {isAudioPlaying && (
              <div style={{ width: '100%', maxWidth: '280px', marginBottom: '1rem' }}>
                <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${audioProgress}%`, height: '100%', backgroundColor: '#4ade80', borderRadius: '2px', transition: 'width 0.2s' }} />
                </div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  {formatTime(audioDuration)}
                </p>
              </div>
            )}

            {!isAudioPlaying && (
              <div style={{ marginTop: '1rem', padding: '0.75rem 2rem', backgroundColor: '#4ade80', borderRadius: '9999px', color: '#000', fontWeight: 'bold', fontSize: '0.875rem' }}>
                ▶ Reproduzir áudio
              </div>
            )}
          </div>
        )}

        {/* STEP: Question 1 - Você tem empresa? */}
        {step === 'question1' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textAlign: 'center', width: '100%', maxWidth: '400px' }}>
            <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', overflow: 'hidden', marginBottom: '1.5rem', border: '2px solid rgba(255,255,255,0.2)' }}>
              <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.3 }}>
              Você tem empresa? Vende algum produto? Ou presta algum serviço?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '2rem' }}>
              Selecione uma opção abaixo
            </p>

            {/* Phone-style keyboard buttons */}
            <div style={{ width: '100%', backgroundColor: '#1a1a2e', borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => handleAnswer('sim')}
                style={{
                  width: '100%', padding: '1rem', backgroundColor: '#22c55e', color: '#fff', fontWeight: 700, fontSize: '1.1rem',
                  borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
                }}
              >
                ✅ Sim
              </button>
              <button
                onClick={() => handleAnswer('nao')}
                style={{
                  width: '100%', padding: '1rem', backgroundColor: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '1.1rem',
                  borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                }}
              >
                ❌ Não
              </button>
            </div>
          </div>
        )}

        {/* STEP: Confirm Yes */}
        {step === 'confirm_yes' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textAlign: 'center', width: '100%', maxWidth: '400px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤔</div>

            <h2 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.3 }}>
              Confirma: você presta algum serviço, vende algum produto ou tem empresa?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '2rem' }}>
              Precisamos confirmar para continuar
            </p>

            <div style={{ width: '100%', backgroundColor: '#1a1a2e', borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => handleAnswer('sim')}
                style={{
                  width: '100%', padding: '1rem', backgroundColor: '#22c55e', color: '#fff', fontWeight: 700, fontSize: '1.1rem',
                  borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
                }}
              >
                ✅ Sim, confirmo!
              </button>
              <button
                onClick={() => handleAnswer('nao')}
                style={{
                  width: '100%', padding: '1rem', backgroundColor: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '1.1rem',
                  borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                }}
              >
                ❌ Não
              </button>
            </div>
          </div>
        )}

        {/* STEP: Rejected */}
        {step === 'rejected' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textAlign: 'center', width: '100%', maxWidth: '400px' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>😔</div>

            <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', lineHeight: 1.4 }}>
              Poxa, que pena!
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Se não presta nenhum serviço, não tem empresa e não tem um produto, infelizmente não vamos poder te atender no momento.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '2rem' }}>
              Mas pode seguir nossa página e acompanhar nosso conteúdo. Futuramente estaremos aqui para te ajudar! 🙌
            </p>

            <a
              href={`https://instagram.com/${settings.profileUsername.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '0.875rem 2rem', backgroundColor: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)', background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
                color: '#fff', fontWeight: 700, fontSize: '1rem', borderRadius: '9999px', border: 'none', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              }}
            >
              📱 Seguir no Instagram
            </a>
          </div>
        )}

        {/* STEP: Audio 2 Playing */}
        {step === 'audio2' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textAlign: 'center', width: '100%', maxWidth: '400px' }}>
            <div style={{ width: '6rem', height: '6rem', borderRadius: '50%', overflow: 'hidden', marginBottom: '1rem', border: '3px solid #eab308', boxShadow: '0 0 30px rgba(234, 179, 8, 0.3)' }}>
              <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <p style={{ color: '#eab308', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem' }}>
              🔊 Ouvindo mensagem...
            </p>

            <h2 style={{ color: '#fff', fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              Temos algo especial para você!
            </h2>

            <AudioWaveform />

            {isAudioPlaying && (
              <div style={{ width: '100%', maxWidth: '280px' }}>
                <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${audioProgress}%`, height: '100%', backgroundColor: '#eab308', borderRadius: '2px', transition: 'width 0.2s' }} />
                </div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  {formatTime(audioDuration)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP: Pricing Question */}
        {step === 'pricing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', textAlign: 'center', width: '100%', maxWidth: '420px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💰</div>

            <h2 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.3 }}>
              Para você vender mais, ter mais clientes, mais engajamento, mais público real e trazendo retorno...
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.4 }}>
              Quanto você acha que vale ter uma ferramenta que vai fazer tudo isso no automático?
            </p>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'R$ 1.000 anual', sub: '(R$83/mês)', value: '1000' },
                { label: 'R$ 12.000 anual', sub: '(R$1.000/mês)', value: '12000' },
                { label: 'R$ 5.000 anual', sub: '(R$416/mês)', value: '5000' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelectPrice(option.value)}
                  style={{
                    width: '100%', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(74, 222, 128, 0.1)'; e.currentTarget.style.borderColor = '#4ade80'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{option.label}</p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>{option.sub}</p>
                  </div>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'transparent' }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP: Final WhatsApp */}
        {step === 'final_whatsapp' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textAlign: 'center', width: '100%', maxWidth: '400px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>

            <h2 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', lineHeight: 1.3 }}>
              Temos uma opção muito melhor para você!
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '2rem' }}>
              Se você precisa de <span style={{ color: '#4ade80', fontWeight: 700 }}>resultados reais</span> investindo muito pouco, clique no WhatsApp abaixo.
            </p>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '1rem 2rem', backgroundColor: '#25d366', color: '#fff', fontWeight: 700, fontSize: '1.1rem',
                borderRadius: '9999px', border: 'none', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
                boxShadow: '0 10px 30px rgba(37, 211, 102, 0.4)',
                animation: 'pulse-green 2s infinite',
              }}
            >
              <MessageCircle style={{ width: '1.5rem', height: '1.5rem' }} />
              Falar no WhatsApp
            </a>

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '1.5rem' }}>
              {settings.profileUsername}
            </p>

            <style>{`
              @keyframes pulse-green {
                0%, 100% { transform: scale(1); box-shadow: 0 10px 30px rgba(37, 211, 102, 0.4); }
                50% { transform: scale(1.05); box-shadow: 0 15px 40px rgba(37, 211, 102, 0.6); }
              }
            `}</style>
          </div>
        )}
      </div>
    </>
  );
};

export default IAVendeMais;
