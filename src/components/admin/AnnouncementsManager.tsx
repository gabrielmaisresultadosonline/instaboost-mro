import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bell, Plus, Trash2, Save, Eye, EyeOff, 
  Upload, X, AlertTriangle, Image as ImageIcon,
  Link as LinkIcon, Users, Clock, RefreshCw
} from 'lucide-react';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  thumbnailUrl?: string;
  isActive: boolean;
  forceRead: boolean;
  forceReadSeconds: number;
  maxViews: number;
  createdAt: string;
  updatedAt: string;
  viewCount?: number;
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
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [thumbnailMode, setThumbnailMode] = useState<'url' | 'file'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Announcement>>({
    title: '',
    content: '',
    thumbnailUrl: '',
    isActive: true,
    forceRead: false,
    forceReadSeconds: 5,
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo inválido', description: 'Selecione uma imagem', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 5MB', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `announcements/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('assets')
        .getPublicUrl(fileName);

      setFormData({ ...formData, thumbnailUrl: urlData.publicUrl });
      toast({ title: 'Imagem enviada!', description: 'Thumbnail atualizada com sucesso' });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({ title: 'Erro no upload', description: 'Não foi possível enviar a imagem', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddNew = () => {
    setEditingId('new');
    setThumbnailMode('url');
    setFormData({
      title: '',
      content: '',
      thumbnailUrl: '',
      isActive: true,
      forceRead: false,
      forceReadSeconds: 5,
      maxViews: 1
    });
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setThumbnailMode('url');
    setFormData({
      title: announcement.title,
      content: announcement.content,
      thumbnailUrl: announcement.thumbnailUrl || '',
      isActive: announcement.isActive,
      forceRead: announcement.forceRead,
      forceReadSeconds: announcement.forceReadSeconds || 5,
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
        forceReadSeconds: formData.forceReadSeconds ?? 5,
        maxViews: formData.maxViews ?? 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        viewCount: 0
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
              forceReadSeconds: formData.forceReadSeconds ?? 5,
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

  const handleResetViews = async (id: string) => {
    const updatedAnnouncements = announcements.map(a =>
      a.id === id ? { ...a, viewCount: 0, updatedAt: new Date().toISOString() } : a
    );
    setAnnouncements(updatedAnnouncements);
    await saveAnnouncements(updatedAnnouncements);
    toast({ title: 'Visualizações zeradas' });
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadAnnouncements} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Aviso
          </Button>
        </div>
      </div>

      <div className="glass-card p-4 bg-yellow-500/10 border-yellow-500/30">
        <p className="text-sm text-yellow-200">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Os avisos aparecem como popup logo após o usuário fazer login no sistema.
          Formatos de imagem suportados: 1920x1080, 1080x1920, 1080x1080, 1080x1350
        </p>
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

            {/* Thumbnail Section */}
            <div className="space-y-3">
              <Label>Thumbnail (opcional)</Label>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={thumbnailMode === 'url' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setThumbnailMode('url')}
                  className="gap-2"
                >
                  <LinkIcon className="w-4 h-4" />
                  Link URL
                </Button>
                <Button
                  type="button"
                  variant={thumbnailMode === 'file' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setThumbnailMode('file')}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Arquivo
                </Button>
              </div>

              {thumbnailMode === 'url' ? (
                <Input
                  value={formData.thumbnailUrl || ''}
                  onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              ) : (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full gap-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4" />
                        Selecionar Imagem (max 5MB)
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Formatos: JPG, PNG, WEBP • Tamanhos: 1920x1080, 1080x1920, 1080x1080, 1080x1350
                  </p>
                </div>
              )}

              {formData.thumbnailUrl && (
                <div className="relative mt-2">
                  <img 
                    src={formData.thumbnailUrl} 
                    alt="Preview" 
                    className="max-h-48 rounded-lg object-contain bg-secondary/50"
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setFormData({ ...formData, thumbnailUrl: '' })}
                  >
                    <X className="w-4 h-4" />
                  </Button>
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

              <div className="space-y-3">
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
                      <Clock className="w-4 h-4 text-yellow-500" />
                      Forçar Leitura (Temporizador)
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Timer seconds when force read is enabled */}
            {formData.forceRead && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <Label htmlFor="forceReadSeconds" className="flex items-center gap-2 text-yellow-300">
                  <Clock className="w-4 h-4" />
                  Segundos para aguardar antes de poder fechar
                </Label>
                <div className="flex items-center gap-3 mt-2">
                  <Input
                    id="forceReadSeconds"
                    type="number"
                    min={1}
                    max={60}
                    value={formData.forceReadSeconds || 5}
                    onChange={(e) => setFormData({ ...formData, forceReadSeconds: Math.min(60, Math.max(1, Number(e.target.value))) })}
                    className="w-24 bg-secondary"
                  />
                  <span className="text-sm text-muted-foreground">segundos (1-60)</span>
                </div>
                <p className="text-xs text-yellow-400/70 mt-2">
                  O usuário não poderá fechar o aviso até o tempo acabar
                </p>
              </div>
            )}
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
                  className="w-20 h-20 rounded-lg object-cover"
                  onError={(e) => e.currentTarget.style.display = 'none'}
                />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold truncate">{announcement.title}</h4>
                  {announcement.forceRead && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {announcement.forceReadSeconds}s
                    </span>
                  )}
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                    {announcement.maxViews === 99 ? 'Sempre' : `${announcement.maxViews}x`}
                  </span>
                  {/* View count badge */}
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {announcement.viewCount || 0} views
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
                  onClick={() => handleResetViews(announcement.id)}
                  title="Zerar visualizações"
                  className="text-blue-400 hover:text-blue-300"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
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
