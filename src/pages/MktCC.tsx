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
  History as HistoryIcon,
} from "lucide-react";

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
  all_approved_at: string | null;
  next_step_released: boolean;
}

const STORAGE_KEY = "mktcc_access_code";

const statusBadge = (status: MktccPost["status"]) => {
  if (status === "approved") return <Badge className="bg-primary text-primary-foreground">Aprovado</Badge>;
  if (status === "changes") return <Badge variant="destructive">Ajustar</Badge>;
  return <Badge variant="secondary">Pendente</Badge>;
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

  useEffect(() => { document.title = "Aprovação de Conteúdo | Marketing Completo"; }, []);

  const load = async (accessCode: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("mktcc-api", {
        body: { action: "client_load", code: accessCode },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Código inválido");
      setProject(data.project);
      setPosts((data.posts || []).map((p: MktccPost) => ({
        ...p,
        media_urls: p.media_urls || [],
        previous_media_urls: p.previous_media_urls || [],
        previous_caption: p.previous_caption || "",
        revision_note: p.revision_note || "",
        revision_count: p.revision_count || 0,
      })));
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
      toast.success(status === "approved" ? "Publicação aprovada!" : "Observação salva!");
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

  if (!project) {
    return (
      <main className="mktcc min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10 mktcc-dots">
        <Card className="w-full max-w-md mktcc-pop rounded-2xl mktcc-rise">
          <div className="h-2 mktcc-gradient rounded-t-xl" />
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
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
            {project.avatar_url ? (
              <img src={project.avatar_url} alt={`Perfil de ${project.company_name}`} className="w-full h-full object-cover" />
            ) : (
              <Instagram className="w-7 h-7 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{project.company_name}</h1>
            <p className="text-sm text-muted-foreground truncate">
              {project.instagram_handle ? `@${project.instagram_handle.replace("@", "")}` : "Prévia da rede social"}
            </p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="secondary">{progress.total} publicações</Badge>
              <Badge className="bg-primary text-primary-foreground">{progress.approved} aprovadas</Badge>
              {progress.changes > 0 && <Badge variant="destructive">{progress.changes} para ajustar</Badge>}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="feed">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="estrategia">Estratégia</TabsTrigger>
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="proximos">Próximos passos</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-6">
            {allApproved && (
              <Card className="mb-6 border-primary/40 bg-primary/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Tudo aprovado! 🎉</p>
                    <p className="text-sm text-muted-foreground">
                      Todas as publicações foram aprovadas. Já liberamos a aba <strong>Próximos passos</strong> com o que acontece agora.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            {progress.changes > 0 && (
              <Card className="mb-6 border-destructive/40 bg-destructive/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <MessageSquareWarning className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    {progress.changes} publicação(ões) com alteração solicitada. Nossa equipe vai ajustar e você verá a
                    versão anterior em cinza junto da nova versão para aprovar.
                  </p>
                </CardContent>
              </Card>
            )}
            <div className="mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-primary" /> Prévia e aprovação de conteúdo
              </h2>
              <p className="text-sm text-muted-foreground">
                Toque em cada quadradinho para ver o material, a legenda e aprovar ou deixar uma observação.
              </p>
            </div>
            {posts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">
                Nenhuma publicação cadastrada ainda. Volte em breve.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1 md:gap-2">
                {posts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => openPost(post)}
                    className="relative aspect-square bg-muted overflow-hidden group"
                    aria-label="Abrir publicação"
                  >
                    {post.post_type === "video" ? (
                      <video src={post.media_urls[0]} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <img src={post.media_urls[0]} alt={post.caption.slice(0, 60) || "Publicação"} loading="lazy" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute top-1.5 right-1.5 text-primary-foreground">
                      {post.post_type === "carousel" && <Images className="w-4 h-4 drop-shadow" />}
                      {post.post_type === "video" && <Play className="w-4 h-4 drop-shadow" />}
                    </div>
                    <div className="absolute bottom-1.5 left-1.5">
                      {post.status === "approved" && <CheckCircle2 className="w-5 h-5 text-primary drop-shadow" />}
                      {post.status === "changes" && <MessageSquareWarning className="w-5 h-5 text-destructive drop-shadow" />}
                    </div>
                    {post.revision_count > 0 && post.status === "pending" && (
                      <span className="absolute bottom-1.5 right-1.5 text-[10px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                        ATUALIZADO
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="estrategia" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  {project.strategy_title || "Primeiro passo: Estrutura de Rede Social"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {project.strategy_text || "Estratégia em preparação."}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resumo" className="mt-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Resumo</CardTitle></CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {project.summary_text || "Resumo em preparação."}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="proximos" className="mt-6">
            {!allApproved && !project.next_step_released ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center space-y-3">
                  <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="font-semibold">Próximo passo bloqueado</p>
                  <p className="text-sm text-muted-foreground">
                    Aprove todas as {progress.total} publicações do feed para liberar esta etapa.
                    Faltam {progress.total - progress.approved}.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-primary/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Rocket className="w-5 h-5 text-primary" /> Próximos passos após a aprovação
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Conteúdo 100% aprovado — agora vamos para a próxima etapa.
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {project.next_steps_text || "Nossa equipe já foi avisada e vai detalhar aqui os próximos passos."}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!activePost} onOpenChange={(open) => !open && setActivePost(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Publicação {activePost ? posts.findIndex((p) => p.id === activePost.id) + 1 : ""}
              {activePost && statusBadge(activePost.status)}
            </DialogTitle>
          </DialogHeader>

          {activePost && (
            <div className="space-y-4">
              {activePost.revision_count > 0 && (
                <div className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-1">
                  <p className="text-xs font-semibold text-primary">
                    VERSÃO ATUALIZADA (alteração nº {activePost.revision_count})
                  </p>
                  {activePost.revision_note && (
                    <p className="text-sm whitespace-pre-wrap">{activePost.revision_note}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    A versão anterior aparece abaixo em cinza, só para comparação.
                  </p>
                </div>
              )}

              <div className="relative bg-muted rounded-md overflow-hidden">
                {activePost.post_type === "video" ? (
                  <video src={activePost.media_urls[0]} controls className="w-full max-h-[50vh]" />
                ) : (
                  <img
                    src={activePost.media_urls[slide]}
                    alt={activePost.caption.slice(0, 80) || "Material da publicação"}
                    className="w-full max-h-[50vh] object-contain"
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
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  {activePost.revision_count > 0 ? "LEGENDA ATUALIZADA" : "LEGENDA"}
                </p>
                <p className="whitespace-pre-wrap text-sm">{activePost.caption || "Sem legenda."}</p>
              </div>

              {activePost.revision_count > 0 &&
                (activePost.previous_media_urls.length > 0 || activePost.previous_caption) && (
                <div className="rounded-md border border-border p-3 space-y-2 opacity-60">
                  <div className="flex items-center gap-2">
                    <HistoryIcon className="w-4 h-4 text-muted-foreground" />
                    <p className="text-xs font-semibold text-muted-foreground">VERSÃO ANTERIOR (substituída)</p>
                  </div>
                  {activePost.previous_media_urls.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {activePost.previous_media_urls.map((url, i) => (
                        <div key={url} className="w-20 h-20 rounded overflow-hidden bg-muted grayscale">
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
                <p className="text-xs font-semibold text-muted-foreground">OBSERVAÇÃO / ALTERAÇÃO</p>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Escreva aqui o que deseja alterar ou acrescentar..."
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => review("approved")} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Aprovar</>}
                </Button>
                <Button className="flex-1" variant="outline" onClick={() => review("changes")} disabled={saving || !note.trim()}>
                  <MessageSquareWarning className="w-4 h-4 mr-2" /> Salvar observação
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default MktCC;
