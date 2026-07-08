import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Mail, ArrowRight, Loader2 } from "lucide-react";

const heading = { fontFamily: "Sora, sans-serif" };

export default function PostsComIAObrigado() {
  const [params] = useSearchParams();
  const nsu = params.get("nsu") || "";
  const [state, setState] = useState<"checking" | "ok" | "pending">("checking");
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("postscomia-admin", {
          body: { action: "check_paid", nsu },
        });
        if (data?.paid) {
          setOrder(data.order);
          await supabase.functions.invoke("postscomia-admin", {
            body: { action: "grant_access", nsu },
          });
          const fbq = (window as any).fbq;
          if (fbq) fbq("track", "Purchase", { value: Number(data.order?.amount || 67), currency: "BRL", content_name: "Posts com I.A" });
          setState("ok");
        } else {
          setState("pending");
        }
      } catch {
        setState("pending");
      }
    })();
  }, [nsu]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4" style={{ fontFamily: "Manrope, sans-serif" }}>
      <div className="max-w-lg w-full text-center">
        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-[#eab308]/10 border border-[#eab308]/40 flex items-center justify-center">
          {state === "checking" ? (
            <Loader2 className="w-10 h-10 text-[#eab308] animate-spin" />
          ) : (
            <CheckCircle2 className="w-10 h-10 text-[#eab308]" />
          )}
        </div>

        <div className="text-[10px] font-bold text-[#eab308] uppercase tracking-[0.3em] mb-3">
          Pagamento confirmado
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4" style={heading}>
          Obrigado{order?.name ? `, ${String(order.name).split(" ")[0]}` : ""}!
        </h1>

        <p className="text-[#a1a1aa] leading-relaxed mb-6">
          {state === "pending"
            ? "Assim que a confirmação do pagamento chegar (geralmente em segundos), enviaremos seu e-mail com o acesso."
            : "Enviamos seu acesso para o seu e-mail agora mesmo."}
        </p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4 flex items-start gap-3 text-left">
          <Mail className="w-5 h-5 text-[#eab308] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white">Seu login foi enviado por e-mail</p>
            <p className="text-xs text-[#a1a1aa] mt-1">
              {order?.email
                ? <>Para: <span className="text-white font-mono">{order.email}</span></>
                : "Use o e-mail informado na compra e a senha recebida."}
            </p>
          </div>
        </div>

        <div className="bg-[#eab308]/10 border border-[#eab308]/40 rounded-2xl p-4 mb-6 text-left">
          <p className="text-sm font-bold text-[#eab308] mb-1">⚠️ Confere seu e-mail agora</p>
          <p className="text-xs text-[#f5f5f5]/80 leading-relaxed">
            Pode ser que o e-mail com seu acesso caia na <strong>caixa de SPAM</strong> ou na aba <strong>Promoções</strong>. Se não encontrar na Caixa de Entrada, verifique essas pastas antes de pedir reenvio.
          </p>
        </div>

        <Link
          to="/postscomia/login"
          className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#eab308] text-black font-extrabold text-lg uppercase tracking-wider shadow-[0_15px_30px_rgba(234,179,8,0.3)] hover:translate-y-[-2px] hover:shadow-[0_20px_40px_rgba(234,179,8,0.4)] transition-all"
          style={heading}
        >
          Acessar área de membros <ArrowRight className="w-5 h-5" />
        </Link>

        <p className="mt-6 text-[10px] text-[#71717a] uppercase tracking-widest font-mono">
          Não recebeu o e-mail? Use "esqueci minha senha" na página de login.
        </p>
      </div>
    </div>
  );
}
