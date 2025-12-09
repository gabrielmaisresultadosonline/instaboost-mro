import { useState } from 'react';
import { 
  getAdminData, saveAdminData, addModule, updateModule, deleteModule,
  addVideoToModule, addTextToModule, deleteContent, updateContent,
  TutorialModule, ModuleContent, ModuleVideo, ModuleText, getYoutubeThumbnail
} from '@/lib/adminConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Trash2, Save, Check, X, Play, Video, Type, 
  ChevronDown, ChevronUp, GripVertical, Image as ImageIcon,
  Edit2, Eye
} from 'lucide-react';

interface ModuleManagerProps {
  downloadLink: string;
  onDownloadLinkChange: (link: string) => void;
  onSaveSettings: () => void;
}

const ModuleManager = ({ downloadLink, onDownloadLinkChange, onSaveSettings }: ModuleManagerProps) => {
  const { toast } = useToast();
  const [adminData, setAdminData] = useState(getAdminData());
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [showAddContent, setShowAddContent] = useState<{ moduleId: string; type: 'video' | 'text' } | null>(null);
  
  // New module form
  const [newModule, setNewModule] = useState({
    title: '',
    description: '',
    coverUrl: '',
    showNumber: true
  });

  // Edit module form
  const [editModuleData, setEditModuleData] = useState<Partial<TutorialModule>>({});

  // New content forms
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    thumbnailUrl: '',
    showNumber: true
  });

  const [newText, setNewText] = useState({
    title: '',
    content: ''
  });

  const refreshData = () => {
    setAdminData(getAdminData());
  };

  // Module handlers
  const handleAddModule = () => {
    if (!newModule.title.trim()) {
      toast({ title: "Erro", description: "Preencha o título do módulo", variant: "destructive" });
      return;
    }
    addModule(newModule.title, newModule.description, newModule.coverUrl, newModule.showNumber);
    setNewModule({ title: '', description: '', coverUrl: '', showNumber: true });
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

  const handleDeleteModule = (moduleId: string) => {
    if (confirm('Tem certeza que deseja excluir este módulo e todo seu conteúdo?')) {
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
      showNumber: newVideo.showNumber
    });
    setNewVideo({ title: '', description: '', youtubeUrl: '', thumbnailUrl: '', showNumber: true });
    setShowAddContent(null);
    refreshData();
    toast({ title: "Vídeo adicionado!" });
  };

  const handleAddText = (moduleId: string) => {
    if (!newText.title || !newText.content) {
      toast({ title: "Erro", description: "Preencha título e conteúdo", variant: "destructive" });
      return;
    }
    addTextToModule(moduleId, newText);
    setNewText({ title: '', content: '' });
    setShowAddContent(null);
    refreshData();
    toast({ title: "Texto adicionado!" });
  };

  const handleDeleteContent = (moduleId: string, contentId: string) => {
    if (confirm('Excluir este conteúdo?')) {
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
      showNumber: module.showNumber
    });
  };

  const getVideoCount = (module: TutorialModule) => {
    return module.contents.filter(c => c.type === 'video').length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">MRO Ferramenta - Módulos</h2>
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

      {/* Add New Module */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          Novo Módulo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
          <div className="space-y-3">
            <div>
              <Label>URL da Capa (opcional)</Label>
              <Input
                placeholder="https://..."
                value={newModule.coverUrl}
                onChange={(e) => setNewModule(prev => ({ ...prev, coverUrl: e.target.value }))}
                className="bg-secondary/50 mt-1"
              />
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Switch
                checked={newModule.showNumber}
                onCheckedChange={(checked) => setNewModule(prev => ({ ...prev, showNumber: checked }))}
              />
              <Label>Exibir número do módulo</Label>
            </div>
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
                {/* Cover/Number */}
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
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
                        <span className="text-2xl font-bold text-primary">{module.order}</span>
                      )}
                    </div>
                  )}
                  {module.coverUrl && module.showNumber && (
                    <div className="absolute top-1 left-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label>URL da Capa</Label>
                        <Input
                          value={editModuleData.coverUrl || ''}
                          onChange={(e) => setEditModuleData(prev => ({ ...prev, coverUrl: e.target.value }))}
                          className="bg-secondary/50 mt-1"
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-4">
                        <Switch
                          checked={editModuleData.showNumber ?? true}
                          onCheckedChange={(checked) => setEditModuleData(prev => ({ ...prev, showNumber: checked }))}
                        />
                        <Label>Exibir número</Label>
                      </div>
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
                  <div className="flex gap-2 mb-4">
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
                  </div>

                  {/* Add Video Form */}
                  {showAddContent?.moduleId === module.id && showAddContent.type === 'video' && (
                    <div className="p-4 rounded-lg bg-secondary/30 mb-4 space-y-3">
                      <h4 className="font-medium">Novo Vídeo</h4>
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
                      <Input
                        placeholder="URL da capa personalizada (opcional)"
                        value={newVideo.thumbnailUrl}
                        onChange={(e) => setNewVideo(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
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
                      <div className="flex gap-2">
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

                  {/* Content List */}
                  {module.contents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum conteúdo neste módulo
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {module.contents.sort((a, b) => a.order - b.order).map((content, idx) => (
                        <div key={content.id} className="relative group">
                          {content.type === 'video' ? (
                            <>
                              <div className="aspect-video rounded-lg overflow-hidden bg-secondary relative">
                                <img 
                                  src={(content as ModuleVideo).thumbnailUrl || getYoutubeThumbnail((content as ModuleVideo).youtubeUrl)}
                                  alt={content.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://via.placeholder.com/320x180?text=Video';
                                  }}
                                />
                                {(content as ModuleVideo).showNumber && (
                                  <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                                    {idx + 1}
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Play className="w-8 h-8 text-primary" />
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-secondary to-muted flex items-center justify-center relative">
                              <Type className="w-8 h-8 text-muted-foreground" />
                              <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-muted-foreground/20 text-foreground flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                              </div>
                            </div>
                          )}
                          <p className="text-sm font-medium mt-2 truncate">{content.title}</p>
                          <p className="text-xs text-muted-foreground">{content.type === 'video' ? 'Vídeo' : 'Texto'}</p>
                          
                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteContent(module.id, content.id)}
                            className="absolute top-2 right-2 w-6 h-6 bg-destructive rounded-full items-center justify-center hidden group-hover:flex cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 text-destructive-foreground" />
                          </button>

                          {/* Toggle number for videos */}
                          {content.type === 'video' && (
                            <button
                              type="button"
                              onClick={() => handleToggleContentNumber(module.id, content)}
                              className="absolute bottom-12 right-2 w-6 h-6 bg-secondary rounded-full items-center justify-center hidden group-hover:flex cursor-pointer"
                              title={(content as ModuleVideo).showNumber ? 'Ocultar número' : 'Mostrar número'}
                            >
                              <span className="text-xs font-bold">#</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ModuleManager;
