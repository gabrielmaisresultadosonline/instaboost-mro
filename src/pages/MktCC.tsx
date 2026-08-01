import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2, Lock, CheckCircle2, MessageSquareWarning, Play, Images,
  ChevronLeft, ChevronRight, Instagram, ListChecks, FileText, Rocket,
  History as HistoryIcon, Facebook, Camera, CalendarDays,
} from "lucide-react";
import { PhoneInstagramPreview } from "@/components/mktcc/PhoneInstagramPreview";
import { MediaPopup } from "@/components/MediaPopup";

interface MktccPost {
  id: string;
  post_type: "image" | "video" | "carousel";
  media_urls: string[];
  caption: string;
  order_index: number;
  status: "pending" | "approved" | "changes";
  client_note: string;
  previous_media_urls: string[];
  previous_caption: string;
  revision_note: string;
  revision_count: number;
  aspect_ratio: string;
  cycle_id: string | null;
}

interface MktccCycle {
  id: string;
  title: string;
  scheduled_date: string | null;
  note: string;
  status: "open" | "done";
  completed_at: string | null;
  order_index: number;
  is_done: boolean;
}

interface MktccProject {
  id: string;
  company_name: string;
  strategy_title: string;
  strategy_text: string;
  summary_text: string;
  next_steps_text: string;
  instagram_handle: string;
  avatar_url: string;
  instagram_bio: string;
  all_approved_at: string | null;
  next_step_released: boolean;
  before_instagram_urls: string[];
  before_facebook_urls: string[];
  before_note: string;
  logo_enabled: boolean;
  logo_before_url: string;
  logo_after_url: string;
  logo_reason: string;
  logo_status: "pending" | "approved" | "changes";
  logo_client_note: string;
}


const STORAGE_KEY = "mktcc_access_code";

const statusBadge = (status: MktccPost["status"]) => {
  const base = "rounded-full font-black uppercase border-2 border-foreground";
  if (status === "approved") return <Badge className={`${base} bg-primary text-primary-foreground`}>Aprovado</Badge>;
  if (status === "changes") return <Badge className={`${base} bg-destructive text-destructive-foreground`}>Ajustar</Badge>;
  return <Badge className={`${base} bg-card text-foreground`}>Pendente</Badge>;
};

