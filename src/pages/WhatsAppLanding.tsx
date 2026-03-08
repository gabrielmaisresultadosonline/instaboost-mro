import { useState, useEffect } from "react";
import { MessageCircle, Sparkles, Headset, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackPageView, trackLead } from "@/lib/facebookTracking";

const ICON_MAP: Record<string, React.ElementType> = {
  sparkles: Sparkles,
  headset: Headset,
  help: HelpCircle,
};

interface OptionItem {
  id: string;
  label: string;
  message: string;
  icon_type: string;
  color: string;
  order_index: number;
}

const WhatsAppLanding = () => {
  const [settings, setSettings] = useState({
    whatsapp_number: "",
    page_title: "Gabriel está disponível agora",
    page_subtitle: "Sobre o que gostaria de falar?",
  });
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackPageView("WhatsApp Landing");
    const load = async () => {
      const [settingsRes, optionsRes] = await Promise.all([
        supabase.from("whatsapp_page_settings").select("*").limit(1).single(),
        supabase.from("whatsapp_page_options").select("*").eq("is_active", true).order("order_index"),
      ]);
      if (settingsRes.data) {
        setSettings({
          whatsapp_number: settingsRes.data.whatsapp_number,
          page_title: settingsRes.data.page_title,
          page_subtitle: settingsRes.data.page_subtitle,
        });
      }
      if (optionsRes.data) {
        setOptions(optionsRes.data as OptionItem[]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleOptionClick = (option: OptionItem) => {
    trackLead(`WhatsApp Landing - ${option.label}`);
    const phone = settings.whatsapp_number.replace(/\D/g, "");
    const msg = encodeURIComponent(option.message);
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
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] to-[#1a1a2e] flex flex-col items-center px-4 py-6 sm:py-10">
      <div className="w-full flex justify-center mb-6 sm:mb-10">
        <img src="/logo-mro-4.png" alt="MRO Logo" className="h-10 sm:h-14 object-contain" />
      </div>

      <div className="max-w-md w-full text-center space-y-6 sm:space-y-8 flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-green-400 text-sm font-medium">Online agora</span>
        </div>

        <div className="flex justify-center">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-green-500 overflow-hidden shadow-[0_0_30px_rgba(37,211,102,0.3)]">
            <img src="/logo-mro-4.png" alt="Gabriel" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight">
            {settings.page_title}
          </h1>
          <p className="text-gray-300 text-base sm:text-lg">{settings.page_subtitle}</p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {options.map((option) => {
            const Icon = ICON_MAP[option.icon_type] || MessageCircle;
            return (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option)}
                className="w-full py-4 px-5 rounded-2xl font-semibold text-sm sm:text-base text-white flex items-center gap-4 transition-all duration-300 hover:scale-[1.03] active:scale-95 text-left border border-white/10 hover:border-white/20"
                style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)" }}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: option.color }}>
                  <Icon className="w-5 h-5 text-black" />
                </div>
                <span>{option.label}</span>
                <MessageCircle className="w-5 h-5 text-green-400 ml-auto flex-shrink-0" />
              </button>
            );
          })}
        </div>

        <p className="text-gray-500 text-xs pt-2">Você será redirecionado para o WhatsApp</p>
      </div>
    </div>
  );
};

export default WhatsAppLanding;
