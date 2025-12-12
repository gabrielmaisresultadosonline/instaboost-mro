import { useState, useEffect } from 'react';
import { 
  getAdminData, saveAdminData, addModule, updateModule, deleteModule,
  addVideoToModule, addTextToModule, addButtonToModule, addSectionToModule, deleteContent, updateContent,
  addVideoToSection, addButtonToSection, deleteSectionContent,
  TutorialModule, ModuleContent, ModuleVideo, ModuleText, ModuleButton, ModuleSection, ModuleColor, getYoutubeThumbnail,
  saveModulesToCloud, loadModulesFromCloud, SectionContent
} from '@/lib/adminConfig';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import CoverUploader from './CoverUploader';
import { 
  Plus, Trash2, Save, Check, X, Play, Video, Type, 
  ChevronDown, ChevronUp, Image as ImageIcon,
  Edit2, Upload, Loader2, Link2, ExternalLink, LayoutList
} from 'lucide-react';

interface ModuleManagerProps {
  downloadLink: string;
  onDownloadLinkChange: (link: string) => void;
  onSaveSettings: () => void;
}

// Helper to delete storage file
const deleteStorageFile = async (url: string) => {
  if (url && url.includes('supabase.co/storage')) {
    try {
      const match = url.match(/\/storage\/v1\/object\/public\/assets\/(.+)/);
      if (match) {
        await supabase.storage.from('assets').remove([match[1]]);
      }
    } catch (e) {
      console.error('Error deleting file:', e);
    }
  }
};

