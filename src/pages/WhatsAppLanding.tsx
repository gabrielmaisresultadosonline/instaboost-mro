import { useState, useEffect } from "react";
import { MessageCircle, Phone, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const WhatsAppLanding = () => {
  const [settings, setSettings] = useState({
    whatsapp_number: "",
    whatsapp_message: "Gostaria de saber sobre o sistema inovador!",
    page_title: "Gabriel está disponível agora",
    page_subtitle: "Gostaria de saber sobre o sistema inovador?",
    button_text: "FALAR COM GABRIEL AGORA",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("whatsapp_page_settings")
        .select("*")
        .limit(1)
        .single();
      if (data) {
        setSettings({
          whatsapp_number: data.whatsapp_number,
          whatsapp_message: data.whatsapp_message,
          page_title: data.page_title,
          page_subtitle: data.page_subtitle,
          button_text: data.button_text,
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleClick = () => {
    const phone = settings.whatsapp_number.replace(/\D/g, "");
    const msg = encodeURIComponent(settings.whatsapp_message);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] to-[#1a1a2e] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Online indicator */}
        <div className="flex items-center justify-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-green-400 text-sm font-medium">Online agora</span>
        </div>

        {/* Avatar */}
        <div className="flex justify-center">
          <div className="w-28 h-28 rounded-full border-4 border-green-500 overflow-hidden shadow-[0_0_30px_rgba(37,211,102,0.3)]">
            <img
              src="/logo-mro-4.png"
              alt="Gabriel"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {settings.page_title}
          </h1>
          <p className="text-gray-300 text-lg">
            {settings.page_subtitle}
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-3 text-left mx-auto max-w-xs">
          {[
            "Atendimento direto e personalizado",
            "Tire todas as suas dúvidas",
            "Sem compromisso",
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-gray-300 text-sm">{item}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleClick}
          className="w-full py-4 px-6 rounded-2xl font-bold text-lg text-white flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(37,211,102,0.4)]"
          style={{
            background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
          }}
        >
          <MessageCircle className="w-6 h-6" />
          {settings.button_text}
        </button>

        <p className="text-gray-500 text-xs">
          Você será redirecionado para o WhatsApp
        </p>
      </div>
    </div>
  );
};

export default WhatsAppLanding;
