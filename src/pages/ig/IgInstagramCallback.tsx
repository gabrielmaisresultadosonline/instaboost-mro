/** /IG/auth/instagram/callback — troca o code pelo token no backend. */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IgError } from "@/components/ig/IgStates";
import { igApi, IG_REDIRECT_URI } from "@/lib/ig/api";

const IgInstagramCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "done" | "error">("processing");
  const [message, setMessage] = useState("");
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const denied = params.get("error");

    if (denied || !code || !state) {
      setStatus("error");
      setMessage("A autorização não foi concluída. Tente conectar novamente.");
      return;
    }

    const expected = sessionStorage.getItem("ig_oauth_state");
    if (!expected || expected !== state) {
      setStatus("error");
      setMessage("Não foi possível validar a solicitação. Inicie a conexão novamente.");
      return;
    }
    sessionStorage.removeItem("ig_oauth_state");

    const tenantId = state.split(":")[0];

    igApi
      .exchangeCode({ code, redirect_uri: IG_REDIRECT_URI, tenant_id: tenantId })
      .then(() => {
        setStatus("done");
        setTimeout(() => navigate("/IG/dashboard", { replace: true }), 1200);
      })
      .catch((error: unknown) => {
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : "Não foi possível conectar seu Instagram. Tente novamente.",
        );
      });
  }, [params, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
        {status === "processing" ? (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden />
            <h1 className="mt-5 text-lg font-bold">Conectando sua conta</h1>
            <p className="mt-2 text-sm text-muted-foreground">Estamos finalizando a autorização com a Meta.</p>
          </>
        ) : status === "done" ? (
          <>
            <CheckCircle2 className="mx-auto h-8 w-8 text-primary" aria-hidden />
            <h1 className="mt-5 text-lg font-bold">Instagram conectado</h1>
            <p className="mt-2 text-sm text-muted-foreground">Redirecionando para o seu dashboard...</p>
          </>
        ) : (
          <>
            <IgError message={message} />
            <Button className="mt-5 w-full" onClick={() => navigate("/IG/settings/instagram")}>
              Voltar para configurações
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default IgInstagramCallback;
