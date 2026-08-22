import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, MessageSquareWarning, Clock, CalendarDays, Loader2,
  Upload, Send, PartyPopper, Eye, X,
} from "lucide-react";
import { MediaPopup } from "@/components/MediaPopup";
import { cn } from "@/lib/utils";

export interface ApprovalPost {
  id: string;
  project_id: string;
  post_type: "image" | "video" | "carousel";
  media_urls: string[];
  poster_url: string;
  caption: string;
  cycle_id: string | null;
  status: "pending" | "approved" | "changes";
  client_note: string;
  reviewed_at: string | null;
  is_published: boolean;
}

export interface ApprovalCycle {
  id: string;
  title: string;
  scheduled_date: string | null;
  is_done: boolean;
}

interface RevisionDraft { note: string; media: string[] }

export interface ApprovalsBoardProps {
  posts: ApprovalPost[];
  cycles: ApprovalCycle[];
  revisions: Record<string, RevisionDraft>;
  revisingId: string | null;
  uploading: boolean;
  onRevisionNote: (postId: string, note: string) => void;
  onRevisionFiles: (post: ApprovalPost, files: FileList) => void;
  onApplyRevision: (post: ApprovalPost) => void;
  onOpenCycle: (cycleId: string) => void;
}

const isVideoUrl = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url || "");

const fmtDate = (value: string | null) => {
  if (!value) return "";
  const [y, m, d] = String(value).slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : String(value);
};

const fmtDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";

/**
 * Painel de acompanhamento das aprovações do cliente: mostra tudo separado por
 * programação/data, com prévia em miniatura, o que foi pedido de alteração e a
 * possibilidade de corrigir e devolver para nova aprovação sem sair da aba.
 */
