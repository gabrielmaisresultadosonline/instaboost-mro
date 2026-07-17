import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, Users, Camera, Code2, Megaphone, Sparkles, Zap, ArrowRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
const InstagramIcon = (LucideIcons as any).Instagram || Camera;

import logoMro from '@/assets/logo-mro.png';
import { trackPageView, trackViewContent } from '@/lib/facebookTracking';
import WhatsAppFloatingWidget from '@/components/WhatsAppFloatingWidget';

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
      id: 'postscomia',
      name: 'Curso Completo de I.A',
      subtitle: 'Crie imagens e posts o mês todo',
      description: 'Ilimitado. Aprenda a gerar imagens, posts e criativos profissionais usando I.A todos os dias, sem limites.',
      icon: Sparkles,
      badge: 'NOVO',
      salesPath: '/postscomia',
      index: '02',
    },
    {
      id: 'mktcompleto',
      name: 'Marketing Completo',
      subtitle: 'Gestão + Ads + IA',
      description: 'Ecossistema digital completo. Do tráfego à conversão, todas as ferramentas integradas em um só lugar.',
      icon: Megaphone,
      badge: 'HOT',
      salesPath: '/mktcompleto',
      index: '03',
      highlight: true,
    },
    {
      id: 'creatordev',
      name: 'CreatorDev',
      subtitle: 'Desenvolvimento sob medida',
      description: 'Desenvolvemos o sistema que sua empresa precisa. Soluções técnicas exclusivas para criadores e empresas.',
      icon: Code2,
      badge: '04',
      salesPath: '/creatordev',
      index: '04',
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
      className="relative min-h-screen w-full bg-black overflow-hidden selection:bg-yellow-400 selection:text-black"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Cursor spotlight — electric yellow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(700px circle at ${mouse.x}% ${mouse.y}%, rgba(250,204,21,0.12), transparent 45%)`,
        }}
      />

      {/* Fine grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(250,204,21,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(250,204,21,.6) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        }}
      />

      {/* Diagonal scanlines */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03] z-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,.4) 0 1px, transparent 1px 8px)',
        }}
      />

      {/* Glow orbs — animated */}
      <div className="pointer-events-none absolute -top-40 -right-40 w-[560px] h-[560px] bg-yellow-400/20 rounded-full blur-[160px] z-0 animate-pulse-slow" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-[520px] h-[520px] bg-yellow-300/10 rounded-full blur-[160px] z-0 animate-pulse-slow" style={{ animationDelay: '1.5s' }} />

      {/* Top status bar */}
      <div className="relative z-10 border-b border-white/5 bg-black/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-3 flex items-center justify-between text-[10px] uppercase tracking-[0.25em]">
          <div className="flex items-center gap-2 text-yellow-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
            </span>
            <span className="font-bold">SISTEMA ONLINE</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-white/40">
            <span>MRO · INTELIGÊNCIA APLICADA</span>
            <span className="text-yellow-400/70">v2026</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 min-h-[calc(100vh-40px)] w-full flex items-center justify-center p-6 md:p-12">
        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left column */}
          <div className="lg:col-span-5 flex flex-col space-y-10 lg:space-y-12 lg:sticky lg:top-16">
            <div className="flex flex-col space-y-6 md:space-y-8 animate-fade-in">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-yellow-400/40 blur-2xl rounded-full" />
                  <img src={logoMro} alt="MRO" className="relative w-14 h-14 md:w-16 md:h-16 object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-[0.35em] text-yellow-400 font-bold">MRO</span>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">Mais Resultados Online</span>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 border border-yellow-400/30 bg-yellow-400/5 backdrop-blur-sm">
                <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] uppercase tracking-[0.3em] text-yellow-400 font-bold">
                  Inteligência que vende
                </span>
              </div>

              <h1
                className="text-5xl md:text-6xl lg:text-7xl leading-[1.02] text-white uppercase tracking-tighter font-black"
                style={{ fontFamily: "'Archivo Black', 'Inter', sans-serif" }}
              >
                Soluções{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 animate-gradient-shift" style={{ backgroundSize: '200% auto' }}>
                    inteligentes
                  </span>
                  <span className="absolute -bottom-2 left-0 right-0 h-3 bg-yellow-400/20 blur-lg" />
                </span>{' '}
                para o seu negócio
              </h1>

              <p className="text-white/60 text-lg md:text-xl max-w-md leading-relaxed">
                Tecnologia de ponta e automação com I.A para elevar o seu negócio ao próximo nível. Escolha a ferramenta ideal para a sua jornada.
              </p>

              {/* Metrics strip */}
              <div className="grid grid-cols-3 gap-4 pt-2">
                {[
                  { n: '+1.8k', l: 'Empresas' },
                  { n: '24/7', l: 'Suporte' },
                  { n: '100%', l: 'Automático' },
                ].map((m) => (
                  <div key={m.l} className="border-l-2 border-yellow-400 pl-3">
                    <div className="text-2xl md:text-3xl font-black text-white" style={{ fontFamily: "'Archivo Black', sans-serif" }}>{m.n}</div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-1">{m.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col space-y-4">
              <button
                onClick={() => setShowMembersModal(true)}
                className="group relative overflow-hidden w-full md:w-max px-8 py-5 bg-yellow-400 text-black text-base uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-[0_10px_40px_-10px_rgba(250,204,21,0.7)] hover:shadow-[0_15px_50px_-10px_rgba(250,204,21,0.9)] font-black"
                style={{ fontFamily: "'Archivo Black', sans-serif" }}
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                <span className="relative flex items-center gap-3">
                  <Users className="w-5 h-5" />
                  Você já é cliente?
                </span>
                <span className="relative block text-xs mt-1 opacity-70 font-bold tracking-wider">
                  Acessar área de membros →
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
                  style={{ animationDelay: `${i * 120}ms` }}
                  className={`group relative text-left overflow-hidden bg-gradient-to-br from-neutral-900 to-neutral-950 border p-8 lg:p-10 transition-all duration-500 animate-fade-in
                    ${
                      tool.highlight
                        ? 'border-yellow-400/50 hover:border-yellow-400 shadow-[20px_20px_60px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(250,204,21,0.1)] lg:ml-auto lg:w-[95%]'
                        : `border-white/5 hover:border-yellow-400/60 ${
                            isLeft ? 'lg:w-[92%] self-start' : 'lg:ml-auto lg:w-[88%]'
                          }`
                    }
                    hover:-translate-y-1 hover:shadow-[0_25px_60px_-15px_rgba(250,204,21,0.35)]`}
                >
                  {/* Highlight top bar for the featured card */}
                  {tool.highlight && (
                    <span aria-hidden className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
                  )}

                  {/* Corner index badge */}
                  <div
                    className={`absolute -top-4 -right-4 w-20 h-20 flex items-center justify-center text-xs font-black z-10 transition-transform group-hover:rotate-6
                      ${
                        tool.highlight
                          ? 'bg-yellow-400 text-black shadow-[0_10px_30px_-5px_rgba(250,204,21,0.6)]'
                          : 'bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 backdrop-blur-sm'
                      }`}
                    style={{ fontFamily: "'Archivo Black', sans-serif" }}
                  >
                    {tool.badge}
                  </div>

                  {/* Number watermark */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -bottom-6 -left-2 text-[140px] leading-none font-black text-white/[0.03] select-none"
                    style={{ fontFamily: "'Archivo Black', sans-serif" }}
                  >
                    {tool.index}
                  </span>

                  {/* Icon */}
                  <div className="relative mb-6 flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-3 ${
                        tool.highlight
                          ? 'bg-yellow-400 text-black shadow-[0_0_25px_rgba(250,204,21,0.5)]'
                          : 'bg-black border border-yellow-400/40 text-yellow-400 group-hover:bg-yellow-400 group-hover:text-black'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs md:text-sm uppercase tracking-[0.3em] text-yellow-400 font-bold">
                      {tool.subtitle}
                    </span>
                  </div>

                  <h3
                    className="relative text-2xl md:text-3xl text-white mb-4 uppercase leading-tight"
                    style={{ fontFamily: "'Archivo Black', sans-serif" }}
                  >
                    {tool.name}
                  </h3>
                  <p className="relative text-white/60 mb-8 leading-relaxed text-base md:text-lg max-w-lg">
                    {tool.description}
                  </p>

                  <div className="relative flex items-center space-x-4">
                    <div
                      className={`h-[2px] w-12 transition-all group-hover:w-24 ${
                        tool.highlight ? 'bg-white' : 'bg-yellow-400'
                      }`}
                    />
                    <span
                      className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${
                        tool.highlight ? 'text-white' : 'text-yellow-400'
                      }`}
                    >
                      {tool.highlight ? 'Explorar agora' : 'Saiba mais'}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>

                  {/* Shine sweep */}
                  <span className="pointer-events-none absolute inset-0 overflow-hidden">
                    <span className="absolute -inset-y-4 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[600%] transition-transform duration-1000" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-yellow-400/10 mt-16 py-8 px-6 lg:px-12 text-center space-y-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
          Mais Resultados Online • Gabriel Fernandes da Silva • CNPJ 54.840.738/0001-96
        </p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
          © 2024 • Todos os direitos reservados
        </p>
      </footer>

      {/* Members modal */}
      {showMembersModal && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowMembersModal(false)}
        >
          <div
            className="bg-neutral-950 border border-yellow-400/30 p-6 max-w-md w-full shadow-2xl relative animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <span aria-hidden className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-400 flex items-center justify-center text-black text-[10px] uppercase tracking-widest font-black shadow-[0_10px_30px_-5px_rgba(250,204,21,0.6)]" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
              VIP
            </div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl uppercase text-white" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                  Área de Membros
                </h3>
                <p className="text-sm text-white/50 mt-1">Qual ferramenta deseja acessar?</p>
              </div>
              <button
                onClick={() => setShowMembersModal(false)}
                className="p-2 hover:bg-black transition-colors text-yellow-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleMembersSelect('instagram')}
                className="w-full p-4 border border-white/5 hover:border-yellow-400/50 bg-black hover:bg-neutral-900 transition-all duration-300 flex items-center gap-4 group"
              >
                <div className="w-12 h-12 bg-yellow-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(250,204,21,0.4)]">
                  <InstagramIcon className="w-6 h-6 text-black" />
                </div>
                <div className="text-left">
                  <h4 className="text-white uppercase text-sm" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                    MRO Instagram
                  </h4>
                  <p className="text-xs text-white/50">Ferramenta para Instagram</p>
                </div>
                <ArrowRight className="w-4 h-4 text-yellow-400 ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => handleMembersSelect('zapmro')}
                className="w-full p-4 border border-white/5 hover:border-yellow-400/50 bg-black hover:bg-neutral-900 transition-all duration-300 flex items-center gap-4 group"
              >
                <div className="w-12 h-12 bg-yellow-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(250,204,21,0.4)]">
                  <MessageCircle className="w-6 h-6 text-black" />
                </div>
                <div className="text-left">
                  <h4 className="text-white uppercase text-sm" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                    ZAPMRO
                  </h4>
                  <p className="text-xs text-white/50">Ferramenta para WhatsApp</p>
                </div>
                <ArrowRight className="w-4 h-4 text-yellow-400 ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>
        </div>
      )}

      <WhatsAppFloatingWidget />

      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-shift { animation: gradient-shift 4s ease-in-out infinite; }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scale-in 0.25s ease-out; }
      `}</style>
    </div>
  );
};

export default ToolSelector;
