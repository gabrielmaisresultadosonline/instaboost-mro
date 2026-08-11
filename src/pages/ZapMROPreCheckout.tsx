import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight, RefreshCw, UserCheck, Check, ShieldCheck, Zap, Lock, Music } from "lucide-react";
import { trackInitiateCheckout } from '@/lib/facebookTracking';

const ZapMROPreCheckout = () => {
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

export default function ZapMROPreCheckout() {
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

  const totalAmount = baseAmount + selectedBumps.reduce((acc, slug) => {
    const prod = products.find(p => p.slug === slug);
    return acc + (Number(prod?.price) || 0);
  }, 0);

  const toggleBump = (slug: string) => {
    setSelectedBumps(prev => 
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Por favor, insira um email válido");
      return;
    }
    if (!username || username.length < 4) {
      toast.error("Nome de usuário deve ter no mínimo 4 caracteres");
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
          orderBumps: selectedBumps,
          checkUserExists: true
        }
      });

      if (error || !data.success) {
        toast.error(data?.error || "Erro ao criar checkout");
        return;
      }

      if (data.userExists) {
        toast.error("Este nome de usuário já está em uso.");
        return;
      }

      trackInitiateCheckout(`ZAPMRO ${planName} + Bumps`, totalAmount);
      window.location.href = data.payment_link;
    } catch (err) {
      toast.error("Erro ao processar o pagamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-5xl font-black text-green-400 uppercase italic">
            Finalizar Seu Acesso
          </h1>
          <p className="text-zinc-400 text-lg">
            Você escolheu o <span className="text-white font-bold">{planName}</span>. 
            Preencha seus dados e aproveite as ofertas exclusivas abaixo!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Form Side */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="text-green-400 w-6 h-6" /> Seus Dados de Acesso
            </h2>
            
            <form onSubmit={handleCheckout} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">E-mail para receber o acesso</label>
                <Input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  placeholder="seu@email.com"
                  className="bg-zinc-950 border-zinc-800 h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Nome de Usuário (será sua senha)</label>
                <Input 
                  value={username} 
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))} 
                  required 
                  placeholder="usuario"
                  className="bg-zinc-950 border-zinc-800 h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">WhatsApp</label>
                <Input 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="(00) 00000-0000"
                  className="bg-zinc-950 border-zinc-800 h-12"
                />
              </div>

              <div className="pt-4">
                <Button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-black text-xl py-8 rounded-2xl shadow-lg shadow-green-500/20 uppercase transition-all hover:scale-[1.02]"
                >
                  {loading ? <Loader2 className="animate-spin" /> : `PAGAR R$ ${totalAmount.toFixed(2).replace('.', ',')} 🚀`}
                </Button>
                <p className="text-center text-zinc-500 text-xs mt-4 flex items-center justify-center gap-2">
                  <Lock className="w-3 h-3" /> Pagamento Seguro & Acesso Imediato
                </p>
              </div>
            </form>
          </div>

          {/* Order Bumps Side */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-yellow-400 uppercase italic">
                Aproveite Também!
              </h2>
              <span className="bg-yellow-400/10 text-yellow-400 text-[10px] font-bold px-3 py-1 rounded-full border border-yellow-400/20">
                OFERTAS ÚNICAS
              </span>
            </div>

            <div className="space-y-4">
              {loadingProducts ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-yellow-400" />
                </div>
              ) : products.filter(p => p.slug !== 'zapmro').map((prod) => (
                <div 
                  key={prod.slug}
                  onClick={() => toggleBump(prod.slug)}
                  className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer group ${
                    selectedBumps.includes(prod.slug) 
                    ? 'border-yellow-400 bg-yellow-400/5' 
                    : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 border border-zinc-700">
                      <img src={prod.thumb_url || prod.image} alt={prod.title} className="w-full h-full object-cover" />
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
}
