import { useState, useRef, useEffect, useCallback } from "react";
import { Download, Upload, Clipboard, RotateCcw, ZoomIn, ZoomOut, Move } from "lucide-react";
import { toast } from "sonner";

type Format = "stories" | "feed";

const FORMATS: Record<Format, { w: number; h: number; label: string }> = {
  stories: { w: 1080, h: 1920, label: "Stories (9:16)" },
  feed: { w: 1080, h: 1080, label: "Feed (1:1)" },
};

const ImageCropEditor = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [format, setFormat] = useState<Format>("stories");
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const fmt = FORMATS[format];
  const aspect = fmt.w / fmt.h;

  // Load image from file or paste
  const loadImage = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Arquivo não é uma imagem");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  }, []);

  // Paste handler
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) loadImage(file);
          e.preventDefault();
          break;
        }
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [loadImage]);

  // When image src changes, load natural dimensions
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
      imgRef.current = img;

      // Auto-fit: scale so image covers the canvas area
      const scaleX = fmt.w / img.naturalWidth;
      const scaleY = fmt.h / img.naturalHeight;
      const autoScale = Math.max(scaleX, scaleY);
      setScale(autoScale);
      setPosition({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc, format]);

  // Drag handlers
  const onPointerDown = (e: React.PointerEvent) => {
    if (!imageSrc) return;
    setDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const onPointerUp = () => setDragging(false);

  // Wheel zoom
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((prev) => Math.max(0.1, Math.min(10, prev - e.deltaY * 0.001)));
  };

  // Download
  const handleDownload = () => {
    if (!imgRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = fmt.w;
    canvas.height = fmt.h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, fmt.w, fmt.h);

    // Calculate position relative to canvas center
    const drawW = imgRef.current.naturalWidth * scale;
    const drawH = imgRef.current.naturalHeight * scale;
    const cx = fmt.w / 2 + position.x * (fmt.w / getPreviewWidth());
    const cy = fmt.h / 2 + position.y * (fmt.h / getPreviewHeight());
    const dx = cx - drawW / 2;
    const dy = cy - drawH / 2;

    ctx.drawImage(imgRef.current, dx, dy, drawW, drawH);

    const link = document.createElement("a");
    link.download = `foto-${format}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Imagem baixada!");
  };

  const getPreviewWidth = () => {
    if (!containerRef.current) return 300;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    if (containerW / containerH > aspect) {
      return containerH * aspect;
    }
    return containerW;
  };

  const getPreviewHeight = () => {
    if (!containerRef.current) return 300;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    if (containerW / containerH > aspect) {
      return containerH;
    }
    return containerW / aspect;
  };

  // Render preview
  const previewW = getPreviewWidth();
  const previewH = getPreviewHeight();
  const scaleRatio = previewW / fmt.w;
  const drawW = imgNatural.w * scale * scaleRatio;
  const drawH = imgNatural.h * scale * scaleRatio;

  return (
    <div className="space-y-4">
      {/* Format selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-400">Formato:</span>
        {(Object.keys(FORMATS) as Format[]).map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              format === f
                ? "bg-purple-600 text-white"
                : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-purple-500/30"
            }`}
          >
            {FORMATS[f].label}
          </button>
        ))}
      </div>

      {/* Upload area or Canvas */}
      <div
        ref={containerRef}
        className="relative w-full bg-black/40 border-2 border-dashed border-white/10 rounded-2xl overflow-hidden flex items-center justify-center"
        style={{ height: format === "stories" ? "70vh" : "50vh" }}
        onWheel={onWheel}
      >
        {!imageSrc ? (
          <div className="text-center p-8">
            <Upload className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2 text-sm">Arraste uma imagem, cole com <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">Ctrl+V</kbd> ou clique para enviar</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-medium text-sm transition-all"
            >
              Escolher Arquivo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) loadImage(e.target.files[0]);
              }}
            />
          </div>
        ) : (
          <div
            className="relative cursor-grab active:cursor-grabbing"
            style={{
              width: previewW,
              height: previewH,
              overflow: "hidden",
              background: "#000",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) loadImage(e.dataTransfer.files[0]);
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <img
              src={imageSrc}
              alt="Preview"
              draggable={false}
              style={{
                position: "absolute",
                left: `calc(50% - ${drawW / 2}px + ${position.x}px)`,
                top: `calc(50% - ${drawH / 2}px + ${position.y}px)`,
                width: drawW,
                height: drawH,
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
            {/* Grid overlay */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
              `,
              backgroundSize: `${previewW / 3}px ${previewH / 3}px`,
            }} />
          </div>
        )}
      </div>

      {/* Controls */}
      {imageSrc && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <button onClick={() => setScale((s) => Math.max(0.1, s - 0.1))} className="p-1 hover:text-purple-400 transition-colors">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 w-12 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale((s) => Math.min(10, s + 0.1))} className="p-1 hover:text-purple-400 transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-500 px-3 py-2">
            <Move className="w-3.5 h-3.5" /> Arraste para posicionar
          </div>

          <button
            onClick={() => {
              setImageSrc(null);
              setScale(1);
              setPosition({ x: 0, y: 0 });
            }}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white hover:border-red-500/30 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Nova imagem
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white hover:border-purple-500/30 transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> Trocar
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) loadImage(e.target.files[0]);
            }}
          />

          <button
            onClick={handleDownload}
            className="ml-auto px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 font-bold text-sm flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-600/25"
          >
            <Download className="w-4 h-4" /> Baixar {FORMATS[format].label}
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageCropEditor;
