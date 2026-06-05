import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Rocket, ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RendaExtraPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-12 text-center relative">
        <div className="flex justify-start">
            <Button 
                variant="ghost" 
                onClick={() => {
                  localStorage.setItem('mro_returning_to_welcome', 'true');
                  navigate('/instagram');
                }} 
                className="text-white/60 hover:text-white hover:bg-white/5"
            >
                <ArrowLeft className="w-5 h-5 mr-2" /> Voltar
            </Button>
        </div>

        <div className="space-y-6">
          <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-black uppercase tracking-[0.2em] mb-2">Treinamento Exclusivo</div>
          <h3 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase italic">Você já conhece como isso funciona?</h3>
          <p className="text-white/40 text-sm md:text-lg leading-relaxed font-medium max-w-2xl mx-auto">
            Ainda não? Veja então esta live por completo antes de acessar sua área de prestação de serviços.
          </p>
        </div>

        <div className="max-w-3xl mx-auto w-full aspect-video rounded-[2.5rem] overflow-hidden bg-black shadow-2xl border border-white/5">
          <iframe
            src="https://www.youtube.com/embed/-0CHlqHVe0g"
            title="Live MRO Renda Extra"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>

        <div className="flex justify-center pt-4 pb-12">
          <Button
            onClick={() => navigate('/estruturarendaextra')}
            className="w-full max-w-md flex items-center justify-center gap-3 px-8 py-8 rounded-2xl bg-emerald-500 text-black font-black text-xl transition-all hover:scale-[1.05] active:scale-95 uppercase tracking-widest shadow-[0_0_30px_rgba(16,185,129,0.3)] group"
          >
            ACESSAR RENDA EXTRA AGORA <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RendaExtraPage;
