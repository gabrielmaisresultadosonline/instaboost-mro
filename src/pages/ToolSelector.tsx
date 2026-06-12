import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Sparkles, Users, ExternalLink, X, TrendingUp, CreditCard, Target, Wand2, Camera, Code2 } from 'lucide-react';
// Use Camera as fallback if Instagram is not available in some lucide versions
import * as LucideIcons from 'lucide-react';
const InstagramIcon = (LucideIcons as any).Instagram || Camera;


import logoMro from '@/assets/logo-mro.png';
import { trackPageView, trackViewContent } from '@/lib/facebookTracking';

interface ToolOption {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  color: string;
  hoverColor: string;
  borderColor: string;
  badge: string;
  salesPath: string;
}

const ToolSelector = () => {
  const navigate = useNavigate();
  const [showMembersModal, setShowMembersModal] = useState(false);

  // Track PageView on mount
  useEffect(() => {
    trackPageView('Tool Selector - Homepage');
  }, []);

  const tools: ToolOption[] = [
    {
      id: 'instagram',
      name: 'Ferramenta para Instagram',
      subtitle: 'NÃO GASTE COM ANÚNCIOS',
      description: 'Envio em massa de mensagens, engajamento, clientes e vendas.',
      icon: InstagramIcon,
      color: 'from-pink-500 to-purple-600',
      hoverColor: 'hover:from-pink-600 hover:to-purple-700',
      borderColor: 'border-pink-500/30',
      badge: 'MRO I.A',
      salesPath: '/instagram-nova'
    },
    {
      id: 'creatordev',
      name: 'CreatorDev',
      subtitle: 'DESENVOLVIMENTO SOB MEDIDA',
      description: 'Desenvolvemos o sistema que sua empresa precisa.',
      icon: Code2,
      color: 'from-blue-500 to-indigo-600',
      hoverColor: 'hover:from-blue-600 hover:to-indigo-700',
      borderColor: 'border-blue-500/30',
      badge: 'FULL STACK',
      salesPath: '/creatordev'
    }
  ];


  const handleSalesClick = (path: string, toolName: string) => {
    trackViewContent(`Sales Page: ${toolName}`, 'Navigation');
    if (path.startsWith('http')) {
      window.open(path, '_blank');
    } else {
      navigate(path);
    }
  };

  const handleMembersSelect = (platform: 'instagram' | 'zapmro') => {
    trackViewContent(`Members Area: ${platform}`, 'Navigation');
    setShowMembersModal(false);
    if (platform === 'instagram') {
      navigate('/instagram');
    } else {
      navigate('/zapmro');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-600/20 via-black to-blue-600/20 flex flex-col items-center py-8 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px] animate-bounce" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-purple-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
      </div>

      {/* Logo */}
      <div className="mb-6 md:mb-8 z-10">
        <img 
          src={logoMro} 
          alt="MRO" 
          className="h-16 sm:h-20 md:h-24 object-contain drop-shadow-2xl"
        />
      </div>

      {/* Title */}
      <div className="text-center mb-8 md:mb-12 z-10 px-2 max-w-2xl mx-auto">
        <div className="space-y-4">
          <p className="text-xl sm:text-2xl md:text-4xl text-white font-light tracking-tight leading-tight">
            Soluções que <span className="text-amber-400 font-normal italic underline decoration-amber-500/30 underline-offset-4">cabem no seu bolso!</span>
          </p>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg font-medium tracking-wide uppercase opacity-80">
            Ajudamos empreendedores a crescer com tecnologia acessível e resultados reais
          </p>
        </div>
      </div>


      {/* Tool Cards - Sales Pages */}
      <div className="flex flex-wrap justify-center gap-4 md:gap-6 max-w-6xl w-full z-10 px-2 md:px-4">
        {tools.map((tool, index) => (
          <button
            key={tool.id}
            onClick={() => handleSalesClick(tool.salesPath, tool.name)}
            style={{ animationDelay: `${index * 100}ms` }}
            className={`
              relative group p-5 sm:p-6 md:p-8 rounded-2xl border-2 ${tool.borderColor}
              bg-gray-800/50 backdrop-blur-sm 
              w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-16px)] max-w-sm
              transition-all duration-500 ease-out animate-fade-in
              hover:scale-[1.02] md:hover:scale-105 hover:shadow-2xl hover:bg-gray-700/60
              hover:-translate-y-1 md:hover:-translate-y-2
            `}
          >
            {/* Gradient overlay on hover */}
            <div className={`
              absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10
              bg-gradient-to-r ${tool.color} transition-opacity duration-500
            `} />

            {/* Badge */}
            <div className={`
              absolute -top-3 right-4 px-3 md:px-4 py-1 rounded-full text-[10px] md:text-xs font-bold
              bg-gradient-to-r ${tool.color} text-white shadow-lg
            `}>
              {tool.badge}
            </div>

            {/* Icon */}
            <div className={`
              w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-r ${tool.color}
              flex items-center justify-center mb-3 md:mb-4
              group-hover:scale-110 transition-transform duration-300
              shadow-lg
            `}>
              <tool.icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
            </div>

            {/* Subtitle */}
            <p className="text-amber-400 font-bold text-xs sm:text-sm uppercase tracking-wide mb-1 md:mb-2 text-left">
              {tool.subtitle}
            </p>

            {/* Content */}
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 md:mb-2 text-left">
              {tool.name}
            </h2>
            <p className="text-gray-400 text-left text-xs sm:text-sm md:text-base">
              {tool.description}
            </p>

            {/* Arrow indicator */}
            <div className="absolute bottom-4 md:bottom-6 right-4 md:right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />
            </div>
          </button>
        ))}
      </div>

      {/* Área de Membros Cliente Section */}
      <div className="mt-12 md:mt-16 flex flex-col items-center relative">
        {/* Floating Bubble */}
        <div className="absolute -top-12 animate-bounce bg-amber-500 text-black text-[10px] font-bold px-3 py-1 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center gap-1 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-transparent after:border-t-amber-500">
          VOCÊ JÁ É CLIENTE?
        </div>
        
        <button
          onClick={() => setShowMembersModal(true)}
          className="z-10 px-10 py-4 rounded-full border border-amber-500/30 bg-white/5 hover:bg-white/10 text-white/90 hover:text-white font-medium text-sm sm:text-base transition-all duration-300 hover:scale-105 backdrop-blur-md flex items-center gap-3 tracking-wide group relative overflow-hidden"
        >
          {/* Golden Reflection Effect */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-amber-400/40 to-transparent animate-shine-fast" />

          
          <Users className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          ACESSE SUA ÁREA DE MEMBROS
        </button>

      </div>




      {/* Footer with business info */}
      <div className="mt-8 md:mt-12 text-center z-10 space-y-1 px-4">
        <p className="text-gray-400 font-semibold text-sm md:text-base">Mais Resultados Online</p>
        <p className="text-gray-500 text-xs md:text-sm">Gabriel Fernandes da Silva</p>
        <p className="text-gray-500 text-xs md:text-sm">CNPJ: 54.840.738/0001-96</p>
        <p className="text-gray-600 text-[10px] md:text-xs mt-2">© 2024. Todos os direitos reservados.</p>
      </div>

      {/* Modal for Members Area Selection */}
      {showMembersModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowMembersModal(false)}
        >
          <div 
            className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Área de Membros</h3>
                  <p className="text-sm text-gray-400">Qual ferramenta deseja acessar?</p>
                </div>
              </div>
              <button 
                onClick={() => setShowMembersModal(false)}
                className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {/* MRO Instagram */}
              <button
                onClick={() => handleMembersSelect('instagram')}
                className="w-full p-4 rounded-xl border-2 border-gray-600 hover:border-pink-500/50 bg-gray-700/50 hover:bg-gray-700 transition-all duration-300 flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <InstagramIcon className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h4 className="text-white font-bold">MRO Instagram</h4>
                  <p className="text-sm text-gray-400">Ferramenta para Instagram</p>
                </div>
              </button>

              {/* ZAPMRO WhatsApp */}
              <button
                onClick={() => handleMembersSelect('zapmro')}
                className="w-full p-4 rounded-xl border-2 border-gray-600 hover:border-green-500/50 bg-gray-700/50 hover:bg-gray-700 transition-all duration-300 flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h4 className="text-white font-bold">ZAPMRO</h4>
                  <p className="text-sm text-gray-400">Ferramenta para WhatsApp</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolSelector;
