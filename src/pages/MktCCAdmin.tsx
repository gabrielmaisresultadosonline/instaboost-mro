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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Loader2, Plus, Save, Trash2, Upload, ArrowLeft, ArrowUp, ArrowDown,
  CheckCircle2, MessageSquareWarning, Copy, RefreshCw, Send, EyeOff, Camera,
  Instagram, Facebook, X, CalendarDays, Lock, Unlock, Images, ChevronDown,
} from "lucide-react";
import { PhoneInstagramPreview } from "@/components/mktcc/PhoneInstagramPreview";
import { ProfileBeforeAfter } from "@/components/mktcc/ProfileBeforeAfter";
import { VideoThumbPicker } from "@/components/mktcc/VideoThumbPicker";

interface Project {
  id: string; company_name: string; access_code: string;
  strategy_title: string; strategy_text: string; summary_text: string;
  next_steps_text: string; instagram_handle: string; instagram_bio: string; avatar_url: string;
  is_active: boolean; created_at: string;
  before_instagram_urls: string[]; before_facebook_urls: string[]; before_note: string;
  before_profile_full_url: string;
  drive_url: string;
  all_approved_at: string | null; next_step_released: boolean;
  logo_enabled: boolean; logo_before_url: string; logo_after_url: string;
  logo_reason: string; logo_status: "pending" | "approved" | "changes";
  logo_client_note: string; logo_reviewed_at: string | null;
}

interface Post {
  id: string; project_id: string;
  post_type: "image" | "video" | "carousel";
  media_urls: string[]; caption: string; order_index: number; cycle_id: string | null;
  status: "pending" | "approved" | "changes"; client_note: string;
  reviewed_at: string | null;
  previous_media_urls: string[]; previous_caption: string;
  revision_note: string; revision_count: number; revised_at: string | null;
  is_published: boolean; aspect_ratio: string;
  /** Miniatura (capa) usada quando o post é um vídeo. */
  poster_url: string;
}

interface Cycle {
  id: string; title: string; scheduled_date: string | null; note: string;
  status: "open" | "done"; completed_at: string | null; order_index: number; is_done: boolean;
  strategy_title: string; strategy_text: string; summary_text: string;
  next_steps_text: string;
  show_strategy: boolean; show_summary: boolean; show_before: boolean;
}

interface RevisionDraft { note: string; media: string[] }

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });

const MAX_VIDEO_BYTES = 120 * 1024 * 1024; // vídeos até 120MB
const MAX_IMAGE_BYTES = 45 * 1024 * 1024;
const DIRECT_UPLOAD_THRESHOLD = 4 * 1024 * 1024; // acima disso vai direto ao storage

