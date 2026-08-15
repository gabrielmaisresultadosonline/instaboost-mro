import React, { useState, useEffect } from 'react';
import { 
  Users, MessageCircle, Zap, Shield, CheckCircle2, 
  ArrowRight, Play, Star, Gift, Phone, Mail, User,
  Lock, MousePointer2, Loader2, Sparkles, Send, Target, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { trackPageView, trackInitiateCheckout } from '@/lib/facebookTracking';

const LotarGrupos = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    trackPageView('Sales Page - Lotar Grupos');
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("hub_products")
        .select("*")
        .eq("is_active", true)
        .neq("slug", "lotar-grupos")
        .order("order_index", { ascending: true });
      
      if (!error && data) setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const planAmount = 37;
  const totalAmount = planAmount + selectedBumps.reduce((acc, slug) => {
    const prod = products.find(p => p.slug === slug);
    return acc + (Number(prod?.price) || 0);
  }, 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name || !phone) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    try {
      localStorage.setItem('mro_customer_email', email.toLowerCase().trim());
      
      // Using existing zapmro checkout logic adapted for this product
      const { data, error } = await supabase.functions.invoke("create-zapmro-checkout", {
        body: { 
          email: email.toLowerCase().trim(),
          username: name.toLowerCase().trim(), // name as username for identification
          phone: phone.replace(/\D/g, "").trim(),
          planType: 'lotargrupos',
          amount: totalAmount,
          selectedBumps: ['lotar-grupos', ...selectedBumps]
        }
      });
      if (error) throw error;
      
      trackInitiateCheckout('Lotar Grupos', totalAmount);
      window.location.href = data.payment_link;
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar pagamento");
    } finally {
      setLoading(false);
    }
  };

  const toggleBump = (slug: string) => {
    setSelectedBumps(prev => 
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  const modules = [
    { id: '01', title: 'A Propaganda!', desc: 'Como criar anúncios que despertam desejo imediato.' },
    { id: '02', title: 'Criando Pixel no Meta Ads', desc: 'Instalação e configuração para rastreamento perfeito.' },
    { id: '03', title: 'Criando Página de Captura', desc: 'Layouts que convertem visitantes em leads.' },
    { id: '04', title: 'Criando Campanha Leads', desc: 'O passo a passo da segmentação ao lançamento.' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px]" />
      </div>

      {/* Hero */}
      <section className="relative pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold mb-8 animate-pulse">
            <Sparkles className="w-4 h-4" />
            MÉTODO INÉDITO 2026
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight">
            Como Lotar Qualquer Grupo <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
              WhatsApp ou Telegram!
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Técnica infalível com API de conversão Leads utilizando Meta Ads para turbinar seus anúncios!
          </p>
          
          <div className="aspect-video w-full max-w-3xl mx-auto rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center relative group overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
             <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform z-10 shadow-xl shadow-blue-500/20" onClick={() => document.getElementById('price-cards')?.scrollIntoView({ behavior: 'smooth' })}>
               <Play className="w-8 h-8 fill-current" />
             </div>
             <p className="absolute bottom-6 left-6 text-sm font-bold text-white/80 z-10 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
               AULA DEMONSTRATIVA
             </p>
          </div>
        </div>
      </section>

      {/* Content Modules */}
      <section className="py-20 px-4 bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">O Que Você Vai Aprender</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {modules.map((module) => (
              <div key={module.id} className="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 transition-all group">
                <div className="text-3xl font-black text-blue-500/20 group-hover:text-blue-500/40 transition-colors mb-4">{module.id}</div>
                <h3 className="text-xl font-bold mb-2">{module.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{module.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bonus Area */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto p-8 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl shadow-blue-500/10 relative overflow-hidden text-center">
           <div className="absolute top-0 right-0 p-4 opacity-10">
             <Gift className="w-32 h-32" />
           </div>
           <h3 className="text-2xl font-black mb-4">SUPER BÔNUS</h3>
           <p className="text-4xl font-black mb-6">Grupo VIP de Network!</p>
           <p className="text-blue-100 mb-8 opacity-80">Conecte-se com grandes empreendedores e troque estratégias reais.</p>
           <Button 
             onClick={() => document.getElementById('price-cards')?.scrollIntoView({ behavior: 'smooth' })}
             className="bg-white text-blue-600 hover:bg-blue-50 font-black rounded-2xl h-14 px-8"
           >
             QUERO MEU ACESSO AGORA
           </Button>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 px-4" id="price-cards">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Escolha o Seu Plano</h2>
            <p className="text-slate-400">Tenha acesso vitalício ao método e aos bônus exclusivos.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Basic Plan */}
            <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 flex flex-col items-center text-center">
              <h3 className="text-xl font-bold mb-2">Plano Básico</h3>
              <div className="text-4xl font-black text-blue-500 mb-6">R$ 37</div>
              <ul className="text-sm text-slate-400 space-y-3 mb-8 text-left w-full">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Acesso ao Curso</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Suporte por E-mail</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Atualizações Gratuitas</li>
              </ul>
              <Button 
                onClick={() => window.location.href = '/lotargrupos/checkout'}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl"
              >
                COMPRAR AGORA
              </Button>
            </div>

            {/* Recommended Plan */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 border border-blue-400 relative scale-105 shadow-2xl shadow-blue-500/20 flex flex-col items-center text-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-yellow-500 text-black text-[10px] font-black uppercase rounded-full tracking-widest">Recomendado</div>
              <h3 className="text-xl font-bold mb-2">Plano Pro</h3>
              <div className="text-4xl font-black text-white mb-6">R$ 37</div>
              <ul className="text-sm text-blue-100 space-y-3 mb-8 text-left w-full">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-white" /> Tudo do Básico</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-white" /> Grupo VIP VIP</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-white" /> Mentoria Coletiva</li>
              </ul>
              <Button 
                onClick={() => window.location.href = '/lotargrupos/checkout'}
                className="w-full h-14 bg-white text-blue-600 hover:bg-blue-50 font-black rounded-2xl"
              >
                COMPRAR AGORA
              </Button>
            </div>

            {/* VIP Plan */}
            <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 flex flex-col items-center text-center">
              <h3 className="text-xl font-bold mb-2">Plano VIP</h3>
              <div className="text-4xl font-black text-blue-500 mb-6">R$ 37</div>
              <ul className="text-sm text-slate-400 space-y-3 mb-8 text-left w-full">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Tudo do Pro</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Chamadas 1 a 1</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Suporte Prioritário</li>
              </ul>
              <Button 
                onClick={() => window.location.href = '/lotargrupos/checkout'}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl"
              >
                COMPRAR AGORA
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Old Checkout Section Replaced by Pre-Checkout Flow */}
      <section className="py-20 px-4 hidden" id="checkout">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Form */}
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl font-black mb-2">Acesso Imediato</h2>
                <p className="text-slate-400">Preencha seus dados para começar agora mesmo.</p>
              </div>

              <form onSubmit={handleCheckout} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                  <Input 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="João Silva"
                    className="bg-slate-900 border-slate-800 h-14 rounded-2xl focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Melhor E-mail</label>
                  <Input 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className="bg-slate-900 border-slate-800 h-14 rounded-2xl focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                  <Input 
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="bg-slate-900 border-slate-800 h-14 rounded-2xl focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex gap-4 items-center pt-4 opacity-50">
                   <div className="flex items-center gap-1 text-[10px] font-bold uppercase"><Shield className="w-3 h-3 text-green-500" /> SSL Ativo</div>
                   <div className="flex items-center gap-1 text-[10px] font-bold uppercase"><CheckCircle2 className="w-3 h-3 text-blue-500" /> Compra Segura</div>
                </div>
              </form>
            </div>

            {/* Resumo e Bumps */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
              <div className="flex justify-between items-end pb-6 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-lg">Seu Pedido</h3>
                  <p className="text-xs text-slate-500">Lotar Grupos + Bônus VIP</p>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Total</span>
                  <span className="text-3xl font-black text-blue-500">R$ {totalAmount.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Leve também (Ofertas Exclusivas)</h4>
                 
                 {loadingProducts ? (
                   <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-slate-700" /></div>
                 ) : products.map((prod) => (
                   <div 
                     key={prod.id}
                     onClick={() => toggleBump(prod.slug)}
                     className={`group relative overflow-hidden rounded-2xl border-2 transition-all cursor-pointer p-4 ${
                       selectedBumps.includes(prod.slug) 
                         ? 'border-blue-500 bg-blue-500/5' 
                         : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
                     }`}
                   >
                     <div className="flex gap-4 items-center">
                       <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0">
                         <img src={prod.thumb_url || prod.image} alt={prod.title} className="w-full h-full object-cover" />
                       </div>
                       <div className="flex-1">
                         <div className="flex justify-between items-center">
                           <h5 className="font-bold text-sm">{prod.title}</h5>
                           <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                             selectedBumps.includes(prod.slug) ? 'bg-blue-500 border-blue-500' : 'border-slate-700'
                           }`}>
                             {selectedBumps.includes(prod.slug) && <CheckCircle2 className="w-3 h-3 text-white" />}
                           </div>
                         </div>
                         <p className="text-blue-400 font-black text-sm">+ R$ {Number(prod.price).toFixed(2).replace('.', ',')}</p>
                       </div>
                     </div>
                   </div>
                 ))}
              </div>

              <Button 
                onClick={handleCheckout}
                disabled={loading}
                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-black text-xl rounded-2xl shadow-xl shadow-blue-500/20 group transition-all"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    CONFIRMAR AGORA <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
              <p className="text-[10px] text-center text-slate-500 uppercase font-bold tracking-widest">PAGAMENTO ÚNICO • ACESSO IMEDIATO</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-slate-900 text-center text-slate-600 text-sm">
        <p>© 2026 MRO - Mais Resultados Online. Todos os direitos reservados.</p>
        <p className="mt-2 text-[10px] opacity-50 px-4">Este site não faz parte do Facebook ou Facebook Inc. Além disso, este site NÃO é endossado pelo Facebook de nenhuma maneira.</p>
      </footer>
    </div>
  );
};

export default LotarGrupos;