const ModuleManager = ({ downloadLink, onDownloadLinkChange, onSaveSettings }: ModuleManagerProps) => {
  const { toast } = useToast();
  const [adminData, setAdminData] = useState(getAdminData());
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<{ moduleId: string; content: ModuleContent; sectionId?: string } | null>(null);
  const [showAddContent, setShowAddContent] = useState<{ moduleId: string; type: 'video' | 'text' | 'button' | 'section'; sectionId?: string } | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(true);

  // New section content forms
  const [newSectionVideo, setNewSectionVideo] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    thumbnailUrl: '',
    showNumber: true,
    showTitle: true
  });

  const [newSectionButton, setNewSectionButton] = useState({
    title: '',
    url: '',
    description: '',
    coverUrl: '',
    showTitle: true
  });
  
  // Load modules from cloud on mount
  useEffect(() => {
    const loadFromCloud = async () => {
      try {
        console.log('[ModuleManager] Loading modules from cloud...');
        const cloudData = await loadModulesFromCloud();
        
        if (cloudData && cloudData.modules && cloudData.modules.length > 0) {
          console.log('[ModuleManager] Loaded', cloudData.modules.length, 'modules from cloud');
          
          // Update local storage with cloud data
          const currentData = getAdminData();
          currentData.modules = cloudData.modules;
          if (cloudData.settings) {
            currentData.settings.downloadLink = cloudData.settings.downloadLink || currentData.settings.downloadLink;
            currentData.settings.welcomeVideo = cloudData.settings.welcomeVideo || currentData.settings.welcomeVideo;
          }
          saveAdminData(currentData);
          setAdminData(currentData);
          setWelcomeVideo(currentData.settings.welcomeVideo || {
            enabled: false,
            title: '',
            showTitle: true,
            youtubeUrl: '',
            coverUrl: ''
          });
          
          toast({
            title: "Módulos carregados",
            description: `${cloudData.modules.length} módulos carregados da nuvem`,
          });
        } else {
          console.log('[ModuleManager] No cloud data found, using local');
        }
      } catch (error) {
        console.error('[ModuleManager] Error loading from cloud:', error);
      } finally {
        setIsLoadingCloud(false);
      }
    };
    
    loadFromCloud();
  }, []);
  
  // Welcome video state
  const [welcomeVideo, setWelcomeVideo] = useState(adminData.settings.welcomeVideo || {
    enabled: false,
    title: '',
    showTitle: true,
    youtubeUrl: '',
    coverUrl: ''
  });

  // New module form
  const [newModule, setNewModule] = useState({
    title: '',
    description: '',
    coverUrl: '',
    showNumber: true,
    color: 'default' as ModuleColor,
    isBonus: false
  });

  // Edit module form
  const [editModuleData, setEditModuleData] = useState<Partial<TutorialModule>>({});

  // New content forms
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    thumbnailUrl: '',
    showNumber: true,
    showTitle: true
  });

  const [newText, setNewText] = useState({
    title: '',
    content: '',
    showTitle: true
  });

  const [newButton, setNewButton] = useState({
    title: '',
    url: '',
    description: '',
    coverUrl: '',
    showTitle: true
  });

  const [newSection, setNewSection] = useState({
    title: '',
    description: '',
    showTitle: true,
    isBonus: false
  });

  const refreshData = () => {
    const data = getAdminData();
    setAdminData(data);
    setWelcomeVideo(data.settings.welcomeVideo || {
      enabled: false,
      title: '',
      showTitle: true,
      youtubeUrl: '',
      coverUrl: ''
    });
  };

  const handleSaveWelcomeVideo = () => {
    const data = getAdminData();
    data.settings.welcomeVideo = welcomeVideo;
    saveAdminData(data);
    toast({ title: "Salvo!", description: "Vídeo de boas-vindas atualizado" });
    refreshData();
  };

  // Publish modules to cloud for all users
  const handlePublishToCloud = async () => {
    setIsPublishing(true);
    try {
      const success = await saveModulesToCloud();
      if (success) {
        toast({ 
          title: "Publicado!", 
          description: "Módulos publicados para todos os usuários" 
        });
      } else {
        toast({ 
          title: "Erro", 
          description: "Não foi possível publicar os módulos", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error('Error publishing modules:', error);
      toast({ 
        title: "Erro", 
        description: "Erro ao publicar módulos", 
        variant: "destructive" 
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Module handlers
  const handleAddModule = () => {
    if (!newModule.title.trim()) {
      toast({ title: "Erro", description: "Preencha o título do módulo", variant: "destructive" });
      return;
    }
    addModule(newModule.title, newModule.description, newModule.coverUrl, newModule.showNumber, newModule.color, newModule.isBonus);
    setNewModule({ title: '', description: '', coverUrl: '', showNumber: true, color: 'default', isBonus: false });
    refreshData();
    toast({ title: "Módulo criado!" });
  };

  const handleUpdateModule = (moduleId: string) => {
    updateModule(moduleId, editModuleData);
    setEditingModule(null);
    setEditModuleData({});
    refreshData();
    toast({ title: "Módulo atualizado!" });
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (confirm('Tem certeza que deseja excluir este módulo e todo seu conteúdo?')) {
      const module = adminData.modules.find(m => m.id === moduleId);
      if (module) {
        // Delete module cover from storage
        await deleteStorageFile(module.coverUrl);
        // Delete all content covers from storage
        for (const content of module.contents) {
          if (content.type === 'video') {
            await deleteStorageFile((content as ModuleVideo).thumbnailUrl);
          }
        }
      }
      deleteModule(moduleId);
      refreshData();
      toast({ title: "Módulo excluído!" });
    }
  };

  // Content handlers
  const handleAddVideo = (moduleId: string) => {
    if (!newVideo.title || !newVideo.youtubeUrl) {
      toast({ title: "Erro", description: "Preencha título e URL do YouTube", variant: "destructive" });
      return;
    }
    addVideoToModule(moduleId, {
      title: newVideo.title,
      description: newVideo.description,
      youtubeUrl: newVideo.youtubeUrl,
      thumbnailUrl: newVideo.thumbnailUrl || getYoutubeThumbnail(newVideo.youtubeUrl),
      showNumber: newVideo.showNumber,
      showTitle: newVideo.showTitle
    });
    setNewVideo({ title: '', description: '', youtubeUrl: '', thumbnailUrl: '', showNumber: true, showTitle: true });
    setShowAddContent(null);
    refreshData();
    toast({ title: "Vídeo adicionado!" });
  };

  const handleAddText = (moduleId: string) => {
    if (!newText.title || !newText.content) {
      toast({ title: "Erro", description: "Preencha título e conteúdo", variant: "destructive" });
      return;
    }
    addTextToModule(moduleId, { ...newText, showTitle: newText.showTitle });
    setNewText({ title: '', content: '', showTitle: true });
    setShowAddContent(null);
    refreshData();
    toast({ title: "Texto adicionado!" });
  };

  const handleAddButton = (moduleId: string) => {
    if (!newButton.title || !newButton.url) {
      toast({ title: "Erro", description: "Preencha título e URL do link", variant: "destructive" });
      return;
    }
    addButtonToModule(moduleId, { ...newButton, showTitle: newButton.showTitle });
    setNewButton({ title: '', url: '', description: '', coverUrl: '', showTitle: true });
    setShowAddContent(null);
    refreshData();
    toast({ title: "Botão adicionado!" });
  };

  const handleAddSection = (moduleId: string) => {
    if (!newSection.title) {
      toast({ title: "Erro", description: "Preencha o título da seção", variant: "destructive" });
      return;
    }
    addSectionToModule(moduleId, { 
      title: newSection.title, 
      description: newSection.description,
      showTitle: newSection.showTitle,
      isBonus: newSection.isBonus 
    });
    setNewSection({ title: '', description: '', showTitle: true, isBonus: false });
    setShowAddContent(null);
    refreshData();
    toast({ title: "Seção adicionada!" });
  };

  // Section content handlers
  const handleAddVideoToSection = (moduleId: string, sectionId: string) => {
    if (!newSectionVideo.title || !newSectionVideo.youtubeUrl) {
      toast({ title: "Erro", description: "Preencha título e URL do YouTube", variant: "destructive" });
      return;
    }
    addVideoToSection(moduleId, sectionId, {
      title: newSectionVideo.title,
      description: newSectionVideo.description,
      youtubeUrl: newSectionVideo.youtubeUrl,
      thumbnailUrl: newSectionVideo.thumbnailUrl || getYoutubeThumbnail(newSectionVideo.youtubeUrl),
      showNumber: newSectionVideo.showNumber,
      showTitle: newSectionVideo.showTitle
    });
    setNewSectionVideo({ title: '', description: '', youtubeUrl: '', thumbnailUrl: '', showNumber: true, showTitle: true });
    setShowAddContent(null);
    refreshData();
    toast({ title: "Vídeo adicionado à seção!" });
  };

  const handleAddButtonToSection = (moduleId: string, sectionId: string) => {
    if (!newSectionButton.title || !newSectionButton.url) {
      toast({ title: "Erro", description: "Preencha título e URL", variant: "destructive" });
      return;
    }
    addButtonToSection(moduleId, sectionId, {
      title: newSectionButton.title,
      url: newSectionButton.url,
      description: newSectionButton.description,
      coverUrl: newSectionButton.coverUrl,
      showTitle: newSectionButton.showTitle
    });
    setNewSectionButton({ title: '', url: '', description: '', coverUrl: '', showTitle: true });
    setShowAddContent(null);
    refreshData();
    toast({ title: "Botão adicionado à seção!" });
  };

  const handleDeleteSectionContent = async (moduleId: string, sectionId: string, contentId: string) => {
    if (confirm('Excluir este conteúdo da seção?')) {
      deleteSectionContent(moduleId, sectionId, contentId);
      refreshData();
      toast({ title: "Conteúdo excluído!" });
    }
  };

  const handleUpdateContent = (moduleId: string, contentId: string, updates: Partial<ModuleContent>) => {
    updateContent(moduleId, contentId, updates);
    setEditingContent(null);
    refreshData();
    toast({ title: "Conteúdo atualizado!" });
  };

  const handleToggleContentTitle = (moduleId: string, content: ModuleContent) => {
    const showTitle = (content as any).showTitle ?? true;
    updateContent(moduleId, content.id, { showTitle: !showTitle } as any);
    refreshData();
  };

  const handleDeleteContent = async (moduleId: string, contentId: string) => {
    if (confirm('Excluir este conteúdo?')) {
      const module = adminData.modules.find(m => m.id === moduleId);
      const content = module?.contents.find(c => c.id === contentId);
      if (content && content.type === 'video') {
        await deleteStorageFile((content as ModuleVideo).thumbnailUrl);
      }
      deleteContent(moduleId, contentId);
      refreshData();
      toast({ title: "Conteúdo excluído!" });
    }
  };

  const handleToggleContentNumber = (moduleId: string, content: ModuleContent) => {
    if (content.type === 'video') {
      updateContent(moduleId, content.id, { showNumber: !(content as ModuleVideo).showNumber });
      refreshData();
    }
  };

  const startEditModule = (module: TutorialModule) => {
    setEditingModule(module.id);
    setEditModuleData({
      title: module.title,
      description: module.description,
      coverUrl: module.coverUrl,
      showNumber: module.showNumber,
      color: module.color || 'default',
      isBonus: module.isBonus || false
    });
  };

  const getVideoCount = (module: TutorialModule) => {
    return module.contents.filter(c => c.type === 'video').length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-display font-bold">MRO Ferramenta - Módulos</h2>
          {isLoadingCloud && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando da nuvem...
            </div>
          )}
        </div>
        <Button 
          onClick={handlePublishToCloud}
          disabled={isPublishing}
          className="bg-green-600 hover:bg-green-700"
        >
          {isPublishing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Publicando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Publicar para Usuários
            </>
          )}
        </Button>
      </div>

      {/* Download Link */}
      <div className="glass-card p-4">
        <Label className="mb-2 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Link de Download (Área de Membros)
        </Label>
        <div className="flex gap-3">
          <Input
            placeholder="https://..."
            value={downloadLink}
            onChange={(e) => onDownloadLinkChange(e.target.value)}
            className="bg-secondary/50"
          />
          <Button type="button" onClick={onSaveSettings} className="cursor-pointer">
            <Save className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Welcome Video */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-red-500" />
          Vídeo de Boas-Vindas
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={welcomeVideo.enabled}
                onCheckedChange={(checked) => setWelcomeVideo(prev => ({ ...prev, enabled: checked }))}
              />
              <Label>Ativar vídeo de boas-vindas</Label>
            </div>
            
            {welcomeVideo.enabled && (
              <>
                <div>
                  <Label>Título</Label>
                  <Input
                    placeholder="Ex: Bem-vindo ao MRO!"
                    value={welcomeVideo.title}
                    onChange={(e) => setWelcomeVideo(prev => ({ ...prev, title: e.target.value }))}
                    className="bg-secondary/50 mt-1"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <Switch
                    checked={welcomeVideo.showTitle}
                    onCheckedChange={(checked) => setWelcomeVideo(prev => ({ ...prev, showTitle: checked }))}
                  />
                  <Label>Exibir título</Label>
                </div>
                
                <div>
                  <Label>URL do YouTube *</Label>
                  <Input
                    placeholder="https://youtube.com/watch?v=..."
                    value={welcomeVideo.youtubeUrl}
                    onChange={(e) => setWelcomeVideo(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                    className="bg-secondary/50 mt-1"
                  />
                </div>
              </>
            )}
          </div>
          
          {welcomeVideo.enabled && (
            <div>
              <Label className="mb-2 block">Capa do Vídeo (opcional)</Label>
              <CoverUploader
                currentUrl={welcomeVideo.coverUrl}
                onUpload={(url) => setWelcomeVideo(prev => ({ ...prev, coverUrl: url }))}
                onRemove={() => setWelcomeVideo(prev => ({ ...prev, coverUrl: '' }))}
                folder="welcome-video"
                id="welcome_video"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Se não definir uma capa, usaremos a thumbnail do YouTube
              </p>
            </div>
          )}
        </div>
        
        <Button 
          type="button" 
          onClick={handleSaveWelcomeVideo} 
          className="mt-4 cursor-pointer"
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>

      {/* Add New Module */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          Novo Módulo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <Label>Título do Módulo *</Label>
              <Input
                placeholder="Ex: Módulo 1 - Introdução"
                value={newModule.title}
                onChange={(e) => setNewModule(prev => ({ ...prev, title: e.target.value }))}
                className="bg-secondary/50 mt-1"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descrição do módulo..."
                value={newModule.description}
                onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                className="bg-secondary/50 mt-1"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={newModule.showNumber}
                onCheckedChange={(checked) => setNewModule(prev => ({ ...prev, showNumber: checked }))}
              />
              <Label>Exibir número do módulo</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={newModule.isBonus}
                onCheckedChange={(checked) => setNewModule(prev => ({ ...prev, isBonus: checked }))}
              />
              <Label>🎁 Tag Bônus</Label>
            </div>
            <div>
              <Label>Cor do Módulo</Label>
              <select
                value={newModule.color}
                onChange={(e) => setNewModule(prev => ({ ...prev, color: e.target.value as ModuleColor }))}
                className="w-full mt-1 bg-secondary/50 border border-border rounded-md p-2 text-sm"
              >
                <option value="default">Padrão (Cinza)</option>
                <option value="green">Verde</option>
                <option value="blue">Azul</option>
                <option value="purple">Roxo</option>
                <option value="orange">Laranja</option>
                <option value="pink">Rosa</option>
                <option value="red">Vermelho</option>
                <option value="cyan">Ciano</option>
              </select>
            </div>
          </div>
          <div>
            <CoverUploader
              currentUrl={newModule.coverUrl}
              onUpload={(url) => setNewModule(prev => ({ ...prev, coverUrl: url }))}
              onRemove={() => setNewModule(prev => ({ ...prev, coverUrl: '' }))}
              folder="module-covers"
              id={`new_${Date.now()}`}
            />
          </div>
        </div>
        <Button 
          type="button" 
          onClick={handleAddModule} 
          disabled={!newModule.title.trim()} 
          className="mt-4 cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Criar Módulo
        </Button>
      </div>

      {/* Module List */}
      <div className="space-y-4">
        {adminData.modules.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum módulo criado ainda</p>
          </div>
        ) : (
          adminData.modules.map((module) => (
            <div key={module.id} className="glass-card overflow-hidden">
              {/* Module Header */}
              <div 
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
              >
                {/* Cover/Number - Aspect ratio 1080x1350 = 4:5 */}
                <div className="relative w-16 aspect-[4/5] rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                  {module.coverUrl ? (
                    <img 
                      src={module.coverUrl} 
                      alt={module.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-mro-cyan/20">
                      {module.showNumber && (
                        <span className="text-xl font-bold text-primary">{module.order}</span>
                      )}
                    </div>
                  )}
                  {module.coverUrl && module.showNumber && (
                    <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      {module.order}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{module.title}</h3>
                  {module.description && (
                    <p className="text-sm text-muted-foreground truncate">{module.description}</p>
                  )}
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    <span>{getVideoCount(module)} vídeos</span>
                    <span>{module.contents.filter(c => c.type === 'text').length} textos</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => startEditModule(module)}
                    className="cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDeleteModule(module.id)}
                    className="cursor-pointer text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {expandedModule === module.id ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Edit Module Form */}
              {editingModule === module.id && (
                <div className="p-4 border-t border-border bg-secondary/20">
                  <h4 className="font-medium mb-3">Editar Módulo</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <Label>Título</Label>
                        <Input
                          value={editModuleData.title || ''}
                          onChange={(e) => setEditModuleData(prev => ({ ...prev, title: e.target.value }))}
                          className="bg-secondary/50 mt-1"
                        />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          value={editModuleData.description || ''}
                          onChange={(e) => setEditModuleData(prev => ({ ...prev, description: e.target.value }))}
                          className="bg-secondary/50 mt-1"
                          rows={2}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={editModuleData.showNumber ?? true}
                          onCheckedChange={(checked) => setEditModuleData(prev => ({ ...prev, showNumber: checked }))}
                        />
                        <Label>Exibir número</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={editModuleData.isBonus ?? false}
                          onCheckedChange={(checked) => setEditModuleData(prev => ({ ...prev, isBonus: checked }))}
                        />
                        <Label>🎁 Tag Bônus</Label>
                      </div>
                      <div>
                        <Label>Cor do Módulo</Label>
                        <select
                          value={editModuleData.color || 'default'}
                          onChange={(e) => setEditModuleData(prev => ({ ...prev, color: e.target.value as ModuleColor }))}
                          className="w-full mt-1 bg-secondary/50 border border-border rounded-md p-2 text-sm"
                        >
                          <option value="default">Padrão (Cinza)</option>
                          <option value="green">Verde</option>
                          <option value="blue">Azul</option>
                          <option value="purple">Roxo</option>
                          <option value="orange">Laranja</option>
                          <option value="pink">Rosa</option>
                          <option value="red">Vermelho</option>
                          <option value="cyan">Ciano</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <CoverUploader
                        currentUrl={editModuleData.coverUrl || ''}
                        onUpload={(url) => setEditModuleData(prev => ({ ...prev, coverUrl: url }))}
                        onRemove={() => setEditModuleData(prev => ({ ...prev, coverUrl: '' }))}
                        folder="module-covers"
                        id={module.id}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button type="button" onClick={() => handleUpdateModule(module.id)} className="cursor-pointer">
                      <Check className="w-4 h-4 mr-1" />
                      Salvar
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setEditingModule(null)} className="cursor-pointer">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Expanded Content */}
              {expandedModule === module.id && (
                <div className="p-4 border-t border-border">
                  {/* Add Content Buttons */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowAddContent({ moduleId: module.id, type: 'video' })}
                      className="cursor-pointer"
                    >
                      <Video className="w-4 h-4 mr-1" />
                      Adicionar Vídeo
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowAddContent({ moduleId: module.id, type: 'text' })}
                      className="cursor-pointer"
                    >
                      <Type className="w-4 h-4 mr-1" />
                      Adicionar Texto
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowAddContent({ moduleId: module.id, type: 'button' })}
                      className="cursor-pointer"
                    >
                      <Link2 className="w-4 h-4 mr-1" />
                      Adicionar Botão/Link
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowAddContent({ moduleId: module.id, type: 'section' })}
                      className="cursor-pointer"
                    >
                      <LayoutList className="w-4 h-4 mr-1" />
                      Adicionar Seção
                    </Button>
                  </div>

                  {/* Add Video Form */}
                  {showAddContent?.moduleId === module.id && showAddContent.type === 'video' && (
                    <div className="p-4 rounded-lg bg-secondary/30 mb-4">
                      <h4 className="font-medium mb-3">Novo Vídeo</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <Input
                            placeholder="Título do vídeo"
                            value={newVideo.title}
                            onChange={(e) => setNewVideo(prev => ({ ...prev, title: e.target.value }))}
                            className="bg-secondary/50"
                          />
                          <Input
                            placeholder="URL do YouTube"
                            value={newVideo.youtubeUrl}
                            onChange={(e) => setNewVideo(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                            className="bg-secondary/50"
                          />
                          <Textarea
                            placeholder="Descrição (opcional)"
                            value={newVideo.description}
                            onChange={(e) => setNewVideo(prev => ({ ...prev, description: e.target.value }))}
                            className="bg-secondary/50"
                            rows={2}
                          />
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={newVideo.showNumber}
                              onCheckedChange={(checked) => setNewVideo(prev => ({ ...prev, showNumber: checked }))}
                            />
                            <Label className="text-sm">Exibir número na capa</Label>
                          </div>
                        </div>
                        <div>
                          <CoverUploader
                            currentUrl={newVideo.thumbnailUrl}
                            onUpload={(url) => setNewVideo(prev => ({ ...prev, thumbnailUrl: url }))}
                            onRemove={() => setNewVideo(prev => ({ ...prev, thumbnailUrl: '' }))}
                            folder="video-covers"
                            id={`video_new_${Date.now()}`}
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Se não enviar capa, será usada a thumbnail do YouTube
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button type="button" onClick={() => handleAddVideo(module.id)} className="cursor-pointer">
                          <Check className="w-4 h-4 mr-1" />
                          Adicionar
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setShowAddContent(null)} className="cursor-pointer">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Add Text Form */}
                  {showAddContent?.moduleId === module.id && showAddContent.type === 'text' && (
                    <div className="p-4 rounded-lg bg-secondary/30 mb-4 space-y-3">
                      <h4 className="font-medium">Novo Texto</h4>
                      <Input
                        placeholder="Título do texto"
                        value={newText.title}
                        onChange={(e) => setNewText(prev => ({ ...prev, title: e.target.value }))}
                        className="bg-secondary/50"
                      />
                      <Textarea
                        placeholder="Conteúdo do texto (suporta quebras de linha)"
                        value={newText.content}
                        onChange={(e) => setNewText(prev => ({ ...prev, content: e.target.value }))}
                        className="bg-secondary/50"
                        rows={5}
                      />
                      <div className="flex gap-2">
                        <Button type="button" onClick={() => handleAddText(module.id)} className="cursor-pointer">
                          <Check className="w-4 h-4 mr-1" />
                          Adicionar
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setShowAddContent(null)} className="cursor-pointer">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Add Button Form */}
                  {showAddContent?.moduleId === module.id && showAddContent.type === 'button' && (
                    <div className="p-4 rounded-lg bg-secondary/30 mb-4">
                      <h4 className="font-medium mb-3">Novo Botão/Link</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <Input
                            placeholder="Título do botão"
                            value={newButton.title}
                            onChange={(e) => setNewButton(prev => ({ ...prev, title: e.target.value }))}
                            className="bg-secondary/50"
                          />
                          <Input
                            placeholder="URL do link (ex: https://drive.google.com/...)"
                            value={newButton.url}
                            onChange={(e) => setNewButton(prev => ({ ...prev, url: e.target.value }))}
                            className="bg-secondary/50"
                          />
                          <Textarea
                            placeholder="Descrição (opcional)"
                            value={newButton.description}
                            onChange={(e) => setNewButton(prev => ({ ...prev, description: e.target.value }))}
                            className="bg-secondary/50"
                            rows={2}
                          />
                        </div>
                        <div>
                          <CoverUploader
                            currentUrl={newButton.coverUrl}
                            onUpload={(url) => setNewButton(prev => ({ ...prev, coverUrl: url }))}
                            onRemove={() => setNewButton(prev => ({ ...prev, coverUrl: '' }))}
                            folder="button-covers"
                            id={`button_new_${Date.now()}`}
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Capa opcional para o botão
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button type="button" onClick={() => handleAddButton(module.id)} className="cursor-pointer">
                          <Check className="w-4 h-4 mr-1" />
                          Adicionar
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setShowAddContent(null)} className="cursor-pointer">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Add Section Form */}
                  {showAddContent?.moduleId === module.id && showAddContent.type === 'section' && (
                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-4 space-y-3">
                      <h4 className="font-medium text-amber-400">Nova Seção (Sub-módulo)</h4>
                      <p className="text-sm text-muted-foreground">
                        Seções aparecem como um card/box abaixo dos botões, com título e conteúdo próprio
                      </p>
                      <Input
                        placeholder="Título da seção (ex: Preste serviço com a MRO)"
                        value={newSection.title}
                        onChange={(e) => setNewSection(prev => ({ ...prev, title: e.target.value }))}
                        className="bg-secondary/50"
                      />
                      <Textarea
                        placeholder="Descrição da seção (ex: Faturando mais de 5K com a MRO !)"
                        value={newSection.description}
                        onChange={(e) => setNewSection(prev => ({ ...prev, description: e.target.value }))}
                        className="bg-secondary/50"
                        rows={2}
                      />
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={newSection.showTitle}
                            onCheckedChange={(checked) => setNewSection(prev => ({ ...prev, showTitle: checked }))}
                          />
                          <Label className="text-sm">Exibir título</Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={newSection.isBonus}
                            onCheckedChange={(checked) => setNewSection(prev => ({ ...prev, isBonus: checked }))}
                          />
                          <Label className="text-sm">🎁 Tag Bônus</Label>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" onClick={() => handleAddSection(module.id)} className="cursor-pointer">
                          <Check className="w-4 h-4 mr-1" />
                          Adicionar
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setShowAddContent(null)} className="cursor-pointer">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Content List - Aspect ratio 1080x1350 = 4:5 */}
                  {module.contents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum conteúdo neste módulo
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {module.contents.sort((a, b) => a.order - b.order).map((content, idx) => (
                        <div key={content.id} className="relative group">
                          {content.type === 'video' ? (
                            <div className="aspect-[4/5] rounded-lg overflow-hidden bg-secondary relative">
                              <img 
                                src={(content as ModuleVideo).thumbnailUrl || getYoutubeThumbnail((content as ModuleVideo).youtubeUrl)}
                                alt={content.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://via.placeholder.com/1080x1350?text=Video';
                                }}
                              />
                              {(content as ModuleVideo).showNumber && (
                                <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg">
                                  {idx + 1}
                                </div>
                              )}
                              <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-10 h-10 text-primary" />
                              </div>
                            </div>
                          ) : content.type === 'button' ? (
                            <div className="aspect-[4/5] rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-mro-cyan/20 relative">
                              {(content as ModuleButton).coverUrl ? (
                                <img 
                                  src={(content as ModuleButton).coverUrl}
                                  alt={content.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Link2 className="w-10 h-10 text-primary" />
                                </div>
                              )}
                              <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          ) : content.type === 'section' ? (
                            <div 
                              onClick={() => setExpandedSection(expandedSection === content.id ? null : content.id)}
                              className="aspect-[4/5] rounded-lg overflow-hidden bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex flex-col items-center justify-center relative border-2 border-dashed border-amber-500/50 cursor-pointer hover:border-amber-400 transition-colors"
                            >
                              <LayoutList className="w-10 h-10 text-amber-500" />
                              <span className="text-xs text-amber-500 font-medium mt-2">SEÇÃO</span>
                              <span className="text-[10px] text-amber-400 mt-1">
                                {(content as ModuleSection).contents?.length || 0} itens
                              </span>
                            </div>
                          ) : (
                            <div className="aspect-[4/5] rounded-lg overflow-hidden bg-gradient-to-br from-secondary to-muted flex items-center justify-center relative">
                              <Type className="w-10 h-10 text-muted-foreground" />
                              <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-muted-foreground/30 text-foreground flex items-center justify-center text-sm font-bold">
                                {idx + 1}
                              </div>
                            </div>
                          )}
                          {((content as any).showTitle !== false) && (
                            <p className="text-sm font-medium mt-2 truncate">{content.title}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {content.type === 'video' ? 'Vídeo' : content.type === 'button' ? 'Link' : content.type === 'section' ? 'Seção' : 'Texto'}
                          </p>
                          
                          {/* Action buttons overlay */}
                          <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {/* Edit button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingContent({ moduleId: module.id, content });
                              }}
                              className="w-9 h-9 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-primary/90"
                              title="Editar conteúdo"
                            >
                              <Edit2 className="w-4 h-4 text-primary-foreground" />
                            </button>
                            
                            {/* Toggle title button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleContentTitle(module.id, content);
                              }}
                              className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer shadow-lg ${
                                (content as any).showTitle !== false ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-secondary hover:bg-secondary/80'
                              }`}
                              title={(content as any).showTitle !== false ? 'Ocultar título' : 'Mostrar título'}
                            >
                              <Type className="w-4 h-4" />
                            </button>
                            
                            {/* Toggle number for videos */}
                            {content.type === 'video' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleContentNumber(module.id, content);
                                }}
                                className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer shadow-lg ${
                                  (content as ModuleVideo).showNumber ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-secondary hover:bg-secondary/80'
                                }`}
                                title={(content as ModuleVideo).showNumber ? 'Ocultar número' : 'Mostrar número'}
                              >
                                <span className="text-xs font-bold">#</span>
                              </button>
                            )}
                            
                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteContent(module.id, content.id);
                              }}
                              className="w-9 h-9 bg-destructive rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-destructive/90"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4 text-destructive-foreground" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expanded Section Contents */}
                  {module.contents.filter(c => c.type === 'section').map(sectionContent => {
                    const section = sectionContent as ModuleSection;
                    if (expandedSection !== section.id) return null;
                    
                    return (
                      <div key={section.id} className="mt-6 p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-amber-400 flex items-center gap-2">
                            <LayoutList className="w-5 h-5" />
                            Conteúdos da Seção: {section.title}
                          </h4>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setExpandedSection(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Add content to section buttons */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowAddContent({ moduleId: module.id, type: 'video', sectionId: section.id })}
                            className="cursor-pointer border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                          >
                            <Video className="w-4 h-4 mr-1" />
                            Adicionar Vídeo
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowAddContent({ moduleId: module.id, type: 'button', sectionId: section.id })}
                            className="cursor-pointer border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                          >
                            <Link2 className="w-4 h-4 mr-1" />
                            Adicionar Botão
                          </Button>
                        </div>

                        {/* Add Video to Section Form */}
                        {showAddContent?.moduleId === module.id && showAddContent.sectionId === section.id && showAddContent.type === 'video' && (
                          <div className="p-4 rounded-lg bg-secondary/30 mb-4">
                            <h5 className="font-medium mb-3">Novo Vídeo na Seção</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <Input
                                  placeholder="Título do vídeo"
                                  value={newSectionVideo.title}
                                  onChange={(e) => setNewSectionVideo(prev => ({ ...prev, title: e.target.value }))}
                                  className="bg-secondary/50"
                                />
                                <Input
                                  placeholder="URL do YouTube"
                                  value={newSectionVideo.youtubeUrl}
                                  onChange={(e) => setNewSectionVideo(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                                  className="bg-secondary/50"
                                />
                                <Textarea
                                  placeholder="Descrição (opcional)"
                                  value={newSectionVideo.description}
                                  onChange={(e) => setNewSectionVideo(prev => ({ ...prev, description: e.target.value }))}
                                  className="bg-secondary/50"
                                  rows={2}
                                />
                              </div>
                              <div>
                                <CoverUploader
                                  currentUrl={newSectionVideo.thumbnailUrl}
                                  onUpload={(url) => setNewSectionVideo(prev => ({ ...prev, thumbnailUrl: url }))}
                                  onRemove={() => setNewSectionVideo(prev => ({ ...prev, thumbnailUrl: '' }))}
                                  folder="section-video-covers"
                                  id={`section_video_new_${Date.now()}`}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button type="button" onClick={() => handleAddVideoToSection(module.id, section.id)} className="cursor-pointer">
                                <Check className="w-4 h-4 mr-1" />
                                Adicionar
                              </Button>
                              <Button type="button" variant="ghost" onClick={() => setShowAddContent(null)} className="cursor-pointer">
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Add Button to Section Form */}
                        {showAddContent?.moduleId === module.id && showAddContent.sectionId === section.id && showAddContent.type === 'button' && (
                          <div className="p-4 rounded-lg bg-secondary/30 mb-4">
                            <h5 className="font-medium mb-3">Novo Botão na Seção</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <Input
                                  placeholder="Título do botão"
                                  value={newSectionButton.title}
                                  onChange={(e) => setNewSectionButton(prev => ({ ...prev, title: e.target.value }))}
                                  className="bg-secondary/50"
                                />
                                <Input
                                  placeholder="URL do link"
                                  value={newSectionButton.url}
                                  onChange={(e) => setNewSectionButton(prev => ({ ...prev, url: e.target.value }))}
                                  className="bg-secondary/50"
                                />
                                <Textarea
                                  placeholder="Descrição (opcional)"
                                  value={newSectionButton.description}
                                  onChange={(e) => setNewSectionButton(prev => ({ ...prev, description: e.target.value }))}
                                  className="bg-secondary/50"
                                  rows={2}
                                />
                              </div>
                              <div>
                                <CoverUploader
                                  currentUrl={newSectionButton.coverUrl}
                                  onUpload={(url) => setNewSectionButton(prev => ({ ...prev, coverUrl: url }))}
                                  onRemove={() => setNewSectionButton(prev => ({ ...prev, coverUrl: '' }))}
                                  folder="section-button-covers"
                                  id={`section_button_new_${Date.now()}`}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button type="button" onClick={() => handleAddButtonToSection(module.id, section.id)} className="cursor-pointer">
                                <Check className="w-4 h-4 mr-1" />
                                Adicionar
                              </Button>
                              <Button type="button" variant="ghost" onClick={() => setShowAddContent(null)} className="cursor-pointer">
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Section contents list */}
                        {(!section.contents || section.contents.length === 0) ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Nenhum conteúdo nesta seção
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {section.contents.sort((a, b) => a.order - b.order).map((sContent, sIdx) => (
                              <div key={sContent.id} className="relative group">
                                {sContent.type === 'video' ? (
                                  <div className="aspect-[4/5] rounded-lg overflow-hidden bg-secondary relative">
                                    <img 
                                      src={(sContent as ModuleVideo).thumbnailUrl || getYoutubeThumbnail((sContent as ModuleVideo).youtubeUrl)}
                                      alt={sContent.title}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                                      {sIdx + 1}
                                    </div>
                                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Play className="w-8 h-8 text-primary" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="aspect-[4/5] rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-mro-cyan/20 relative flex items-center justify-center">
                                    {(sContent as ModuleButton).coverUrl ? (
                                      <img 
                                        src={(sContent as ModuleButton).coverUrl}
                                        alt={sContent.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <Link2 className="w-8 h-8 text-primary" />
                                    )}
                                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                      <ExternalLink className="w-3 h-3" />
                                    </div>
                                  </div>
                                )}
                                <p className="text-xs font-medium mt-1 truncate">{sContent.title}</p>
                                
                                {/* Delete button */}
                                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSectionContent(module.id, section.id, sContent.id)}
                                    className="w-8 h-8 bg-destructive rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-destructive/90"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive-foreground" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Edit Content Modal */}
      {editingContent && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Editar {editingContent.content.type === 'video' ? 'Vídeo' : editingContent.content.type === 'button' ? 'Botão/Link' : 'Texto'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={editingContent.content.title}
                  onChange={(e) => setEditingContent({
                    ...editingContent,
                    content: { ...editingContent.content, title: e.target.value }
                  })}
                  className="bg-secondary/50 mt-1"
                />
              </div>

              {editingContent.content.type === 'video' && (
                <>
                  <div>
                    <Label>URL do YouTube</Label>
                    <Input
                      value={(editingContent.content as ModuleVideo).youtubeUrl}
                      onChange={(e) => setEditingContent({
                        ...editingContent,
                        content: { ...editingContent.content, youtubeUrl: e.target.value } as ModuleVideo
                      })}
                      className="bg-secondary/50 mt-1"
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={(editingContent.content as ModuleVideo).description}
                      onChange={(e) => setEditingContent({
                        ...editingContent,
                        content: { ...editingContent.content, description: e.target.value } as ModuleVideo
                      })}
                      className="bg-secondary/50 mt-1"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Capa personalizada</Label>
                    <CoverUploader
                      currentUrl={(editingContent.content as ModuleVideo).thumbnailUrl}
                      onUpload={(url) => setEditingContent({
                        ...editingContent,
                        content: { ...editingContent.content, thumbnailUrl: url } as ModuleVideo
                      })}
                      onRemove={() => setEditingContent({
                        ...editingContent,
                        content: { ...editingContent.content, thumbnailUrl: '' } as ModuleVideo
                      })}
                      folder="video-covers"
                      id={editingContent.content.id}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={(editingContent.content as ModuleVideo).showNumber}
                      onCheckedChange={(checked) => setEditingContent({
                        ...editingContent,
                        content: { ...editingContent.content, showNumber: checked } as ModuleVideo
                      })}
                    />
                    <Label>Exibir número na capa</Label>
                  </div>
                </>
              )}

              {editingContent.content.type === 'text' && (
                <div>
                  <Label>Conteúdo</Label>
                  <Textarea
                    value={(editingContent.content as ModuleText).content}
                    onChange={(e) => setEditingContent({
                      ...editingContent,
                      content: { ...editingContent.content, content: e.target.value } as ModuleText
                    })}
                    className="bg-secondary/50 mt-1"
                    rows={6}
                  />
                </div>
              )}

              {editingContent.content.type === 'button' && (
                <>
                  <div>
                    <Label>URL do Link</Label>
                    <Input
                      value={(editingContent.content as ModuleButton).url}
                      onChange={(e) => setEditingContent({
                        ...editingContent,
                        content: { ...editingContent.content, url: e.target.value } as ModuleButton
                      })}
                      className="bg-secondary/50 mt-1"
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={(editingContent.content as ModuleButton).description}
                      onChange={(e) => setEditingContent({
                        ...editingContent,
                        content: { ...editingContent.content, description: e.target.value } as ModuleButton
                      })}
                      className="bg-secondary/50 mt-1"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Capa</Label>
                    <CoverUploader
                      currentUrl={(editingContent.content as ModuleButton).coverUrl}
                      onUpload={(url) => setEditingContent({
                        ...editingContent,
                        content: { ...editingContent.content, coverUrl: url } as ModuleButton
                      })}
                      onRemove={() => setEditingContent({
                        ...editingContent,
                        content: { ...editingContent.content, coverUrl: '' } as ModuleButton
                      })}
                      folder="button-covers"
                      id={editingContent.content.id}
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-3">
                <Switch
                  checked={(editingContent.content as any).showTitle !== false}
                  onCheckedChange={(checked) => setEditingContent({
                    ...editingContent,
                    content: { ...editingContent.content, showTitle: checked } as any
                  })}
                />
                <Label>Exibir título abaixo da capa</Label>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button 
                type="button" 
                onClick={() => handleUpdateContent(editingContent.moduleId, editingContent.content.id, editingContent.content)}
                className="cursor-pointer"
              >
                <Check className="w-4 h-4 mr-1" />
                Salvar
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setEditingContent(null)}
                className="cursor-pointer"
              >
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleManager;
