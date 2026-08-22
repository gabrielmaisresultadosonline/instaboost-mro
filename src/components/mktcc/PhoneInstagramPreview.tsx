import { useState } from "react";
import { Grid3X3, Heart, Images, Instagram, MessageCircle, Play, Send, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PhonePreviewPost {
  id: string;
  post_type: "image" | "video" | "carousel";
  media_urls: string[];
  poster_url?: string;
  caption?: string;
  aspect_ratio?: string;
}

interface PhoneInstagramPreviewProps {
  companyName: string;
  instagramHandle?: string;
  avatarUrl?: string;
  /** Biografia exibida no cabecalho do perfil. */
  bio?: string;
  posts: PhonePreviewPost[];
  onSelect?: (postId: string) => void;
  /** Quando informado, as miniaturas podem ser arrastadas para mudar a ordem. */
  onReorder?: (orderedIds: string[]) => void;
  className?: string;
}

const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url || "");

/**
 * Mockup de celular simulando o perfil do Instagram, usado tanto na prévia do
 * cliente (/mktcc) quanto no painel administrativo (/mktcc/admin).
 */
export const PhoneInstagramPreview = ({
  companyName,
  instagramHandle,
  avatarUrl,
  bio,
  posts,
  onSelect,
  onReorder,
  className,
}: PhoneInstagramPreviewProps) => {
  const handle = (instagramHandle || companyName || "perfil").replace("@", "").toLowerCase();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Reordena a lista localmente e devolve a nova ordem de ids para persistência.
  const commitDrop = (target: number) => {
    if (dragIndex === null || dragIndex === target) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...posts];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(target, 0, moved);
    setDragIndex(null);
    setOverIndex(null);
    onReorder?.(next.map((p) => p.id));
  };


  return (
    <div className={cn("mx-auto w-full max-w-[320px]", className)}>
      <div className="rounded-[2.5rem] border-[3px] border-foreground bg-foreground p-2 shadow-[8px_8px_0_hsl(var(--foreground)/0.35)]">
        <div className="relative overflow-hidden rounded-[2rem] bg-background">
          <div className="absolute left-1/2 top-2 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-foreground" />

          {/* Barra superior */}
          <div className="flex items-center justify-between border-b-2 border-foreground px-3 pb-2 pt-7">
            <p className="truncate text-sm font-black">{handle}</p>
            <Instagram className="h-4 w-4" />
          </div>

          {/* Cabeçalho do perfil */}
          <div className="space-y-3 px-3 py-3">
            <div className="flex items-center gap-4">
              <div className="mktcc-ring shrink-0">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-muted">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={`Perfil de ${companyName}`} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="flex flex-1 justify-around text-center">
                {[
                  { n: posts.length, l: "posts" },
                  { n: "—", l: "seguidores" },
                  { n: "—", l: "seguindo" },
                ].map((s) => (
                  <div key={s.l}>
                    <p className="text-sm font-black leading-none">{s.n}</p>
                    <p className="text-[10px] font-semibold text-muted-foreground">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="truncate text-xs font-black uppercase">{companyName}</p>
              {bio ? (
                <p className="whitespace-pre-wrap text-[11px] font-medium leading-snug text-foreground">{bio}</p>
              ) : (
                <p className="text-[11px] font-medium text-muted-foreground">Prévia do perfil · Marketing Completo</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-1 border-y-2 border-foreground py-1.5">
            <Grid3X3 className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase">Publicações</span>
          </div>

          {/* Grade do feed em 1080x1350 (4/5) */}
          {posts.length === 0 ? (
            <p className="px-4 py-10 text-center text-[11px] font-semibold text-muted-foreground">
              Nenhuma publicação na prévia ainda.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-[2px] p-[2px]">
              {posts.map((post, index) => {
                const url = post.media_urls?.[0];
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => onSelect?.(post.id)}
                    draggable={!!onReorder}
                    onDragStart={onReorder ? () => setDragIndex(index) : undefined}
                    onDragOver={onReorder ? (e) => { e.preventDefault(); setOverIndex(index); } : undefined}
                    onDragLeave={onReorder ? () => setOverIndex((v) => (v === index ? null : v)) : undefined}
                    onDrop={onReorder ? (e) => { e.preventDefault(); commitDrop(index); } : undefined}
                    onDragEnd={onReorder ? () => { setDragIndex(null); setOverIndex(null); } : undefined}
                    className={cn(
                      "relative aspect-[4/5] overflow-hidden bg-muted",
                      onReorder && "cursor-grab active:cursor-grabbing",
                      dragIndex === index && "opacity-40",
                      overIndex === index && dragIndex !== index && "ring-2 ring-primary",
                    )}
                    aria-label={onReorder ? "Arrastar para reordenar" : "Ver publicação"}
                  >
                    {url && (post.post_type === "video" || isVideoUrl(url)) ? (
                      post.poster_url ? (
                        <img src={post.poster_url} alt={post.caption?.slice(0, 40) || "Miniatura do vídeo"} loading="lazy" className="pointer-events-none h-full w-full object-cover" />
                      ) : (
                        <video src={url} className="h-full w-full object-cover" muted playsInline preload="metadata" autoPlay loop />
                      )
                    ) : url ? (
                      <img src={url} alt={post.caption?.slice(0, 40) || "Publicação"} loading="lazy" className="pointer-events-none h-full w-full object-cover" />
                    ) : null}
                    {onReorder && (
                      <span className="absolute left-1 top-1 rounded bg-foreground/80 px-1 text-[9px] font-black text-background">
                        {index + 1}
                      </span>
                    )}
                    {post.post_type === "carousel" && (
                      <Images className="absolute right-1 top-1 h-3 w-3 text-background drop-shadow" />
                    )}
                    {post.post_type === "video" && (
                      <Play className="absolute right-1 top-1 h-3 w-3 text-background drop-shadow" />
                    )}
                  </button>
                );
              })}
            </div>

          )}

          <div className="flex items-center justify-around border-t-2 border-foreground py-2 text-muted-foreground">
            <Heart className="h-4 w-4" />
            <MessageCircle className="h-4 w-4" />
            <Send className="h-4 w-4" />
            <Grid3X3 className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
