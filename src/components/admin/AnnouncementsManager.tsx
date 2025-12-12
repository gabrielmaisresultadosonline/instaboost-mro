import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bell, Plus, Trash2, Save, Eye, EyeOff, 
  Upload, X, AlertTriangle, GripVertical 
} from 'lucide-react';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  thumbnailUrl?: string;
  isActive: boolean;
  forceRead: boolean; // User must scroll/read to dismiss
  maxViews: number; // 1 or 2, how many times to show per user
  createdAt: string;
  updatedAt: string;
}

interface AnnouncementsData {
  announcements: Announcement[];
  lastUpdated: string;
}

const AnnouncementsManager = () => {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Announcement>>({
    title: '',
    content: '',
    thumbnailUrl: '',
    isActive: true,
    forceRead: false,
    maxViews: 1
  });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('user-data')
        .download('admin/announcements.json');
      
      if (error) {
        if (error.message.includes('not found')) {
          console.log('📢 Nenhum aviso encontrado, iniciando vazio');
          setAnnouncements([]);
        } else {
          throw error;
        }
      } else {
        const text = await data.text();
        const parsed: AnnouncementsData = JSON.parse(text);
        setAnnouncements(parsed.announcements || []);
        console.log(`📢 ${parsed.announcements?.length || 0} avisos carregados`);
      }
    } catch (error) {
      console.error('Erro ao carregar avisos:', error);
      setAnnouncements([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAnnouncements = async (data: Announcement[]) => {
    setIsSaving(true);
    try {
      const payload: AnnouncementsData = {
        announcements: data,
        lastUpdated: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      
      const { error } = await supabase.storage
        .from('user-data')
        .upload('admin/announcements.json', blob, { 
          upsert: true,
          contentType: 'application/json'
        });

      if (error) throw error;

      toast({ title: 'Avisos salvos!', description: 'Alterações publicadas para usuários' });
      console.log('📢 Avisos salvos com sucesso');
    } catch (error) {
      console.error('Erro ao salvar avisos:', error);
      toast({ 
        title: 'Erro ao salvar', 
        description: 'Não foi possível salvar os avisos', 
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNew = () => {
    setEditingId('new');
    setFormData({
      title: '',
      content: '',
      thumbnailUrl: '',
      isActive: true,
      forceRead: false,
      maxViews: 1
    });
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      thumbnailUrl: announcement.thumbnailUrl || '',
      isActive: announcement.isActive,
      forceRead: announcement.forceRead,
      maxViews: announcement.maxViews
    });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      toast({ title: 'Preencha título e conteúdo', variant: 'destructive' });
      return;
    }

    let updatedAnnouncements: Announcement[];

    if (editingId === 'new') {
      const newAnnouncement: Announcement = {
        id: `ann_${Date.now()}`,
        title: formData.title!,
        content: formData.content!,
        thumbnailUrl: formData.thumbnailUrl || undefined,
        isActive: formData.isActive ?? true,
        forceRead: formData.forceRead ?? false,
        maxViews: formData.maxViews ?? 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      updatedAnnouncements = [...announcements, newAnnouncement];
    } else {
      updatedAnnouncements = announcements.map(a => 
        a.id === editingId 
          ? { 
              ...a, 
              title: formData.title!,
              content: formData.content!,
              thumbnailUrl: formData.thumbnailUrl || undefined,
              isActive: formData.isActive ?? true,
              forceRead: formData.forceRead ?? false,
              maxViews: formData.maxViews ?? 1,
              updatedAt: new Date().toISOString()
            }
          : a
      );
    }

    setAnnouncements(updatedAnnouncements);
    await saveAnnouncements(updatedAnnouncements);
    setEditingId(null);
    setFormData({});
  };

  const handleDelete = async (id: string) => {
    const updatedAnnouncements = announcements.filter(a => a.id !== id);
    setAnnouncements(updatedAnnouncements);
    await saveAnnouncements(updatedAnnouncements);
    toast({ title: 'Aviso removido' });
  };

  const handleToggleActive = async (id: string) => {
    const updatedAnnouncements = announcements.map(a =>
      a.id === id ? { ...a, isActive: !a.isActive, updatedAt: new Date().toISOString() } : a
    );
    setAnnouncements(updatedAnnouncements);
    await saveAnnouncements(updatedAnnouncements);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({});
  };

  if (isLoading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Carregando avisos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-display font-bold">Avisos</h2>
          <span className="text-sm text-muted-foreground">
            ({announcements.filter(a => a.isActive).length} ativos)
          </span>
        </div>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Aviso
        </Button>
      </div>

      {/* Edit Form */}
      {editingId && (
        <div className="glass-card p-6 space-y-4 border-2 border-primary/50">
          <h3 className="font-bold text-lg">
            {editingId === 'new' ? 'Novo Aviso' : 'Editar Aviso'}
          </h3>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="title">Título do Aviso</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Nova atualização disponível!"
              />
            </div>

            <div>
              <Label htmlFor="content">Conteúdo (suporta múltiplas linhas)</Label>
              <Textarea
                id="content"
                value={formData.content || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Escreva o conteúdo do aviso aqui..."
                rows={5}
              />
            </div>

            <div>
              <Label htmlFor="thumbnail">URL da Thumbnail (opcional)</Label>
              <Input
                id="thumbnail"
                value={formData.thumbnailUrl || ''}
                onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                placeholder="https://exemplo.com/imagem.jpg"
              />
              {formData.thumbnailUrl && (
                <div className="mt-2">
                  <img 
                    src={formData.thumbnailUrl} 
                    alt="Preview" 
                    className="h-32 rounded-lg object-cover"
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxViews">Exibir quantas vezes por usuário</Label>
                <select
                  id="maxViews"
                  value={formData.maxViews || 1}
                  onChange={(e) => setFormData({ ...formData, maxViews: Number(e.target.value) })}
                  className="w-full mt-1 bg-secondary border border-border rounded-md px-3 py-2"
                >
                  <option value={1}>1 vez</option>
                  <option value={2}>2 vezes</option>
                  <option value={3}>3 vezes</option>
                  <option value={99}>Sempre (não limitar)</option>
                </select>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.isActive ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label>Aviso Ativo</Label>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.forceRead ?? false}
                    onCheckedChange={(checked) => setFormData({ ...formData, forceRead: checked })}
                  />
                  <div>
                    <Label className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      Forçar Leitura
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Usuário precisa rolar até o final para fechar
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? 'Salvando...' : 'Salvar Aviso'}
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum aviso cadastrado</p>
            <p className="text-sm">Clique em "Novo Aviso" para criar</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div 
              key={announcement.id} 
              className={`glass-card p-4 flex items-center gap-4 transition-opacity ${
                !announcement.isActive ? 'opacity-50' : ''
              }`}
            >
              {announcement.thumbnailUrl && (
                <img 
                  src={announcement.thumbnailUrl} 
                  alt="" 
                  className="w-16 h-16 rounded-lg object-cover"
                  onError={(e) => e.currentTarget.style.display = 'none'}
                />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold truncate">{announcement.title}</h4>
                  {announcement.forceRead && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded">
                      Força Leitura
                    </span>
                  )}
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                    {announcement.maxViews === 99 ? 'Sempre' : `${announcement.maxViews}x`}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {announcement.content}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Criado: {new Date(announcement.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(announcement.id)}
                  title={announcement.isActive ? 'Desativar' : 'Ativar'}
                >
                  {announcement.isActive ? (
                    <Eye className="w-4 h-4 text-green-500" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(announcement)}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(announcement.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AnnouncementsManager;
