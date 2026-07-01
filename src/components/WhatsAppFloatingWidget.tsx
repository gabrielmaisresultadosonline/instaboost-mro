import { useState } from 'react';
import { X } from 'lucide-react';

const PHONE = '5551928358563'; // +55 51 9283-5863 → 5551 92835863 without formatting
// Note: WhatsApp format expects digits only. Actual number: +55 51 9283-5863 → 555192835863
const WA_NUMBER = '555192835863';

const openWA = (message: string) => {
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

const WhatsAppFloatingWidget = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'menu' | 'custom'>('menu');
  const [customMsg, setCustomMsg] = useState('');

  const handleToggle = () => {
    setOpen((v) => !v);
    setMode('menu');
    setCustomMsg('');
  };

  const handleCustomSend = () => {
    const msg = customMsg.trim();
    if (!msg) return;
    openWA(`Vim pelo site. Gostaria de falar sobre: ${msg}`);
    setOpen(false);
    setMode('menu');
    setCustomMsg('');
  };

  return (
    <>
      {/* Panel */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
          onClick={handleToggle}
        >
          <div
            className="relative w-full max-w-md bg-gradient-to-br from-[#1f1f1f] to-[#0d0d0d] border border-[#c9a84c]/30 shadow-[0_30px_80px_rgba(0,0,0,0.8),0_0_60px_rgba(37,211,102,0.15)] animate-scale-in"
            style={{
              fontFamily: "'Hind', sans-serif",
              transform: 'perspective(1200px) rotateX(2deg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div className="flex items-center justify-between bg-[#25D366] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <svg viewBox="0 0 32 32" className="w-5 h-5 fill-white">
                  <path d="M16 .396C7.164.396 0 7.56 0 16.396c0 2.876.756 5.688 2.192 8.164L.06 32l7.664-2.008a15.94 15.94 0 0 0 8.276 2.312c8.836 0 16-7.164 16-16S24.836.396 16 .396Zm0 29.208a13.14 13.14 0 0 1-7.212-2.164l-.516-.32-4.552 1.192 1.212-4.436-.336-.54A13.14 13.14 0 1 1 29.14 16.4c0 7.264-5.876 13.204-13.14 13.204Zm7.56-9.876c-.412-.208-2.44-1.204-2.816-1.34-.376-.14-.652-.208-.928.208-.276.412-1.064 1.34-1.304 1.616-.24.276-.48.312-.892.104-.412-.208-1.74-.64-3.312-2.04-1.224-1.092-2.052-2.436-2.292-2.848-.24-.412-.024-.632.18-.836.184-.184.412-.48.616-.72.208-.24.276-.412.412-.688.14-.276.068-.516-.036-.72-.104-.208-.928-2.24-1.276-3.064-.336-.808-.68-.696-.928-.708l-.792-.012c-.276 0-.72.104-1.096.516-.376.412-1.44 1.408-1.44 3.436 0 2.028 1.476 3.988 1.68 4.264.208.276 2.904 4.428 7.036 6.204.984.424 1.752.68 2.352.868.988.316 1.888.272 2.6.164.792-.116 2.44-.996 2.784-1.96.344-.964.344-1.788.24-1.96-.104-.176-.376-.276-.788-.484Z"/>
                </svg>
              </div>
              <div>
                <div className="text-white text-sm font-bold uppercase tracking-wider" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                  Atendimento
                </div>
                <div className="text-white/80 text-[10px]">Online agora</div>
              </div>
            </div>
            <button
              onClick={handleToggle}
              className="text-white/90 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            {mode === 'menu' && (
              <>
                <p className="text-[#e5e5e5] text-sm leading-relaxed">
                  Vamos direcionar você para nosso WhatsApp. Em que podemos ajudar?
                </p>

                <button
                  onClick={() =>
                    openWA('Gostaria de saber sobre o sistema inovador!')
                  }
                  className="w-full text-left bg-[#0d0d0d] border border-[#c9a84c]/20 hover:border-[#c9a84c]/60 hover:bg-[#141414] transition-all px-4 py-3 text-sm text-[#f0f0f0]"
                >
                  <span className="block text-[#c9a84c] text-[10px] uppercase tracking-widest mb-1">Opção 1</span>
                  Saber sobre não gastar com anúncios
                </button>

                <button
                  onClick={() =>
                    openWA('Vim pelo site, gostaria de suporte.')
                  }
                  className="w-full text-left bg-[#0d0d0d] border border-[#c9a84c]/20 hover:border-[#c9a84c]/60 hover:bg-[#141414] transition-all px-4 py-3 text-sm text-[#f0f0f0]"
                >
                  <span className="block text-[#c9a84c] text-[10px] uppercase tracking-widest mb-1">Já é cliente?</span>
                  Gostaria de suporte
                </button>

                <button
                  onClick={() => setMode('custom')}
                  className="w-full text-left bg-[#0d0d0d] border border-[#c9a84c]/20 hover:border-[#c9a84c]/60 hover:bg-[#141414] transition-all px-4 py-3 text-sm text-[#f0f0f0]"
                >
                  <span className="block text-[#c9a84c] text-[10px] uppercase tracking-widest mb-1">Outro</span>
                  Gostaria de falar sobre outros assuntos
                </button>
              </>
            )}

            {mode === 'custom' && (
              <>
                <p className="text-[#e5e5e5] text-sm leading-relaxed">
                  Gostaria de falar sobre o quê?
                </p>
                <textarea
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder="Escreva sua mensagem..."
                  rows={4}
                  className="w-full bg-[#0d0d0d] border border-[#c9a84c]/20 focus:border-[#c9a84c]/60 outline-none px-3 py-2 text-sm text-[#f0f0f0] resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode('menu')}
                    className="flex-1 border border-[#c9a84c]/30 text-[#c9a84c] hover:bg-[#c9a84c]/10 transition-all px-4 py-2 text-xs uppercase tracking-widest"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleCustomSend}
                    disabled={!customMsg.trim()}
                    className="flex-1 bg-[#25D366] hover:bg-[#20b957] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all px-4 py-2 text-xs uppercase tracking-widest font-bold"
                  >
                    Enviar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={handleToggle}
        aria-label="Abrir WhatsApp"
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[60] w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#25D366] hover:bg-[#20b957] shadow-[0_10px_40px_rgba(37,211,102,0.5)] flex items-center justify-center transition-all hover:scale-110 active:scale-95"
      >
        {open ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <>
            <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-40" />
            <svg viewBox="0 0 32 32" className="w-7 h-7 md:w-8 md:h-8 fill-white relative">
              <path d="M16 .396C7.164.396 0 7.56 0 16.396c0 2.876.756 5.688 2.192 8.164L.06 32l7.664-2.008a15.94 15.94 0 0 0 8.276 2.312c8.836 0 16-7.164 16-16S24.836.396 16 .396Zm0 29.208a13.14 13.14 0 0 1-7.212-2.164l-.516-.32-4.552 1.192 1.212-4.436-.336-.54A13.14 13.14 0 1 1 29.14 16.4c0 7.264-5.876 13.204-13.14 13.204Zm7.56-9.876c-.412-.208-2.44-1.204-2.816-1.34-.376-.14-.652-.208-.928.208-.276.412-1.064 1.34-1.304 1.616-.24.276-.48.312-.892.104-.412-.208-1.74-.64-3.312-2.04-1.224-1.092-2.052-2.436-2.292-2.848-.24-.412-.024-.632.18-.836.184-.184.412-.48.616-.72.208-.24.276-.412.412-.688.14-.276.068-.516-.036-.72-.104-.208-.928-2.24-1.276-3.064-.336-.808-.68-.696-.928-.708l-.792-.012c-.276 0-.72.104-1.096.516-.376.412-1.44 1.408-1.44 3.436 0 2.028 1.476 3.988 1.68 4.264.208.276 2.904 4.428 7.036 6.204.984.424 1.752.68 2.352.868.988.316 1.888.272 2.6.164.792-.116 2.44-.996 2.784-1.96.344-.964.344-1.788.24-1.96-.104-.176-.376-.276-.788-.484Z" />
            </svg>
          </>
        )}
      </button>
    </>
  );
};

export default WhatsAppFloatingWidget;
