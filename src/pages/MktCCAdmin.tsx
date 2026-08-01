import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2, Plus, Save, Trash2, Upload, ArrowLeft, ArrowUp, ArrowDown,
  CheckCircle2, MessageSquareWarning, Copy, RefreshCw,
} from "lucide-react";

interface Project {
  id: string; company_name: string; access_code: string;
  strategy_title: string; strategy_text: string; summary_text: string;
  next_steps_text: string; instagram_handle: string; avatar_url: string;
  is_active: boolean; created_at: string;
  all_approved_at: string | null; next_step_released: boolean;
}

interface Post {
  id: string; project_id: string;
  post_type: "image" | "video" | "carousel";
  media_urls: string[]; caption: string; order_index: number;
  status: "pending" | "approved" | "changes"; client_note: string;
  reviewed_at: string | null;
  previous_media_urls: string[]; previous_caption: string;
  revision_note: string; revision_count: number; revised_at: string | null;
}

interface RevisionDraft { note: string; media: string[] }

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });

const MktCCAdmin = () => {
  const [creds, setCreds] = useState({ email: "", password: "" });
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newProject, setNewProject] = useState({ company_name: "", access_code: "", instagram_handle: "" });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<{ post_type: Post["post_type"]; media_urls: string[]; caption: string }>({
    post_type: "image", media_urls: [], caption: "",
  });
  const [revisions, setRevisions] = useState<Record<string, RevisionDraft>>({});
  const [revisingId, setRevisingId] = useState<string | null>(null);

  useEffect(() => { document.title = "Admin | Marketing Completo"; }, []);

  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("mktcc-api", {
      body: { action, email: creds.email, password: creds.password, ...extra },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "Erro");
    return data;
  };

  const loadProjects = async () => {
    const data = await call("list_projects");
    setProjects(data.projects || []);
  };

  const loadPosts = async (projectId: string) => {
    const data = await call("list_posts", { project_id: projectId });
    setPosts((data.posts || []).map((p: Post) => ({
      ...p,
      media_urls: p.media_urls || [],
      previous_media_urls: p.previous_media_urls || [],
      previous_caption: p.previous_caption || "",
      revision_note: p.revision_note || "",
      revision_count: p.revision_count || 0,
    })));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await call("login");
      setLoggedIn(true);
      await loadProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no login");
    } finally { setLoading(false); }
  };

  const openProject = async (project: Project) => {
    setSelected(project);
    setDraft({ post_type: "image", media_urls: [], caption: "" });
    try { await loadPosts(project.id); } catch (err) { toast.error("Erro ao carregar posts"); }
  };

  const saveProject = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await call("update_project", { project_id: selected.id, ...selected });
      toast.success("Projeto salvo!");
      await loadProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally { setLoading(false); }
  };

  const createProject = async () => {
    if (!newProject.company_name.trim()) return toast.error("Informe o nome da empresa");
    setLoading(true);
    try {
      const data = await call("create_project", newProject);
      toast.success(`Criado! Código: ${data.project.access_code}`);
      setNewProject({ company_name: "", access_code: "", instagram_handle: "" });
      await loadProjects();
      await openProject(data.project);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar");
    } finally { setLoading(false); }
  };

  const removeProject = async (id: string) => {
    if (!window.confirm("Excluir este projeto e todas as publicações?")) return;
    try {
      await call("delete_project", { project_id: id });
      if (selected?.id === id) setSelected(null);
      await loadProjects();
      toast.success("Excluído");
    } catch (err) { toast.error("Erro ao excluir"); }
  };

  const uploadFiles = async (files: FileList) => {
    if (!selected) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 45 * 1024 * 1024) { toast.error(`${file.name} é maior que 45MB`); continue; }
        const base64 = await fileToBase64(file);
        const data = await call("upload_media", {
          project_id: selected.id, filename: file.name, file_base64: base64, content_type: file.type,
        });
        urls.push(data.url);
      }
      setDraft((prev) => {
        const media = [...prev.media_urls, ...urls];
        const isVideo = files[0]?.type.startsWith("video");
        const type: Post["post_type"] = isVideo ? "video" : media.length > 1 ? "carousel" : prev.post_type;
        return { ...prev, media_urls: media, post_type: type };
      });
      toast.success(`${urls.length} arquivo(s) enviado(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const createPost = async () => {
    if (!selected) return;
    if (draft.media_urls.length === 0) return toast.error("Envie pelo menos um arquivo");
    try {
      await call("create_post", { project_id: selected.id, ...draft });
      setDraft({ post_type: "image", media_urls: [], caption: "" });
      await loadPosts(selected.id);
      toast.success("Publicação criada!");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); }
  };

  const savePost = async (post: Post) => {
    try {
      await call("update_post", {
        post_id: post.id, post_type: post.post_type, media_urls: post.media_urls, caption: post.caption,
      });
      toast.success("Publicação salva!");
    } catch (err) { toast.error("Erro ao salvar"); }
  };

  const deletePost = async (post: Post) => {
    if (!window.confirm("Excluir esta publicação?")) return;
    try {
      await call("delete_post", { post_id: post.id });
      if (selected) await loadPosts(selected.id);
    } catch (err) { toast.error("Erro ao excluir"); }
  };

  const movePost = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= posts.length) return;
    const next = [...posts];
    [next[index], next[target]] = [next[target], next[index]];
    setPosts(next);
    try { await call("reorder_posts", { ids: next.map((p) => p.id) }); } catch { toast.error("Erro ao reordenar"); }
  };

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader><CardTitle>Admin — Marketing Completo</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={creds.email} onChange={(e) => setCreds({ ...creds, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={creds.password} onChange={(e) => setCreds({ ...creds, password: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!selected) {
    return (
      <main className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Projetos / Empresas</h1>
            <Button variant="outline" size="sm" onClick={() => loadProjects()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
            </Button>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg">Novo projeto</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <Input placeholder="Nome da empresa" value={newProject.company_name}
                onChange={(e) => setNewProject({ ...newProject, company_name: e.target.value })} />
              <Input placeholder="@instagram" value={newProject.instagram_handle}
                onChange={(e) => setNewProject({ ...newProject, instagram_handle: e.target.value })} />
              <Input placeholder="Código (opcional)" value={newProject.access_code}
                onChange={(e) => setNewProject({ ...newProject, access_code: e.target.value.toUpperCase() })} />
              <Button onClick={createProject} disabled={loading}><Plus className="w-4 h-4 mr-2" /> Criar</Button>
            </CardContent>
          </Card>

          <div className="grid gap-3">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold">{project.company_name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      Código: <span className="font-mono">{project.access_code}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(project.access_code); toast.success("Código copiado"); }}
                        aria-label="Copiar código"
                      ><Copy className="w-3.5 h-3.5" /></button>
                      {!project.is_active && <Badge variant="destructive">Inativo</Badge>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => openProject(project)}>Abrir</Button>
                    <Button size="sm" variant="destructive" onClick={() => removeProject(project.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {projects.length === 0 && <p className="text-sm text-muted-foreground">Nenhum projeto criado ainda.</p>}
          </div>
        </div>
      </main>
    );
  }

  const approved = posts.filter((p) => p.status === "approved");
  const changes = posts.filter((p) => p.status === "changes");

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <h1 className="text-xl font-bold truncate">{selected.company_name}</h1>
          <Badge variant="secondary" className="font-mono">{selected.access_code}</Badge>
        </div>

        <Tabs defaultValue="posts">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="posts">Publicações</TabsTrigger>
            <TabsTrigger value="estrategia">Estratégia</TabsTrigger>
            <TabsTrigger value="textos">Resumo / Passos</TabsTrigger>
            <TabsTrigger value="aprovacoes">Aprovações</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Nova publicação</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={draft.post_type} onValueChange={(v) => setDraft({ ...draft, post_type: v as Post["post_type"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">Imagem única</SelectItem>
                        <SelectItem value="carousel">Carrossel</SelectItem>
                        <SelectItem value="video">Vídeo / Reels</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Arquivos (pode selecionar vários)</Label>
                    <Input ref={fileRef} type="file" multiple accept="image/*,video/*"
                      onChange={(e) => e.target.files && uploadFiles(e.target.files)} disabled={uploading} />
                  </div>
                </div>

                {draft.media_urls.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {draft.media_urls.map((url, i) => (
                      <div key={url} className="relative w-20 h-20 rounded overflow-hidden bg-muted">
                        {draft.post_type === "video"
                          ? <video src={url} className="w-full h-full object-cover" muted />
                          : <img src={url} alt={`Arquivo ${i + 1}`} className="w-full h-full object-cover" />}
                        <button
                          className="absolute top-0 right-0 bg-destructive text-destructive-foreground w-5 h-5 text-xs"
                          onClick={() => setDraft({ ...draft, media_urls: draft.media_urls.filter((u) => u !== url) })}
                          aria-label="Remover arquivo"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Legenda</Label>
                  <Textarea rows={4} value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} />
                </div>

                <Button onClick={createPost} disabled={uploading}>
                  {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : <><Upload className="w-4 h-4 mr-2" /> Adicionar ao feed</>}
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-3">
              {posts.map((post, index) => (
                <Card key={post.id}>
                  <CardContent className="p-4 flex gap-4 flex-col md:flex-row">
                    <div className="w-full md:w-28 shrink-0">
                      <div className="aspect-square bg-muted rounded overflow-hidden">
                        {post.post_type === "video"
                          ? <video src={post.media_urls[0]} className="w-full h-full object-cover" muted />
                          : <img src={post.media_urls[0]} alt="Prévia" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex gap-1 mt-2">
                        <Button size="icon" variant="outline" onClick={() => movePost(index, -1)} aria-label="Subir"><ArrowUp className="w-4 h-4" /></Button>
                        <Button size="icon" variant="outline" onClick={() => movePost(index, 1)} aria-label="Descer"><ArrowDown className="w-4 h-4" /></Button>
                        <Button size="icon" variant="destructive" onClick={() => deletePost(post)} aria-label="Excluir"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">#{index + 1} · {post.post_type}</Badge>
                        {post.status === "approved" && <Badge className="bg-primary text-primary-foreground">Aprovado</Badge>}
                        {post.status === "changes" && <Badge variant="destructive">Ajustar</Badge>}
                      </div>
                      <Textarea rows={3} value={post.caption}
                        onChange={(e) => setPosts(posts.map((p) => (p.id === post.id ? { ...p, caption: e.target.value } : p)))} />
                      {post.client_note && (
                        <p className="text-sm text-muted-foreground border-l-2 border-destructive pl-3 whitespace-pre-wrap">
                          <strong>Observação do cliente:</strong> {post.client_note}
                        </p>
                      )}
                      <Button size="sm" variant="outline" onClick={() => savePost(post)}>
                        <Save className="w-4 h-4 mr-2" /> Salvar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="estrategia" className="mt-6">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Nome da empresa</Label>
                    <Input value={selected.company_name} onChange={(e) => setSelected({ ...selected, company_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>@ do Instagram</Label>
                    <Input value={selected.instagram_handle} onChange={(e) => setSelected({ ...selected, instagram_handle: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Código de acesso</Label>
                    <Input value={selected.access_code} onChange={(e) => setSelected({ ...selected, access_code: e.target.value.toUpperCase() })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>URL da foto de perfil</Label>
                  <Input value={selected.avatar_url} onChange={(e) => setSelected({ ...selected, avatar_url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Título da estratégia</Label>
                  <Input value={selected.strategy_title} onChange={(e) => setSelected({ ...selected, strategy_title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Estratégia / estrutura de rede social</Label>
                  <Textarea rows={10} value={selected.strategy_text} onChange={(e) => setSelected({ ...selected, strategy_text: e.target.value })} />
                </div>
                <Button onClick={saveProject} disabled={loading}><Save className="w-4 h-4 mr-2" /> Salvar</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="textos" className="mt-6">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Resumo</Label>
                  <Textarea rows={8} value={selected.summary_text} onChange={(e) => setSelected({ ...selected, summary_text: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Próximos passos (após aprovação)</Label>
                  <Textarea rows={8} value={selected.next_steps_text} onChange={(e) => setSelected({ ...selected, next_steps_text: e.target.value })} />
                </div>
                <Button onClick={saveProject} disabled={loading}><Save className="w-4 h-4 mr-2" /> Salvar</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="aprovacoes" className="mt-6 space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Aprovados</p><p className="text-2xl font-bold">{approved.length}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Para ajustar</p><p className="text-2xl font-bold">{changes.length}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Pendentes</p><p className="text-2xl font-bold">{posts.length - approved.length - changes.length}</p></CardContent></Card>
            </div>

            {changes.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-4 flex gap-3">
                  <MessageSquareWarning className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">#{posts.findIndex((p) => p.id === post.id) + 1} — pediu alteração</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{post.client_note}</p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {approved.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-4 flex gap-3 items-center">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <p className="text-sm">
                    #{posts.findIndex((p) => p.id === post.id) + 1} — aprovado
                    {post.client_note && <span className="text-muted-foreground"> · {post.client_note}</span>}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default MktCCAdmin;
