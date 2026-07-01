import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, Trash2, Video, LogOut, BarChart3, Users, MousePointerClick, PlayCircle, TrendingUp, Clock } from "lucide-react";

const VIDEO_SERVER = "https://video.maisresultadosonline.com.br";
const STORAGE_KEY = "fmp_admin_creds";

interface Analytics {
  summary: {
    totalPageViews: number;
    uniqueVisitors: number;
    totalStarts: number;
    uniqueStarters: number;
    totalClicks: number;
    uniqueClickers: number;
    avgProgress: number;
    milestone25: number;
    milestone50: number;
    milestone75: number;
    milestone100: number;
    conversionRate: number;
    lastAccess: string | null;
  };
  daily: { day: string; visitors: number; clicks: number; starts: number; completes: number }[];
  referrers: { host: string; count: number }[];
  ranking: { visitor_id: string; first: string; last: string; max_progress: number; clicked: boolean }[];
}

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

export default function FerramentaMROPromoAdmin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [logging, setLogging] = useState(false);

  const [videoUrl, setVideoUrl] = useState("");
  const [hlsUrl, setHlsUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcoding, setTranscoding] = useState<{ jobId: string; progress: number; status: string } | null>(null);
  const [serverVideos, setServerVideos] = useState<ServerVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const transcodeTimer = useRef<number | null>(null);

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setCreds(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    if (!creds) return;
    loadCfg();
    loadServerVideos();
    loadAnalytics();
    return () => { if (transcodeTimer.current) window.clearTimeout(transcodeTimer.current); };
  }, [creds]);

  const loadAnalytics = async (days = analyticsDays) => {
    if (!creds) return;
    setLoadingAnalytics(true);
    try {
      const { data } = await supabase.functions.invoke("ferramentamropromo-video", {
        body: { action: "get_analytics", email: creds.email, password: creds.password, days },
      });
      if (data?.success) setAnalytics(data as Analytics);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const doLogin = async () => {
    setLogging(true);
    try {
      const { data } = await supabase.functions.invoke("ferramentamropromo-video", {
        body: { action: "admin_login", email, password },
      });
      if (data?.success) {
        const c = { email, password };
        setCreds(c);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
      } else {
        toast.error("Credenciais inválidas");
      }
    } finally { setLogging(false); }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCreds(null);
    setEmail(""); setPassword("");
  };

  const loadCfg = async () => {
    const { data } = await supabase.functions.invoke("ferramentamropromo-video", { body: { action: "get_video" } });
    if (data) {
      setVideoUrl(data.video_url || "");
      setHlsUrl(data.hls_url || "");
      setVideoTitle(data.video_title || "");
    }
  };

  const save = async () => {
    if (!creds) return;
    const { data } = await supabase.functions.invoke("ferramentamropromo-video", {
      body: {
        action: "set_video", email: creds.email, password: creds.password,
        video_url: videoUrl, hls_url: hlsUrl, video_title: videoTitle,
      },
    });
    if (data?.success) toast.success("Vídeo salvo");
    else toast.error("Erro ao salvar");
  };

  const loadServerVideos = async () => {
    setLoadingVideos(true);
    try {
      const res = await fetch(`${VIDEO_SERVER}/api/video/list`);
      const data = await res.json();
      if (data?.success) setServerVideos(data.files || []);
    } catch { setServerVideos([]); }
    finally { setLoadingVideos(false); }
  };

  const selectExisting = (v: ServerVideo) => {
    if (v.ready === false || v.can_use === false || v.status === "processing" || v.status === "queued") {
      toast.info("Aguarde o transcoding concluir.");
      return;
    }
    const baseName = v.name.replace(/\.[^.]+$/, "");
    const selectedHls = v.hls_url || v.url || `/videos/hls/${baseName}/master.m3u8`;
    setVideoUrl("");
    setHlsUrl(selectedHls);
    toast.success("Vídeo selecionado! Clique em Salvar.");
  };

  const pollTranscoding = async (jobId: string) => {
    const tick = async () => {
      try {
        const res = await fetch(`${VIDEO_SERVER}/api/video/status/${encodeURIComponent(jobId)}`);
        const data = await res.json();
        setTranscoding({ jobId, progress: data.progress || 0, status: data.status });
        if (data.status === "completed") { toast.success("Transcoding concluído"); setTimeout(() => setTranscoding(null), 3000); loadServerVideos(); return; }
        if (data.status === "error") { toast.error("Erro no transcoding"); setTimeout(() => setTranscoding(null), 5000); return; }
        transcodeTimer.current = window.setTimeout(tick, 2000);
      } catch { transcodeTimer.current = window.setTimeout(tick, 3000); }
    };
    tick();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024 * 1024) { toast.error("Máx 5GB"); return; }
    setUploading(true); setUploadProgress(0);
    try {
      const formData = new FormData(); formData.append("video", file);
      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${VIDEO_SERVER}/api/video/upload`); xhr.timeout = 7200000;
        xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100)); };
        xhr.onload = () => xhr.status === 200 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error(`HTTP ${xhr.status}`));
        xhr.ontimeout = () => reject(new Error("Timeout"));
        xhr.onerror = () => reject(new Error("Falha de rede"));
        xhr.send(formData);
      });
      if (result.success) {
        setVideoUrl(result.video_url); setHlsUrl(result.hls_url);
        toast.success("Upload concluído! Transcodificando…");
        const jobId = result.job_id || (result.hls_url || "").match(/\/videos\/hls\/(.+?)\/master\.m3u8/)?.[1];
        if (jobId) { setTranscoding({ jobId, progress: 0, status: "queued" }); pollTranscoding(jobId); }
      } else toast.error("Servidor recusou");
    } catch (err: any) { toast.error(err.message || "Erro no upload"); }
    finally { setUploading(false); setUploadProgress(0); if (fileRef.current) fileRef.current.value = ""; }
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

  if (!creds) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 bg-zinc-900 border-zinc-800">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin — Ferramenta MRO Promo</h1>
          <div className="space-y-4">
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button onClick={doLogin} disabled={logging} className="w-full">
              {logging && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Entrar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold">Ferramenta MRO Promo — Admin</h1>
          <Button variant="outline" onClick={logout}><LogOut className="w-4 h-4 mr-2" /> Sair</Button>
        </div>

        <Card className="p-6 bg-zinc-900 border-zinc-800 space-y-4">
          <h2 className="text-xl font-semibold">Vídeo atual</h2>
          <div className="space-y-3">
            <Input placeholder="Título (opcional)" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} />
            <Input placeholder="Video URL (direto .mp4)" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
            <Input placeholder="HLS URL (.m3u8)" value={hlsUrl} onChange={(e) => setHlsUrl(e.target.value)} />
            <Button onClick={save} className="w-full"><Save className="w-4 h-4 mr-2" /> Salvar vídeo</Button>
          </div>
        </Card>

        <Card className="p-6 bg-zinc-900 border-zinc-800 space-y-4">
          <h2 className="text-xl font-semibold">Upload novo vídeo</h2>
          <input ref={fileRef} type="file" accept="video/*" onChange={handleUpload} disabled={uploading}
            className="block w-full text-sm text-zinc-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-amber-500 file:text-black file:font-semibold hover:file:bg-amber-400" />
          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-zinc-400">Enviando… {uploadProgress}%</p>
            </div>
          )}
          {transcoding && (
            <div className="space-y-2">
              <Progress value={transcoding.progress} />
              <p className="text-sm text-zinc-400">Transcodificando ({transcoding.status})… {transcoding.progress}%</p>
            </div>
          )}
        </Card>

        <Card className="p-6 bg-zinc-900 border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Vídeos no servidor</h2>
            <Button variant="outline" size="sm" onClick={loadServerVideos} disabled={loadingVideos}>
              {loadingVideos ? <Loader2 className="w-4 h-4 animate-spin" /> : "Atualizar"}
            </Button>
          </div>
          <div className="space-y-2">
            {serverVideos.length === 0 && <p className="text-sm text-zinc-500">Nenhum vídeo.</p>}
            {serverVideos.map((v) => (
              <div key={v.name} className="flex items-center justify-between gap-2 p-3 rounded bg-zinc-800/60">
                <div className="flex items-center gap-3 min-w-0">
                  <Video className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{v.name}</p>
                    <p className="text-xs text-zinc-400">{v.status || (v.ready ? "pronto" : "processando")}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => selectExisting(v)}>Usar</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteVideo(v.name)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
