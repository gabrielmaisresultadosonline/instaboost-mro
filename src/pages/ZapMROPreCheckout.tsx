import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight, RefreshCw, UserCheck, Check, ShieldCheck, Zap, Lock, Music, MousePointer2 } from "lucide-react";
import { trackInitiateCheckout } from '@/lib/facebookTracking';

const ZapMROPreCheckout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planType = searchParams.get('plan') || 'monthly';
  const planName = planType === 'annual' ? 'Plano Anual' : 'Plano Mensal';
  const planAmount = planType === 'annual' ? 300 : 67;
  const planSlug = planType === 'annual' ? 'zapmro-anual' : 'zapmro-mensal';

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      console.log("ZapMROPreCheckout: Iniciando busca de produtos...");
      try {
        const { data, error } = await supabase
          .from("hub_products")
          .select("*")
          .eq("is_active", true)
          .neq("slug", "zapmro")
          .neq("slug", "zapmro-mensal")
          .neq("slug", "zapmro-anual")
          .order("order_index", { ascending: true });
        
        if (error) {
          console.error("ZapMROPreCheckout: Erro Supabase:", error);
          throw error;
        }
        
        console.log("ZapMROPreCheckout: Produtos encontrados no DB:", data?.length, data);
        
        // Fallback robusto se o banco estiver vazio
        if (!data || data.length === 0) {
          console.log("ZapMROPreCheckout: Usando produtos fallback (DB vazio)");
          const fallbackProducts = [
            {
              id: "fb-1",
              slug: "mro-ferramenta",
              title: "MRO Ferramenta",
              description: "Automação completa para Instagram",
              price: 397,
              is_active: true
            },
            {
              id: "fb-2",
              slug: "postscomia",
              title: "Posts com IA",
              description: "Criação de conteúdo inteligente",
              price: 67,
              is_active: true
            },
            {
              id: "fb-3",
              slug: "trafego-pago",
              title: "Tráfego Pago (Visitas)",
              description: "Aumente suas visitas no perfil",
              price: 47,
              is_active: true
            },
            {
              id: "fb-4",
              slug: "segredo-vender-mais",
              title: "O SEGREDO PARA VENDER MAIS !",
              description: "Ebook + Audiobook estratégico",
              price: 39,
              is_active: true
            }
          ];
          setProducts(fallbackProducts);
        } else {
          setProducts(data);
        }
      } catch (err) {
        console.error("ZapMROPreCheckout: Erro ao carregar produtos:", err);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  const totalAmount = planAmount + selectedBumps.reduce((acc, slug) => {
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
          selectedBumps: [planSlug, ...selectedBumps]
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
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-start pb-20">
        {/* Lado Esquerdo: Dados do Usuário */}
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-2">
            <h1 className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Finalize seu Acesso
            </h1>
            <p className="text-zinc-400">Insira seus dados para liberar a ferramenta agora.</p>
          </div>

          <div className="space-y-4">
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
        </div>

        {/* Lado Direito: Resumo e Order Bumps */}
        <div className="space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6">
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

            <div className="space-y-3 py-2 border-b border-zinc-800/50">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-zinc-300">{planName} (ZAPMRO)</span>
                <span className="text-sm font-black text-white flex items-center gap-2">
                  R$ {planAmount.toFixed(2).replace('.', ',')}
                  <span className="text-[9px] text-red-500 font-bold uppercase px-1.5 py-0.5 bg-red-500/10 rounded">
                    {planType === 'annual' ? 'Anual' : 'Mensal'}
                  </span>
                </span>
              </div>
              {selectedBumps.map(slug => {
                const prod = products.find(p => p.slug === slug);
                if (!prod) return null;
                return (
                  <div key={slug} className="flex justify-between items-center animate-in fade-in slide-in-from-right-2 duration-300">
                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                      <Check className="w-3 h-3 text-yellow-400" /> {prod.title}
                    </span>
                    <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                      + R$ {Number(prod.price).toFixed(2).replace('.', ',')}
                      <span className="text-[9px] text-red-500 font-bold uppercase px-1.5 py-0.5 bg-red-500/10 rounded">
                        Vitalício
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-zinc-200 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-3 h-3 text-yellow-400 animate-pulse" />
                  Aproveite as ofertas
                </h3>
              </div>
              
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
                  {/* Arrows in loop pointing to selection indicator */}
                  {!selectedBumps.includes(prod.slug) && (
                    <div className="absolute top-2 right-8 pointer-events-none">
                      <ArrowRight className="w-3 h-3 text-yellow-400/50 animate-bounce rotate-45" />
                    </div>
                  )}

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
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors relative ${
                          selectedBumps.includes(prod.slug) ? 'bg-yellow-400 border-yellow-400' : 'border-zinc-700'
                        }`}>
                          {selectedBumps.includes(prod.slug) ? (
                            <Check className="w-3 h-3 text-black font-bold" />
                          ) : (
                            <div className="absolute -left-6 top-1/2 -translate-y-1/2">
                              <MousePointer2 className="w-4 h-4 text-yellow-400 animate-pulse opacity-50" />
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2">{prod.description}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <p className="text-yellow-400 font-black text-sm">
                          + R$ {Number(prod.price).toFixed(2).replace('.', ',')}
                        </p>
                        <span className="text-[9px] text-red-500 font-bold uppercase px-1.5 py-0.5 bg-red-500/10 rounded">
                          Vitalício
                        </span>
                      </div>
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

      {/* Botão de Pagar fixo no final (Desktop e Mobile) ou no final do fluxo */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-xl border-t border-zinc-800 z-50">
        <div className="max-w-5xl mx-auto">
          <Button 
            onClick={handleCheckout}
            disabled={loading}
            className="w-full h-16 bg-yellow-400 hover:bg-yellow-500 text-black font-black text-xl rounded-2xl shadow-2xl shadow-yellow-400/20 group transition-all"
          >
            {loading ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : (
              <>
                FINALIZAR PAGAMENTO: R$ {totalAmount.toFixed(2).replace('.', ',')}
                <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ZapMROPreCheckout;
