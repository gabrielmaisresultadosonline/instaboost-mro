import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Mail, Sparkles, ExternalLink } from "lucide-react";

const DeliveryObrigado = () => {
  const [params] = useSearchParams();
  const [paid, setPaid] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    document.title = "Pagamento confirmado - Delivery";
    const nsu = params.get("nsu");
    if (!nsu) { setPaid(false); return; }

    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const { data } = await supabase.functions.invoke("delivery-admin", {
          body: { action: "check_paid", nsu },
        });
        if (data?.paid) {
          setPaid(true);
          setEmail(data.email || "");
          const fbq = (window as any).fbq;
          if (fbq) fbq("track", "Purchase",
            { value: Number(data.amount) || 10, currency: "BRL", content_name: "Delivery MRO" },
            { eventID: nsu }
          );
          return;
        }

      } catch { /* ignore */ }
      if (attempts < 20) setTimeout(poll, 3000);
      else setPaid(false);
    };
    poll();
  }, [params]);

  return (
    <div className="min-h-screen bg-[#04070d] text-white flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-green-500/10 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-yellow-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center space-y-6">
        {paid === null && (
          <div className="bg-white/5 border border-white/10 p-10 rounded-3xl">
            <div className="animate-spin w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-lg">Confirmando seu pagamento...</p>
            <p className="text-gray-400 text-sm mt-2">Isso pode levar alguns segundos.</p>
          </div>
        )}

        {paid === true && (
          <div className="bg-gradient-to-br from-[#0f1a2e] to-[#0a0f1a] border border-green-500/30 p-8 md:p-12 rounded-3xl">
            <CheckCircle2 className="w-20 h-20 text-green-400 mx-auto animate-pulse" />
            <h1 className="text-3xl md:text-5xl font-black mt-4">Pagamento Confirmado!</h1>
            <p className="text-gray-300 text-lg mt-3">
              Sua vaga no grupo está garantida — vamos te mostrar como atrair mais clientes pro seu delivery sem investir em anúncios.
            </p>
            <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-6 text-left">
              <div className="flex items-start gap-3">
                <Mail className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-bold">Enviamos o acesso para seu e-mail:</p>
                  <p className="text-yellow-400 font-mono text-sm mt-1 break-all">{email}</p>
                  <p className="text-gray-400 text-sm mt-3">
                    Dentro do e-mail você encontra o <strong className="text-green-400">link do grupo do WhatsApp</strong> — entre agora para não perder nada.
                  </p>
                  <p className="text-gray-500 text-xs mt-3 italic">
                    ⚠️ Não achou? Verifique também sua caixa de <strong>SPAM</strong> ou <strong>Promoções</strong>.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 rounded-full">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 text-xs font-bold uppercase tracking-widest">Nos vemos no grupo!</span>
            </div>

          </div>
        )}

        {paid === false && (
          <div className="bg-white/5 border border-yellow-500/30 p-10 rounded-3xl">
            <h1 className="text-2xl font-black">Aguardando confirmação</h1>
            <p className="text-gray-400 mt-3">
              Assim que o pagamento for confirmado, enviaremos o acesso para o seu e-mail.
            </p>
            <a href="https://maisresultadosonline.com.br/whatsapp" target="_blank" rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-yellow-400 hover:underline">
              Falar com o suporte no WhatsApp <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryObrigado;
