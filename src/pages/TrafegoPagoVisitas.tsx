import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import VisitasCheckoutModal from "@/components/trafego-pago/VisitasCheckoutModal";

export default function TrafegoPagoVisitas() {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
        <h1 className="text-4xl font-black mb-8">Tráfego Pago ( Visitas no perfil )</h1>
        <div className="prose prose-invert max-w-2xl mb-12">
            <p>Neste primeiro módulo, você aprenderá a criar campanhas de Visitas ao Perfil utilizando o novo modelo do Meta Business.</p>
            <p>Esta é apenas a primeira etapa de uma série de módulos exclusivos da MRO Estratégias.</p>
        </div>
        <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 font-bold py-6 px-10 text-xl" onClick={() => setShowModal(true)}>
            Quero Acessar Agora
        </Button>
        {showModal && <VisitasCheckoutModal plan="Trafego" amount={100} onClose={() => setShowModal(false)} />}
    </div>
  );
}