const isVideoFile = (file: File) => file.type.startsWith("video") || /\.(mp4|webm|mov)$/i.test(file.name);
const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url || "");

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
  const [draft, setDraft] = useState<{ post_type: Post["post_type"]; media_urls: string[]; caption: string; aspect_ratio: string; poster_url: string }>({
    post_type: "image", media_urls: [], caption: "", aspect_ratio: "4/5", poster_url: "",
  });
  const [revisions, setRevisions] = useState<Record<string, RevisionDraft>>({});
  const [revisingId, setRevisingId] = useState<string | null>(null);
  const [dirtyIds, setDirtyIds] = useState<string[]>([]);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<string>("");
  const beforeRef = useRef<HTMLInputElement>(null);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string>("none");
  const [newCycle, setNewCycle] = useState({ title: "", scheduled_date: "", note: "", strategy_title: "", strategy_text: "", summary_text: "", next_steps_text: "" });
  const [tab, setTab] = useState("posts");
  const [openCycleIds, setOpenCycleIds] = useState<string[]>([]);

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
      aspect_ratio: p.aspect_ratio || "4/5",
      is_published: p.is_published !== false,
      cycle_id: p.cycle_id ?? null,
      poster_url: p.poster_url || "",
    })));
  };

  const loadCycles = async (projectId: string) => {
    const data = await call("list_cycles", { project_id: projectId });
    setCycles(data.cycles || []);
    return (data.cycles || []) as Cycle[];
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
    setDraft({ post_type: "image", media_urls: [], caption: "", aspect_ratio: "4/5", poster_url: "" });
    try {
      const list = await loadCycles(project.id);
      const open = list.find((c) => !c.is_done);
      setActiveCycleId(open?.id || list[list.length - 1]?.id || "none");
      await loadPosts(project.id);
    } catch (err) { toast.error("Erro ao carregar dados do projeto"); }
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

  // Sobe a logo/foto de perfil (arquivo ou colada com Ctrl + V) e salva no projeto.
  const uploadAvatar = async (file: File) => {
    if (!selected) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Imagem maior que 10MB");
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const data = await call("upload_media", {
        project_id: selected.id, filename: file.name, file_base64: base64, content_type: file.type,
      });
      setSelected({ ...selected, avatar_url: data.url });
      await call("update_project", { project_id: selected.id, avatar_url: data.url });
      await loadProjects();
      toast.success("Logo atualizada!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  /**
   * Sobe a imagem da etapa de aprovação de logo (antes/depois).
   * Aceita arquivo ou imagem colada com Ctrl + V e salva direto no projeto.
   */
  const uploadLogoShot = async (slot: "logo_before_url" | "logo_after_url", file: File) => {
    if (!selected) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Imagem maior que 10MB");
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const data = await call("upload_media", {
        project_id: selected.id, filename: file.name, file_base64: base64, content_type: file.type,
      });
      setSelected({ ...selected, [slot]: data.url } as Project);
      await call("update_project", { project_id: selected.id, [slot]: data.url });
      toast.success("Imagem da logo salva!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  /**
   * Sobe o print vertical do perfil completo (antes) usado na comparação
   * antes/depois. Aceita arquivo ou imagem colada com Ctrl + V.
   */
  const uploadProfileFullShot = async (file: File) => {
    if (!selected) return;
    if (file.size > 15 * 1024 * 1024) return toast.error("Imagem maior que 15MB");
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const data = await call("upload_media", {
        project_id: selected.id, filename: file.name, file_base64: base64, content_type: file.type,
      });
      setSelected({ ...selected, before_profile_full_url: data.url });
      await call("update_project", { project_id: selected.id, before_profile_full_url: data.url });
      toast.success("Print do perfil completo salvo!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  /** Remove o print do perfil completo. */
  const removeProfileFullShot = async () => {
    if (!selected) return;
    try {
      await call("update_project", { project_id: selected.id, before_profile_full_url: "" });
      setSelected({ ...selected, before_profile_full_url: "" });
      toast.success("Print removido");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover");
    }
  };

  /** Ativa/desativa a etapa de aprovação de logo para o cliente. */
  const toggleLogoStep = async (enabled: boolean) => {
    if (!selected) return;
    try {
      await call("update_project", { project_id: selected.id, logo_enabled: enabled });
      setSelected({ ...selected, logo_enabled: enabled });
      toast.success(enabled ? "Etapa de logo liberada para o cliente" : "Etapa de logo oculta");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    }
  };

  /** Reabre a aprovação da logo (volta para pendente). */
  const resetLogoStatus = async () => {
    if (!selected) return;
    try {
      await call("update_project", { project_id: selected.id, logo_status: "pending", logo_client_note: "" });
      setSelected({ ...selected, logo_status: "pending", logo_client_note: "" });
      toast.success("Aprovação da logo reaberta");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    }
  };



  /**
   * Envia um arquivo e devolve a URL pública.
   * Imagens pequenas seguem pela edge function (base64); vídeos e arquivos
   * grandes vão direto ao storage para suportar até 120MB.
   */
  const uploadOne = async (projectId: string, file: File): Promise<string> => {
    const video = isVideoFile(file);
    const limit = video ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > limit) {
      throw new Error(`${file.name} passa do limite de ${video ? "120MB (vídeo)" : "45MB (imagem)"}`);
    }
    if (video || file.size > DIRECT_UPLOAD_THRESHOLD) {
      const safeName = file.name.replace(/[^\w.\-]/g, "_") || `arquivo-${Date.now()}`;
      const path = `mktcc/${projectId}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from("assets").upload(path, file, {
        contentType: file.type || undefined,
        upsert: true,
      });
      if (error) throw new Error(error.message);
      return supabase.storage.from("assets").getPublicUrl(path).data.publicUrl;
    }
    const base64 = await fileToBase64(file);
    const data = await call("upload_media", {
      project_id: projectId, filename: file.name, file_base64: base64, content_type: file.type,
    });
    return data.url as string;
  };

  /** Sobe o frame capturado do vídeo e devolve a URL da miniatura. */
  const uploadPoster = async (projectId: string, blob: Blob) => {
    const file = new File([blob], `miniatura-${Date.now()}.jpg`, { type: "image/jpeg" });
    return uploadOne(projectId, file);
  };

  /** Salva a miniatura escolhida no rascunho da nova publicação. */
  const setDraftPoster = async (blob: Blob) => {
    if (!selected) return;
    const url = await uploadPoster(selected.id, blob);
    setDraft((prev) => ({ ...prev, poster_url: url }));
    toast.success("Miniatura do vídeo salva!");
  };

  /** Salva a miniatura escolhida em uma publicação existente. */
  const setPostPoster = async (post: Post, blob: Blob) => {
    const url = await uploadPoster(post.project_id, blob);
    await call("update_post", { post_id: post.id, project_id: post.project_id, poster_url: url });
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, poster_url: url } : p)));
    toast.success("Miniatura do vídeo salva!");
  };

  const uploadFiles = async (files: FileList) => {

    if (!selected) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        try {
          urls.push(await uploadOne(selected.id, file));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : `Erro ao enviar ${file.name}`);
        }
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
      await call("create_post", {
        project_id: selected.id, ...draft,
        cycle_id: activeCycleId === "none" ? null : activeCycleId,
      });
      setDraft({ post_type: "image", media_urls: [], caption: "", aspect_ratio: "4/5", poster_url: "" });
      await loadPosts(selected.id);
      toast.success("Publicação criada!");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); }
  };

  const savePost = async (post: Post) => {
    try {
      await call("update_post", {
        post_id: post.id, project_id: post.project_id,
        post_type: post.post_type, media_urls: post.media_urls, caption: post.caption,
      });
      toast.success("Publicação salva!");
    } catch (err) { toast.error("Erro ao salvar"); }
  };

  const deletePost = async (post: Post) => {
    if (!window.confirm("Excluir esta publicação?")) return;
    try {
      await call("delete_post", { post_id: post.id, project_id: post.project_id });
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

  // Ordem vinda do arrasto na prévia do celular (só publicados): reencaixa os
  // publicados nas suas posições originais e mantém os rascunhos onde estavam.
  const reorderFromPreview = async (orderedPublishedIds: string[]) => {
    const queue = orderedPublishedIds
      .map((id) => posts.find((p) => p.id === id))
      .filter((p): p is Post => !!p);
    let cursor = 0;
    const next = posts.map((p) => (p.is_published ? queue[cursor++] ?? p : p));
    setPosts(next);
    try {
      await call("reorder_posts", { ids: next.map((p) => p.id) });
      toast.success("Nova ordem salva!");
    } catch { toast.error("Erro ao reordenar"); }
  };

  // Envia novas mídias direto para uma publicação existente (edição de imagem).
  const uploadPostMedia = async (post: Post, files: FileList, replace: boolean) => {
    if (!selected) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        try {
          urls.push(await uploadOne(selected.id, file));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : `Erro ao enviar ${file.name}`);
        }
      }
      if (urls.length === 0) return;
      const media = replace ? urls : [...(post.media_urls || []), ...urls];
      const isVideo = files[0]?.type.startsWith("video");
      const post_type: Post["post_type"] = isVideo ? "video" : media.length > 1 ? "carousel" : "image";
      await call("update_post", { post_id: post.id, project_id: post.project_id, media_urls: media, post_type });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, media_urls: media, post_type } : p)));
      toast.success("Imagens atualizadas!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally { setUploading(false); }
  };

  const removePostMedia = async (post: Post, url: string) => {
    const media = (post.media_urls || []).filter((u) => u !== url);
    if (media.length === 0) return toast.error("A publicação precisa de pelo menos uma mídia");
    const post_type: Post["post_type"] = post.post_type === "video" ? "video" : media.length > 1 ? "carousel" : "image";
    try {
      await call("update_post", { post_id: post.id, project_id: post.project_id, media_urls: media, post_type });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, media_urls: media, post_type } : p)));
    } catch { toast.error("Erro ao remover mídia"); }
  };


  const setRevision = (postId: string, patch: Partial<RevisionDraft>) =>
    setRevisions((prev) => ({ ...prev, [postId]: { note: "", media: [], ...prev[postId], ...patch } }));

  // Envia novos arquivos para substituir o material de uma publicação já publicada ao cliente.
  const uploadRevisionFiles = async (post: Post, files: FileList) => {
    if (!selected) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        try {
          urls.push(await uploadOne(selected.id, file));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : `Erro ao enviar ${file.name}`);
        }
      }
      setRevision(post.id, { media: [...(revisions[post.id]?.media || []), ...urls] });
      toast.success(`${urls.length} arquivo(s) enviado(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally { setUploading(false); }
  };

  // Arquiva a versão atual (fica cinza no /mktcc) e reenvia a nova para aprovação.
  const applyRevision = async (post: Post) => {
    const rev = revisions[post.id];
    if (!rev?.note?.trim() && (rev?.media?.length || 0) === 0 && post.caption === "") {
      return toast.error("Descreva a alteração ou envie o novo arquivo");
    }
    setRevisingId(post.id);
    try {
      await call("revise_post", {
        post_id: post.id,
        caption: post.caption,
        media_urls: rev?.media || [],
        post_type: (rev?.media?.length || 0) > 1 ? "carousel" : post.post_type,
        revision_note: rev?.note || "",
      });
      setRevisions((prev) => ({ ...prev, [post.id]: { note: "", media: [] } }));
      if (selected) await loadPosts(selected.id);
      toast.success("Alteração enviada para nova aprovação!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao aplicar alteração");
    } finally { setRevisingId(null); }
  };

  // Rascunho automático: qualquer legenda editada é salva sozinha após 1,2s.
  const markDirty = (postId: string) =>
    setDirtyIds((prev) => (prev.includes(postId) ? prev : [...prev, postId]));

  useEffect(() => {
    if (dirtyIds.length === 0) return;
    const timer = window.setTimeout(async () => {
      const ids = [...dirtyIds];
      setDirtyIds([]);
      setAutoSaving(true);
      try {
        for (const id of ids) {
          const post = posts.find((p) => p.id === id);
          if (!post) continue;
          await call("update_post", {
            post_id: post.id, project_id: post.project_id,
            caption: post.caption, aspect_ratio: post.aspect_ratio,
          });
        }
        setLastAutoSave(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      } catch {
        toast.error("Falha ao salvar rascunho");
      } finally { setAutoSaving(false); }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [dirtyIds, posts]);

  const setPublished = async (post: Post, published: boolean) => {
    try {
      await call("publish_post", { post_id: post.id, is_published: published });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, is_published: published } : p)));
      toast.success(published ? "Publicado na prévia do cliente!" : "Voltou para rascunho");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Erro ao publicar"); }
  };

  // Prints de "como o perfil estava" — ficam salvos na nuvem até o admin remover.
  const uploadBeforeShots = async (platform: "instagram" | "facebook", files: FileList | File[]) => {
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
      const key = platform === "instagram" ? "before_instagram_urls" : "before_facebook_urls";
      const next = [...((selected as any)[key] || []), ...urls];
      await call("update_project", { project_id: selected.id, [key]: next });
      setSelected({ ...selected, [key]: next } as Project);
      toast.success(`${urls.length} print(s) salvo(s) na nuvem`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally { setUploading(false); if (beforeRef.current) beforeRef.current.value = ""; }
  };

  const removeBeforeShot = async (platform: "instagram" | "facebook", url: string) => {
    if (!selected) return;
    if (!window.confirm("Remover este print do histórico?")) return;
    const key = platform === "instagram" ? "before_instagram_urls" : "before_facebook_urls";
    const next = ((selected as any)[key] || []).filter((u: string) => u !== url);
    try {
      await call("update_project", { project_id: selected.id, [key]: next });
      setSelected({ ...selected, [key]: next } as Project);
      toast.success("Print removido");
    } catch { toast.error("Erro ao remover"); }
  };

  const toggleNextStep = async (released: boolean) => {
    if (!selected) return;
    try {
      await call("update_project", { project_id: selected.id, next_step_released: released });
      setSelected({ ...selected, next_step_released: released });
      toast.success(released ? "Próximo passo liberado para o cliente" : "Próximo passo bloqueado");
    } catch (err) { toast.error("Erro ao atualizar"); }
  };

  const createCycle = async () => {
    if (!selected) return;
    if (!newCycle.title.trim()) return toast.error("Informe o mês / título da programação");
    try {
      const data = await call("create_cycle", { project_id: selected.id, ...newCycle });
      setNewCycle({ title: "", scheduled_date: "", note: "", strategy_title: "", strategy_text: "", summary_text: "", next_steps_text: "" });
      await loadCycles(selected.id);
      setActiveCycleId(data.cycle.id);
      toast.success("Programação criada!");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Erro ao criar programação"); }
  };

  const patchCycle = async (cycle: Cycle, patch: Record<string, unknown>) => {
    if (!selected) return;
    try {
      await call("update_cycle", { cycle_id: cycle.id, ...patch });
      await loadCycles(selected.id);
      toast.success("Programação atualizada!");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Erro ao atualizar"); }
  };

  const removeCycle = async (cycle: Cycle) => {
    if (!selected) return;
    if (!window.confirm("Excluir esta programação? As publicações ficam sem programação.")) return;
    try {
      await call("delete_cycle", { cycle_id: cycle.id });
      await loadCycles(selected.id);
      if (activeCycleId === cycle.id) setActiveCycleId("none");
      await loadPosts(selected.id);
      toast.success("Programação excluída");
    } catch { toast.error("Erro ao excluir"); }
  };

  const assignPostCycle = async (post: Post, cycleId: string) => {
    try {
      await call("update_post", { post_id: post.id, project_id: post.project_id, cycle_id: cycleId === "none" ? null : cycleId });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, cycle_id: cycleId === "none" ? null : cycleId } : p)));
      toast.success("Programação da publicação atualizada");
    } catch { toast.error("Erro ao mover publicação"); }
  };

  // Move em massa as publicações antigas (sem programação) para uma programação.
  const moveOrphansToCycle = async (cycleId: string) => {
    const orphans = posts.filter((p) => !p.cycle_id);
    if (orphans.length === 0) { toast.info("Nenhuma publicação fora de programação"); return; }
    try {
      for (const post of orphans) {
        await call("update_post", { post_id: post.id, project_id: post.project_id, cycle_id: cycleId });
      }
      setPosts((prev) => prev.map((p) => (p.cycle_id ? p : { ...p, cycle_id: cycleId })));
      setActiveCycleId(cycleId);
      toast.success(`${orphans.length} publicação(ões) movida(s)`);
    } catch { toast.error("Erro ao mover publicações"); }
  };

  if (!loggedIn) {
    return (
      <main className="mktcc min-h-screen bg-background text-foreground flex items-center justify-center px-4 mktcc-dots">
        <Card className="w-full max-w-sm mktcc-pop rounded-2xl">
          <CardHeader><CardTitle className="font-black uppercase tracking-tight">Admin — <span className="mktcc-gradient-text">Marketing Completo</span></CardTitle></CardHeader>
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
      <main className="mktcc min-h-screen bg-background text-foreground p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black uppercase tracking-tight">Projetos / <span className="mktcc-gradient-text">Empresas</span></h1>
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
  const activeCycle = cycles.find((c) => c.id === activeCycleId) || null;
  const cycleLocked = !!activeCycle?.is_done;
  const visiblePosts = cycles.length > 0
    ? posts.filter((p) => (p.cycle_id || "none") === activeCycleId)
    : posts;
  const cycleLabel = (id: string | null) =>
    cycles.find((c) => c.id === id)?.title || "Sem programação";

  return (
    <main className="mktcc min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <h1 className="text-xl font-bold truncate">{selected.company_name}</h1>
          <Badge variant="secondary" className="font-mono">{selected.access_code}</Badge>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-2 md:grid-cols-7 h-auto gap-1 p-1.5 rounded-2xl bg-secondary mktcc-pop-sm">
            {[
              { v: "posts", l: "Publicações" },
              { v: "programacoes", l: "Programações" },
              { v: "antes", l: "Antes do perfil" },
              { v: "logo", l: "Logo" },
              { v: "estrategia", l: "Estratégia" },
              { v: "textos", l: "Resumo / Passos" },
              { v: "aprovacoes", l: "Aprovações" },
            ].map((t) => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className="rounded-xl font-bold uppercase text-xs text-secondary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {t.l}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="posts" className="mt-6 space-y-6">
            {cycles.length > 0 && (
              <Card className="mktcc-pop-sm rounded-2xl">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex items-center gap-2 shrink-0">
                    <CalendarDays className="w-5 h-5" />
                    <p className="text-xs font-black uppercase">Programação em edição</p>
                  </div>
                  <Select value={activeCycleId} onValueChange={setActiveCycleId}>
                    <SelectTrigger className="md:w-72"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {cycles.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title}{c.is_done ? " · finalizada" : ""}
                        </SelectItem>
                      ))}
                      <SelectItem value="none">Sem programação (antigas)</SelectItem>
                    </SelectContent>
                  </Select>
                  {cycleLocked ? (
                    <Badge className="bg-secondary text-secondary-foreground font-black uppercase">
                      <Lock className="w-3.5 h-3.5 mr-1" /> Já processada — somente leitura
                    </Badge>
                  ) : (
                    <Badge className="bg-primary text-primary-foreground font-black uppercase">Em andamento</Badge>
                  )}
                </CardContent>
              </Card>
            )}
            {cycles.length > 0 && posts.some((p) => !p.cycle_id) && (
              <Card className="mktcc-pop-sm rounded-2xl border-dashed">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <p className="text-xs font-black uppercase flex-1">
                    {posts.filter((p) => !p.cycle_id).length} publicação(ões) antiga(s) fora de programação
                  </p>
                  <Select value="" onValueChange={(v) => moveOrphansToCycle(v)}>
                    <SelectTrigger className="md:w-72">
                      <SelectValue placeholder="Mover todas para a programação..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cycles.filter((c) => !c.is_done).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}
            {!cycleLocked && (
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
                    <Label>Formato</Label>
                    <Select value={draft.aspect_ratio} onValueChange={(v) => setDraft({ ...draft, aspect_ratio: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4/5">Feed 1080x1350 (4:5)</SelectItem>
                        <SelectItem value="1/1">Quadrado 1080x1080 (1:1)</SelectItem>
                        <SelectItem value="9/16">Story / Reels (9:16)</SelectItem>
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
                      <div key={url} className="relative w-20 aspect-[4/5] rounded overflow-hidden bg-muted border-2 border-foreground">
                        {isVideoUrl(url)
                          ? (draft.poster_url
                              ? <img src={draft.poster_url} alt={`Miniatura ${i + 1}`} className="w-full h-full object-cover" />
                              : <video src={url} className="w-full h-full object-contain" muted playsInline preload="metadata" />)
                          : <img src={url} alt={`Arquivo ${i + 1}`} className="w-full h-full object-contain" />}
                        <button
                          className="absolute top-0 right-0 bg-destructive text-destructive-foreground w-5 h-5 text-xs"
                          onClick={() => setDraft({ ...draft, media_urls: draft.media_urls.filter((u) => u !== url) })}
                          aria-label="Remover arquivo"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}

                {draft.media_urls.some(isVideoUrl) && (
                  <VideoThumbPicker
                    videoUrl={draft.media_urls.find(isVideoUrl) as string}
                    posterUrl={draft.poster_url}
                    onCapture={setDraftPoster}
                    disabled={uploading}
                  />
                )}

                <div className="space-y-2">
                  <Label>Legenda</Label>
                  <Textarea rows={4} value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} />
                </div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Imagens estáticas até 45MB · vídeos MP4 até 120MB
                </p>

                <Button onClick={createPost} disabled={uploading}>
                  {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : <><Upload className="w-4 h-4 mr-2" /> Salvar como rascunho</>}
                </Button>
              </CardContent>
            </Card>
            )}

            {posts.length > 0 && (
              posts.every((p) => p.status === "approved") ? (
                <Card className="border-primary bg-primary/5">
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold">Tudo aprovado ({posts.length}/{posts.length}) — próximos passos</p>
                      <p className="text-sm text-muted-foreground">
                        O cliente aprovou todo o feed. Preencha "Próximos passos" na aba Textos e libere para ele.
                      </p>
                    </div>
                    <Button
                      variant={selected.next_step_released ? "outline" : "default"}
                      onClick={() => toggleNextStep(!selected.next_step_released)}
                    >
                      {selected.next_step_released ? "Bloquear próximo passo" : "Liberar próximo passo"}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    Aprovações: <strong>{posts.filter((p) => p.status === "approved").length}/{posts.length}</strong>
                    {" · "}Ajustes pedidos: <strong>{posts.filter((p) => p.status === "changes").length}</strong>
                    {" · "}Os próximos passos são liberados quando tudo estiver aprovado.
                  </CardContent>
                </Card>
              )
            )}

            <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
            <div className="grid gap-3">
              {visiblePosts.map((post) => {
                const index = posts.findIndex((p) => p.id === post.id);
                return (
                <Card key={post.id}>
                  <CardContent className="p-4 flex gap-4 flex-col md:flex-row">
                    <div className="w-full md:w-28 shrink-0">
                      <div className="aspect-[4/5] bg-muted rounded-lg overflow-hidden border-2 border-foreground">
                        {isVideoUrl(post.media_urls[0] || "")
                          ? (post.poster_url
                              ? <img src={post.poster_url} alt="Miniatura do vídeo" className="w-full h-full object-cover" />
                              : <video src={post.media_urls[0]} className="w-full h-full object-contain" muted playsInline preload="metadata" />)
                          : <img src={post.media_urls[0]} alt="Prévia" className="w-full h-full object-contain" />}
                      </div>
                      {!cycleLocked && (
                      <div className="flex gap-1 mt-2">
                        <Button size="icon" variant="outline" onClick={() => movePost(index, -1)} aria-label="Subir"><ArrowUp className="w-4 h-4" /></Button>
                        <Button size="icon" variant="outline" onClick={() => movePost(index, 1)} aria-label="Descer"><ArrowDown className="w-4 h-4" /></Button>
                        <Button size="icon" variant="destructive" onClick={() => deletePost(post)} aria-label="Excluir"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">#{index + 1} · {post.post_type}</Badge>
                        {post.status === "approved" && <Badge className="bg-primary text-primary-foreground">Aprovado</Badge>}
                        {post.status === "changes" && <Badge variant="destructive">Ajustar</Badge>}
                        {post.revision_count > 0 && <Badge variant="outline">Alteração nº {post.revision_count}</Badge>}
                        {post.is_published
                          ? <Badge className="bg-secondary text-secondary-foreground font-bold uppercase">Publicado</Badge>
                          : <Badge variant="outline" className="font-bold uppercase">Rascunho</Badge>}
                        <Badge variant="outline">{post.aspect_ratio}</Badge>
                        {cycles.length > 0 && !cycleLocked && (
                          <Select
                            value={post.cycle_id || "none"}
                            onValueChange={(v) => assignPostCycle(post, v)}
                          >
                            <SelectTrigger className="h-7 w-auto min-w-[10rem] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {cycles.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                              ))}
                              <SelectItem value="none">Sem programação</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {cycleLocked && (
                          <Badge className="bg-secondary text-secondary-foreground font-black uppercase">
                            {cycleLabel(post.cycle_id)} · finalizada
                          </Badge>
                        )}
                      </div>
                      <Textarea rows={3} value={post.caption} readOnly={cycleLocked}
                        onChange={(e) => {
                          setPosts(posts.map((p) => (p.id === post.id ? { ...p, caption: e.target.value } : p)));
                          markDirty(post.id);
                        }} />
                      <p className="text-xs font-semibold text-muted-foreground">
                        {cycleLocked ? "Programação finalizada — edições bloqueadas" : dirtyIds.includes(post.id)
                          ? "Alterações não salvas..."
                          : autoSaving ? "Salvando rascunho..." : lastAutoSave ? `Rascunho salvo às ${lastAutoSave}` : "Salva automático como rascunho"}
                      </p>
                      {post.client_note && (
                        <p className="text-sm text-muted-foreground border-l-2 border-destructive pl-3 whitespace-pre-wrap">
                          <strong>Observação do cliente:</strong> {post.client_note}
                        </p>
                      )}
                      {!cycleLocked && (
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => savePost(post)}>
                          <Save className="w-4 h-4 mr-2" /> Salvar agora
                        </Button>
                        {post.is_published ? (
                          <Button size="sm" variant="outline" onClick={() => setPublished(post, false)}>
                            <EyeOff className="w-4 h-4 mr-2" /> Voltar p/ rascunho
                          </Button>
                        ) : (
                          <Button size="sm" className="font-black uppercase mktcc-pop-sm" onClick={() => setPublished(post, true)}>
                            <Send className="w-4 h-4 mr-2" /> Publicar p/ o cliente
                          </Button>
                        )}
                      </div>
                      )}

                      {!post.is_published && !cycleLocked && (
                        <div className="rounded-md border-2 border-foreground/20 p-3 space-y-2 mt-2">
                          <p className="text-xs font-black uppercase">Editar imagens do rascunho</p>
                          {post.media_urls.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {post.media_urls.map((url) => (
                                <div key={url} className="relative w-16">
                                  <div className="aspect-[4/5] rounded-md overflow-hidden border-2 border-foreground bg-muted">
                                    {isVideoUrl(url)
                                      ? (post.poster_url
                                          ? <img src={post.poster_url} alt="Miniatura do vídeo" className="w-full h-full object-cover" />
                                          : <video src={url} className="w-full h-full object-cover" muted playsInline preload="metadata" />)
                                      : <img src={url} alt="Mídia" className="w-full h-full object-cover" />}
                                  </div>
                                  <button
                                    type="button"
                                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
                                    onClick={() => removePostMedia(post, url)}
                                    aria-label="Remover mídia"
                                  ><X className="w-3 h-3" /></button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Adicionar mídias</Label>
                              <Input type="file" multiple accept="image/*,video/*" disabled={uploading}
                                onChange={(e) => e.target.files?.length && uploadPostMedia(post, e.target.files, false)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Substituir todas</Label>
                              <Input type="file" multiple accept="image/*,video/*" disabled={uploading}
                                onChange={(e) => e.target.files?.length && uploadPostMedia(post, e.target.files, true)} />
                            </div>
                          </div>
                          {post.media_urls.some(isVideoUrl) && (
                            <VideoThumbPicker
                              videoUrl={post.media_urls.find(isVideoUrl) as string}
                              posterUrl={post.poster_url}
                              onCapture={(blob) => setPostPoster(post, blob)}
                              disabled={uploading}
                            />
                          )}
                          <p className="text-xs font-semibold text-muted-foreground">
                            As mídias salvam na hora (vídeo até 120MB). Depois clique em <strong>Publicar p/ o cliente</strong>.
                          </p>
                        </div>
                      )}



                      {post.status === "changes" && !cycleLocked && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2 mt-2">
                          <p className="text-xs font-semibold text-destructive">APLICAR ALTERAÇÃO</p>
                          <Textarea
                            rows={2}
                            placeholder="O que foi alterado? (o cliente verá este recado)"
                            value={revisions[post.id]?.note || ""}
                            onChange={(e) => setRevision(post.id, { note: e.target.value })}
                          />
                          <Input
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            onChange={(e) => e.target.files?.length && uploadRevisionFiles(post, e.target.files)}
                          />
                          {(revisions[post.id]?.media?.length || 0) > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {revisions[post.id].media.length} novo(s) arquivo(s) prontos. Deixe vazio para manter as mídias atuais.
                            </p>
                          )}
                          <Button
                            size="sm"
                            onClick={() => applyRevision(post)}
                            disabled={uploading || revisingId === post.id}
                          >
                            {revisingId === post.id
                              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                              : <><RefreshCw className="w-4 h-4 mr-2" /> Enviar nova versão p/ aprovação</>}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                );
              })}
              {visiblePosts.length === 0 && (
                <p className="text-sm font-semibold text-muted-foreground">
                  Nenhuma publicação nesta programação ainda.
                </p>
              )}
            </div>
            <div className="lg:sticky lg:top-6 space-y-2">
              <p className="text-xs font-black uppercase text-muted-foreground text-center">
                Prévia do cliente (só publicados) · arraste para reordenar
              </p>
              <PhoneInstagramPreview
                companyName={selected.company_name}
                instagramHandle={selected.instagram_handle}
                avatarUrl={selected.avatar_url}
                bio={selected.instagram_bio}
                posts={visiblePosts.filter((p) => p.is_published)}
                onReorder={reorderFromPreview}
              />
            </div>
            </div>
          </TabsContent>

          <TabsContent value="programacoes" className="mt-6 space-y-4">
            <Card className="mktcc-pop rounded-2xl overflow-hidden">
              <div className="h-2 mktcc-gradient" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-black uppercase tracking-tight">
                  <CalendarDays className="w-5 h-5" /> Nova programação (mês)
                </CardTitle>
                <p className="text-sm font-semibold text-muted-foreground">
                  Crie um ciclo por mês. Quando a data chegar ou você marcar como efetuado, o cliente vê como
                  “já processado / finalizado” e ninguém mais edita aquelas publicações.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Mês / título</Label>
                    <Input value={newCycle.title} placeholder="Ex: Programação Janeiro/2026"
                      onChange={(e) => setNewCycle({ ...newCycle, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Data em que será efetuada</Label>
                    <Input type="date" value={newCycle.scheduled_date}
                      onChange={(e) => setNewCycle({ ...newCycle, scheduled_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observação (o cliente vê)</Label>
                  <Textarea rows={3} value={newCycle.note}
                    onChange={(e) => setNewCycle({ ...newCycle, note: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Título da estratégia desta programação</Label>
                  <Input value={newCycle.strategy_title} placeholder="Ex: Estratégia de autoridade local"
                    onChange={(e) => setNewCycle({ ...newCycle, strategy_title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Estratégia desta programação (o cliente vê)</Label>
                  <Textarea rows={6} value={newCycle.strategy_text}
                    placeholder="O que será feito neste mês, pilares de conteúdo, frequência..."
                    onChange={(e) => setNewCycle({ ...newCycle, strategy_text: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Próximos passos desta programação (após aprovação)</Label>
                  <Textarea rows={4} value={newCycle.next_steps_text}
                    onChange={(e) => setNewCycle({ ...newCycle, next_steps_text: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Resumo desta programação</Label>
                  <Textarea rows={4} value={newCycle.summary_text}
                    onChange={(e) => setNewCycle({ ...newCycle, summary_text: e.target.value })} />
                </div>

                <Button onClick={createCycle} className="font-black uppercase mktcc-pop-sm">
                  <Plus className="w-4 h-4 mr-2" /> Criar programação
                </Button>
              </CardContent>
            </Card>

            {cycles.map((cycle) => {
              const count = posts.filter((p) => p.cycle_id === cycle.id).length;
              return (
                <Card key={cycle.id} className="mktcc-pop-sm rounded-2xl">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black uppercase">{cycle.title}</p>
                      {cycle.is_done
                        ? <Badge className="bg-secondary text-secondary-foreground font-black uppercase"><Lock className="w-3.5 h-3.5 mr-1" /> Já processada</Badge>
                        : <Badge className="bg-primary text-primary-foreground font-black uppercase">Em andamento</Badge>}
                      <Badge variant="outline">{count} publicação(ões)</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input defaultValue={cycle.title}
                          onBlur={(e) => e.target.value !== cycle.title && patchCycle(cycle, { title: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Data programada</Label>
                        <Input type="date" defaultValue={cycle.scheduled_date || ""}
                          onBlur={(e) => e.target.value !== (cycle.scheduled_date || "") && patchCycle(cycle, { scheduled_date: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Observação</Label>
                      <Textarea rows={3} defaultValue={cycle.note || ""}
                        onBlur={(e) => e.target.value !== (cycle.note || "") && patchCycle(cycle, { note: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Título da estratégia desta programação</Label>
                      <Input defaultValue={cycle.strategy_title || ""}
                        onBlur={(e) => e.target.value !== (cycle.strategy_title || "") && patchCycle(cycle, { strategy_title: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Estratégia desta programação</Label>
                      <Textarea rows={6} defaultValue={cycle.strategy_text || ""}
                        onBlur={(e) => e.target.value !== (cycle.strategy_text || "") && patchCycle(cycle, { strategy_text: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Resumo desta programação</Label>
                      <Textarea rows={4} defaultValue={cycle.summary_text || ""}
                        onBlur={(e) => e.target.value !== (cycle.summary_text || "") && patchCycle(cycle, { summary_text: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Próximos passos desta programação</Label>
                      <Textarea rows={4} defaultValue={cycle.next_steps_text || ""}
                        onBlur={(e) => e.target.value !== (cycle.next_steps_text || "") && patchCycle(cycle, { next_steps_text: e.target.value })} />
                    </div>
                    <div className="space-y-2 rounded-xl border-2 border-foreground p-3">
                      <p className="text-xs font-black uppercase">O que o cliente vê nesta programação</p>
                      <div className="flex flex-wrap gap-2">
                        {([
                          { key: "show_strategy", label: "Estratégia" },
                          { key: "show_summary", label: "Resumo" },
                          { key: "show_before", label: "Antes do perfil" },
                        ] as const).map((opt) => {
                          const on = cycle[opt.key] !== false;
                          return (
                            <Button key={opt.key} size="sm" variant={on ? "default" : "outline"}
                              className="font-black uppercase text-xs"
                              onClick={() => patchCycle(cycle, { [opt.key]: !on })}>
                              {on ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                              {opt.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => { setActiveCycleId(cycle.id); setTab("posts"); }}>
                        <Images className="w-4 h-4 mr-2" /> Ver publicações
                      </Button>
                      {!cycle.is_done && posts.some((p) => !p.cycle_id) && (
                        <Button size="sm" variant="outline" onClick={() => moveOrphansToCycle(cycle.id)}>
                          Trazer {posts.filter((p) => !p.cycle_id).length} antiga(s) p/ cá
                        </Button>
                      )}
                      {cycle.status === "done" ? (
                        <Button size="sm" variant="outline" onClick={() => patchCycle(cycle, { status: "open" })}>
                          <Unlock className="w-4 h-4 mr-2" /> Reabrir para edição
                        </Button>
                      ) : (
                        <Button size="sm" className="font-black uppercase" onClick={() => patchCycle(cycle, { status: "done" })}>
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar como efetuada
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => removeCycle(cycle)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {cycles.length === 0 && (
              <p className="text-sm font-semibold text-muted-foreground">
                Nenhuma programação criada ainda — as publicações atuais ficam em “Sem programação”.
              </p>
            )}
          </TabsContent>

          <TabsContent value="antes" className="mt-6">
            <Card className="mktcc-pop rounded-2xl overflow-hidden">
              <div className="h-2 mktcc-gradient" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-black uppercase tracking-tight">
                  <Camera className="w-5 h-5" /> Como o perfil estava
                </CardTitle>
                <p className="text-sm font-semibold text-muted-foreground">
                  Prints salvos na nuvem — ficam para sempre até você remover aqui.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div
                  className="space-y-3 rounded-xl border-2 border-foreground p-3"
                  onPaste={(e) => {
                    const item = Array.from(e.clipboardData?.items || [])
                      .find((it) => it.kind === "file" && it.type.startsWith("image/"));
                    const file = item?.getAsFile();
                    if (!file) return;
                    e.preventDefault();
                    uploadProfileFullShot(new File([file], file.name || `perfil-antes-${Date.now()}.png`, { type: file.type || "image/png" }));
                  }}
                >
                  <p className="text-sm font-black uppercase">Perfil completo (print vertical) — antes x depois</p>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Suba o print vertical do perfil inteiro mostrando os posts antigos. A prévia do lado mostra como vai ficar com as publicações atuais.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input type="file" accept="image/*" disabled={uploading} className="max-w-xs"
                      onChange={(e) => e.target.files?.[0] && uploadProfileFullShot(e.target.files[0])} />
                    {selected.before_profile_full_url && (
                      <Button size="sm" variant="destructive" onClick={removeProfileFullShot}>
                        <X className="w-4 h-4 mr-2" /> Remover print
                      </Button>
                    )}
                  </div>
                  <div
                    tabIndex={0}
                    role="button"
                    aria-label="Colar print do perfil completo com Ctrl + V"
                    className="rounded-lg border-2 border-dashed border-foreground/40 p-3 text-center text-xs font-bold uppercase text-muted-foreground cursor-text outline-none focus:border-primary focus:text-foreground"
                  >
                    {uploading ? "Enviando..." : "Clique aqui e cole com Ctrl + V"}
                  </div>
                  <ProfileBeforeAfter
                    beforeUrl={selected.before_profile_full_url}
                    companyName={selected.company_name}
                    instagramHandle={selected.instagram_handle}
                    avatarUrl={selected.avatar_url}
                    bio={selected.instagram_bio}
                    posts={visiblePosts.filter((p) => p.is_published)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observação do histórico (o cliente vê)</Label>
                  <Textarea rows={4} value={selected.before_note || ""}
                    onChange={(e) => setSelected({ ...selected, before_note: e.target.value })} />
                  <Button onClick={saveProject} disabled={loading}><Save className="w-4 h-4 mr-2" /> Salvar texto</Button>
                </div>

                {([
                  { key: "instagram", label: "Instagram", icon: <Instagram className="w-4 h-4" />, urls: selected.before_instagram_urls || [] },
                  { key: "facebook", label: "Facebook", icon: <Facebook className="w-4 h-4" />, urls: selected.before_facebook_urls || [] },
                ] as const).map((group) => (
                  <div
                    key={group.key}
                    className="space-y-3 rounded-xl border-2 border-foreground p-3 focus-within:ring-2 focus-within:ring-primary"
                    onPaste={(e) => {
                      const items = Array.from(e.clipboardData?.items || []);
                      const files = items
                        .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
                        .map((it) => it.getAsFile())
                        .filter((f): f is File => !!f)
                        .map((f, i) => new File([f], f.name || `print-${Date.now()}-${i}.png`, { type: f.type || "image/png" }));
                      if (files.length === 0) return;
                      e.preventDefault();
                      uploadBeforeShots(group.key, files);
                    }}
                  >
                    <p className="flex items-center gap-2 text-sm font-black uppercase">
                      {group.icon} {group.label} — {group.urls.length} print(s) (sugerido 3)
                    </p>
                    <Input type="file" multiple accept="image/*" disabled={uploading}
                      onChange={(e) => e.target.files?.length && uploadBeforeShots(group.key, e.target.files)} />
                    <div
                      tabIndex={0}
                      role="button"
                      aria-label={`Colar print do ${group.label} com Ctrl + V`}
                      className="rounded-lg border-2 border-dashed border-foreground/40 p-3 text-center text-xs font-bold uppercase text-muted-foreground cursor-text outline-none focus:border-primary focus:text-foreground"
                    >
                      {uploading ? "Enviando..." : "Clique aqui e cole com Ctrl + V"}
                    </div>

                    {group.urls.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {group.urls.map((url, i) => (
                          <div key={url} className="relative rounded-lg overflow-hidden border-2 border-foreground bg-muted">
                            <img src={url} alt={`${group.label} antes ${i + 1}`} loading="lazy" className="w-full h-auto" />
                            <button
                              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center"
                              onClick={() => removeBeforeShot(group.key, url)}
                              aria-label="Remover print"
                            ><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logo" className="mt-6">
            <Card className="mktcc-pop rounded-2xl overflow-hidden">
              <div className="h-2 mktcc-gradient" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-black uppercase tracking-tight">
                  <Images className="w-5 h-5" /> Aprovação da nova logo
                </CardTitle>
                <p className="text-sm font-semibold text-muted-foreground">
                  Etapa opcional — só aparece na área do cliente quando você liberar aqui.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-foreground p-3">
                  <Badge className={`rounded-full border-2 border-foreground font-black uppercase ${selected.logo_enabled ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}>
                    {selected.logo_enabled ? "Etapa liberada" : "Etapa oculta"}
                  </Badge>
                  <Button size="sm" variant={selected.logo_enabled ? "outline" : "default"} onClick={() => toggleLogoStep(!selected.logo_enabled)}>
                    {selected.logo_enabled ? <><EyeOff className="w-4 h-4 mr-2" /> Ocultar do cliente</> : <><Send className="w-4 h-4 mr-2" /> Liberar para o cliente</>}
                  </Button>
                  <span className="text-xs font-bold uppercase text-muted-foreground">
                    Status do cliente:{" "}
                    {selected.logo_status === "approved" ? "Aprovada" : selected.logo_status === "changes" ? "Pediu ajuste" : "Pendente"}
                  </span>
                  {selected.logo_status !== "pending" && (
                    <Button size="sm" variant="outline" onClick={resetLogoStatus}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Reabrir aprovação
                    </Button>
                  )}
                </div>

                {selected.logo_client_note && (
                  <div className="rounded-xl border-2 border-foreground bg-secondary p-3">
                    <p className="text-xs font-black uppercase">Observação do cliente</p>
                    <p className="whitespace-pre-wrap text-sm font-medium">{selected.logo_client_note}</p>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  {([
                    { slot: "logo_before_url", label: "Logo antiga (antes)" },
                    { slot: "logo_after_url", label: "Logo nova (depois)" },
                  ] as const).map((item) => (
                    <div
                      key={item.slot}
                      className="space-y-3 rounded-xl border-2 border-foreground p-3 focus-within:ring-2 focus-within:ring-primary"
                      onPaste={(e) => {
                        const file = Array.from(e.clipboardData?.items || [])
                          .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
                          .map((it) => it.getAsFile())
                          .find((f): f is File => !!f);
                        if (!file) return;
                        e.preventDefault();
                        uploadLogoShot(item.slot, new File([file], file.name || `logo-${Date.now()}.png`, { type: file.type || "image/png" }));
                      }}
                    >
                      <Label>{item.label}</Label>
                      <div className="rounded-lg overflow-hidden border-2 border-foreground bg-muted aspect-square flex items-center justify-center">
                        {selected[item.slot] ? (
                          <img src={selected[item.slot]} alt={item.label} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xs font-bold uppercase text-muted-foreground">Sem imagem</span>
                        )}
                      </div>
                      <Input type="file" accept="image/*" disabled={uploading}
                        onChange={(e) => e.target.files?.[0] && uploadLogoShot(item.slot, e.target.files[0])} />
                      <div
                        tabIndex={0}
                        role="button"
                        aria-label={`Colar ${item.label} com Ctrl + V`}
                        className="rounded-lg border-2 border-dashed border-foreground/40 p-3 text-center text-xs font-bold uppercase text-muted-foreground cursor-text outline-none focus:border-primary focus:text-foreground"
                      >
                        {uploading ? "Enviando..." : "Clique aqui e cole com Ctrl + V"}
                      </div>
                      {selected[item.slot] && (
                        <Button size="sm" variant="destructive" onClick={async () => {
                          await call("update_project", { project_id: selected.id, [item.slot]: "" });
                          setSelected({ ...selected, [item.slot]: "" } as Project);
                        }}>
                          <X className="w-4 h-4 mr-2" /> Remover
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Resumo: por que foi feita outra logo (o cliente vê)</Label>
                  <Textarea rows={5} value={selected.logo_reason || ""}
                    placeholder="Ex.: a logo anterior perdia legibilidade em telas pequenas..."
                    onChange={(e) => setSelected({ ...selected, logo_reason: e.target.value })} />
                  <Button onClick={saveProject} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" /> Salvar resumo
                  </Button>
                </div>
              </CardContent>
            </Card>
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
                <div

                  className="space-y-3 rounded-xl border-2 border-foreground p-3 focus-within:ring-2 focus-within:ring-primary"
                  onPaste={(e) => {
                    const file = Array.from(e.clipboardData?.items || [])
                      .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
                      .map((it) => it.getAsFile())
                      .find((f): f is File => !!f);
                    if (!file) return;
                    e.preventDefault();
                    uploadAvatar(new File([file], file.name || `logo-${Date.now()}.png`, { type: file.type || "image/png" }));
                  }}
                >
                  <Label>Logo / foto de perfil do Instagram</Label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 shrink-0 rounded-full overflow-hidden border-2 border-foreground bg-muted">
                      {selected.avatar_url && (
                        <img src={selected.avatar_url} alt="Logo do perfil" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input type="file" accept="image/*" disabled={uploading}
                        onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
                      <Input value={selected.avatar_url} onChange={(e) => setSelected({ ...selected, avatar_url: e.target.value })} placeholder="https://..." />
                    </div>
                  </div>
                  <div
                    tabIndex={0}
                    role="button"
                    aria-label="Colar logo do Instagram com Ctrl + V"
                    className="rounded-lg border-2 border-dashed border-foreground/40 p-3 text-center text-xs font-bold uppercase text-muted-foreground cursor-text outline-none focus:border-primary focus:text-foreground"
                  >
                    {uploading ? "Enviando..." : "Clique aqui e cole a logo com Ctrl + V"}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Bio do Instagram (aparece na prévia)</Label>
                  <Textarea rows={4} value={selected.instagram_bio || ""}
                    onChange={(e) => setSelected({ ...selected, instagram_bio: e.target.value })}
                    placeholder={"Endereço fiscal e comercial\nHigienópolis · São Paulo\nlink.bio"} />
                </div>

                <div className="space-y-2">
                  <Label>Link do Drive de arquivos (abre em nova aba para o cliente)</Label>
                  <Input
                    type="url"
                    inputMode="url"
                    value={selected.drive_url || ""}
                    onChange={(e) => setSelected({ ...selected, drive_url: e.target.value })}
                    placeholder="https://drive.google.com/drive/folders/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para esconder o botão de arquivos na área do cliente.
                  </p>
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
