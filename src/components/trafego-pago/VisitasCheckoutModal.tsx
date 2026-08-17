import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight, RefreshCw, UserCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function VisitasCheckoutModal({ plan, amount, onClose, productSlug = "trafego-pago-visitas" }: { plan: string, amount: number, onClose: () => void, productSlug?: string }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderBumpLifetime, setOrderBumpLifetime] = useState(false);
  const [orderBumpAnalysis, setOrderBumpAnalysis] = useState(false);

  const totalAmount = amount + (orderBumpLifetime ? 9 : 0) + (orderBumpAnalysis ? 19 : 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        // Facebook Pixel Lead event
        if (typeof (window as any).fbq === 'function') {
          (window as any).fbq('track', 'Lead', {
            content_name: productSlug,
            value: totalAmount,
            currency: 'BRL',
            email: email,
            phone: whatsapp
          });
        }
        
        const { data, error } = await supabase.functions.invoke("hub-api", {
            body: { 
                action: "create_checkout", 
                slug: productSlug, 
                email, 
                name, 
                whatsapp,
                orderBumps: {
                    lifetime: orderBumpLifetime,
                    analysis: orderBumpAnalysis
                }
            }
        });
        if (data?.success) {
            window.location.href = data.payment_link;
        } else {
            toast.error(data?.error || "Erro ao criar checkout");
        }
    } catch (e) {
        toast.error("Erro inesperado");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <form onSubmit={handleCheckout} className="bg-zinc-900 p-6 md:p-8 rounded-2xl max-w-sm w-full space-y-4 text-white border border-zinc-800 my-8">
        <h2 className="text-2xl font-black mb-2 text-yellow-400">Finalizar Acesso</h2>
        <p className="text-zinc-400 text-sm mb-4 font-medium">{plan}: R$ {amount.toFixed(2).replace('.', ',')}</p>
        
        <div className="space-y-4">
          <Input placeholder="Nome Completo" value={name} onChange={e => setName(e.target.value)} required className="h-12 bg-zinc-950 border-zinc-800 text-white" />
          <Input placeholder="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 bg-zinc-950 border-zinc-800 text-white" />
          <Input placeholder="WhatsApp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required className="h-12 bg-zinc-950 border-zinc-800 text-white" />
        </div>

        {productSlug === 'audiibooks' && (
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest flex items-center gap-2">
              Ofertas Especiais <RefreshCw className="w-3 h-3 animate-spin-slow" />
            </p>
            
            <div className="relative p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-yellow-400/50 transition-colors group">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="pt-1">
                  <input 
                    type="checkbox" 
                    name="orderBumpLifetime" 
                    checked={orderBumpLifetime}
                    onChange={(e) => setOrderBumpLifetime(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-yellow-400 focus:ring-yellow-400" 
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-bold leading-none">Atualizações Vitalícias</p>
                  <p className="text-[10px] text-zinc-500">Receba novos ebooks/audiobooks +R$ 9</p>
                </div>
              </label>
            </div>

            <div className="relative p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-yellow-400/50 transition-colors group">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="pt-1">
                  <input 
                    type="checkbox" 
                    name="orderBumpAnalysis" 
                    checked={orderBumpAnalysis}
                    onChange={(e) => setOrderBumpAnalysis(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-yellow-400 focus:ring-yellow-400" 
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-bold leading-none">Análise Profissional de Perfil</p>
                    <UserCheck className="w-3 h-3 text-yellow-400" />
                  </div>
                  <p className="text-[10px] text-zinc-500">Vamos analisar seu perfil e pontos de melhoria +R$ 19</p>
                </div>
              </label>
            </div>
          </div>
        )}

        <Button className="w-full bg-yellow-400 hover:bg-yellow-500 h-14 text-[13px] font-black mt-6 text-black shadow-lg shadow-yellow-500/20 uppercase" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : `CONTINUAR PARA PAGAMENTO R$ ${totalAmount.toFixed(2).replace('.', ',')} 🚀`}
        </Button>
        <button type="button" className="w-full text-zinc-500 text-sm font-bold hover:text-zinc-300 py-2" onClick={onClose}>
          Voltar e Revisar
        </button>
      </form>
    </div>
  );
}