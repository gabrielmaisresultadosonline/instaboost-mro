/**
 * Botão de sincronização com a API oficial da Meta.
 * Traz perfil, mídias, comentários, Directs e contatos reais do Instagram.
 */
import { useState } from "react";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { igApi } from "@/lib/ig/api";

export interface IgSyncButtonProps {
  tenantId: string;
  onDone?: () => void;
  label?: string;
}

export function IgSyncButton({ tenantId, onDone, label = "Sincronizar" }: IgSyncButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const result = await igApi.syncNow(tenantId);
      const parts = [
        `${result.media} mídias`,
        `${result.comments} comentários`,
        `${result.conversations} conversas`,
        `${result.contacts} contatos`,
      ];
      toast({
        title: "Sincronização concluída",
        description: parts.join(" · "),
      });
      if (result.errors.length > 0) {
        toast({
          variant: "destructive",
          title: "Alguns dados não vieram da Meta",
          description: result.errors.slice(0, 2).join(" | "),
        });
      }
      onDone?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível sincronizar",
        description: error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" disabled={loading} onClick={() => void run()}>
      <RefreshCcw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} aria-hidden />
      {loading ? "Sincronizando..." : label}
    </Button>
  );
}

export default IgSyncButton;
