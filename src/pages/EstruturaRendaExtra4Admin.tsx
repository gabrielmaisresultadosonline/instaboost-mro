import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, LogOut, Users, Eye, Clock, CheckCircle2, MousePointerClick, Briefcase, Crown, Rocket, DollarSign, TrendingUp, Upload, Video, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

const VIDEO_SERVER = "https://video.maisresultadosonline.com.br";

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
  const [transcoding, setTranscoding] = useState<{ jobId: string; progress: number; status: string } | null>(null);
  const [serverVideos, setServerVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => { if (creds) { fetchData(creds); loadVideoCfg(); loadServerVideos(); } }, [creds]);

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

  const selectExistingVideo = (video: any) => {
    const baseName = video.name.replace(/\.[^.]+$/, '');
    setVideoUrl(video.url);
    setHlsUrl(`/videos/hls/${baseName}/master.m3u8`);
    toast.success("Vídeo selecionado! Clique em Salvar.");
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
    if (file.size > 3 * 1024 * 1024 * 1024) { toast.error("Máx 3GB"); return; }
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
        setVideoUrl(result.video_url);
        setHlsUrl(result.hls_url);
        toast.success("Upload concluído! Transcodificando HLS...");
        // Inicia polling de status do transcoding
        setTranscoding({ jobId: result.job_id, progress: 0, status: "processing" });
        pollTranscodingStatus(result.job_id);
      } else {
        toast.error("Servidor recusou o upload: " + (result.error || "resposta sem success"));
      }
    } catch (err: any) {
      console.error("[upload] Erro VPS:", err);
      toast.error(err.message || "Erro no upload");
    } finally { setUploading(false); setUploadProgress(0); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const pollTranscodingStatus = async (jobId: string) => {
    const tick = async () => {
      try {
        const res = await fetch(`${VIDEO_SERVER}/api/video/status/${encodeURIComponent(jobId)}`);
        if (!res.ok) throw new Error("status not found");
        const data = await res.json();
        setTranscoding({ jobId, progress: data.progress || 0, status: data.status });
        if (data.status === "completed") {
          toast.success("Transcoding concluído! Vídeo pronto.");
          setTimeout(() => setTranscoding(null), 3000);
          loadServerVideos();
          return;
        }
        if (data.status === "error") {
          toast.error("Erro no transcoding do vídeo.");
          setTimeout(() => setTranscoding(null), 5000);
          return;
        }
        setTimeout(tick, 2000);
      } catch {
        setTimeout(tick, 3000);
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

  // Funnel: prestar → acessar (by unique IP)
  const prestarIps = new Set(visits.filter((v) => v.page === "click:renda-extra2:prestar").map((v) => v.ip).filter(Boolean));
  const acessarIps = new Set(visits.filter((v) => v.page === "click:renda-extra2:acessar-renda-extra-agora").map((v) => v.ip).filter(Boolean));
  const prestarAndAcessar = [...prestarIps].filter((ip) => acessarIps.has(ip)).length;

  const totalPurchases = purchases.length;
  const purchaseEmails = new Set(purchases.map((p) => p.email.toLowerCase()));
  const leadsConverted = leads.filter((l) => purchaseEmails.has(l.email.toLowerCase())).length;
  const convRate = leads.length > 0 ? ((leadsConverted / leads.length) * 100).toFixed(1) : "0.0";

  const Stat = ({ icon: Icon, label, value, color = "text-white" }: any) => (
    <Card className="p-4 bg-zinc-900 border-zinc-800">
      <div className="flex items-center gap-2 text-zinc-400 text-xs"><Icon className="w-4 h-4" />{label}</div>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Admin · Desconto Renda Extra 4</h1>
          <Button variant="outline" onClick={logout}><LogOut className="w-4 h-4 mr-2" /> Sair</Button>
        </div>

        {/* Visitas das páginas */}
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Visitas das páginas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat icon={Eye} label="/renda-extra2" value={`${visitsRendaExtra2} (${uniqueIps("/renda-extra2")} únicos)`} />
          <Stat icon={Eye} label="/estruturarendaextra4" value={`${visitsEstrutura4} (${uniqueIps("/estruturarendaextra4")} únicos)`} />
          <Stat icon={Eye} label="/descontoalunosrendaextrasss" value={`${visitsDiscount} (${uniqueIps("/descontoalunosrendaextrasss")} únicos)`} />
          <Stat icon={MousePointerClick} label="Total de eventos" value={visits.length} color="text-zinc-300" />
        </div>

        {/* Cliques em /renda-extra2 */}
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Cliques em /renda-extra2</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat icon={Briefcase} label="Prestar Serviço com MRO" value={clicksPrestar} color="text-emerald-400" />
          <Stat icon={Crown} label="Seja um Licenciado MRO" value={clicksLicenciado} color="text-amber-400" />
          <Stat icon={Rocket} label="Acessar Renda Extra Agora" value={clicksAcessar} color="text-emerald-300" />
          <Stat icon={TrendingUp} label="Prestar → Acessar (IPs únicos)" value={prestarAndAcessar} color="text-cyan-400" />
        </div>

        {/* Desconto / Funil de venda */}
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Funil de desconto e vendas</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Stat icon={Users} label="Leads (cadastros)" value={leads.length} />
          <Stat icon={Clock} label="Desconto ativo" value={activeLeads} color="text-yellow-400" />
          <Stat icon={CheckCircle2} label="Acessaram desconto" value={accessed} color="text-green-400" />
          <Stat icon={DollarSign} label="Compras aprovadas" value={totalPurchases} color="text-emerald-400" />
          <Stat icon={TrendingUp} label="Conversão lead → compra" value={`${leadsConverted} (${convRate}%)`} color="text-cyan-400" />
        </div>

        {/* Vídeo do /renda-extra2 */}
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-2"><Video className="w-3 h-3" /> Vídeo exibido em /renda-extra2 (Prestar Serviço)</h2>
        <Card className="p-4 bg-zinc-900 border-zinc-800 mb-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="Título (opcional)" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white md:col-span-2" />
            <Input placeholder="video_url (ex: /videos/arquivo.mp4)" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
            <Input placeholder="hls_url (ex: /videos/hls/arquivo/master.m3u8)" value={hlsUrl} onChange={(e) => setHlsUrl(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
          </div>

          <div className="flex flex-wrap gap-2">
            <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleUpload} />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} variant="outline">
              <Upload className="w-4 h-4 mr-2" /> {uploading ? `Enviando ${uploadProgress}%` : "Enviar vídeo p/ servidor"}
            </Button>
            <Button onClick={loadServerVideos} variant="outline" disabled={loadingVideos}>
              {loadingVideos ? <Loader2 className="w-4 h-4 animate-spin" /> : "Recarregar lista"}
            </Button>
            <Button onClick={saveVideo} className="bg-emerald-600 hover:bg-emerald-700 ml-auto">
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
            <div className="space-y-1 p-3 rounded-lg bg-zinc-800/60 border border-zinc-700">
              <div className="text-xs text-zinc-300 flex justify-between items-center">
                <span className="flex items-center gap-2">
                  {transcoding.status === "completed" ? (
                    <><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Transcoding concluído — vídeo pronto!</>
                  ) : transcoding.status === "error" ? (
                    <span className="text-red-400">❌ Erro no transcoding</span>
                  ) : (
                    <><Loader2 className="w-3 h-3 animate-spin text-amber-400" /> Transcodificando HLS (240p / 480p / 720p / 1080p)...</>
                  )}
                </span>
                <span className="font-mono text-amber-300">{transcoding.progress}%</span>
              </div>
              <Progress value={transcoding.progress} />
              <div className="text-[10px] text-zinc-500">Job: {transcoding.jobId} — pode levar alguns minutos dependendo do tamanho do vídeo.</div>
            </div>
          )}

          {serverVideos.length > 0 && (
            <div className="border border-zinc-800 rounded-lg max-h-56 overflow-y-auto">
              {serverVideos.map((v) => (
                <div key={v.name} className="flex items-center gap-2 p-2 border-b border-zinc-800 last:border-0 text-sm">
                  <Video className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span className="flex-1 truncate text-zinc-300">{v.name}</span>
                  <Button size="sm" variant="outline" onClick={() => selectExistingVideo(v)}>Usar</Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteServerVideo(v.name)}><Trash2 className="w-3 h-3 text-red-400" /></Button>
                </div>
              ))}
            </div>
          )}
        </Card>


        <Tabs defaultValue="leads">
          <TabsList className="bg-zinc-900">
            <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
            <TabsTrigger value="purchases">Compras ({totalPurchases})</TabsTrigger>
            <TabsTrigger value="visits">Eventos ({visits.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
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
        </Tabs>
      </div>
    </div>
  );
}
