import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getAdminSessionToken } from "@/lib/adminConfig";
import { 
  Users, Plus, FileText, Search, Loader2, 
  ShieldBan, ShieldCheck, Mail, Video, Edit2, Trash2, Save, MoveUp, MoveDown
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function LotarGruposPanel() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);

  const invokeAdmin = async (action: string, payload: Record<string, unknown> = {}) => {
    const token = getAdminSessionToken();
    if (!token) throw new Error("Sessão administrativa expirada.");
    const { data, error } = await supabase.functions.invoke('lotargrupos-api', {
      body: { action, admin_token: token, ...payload },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "Erro na operação");
    return data;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersData = await invokeAdmin('admin_list_users');
      const lessonsData = await invokeAdmin('admin_list_lessons');
      setUsers(usersData.users || []);
      setLessons(lessonsData.lessons || []);
    } catch (error: any) {
      toast({ title: "Erro ao buscar dados", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await invokeAdmin('admin_save_lesson', { lesson: editingLesson });
      toast({ title: "Aula salva com sucesso!" });
      setIsLessonDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro ao salvar aula", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta aula?")) return;
    try {
      await invokeAdmin('admin_delete_lesson', { id });
      toast({ title: "Aula excluída!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro ao excluir aula", description: error.message, variant: "destructive" });
    }
  };

  const toggleUserStatus = async (user: any) => {
    try {
      const newStatus = user.status === 'active' ? 'blocked' : 'active';
      await invokeAdmin('admin_update_user', { id: user.id, updates: { status: newStatus } });
      toast({ title: "Status do usuário atualizado!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro ao atualizar usuário", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Video className="h-6 w-6 text-primary" /> Gestão Lotar Grupos
        </h2>
        <Button onClick={() => { setEditingLesson({ order_index: lessons.length + 1, title: "", description: "" }); setIsLessonDialogOpen(true); }} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Nova Aula
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Aulas */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 px-1">
            <Video className="h-4 w-4" /> Aulas do Curso
          </h3>
          <div className="space-y-3">
            {lessons.map(lesson => (
              <Card key={lesson.id} className="bg-card/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/20 text-primary w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs">
                      {lesson.order_index}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{lesson.title}</h4>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{lesson.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingLesson(lesson); setIsLessonDialogOpen(true); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteLesson(lesson.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Usuários */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 px-1">
            <Users className="h-4 w-4" /> Alunos Cadastrados
          </h3>
          <div className="space-y-3">
            {users.map(user => (
              <Card key={user.id} className={user.status === 'blocked' ? "opacity-60" : ""}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm">{user.name}</h4>
                    <p className="text-[10px] text-muted-foreground">{user.email}</p>
                    <Badge className={user.status === 'active' ? "bg-green-600 mt-1" : "bg-destructive mt-1"}>
                      {user.status === 'active' ? "Ativo" : "Bloqueado"}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleUserStatus(user)}>
                    {user.status === 'active' ? <ShieldBan className="h-4 w-4 text-destructive" /> : <ShieldCheck className="h-4 w-4 text-green-500" />}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={isLessonDialogOpen} onOpenChange={setIsLessonDialogOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-white">
          <DialogHeader><DialogTitle className="text-white">{editingLesson?.id ? "Editar Aula" : "Nova Aula"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveLesson} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Título da Aula</label>
                <Input value={editingLesson?.title || ""} onChange={e => setEditingLesson({...editingLesson, title: e.target.value})} className="bg-slate-950 border-slate-800" required />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Ordem</label>
                <Input type="number" value={editingLesson?.order_index || 0} onChange={e => setEditingLesson({...editingLesson, order_index: parseInt(e.target.value)})} className="bg-slate-950 border-slate-800" required />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase">URL do Vídeo (Embed/Direct)</label>
              <Input 
                value={editingLesson?.video_url || ""} 
                onChange={e => setEditingLesson({...editingLesson, video_url: e.target.value})} 
                placeholder="Ex: https://iframe.mediadelivery.net/embed/..." 
                className="bg-slate-950 border-slate-800"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Thumbnail (URL ou Paste Image)</label>
              <div className="relative">
                <Input 
                  value={editingLesson?.thumbnail_url || ""} 
                  onChange={e => setEditingLesson({...editingLesson, thumbnail_url: e.target.value})} 
                  onPaste={(e) => {
                    const items = e.clipboardData.items;
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].type.indexOf("image") !== -1) {
                        toast({ title: "Upload via Paste", description: "O sistema detectou uma imagem. Para melhores resultados, faça o upload no Storage primeiro." });
                      }
                    }
                  }}
                  placeholder="URL da imagem de capa" 
                  className="bg-slate-950 border-slate-800"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Descrição Completa</label>
              <textarea 
                value={editingLesson?.description || ""} 
                onChange={e => setEditingLesson({...editingLesson, description: e.target.value})} 
                className="flex min-h-[120px] w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Detalhes da aula, links importantes e orientações..."
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Materiais (JSON: [{ "label": "Download", "url": "..." }])</label>
              <textarea 
                value={typeof editingLesson?.buttons === 'string' ? editingLesson.buttons : JSON.stringify(editingLesson?.buttons || [], null, 2)} 
                onChange={e => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setEditingLesson({...editingLesson, buttons: parsed});
                  } catch (err) {
                    setEditingLesson({...editingLesson, buttons: e.target.value});
                  }
                }} 
                className="flex min-h-[80px] w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-mono text-blue-400"
                placeholder='[{"label": "PDF Aula", "url": "https://..."}]'
              />
            </div>

            <DialogFooter className="pt-4 border-t border-slate-800">
              <Button type="submit" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"><Save className="h-4 w-4" /> Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
