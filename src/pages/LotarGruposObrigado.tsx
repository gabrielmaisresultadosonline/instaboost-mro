import React, { useEffect } from 'react';
import { CheckCircle2, MessageCircle, PlayCircle, ShieldCheck, ArrowRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { trackPageView } from '@/lib/facebookTracking';

const LotarGruposObrigado = () => {
  const navigate = useNavigate();

  useEffect(() => {
    trackPageView('Obrigado - Lotar Grupos');
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col items-center justify-center px-4 py-20">
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-2xl w-full text-center space-y-8 relative z-10">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/20 border-2 border-green-500 mb-4 animate-bounce">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>

        <h1 className="text-4xl md:text-5xl font-black tracking-tight">
          PAGAMENTO <br />
          <span className="text-green-500 italic">CONFIRMADO!</span>
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-lg mx-auto leading-relaxed">
          Parabéns! Você acaba de dar o passo definitivo para lotar seus grupos com leads qualificados.
        </p>

        <div className="grid gap-4 mt-12">
          <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 text-left hover:border-blue-500/50 transition-colors group cursor-pointer" onClick={() => navigate('/login')}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-500">
                <PlayCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">Acessar Área de Membros</h3>
                <p className="text-slate-500 text-sm">Suas aulas e materiais já estão liberados.</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-700 group-hover:text-blue-500 transition-colors" />
            </div>
          </div>

          <a href="#" className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 text-left hover:border-green-500/50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-600/20 flex items-center justify-center text-green-500">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">Entrar no Grupo VIP</h3>
                <p className="text-slate-500 text-sm">Faça network com outros empreendedores.</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-700 group-hover:text-green-500 transition-colors" />
            </div>
          </a>
        </div>

        <div className="pt-8 space-y-4">
          <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            ACESSO ENVIADO PARA O SEU E-MAIL
          </div>
          <Button variant="ghost" onClick={() => navigate('/')} className="text-slate-400 hover:text-white gap-2 font-bold">
            <Home className="w-4 h-4" /> VOLTAR PARA A HOME
          </Button>
        </div>
      </div>

      <footer className="mt-20 text-slate-600 text-[10px] text-center uppercase font-bold tracking-[0.2em] opacity-50">
        © 2026 MRO • TECNOLOGIA E RESULTADOS
      </footer>
    </div>
  );
};

export default LotarGruposObrigado;
