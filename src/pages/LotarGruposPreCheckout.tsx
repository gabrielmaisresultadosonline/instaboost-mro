import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle2, Loader2, ArrowRight, Lock, Phone, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { trackInitiateCheckout, trackPageView, trackLead } from '@/lib/facebookTracking';
import { useLocation, useNavigate } from 'react-router-dom';

const LotarGruposPreCheckout = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    trackPageView('Pre-Checkout - Lotar Grupos');
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("hub_products")
        .select("*")
        .eq("is_active", true)
        .not("slug", "in", '("lotargrupos", "lotar-grupos")')
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
    if (!email || !name || !phone || !password) {
      toast.error("Preencha todos os campos, incluindo a senha para sua área de membros.");
      return;
    }
    setLoading(true);
    try {
      localStorage.setItem('mro_customer_email', email.toLowerCase().trim());
      
      const { data, error } = await supabase.functions.invoke("create-zapmro-checkout", {
        body: { 
          email: email.toLowerCase().trim(),
          username: name.toLowerCase().trim(),
          phone: phone.replace(/\D/g, "").trim(),
          password: password,
          planType: 'lotargrupos',
          amount: totalAmount,
          selectedBumps: ['lotar-grupos', ...selectedBumps]
        }
      });
      if (error) throw error;
      
      trackLead('Lotar Grupos Pre-Checkout', { email: email.toLowerCase().trim(), phone: phone.replace(/\D/g, "").trim(), content_name: 'Lead Lotar Grupos' });
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

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black mb-4">Quase lá!</h1>
          <p className="text-slate-400">Finalize seus dados para liberar seu acesso imediatamente.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Form */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-8">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <User className="text-blue-500" /> Seus Dados de Acesso
            </h2>

            <form onSubmit={handleCheckout} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <User className="w-3 h-3" /> Nome Completo
                </label>
                <Input 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="João Silva"
                  className="bg-slate-950 border-slate-800 h-14 rounded-2xl focus:ring-blue-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Mail className="w-3 h-3" /> Melhor E-mail
                </label>
                <Input 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                  type="email"
                  className="bg-slate-950 border-slate-800 h-14 rounded-2xl focus:ring-blue-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Phone className="w-3 h-3" /> WhatsApp
                </label>
                <Input 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="bg-slate-950 border-slate-800 h-14 rounded-2xl focus:ring-blue-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Lock className="w-3 h-3" /> Crie uma Senha (para a Área de Membros)
                </label>
                <Input 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  className="bg-slate-950 border-slate-800 h-14 rounded-2xl focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="flex gap-4 items-center pt-4 opacity-50">
                 <div className="flex items-center gap-1 text-[10px] font-bold uppercase"><Shield className="w-3 h-3 text-green-500" /> SSL Ativo</div>
                 <div className="flex items-center gap-1 text-[10px] font-bold uppercase"><CheckCircle2 className="w-3 h-3 text-blue-500" /> Compra Segura</div>
              </div>
            </form>
          </div>

          {/* Checkout Summary */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex justify-between items-end pb-6 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-lg">Resumo do Pedido</h3>
                <p className="text-xs text-slate-500">Lotar Grupos (Pagamento Único)</p>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Total</span>
                <span className="text-3xl font-black text-blue-500">R$ {totalAmount.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <div className="space-y-4">
               <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Aproveite estas ofertas</h4>
               
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
              className="w-full h-auto min-h-[64px] py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg md:text-xl rounded-2xl shadow-xl shadow-blue-500/20 group transition-all flex-wrap gap-2 leading-tight"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>
                  <span className="text-center uppercase">Pagar e Liberar Agora</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform shrink-0" />
                </>
              )}
            </Button>
            <p className="text-[10px] text-center text-slate-500 uppercase font-bold tracking-widest">ACESSO VITALÍCIO À ÁREA DE MEMBROS</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LotarGruposPreCheckout;