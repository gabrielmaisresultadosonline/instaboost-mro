import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, Users, Camera, Code2, Megaphone } from 'lucide-react';
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
  badge: string;
  salesPath: string;
  index: string;
  highlight?: boolean;
}

const ToolSelector = () => {
  const navigate = useNavigate();
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });

  useEffect(() => {
    trackPageView('Tool Selector - Homepage');
  }, []);

  const tools: ToolOption[] = [
    {
      id: 'instagram',
      name: 'Não gaste com anúncios',
      subtitle: 'Ferramenta para Instagram',
      description: 'Envio em massa de mensagens, engajamento, clientes e vendas. Automatize sua presença e escale seus resultados.',
      icon: InstagramIcon,
      badge: 'MRO I.A',
      salesPath: '/ferramentamropromo',
      index: '01',
    },
    {
      id: 'mktcompleto',
      name: 'Marketing Completo',
      subtitle: 'Gestão + Ads + IA',
      description: 'Ecossistema digital completo. Do tráfego à conversão, todas as ferramentas integradas em um só lugar.',
      icon: Megaphone,
      badge: 'HOT',
      salesPath: '/mktcompleto',
      index: '02',
      highlight: true,
    },
    {
      id: 'creatordev',
      name: 'CreatorDev',
      subtitle: 'Desenvolvimento sob medida',
      description: 'Desenvolvemos o sistema que sua empresa precisa. Soluções técnicas exclusivas para criadores e empresas.',
      icon: Code2,
      badge: '03',
      salesPath: '/creatordev',
      index: '03',
    },
  ];

  const handleSalesClick = (path: string, toolName: string) => {
    trackViewContent(`Sales Page: ${toolName}`, 'Navigation');
    if (path.startsWith('http')) window.open(path, '_blank');
    else navigate(path);
  };

  const handleMembersSelect = (platform: 'instagram' | 'zapmro') => {
    trackViewContent(`Members Area: ${platform}`, 'Navigation');
    setShowMembersModal(false);
    navigate(platform === 'instagram' ? '/instagram' : '/zapmro');
  };

  const handleMove = (e: React.MouseEvent) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    setMouse({ x, y });
  };

  return (
    <div
      onMouseMove={handleMove}
      className="relative min-h-screen w-full bg-[#0d0d0d] overflow-hidden selection:bg-[#c9a84c] selection:text-[#0d0d0d]"
      style={{ fontFamily: "'Hind', system-ui, sans-serif" }}
    >
      {/* Cursor spotlight */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mouse.x}% ${mouse.y}%, rgba(201,168,76,0.08), transparent 40%)`,
        }}
      />
      {/* Grid noise */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035] z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(201,168,76,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {/* Glow orbs */}
      <div className="pointer-events-none absolute -top-40 -right-40 w-[500px] h-[500px] bg-[#c9a84c]/10 rounded-full blur-[140px] z-0" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-[#f0d78c]/5 rounded-full blur-[140px] z-0" />

      <div className="relative z-10 min-h-screen w-full flex items-center justify-center p-6 md:p-12">
        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left column */}
          <div className="lg:col-span-5 flex flex-col space-y-10 lg:space-y-12 lg:sticky lg:top-16">
            <div className="flex flex-col space-y-6 md:space-y-8 animate-fade-in">
              <div className="flex items-center gap-4">
                <img src={logoMro} alt="MRO" className="w-14 h-14 md:w-16 md:h-16 object-contain" />
                <span
                  className="text-[10px] uppercase tracking-[0.35em] text-[#c9a84c]/80"
                  style={{ fontFamily: "'Archivo Black', sans-serif" }}
                >
                  MRO • Premium
                </span>
              </div>

              <h1
                className="text-5xl md:text-6xl lg:text-7xl leading-[1.05] text-white uppercase tracking-tighter"
                style={{ fontFamily: "'Archivo Black', sans-serif" }}
              >
                Soluções{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c9a84c] to-[#f0d78c]">
                  que cabem
                </span>{' '}
                no seu bolso
              </h1>

              <p className="text-[#a0a0a0] text-base md:text-lg max-w-md leading-relaxed">
                Tecnologia de ponta e inovação digital para elevar seu negócio ao próximo nível. Escolha a
                ferramenta ideal para sua jornada.
              </p>
            </div>

            <div className="flex flex-col space-y-4">
              <button
                onClick={() => setShowMembersModal(true)}
                className="group relative overflow-hidden w-full md:w-max px-8 py-5 bg-gradient-to-r from-[#c9a84c] to-[#f0d78c] text-[#0d0d0d] text-sm uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-[0_10px_40px_-10px_rgba(201,168,76,0.6)]"
                style={{ fontFamily: "'Archivo Black', sans-serif" }}
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                <span className="relative flex items-center gap-3">
                  <Users className="w-4 h-4" />
                  Você já é cliente?
                </span>
                <span className="relative block text-[10px] mt-1 opacity-70 font-normal tracking-wider">
                  Acessar área de membros
                </span>
              </button>
            </div>
          </div>

          {/* Right column — staggered tool cards */}
          <div className="lg:col-span-7 grid grid-cols-1 gap-6 md:gap-8">
            {tools.map((tool, i) => {
              const Icon = tool.icon;
              const isLeft = i % 2 === 0;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleSalesClick(tool.salesPath, tool.name)}
                  style={{ animationDelay: `${i * 120}ms`, fontFamily: "'Hind', sans-serif" }}
                  className={`group relative text-left bg-[#1a1a1a] border p-8 lg:p-10 transition-all duration-500 animate-fade-in
                    ${
                      tool.highlight
                        ? 'border-[#c9a84c]/40 hover:border-[#f0d78c] shadow-[20px_20px_60px_rgba(0,0,0,0.5)] lg:ml-auto lg:w-[95%]'
                        : `border-white/5 hover:border-[#c9a84c]/50 ${
                            isLeft ? 'lg:w-[92%] self-start' : 'lg:ml-auto lg:w-[88%]'
                          }`
                    }
                    hover:-translate-y-1 hover:shadow-[0_25px_60px_-15px_rgba(201,168,76,0.25)]`}
                >
                  {/* Corner index badge */}
                  <div
                    className={`absolute -top-4 -right-4 w-20 h-20 flex items-center justify-center text-xs font-bold z-10
                      ${
                        tool.highlight
                          ? 'bg-[#c9a84c] text-[#0d0d0d]'
                          : 'bg-[#c9a84c]/10 border border-[#c9a84c]/20 text-[#c9a84c]'
                      }`}
                    style={{ fontFamily: "'Archivo Black', sans-serif" }}
                  >
                    {tool.badge}
                  </div>

                  {/* Icon */}
                  <div className="mb-6 flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
                        tool.highlight
                          ? 'bg-gradient-to-br from-[#c9a84c] to-[#f0d78c] text-[#0d0d0d]'
                          : 'bg-[#0d0d0d] border border-[#c9a84c]/30 text-[#c9a84c]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-[#c9a84c]">
                      {tool.subtitle}
                    </span>
                  </div>

                  <h3
                    className="text-2xl md:text-3xl text-white mb-4 uppercase leading-tight"
                    style={{ fontFamily: "'Archivo Black', sans-serif" }}
                  >
                    {tool.name}
                  </h3>
                  <p className="text-[#888] mb-8 leading-relaxed text-sm md:text-base max-w-lg">
                    {tool.description}
                  </p>

                  <div className="flex items-center space-x-4">
                    <div
                      className={`h-[1px] w-12 transition-all group-hover:w-20 ${
                        tool.highlight ? 'bg-white' : 'bg-[#c9a84c]'
                      }`}
                    />
                    <span
                      className={`text-xs font-bold uppercase tracking-widest ${
                        tool.highlight ? 'text-white' : 'text-[#c9a84c]'
                      }`}
                    >
                      {tool.highlight ? 'Explorar agora' : 'Saiba mais'} →
                    </span>
                  </div>

                  {/* Shine sweep */}
                  <span className="pointer-events-none absolute inset-0 overflow-hidden">
                    <span className="absolute -inset-y-4 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-[#c9a84c]/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[600%] transition-transform duration-1000" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#c9a84c]/10 mt-16 py-8 px-6 lg:px-12 text-center space-y-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">
          Mais Resultados Online • Gabriel Fernandes da Silva • CNPJ 54.840.738/0001-96
        </p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#444]">
          © 2024 • Todos os direitos reservados
        </p>
      </footer>

      {/* Members modal */}
      {showMembersModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowMembersModal(false)}
        >
          <div
            className="bg-[#1a1a1a] border border-[#c9a84c]/30 rounded-none p-6 max-w-md w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-[#c9a84c] flex items-center justify-center text-[#0d0d0d] text-[10px] uppercase tracking-widest font-bold" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
              VIP
            </div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl uppercase text-white" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                  Área de Membros
                </h3>
                <p className="text-sm text-[#888] mt-1">Qual ferramenta deseja acessar?</p>
              </div>
              <button
                onClick={() => setShowMembersModal(false)}
                className="p-2 hover:bg-[#0d0d0d] transition-colors text-[#c9a84c]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleMembersSelect('instagram')}
                className="w-full p-4 border border-white/5 hover:border-[#c9a84c]/50 bg-[#0d0d0d] hover:bg-[#0d0d0d]/60 transition-all duration-300 flex items-center gap-4 group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-[#c9a84c] to-[#f0d78c] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <InstagramIcon className="w-6 h-6 text-[#0d0d0d]" />
                </div>
                <div className="text-left">
                  <h4 className="text-white uppercase text-sm" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                    MRO Instagram
                  </h4>
                  <p className="text-xs text-[#888]">Ferramenta para Instagram</p>
                </div>
              </button>

              <button
                onClick={() => handleMembersSelect('zapmro')}
                className="w-full p-4 border border-white/5 hover:border-[#c9a84c]/50 bg-[#0d0d0d] hover:bg-[#0d0d0d]/60 transition-all duration-300 flex items-center gap-4 group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-[#c9a84c] to-[#f0d78c] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-6 h-6 text-[#0d0d0d]" />
                </div>
                <div className="text-left">
                  <h4 className="text-white uppercase text-sm" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                    ZAPMRO
                  </h4>
                  <p className="text-xs text-[#888]">Ferramenta para WhatsApp</p>
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
