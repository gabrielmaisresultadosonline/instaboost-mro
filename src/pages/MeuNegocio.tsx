import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Rocket, Briefcase, ArrowRight, Instagram, CheckSquare, X, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRegisteredIGs, isAuthenticated, getCurrentUser } from '@/lib/userStorage';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/Logo';

// Add the pulse and shine animations to the page
const style = document.createElement('style');
style.textContent = `
  @keyframes shine-loop {
    0% { transform: translateX(-100%); }
    50% { transform: translateX(100%); }
    100% { transform: translateX(100%); }
  }
  @keyframes pulse-soft {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
    70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
  }
  @keyframes pulse-emerald {
    0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
    70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
    100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
  }
  @keyframes pulse-purple {
    0% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4); }
    70% { box-shadow: 0 0 0 15px rgba(168, 85, 247, 0); }
    100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); }
  }
  @keyframes pulse-blue {
    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
    70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
  }
  .animate-shine {
    position: relative;
    overflow: hidden;
  }
  .animate-shine::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    animation: shine-loop 3s infinite;
  }
`;
document.head.appendChild(style);

const MeuNegocioPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  
  const registeredProfiles = getRegisteredIGs();
  const hasRegisteredProfiles = registeredProfiles.length > 0;

  useEffect(() => {
    const authStatus = isAuthenticated();
    if (!authStatus) {
      navigate('/instagram');
      return;
    }
    setIsAuth(true);
    setLoading(false);
  }, [navigate]);

  if (loading || !isAuth) return null;

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white p-4 md:p-8 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => {
              localStorage.setItem('mro_returning_to_welcome', 'true');
              navigate('/instagram');
            }} 
            className="text-white/60 hover:text-white hover:bg-white/5 rounded-full px-6"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Voltar
          </Button>
          <Logo size="sm" />
        </div>

        <div className="space-y-6 text-center">
          <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-[0.2em] mb-2 font-display italic">Meu Negócio</div>
          <h3 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight italic uppercase drop-shadow-2xl">Como iniciar no seu negócio?</h3>
          
          <div className="flex flex-col items-center gap-4 pt-2">
            <button 
              onClick={() => setShowGuide(!showGuide)}
              className="group flex flex-col items-center gap-3 transition-all"
            >
              <div className="flex items-center gap-3 px-10 py-4 rounded-full bg-amber-500 text-black font-black text-xs md:text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(245,158,11,0.4)]">
                {showGuide ? <ChevronUp className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                {showGuide ? "Fechar guia de início" : "Saber mais / Passo a passo"}
              </div>
            </button>

            {/* Top Step-by-step Guide - Animated transition */}
            <div className={`w-full transition-all duration-500 overflow-hidden ${showGuide ? 'max-h-[1000px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
              <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-3 p-6 rounded-[2.5rem] bg-white/5 border border-white/10 text-left group hover:border-emerald-500/30 transition-all duration-500">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-lg shadow-[0_0_20px_rgba(16,185,129,0.1)] group-hover:scale-110 transition-transform">1º</div>
                  <h5 className="text-white font-black text-sm uppercase italic tracking-wider">Conexão Inicial</h5>
                  <p className="text-xs text-white/50 leading-relaxed font-medium">Cadastre pelo menos 1 perfil do Instagram para que nossa I.A. possa realizar a leitura completa dos seus dados.</p>
                </div>
                <div className="flex flex-col gap-3 p-6 rounded-[2.5rem] bg-white/5 border border-white/10 text-left group hover:border-purple-500/30 transition-all duration-500">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 font-black text-lg shadow-[0_0_20px_rgba(168,85,247,0.1)] group-hover:scale-110 transition-transform">2º</div>
                  <h5 className="text-white font-black text-sm uppercase italic tracking-wider">Análise Inteligente</h5>
                  <p className="text-xs text-white/50 leading-relaxed font-medium">Nossa I.A. gera estratégias personalizadas e insights validados baseados no seu nicho e desempenho atual.</p>
                </div>
                <div className="flex flex-col gap-3 p-6 rounded-[2.5rem] bg-white/5 border border-white/10 text-left group hover:border-blue-500/30 transition-all duration-500">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 font-black text-lg shadow-[0_0_20px_rgba(59,130,246,0.1)] group-hover:scale-110 transition-transform">3º</div>
                  <h5 className="text-white font-black text-sm uppercase italic tracking-wider">Execução Automática</h5>
                  <p className="text-xs text-white/50 leading-relaxed font-medium">Utilize a Ferramenta MRO instalada para aplicar as estratégias no automático e escalar sua presença digital.</p>
                </div>
              </div>

              <div className="max-w-3xl mx-auto pt-6">
                <p className="text-white/40 text-xs md:text-sm leading-relaxed font-medium bg-white/5 py-4 px-8 rounded-[2rem] border border-white/5 italic shadow-inner">
                  "O analisador de I.A. identifica o que pode melhorar e entrega o caminho pronto para você executar com a ferramenta MRO trabalhando 24h por você."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 items-stretch pb-20">
            {/* Action 1: Registration */}
            <div className="relative group p-1 rounded-[3rem] bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent h-full">
              <div className="h-full p-8 rounded-[2.9rem] bg-[#0d0d16] border border-white/5 flex flex-col gap-8">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-black text-2xl shadow-inner">01</div>
                <div className="space-y-4">
                  <h4 className="text-white font-black text-2xl uppercase italic leading-tight">CADASTRE SEU INSTAGRAM NA IA DA MRO</h4>
                  <p className="text-white/40 text-xs leading-relaxed font-medium">Conecte sua conta em poucos segundos e descubra insights estratégicos para aumentar seu desempenho.</p>
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                      <p className="text-amber-500 text-[10px] font-black uppercase leading-tight tracking-wider">ATENÇÃO: O CADASTRO É FEITO 1 VEZ. ESTE CADASTRO FIC EM NOSSO BANCO DE DADOS E NÃO PRECISA CADASTRAR NOVAMENTE.</p>
                  </div>
                </div>
                <div className="mt-auto pt-4">
                  <Button 
                    className="w-full py-8 rounded-2xl bg-emerald-800 text-white font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-shine border border-emerald-500/30" 
                    style={{ animation: 'pulse-emerald 2s infinite' }}
                    onClick={() => navigate('/instagram')}
                  >
                    CADASTRAR E ANALISAR <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Action 2: Dashboard */}
            <div className="relative group p-1 rounded-[3rem] bg-gradient-to-br from-purple-500/20 via-transparent to-transparent h-full">
              <div className="h-full p-8 rounded-[2.9rem] bg-[#0d0d16] border border-white/5 flex flex-col gap-8">
                <div className="flex justify-between items-start">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 font-black text-2xl shadow-inner">02</div>
                    {hasRegisteredProfiles && (
                        <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 animate-pulse">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">ON</span>
                        </div>
                    )}
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
                        <Instagram className="w-7 h-7 text-purple-400" />
                    </div>
                    <h4 className="text-white font-black text-2xl uppercase italic">INTELIGÊNCIA MRO</h4>
                  </div>
                  <p className="text-white/40 text-xs leading-relaxed font-medium">Acesse seu painel de estratégias validadas e relatórios de desempenho gerados pela nossa tecnologia.</p>
                  
                  {hasRegisteredProfiles ? (
                    <div className="py-3 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                            <CheckSquare className="w-4 h-4" /> {registeredProfiles.length} perfil(s) vinculado(s)!
                        </p>
                    </div>
                  ) : (
                    <div className="py-3 px-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
                        <p className="text-red-400 text-[10px] font-black uppercase tracking-wider">Nenhuma conta cadastrada!</p>
                    </div>
                  )}
                </div>
                <div className="mt-auto pt-4">
                  <Button 
                    className={`w-full py-8 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all animate-shine ${
                      hasRegisteredProfiles 
                        ? 'bg-emerald-800 text-white hover:bg-emerald-700 shadow-[0_0_25px_rgba(16,185,129,0.3)] border border-emerald-500/30' 
                        : 'bg-white/5 text-white/20 border border-white/10'
                    }`}
                    style={hasRegisteredProfiles ? { animation: 'pulse-emerald 2.5s infinite' } : {}}
                    onClick={() => {
                        if (!hasRegisteredProfiles) {
                            toast({ variant: "destructive", title: "Nenhum perfil cadastrado", description: "Cadastre uma conta primeiro no Passo 01." });
                            return;
                        }
                        navigate('/instagram');
                    }}
                  >
                      ACESSAR DASHBOARD <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Action 3: Tool */}
            <div className="relative group p-1 rounded-[3rem] bg-gradient-to-br from-blue-500/20 via-transparent to-transparent h-full">
              <div className="h-full p-8 rounded-[2.9rem] bg-[#0d0d16] border border-white/5 flex flex-col gap-8">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-black text-2xl shadow-inner">03</div>
                <div className="space-y-4">
                  <h4 className="text-white font-black text-2xl uppercase italic leading-tight">FERRAMENTA MRO</h4>
                  <p className="text-white/40 text-xs leading-relaxed font-medium">Acesso direto, utilize a ferramenta completa em seu navegador com as contas já vinculadas para automação total.</p>
                  <div className="py-3 px-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-wider italic">Software Instalado & Pronto</p>
                  </div>
                </div>
                <div className="mt-auto pt-4">
                  <Button 
                    className={`w-full py-8 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all animate-shine ${
                      hasRegisteredProfiles 
                        ? 'bg-emerald-800 text-white hover:bg-emerald-700 shadow-[0_0_25px_rgba(16,185,129,0.3)] border border-emerald-500/30' 
                        : 'bg-white/5 text-white/20 border border-white/10'
                    }`}
                    style={hasRegisteredProfiles ? { animation: 'pulse-emerald 3s infinite' } : {}}
                    onClick={() => {
                      if (!hasRegisteredProfiles) {
                          toast({ variant: "destructive", title: "Acesso bloqueado", description: "Você precisa cadastrar pelo menos 1 conta que vai utilizar do instagram para acessar essa etapa." });
                          return;
                      }
                      navigate('/mro-ferramenta');
                    }}
                  >
                      INSTALAR E UTILIZAR <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MeuNegocioPage;
