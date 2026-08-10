import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function VisitasCheckoutModal({ plan, amount, onClose, productSlug = "trafego-pago-visitas" }: { plan: string, amount: number, onClose: () => void, productSlug?: string }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        // Assume API action "create_checkout" exists in hub-api and creates order in hub_orders
        const { data, error } = await supabase.functions.invoke("hub-api", {
            body: { 
                action: "create_checkout", 
                slug: productSlug, 
                email, 
                name, 
                whatsapp 
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleCheckout} className="bg-white p-8 rounded-2xl max-w-sm w-full space-y-4 text-black">
        <h2 className="text-2xl font-black mb-2">Finalizar Acesso</h2>
        <p className="text-gray-500 text-sm mb-4 font-medium">{plan}: R$ {amount.toFixed(2).replace('.', ',')}</p>
        <div className="space-y-4">
          <Input placeholder="Nome Completo" value={name} onChange={e => setName(e.target.value)} required className="h-12 border-gray-200" />
          <Input placeholder="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 border-gray-200" />
          <Input placeholder="WhatsApp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required className="h-12 border-gray-200" />
        </div>
        <Button className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-lg font-black mt-6 shadow-lg shadow-blue-500/20" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : "CONTINUAR PARA PAGAMENTO 🚀"}
        </Button>
        <button type="button" className="w-full text-gray-400 text-sm font-bold hover:text-gray-600 py-2" onClick={onClose}>
          Voltar e Revisar
        </button>
      </form>
    </div>
  );
}