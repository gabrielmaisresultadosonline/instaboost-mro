import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, LogOut, Users, Eye, Clock, CheckCircle2, MousePointerClick, Briefcase, Crown, Rocket, DollarSign, TrendingUp, Upload, Video, Trash2, Save, Send, Filter, Monitor, Smartphone, MailCheck, Ban, LayoutDashboard, BarChart3, Gauge, Settings2, ListChecks, ShoppingBag, Activity, Megaphone } from "lucide-react";
import { toast } from "sonner";

const VIDEO_SERVER = "https://video.maisresultadosonline.com.br";
const TRANSCODING_STORAGE_KEY = "est4_active_transcoding_job";

interface Lead {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  token: string;
  expires_at: string;
  emails_sent_count: number;
  last_email_sent_at: string | null;
  accessed_discount_at: string | null;
  created_at: string;
}
interface Visit {
  id: string;
  page: string;
  email: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}
interface Purchase {
  email: string;
  username: string;
  subscription_status: string;
  subscription_end: string | null;
  created_at: string;
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

const STORAGE_KEY = "est4_admin_creds";

export default function EstruturaRendaExtra4Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  // Video config
  const [videoUrl, setVideoUrl] = useState("");
  const [hlsUrl, setHlsUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcoding, setTranscoding] = useState<{ jobId: string; progress: number; status: string; error?: string | null } | null>(null);
  const [transcodeLogs, setTranscodeLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [serverVideos, setServerVideos] = useState<ServerVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transcodingTimeoutRef = useRef<number | null>(null);

  // Remarketing tab state
  interface RendaLead { id: string; nome_completo: string; email: string; whatsapp: string; tipo_computador: string; created_at: string; }
  interface RemarketingLog { id: string; email: string; nome: string | null; tipo_computador: string | null; sent_at: string; link: string | null; success: boolean; }
  interface DiscountLead { email: string; expires_at: string; emails_sent_count: number; last_email_sent_at: string | null; accessed_discount_at: string | null; created_at: string; }
  const [rmLoading, setRmLoading] = useState(false);
  const [rmLeads, setRmLeads] = useState<RendaLead[]>([]);
  const [rmPaidEmails, setRmPaidEmails] = useState<string[]>([]);
  const [rmDiscountLeads, setRmDiscountLeads] = useState<DiscountLead[]>([]);
  const [rmLogs, setRmLogs] = useState<RemarketingLog[]>([]);
  const [rmFilterDevice, setRmFilterDevice] = useState<"all" | "computer" | "mobile">("all");
  const [rmHideBought, setRmHideBought] = useState(true);
  const [rmHideAlreadySent, setRmHideAlreadySent] = useState(false);
  const [rmSelected, setRmSelected] = useState<Set<string>>(new Set());
  const [rmDelaySeconds, setRmDelaySeconds] = useState(8);
  const [rmSending, setRmSending] = useState(false);
  const [rmProgress, setRmProgress] = useState({ done: 0, total: 0, lastEmail: "" });

  const loadRemarketing = async (c?: { email: string; password: string }) => {
    const cur = c || creds;
    if (!cur) return;
    setRmLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("estrutura4-discount", {
        body: { action: "admin_remarketing_data", email: cur.email, password: cur.password },
      });
      if (error || !data?.success) { toast.error("Erro ao carregar remarketing"); return; }
      setRmLeads(data.renda_leads || []);
      setRmPaidEmails((data.paid_emails || []).map((e: string) => e.toLowerCase()));
      setRmDiscountLeads(data.discount_leads || []);
      setRmLogs(data.remarketing_logs || []);
    } finally { setRmLoading(false); }
  };

  const isComputerType = (t: string) => /comput|notebook|mac|pc|desktop|laptop/i.test(t || "");
  const filteredRmLeads = rmLeads.filter((l) => {
    const emailLc = (l.email || "").toLowerCase();
    if (rmHideBought && rmPaidEmails.includes(emailLc)) return false;
    if (rmHideAlreadySent && rmLogs.some((r) => r.email.toLowerCase() === emailLc)) return false;
    if (rmFilterDevice === "computer" && !isComputerType(l.tipo_computador)) return false;
    if (rmFilterDevice === "mobile" && isComputerType(l.tipo_computador)) return false;
    return true;
  });

  const toggleSelectAll = () => {
    if (rmSelected.size === filteredRmLeads.length) setRmSelected(new Set());
    else setRmSelected(new Set(filteredRmLeads.map((l) => l.email.toLowerCase())));
  };
  const toggleOne = (email: string) => {
    const next = new Set(rmSelected);
    const k = email.toLowerCase();
    if (next.has(k)) next.delete(k); else next.add(k);
    setRmSelected(next);
  };

