import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Rocket, Briefcase, ArrowRight, Instagram, CheckSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRegisteredIGs } from '@/lib/userStorage';
import { useToast } from '@/hooks/use-toast';

const MeuNegocioPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const hasRegisteredProfiles = getRegisteredIGs().length > 0;

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')} 
          className="text-white/60 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Voltar
        </Button>

        <div className="space-y-6 text-center">
          <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-[0.2em] mb-2 font-display">Meu Negócio</div>
          <h3 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight italic uppercase">O que deseja fazer?</h3>
          
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="flex flex-col gap-3 p-6 rounded-[2rem] bg-white/5 border border-white/10 text-left group hover:border-emerald-500/30 transition-all duration-300">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm shadow-[0_0_15px_rgba(16,185,129,0.1)]">1º</div>
              <h5 className="text-white font-black text-sm uppercase italic">Conexão Inicial</h5>
              <p className="text-xs text-white/50 leading-relaxed font-medium">Cadastre pelo menos 1 perfil do Instagram para que nossa I.A. possa realizar a leitura completa dos seus dados.</p>
            </div>
            <div className="flex flex-col gap-3 p-6 rounded-[2rem] bg-white/5 border border-white/10 text-left group hover:border-purple-500/30 transition-all duration-300">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 font-black text-sm shadow-[0_0_15px_rgba(168,85,247,0.1)]">2º</div>
              <h5 className="text-white font-black text-sm uppercase italic">Análise Inteligente</h5>
              <p className="text-xs text-white/50 leading-relaxed font-medium">Nossa I.A. gera estratégias personalizadas e insights validados baseados no seu nicho e desempenho atual.</p>
            </div>
            <div className="flex flex-col gap-3 p-6 rounded-[2rem] bg-white/5 border border-white/10 text-left group hover:border-blue-500/30 transition-all duration-300">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 font-black text-sm shadow-[0_0_15px_rgba(59,130,246,0.1)]">3º</div>
              <h5 className="text-white font-black text-sm uppercase italic">Execução Automática</h5>
              <p className="text-xs text-white/50 leading-relaxed font-medium">Utilize a Ferramenta MRO instalada para aplicar as estratégias no automático e escalar sua presença digital.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
            {/* Step 1 */}
            <div className="relative group p-1 rounded-[2.5rem] bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent">
              <div className="h-full p-8 rounded-[2.4rem] bg-[#0d0d16] border border-white/5 flex flex-col gap-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-black text-2xl">01</div>
                <h4 className="text-white font-black text-2xl uppercase italic leading-tight">CADASTRE SEU INSTAGRAM</h4>
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                    <p className="text-amber-500 text-[10px] font-black uppercase">Cadastro feito 1x apenas.</p>
                </div>
                <Button className="mt-auto w-full py-6 rounded-2xl bg-white text-black font-black" onClick={() => navigate('/registration')}>
                    CADASTRAR E ANALISAR <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative group p-1 rounded-[2.5rem] bg-gradient-to-br from-purple-500/20 via-transparent to-transparent">
              <div className="h-full p-8 rounded-[2.4rem] bg-[#0d0d16] border border-white/5 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 font-black text-2xl">02</div>
                    {hasRegisteredProfiles && (
                        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-black text-emerald-500 uppercase">ON</div>
                    )}
                </div>
                <h4 className="text-white font-black text-2xl uppercase italic leading-tight">INTELIGÊNCIA MRO</h4>
                <div className="flex-grow">
                    {hasRegisteredProfiles ? (
                        <p className="text-emerald-400 text-sm font-bold flex items-center gap-2"><CheckSquare className="w-4 h-4" /> {getRegisteredIGs().length} perfil(s) vinculado(s)!</p>
                    ) : (
                        <p className="text-red-400 text-sm font-bold">Nenhuma conta cadastrada.</p>
                    )}
                </div>
                <Button className="mt-auto w-full py-6 rounded-2xl bg-purple-600 text-white font-black" onClick={() => {
                    if (!hasRegisteredProfiles) {
                        toast({ variant: "destructive", title: "Erro", description: "Cadastre uma conta primeiro." });
                        return;
                    }
                    navigate('/instagram'); // Assuming this triggers the dashboard
                }}>
                    ACESSAR DASHBOARD <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative group p-1 rounded-[2.5rem] bg-gradient-to-br from-blue-500/20 via-transparent to-transparent">
              <div className="h-full p-8 rounded-[2.4rem] bg-[#0d0d16] border border-white/5 flex flex-col gap-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-black text-2xl">03</div>
                <h4 className="text-white font-black text-2xl uppercase italic leading-tight">FERRAMENTA MRO</h4>
                <Button className="mt-auto w-full py-6 rounded-2xl bg-blue-600 text-white font-black" onClick={() => navigate('/mro-ferramenta')}>
                    INSTALAR E UTILIZAR <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MeuNegocioPage;