export const ApprovalsBoard = ({
  posts, cycles, revisions, revisingId, uploading,
  onRevisionNote, onRevisionFiles, onApplyRevision, onOpenCycle,
}: ApprovalsBoardProps) => {
  const [filter, setFilter] = useState<"all" | "approved" | "changes" | "pending">("all");
  const [popup, setPopup] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const published = useMemo(() => posts.filter((p) => p.is_published !== false), [posts]);
  const approved = published.filter((p) => p.status === "approved");
  const changes = published.filter((p) => p.status === "changes");
  const pending = published.filter((p) => p.status === "pending");
  const allApproved = published.length > 0 && approved.length === published.length;

  const groups = useMemo(() => {
    const list = cycles.map((c) => ({
      cycle: c,
      items: published.filter((p) => p.cycle_id === c.id),
    }));
    const orphans = published.filter((p) => !p.cycle_id || !cycles.some((c) => c.id === p.cycle_id));
    if (orphans.length > 0) {
      list.push({
        cycle: { id: "none", title: "Sem programação", scheduled_date: null, is_done: false },
        items: orphans,
      });
    }
    return list.filter((g) => g.items.length > 0);
  }, [cycles, published]);

  const matchesFilter = (post: ApprovalPost) =>
    filter === "all" ? true : post.status === filter;

  const thumbOf = (post: ApprovalPost) => {
    const first = post.media_urls?.[0] || "";
    if (isVideoUrl(first)) return post.poster_url || "";
    return first;
  };

  const openPreview = (post: ApprovalPost) => {
    const first = post.media_urls?.[0] || "";
    if (!first) return;
    setPopup({ url: first, type: isVideoUrl(first) ? "video" : "image" });
  };

  const statusBadge = (post: ApprovalPost) => {
    if (post.status === "approved") {
      return <Badge className="bg-primary text-primary-foreground font-black uppercase text-[10px]">Aprovada</Badge>;
    }
    if (post.status === "changes") {
      return <Badge variant="destructive" className="font-black uppercase text-[10px]">Pediu alteração</Badge>;
    }
    return <Badge variant="secondary" className="font-black uppercase text-[10px]">Aguardando</Badge>;
  };

  return (
    <div className="space-y-5">
      {popup && <MediaPopup url={popup.url} type={popup.type} onClose={() => setPopup(null)} />}

      {allApproved && (
        <Card className="border-primary bg-primary/10 rounded-2xl">
          <CardContent className="p-4 flex items-start gap-3">
            <PartyPopper className="w-6 h-6 text-primary shrink-0" />
            <div>
              <p className="font-black uppercase text-sm">Projeto 100% aprovado pelo cliente</p>
              <p className="text-sm text-muted-foreground">
                Todas as {published.length} publicações publicadas foram aprovadas. Você já pode dar continuidade à produção.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {([
          { k: "all", l: "Total", v: published.length, icon: Eye },
          { k: "approved", l: "Aprovados", v: approved.length, icon: CheckCircle2 },
          { k: "changes", l: "Para ajustar", v: changes.length, icon: MessageSquareWarning },
          { k: "pending", l: "Aguardando", v: pending.length, icon: Clock },
        ] as const).map((s) => (
          <button
            key={s.k}
            type="button"
            onClick={() => setFilter(s.k)}
            className={cn(
              "text-left rounded-2xl border bg-card p-4 transition-colors",
              filter === s.k ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/50",
            )}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="w-4 h-4" />
              <p className="text-xs font-bold uppercase">{s.l}</p>
            </div>
            <p className="text-2xl font-black">{s.v}</p>
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma publicação publicada para o cliente ainda.</CardContent></Card>
      )}

      {groups.map(({ cycle, items }) => {
        const visible = items.filter(matchesFilter);
        const cycleApproved = items.every((p) => p.status === "approved");
        const cycleChanges = items.filter((p) => p.status === "changes").length;
        return (
          <Card key={cycle.id} className="rounded-2xl">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                <p className="font-black uppercase text-sm">{cycle.title}</p>
                {cycle.scheduled_date && (
                  <Badge variant="outline" className="font-mono text-[10px]">{fmtDate(cycle.scheduled_date)}</Badge>
                )}
                <Badge
                  className={cn(
                    "font-black uppercase text-[10px]",
                    cycleApproved ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {cycleApproved ? "Programação aprovada" : cycleChanges > 0 ? `${cycleChanges} alteração(ões)` : "Em aprovação"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {items.filter((p) => p.status === "approved").length}/{items.length} aprovadas
                </span>
                {cycle.id !== "none" && (
                  <Button size="sm" variant="outline" className="ml-auto" onClick={() => onOpenCycle(cycle.id)}>
                    Abrir na aba Publicações
                  </Button>
                )}
              </div>

              {visible.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma publicação neste filtro.</p>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                {visible.map((post) => {
                  const thumb = thumbOf(post);
                  const rev = revisions[post.id] || { note: "", media: [] };
                  const isEditing = editingId === post.id;
                  return (
                    <div
                      key={post.id}
                      className={cn(
                        "rounded-xl border p-3 space-y-3",
                        post.status === "changes" && "border-destructive/60 bg-destructive/5",
                        post.status === "approved" && "border-primary/50",
                      )}
                    >
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => openPreview(post)}
                          className="relative w-20 h-24 rounded-lg overflow-hidden bg-muted shrink-0"
                          aria-label="Ver prévia da publicação"
                        >
                          {thumb ? (
                            <img src={thumb} alt={`Prévia da publicação ${post.id}`} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <span className="flex items-center justify-center w-full h-full text-xs text-muted-foreground">Vídeo</span>
                          )}
                          <span className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors" />
                        </button>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {statusBadge(post)}
                            {post.reviewed_at && (
                              <span className="text-[11px] text-muted-foreground">{fmtDateTime(post.reviewed_at)}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                            {post.caption || "Sem legenda"}
                          </p>
                          {post.status === "changes" && post.client_note && (
                            <p className="text-xs font-semibold text-destructive whitespace-pre-wrap">
                              “{post.client_note}”
                            </p>
                          )}
                        </div>
                      </div>

                      {post.status === "changes" && (
                        <div className="space-y-2">
                          {!isEditing ? (
                            <Button size="sm" variant="outline" onClick={() => setEditingId(post.id)}>
                              Corrigir e devolver
                            </Button>
                          ) : (
                            <>
                              <Textarea
                                rows={2}
                                placeholder="O que foi alterado (o cliente vê esta nota)"
                                value={rev.note}
                                onChange={(e) => onRevisionNote(post.id, e.target.value)}
                              />
                              {rev.media.length > 0 && (
                                <p className="text-xs text-muted-foreground">{rev.media.length} novo(s) arquivo(s) pronto(s)</p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                <label className="inline-flex">
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/*,video/mp4,video/webm,video/quicktime"
                                    className="hidden"
                                    onChange={(e) => e.target.files && onRevisionFiles(post, e.target.files)}
                                  />
                                  <span className="inline-flex items-center gap-2 rounded-md border px-3 h-9 text-sm cursor-pointer hover:bg-accent">
                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    Novo arquivo
                                  </span>
                                </label>
                                <Button
                                  size="sm"
                                  onClick={() => onApplyRevision(post)}
                                  disabled={revisingId === post.id}
                                >
                                  {revisingId === post.id
                                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    : <Send className="w-4 h-4 mr-2" />}
                                  Enviar p/ aprovação
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
