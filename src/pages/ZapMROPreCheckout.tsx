import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight, RefreshCw, UserCheck, Check, ShieldCheck, Zap, Lock, Music } from "lucide-react";
import { trackInitiateCheckout } from '@/lib/facebookTracking';

const ZapMROPreCheckout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planType = searchParams.get('plan') || 'monthly';
  const planName = planType === 'annual' ? 'Plano Anual' : 'Plano Mensal';
  const baseAmount = planType === 'annual' ? 300 : 67;

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("hub_products")
          .select("*")
          .eq("is_active", true)
          .order("order_index", { ascending: true });
        
        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error("Erro ao carregar produtos:", err);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  const totalAmount = baseAmount + selectedBumps.reduce((acc, slug) => {
    const prod = products.find(p => p.slug === slug);
    return acc + (Number(prod?.price) || 0);
  }, 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !username || !phone) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-zapmro-checkout", {
        body: { 
          email: email.toLowerCase().trim(),
          username: username.toLowerCase().trim(),
          phone: phone.replace(/\D/g, "").trim(),
          planType,
          amount: totalAmount,
          selectedBumps
        }
      });
      if (error) throw error;
      trackInitiateCheckout('ZapMRO Checkout', totalAmount);
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
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-start">
        {/* Lado Esquerdo: Checkout */}
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-2">
            <h1 className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Finalize seu Acesso
            </h1>
            <p className="text-zinc-400">Insira seus dados para liberar a ferramenta agora.</p>
          </div>

          <form onSubmit={handleCheckout} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-500 ml-1">E-MAIL</label>
              <Input 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="bg-zinc-900 border-zinc-800 h-12 rounded-xl focus:ring-yellow-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-500 ml-1">USUÁRIO (Login)</label>
              <Input 
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                placeholder="ex: joaosilva"
                className="bg-zinc-900 border-zinc-800 h-12 rounded-xl focus:ring-yellow-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-500 ml-1">WHATSAPP (DDD)</label>
              <Input 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="bg-zinc-900 border-zinc-800 h-12 rounded-xl focus:ring-yellow-400"
              />
            </div>

            <div className="pt-4">
              <Button 
                disabled={loading}
                className="w-full h-16 bg-yellow-400 hover:bg-yellow-500 text-black font-black text-lg rounded-2xl shadow-xl shadow-yellow-400/20 group transition-all"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    PAGAR R$ {totalAmount.toFixed(2).replace('.', ',')}
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap gap-4 justify-center md:justify-start pt-4">
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4 text-green-500" /> Compra Segura
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              <Zap className="w-4 h-4 text-yellow-500" /> Acesso Imediato
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              <Lock className="w-4 h-4 text-blue-500" /> Dados Protegidos
            </div>
          </div>
        </div>

        {/* Lado Direito: Order Bumps */}
        <div className="space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6 sticky top-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h2 className="font-black text-xl">Pedido</h2>
                <p className="text-zinc-500 text-sm">Resumo da compra</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500 uppercase font-black tracking-tighter">Subtotal</p>
                <p className="font-black text-yellow-400 text-2xl">R$ {totalAmount.toFixed(2).replace('.', ',')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-zinc-600 uppercase tracking-widest">Turbine seu Acesso (Order Bump)</h3>
              
              {loadingProducts ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-700" />
                </div>
              ) : products.map((prod) => (
                <div 
                  key={prod.id}
                  onClick={() => toggleBump(prod.slug)}
                  className={`group relative overflow-hidden rounded-2xl border-2 transition-all cursor-pointer p-4 ${
                    selectedBumps.includes(prod.slug) 
                      ? 'border-yellow-400 bg-yellow-400/5' 
                      : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0">
                      <img 
                        src={prod.thumb_url || prod.image} 
                        alt={prod.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-sm leading-tight">{prod.title}</h3>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                          selectedBumps.includes(prod.slug) ? 'bg-yellow-400 border-yellow-400' : 'border-zinc-700'
                        }`}>
                          {selectedBumps.includes(prod.slug) && <Check className="w-3 h-3 text-black font-bold" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2">{prod.description}</p>
                      <p className="text-yellow-400 font-black text-sm pt-1">
                        + R$ {Number(prod.price).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl border-dashed">
              <div className="flex items-center gap-3 text-zinc-400 text-sm">
                <Music className="w-5 h-5 text-yellow-400" />
                <p>Ao adicionar, os produtos serão liberados automaticamente no seu e-mail e painel.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZapMROPreCheckout;
