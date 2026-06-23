import { useEffect } from "react";
import { Download, MessageCircle, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackPageView } from "@/lib/facebookTracking";
import logoMroWhite from "@/assets/logo-mro-white.png";

const Atualizar = () => {
  useEffect(() => {
    trackPageView("Página de Atualização");
  }, []);

  const handleWhatsAppClick = () => {
    window.open("https://maisresultadosonline.com.br/whatsapp/", "_blank");
  };

  const handleMemberAreaClick = () => {
    window.open("https://maisresultadosonline.com.br/mro-ferramenta", "_blank");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
      {/* Header with Logo */}
      <header className="p-6 flex justify-center border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <img src={logoMroWhite} alt="MRO Logo" className="h-10 sm:h-12 object-contain" />
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 sm:py-20 w-full flex flex-col items-center">
        {/* Status Badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 mb-8 animate-pulse">
          <AlertCircle size={18} />
          <span className="text-sm font-semibold uppercase tracking-wider">Versão Desatualizada</span>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            ATUALIZE SUA VERSÃO
          </h1>
          <p className="text-xl sm:text-2xl text-gray-400 font-medium max-w-2xl mx-auto">
            Detectamos que você está utilizando uma versão antiga. Siga os passos abaixo para atualizar.
          </p>
        </div>

        {/* Video */}
        <div className="w-full max-w-3xl mb-12 aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/eRO6cJM0Ntc?rel=0"
            title="Como atualizar"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Tutorial Content */}
        <div className="w-full bg-[#111] border border-white/5 rounded-3xl p-8 sm:p-12 space-y-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-red-500"></div>
          
          <div className="space-y-8">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <RefreshCw className="text-yellow-500" />
              Como fazer a atualização?
            </h2>
            
            <div className="grid gap-6">
              {/* Step 1 */}
              <div className="flex gap-6 items-start p-6 rounded-2xl bg-white/5 border border-white/5 transition-all hover:bg-white/[0.07]">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black text-xl shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                  1
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white uppercase tracking-wide">Acesse sua área de membros</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Acesse a sua área de membros no link abaixo e vá até a seção <strong>"Instalar e Utilizar"</strong>.
                  </p>
                </div>
              </div>


              {/* Step 2 */}
              <div className="flex gap-6 items-start p-6 rounded-2xl bg-white/5 border border-white/5 transition-all hover:bg-white/[0.07]">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black text-xl shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                  2
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white uppercase tracking-wide">Baixe e Instale a nova versão</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Basta remover a versão antiga, apagar os arquivos antigos, baixar a nova versão e repetir o processo de instalação novamente.
                  </p>
                </div>
              </div>


              {/* Step 3 */}
              <div className="flex gap-6 items-start p-6 rounded-2xl bg-white/5 border border-white/5 transition-all hover:bg-white/[0.07]">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black text-xl shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                  3
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white uppercase tracking-wide">Confirmação de sucesso</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Após instalar a versão nova você verá uma informação na tela de confirmação indicando que a versão está atualizada.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="pt-6">
            <Button 
              onClick={handleMemberAreaClick}
              className="w-full py-8 text-xl font-black bg-yellow-500 hover:bg-yellow-400 text-black rounded-2xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(234,179,8,0.2)] flex items-center justify-center gap-3"
            >
              ACESSAR ÁREA DE MEMBROS
              <ExternalLink size={24} />
            </Button>
            <p className="text-center mt-4 text-sm text-gray-500">
              Link direto: https://maisresultadosonline.com.br/mro-ferramenta
            </p>
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-16 w-full max-w-md text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold uppercase tracking-widest text-gray-500">Precisa de ajuda?</h3>
            <p className="text-gray-400">Entre em contato com nosso suporte agora mesmo.</p>
          </div>
          
          <Button 
            onClick={handleWhatsAppClick}
            variant="outline"
            className="w-full py-8 text-lg font-bold border-green-500/50 text-green-500 hover:bg-green-500 hover:text-black rounded-2xl transition-all flex items-center justify-center gap-3 bg-green-500/5 group"
          >
            <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
            FALAR COM O SUPORTE NO WHATSAPP
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-8 text-center text-gray-600 text-sm border-t border-white/5">
        &copy; {new Date().getFullYear()} MRO Inteligente. Todos os direitos reservados.
      </footer>

      {/* WhatsApp Floating Button (Mobile Only maybe, or both) */}
      <button 
        onClick={handleWhatsAppClick}
        className="fixed bottom-6 right-6 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform z-[100] active:scale-95 sm:hidden"
      >
        <MessageCircle size={32} fill="currentColor" />
      </button>
    </div>
  );
};

export default Atualizar;
