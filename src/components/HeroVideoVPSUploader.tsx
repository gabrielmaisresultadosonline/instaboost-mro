import { useEffect, useRef, useState } from "react";
import { Loader2, Video, Trash2, Save, UploadCloud, PlayCircle, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";

const VIDEO_SERVER = "https://video.maisresultadosonline.com.br";

interface ServerVideo {
  name: string;
  url: string;
  hls_url: string;
  status?: string;
  progress?: number;
  ready?: boolean;
  can_use?: boolean;
  created?: string;
}

interface Props {
  form: any;
  setForm: (next: any) => void;
  onSave: (next: any) => void;
}

export default function HeroVideoVPSUploader({ form, setForm, onSave }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcoding, setTranscoding] = useState<{ jobId: string; progress: number; status: string } | null>(null);
  const [serverVideos, setServerVideos] = useState<ServerVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    loadServerVideos();
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, []);

  const loadServerVideos = async () => {
    setLoadingVideos(true);
    try {
      const res = await fetch(`${VIDEO_SERVER}/api/video/list`);
      const data = await res.json();
      if (data?.success) setServerVideos(data.files || []);
    } catch { setServerVideos([]); }
    finally { setLoadingVideos(false); }
  };

  const poll = (jobId: string) => {
    const tick = async () => {
      try {
        const res = await fetch(`${VIDEO_SERVER}/api/video/status/${encodeURIComponent(jobId)}`);
        const data = await res.json();
        setTranscoding({ jobId, progress: data.progress || 0, status: data.status });
        if (data.status === "completed") {
          toast.success("Transcoding concluído ✔");
          setTimeout(() => setTranscoding(null), 3000);
          loadServerVideos();
          return;
        }
        if (data.status === "error") {
          toast.error("Erro no transcoding");
          setTimeout(() => setTranscoding(null), 5000);
          return;
        }
        timerRef.current = window.setTimeout(tick, 2000);
      } catch { timerRef.current = window.setTimeout(tick, 3000); }
    };
    tick();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 * 1024) { toast.error("Máx 5GB"); return; }
    setUploading(true); setUploadProgress(0);
    try {
      const fd = new FormData(); fd.append("video", file);
      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${VIDEO_SERVER}/api/video/upload`);
        xhr.timeout = 7200000;
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => xhr.status === 200 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error(`HTTP ${xhr.status}`));
        xhr.ontimeout = () => reject(new Error("Timeout"));
        xhr.onerror = () => reject(new Error("Falha de rede"));
        xhr.send(fd);
      });
      if (result.success) {
        const next = { ...form, hero_video_url: result.video_url, hero_hls_url: result.hls_url };
        setForm(next);
        toast.success("Upload concluído! Transcoding iniciado…");
        const jobId = result.job_id || (result.hls_url || "").match(/\/videos\/hls\/(.+?)\/master\.m3u8/)?.[1];
        if (jobId) { setTranscoding({ jobId, progress: 0, status: "queued" }); poll(jobId); }
      } else toast.error("Servidor recusou o arquivo");
    } catch (err: any) {
      toast.error(err?.message || "Erro no upload");
    } finally {
      setUploading(false); setUploadProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const startTranscoding = async (v: ServerVideo) => {
    try {
      toast.info("Iniciando transcoding…");
      const res = await fetch(`${VIDEO_SERVER}/api/video/transcode/${encodeURIComponent(v.name)}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      const jobId = data.job_id || v.name.replace(/\.[^.]+$/, "");
      setTranscoding({ jobId, progress: 0, status: "queued" });
      poll(jobId);
    } catch { toast.error("Não foi possível iniciar o transcoding"); }
  };

  const useVideo = (v: ServerVideo) => {
    if (v.ready === false || v.can_use === false || v.status === "processing" || v.status === "queued") {
      toast.info("Aguarde o transcoding concluir.");
      return;
    }
    const baseName = v.name.replace(/\.[^.]+$/, "");
    const hls = v.hls_url || `/videos/hls/${baseName}/master.m3u8`;
    const hlsAbs = hls.startsWith("http") ? hls : `${VIDEO_SERVER}${hls}`;
    const mp4Abs = v.url?.startsWith("http") ? v.url : `${VIDEO_SERVER}${v.url || ""}`;
    setForm({ ...form, hero_video_url: mp4Abs, hero_hls_url: hlsAbs });
    toast.success("Vídeo selecionado! Clique em Salvar.");
  };

  const deleteVideo = async (name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return;
    try {
      const res = await fetch(`${VIDEO_SERVER}/api/video/${encodeURIComponent(name)}`, { method: "DELETE" });
      const data = await res.json();
      if (data?.success) { toast.success("Excluído"); setServerVideos((p) => p.filter((v) => v.name !== name)); }
      else toast.error("Erro ao excluir");
    } catch { toast.error("Erro ao conectar ao servidor"); }
  };

  return (
    <div className="space-y-5">
      {/* URLs em uso */}
      <div className="grid gap-3">
        <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Vídeo em uso (MP4 direto)</label>
        <input
          value={form.hero_video_url || ""}
          onChange={(e) => setForm({ ...form, hero_video_url: e.target.value })}
          className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-300"
          placeholder="https://…/videos/hero.mp4"
        />
        <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">HLS (.m3u8) — streaming adaptativo</label>
        <input
          value={form.hero_hls_url || ""}
          onChange={(e) => setForm({ ...form, hero_hls_url: e.target.value })}
          className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-300"
          placeholder="https://…/videos/hls/hero/master.m3u8"
        />
      </div>

      {/* Upload */}
      <div className="rounded-xl border border-dashed border-yellow-500/40 bg-yellow-500/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <UploadCloud className="w-5 h-5 text-yellow-400" />
          <h4 className="text-sm font-black text-white">Enviar novo vídeo principal</h4>
        </div>
        <p className="text-[11px] text-neutral-400 mb-3">
          Upload direto para o servidor de vídeo (até 5GB). O transcoding HLS (480p/720p/1080p) inicia automaticamente para funcionar em todos os aparelhos.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          onChange={handleUpload}
          disabled={uploading}
          className="block w-full text-xs text-neutral-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-yellow-400 file:text-black file:font-bold hover:file:bg-yellow-300 disabled:opacity-50"
        />
        {uploading && (
          <div className="mt-3">
            <div className="h-2 rounded bg-neutral-800 overflow-hidden">
              <div className="h-full bg-yellow-400 transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">Enviando… {uploadProgress}%</p>
          </div>
        )}
        {transcoding && (
          <div className="mt-3">
            <div className="h-2 rounded bg-neutral-800 overflow-hidden">
              <div className="h-full bg-emerald-400 transition-all" style={{ width: `${transcoding.progress}%` }} />
            </div>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Transcoding ({transcoding.status})… {transcoding.progress}%
            </p>
          </div>
        )}
      </div>

      {/* Server videos */}
      <div className="rounded-xl border border-neutral-900 bg-black/40 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-yellow-400" />
            <h4 className="text-sm font-black text-white">Vídeos no servidor</h4>
          </div>
          <button
            onClick={loadServerVideos}
            disabled={loadingVideos}
            className="text-[11px] px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 flex items-center gap-1 hover:bg-neutral-800"
          >
            {loadingVideos ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Atualizar
          </button>
        </div>
        {serverVideos.length === 0 ? (
          <p className="text-xs text-neutral-500">Nenhum vídeo enviado ainda.</p>
        ) : (
          <div className="space-y-2">
            {serverVideos.map((v) => {
              const ready = v.ready !== false && v.can_use !== false && v.status !== "processing" && v.status !== "queued";
              return (
                <div key={v.name} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-neutral-900/70 border border-neutral-800">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-white truncate">{v.name}</p>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest">
                      {v.status || (ready ? "pronto" : "processando")}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => useVideo(v)}
                      disabled={!ready}
                      className="px-2 py-1 rounded text-[11px] font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-40 flex items-center gap-1"
                    >
                      <PlayCircle className="w-3 h-3" /> Usar
                    </button>
                    <button
                      onClick={() => startTranscoding(v)}
                      className="px-2 py-1 rounded text-[11px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 flex items-center gap-1"
                      title="Reiniciar transcoding HLS"
                    >
                      <Zap className="w-3 h-3" /> Transcoding
                    </button>
                    <button
                      onClick={() => deleteVideo(v.name)}
                      className="px-2 py-1 rounded text-[11px] font-bold bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => onSave(form)}
        className="w-full px-4 py-3 rounded-lg bg-yellow-400 text-black font-black text-sm hover:bg-yellow-300 flex items-center justify-center gap-2"
      >
        <Save className="w-4 h-4" /> Salvar vídeo principal
      </button>
    </div>
  );
}
