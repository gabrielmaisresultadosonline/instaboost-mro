import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const FALLBACK = "https://wa.me/555198488620?text=" + encodeURIComponent("Olá gostaria de aprender sobre a renda extra");

const RendaExtraLeadWaRedirect = () => {
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: invokeError } = await supabase.functions.invoke("rendaextralead-admin", {
          body: { action: "getWhatsappRedirect" },
        });
        if (cancelled) return;
        const url = (data && data.url) || FALLBACK;
        if (invokeError) {
          window.location.replace(FALLBACK);
          return;
        }
        window.location.replace(url);
      } catch {
        if (!cancelled) {
          setError(true);
          window.location.replace(FALLBACK);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 text-green-400 animate-spin mx-auto" />
        <p className="text-white text-lg font-medium">Abrindo WhatsApp...</p>
        {error && (
          <a href={FALLBACK} className="text-green-400 underline">
            Toque aqui se não abrir automaticamente
          </a>
        )}
      </div>
    </div>
  );
};

export default RendaExtraLeadWaRedirect;