const MktCC = () => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<MktccProject | null>(null);
  const [posts, setPosts] = useState<MktccPost[]>([]);
  const [activePost, setActivePost] = useState<MktccPost | null>(null);
  const [slide, setSlide] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [cycles, setCycles] = useState<MktccCycle[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string>("none");
  const [mediaPopup, setMediaPopup] = useState<{ url: string; type: "image" | "video" } | null>(null);

  useEffect(() => { document.title = "Aprovação de Conteúdo | Marketing Completo"; }, []);

  const load = async (accessCode: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("mktcc-api", {
        body: { action: "client_load", code: accessCode },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Código inválido");
      setProject({
        ...data.project,
        before_instagram_urls: data.project?.before_instagram_urls || [],
        before_facebook_urls: data.project?.before_facebook_urls || [],
        before_note: data.project?.before_note || "",
      });
      setPosts((data.posts || []).map((p: MktccPost) => ({
        ...p,
        media_urls: p.media_urls || [],
        previous_media_urls: p.previous_media_urls || [],
        previous_caption: p.previous_caption || "",
        revision_note: p.revision_note || "",
        revision_count: p.revision_count || 0,
        aspect_ratio: p.aspect_ratio || "4/5",
        cycle_id: p.cycle_id ?? null,
      })));
      const loaded: MktccCycle[] = data.cycles || [];
      setCycles(loaded);
      setActiveCycleId((prev) => {
        if (prev !== "none" && loaded.some((c) => c.id === prev)) return prev;
        const open = loaded.find((c) => !c.is_done);
        return open?.id || loaded[loaded.length - 1]?.id || "none";
      });
      localStorage.setItem(STORAGE_KEY, accessCode);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar";
      if (!silent) toast.error(message);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { setCode(saved); load(saved, true); }
  }, []);

  const openPost = (post: MktccPost) => {
    setActivePost(post);
    setSlide(0);
    setNote(post.client_note || "");
  };

  const cycleById = (id: string | null) => cycles.find((c) => c.id === id) || null;

  const review = async (status: MktccPost["status"]) => {
    if (!activePost || !project) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("mktcc-api", {
        body: {
          action: "client_review",
          code: localStorage.getItem(STORAGE_KEY),
          post_id: activePost.id,
          status,
          client_note: note,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao salvar");
      setPosts((prev) => prev.map((p) => (p.id === activePost.id ? { ...p, status, client_note: note } : p)));
      setActivePost((prev) => (prev ? { ...prev, status, client_note: note } : prev));
      setProject((prev) => (prev ? { ...prev, all_approved_at: data.all_approved ? new Date().toISOString() : null } : prev));
      toast.success(
        status === "approved" ? "Publicação aprovada!" : status === "pending" ? "Aprovação removida" : "Observação salva!"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const progress = useMemo(() => {
    const approved = posts.filter((p) => p.status === "approved").length;
    const changes = posts.filter((p) => p.status === "changes").length;
    return { approved, changes, pending: posts.length - approved - changes, total: posts.length };
  }, [posts]);

  const allApproved = progress.total > 0 && progress.approved === progress.total;
  const activeCycle = cycles.find((c) => c.id === activeCycleId) || null;
  const activeCycleDone = !!activeCycle?.is_done;
  const viewPosts = cycles.length > 0
    ? posts.filter((p) => (p.cycle_id || "none") === activeCycleId)
    : posts;
  const activePostLocked = !!activePost && !!cycleById(activePost.cycle_id)?.is_done;
  const formatDate = (value: string | null) =>
    value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : null;

  if (!project) {
    return (
      <main className="mktcc min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10 mktcc-dots">
        <Card className="w-full max-w-md mktcc-pop rounded-2xl overflow-hidden mktcc-rise">
          <div className="h-2 mktcc-gradient" />
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary flex items-center justify-center border-2 border-foreground mktcc-pulse">
              <Lock className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl font-black uppercase tracking-tight">
              Área de <span className="mktcc-gradient-text">Aprovação</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Digite o código de acesso enviado pela nossa equipe para ver a estratégia e aprovar os conteúdos.
            </p>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); load(code.trim().toUpperCase()); }}
            >
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CÓDIGO DE ACESSO"
                className="text-center tracking-[0.3em] uppercase font-bold border-2 border-foreground h-12 rounded-xl"
                maxLength={20}
              />
              <Button
                type="submit"
                className="w-full h-12 text-base font-black uppercase mktcc-pop-sm rounded-xl"
                disabled={loading || code.trim().length < 4}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Acessar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mktcc min-h-screen bg-background text-foreground">
      <div className="h-2 mktcc-gradient" />
      <header className="border-b-[3px] border-foreground bg-card">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-4">
          <div className="mktcc-ring shrink-0">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-background">
              {project.avatar_url ? (
                <img src={project.avatar_url} alt={`Perfil de ${project.company_name}`} className="w-full h-full object-cover" />
              ) : (
                <Instagram className="w-7 h-7 text-muted-foreground" />
              )}
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight truncate">{project.company_name}</h1>
            <p className="text-sm font-semibold text-muted-foreground truncate">
              {project.instagram_handle ? `@${project.instagram_handle.replace("@", "")}` : "Prévia da rede social"}
            </p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge className="mktcc-pop-sm rounded-full bg-secondary text-secondary-foreground font-bold uppercase">
                {progress.total} publicações
              </Badge>
              <Badge className="mktcc-pop-sm rounded-full bg-primary text-primary-foreground font-bold uppercase">
                {progress.approved} aprovadas
              </Badge>
              {progress.changes > 0 && (
                <Badge className="mktcc-pop-sm rounded-full bg-destructive text-destructive-foreground font-bold uppercase">
                  {progress.changes} para ajustar
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="feed">
          <TabsList className="w-full grid grid-cols-2 md:grid-cols-5 h-auto gap-1 p-1.5 rounded-2xl bg-secondary mktcc-pop-sm">
            {[
              { v: "feed", l: "Feed" },
              { v: "estrategia", l: "Estratégia" },
              { v: "resumo", l: "Resumo" },
              { v: "antes", l: "Antes" },
              { v: "proximos", l: "Próximos passos" },
            ].map((t) => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className="rounded-xl font-bold uppercase text-xs md:text-sm text-secondary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {t.l}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="feed" className="mt-6">
            {allApproved && (
              <Card className="mb-6 mktcc-pop rounded-2xl bg-primary mktcc-rise">
                <CardContent className="p-5 flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black uppercase text-primary-foreground">Tudo aprovado! 🎉</p>
                    <p className="text-sm font-medium text-primary-foreground/80">
                      Todas as publicações foram aprovadas. Já liberamos a aba <strong>Próximos passos</strong> com o que acontece agora.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            {progress.changes > 0 && (
              <Card className="mb-6 mktcc-pop rounded-2xl bg-destructive mktcc-rise">
                <CardContent className="p-5 flex items-start gap-3">
                  <MessageSquareWarning className="w-6 h-6 text-destructive-foreground shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-destructive-foreground">
                    {progress.changes} publicação(ões) com alteração solicitada. Nossa equipe vai ajustar e você verá a
                    versão anterior em cinza junto da nova versão para aprovar.
                  </p>
                </CardContent>
              </Card>
            )}
            {cycles.length > 0 && (
              <div className="mb-6 space-y-3">
                <p className="text-xs font-black uppercase text-muted-foreground">Programações</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {cycles.map((cycle) => {
                    const count = posts.filter((p) => p.cycle_id === cycle.id).length;
                    const isActive = cycle.id === activeCycleId;
                    return (
                      <button
                        key={cycle.id}
                        onClick={() => setActiveCycleId(cycle.id)}
                        className={`text-left rounded-2xl border-2 border-foreground p-4 transition-colors ${
                          isActive ? "bg-primary text-primary-foreground mktcc-pop-sm" : "bg-card text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <CalendarDays className="w-4 h-4" />
                          <span className="font-black uppercase">{cycle.title}</span>
                          {cycle.is_done
                            ? <Badge className="rounded-full font-black uppercase border-2 border-foreground bg-card text-foreground">Já processado</Badge>
                            : <Badge className="rounded-full font-black uppercase border-2 border-foreground bg-card text-foreground">Em aprovação</Badge>}
                        </div>
                        <p className="mt-1 text-xs font-bold uppercase opacity-80">
                          {formatDate(cycle.scheduled_date) ? `Data: ${formatDate(cycle.scheduled_date)} · ` : ""}
                          {count} publicação(ões)
                        </p>
                        {cycle.note && <p className="mt-1 text-sm font-medium whitespace-pre-wrap opacity-90">{cycle.note}</p>}
                      </button>
                    );
                  })}
                  {posts.some((p) => !p.cycle_id) && (
                    <button
                      onClick={() => setActiveCycleId("none")}
                      className={`text-left rounded-2xl border-2 border-foreground p-4 ${
                        activeCycleId === "none" ? "bg-primary text-primary-foreground mktcc-pop-sm" : "bg-card text-foreground"
                      }`}
                    >
                      <span className="font-black uppercase">Programação inicial</span>
                      <p className="mt-1 text-xs font-bold uppercase opacity-80">
                        {posts.filter((p) => !p.cycle_id).length} publicação(ões)
                      </p>
                    </button>
                  )}
                </div>
                {activeCycleDone && (
                  <Card className="mktcc-pop-sm rounded-2xl bg-card">
                    <CardContent className="p-4 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                      <p className="text-sm font-semibold">
                        Esta programação já foi <strong>processada e finalizada</strong>. Você pode ver tudo o que foi
                        publicado, mas não é mais possível editar ou aprovar itens deste ciclo.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            <div className="mb-4">
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl bg-primary border-2 border-foreground">
                  <ListChecks className="w-5 h-5 text-primary-foreground" />
                </span>
                Prévia e <span className="mktcc-gradient-text">aprovação</span>
              </h2>
              <p className="text-sm font-medium text-muted-foreground">
                Toque em cada quadradinho para ver o material, a legenda e aprovar ou deixar uma observação.
              </p>
            </div>
            {viewPosts.length === 0 ? (
              <p className="text-sm font-semibold text-muted-foreground py-12 text-center">
                Nenhuma publicação cadastrada ainda. Volte em breve.
              </p>
            ) : (
              <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
              <div>
              <div className="grid grid-cols-3 gap-1.5 md:gap-3 p-2 md:p-3 rounded-2xl bg-card mktcc-pop-sm">
                {viewPosts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => openPost(post)}
                    className="mktcc-tile relative aspect-[4/5] bg-muted overflow-hidden rounded-xl border-2 border-foreground group"
                    aria-label="Abrir publicação"
                  >
                    {post.post_type === "video" ? (
                      <video src={post.media_urls[0]} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <img src={post.media_urls[0]} alt={post.caption.slice(0, 60) || "Publicação"} loading="lazy" className="w-full h-full object-cover" />
                    )}
                    <span className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-colors" />
                    {post.status === "approved" && (
                      <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 rotate-[-8deg] bg-primary text-primary-foreground border-y-2 border-foreground py-1 md:py-2 text-center text-[11px] md:text-base font-black uppercase tracking-wider">
                        Aprovada
                      </span>
                    )}
                    <div className="absolute top-1.5 right-1.5 flex w-6 h-6 items-center justify-center rounded-md bg-card border border-foreground">
                      {post.post_type === "carousel" && <Images className="w-3.5 h-3.5 text-foreground" />}
                      {post.post_type === "video" && <Play className="w-3.5 h-3.5 text-foreground" />}
                    </div>
                    <div className="absolute bottom-1.5 left-1.5">
                      {post.status === "approved" && (
                        <span className="flex w-6 h-6 items-center justify-center rounded-full bg-primary border-2 border-foreground">
                          <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                        </span>
                      )}
                      {post.status === "changes" && (
                        <span className="flex w-6 h-6 items-center justify-center rounded-full bg-destructive border-2 border-foreground">
                          <MessageSquareWarning className="w-4 h-4 text-destructive-foreground" />
                        </span>
                      )}
                    </div>

                    {post.revision_count > 0 && post.status === "pending" && (
                      <span className="absolute bottom-1.5 right-1.5 text-[10px] font-black bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md border border-foreground">
                        ATUALIZADO
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs font-bold uppercase text-muted-foreground">
                Formato do feed: 1080x1350 (4:5) — nada é cortado.
              </p>
              </div>
              <div className="lg:sticky lg:top-6">
                <p className="mb-2 text-xs font-black uppercase text-muted-foreground text-center">
                  Prévia no celular
                </p>
                <PhoneInstagramPreview
                  companyName={project.company_name}
                  instagramHandle={project.instagram_handle}
                  avatarUrl={project.avatar_url}
                  bio={project.instagram_bio}
                  posts={viewPosts}
                  onSelect={(id) => {
                    const found = viewPosts.find((p) => p.id === id);
                    if (found) openPost(found);
                  }}
                />
              </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="antes" className="mt-6 space-y-6">
            <Card className="mktcc-pop rounded-2xl overflow-hidden mktcc-rise">
              <div className="h-2 mktcc-gradient" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
                  <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl bg-primary border-2 border-foreground">
                    <Camera className="w-5 h-5 text-primary-foreground" />
                  </span>
                  Como o perfil <span className="mktcc-gradient-text">começou</span>
                </CardTitle>
                <p className="text-sm font-semibold text-muted-foreground">
                  Registro do ponto de partida, para comparar com o resultado depois.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {project.before_note && (
                  <p className="whitespace-pre-wrap text-sm md:text-base font-medium leading-relaxed text-foreground/80">
                    {project.before_note}
                  </p>
                )}
                {[
                  { title: "Instagram", icon: <Instagram className="w-4 h-4" />, urls: project.before_instagram_urls },
                  { title: "Facebook", icon: <Facebook className="w-4 h-4" />, urls: project.before_facebook_urls },
                ].map((group) => (
                  <div key={group.title} className="space-y-2">
                    <p className="flex items-center gap-2 text-xs font-black uppercase">
                      {group.icon} {group.title}
                    </p>
                    {group.urls.length === 0 ? (
                      <p className="text-sm font-medium text-muted-foreground">Sem registros ainda.</p>
                    ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {group.urls.map((url, i) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setMediaPopup({ url, type: "image" })}
                            className="mktcc-tile block rounded-xl overflow-hidden border-2 border-foreground bg-muted text-left"
                          >
                            <img src={url} alt={`${group.title} antes ${i + 1}`} loading="lazy" className="w-full h-auto" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="estrategia" className="mt-6">
            <Card className="mktcc-pop rounded-2xl overflow-hidden mktcc-rise">
              <div className="h-2 mktcc-gradient" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
                  <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl bg-primary border-2 border-foreground">
                    <FileText className="w-5 h-5 text-primary-foreground" />
                  </span>
                  {project.strategy_title || "Primeiro passo: Estrutura de Rede Social"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm md:text-base font-medium leading-relaxed text-foreground/80">
                  {project.strategy_text || "Estratégia em preparação."}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resumo" className="mt-6">
            <Card className="mktcc-pop rounded-2xl overflow-hidden mktcc-rise">
              <div className="h-2 bg-primary" />
              <CardHeader>
                <CardTitle className="text-xl font-black uppercase tracking-tight">Resumo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm md:text-base font-medium leading-relaxed text-foreground/80">
                  {project.summary_text || "Resumo em preparação."}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="proximos" className="mt-6">
            {!allApproved && !project.next_step_released ? (
              <Card className="rounded-2xl border-[3px] border-dashed border-foreground bg-muted mktcc-rise">
                <CardContent className="p-10 text-center space-y-3">
                  <span className="mx-auto flex w-14 h-14 items-center justify-center rounded-full bg-card border-2 border-foreground">
                    <Lock className="w-6 h-6 text-foreground" />
                  </span>
                  <p className="font-black uppercase text-lg">Próximo passo bloqueado</p>
                  <p className="text-sm font-medium text-muted-foreground">
                    Aprove todas as {progress.total} publicações do feed para liberar esta etapa.
                    Faltam {progress.total - progress.approved}.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="mktcc-pop rounded-2xl overflow-hidden mktcc-rise">
                <div className="h-2 mktcc-gradient" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
                    <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl bg-primary border-2 border-foreground mktcc-pulse">
                      <Rocket className="w-5 h-5 text-primary-foreground" />
                    </span>
                    Próximos passos
                  </CardTitle>
                  <p className="text-sm font-semibold text-muted-foreground">
                    Conteúdo 100% aprovado — agora vamos para a próxima etapa.
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm md:text-base font-medium leading-relaxed text-foreground/80">
                    {project.next_steps_text || "Nossa equipe já foi avisada e vai detalhar aqui os próximos passos."}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!activePost} onOpenChange={(open) => !open && setActivePost(null)}>
        <DialogContent className="mktcc max-w-lg max-h-[90vh] overflow-y-auto bg-background text-foreground border-[3px] border-foreground rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
              Publicação {activePost ? viewPosts.findIndex((p) => p.id === activePost.id) + 1 : ""}
              {activePost && statusBadge(activePost.status)}
            </DialogTitle>
          </DialogHeader>

          {activePost && (
            <div className="space-y-4">
              {activePost.revision_count > 0 && (
                <div className="rounded-xl bg-primary p-3 space-y-1 mktcc-pop-sm">
                  <p className="text-xs font-black uppercase text-primary-foreground">
                    Versão atualizada (alteração nº {activePost.revision_count})
                  </p>
                  {activePost.revision_note && (
                    <p className="text-sm font-medium whitespace-pre-wrap text-primary-foreground">{activePost.revision_note}</p>
                  )}
                  <p className="text-xs text-primary-foreground/80">
                    A versão anterior aparece abaixo em cinza, só para comparação.
                  </p>
                </div>
              )}

              <div
                className="relative bg-muted rounded-xl overflow-hidden border-2 border-foreground flex items-center justify-center"
                style={{ aspectRatio: activePost.aspect_ratio?.replace("/", " / ") || "4 / 5" }}
              >
                {activePost.post_type === "video" ? (
                  <video src={activePost.media_urls[0]} controls className="w-full h-full object-contain" />
                ) : (
                  <img
                    src={activePost.media_urls[slide]}
                    alt={activePost.caption.slice(0, 80) || "Material da publicação"}
                    className="w-full h-full object-contain"
                  />
                )}
                {activePost.post_type === "carousel" && activePost.media_urls.length > 1 && (
                  <>
                    <Button
                      size="icon" variant="secondary"
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                      onClick={() => setSlide((s) => (s === 0 ? activePost.media_urls.length - 1 : s - 1))}
                      aria-label="Anterior"
                    ><ChevronLeft className="w-4 h-4" /></Button>
                    <Button
                      size="icon" variant="secondary"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setSlide((s) => (s + 1) % activePost.media_urls.length)}
                      aria-label="Próximo"
                    ><ChevronRight className="w-4 h-4" /></Button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs bg-background/80 px-2 py-0.5 rounded">
                      {slide + 1}/{activePost.media_urls.length}
                    </div>
                  </>
                )}
              </div>

              <div>
                <p className="text-xs font-black uppercase text-muted-foreground mb-1">
                  {activePost.revision_count > 0 ? "Legenda atualizada" : "Legenda"}
                </p>
                <p className="whitespace-pre-wrap text-sm font-medium">{activePost.caption || "Sem legenda."}</p>
              </div>

              {activePost.revision_count > 0 &&
                (activePost.previous_media_urls.length > 0 || activePost.previous_caption) && (
                <div className="rounded-xl border-2 border-border p-3 space-y-2 opacity-60 bg-muted">
                  <div className="flex items-center gap-2">
                    <HistoryIcon className="w-4 h-4 text-muted-foreground" />
                    <p className="text-xs font-black uppercase text-muted-foreground">Versão anterior (substituída)</p>
                  </div>
                  {activePost.previous_media_urls.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {activePost.previous_media_urls.map((url, i) => (
                        <div key={url} className="w-20 h-20 rounded-lg overflow-hidden bg-muted grayscale border border-border">
                          {/\.(mp4|webm|mov)(\?|$)/i.test(url) ? (
                            <video src={url} className="w-full h-full object-cover" muted />
                          ) : (
                            <img src={url} alt={`Versão anterior ${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {activePost.previous_caption && (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground line-through decoration-muted-foreground/50">
                      {activePost.previous_caption}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-black uppercase text-muted-foreground">Observação / alteração</p>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Escreva aqui o que deseja alterar ou acrescentar..."
                  readOnly={activePostLocked}
                  rows={4}
                  className="border-2 border-foreground rounded-xl font-medium"
                />
              </div>

              {activePostLocked ? (
                <p className="rounded-xl border-2 border-foreground bg-card p-3 text-sm font-bold uppercase">
                  Programação já processada e finalizada — aprovações encerradas.
                </p>
              ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                {activePost.status === "approved" ? (
                  <Button
                    className="flex-1 h-12 font-black uppercase mktcc-pop-sm rounded-xl bg-card hover:bg-muted"
                    variant="outline"
                    onClick={() => review("pending")}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Desaprovar</>}
                  </Button>
                ) : (
                  <Button
                    className="flex-1 h-12 font-black uppercase mktcc-pop-sm rounded-xl"
                    onClick={() => review("approved")}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Aprovar</>}
                  </Button>
                )}
                <Button
                  className="flex-1 h-12 font-black uppercase mktcc-pop-sm rounded-xl bg-card hover:bg-muted"
                  variant="outline"
                  onClick={() => review("changes")}
                  disabled={saving || !note.trim()}
                >
                  <MessageSquareWarning className="w-4 h-4 mr-2" /> Pedir alteração
                </Button>
              </div>

              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {mediaPopup && (
        <MediaPopup
          url={mediaPopup.url}
          type={mediaPopup.type}
          onClose={() => setMediaPopup(null)}
        />
      )}
    </main>
  );
};

export default MktCC;
