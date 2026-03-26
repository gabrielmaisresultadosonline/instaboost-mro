import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import bannerImg from "@/assets/whatsappapi-banner.png";
import { MessageCircle } from "lucide-react";

const WhatsAppApi = () => {
  const [whatsappNumber, setWhatsappNumber] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("whatsapp_page_settings")
        .select("whatsapp_number")
        .limit(1)
        .single();
      if (data) setWhatsappNumber(data.whatsapp_number);
    };
    load();
  }, []);

  const handleClick = () => {
    if (!whatsappNumber) return;

    // Facebook Pixel - Lead
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "Lead", {
        content_name: "whatsappapi_click",
        content_category: "whatsapp_funnel",
      });
    }

    window.open(
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Olá, vim pelo site!")}`,
      "_blank"
    );
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-8">
      <Logo size="lg" className="mb-8" />

      <img
        src={bannerImg}
        alt="Zero Anúncios. Resultados Reais."
        className="w-full max-w-lg rounded-2xl mb-10 shadow-2xl"
      />

      <button
        onClick={handleClick}
        disabled={!whatsappNumber}
        className="flex items-center gap-3 bg-[#25D366] hover:bg-[#1fb855] text-white font-bold text-xl px-10 py-5 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <MessageCircle className="w-7 h-7" />
        FALAR NO WHATSAPP
      </button>
    </div>
  );
};

export default WhatsAppApi;
