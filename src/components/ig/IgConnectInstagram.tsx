/**
 * Botão de conexão com o Instagram via OAuth oficial da Meta.
 * O App Secret nunca é usado aqui — apenas o App ID público retornado
 * pela Edge Function ig-oauth.
 */
import { useState } from "react";
import { Instagram, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { buildInstagramAuthUrl, igApi } from "@/lib/ig/api";

export interface IgConnectInstagramProps {
  tenantId: string | null;
  size?: "default" | "sm" | "lg";
  className?: string;
  label?: string;
}

export function IgConnectInstagram({
  tenantId,
  size = "lg",
  className,
  label = "CONECTAR INSTAGRAM",
}: IgConnectInstagramProps) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!tenantId) {
      toast({ title: "Workspace não encontrado", description: "Recarregue a página e tente novamente." });
      return;
    }

    setLoading(true);
    try {
      const config = await igApi.oauthConfig();
      // state contém apenas o tenant + nonce; nada sensível.
      const nonce = crypto.randomUUID();
      sessionStorage.setItem("ig_oauth_state", `${tenantId}:${nonce}`);
      window.location.href = buildInstagramAuthUrl(config.app_id, config.scopes, `${tenantId}:${nonce}`);
    } catch (error) {
      toast({
        title: "Não foi possível iniciar a conexão",
        description: error instanceof Error ? error.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Button size={size} className={className} onClick={handleConnect} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Instagram className="mr-2 h-4 w-4" aria-hidden />
      )}
      {label}
    </Button>
  );
}

export default IgConnectInstagram;
