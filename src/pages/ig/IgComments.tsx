/**
 * /IG/comments — comentários reais recebidos nos posts e Reels,
 * com resposta pública pela API oficial da Meta.
 */
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import IgModuleShell from "@/components/ig/IgModuleShell";
import { IgEmpty, IgError, IgLoading } from "@/components/ig/IgStates";
import { useToast } from "@/hooks/use-toast";
import { igApi, type IgComment } from "@/lib/ig/api";

interface MediaRef {
  id: string;
  permalink: string | null;
  thumbnail_url: string | null;
  media_url: string | null;
  caption: string | null;
}

function formatDateTime(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CommentsList = ({ tenantId }: { tenantId: string }) => {
  const { toast } = useToast();
  const [comments, setComments] = useState<IgComment[]>([]);
  const [media, setMedia] = useState<Record<string, MediaRef>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await igApi.comments(tenantId);
      setComments(result.comments);
      setMedia(Object.fromEntries((result.media as MediaRef[]).map((item) => [item.id, item])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os comentários.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitReply = async (comment: IgComment) => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      await igApi.replyComment(tenantId, comment.id, text);
      toast({ title: "Resposta publicada", description: `Respondido a @${comment.from_username ?? "usuário"}.` });
      setDraft("");
      setReplyFor(null);
      await load();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "O Instagram não aceitou a resposta",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setSending(false);
    }
  };

  if (error) return <IgError message={error} onRetry={load} />;
  if (loading) return <IgLoading label="Carregando comentários..." />;
  if (comments.length === 0) {
    return (
      <IgEmpty
        title="Nenhum comentário sincronizado"
        description="Use Sincronizar para buscar os comentários das suas últimas publicações. Novos comentários também chegam automaticamente pelo webhook da Meta."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {comments.map((comment) => {
        const ref = comment.media_row_id ? media[comment.media_row_id] : undefined;
        return (
          <li key={comment.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex gap-4">
              {ref?.thumbnail_url || ref?.media_url ? (
                <img
                  src={ref.thumbnail_url ?? ref.media_url ?? ""}
                  alt={ref.caption?.slice(0, 60) ?? "Publicação"}
                  loading="lazy"
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    @{comment.from_username ?? "usuário"}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(comment.commented_at)}</span>
                  {comment.replied ? <Badge variant="secondary">Respondido</Badge> : null}
                </div>
                <p className="mt-1 break-words text-sm text-muted-foreground">{comment.text ?? "[sem texto]"}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReplyFor(replyFor === comment.id ? null : comment.id);
                      setDraft("");
                    }}
                  >
                    Responder
                  </Button>
                  {ref?.permalink ? (
                    <Button asChild variant="ghost" size="sm">
                      <a href={ref.permalink} target="_blank" rel="noreferrer noopener">
                        <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                        Ver post
                      </a>
                    </Button>
                  ) : null}
                </div>

                {replyFor === comment.id ? (
                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitReply(comment);
                    }}
                  >
                    <Input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Escreva sua resposta pública"
                      maxLength={2200}
                      aria-label="Resposta ao comentário"
                    />
                    <Button type="submit" size="sm" disabled={sending || !draft.trim()}>
                      <Send className="h-4 w-4" aria-hidden />
                    </Button>
                  </form>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export function IgCommentsPage() {
  return (
    <IgModuleShell title="Comentários" description="Comentários recebidos e resposta pública oficial">
      {({ tenantId }) => <CommentsList tenantId={tenantId} />}
    </IgModuleShell>
  );
}

export default IgCommentsPage;
