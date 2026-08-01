import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, Loader2 } from "lucide-react";

export interface VideoThumbPickerProps {
  /** URL pública do vídeo (mp4/webm) já enviado. */
  videoUrl: string;
  /** Miniatura já salva, exibida como referência. */
  posterUrl?: string;
  /** Recebe o frame capturado como JPEG para o pai enviar/salvar. */
  onCapture: (blob: Blob) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
}

/**
 * Seletor de miniatura de vídeo: o admin arrasta a linha do tempo e o frame
 * exibido é capturado em JPEG para virar a capa (poster) do post.
 */
export const VideoThumbPicker = ({
  videoUrl,
  posterUrl,
  onCapture,
  disabled,
  className,
}: VideoThumbPickerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const scrub = (value: number) => {
    setTime(value);
    const video = videoRef.current;
    if (video && Number.isFinite(value)) video.currentTime = value;
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video) return;
    setError("");
    setBusy(true);
    try {
      const width = video.videoWidth || 1080;
      const height = video.videoHeight || 1350;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponível neste navegador");
      ctx.drawImage(video, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("Não foi possível gerar a miniatura");
      await onCapture(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar miniatura");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <div className="space-y-2 rounded-md border-2 border-foreground/20 p-3">
        <p className="text-xs font-black uppercase">Miniatura do vídeo</p>
        <div className="flex gap-3">
          <div className="relative w-28 shrink-0 overflow-hidden rounded-md border-2 border-foreground bg-muted">
            <video
              ref={videoRef}
              src={videoUrl}
              crossOrigin="anonymous"
              preload="metadata"
              muted
              playsInline
              className="aspect-[4/5] w-full object-cover"
              onLoadedMetadata={(e) => {
                const el = e.currentTarget;
                setDuration(Number.isFinite(el.duration) ? el.duration : 0);
                el.currentTime = 0.1;
              }}
            />
          </div>
          {posterUrl && (
            <div className="w-20 shrink-0">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Salva</Label>
              <img
                src={posterUrl}
                alt="Miniatura atual do vídeo"
                className="aspect-[4/5] w-full rounded-md border-2 border-foreground object-cover"
              />
            </div>
          )}
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={time}
          disabled={disabled || busy || !duration}
          onChange={(e) => scrub(Number(e.target.value))}
          className="w-full accent-primary"
          aria-label="Escolher o momento do vídeo para a miniatura"
        />
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground">
            {time.toFixed(1)}s / {duration ? duration.toFixed(1) : "--"}s
          </span>
          <Button size="sm" variant="outline" onClick={capture} disabled={disabled || busy}>
            {busy
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
              : <><Camera className="mr-2 h-4 w-4" /> Usar este frame</>}
          </Button>
        </div>
        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
      </div>
    </div>
  );
};
