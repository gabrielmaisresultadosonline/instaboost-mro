import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Mail, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AudiobooksObrigado = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPaid = searchParams.get('paid') === '1';

  useEffect(() => {
    if (isPaid && typeof (window as any).fbq === 'function') {
      const storedAmount = localStorage.getItem('audiobooks_checkout_amount');
      const finalAmount = storedAmount ? parseFloat(storedAmount) : 37.00;
      
      console.log("Meta Pixel: Tracking Purchase event on /audiobooks/obrigado", finalAmount);
      (window as any).fbq('track', 'Purchase', {
        value: finalAmount,
        currency: 'BRL',
        content_name: 'O Segredo Para Vender Mais - Ebook Hub'
      });
      
      // Limpa após trackear
      localStorage.removeItem('audiobooks_checkout_amount');
    }
  }, [isPaid]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-xl w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 shadow-[0_0_50px_rgba(34,197,94,0.2)]">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="space-y-4">
          <Badge className="bg-yellow-400 text-black hover:bg-yellow-400 font-black px-4 py-1.5 text-xs uppercase tracking-widest rounded-full">
            PAGAMENTO CONFIRMADO!
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic leading-none">
            ACESSO <span className="text-yellow-400">LIBERADO</span>
          </h1>
          <p className="text-xl text-zinc-400 font-medium leading-relaxed">
            Parabéns! Você acaba de dar o primeiro passo para dominar suas vendas.
          </p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Mail className="w-24 h-24" />
          </div>
          
          <div className="flex flex-col items-center gap-4 relative z-10">
            <div className="p-4 bg-yellow-400/10 rounded-2xl border border-yellow-400/20">
              <Mail className="w-8 h-8 text-yellow-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase italic">VERIFIQUE SEU E-MAIL</h2>
              <p className="text-zinc-400 font-bold">
                Seu acesso completo foi enviado agora mesmo para o e-mail cadastrado.
              </p>
            </div>
          </div>

          <div className="pt-4 grid grid-cols-2 gap-4 text-left">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-green-500" /> 100% Seguro
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">
              <Zap className="w-4 h-4 text-yellow-400" /> Entrega Imediata
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Button 
            onClick={() => navigate('/dashboard')}
            className="h-auto py-6 px-8 bg-yellow-400 hover:bg-yellow-500 text-black font-black text-xl uppercase italic rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            ACESSAR DASHBOARD <ArrowRight className="ml-3 w-6 h-6" />
          </Button>
          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em]">
            PRECISA DE AJUDA? FALE COM O SUPORTE NO WHATSAPP
          </p>
        </div>
      </div>
    </div>
  );
};

export default AudiobooksObrigado;
