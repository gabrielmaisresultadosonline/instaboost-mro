import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Music, BookOpen, Lock, ShoppingCart, CheckCircle2, Star, ShieldCheck, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import VisitasCheckoutModal from '@/components/trafego-pago/VisitasCheckoutModal';

const AudiobooksSales = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(false);

  const product = {
    title: "O SEGREDO PARA VENDER MAIS !",
    price: 37,
    slug: "audiibooks"
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-yellow-400 selection:text-black">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <Badge className="bg-yellow-400 text-black hover:bg-yellow-500 font-black px-4 py-1 text-xs uppercase tracking-widest">
            EBOOK / AUDIOBOOK HUB
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none italic">
            O SEGREDO PARA <br />
            <span className="text-yellow-400 not-italic">VENDER MAIS !</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-zinc-400 font-medium max-w-2xl mx-auto leading-relaxed">
            Tenha acesso instantâneo aos 4 pilares fundamentais que transformam qualquer negócio em uma máquina de vendas imparável.
          </p>

          <div className="pt-8">
            <Button 
              onClick={() => setShowCheckout(true)}
              className="h-20 px-12 bg-yellow-400 hover:bg-yellow-500 text-black font-black text-2xl uppercase italic rounded-2xl shadow-[0_0_50px_rgba(250,204,21,0.3)] transition-all hover:scale-105 active:scale-95"
            >
              Quero Acesso Agora - R$ 37
            </Button>
            <p className="mt-4 text-zinc-500 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Acesso vitalício & imediato
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-zinc-900/50 border-y border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4 hover:border-yellow-400/50 transition-colors">
            <div className="w-12 h-12 bg-yellow-400/10 rounded-2xl flex items-center justify-center text-yellow-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold uppercase italic">Ebooks Completos</h3>
            <p className="text-zinc-500 font-medium">Material didático aprofundado com estratégias testadas e validadas no campo de batalha.</p>
          </div>
          
          <div className="p-8 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4 hover:border-yellow-400/50 transition-colors">
            <div className="w-12 h-12 bg-yellow-400/10 rounded-2xl flex items-center justify-center text-yellow-400">
              <Music className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold uppercase italic">Versão Audiobook</h3>
            <p className="text-zinc-500 font-medium">Aprenda enquanto dirige, treina ou viaja. Conteúdo otimizado para consumo rápido e prático.</p>
          </div>

          <div className="p-8 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4 hover:border-yellow-400/50 transition-colors">
            <div className="w-12 h-12 bg-yellow-400/10 rounded-2xl flex items-center justify-center text-yellow-400">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold uppercase italic">4 Módulos de Impacto</h3>
            <p className="text-zinc-500 font-medium">Focado exclusivamente no que traz resultado financeiro real para o seu negócio.</p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-3xl font-black uppercase italic">Pare de perder tempo com o que não funciona.</h2>
          <p className="text-zinc-500">
            Junte-se a centenas de empreendedores que já destravaram seus resultados.
          </p>
          <Button 
            onClick={() => setShowCheckout(true)}
            variant="outline"
            className="h-14 px-8 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 font-bold rounded-xl"
          >
            Acessar Área de Membros
          </Button>
        </div>
      </section>

      {showCheckout && (
        <VisitasCheckoutModal 
          onClose={() => setShowCheckout(false)} 
          plan="Acesso Vitalício"
          amount={37}
          productSlug="audiibooks"

        />
      )}

    </div>
  );
};

export default AudiobooksSales;
