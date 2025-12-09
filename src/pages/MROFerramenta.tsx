import { useState } from 'react';
import { getAdminData, TutorialModule, ModuleContent, ModuleVideo, ModuleText, getYoutubeThumbnail } from '@/lib/adminConfig';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Play, Download, X, ChevronLeft, Type, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MROFerramenta = () => {
  const navigate = useNavigate();
  const adminData = getAdminData();
  const [selectedModule, setSelectedModule] = useState<TutorialModule | null>(null);
  const [selectedContent, setSelectedContent] = useState<ModuleContent | null>(null);

  const getYoutubeEmbedUrl = (url: string): string => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    }
    return url;
  };

  const handleContentClick = (content: ModuleContent) => {
    setSelectedContent(content);
  };

  const handleModuleClick = (module: TutorialModule) => {
    setSelectedModule(module);
  };

  const handleBack = () => {
    if (selectedContent) {
      setSelectedContent(null);
    } else if (selectedModule) {
      setSelectedModule(null);
    } else {
      navigate('/');
    }
  };

  // Get video contents with numbering
  const getVideoIndex = (module: TutorialModule, contentId: string): number => {
    const videos = module.contents.filter(c => c.type === 'video');
    return videos.findIndex(v => v.id === contentId) + 1;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={handleBack} 
                className="cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {selectedContent ? 'Voltar' : selectedModule ? 'Módulos' : 'Voltar'}
              </Button>
              <Logo size="sm" />
              <span className="text-sm font-medium text-primary">MRO Ferramenta</span>
            </div>

            {adminData.settings.downloadLink && (
              <Button 
                type="button"
                variant="gradient" 
                size="sm"
                onClick={() => window.open(adminData.settings.downloadLink, '_blank')}
                className="cursor-pointer"
              >
                <Download className="w-4 h-4 mr-2" />
                Download MRO
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Module List View */}
          {!selectedModule && (
            <>
              <h1 className="text-3xl font-display font-bold mb-2">Módulos</h1>
              <p className="text-muted-foreground mb-8">Aprenda a usar a ferramenta MRO Inteligente</p>

              {adminData.modules.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Play className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum módulo disponível ainda</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {adminData.modules.sort((a, b) => a.order - b.order).map((module) => (
                    <div 
                      key={module.id}
                      className="group cursor-pointer"
                      onClick={() => handleModuleClick(module)}
                    >
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary border-2 border-transparent group-hover:border-primary transition-all duration-300 shadow-lg group-hover:shadow-xl group-hover:shadow-primary/20">
                        {module.coverUrl ? (
                          <img 
                            src={module.coverUrl}
                            alt={module.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-mro-cyan/30 flex items-center justify-center">
                            {module.showNumber && (
                              <span className="text-5xl font-display font-bold text-primary/50">{module.order}</span>
                            )}
                          </div>
                        )}
                        
                        {/* Number badge */}
                        {module.showNumber && module.coverUrl && (
                          <div className="absolute top-3 left-3 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shadow-lg">
                            {module.order}
                          </div>
                        )}

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                          <div className="flex items-center gap-2 text-primary font-medium">
                            <ChevronRight className="w-5 h-5" />
                            Ver conteúdo
                          </div>
                        </div>

                        {/* Content count badge */}
                        <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full bg-background/80 text-xs font-medium">
                          {module.contents.length} itens
                        </div>
                      </div>
                      <h3 className="font-semibold mt-3 group-hover:text-primary transition-colors">{module.title}</h3>
                      {module.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{module.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Module Content View */}
          {selectedModule && !selectedContent && (
            <>
              <div className="flex items-center gap-4 mb-6">
                {selectedModule.showNumber && (
                  <span className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                    {selectedModule.order}
                  </span>
                )}
                <div>
                  <h1 className="text-3xl font-display font-bold">{selectedModule.title}</h1>
                  {selectedModule.description && (
                    <p className="text-muted-foreground mt-1">{selectedModule.description}</p>
                  )}
                </div>
              </div>

              {selectedModule.contents.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Play className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum conteúdo neste módulo</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {selectedModule.contents.sort((a, b) => a.order - b.order).map((content, idx) => (
                    <div 
                      key={content.id}
                      className="group cursor-pointer"
                      onClick={() => handleContentClick(content)}
                    >
                      {content.type === 'video' ? (
                        <>
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-secondary border-2 border-transparent group-hover:border-primary transition-all duration-300">
                            <img 
                              src={(content as ModuleVideo).thumbnailUrl || getYoutubeThumbnail((content as ModuleVideo).youtubeUrl)}
                              alt={content.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/320x180?text=Video';
                              }}
                            />
                            
                            {/* Number badge */}
                            {(content as ModuleVideo).showNumber && (
                              <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg">
                                {getVideoIndex(selectedModule, content.id)}
                              </div>
                            )}

                            {/* Play overlay */}
                            <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
                                <Play className="w-6 h-6 text-primary-foreground ml-1" />
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-secondary to-muted flex items-center justify-center border-2 border-transparent group-hover:border-primary transition-all duration-300">
                          <Type className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                          <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-muted-foreground/30 text-foreground flex items-center justify-center text-sm font-bold">
                            {idx + 1}
                          </div>
                        </div>
                      )}
                      <h3 className="font-medium mt-3 group-hover:text-primary transition-colors">{content.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {content.type === 'video' ? 'Vídeo' : 'Texto'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Content Lightbox */}
      {selectedContent && (
        <div 
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedContent(null)}
        >
          <div 
            className="w-full max-w-5xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">{selectedContent.title}</h3>
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedContent(null)}
                className="cursor-pointer"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {selectedContent.type === 'video' ? (
              <>
                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                  <iframe
                    src={getYoutubeEmbedUrl((selectedContent as ModuleVideo).youtubeUrl)}
                    title={selectedContent.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                {(selectedContent as ModuleVideo).description && (
                  <p className="text-muted-foreground mt-4">{(selectedContent as ModuleVideo).description}</p>
                )}
              </>
            ) : (
              <div className="glass-card p-6 rounded-lg">
                <div className="prose prose-invert max-w-none">
                  {(selectedContent as ModuleText).content.split('\n').map((paragraph, idx) => (
                    <p key={idx} className="mb-4 last:mb-0 text-foreground">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MROFerramenta;
