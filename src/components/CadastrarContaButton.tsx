import { useState } from 'react';
import { UserPlus, X, ExternalLink, MessageCircle, Play } from 'lucide-react';
import { useWhatsAppConfig } from '@/hooks/useWhatsAppConfig';

export const CadastrarContaButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const { whatsappNumber } = useWhatsAppConfig();

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-sm shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105 active:scale-95 border border-orange-400/50"
      >
        <UserPlus className="w-5 h-5" />
        <span className="hidden sm:inline">Cadastrar Nova Conta</span>
        <span className="sm:hidden">Nova Conta</span>
      </button>

      {/* Popup */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => { setIsOpen(false); setShowVideo(false); }}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-orange-500/10 to-orange-600/10">
              <h3 className="text-foreground font-bold text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-orange-400" />
                Cadastrar Nova Conta
              </h3>
              <button onClick={() => { setIsOpen(false); setShowVideo(false); }} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Explanation */}
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-3">
                <p className="text-foreground text-sm leading-relaxed">
                  <strong className="text-orange-400">📌 Cadastrar Nova Conta:</strong> Faça o cadastro de uma nova conta de Instagram dentro do seu plano.
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Lembre-se que ao cadastrar, <strong className="text-foreground">não é possível remover</strong> a conta, pois é um <strong className="text-orange-400">cadastro fixo</strong>. 
                  Caso precise de mais contas além do seu plano, entre em contato com o admin.
                </p>
              </div>

              {/* Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <p className="text-yellow-300 font-bold text-xs mb-1">⚠️ Observação importante:</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Caso tenha adicionado de forma errada, com nome diferente, ou até mesmo se você mudou o nome do perfil, pode entrar em contato conosco para alterar diretamente pelo admin.
                </p>
              </div>

              {/* Video Section */}
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs text-center font-medium">Assista o tutorial para entender o processo:</p>
                {!showVideo ? (
                  <button
                    onClick={() => setShowVideo(true)}
                    className="w-full aspect-video rounded-xl bg-black/50 border border-border flex flex-col items-center justify-center gap-3 hover:bg-black/70 transition-colors cursor-pointer group"
                  >
                    <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-7 h-7 text-white ml-1" fill="currentColor" />
                    </div>
                    <span className="text-muted-foreground text-sm font-medium">Clique para assistir o tutorial</span>
                  </button>
                ) : (
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                    <iframe
                      src="https://www.youtube.com/embed/CPI6xSH4TjU?autoplay=1"
                      title="Tutorial Cadastrar Nova Conta"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-1">
                <a
                  href="https://maisresultadosonline.com.br/instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                >
                  <ExternalLink className="h-4 w-4" />
                  Cadastrar na Área do Instagram
                </a>
                <a
                  href="https://wa.me/555195781011?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20minha%20conta%20do%20Instagram%20na%20MRO"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-600/20 border border-green-500/40 hover:bg-green-600/30 text-green-400 font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Falar com o Admin via WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
