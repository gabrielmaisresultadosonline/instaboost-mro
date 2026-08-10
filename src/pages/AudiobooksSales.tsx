import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, BookOpen, ShieldCheck, Zap, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import VisitasCheckoutModal from '@/components/trafego-pago/VisitasCheckoutModal';

const AudiobooksSales = () => {
  const navigate = useNavigate();
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    // Facebook Pixel PageView event
    if (typeof (window as any).fbq === 'function') {
      (window as any).fbq('track', 'PageView');
    }
  }, []);

  const handleCTA = () => {
    // Facebook Pixel InitiateCheckout event
    if (typeof (window as any).fbq === 'function') {
      (window as any).fbq('track', 'InitiateCheckout');
    }
    setShowCheckout(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-yellow-400 selection:text-black font-sans">
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-4 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-yellow-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <Badge className="bg-green-500 text-white hover:bg-green-600 font-black px-4 py-1.5 text-xs uppercase tracking-widest rounded-full">
            🚀 O SEGREDO PARA VENDER MAIS!
          </Badge>
          
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-[0.9] italic">
            DOMINE AS VENDAS <br />
            <span className="text-green-500 not-italic">COM ESTRATÉGIA</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-zinc-400 font-medium max-w-3xl mx-auto leading-relaxed">
            Tenha acesso a 4 eBooks completos + seus respectivos audiobooks, criados para ajudar você a desenvolver estratégias, comunicação, influência e disciplina para alcançar melhores resultados no marketing e nas vendas.
          </p>

          <div className="pt-8 flex flex-col items-center gap-4">
            <Button 
              onClick={handleCTA}
              className="h-24 px-16 bg-green-500 hover:bg-green-600 text-white font-black text-3xl uppercase italic rounded-3xl shadow-[0_0_60px_rgba(34,197,94,0.4)] transition-all hover:scale-105 active:scale-95 group"
            >
              QUERO ACESSO AGORA <ArrowRight className="ml-4 w-8 h-8 group-hover:translate-x-2 transition-transform" />
            </Button>
            <p className="text-zinc-500 text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-yellow-400" /> Acesso vitalício • Pagamento Único • R$ 37
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Sections */}
      <section className="py-24 bg-zinc-900/40 border-y border-zinc-800/50">
        <div className="max-w-5xl mx-auto px-4 space-y-24">
          
          {/* Ebook 1 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="w-16 h-16 bg-green-500 text-white rounded-2xl flex items-center justify-center font-black text-2xl italic shadow-lg shadow-green-500/20">
                01
              </div>
              <h2 className="text-4xl font-black uppercase italic leading-none">
                📚 48 LEIS DO PODER <br />
                <span className="text-green-500">DO MARKETING DIGITAL</span>
              </h2>
              <p className="text-lg text-zinc-400 leading-relaxed">
                Aprenda estratégias e princípios para se posicionar melhor, criar autoridade, atrair atenção e entender como fortalecer sua presença no marketing digital.
              </p>
              <div className="flex items-center gap-3 p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800">
                <Music className="text-green-500 w-6 h-6" />
                <p className="text-sm font-bold text-zinc-300">🎧 Audiobook incluso: escute todo o conteúdo onde estiver e transforme seu tempo livre em aprendizado.</p>
              </div>
            </div>
            <div className="relative group">
               <div className="absolute -inset-4 bg-green-500/20 rounded-[2rem] blur-2xl group-hover:bg-green-500/30 transition-colors" />
               <div className="relative aspect-[3/4] bg-zinc-800 rounded-3xl border border-zinc-700 overflow-hidden shadow-2xl">
                  <img src="https://adljdeekwifwcdcgbpit.supabase.co/storage/v1/object/public/assets/ebooks/covers/1786318391838-capa_48_leis.png" alt="48 Leis do Poder" className="w-full h-full object-cover" />
               </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={handleCTA}
              className="h-16 px-10 bg-green-500 hover:bg-green-600 text-white font-black text-xl uppercase italic rounded-2xl transition-all shadow-lg shadow-green-500/20"
            >
              LIBERAR ACESSO AGORA <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>

          {/* Ebook 2 */}
          <div className="grid md:grid-cols-2 gap-12 items-center md:flex-row-reverse">
            <div className="order-2 md:order-1 relative group">
               <div className="absolute -inset-4 bg-green-500/20 rounded-[2rem] blur-2xl group-hover:bg-green-500/30 transition-colors" />
               <div className="relative aspect-[3/4] bg-zinc-800 rounded-3xl border border-zinc-700 overflow-hidden shadow-2xl">
                  <img src="https://adljdeekwifwcdcgbpit.supabase.co/storage/v1/object/public/assets/ebooks/covers/1786322106706-capa_psicologia_cores.png" alt="Psicologia das Cores" className="w-full h-full object-cover" />
               </div>
            </div>
            <div className="order-1 md:order-2 space-y-6">
              <div className="w-16 h-16 bg-green-500 text-white rounded-2xl flex items-center justify-center font-black text-2xl italic shadow-lg shadow-green-500/20">
                02
              </div>
              <h2 className="text-4xl font-black uppercase italic leading-none">
                🎨 PSICOLOGIA <br />
                <span className="text-green-500">DAS CORES</span>
              </h2>
              <p className="text-lg text-zinc-400 leading-relaxed">
                Descubra como as cores podem influenciar emoções, percepção e decisões, ajudando você a criar conteúdos, marcas e campanhas mais impactantes.
              </p>
              <div className="flex items-center gap-3 p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800">
                <Music className="text-green-500 w-6 h-6" />
                <p className="text-sm font-bold text-zinc-300">🎧 Audiobook incluso: aprenda sobre o poder das cores de forma prática e fácil, mesmo enquanto trabalha ou realiza outras atividades.</p>
              </div>
            </div>
          </div>

          {/* Ebook 3 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="w-16 h-16 bg-yellow-400 text-black rounded-2xl flex items-center justify-center font-black text-2xl italic shadow-lg shadow-yellow-400/20">
                03
              </div>
              <h2 className="text-4xl font-black uppercase italic leading-none">
                🧠 30 TRUQUES DE <br />
                <span className="text-green-500">MANIPULAÇÃO NO MKT</span>
              </h2>
              <p className="text-lg text-zinc-400 leading-relaxed">
                Conheça técnicas de persuasão, influência e comportamento do consumidor para criar comunicações mais estratégicas e aumentar o poder das suas ofertas.
              </p>
              <div className="flex items-center gap-3 p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800">
                <Music className="text-yellow-400 w-6 h-6" />
                <p className="text-sm font-bold text-zinc-300">🎧 Audiobook incluso: escute as estratégias e aprenda como aplicá-las em suas campanhas e vendas.</p>
              </div>
            </div>
            <div className="relative group">
               <div className="absolute -inset-4 bg-green-500/20 rounded-[2rem] blur-2xl group-hover:bg-green-500/30 transition-colors" />
               <div className="relative aspect-[3/4] bg-zinc-800 rounded-3xl border border-zinc-700 overflow-hidden shadow-2xl">
                  <img src="https://adljdeekwifwcdcgbpit.supabase.co/storage/v1/object/public/assets/ebooks/covers/1786322145292-CAPALIVRO.jpg" alt="30 Truques de Manipulação" className="w-full h-full object-cover" />
               </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={handleCTA}
              className="h-20 px-12 bg-green-500 hover:bg-green-600 text-white font-black text-2xl uppercase italic rounded-2xl shadow-xl transition-all shadow-green-500/20"
            >
              GARANTIR MEU ACESSO R$ 37
            </Button>
          </div>

          {/* Ebook 4 */}
          <div className="grid md:grid-cols-2 gap-12 items-center md:flex-row-reverse">
            <div className="order-2 md:order-1 relative group">
               <div className="absolute -inset-4 bg-green-500/20 rounded-[2rem] blur-2xl group-hover:bg-green-500/30 transition-colors" />
               <div className="relative aspect-[3/4] bg-zinc-800 rounded-3xl border border-zinc-700 overflow-hidden shadow-2xl">
                  <img src="https://adljdeekwifwcdcgbpit.supabase.co/storage/v1/object/public/assets/ebooks/covers/1786322238735-capa_nao_seja_procrastinador.png" alt="Não seja um Procrastinador" className="w-full h-full object-cover" />
               </div>
            </div>
            <div className="order-1 md:order-2 space-y-6">
              <div className="w-16 h-16 bg-yellow-400 text-black rounded-2xl flex items-center justify-center font-black text-2xl italic shadow-lg shadow-yellow-400/20">
                04
              </div>
              <h2 className="text-4xl font-black uppercase italic leading-none">
                ⚡ NÃO SEJA UM <br />
                <span className="text-green-500">PROCRASTINADOR</span>
              </h2>
              <p className="text-lg text-zinc-400 leading-relaxed">
                Aprenda como vencer o hábito de adiar tarefas, aumentar seu foco, desenvolver disciplina e agir com mais consistência para conquistar seus objetivos.
              </p>
              <div className="flex items-center gap-3 p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800">
                <Music className="text-yellow-400 w-6 h-6" />
                <p className="text-sm font-bold text-zinc-300">🎧 Audiobook incluso: transforme momentos do seu dia em aprendizado e mantenha sua mente focada no crescimento.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Summary Section */}
      <section className="py-24 px-4 bg-zinc-950">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <div className="inline-block p-2 rounded-2xl bg-zinc-900 border border-zinc-800">
             <div className="px-6 py-4 bg-yellow-400/10 rounded-xl border border-yellow-400/20">
                <h3 className="text-2xl font-black text-yellow-400 uppercase italic">🔥 UM PACOTE COMPLETO PARA QUEM QUER EVOLUIR!</h3>
             </div>
          </div>
          
          <div className="text-xl md:text-2xl text-zinc-300 leading-relaxed space-y-6 max-w-3xl mx-auto">
            <p>
              Com os 4 eBooks completos + 4 audiobooks, você terá conteúdos sobre estratégia, persuasão, comportamento, comunicação, produtividade e vendas.
            </p>
            <p className="font-bold text-white">
              👉 Leia, escute, aprenda e coloque em prática.
            </p>
            <p className="text-zinc-500 italic">
              O conhecimento pode ser o primeiro passo para você vender mais, comunicar melhor e conquistar resultados cada vez maiores!
            </p>
          </div>

          <Button 
            onClick={handleCTA}
            className="h-24 px-20 bg-green-500 hover:bg-green-600 text-white font-black text-3xl uppercase italic rounded-3xl shadow-[0_0_50px_rgba(34,197,94,0.3)] transition-all hover:scale-105 active:scale-95"
          >
            QUERO O PACOTE COMPLETO
          </Button>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12">
            {[
              { label: "Acesso Vitalício", icon: ShieldCheck },
              { label: "Entrega Imediata", icon: Zap },
              { label: "100% Seguro", icon: Lock },
              { label: "4 Audiobooks", icon: Music }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <item.icon className="w-8 h-8 text-zinc-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{item.label}</span>
              </div>
            ))}
          </div>
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
