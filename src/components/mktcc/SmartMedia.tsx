import { useEffect, useState } from "react";

/**
 * Detecta vídeos por extensão e, como camada extra de segurança,
 * faz fallback para <video> caso o carregamento como imagem falhe.
 * Isso garante reprodução mesmo quando a URL não tem extensão reconhecível.
 */
export const isVideoLike = (url: string) =>
  /\.(mp4|webm|mov|m4v|ogv|avi|mkv|3gp|quicktime)(\?|#|$)/i.test(url || "") ||
  /video/i.test(url || "");

export interface SmartMediaProps {
  url: string;
  alt?: string;
  className?: string;
  forceVideo?: boolean;
  controls?: boolean;
  poster?: string;
  onImageClick?: () => void;
}

export const SmartMedia = ({
  url,
  alt = "",
  className = "w-full h-full object-cover",
  forceVideo = false,
  controls = false,
  poster,
  onImageClick,
}: SmartMediaProps) => {
  const [isVideo, setIsVideo] = useState<boolean>(forceVideo || isVideoLike(url));

  useEffect(() => {
    setIsVideo(forceVideo || isVideoLike(url));
  }, [url, forceVideo]);

  if (!url) return null;

  if (isVideo) {
    return (
      <video
        src={url}
        poster={poster || undefined}
        className={className}
        controls={controls}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={className}
      onClick={onImageClick}
      onError={() => setIsVideo(true)}
    />
  );
};

export default SmartMedia;
