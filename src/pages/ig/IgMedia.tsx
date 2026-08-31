/**
 * /IG/reels e /IG/content — mídias reais do perfil conectado.
 * Métricas exibidas apenas quando a Meta as libera para a conta.
 */
import { useCallback, useEffect, useState } from "react";
import { Eye, Heart, MessageSquare, Bookmark, Share2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import IgModuleShell from "@/components/ig/IgModuleShell";
import { IgEmpty, IgError, IgLoading } from "@/components/ig/IgStates";
import { igApi, type IgMediaItem } from "@/lib/ig/api";

function formatNumber(value: number | null): string {
  return value === null || value === undefined ? "—" : value.toLocaleString("pt-BR");
}

function formatDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

const MediaGrid = ({ tenantId, only }: { tenantId: string; only?: "reels" | "posts" }) => {
  const [items, setItems] = useState<IgMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await igApi.media(tenantId, only);
      setItems(result.media);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as mídias.");
    } finally {
      setLoading(false);
    }
  }, [tenantId, only]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <IgError message={error} onRetry={load} />;
  if (loading) return <IgLoading label="Carregando mídias do Instagram..." />;
  if (items.length === 0) {
    return (
      <IgEmpty
        title="Nenhuma mídia sincronizada ainda"
        description="Use o botão Sincronizar para buscar suas publicações e Reels direto da API oficial da Meta."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <article key={item.id} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="aspect-square w-full bg-muted">
            {item.thumbnail_url || item.media_url ? (
              <img
                src={item.thumbnail_url ?? item.media_url ?? ""}
                alt={item.caption?.slice(0, 90) ?? "Publicação do Instagram"}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary">{item.media_product_type ?? item.media_type ?? "MÍDIA"}</Badge>
              <span className="text-xs text-muted-foreground">{formatDate(item.published_at)}</span>
            </div>
            {item.caption ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">{item.caption}</p>
            ) : null}
            <dl className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" aria-hidden />
                <dd>{formatNumber(item.like_count)}</dd>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                <dd>{formatNumber(item.comments_count)}</dd>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" aria-hidden />
                <dd>{formatNumber(item.views_count ?? item.reach)}</dd>
              </div>
              <div className="flex items-center gap-1">
                <Bookmark className="h-3.5 w-3.5" aria-hidden />
                <dd>{formatNumber(item.saved)}</dd>
              </div>
              <div className="flex items-center gap-1">
                <Share2 className="h-3.5 w-3.5" aria-hidden />
                <dd>{formatNumber(item.shares)}</dd>
              </div>
            </dl>
            {item.permalink ? (
              <Button asChild variant="outline" size="sm" className="w-full">
                <a href={item.permalink} target="_blank" rel="noreferrer noopener">
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                  Abrir no Instagram
                </a>
              </Button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
};

export function IgReelsPage() {
  return (
    <IgModuleShell title="Reels" description="Desempenho real dos seus Reels segundo os Insights da Meta">
      {({ tenantId }) => <MediaGrid tenantId={tenantId} only="reels" />}
    </IgModuleShell>
  );
}

export function IgContentPage() {
  return (
    <IgModuleShell title="Conteúdo" description="Publicações e carrosséis sincronizados da sua conta">
      {({ tenantId }) => <MediaGrid tenantId={tenantId} only="posts" />}
    </IgModuleShell>
  );
}

export default IgReelsPage;
