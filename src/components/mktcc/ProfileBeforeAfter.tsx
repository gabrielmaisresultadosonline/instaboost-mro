import { ArrowRight, Camera, ImageOff } from "lucide-react";
import { PhoneInstagramPreview, type PhonePreviewPost } from "@/components/mktcc/PhoneInstagramPreview";

interface ProfileBeforeAfterProps {
  /** Print vertical do perfil completo antes do trabalho. */
  beforeUrl?: string;
  companyName: string;
  instagramHandle?: string;
  avatarUrl?: string;
  bio?: string;
  /** Posts que compõem o "depois" (prévia real do feed). */
  posts: PhonePreviewPost[];
  /** Abre a imagem do "antes" em popup (opcional). */
  onOpenBefore?: (url: string) => void;
  onSelectPost?: (postId: string) => void;
}

/**
 * Comparação lado a lado: print do perfil completo (antes) x prévia do feed novo (depois).
 * Usada tanto no painel admin quanto na área do cliente do MktCC.
 */
export const ProfileBeforeAfter = ({
  beforeUrl,
  companyName,
  instagramHandle,
  avatarUrl,
  bio,
  posts,
  onOpenBefore,
  onSelectPost,
}: ProfileBeforeAfterProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] items-start">
      <div className="space-y-2">
        <p className="text-xs font-black uppercase text-muted-foreground text-center">
          Como era o perfil
        </p>
        {beforeUrl ? (
          <button
            type="button"
            onClick={() => onOpenBefore?.(beforeUrl)}
            className="block w-full max-h-[560px] overflow-y-auto rounded-2xl border-[3px] border-foreground bg-muted"
            aria-label="Ver print do perfil antes"
          >
            <img src={beforeUrl} alt={`Perfil completo de ${companyName} antes`} loading="lazy" className="w-full h-auto" />
          </button>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-[3px] border-dashed border-foreground/40 py-16 text-center text-xs font-bold uppercase text-muted-foreground">
            <ImageOff className="w-6 h-6" />
            Nenhum print do perfil completo
          </div>
        )}
      </div>

      <div className="hidden md:flex items-center justify-center pt-16">
        <span className="inline-flex w-11 h-11 items-center justify-center rounded-full bg-primary border-2 border-foreground">
          <ArrowRight className="w-5 h-5 text-primary-foreground" />
        </span>
      </div>

      <div className="space-y-2">
        <p className="flex items-center justify-center gap-1.5 text-xs font-black uppercase text-muted-foreground">
          <Camera className="w-3.5 h-3.5" /> Como vai ficar
        </p>
        <PhoneInstagramPreview
          companyName={companyName}
          instagramHandle={instagramHandle}
          avatarUrl={avatarUrl}
          bio={bio}
          posts={posts}
          onSelect={onSelectPost}
        />
      </div>
    </div>
  );
};
