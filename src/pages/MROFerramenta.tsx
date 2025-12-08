import { useState } from 'react';
import { getAdminData, TutorialStep, TutorialVideo } from '@/lib/adminConfig';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Play, Download, X, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MROFerramenta = () => {
  const navigate = useNavigate();
  const adminData = getAdminData();
  const [selectedVideo, setSelectedVideo] = useState<TutorialVideo | null>(null);

  const getYoutubeEmbedUrl = (url: string): string => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    }
    return url;
  };

  const getYoutubeThumbnail = (url: string): string => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/')} className="cursor-pointer">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
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
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-display font-bold mb-2">Tutoriais MRO</h1>
          <p className="text-muted-foreground mb-8">Aprenda a usar a ferramenta MRO Inteligente passo a passo</p>

          {adminData.tutorials.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Play className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum tutorial disponível ainda</p>
            </div>
          ) : (
            <div className="space-y-12">
              {adminData.tutorials.map((step) => (
                <section key={step.id}>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {step.order}
                    </span>
                    <h2 className="text-xl font-display font-semibold">{step.title}</h2>
                  </div>

                  {step.videos.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Nenhum vídeo nesta etapa</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {step.videos.map((video) => (
                        <div 
                          key={video.id}
                          className="group cursor-pointer"
                          onClick={() => setSelectedVideo(video)}
                        >
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-secondary border-2 border-transparent group-hover:border-primary transition-colors">
                            <img 
                              src={video.thumbnailUrl || getYoutubeThumbnail(video.youtubeUrl)}
                              alt={video.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/320x180?text=Video';
                              }}
                            />
                            <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                                <Play className="w-8 h-8 text-primary-foreground ml-1" />
                              </div>
                            </div>
                          </div>
                          <h3 className="font-medium mt-3 group-hover:text-primary transition-colors">{video.title}</h3>
                          {video.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{video.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Video Lightbox */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div 
            className="w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">{selectedVideo.title}</h3>
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedVideo(null)}
                className="cursor-pointer"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={getYoutubeEmbedUrl(selectedVideo.youtubeUrl)}
                title={selectedVideo.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {selectedVideo.description && (
              <p className="text-muted-foreground mt-4">{selectedVideo.description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MROFerramenta;