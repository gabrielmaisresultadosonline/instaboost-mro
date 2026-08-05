import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function VisitasCheckoutModal({ plan, amount, onClose }: { plan: string, amount: number, onClose: () => void }) {
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
                slug: "trafego-pago-visitas", 
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
        <h2 className="text-xl font-bold">Finalizar Compra</h2>
        <Input placeholder="Nome Completo" value={name} onChange={e => setName(e.target.value)} required />
        <Input placeholder="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <Input placeholder="WhatsApp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required />
        <Button className="w-full bg-emerald-600" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Pagar Agora"}</Button>
        <Button variant="ghost" className="w-full" onClick={onClose}>Cancelar</Button>
      </form>
    </div>
  );
}