  const sendRemarketingBatch = async () => {
    if (!creds) return;
    const targets = filteredRmLeads.filter((l) => rmSelected.has(l.email.toLowerCase()));
    if (targets.length === 0) { toast.info("Selecione pelo menos um lead"); return; }
    if (!confirm(`Enviar email de desconto para ${targets.length} lead(s) com ${rmDelaySeconds}s entre cada envio?`)) return;
    setRmSending(true);
    setRmProgress({ done: 0, total: targets.length, lastEmail: "" });
    let ok = 0, fail = 0;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      try {
        const { data } = await supabase.functions.invoke("estrutura4-discount", {
          body: {
            action: "admin_send_remarketing",
            email: creds.email,
            password: creds.password,
            target_email: t.email,
            nome: t.nome_completo,
            whatsapp: t.whatsapp,
            tipo_computador: t.tipo_computador,
          },
        });
        if (data?.success && data?.sent) ok++; else fail++;
      } catch { fail++; }
      setRmProgress({ done: i + 1, total: targets.length, lastEmail: t.email });
      if (i < targets.length - 1) await new Promise((r) => setTimeout(r, Math.max(1, rmDelaySeconds) * 1000));
    }
    setRmSending(false);
    toast.success(`Concluído. Enviados: ${ok}. Falhas: ${fail}.`);
    setRmSelected(new Set());
    loadRemarketing();
  };

  useEffect(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) { try { setCreds(JSON.parse(s)); } catch {} }
  }, []);

  const fetchData = async (c: { email: string; password: string }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("estrutura4-discount", {
        body: { action: "admin_list", email: c.email, password: c.password },
      });
      if (error || !data?.success) {
        toast.error("Não autorizado ou erro ao carregar.");
        setCreds(null);
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      setLeads(data.leads || []);
      setVisits(data.visits || []);
      setPurchases(data.purchases || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (creds) {
      fetchData(creds);
      loadVideoCfg();
      loadServerVideos();
      loadRemarketing(creds);
      const savedJobId = localStorage.getItem(TRANSCODING_STORAGE_KEY);
      if (savedJobId) pollTranscodingStatus(savedJobId);
    }
    return () => {
      if (transcodingTimeoutRef.current) window.clearTimeout(transcodingTimeoutRef.current);
    };
  }, [creds]);

  const loadVideoCfg = async () => {
    const { data } = await supabase.functions.invoke("estrutura4-discount", { body: { action: "get_video" } });
    if (data) {
      setVideoUrl(data.video_url || "");
      setHlsUrl(data.hls_url || "");
      setVideoTitle(data.video_title || "");
    }
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

  const selectExistingVideo = (video: ServerVideo) => {
    if (video.ready === false || video.can_use === false || video.status === "processing" || video.status === "queued") {
      toast.info("Aguarde o transcoding concluir antes de usar este vídeo.");
      return;
    }
    const baseName = video.name.replace(/\.[^.]+$/, '');
    const selectedHls = video.hls_url || video.url || `/videos/hls/${baseName}/master.m3u8`;
    setVideoUrl("");
    setHlsUrl(selectedHls);
    toast.success("Vídeo selecionado! Clique em Salvar.");
  };

  const getJobIdFromHlsUrl = (url?: string) => {
    const match = (url || "").match(/\/videos\/hls\/(.+?)\/master\.m3u8/);
    return match?.[1] ? decodeURIComponent(match[1]) : "";
  };

  const deleteServerVideo = async (name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return;
    try {
      const res = await fetch(`${VIDEO_SERVER}/api/video/${encodeURIComponent(name)}`, { method: "DELETE" });
      const data = await res.json();
      if (data?.success) { toast.success("Excluído!"); setServerVideos((p) => p.filter((v) => v.name !== name)); }
      else toast.error("Erro ao excluir");
    } catch { toast.error("Erro ao conectar ao servidor"); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 * 1024) { toast.error("Máx 5GB"); return; }
    setUploading(true); setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append("video", file);
      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${VIDEO_SERVER}/api/video/upload`);
        xhr.timeout = 7200000;
        xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100)); };
        xhr.onload = () => {
          if (xhr.status === 200) {
            try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new Error("Resposta inválida do servidor")); }
          } else {
            reject(new Error(`Upload falhou (HTTP ${xhr.status}): ${xhr.responseText?.slice(0, 200) || xhr.statusText}`));
          }
        };
        xhr.ontimeout = () => reject(new Error("Upload expirou por timeout. Tente novamente."));
        xhr.onerror = () => reject(new Error("Falha de rede / CORS ao contatar o video server. Verifique se o VPS está online."));
        xhr.send(formData);
      });
      if (result.success) {
        const jobId = result.job_id || getJobIdFromHlsUrl(result.hls_url);
        setVideoUrl(result.video_url);
        setHlsUrl(result.hls_url);
        toast.success("Upload concluído! Transcodificando HLS...");
        if (jobId) {
          localStorage.setItem(TRANSCODING_STORAGE_KEY, jobId);
          setTranscoding({ jobId, progress: 0, status: "queued" });
          setServerVideos((prev) => [
            { name: jobId, url: result.hls_url, hls_url: result.hls_url, status: "queued", progress: 0, ready: false, can_use: false },
            ...prev.filter((v) => v.name !== jobId),
          ]);
          loadServerVideos();
          pollTranscodingStatus(jobId);
        } else {
          toast.error("Upload recebido, mas o servidor não retornou o ID do transcoding. Rode novamente o setup do video-server no VPS.");
          loadServerVideos();
        }
      } else {
        toast.error("Servidor recusou o upload: " + (result.error || "resposta sem success"));
      }
    } catch (err: any) {
      console.error("[upload] Erro VPS:", err);
      toast.error(err.message || "Erro no upload");
    } finally { setUploading(false); setUploadProgress(0); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const fetchLogs = async (jobId: string) => {
    try {
      const r = await fetch(`${VIDEO_SERVER}/api/video/logs/${encodeURIComponent(jobId)}`);
      if (!r.ok) return;
      const j = await r.json();
      if (Array.isArray(j.logs)) setTranscodeLogs(j.logs);
    } catch {}
  };

  const pollTranscodingStatus = async (jobId: string) => {
    const tick = async () => {
      try {
        const res = await fetch(`${VIDEO_SERVER}/api/video/status/${encodeURIComponent(jobId)}`);
        if (!res.ok) throw new Error("status not found");
        const data = await res.json();
        setTranscoding({ jobId, progress: data.progress || 0, status: data.status, error: data.error || null });
        setServerVideos((prev) => prev.map((v) => v.name === jobId ? { ...v, status: data.status, progress: data.progress || 0, ready: data.status === "completed", can_use: data.status === "completed" } : v));
        fetchLogs(jobId);
        if (data.status === "completed") {
          toast.success("Transcoding concluído! Vídeo pronto.");
          localStorage.removeItem(TRANSCODING_STORAGE_KEY);
          transcodingTimeoutRef.current = window.setTimeout(() => setTranscoding(null), 3000);
          loadServerVideos();
          return;
        }
        if (data.status === "error") {
          toast.error("Erro no transcoding do vídeo." + (data.error ? ` ${data.error}` : ""));
          localStorage.removeItem(TRANSCODING_STORAGE_KEY);
          transcodingTimeoutRef.current = window.setTimeout(() => setTranscoding(null), 30000);
          loadServerVideos();
          return;
        }
        transcodingTimeoutRef.current = window.setTimeout(tick, 2000);
      } catch {
        loadServerVideos();
        transcodingTimeoutRef.current = window.setTimeout(tick, 3000);
      }
    };
    tick();
  };

  const saveVideo = async () => {
    if (!creds) return;
    const { data } = await supabase.functions.invoke("estrutura4-discount", {
      body: { action: "set_video", email: creds.email, password: creds.password, video_url: videoUrl, hls_url: hlsUrl, video_title: videoTitle },
    });
    if (data?.success) toast.success("Vídeo salvo! Já disponível em /renda-extra2");
    else toast.error("Erro ao salvar");
  };


  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("estrutura4-discount", {
        body: { action: "admin_login", email: email.trim().toLowerCase(), password },
      });
      if (data?.success) {
        const c = { email: email.trim().toLowerCase(), password };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
        setCreds(c);
      } else toast.error("Credenciais inválidas");
    } finally { setLoading(false); }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCreds(null); setEmail(""); setPassword(""); setLeads([]); setVisits([]); setPurchases([]);
  };

  if (!creds) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center px-4">
        <Card className="w-full max-w-md p-6 bg-zinc-900 border-zinc-800">
          <h1 className="text-xl font-bold text-white mb-4 text-center">Admin · Estrutura Renda Extra 4</h1>
          <form onSubmit={login} className="space-y-3">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
            <Input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
            <Button type="submit" disabled={loading} className="w-full">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}</Button>
          </form>
        </Card>
      </div>
    );
  }

  const now = Date.now();
  const activeLeads = leads.filter((l) => new Date(l.expires_at).getTime() > now).length;
  const accessed = leads.filter((l) => l.accessed_discount_at).length;

  const countPage = (p: string) => visits.filter((v) => v.page === p).length;
  const uniqueIps = (p: string) => new Set(visits.filter((v) => v.page === p).map((v) => v.ip).filter(Boolean)).size;

  const visitsRendaExtra2 = countPage("/renda-extra2");
  const visitsEstrutura4 = countPage("/estruturarendaextra4");
  const visitsDiscount = countPage("/descontoalunosrendaextrasss");
  const clicksPrestar = countPage("click:renda-extra2:prestar");
  const clicksLicenciado = countPage("click:renda-extra2:licenciado");
  const clicksAcessar = countPage("click:renda-extra2:acessar-renda-extra-agora");

  // Video engagement (events fired by RendaExtra2Page video player)
  const videoStart = countPage("video:renda-extra2:start");
  const video25 = countPage("video:renda-extra2:25");
  const video50 = countPage("video:renda-extra2:50");
  const video75 = countPage("video:renda-extra2:75");
  const video100 = countPage("video:renda-extra2:100");
  const videoStartUnique = uniqueIps("video:renda-extra2:start");
  const video50Unique = uniqueIps("video:renda-extra2:50");
  const video100Unique = uniqueIps("video:renda-extra2:100");

  // Device split — based on /renda-extra2 visits user_agent
  const isMobileUA = (ua: string | null) => !!ua && /Mobi|Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(ua);
  const pageVisits = visits.filter((v) => v.page === "/renda-extra2");
  const mobileVisits = pageVisits.filter((v) => isMobileUA(v.user_agent)).length;
  const desktopVisits = pageVisits.length - mobileVisits;
  const videoStartVisits = visits.filter((v) => v.page === "video:renda-extra2:start");
  const mobileWatched = videoStartVisits.filter((v) => isMobileUA(v.user_agent)).length;
  const desktopWatched = videoStartVisits.length - mobileWatched;

  // Funnel: prestar → acessar (by unique IP)
  const prestarIps = new Set(visits.filter((v) => v.page === "click:renda-extra2:prestar").map((v) => v.ip).filter(Boolean));
  const acessarIps = new Set(visits.filter((v) => v.page === "click:renda-extra2:acessar-renda-extra-agora").map((v) => v.ip).filter(Boolean));
  const prestarAndAcessar = [...prestarIps].filter((ip) => acessarIps.has(ip)).length;


  const totalPurchases = purchases.length;
  const purchaseEmails = new Set(purchases.map((p) => p.email.toLowerCase()));
  const leadsConverted = leads.filter((l) => purchaseEmails.has(l.email.toLowerCase())).length;
  const convRate = leads.length > 0 ? ((leadsConverted / leads.length) * 100).toFixed(1) : "0.0";

  const ACCENTS: Record<string, { ring: string; text: string; bg: string; glow: string }> = {
    emerald: { ring: "ring-emerald-500/30", text: "text-emerald-300", bg: "from-emerald-500/20 to-emerald-500/0", glow: "shadow-[0_0_25px_-10px_rgba(16,185,129,0.6)]" },
    cyan: { ring: "ring-cyan-500/30", text: "text-cyan-300", bg: "from-cyan-500/20 to-cyan-500/0", glow: "shadow-[0_0_25px_-10px_rgba(34,211,238,0.6)]" },
    violet: { ring: "ring-violet-500/30", text: "text-violet-300", bg: "from-violet-500/20 to-violet-500/0", glow: "shadow-[0_0_25px_-10px_rgba(139,92,246,0.6)]" },
    amber: { ring: "ring-amber-500/30", text: "text-amber-300", bg: "from-amber-500/20 to-amber-500/0", glow: "shadow-[0_0_25px_-10px_rgba(245,158,11,0.6)]" },
    rose: { ring: "ring-rose-500/30", text: "text-rose-300", bg: "from-rose-500/20 to-rose-500/0", glow: "shadow-[0_0_25px_-10px_rgba(244,63,94,0.6)]" },
    sky: { ring: "ring-sky-500/30", text: "text-sky-300", bg: "from-sky-500/20 to-sky-500/0", glow: "shadow-[0_0_25px_-10px_rgba(14,165,233,0.6)]" },
    fuchsia: { ring: "ring-fuchsia-500/30", text: "text-fuchsia-300", bg: "from-fuchsia-500/20 to-fuchsia-500/0", glow: "shadow-[0_0_25px_-10px_rgba(217,70,239,0.6)]" },
    lime: { ring: "ring-lime-500/30", text: "text-lime-300", bg: "from-lime-500/20 to-lime-500/0", glow: "shadow-[0_0_25px_-10px_rgba(132,204,22,0.6)]" },
  };

  const Stat = ({ icon: Icon, label, value, accent = "cyan" }: { icon: any; label: string; value: any; accent?: keyof typeof ACCENTS }) => {
    const a = ACCENTS[accent] || ACCENTS.cyan;
    return (
      <Card className={`relative overflow-hidden p-4 bg-zinc-950/80 border border-zinc-800 ring-1 ${a.ring} ${a.glow} hover:scale-[1.02] transition-transform`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${a.bg} pointer-events-none`} />
        <div className="relative">
          <div className="flex items-center gap-2 text-zinc-400 text-[11px] uppercase tracking-wider">
            <Icon className={`w-4 h-4 ${a.text}`} />{label}
          </div>
          <p className={`text-2xl font-bold mt-1 ${a.text} drop-shadow-[0_0_8px_rgba(255,255,255,0.08)]`}>{value}</p>
        </div>
      </Card>
    );
  };

  const SectionTitle = ({ icon: Icon, children, accent = "cyan" }: any) => {
    const a = ACCENTS[accent] || ACCENTS.cyan;
    return (
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-md bg-gradient-to-br ${a.bg} ring-1 ${a.ring}`}>
          <Icon className={`w-4 h-4 ${a.text}`} />
        </div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-200">{children}</h2>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06060e] via-[#0a0a18] to-[#0d0820] text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 p-4 rounded-xl bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-cyan-600/20 border border-zinc-800 ring-1 ring-violet-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-fuchsia-500 to-violet-600 shadow-lg shadow-fuchsia-500/30">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-fuchsia-300 via-violet-200 to-cyan-300 bg-clip-text text-transparent">Admin · Desconto Renda Extra 4</h1>
              <p className="text-[11px] text-zinc-400">Dashboard, vídeo, leads e remarketing</p>
            </div>
          </div>
          <Button variant="outline" onClick={logout} className="border-zinc-700"><LogOut className="w-4 h-4 mr-2" /> Sair</Button>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="bg-zinc-900/70 border border-zinc-800 p-1 flex flex-wrap h-auto">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-sky-600 data-[state=active]:text-white"><BarChart3 className="w-4 h-4 mr-1" />Dashboard</TabsTrigger>
            <TabsTrigger value="video" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600 data-[state=active]:to-orange-600 data-[state=active]:text-white"><Video className="w-4 h-4 mr-1" />Vídeo</TabsTrigger>
            <TabsTrigger value="leads" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white"><ListChecks className="w-4 h-4 mr-1" />Leads ({leads.length})</TabsTrigger>
            <TabsTrigger value="purchases" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-lime-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white"><ShoppingBag className="w-4 h-4 mr-1" />Compras ({totalPurchases})</TabsTrigger>
            <TabsTrigger value="visits" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-fuchsia-600 data-[state=active]:text-white"><Activity className="w-4 h-4 mr-1" />Eventos ({visits.length})</TabsTrigger>
            <TabsTrigger value="remarketing" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-pink-600 data-[state=active]:text-white"><Megaphone className="w-4 h-4 mr-1" />Remarketing</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <Accordion type="multiple" defaultValue={["pages", "video-eng", "funnel"]} className="space-y-3">
              <AccordionItem value="pages" className="border border-zinc-800 rounded-xl bg-zinc-950/40 px-4">
                <AccordionTrigger className="hover:no-underline">
                  <SectionTitle icon={Eye} accent="cyan">Visitas das páginas</SectionTitle>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-2">
                    <Stat icon={Eye} label="/renda-extra2" value={`${visitsRendaExtra2} (${uniqueIps("/renda-extra2")} únicos)`} accent="cyan" />
                    <Stat icon={Eye} label="/estruturarendaextra4" value={`${visitsEstrutura4} (${uniqueIps("/estruturarendaextra4")} únicos)`} accent="sky" />
                    <Stat icon={Eye} label="/descontoalunosrendaextrasss" value={`${visitsDiscount} (${uniqueIps("/descontoalunosrendaextrasss")} únicos)`} accent="violet" />
                    <Stat icon={MousePointerClick} label="Total de eventos" value={visits.length} accent="fuchsia" />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="clicks" className="border border-zinc-800 rounded-xl bg-zinc-950/40 px-4">
                <AccordionTrigger className="hover:no-underline">
                  <SectionTitle icon={MousePointerClick} accent="emerald">Cliques em /renda-extra2</SectionTitle>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-2">
                    <Stat icon={Briefcase} label="Prestar Serviço com MRO" value={clicksPrestar} accent="emerald" />
                    <Stat icon={Crown} label="Seja um Licenciado MRO" value={clicksLicenciado} accent="amber" />
                    <Stat icon={Rocket} label="Acessar Renda Extra Agora" value={clicksAcessar} accent="lime" />
                    <Stat icon={TrendingUp} label="Prestar → Acessar (IPs únicos)" value={prestarAndAcessar} accent="cyan" />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="video-eng" className="border border-zinc-800 rounded-xl bg-zinc-950/40 px-4">
                <AccordionTrigger className="hover:no-underline">
                  <SectionTitle icon={Gauge} accent="amber">Engajamento do vídeo (/renda-extra2)</SectionTitle>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pb-2">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Stat icon={Eye} label="Acessaram a página" value={`${visitsRendaExtra2} (${uniqueIps("/renda-extra2")} únicos)`} accent="cyan" />
                    <Stat icon={Rocket} label="Assistiram (deram play)" value={`${videoStart} (${videoStartUnique} únicos)`} accent="emerald" />
                    <Stat icon={TrendingUp} label="Chegaram a 25%" value={video25} accent="sky" />
                    <Stat icon={TrendingUp} label="Chegaram a 50%" value={`${video50} (${video50Unique} únicos)`} accent="amber" />
                    <Stat icon={CheckCircle2} label="Assistiram 100%" value={`${video100} (${video100Unique} únicos)`} accent="lime" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat icon={Smartphone} label="📱 Acessos por celular" value={mobileVisits} accent="cyan" />
                    <Stat icon={Monitor} label="🖥️ Acessos por computador" value={desktopVisits} accent="violet" />
                    <Stat icon={Smartphone} label="📱 Assistiram por celular" value={mobileWatched} accent="sky" />
                    <Stat icon={Monitor} label="🖥️ Assistiram por computador" value={desktopWatched} accent="fuchsia" />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="funnel" className="border border-zinc-800 rounded-xl bg-zinc-950/40 px-4">
                <AccordionTrigger className="hover:no-underline">
                  <SectionTitle icon={DollarSign} accent="lime">Funil de desconto e vendas</SectionTitle>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pb-2">
                    <Stat icon={Users} label="Leads (cadastros)" value={leads.length} accent="cyan" />
                    <Stat icon={Clock} label="Desconto ativo" value={activeLeads} accent="amber" />
                    <Stat icon={CheckCircle2} label="Acessaram desconto" value={accessed} accent="emerald" />
                    <Stat icon={DollarSign} label="Compras aprovadas" value={totalPurchases} accent="lime" />
                    <Stat icon={TrendingUp} label="Conversão lead → compra" value={`${leadsConverted} (${convRate}%)`} accent="fuchsia" />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="video">
            <Card className="p-4 bg-zinc-950/60 border border-zinc-800 ring-1 ring-amber-500/20 space-y-3">
              <SectionTitle icon={Settings2} accent="amber">Vídeo exibido em /renda-extra2 (Prestar Serviço)</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input placeholder="Título (opcional)" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white md:col-span-2" />
                <Input placeholder="video_url (ex: /videos/arquivo.mp4)" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white" />
                <Input placeholder="hls_url (ex: /videos/hls/arquivo/master.m3u8)" value={hlsUrl} onChange={(e) => setHlsUrl(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white" />
              </div>

              <div className="flex flex-wrap gap-2">
                <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleUpload} />
                <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white">
                  <Upload className="w-4 h-4 mr-2" /> {uploading ? `Enviando ${uploadProgress}%` : "Enviar vídeo p/ servidor"}
                </Button>
                <Button onClick={loadServerVideos} variant="outline" disabled={loadingVideos}>
                  {loadingVideos ? <Loader2 className="w-4 h-4 animate-spin" /> : "Recarregar lista"}
                </Button>
                <Button onClick={saveVideo} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 ml-auto">
                  <Save className="w-4 h-4 mr-2" /> Salvar (publicar em /renda-extra2)
                </Button>
              </div>

              {uploading && (
                <div className="space-y-1">
                  <div className="text-xs text-zinc-400 flex justify-between"><span>📤 Enviando vídeo ao servidor...</span><span>{uploadProgress}%</span></div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              {transcoding && (
                <div className="space-y-1 p-3 rounded-lg bg-zinc-900/80 border border-amber-500/30">
                  <div className="text-xs text-zinc-300 flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      {transcoding.status === "completed" ? (
                        <><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Transcoding concluído — vídeo pronto!</>
                      ) : transcoding.status === "error" ? (
                        <span className="text-red-400">❌ Erro no transcoding{transcoding.error ? `: ${transcoding.error}` : ""}</span>
                      ) : transcoding.status === "queued" ? (
                        <><Loader2 className="w-3 h-3 animate-spin text-amber-400" /> Vídeo recebido — preparando transcoding...</>
                      ) : (
                        <><Loader2 className="w-3 h-3 animate-spin text-amber-400" /> Transcodificando HLS (240p / 480p / 720p / 1080p)...</>
                      )}
                    </span>
                    <span className="font-mono text-amber-300">{transcoding.progress}%</span>
                  </div>
                  <Progress value={transcoding.progress} />
                  <div className="flex justify-between items-center text-[10px] text-zinc-500">
                    <span>Job: {transcoding.jobId} — pode levar alguns minutos.</span>
                    <button type="button" onClick={() => { setShowLogs((s) => !s); fetchLogs(transcoding.jobId); }} className="underline hover:text-amber-300">
                      {showLogs ? "Ocultar logs" : "Ver logs do servidor"}
                    </button>
                  </div>
                  {showLogs && (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded bg-black/60 border border-zinc-700 p-2 font-mono text-[10px] text-zinc-300 whitespace-pre-wrap">
                      {transcodeLogs.length === 0 ? (
                        <div className="text-zinc-500">Nenhum log ainda. Aguardando ffmpeg iniciar…</div>
                      ) : (
                        transcodeLogs.map((l, i) => <div key={i}>{l}</div>)
                      )}
                    </div>
                  )}
                </div>
              )}

              {serverVideos.length > 0 && (
                <div className="border border-zinc-800 rounded-lg max-h-56 overflow-y-auto">
                  {serverVideos.map((v) => (
                    <div key={v.name} className="flex items-center gap-2 p-2 border-b border-zinc-800 last:border-0 text-sm">
                      <Video className="w-4 h-4 text-zinc-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-zinc-300">{v.name}</div>
                        {(v.ready === false || v.status === "queued" || v.status === "processing" || v.status === "error") && (
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                            {v.status === "error" ? (
                              <span className="text-red-400">Erro no transcoding</span>
                            ) : (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                                <span>Transcoding em andamento</span>
                                <span className="font-mono text-amber-300">{Math.round(v.progress || 0)}%</span>
                                <Progress value={v.progress || 0} className="h-1 w-28" />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <Button size="sm" variant="outline" disabled={v.ready === false || v.can_use === false || v.status === "queued" || v.status === "processing" || v.status === "error"} onClick={() => selectExistingVideo(v)}>
                        {v.ready === false || v.status === "queued" || v.status === "processing" ? "Aguarde" : "Usar"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteServerVideo(v.name)}><Trash2 className="w-3 h-3 text-red-400" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>


          <TabsContent value="leads" className="space-y-4">
            <Card className="p-4 bg-gradient-to-br from-emerald-950/40 to-teal-950/40 border-emerald-800/50">
              <div className="flex items-center gap-2 text-emerald-300 text-xs uppercase tracking-widest mb-3">
                <Send className="w-3 h-3" /> Cadastrar lead manualmente (libera desconto 48h + ativa remarketing automático)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input placeholder="Nome" value={manualNome} onChange={(e) => setManualNome(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white" />
                <Input placeholder="Email" type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white" />
                <Input placeholder="WhatsApp" value={manualWhatsapp} onChange={(e) => setManualWhatsapp(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white" />
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={manualSending || !manualNome.trim() || !manualEmail.trim() || !manualWhatsapp.trim()}
                  onClick={async () => {
                    setManualSending(true);
                    try {
                      const { data, error } = await supabase.functions.invoke("estrutura4-discount", {
                        body: {
                          action: "create_lead",
                          nome: manualNome.trim(),
                          email: manualEmail.trim().toLowerCase(),
                          whatsapp: manualWhatsapp.trim(),
                          source: "admin_manual",
                        },
                      });
                      if (error || !data?.success) {
                        toast.error("Erro ao cadastrar lead");
                      } else {
                        toast.success("Lead cadastrado! Desconto 48h liberado e email enviado.");
                        setManualNome(""); setManualEmail(""); setManualWhatsapp("");
                        if (creds) fetchData(creds);
                      }
                    } catch (e: any) {
                      toast.error(e?.message || "Falha");
                    } finally {
                      setManualSending(false);
                    }
                  }}
                >
                  {manualSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1" />Cadastrar + Enviar</>}
                </Button>
              </div>
              <p className="text-xs text-zinc-400 mt-2">Se o cliente comprar dentro de 48h, o remarketing para automaticamente. Se não comprar, sequência de followups é disparada (8h, 18h, 32h).</p>
            </Card>
            <Card className="p-0 bg-zinc-900 border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-800 text-zinc-300">
                    <tr>
                      <th className="text-left p-3">Nome</th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">WhatsApp</th>
                      <th className="text-left p-3">Cadastro</th>
                      <th className="text-left p-3">Expira em</th>
                      <th className="text-left p-3">Emails</th>
                      <th className="text-left p-3">Acessou</th>
                      <th className="text-left p-3">Comprou?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.length === 0 && (
                      <tr><td colSpan={8} className="p-6 text-center text-zinc-500">Nenhum lead ainda.</td></tr>
                    )}
                    {leads.map((l) => {
                      const exp = new Date(l.expires_at).getTime();
                      const expired = exp < now;
                      const bought = purchaseEmails.has(l.email.toLowerCase());
                      return (
                        <tr key={l.id} className="border-t border-zinc-800">
                          <td className="p-3">{l.nome}</td>
                          <td className="p-3 text-zinc-300">{l.email}</td>
                          <td className="p-3">{l.whatsapp}</td>
                          <td className="p-3 text-zinc-400">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                          <td className={`p-3 ${expired ? "text-red-400" : "text-yellow-400"}`}>
                            {new Date(l.expires_at).toLocaleString("pt-BR")} {expired && "(expirado)"}
                          </td>
                          <td className="p-3">{l.emails_sent_count}</td>
                          <td className="p-3">{l.accessed_discount_at ? new Date(l.accessed_discount_at).toLocaleString("pt-BR") : "—"}</td>
                          <td className="p-3">{bought ? <span className="text-emerald-400 font-bold">✓ APROVADO</span> : <span className="text-zinc-600">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="purchases">
            <Card className="p-0 bg-zinc-900 border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-800 text-zinc-300">
                    <tr>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Username</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Expira</th>
                      <th className="text-left p-3">Criado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.length === 0 && (
                      <tr><td colSpan={5} className="p-6 text-center text-zinc-500">Nenhuma compra aprovada via desconto ainda.</td></tr>
                    )}
                    {purchases.map((p) => (
                      <tr key={p.email} className="border-t border-zinc-800">
                        <td className="p-3 text-zinc-300">{p.email}</td>
                        <td className="p-3">{p.username}</td>
                        <td className="p-3"><span className="text-emerald-400 font-bold uppercase text-xs">{p.subscription_status}</span></td>
                        <td className="p-3 text-zinc-400">{p.subscription_end ? new Date(p.subscription_end).toLocaleString("pt-BR") : "—"}</td>
                        <td className="p-3 text-zinc-400">{new Date(p.created_at).toLocaleString("pt-BR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="visits">
            <Card className="p-0 bg-zinc-900 border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-800 text-zinc-300">
                    <tr>
                      <th className="text-left p-3">Evento / Página</th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">IP</th>
                      <th className="text-left p-3">Quando</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.length === 0 && (
                      <tr><td colSpan={4} className="p-6 text-center text-zinc-500">Nenhuma visita ainda.</td></tr>
                    )}
                    {visits.map((v) => (
                      <tr key={v.id} className="border-t border-zinc-800">
                        <td className="p-3 text-zinc-300 font-mono text-xs">{v.page}</td>
                        <td className="p-3">{v.email || "—"}</td>
                        <td className="p-3 text-zinc-500 text-xs">{v.ip || "—"}</td>
                        <td className="p-3 text-zinc-400">{new Date(v.created_at).toLocaleString("pt-BR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="remarketing">
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat icon={Users} label="Leads (rendaextra)" value={rmLeads.length} accent="cyan" />
                <Stat icon={Ban} label="Já compraram (excluídos)" value={rmLeads.filter(l => rmPaidEmails.includes(l.email.toLowerCase())).length} accent="rose" />
                <Stat icon={Send} label="Remarketings enviados" value={rmLogs.length} accent="emerald" />
                <Stat icon={MailCheck} label="Acessaram desconto" value={rmDiscountLeads.filter(d => d.accessed_discount_at).length} accent="sky" />

              </div>

              {/* Filters + actions */}
              <Card className="p-4 bg-zinc-900 border-zinc-800 space-y-3">
                <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-widest">
                  <Filter className="w-3 h-3" /> Filtros e disparo
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex gap-1">
                    <Button size="sm" variant={rmFilterDevice === "all" ? "default" : "outline"} onClick={() => setRmFilterDevice("all")}>Todos</Button>
                    <Button size="sm" variant={rmFilterDevice === "computer" ? "default" : "outline"} onClick={() => setRmFilterDevice("computer")}><Monitor className="w-3 h-3 mr-1" />Computador/Notebook/Mac</Button>
                    <Button size="sm" variant={rmFilterDevice === "mobile" ? "default" : "outline"} onClick={() => setRmFilterDevice("mobile")}><Smartphone className="w-3 h-3 mr-1" />Sem computador</Button>
                  </div>
                  <label className="flex items-center gap-2 text-zinc-300 ml-2">
                    <Checkbox checked={rmHideBought} onCheckedChange={(c) => setRmHideBought(!!c)} />
                    Ocultar quem já comprou (Instagram Nova)
                  </label>
                  <label className="flex items-center gap-2 text-zinc-300">
                    <Checkbox checked={rmHideAlreadySent} onCheckedChange={(c) => setRmHideAlreadySent(!!c)} />
                    Ocultar quem já recebeu remarketing
                  </label>
                  <Button size="sm" variant="outline" onClick={() => loadRemarketing()} disabled={rmLoading}>
                    {rmLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Recarregar"}
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-800">
                  <label className="text-xs text-zinc-400">Delay entre envios (segundos):</label>
                  <Input type="number" min={1} max={120} value={rmDelaySeconds} onChange={(e) => setRmDelaySeconds(Math.max(1, parseInt(e.target.value || "8")))} className="w-24 h-8 bg-zinc-800 border-zinc-700 text-white" />
                  <Button size="sm" variant="outline" onClick={toggleSelectAll}>
                    {rmSelected.size === filteredRmLeads.length && filteredRmLeads.length > 0 ? "Desmarcar todos" : `Selecionar todos (${filteredRmLeads.length})`}
                  </Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={rmSending || rmSelected.size === 0} onClick={sendRemarketingBatch}>
                    {rmSending ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Enviando {rmProgress.done}/{rmProgress.total}</> : <><Send className="w-3 h-3 mr-1" />Disparar para {rmSelected.size} selecionado(s)</>}
                  </Button>
                  <span className="text-xs text-zinc-500">Cada envio cria/renova um link de desconto válido por 48h. Lead duplicado tem o contador de envios incrementado (até 4 ao todo).</span>
                </div>
                {rmSending && (
                  <div className="space-y-1">
                    <div className="text-xs text-zinc-400 flex justify-between"><span>Enviando: {rmProgress.lastEmail}</span><span>{rmProgress.done}/{rmProgress.total}</span></div>
                    <Progress value={(rmProgress.done / Math.max(1, rmProgress.total)) * 100} />
                  </div>
                )}
              </Card>

              {/* Lead list */}
              <Card className="p-0 bg-zinc-900 border-zinc-800 overflow-hidden">
                <div className="p-3 text-xs text-zinc-400 border-b border-zinc-800">Leads de <span className="text-zinc-200 font-mono">/rendaextra/admin</span> ({filteredRmLeads.length} após filtros)</div>
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-800 text-zinc-300 sticky top-0">
                      <tr>
                        <th className="p-2 w-8"></th>
                        <th className="text-left p-2">Nome</th>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">WhatsApp</th>
                        <th className="text-left p-2">Dispositivo</th>
                        <th className="text-left p-2">Cadastro</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRmLeads.length === 0 && (
                        <tr><td colSpan={7} className="p-6 text-center text-zinc-500">Nenhum lead após os filtros.</td></tr>
                      )}
                      {filteredRmLeads.map((l) => {
                        const k = l.email.toLowerCase();
                        const bought = rmPaidEmails.includes(k);
                        const alreadySent = rmLogs.some((r) => r.email.toLowerCase() === k);
                        const accessed = rmDiscountLeads.some((d) => d.email.toLowerCase() === k && d.accessed_discount_at);
                        const isComp = isComputerType(l.tipo_computador);
                        return (
                          <tr key={l.id} className="border-t border-zinc-800">
                            <td className="p-2"><Checkbox checked={rmSelected.has(k)} onCheckedChange={() => toggleOne(l.email)} disabled={bought} /></td>
                            <td className="p-2">{l.nome_completo}</td>
                            <td className="p-2 text-zinc-300">{l.email}</td>
                            <td className="p-2">{l.whatsapp}</td>
                            <td className="p-2">{isComp ? <span className="text-violet-300 flex items-center gap-1"><Monitor className="w-3 h-3" />{l.tipo_computador}</span> : <span className="text-cyan-300 flex items-center gap-1"><Smartphone className="w-3 h-3" />{l.tipo_computador || "—"}</span>}</td>
                            <td className="p-2 text-zinc-400 text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                            <td className="p-2 text-xs">
                              {bought && <span className="text-red-400 font-bold">✓ JÁ COMPROU</span>}
                              {!bought && accessed && <span className="text-emerald-400">acessou desconto</span>}
                              {!bought && !accessed && alreadySent && <span className="text-amber-400">remarketing enviado</span>}
                              {!bought && !accessed && !alreadySent && <span className="text-zinc-500">novo</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Sent log */}
              <Card className="p-0 bg-zinc-900 border-zinc-800 overflow-hidden">
                <div className="p-3 text-xs text-zinc-400 border-b border-zinc-800">Histórico de remarketing enviado ({rmLogs.length})</div>
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-800 text-zinc-300 sticky top-0">
                      <tr>
                        <th className="text-left p-2">Quando</th>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Nome</th>
                        <th className="text-left p-2">Dispositivo</th>
                        <th className="text-left p-2">Acessou desconto?</th>
                        <th className="text-left p-2">Status envio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rmLogs.length === 0 && (
                        <tr><td colSpan={6} className="p-6 text-center text-zinc-500">Nenhum remarketing disparado ainda.</td></tr>
                      )}
                      {rmLogs.map((r) => {
                        const dl = rmDiscountLeads.find((d) => d.email.toLowerCase() === r.email.toLowerCase());
                        return (
                          <tr key={r.id} className="border-t border-zinc-800">
                            <td className="p-2 text-zinc-400 text-xs">{new Date(r.sent_at).toLocaleString("pt-BR")}</td>
                            <td className="p-2 text-zinc-300">{r.email}</td>
                            <td className="p-2">{r.nome || "—"}</td>
                            <td className="p-2 text-xs">{r.tipo_computador || "—"}</td>
                            <td className="p-2 text-xs">{dl?.accessed_discount_at ? <span className="text-emerald-400">✓ {new Date(dl.accessed_discount_at).toLocaleString("pt-BR")}</span> : <span className="text-zinc-600">—</span>}</td>
                            <td className="p-2 text-xs">{r.success ? <span className="text-emerald-400">enviado</span> : <span className="text-red-400">falhou</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
