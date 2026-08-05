import { useEffect, useRef, useState } from 'react';
import {
  TutorialModule,
  ModuleContent,
  ModuleVideo,
  ModuleText,
  ModuleButton,
  ModuleSection,
  ModuleColor,
  getYoutubeThumbnail,
} from '@/lib/adminConfig';
import { Button } from '@/components/ui/button';
import { Play, Type, ChevronLeft, ChevronRight, ExternalLink, Gift, X, Loader2 } from 'lucide-react';

/**
 * Renderização padrão da área de membros (mesmo layout usado no /zapmro),
 * reaproveitada pelos produtos do dashboard. Recebe os módulos já carregados
 * para que a página dona controle o carregamento/erros.
 */

const moduleColorClasses: Record<ModuleColor, { border: string; bg: string; accent: string }> = {
  default: { border: 'border-border', bg: 'bg-card', accent: 'bg-primary' },
  green: { border: 'border-emerald-500/50', bg: 'bg-emerald-900/20', accent: 'bg-emerald-500' },
  blue: { border: 'border-blue-500/50', bg: 'bg-blue-900/20', accent: 'bg-blue-500' },
  purple: { border: 'border-purple-500/50', bg: 'bg-purple-900/20', accent: 'bg-purple-500' },
  orange: { border: 'border-orange-500/50', bg: 'bg-orange-900/20', accent: 'bg-orange-500' },
  pink: { border: 'border-pink-500/50', bg: 'bg-pink-900/20', accent: 'bg-pink-500' },
  red: { border: 'border-red-500/50', bg: 'bg-red-900/20', accent: 'bg-red-500' },
  cyan: { border: 'border-cyan-500/50', bg: 'bg-cyan-900/20', accent: 'bg-cyan-500' },
};

const getYoutubeEmbedUrl = (url: string): string => {
  const match = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
  return url;
};

const separateContents = (contents: ModuleContent[] = []) => {
  const sorted = [...contents].sort((a, b) => a.order - b.order);
  return {
    regularContents: sorted.filter((c) => c.type !== 'section' && c.type !== 'product_ad'),
    sections: sorted.filter((c) => c.type === 'section') as ModuleSection[],
    productAds: sorted.filter((c) => c.type === 'product_ad') as any[],
  };
};

interface ContentSectionProps {
  contents: ModuleContent[];
  onContentClick: (content: ModuleContent) => void;
}

const ContentSection = ({ contents, onContentClick }: ContentSectionProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const videoContents = contents.filter((c) => c.type === 'video' || c.type === 'text');
  const buttonContents = contents.filter((c) => c.type === 'button');

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 10);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
  };

  useEffect(() => {
    if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = 0;
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [videoContents.length]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollBy({ left: direction === 'left' ? -180 : 180, behavior: 'smooth' });
    setTimeout(checkScroll, 300);
  };

  if (videoContents.length === 0 && buttonContents.length === 0) return null;

  return (
    <div className="space-y-4 w-full">
      {videoContents.length > 0 && (
        <div className="relative w-full flex justify-center">
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              aria-label="Voltar"
              className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center shadow-lg"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              aria-label="Avançar"
              className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center shadow-lg"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
            </button>
          )}

          <div className="px-10 sm:px-12 md:px-14 w-full max-w-fit">
            <div
              ref={scrollContainerRef}
              onScroll={checkScroll}
              className="flex gap-3 sm:gap-4 md:gap-5 overflow-x-auto pb-4 snap-x snap-mandatory mx-auto w-fit max-w-full"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {videoContents.map((content, idx) => (
                <div
                  key={content.id}
                  className="group cursor-pointer flex-shrink-0 snap-start w-[110px] sm:w-[130px] md:w-[150px] lg:w-[160px]"
                  onClick={() => onContentClick(content)}
                >
                  {content.type === 'video' ? (
                    <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-muted border-2 border-border group-hover:border-primary transition-all duration-300 shadow-lg">
                      <img
                        src={
                          (content as ModuleVideo).thumbnailUrl ||
                          getYoutubeThumbnail((content as ModuleVideo).youtubeUrl) ||
                          ''
                        }
                        alt={content.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {(content as ModuleVideo).isFileVideo && (
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-primary rounded text-[10px] font-semibold text-primary-foreground flex items-center gap-1">
                          <Play className="w-3 h-3" /> MP4
                        </div>
                      )}
                      {(content as ModuleVideo).showNumber && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-lg">
                          {idx + 1}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                          <Play className="w-4 h-4 text-primary-foreground ml-0.5" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-muted flex items-center justify-center border-2 border-border group-hover:border-primary transition-all duration-300 shadow-lg">
                      <Type className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
                    </div>
                  )}
                  {(content as { showTitle?: boolean }).showTitle !== false && (
                    <p className="font-medium mt-2 text-xs sm:text-sm text-center text-foreground line-clamp-2 px-1">
                      {content.title}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {buttonContents.length > 0 && (
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center items-center pt-4 px-4 w-full">
          {buttonContents.map((content) => (
            <Button
              key={content.id}
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.open((content as ModuleButton).url, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-4 w-4" />
              {content.title}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export interface MembersModulesViewProps {
  modules: TutorialModule[];
  isLoading?: boolean;
  emptyMessage?: string;
}

const MembersModulesView = ({ modules, isLoading = false, emptyMessage }: MembersModulesViewProps) => {
  const [selectedContent, setSelectedContent] = useState<ModuleContent | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-10">
        {emptyMessage || 'A área de membros está sendo configurada pelo administrador.'}
      </p>
    );
  }

  const handleClick = (content: ModuleContent) => {
    if (content.type === 'button') {
      window.open((content as ModuleButton).url, '_blank', 'noopener,noreferrer');
    } else {
      setSelectedContent(content);
    }
  };

  return (
    <div className="space-y-8">
      {[...modules]
        .sort((a, b) => a.order - b.order)
        .map((module) => {
          const colorTheme = moduleColorClasses[module.color || 'default'];
          const isCollapsed = module.collapsedByDefault && !expandedModules.has(module.id);
          const { regularContents, sections, productAds } = separateContents(module.contents);

          const toggleExpand = () =>
            setExpandedModules((prev) => {
              const next = new Set(prev);
              if (next.has(module.id)) next.delete(module.id);
              else next.add(module.id);
              return next;
            });

          return (
            <div key={module.id} className={`rounded-xl border-2 p-6 ${colorTheme.border} ${colorTheme.bg}`}>
              <div
                className={`flex flex-col items-center gap-3 ${isCollapsed ? '' : 'mb-6'} text-center ${
                  module.collapsedByDefault ? 'cursor-pointer' : ''
                }`}
                onClick={module.collapsedByDefault ? toggleExpand : undefined}
              >
                {module.collapsedByDefault && module.coverUrl && (
                  <div className="relative w-full max-w-xs mx-auto mb-2">
                    <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-muted group">
                      <img
                        src={module.coverUrl}
                        alt={module.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-xl">
                          <Play className="w-8 h-8 text-primary-foreground" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {module.showNumber && (
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold ${colorTheme.accent}`}
                    >
                      {module.order}
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-foreground">{module.title}</h3>
                  {module.isBonus && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black rounded-full text-xs font-semibold flex items-center gap-1">
                      <Gift className="w-3 h-3" /> BÔNUS
                    </span>
                  )}
                </div>
                {module.description && <p className="text-muted-foreground text-sm max-w-xl">{module.description}</p>}
              </div>

              {!isCollapsed && (
                <div className="space-y-4">
                  {regularContents.length > 0 && (
                    <ContentSection contents={regularContents} onContentClick={handleClick} />
                  )}

                  {sections.map((section) => (
                    <div key={section.id} className="mt-6 rounded-2xl border border-border bg-muted/30 p-4 md:p-6">
                      {section.showTitle !== false && (
                        <div className="text-center mb-4">
                          <div className="flex items-center justify-center gap-2">
                            <h3 className="text-base md:text-lg font-bold text-foreground">{section.title}</h3>
                            {section.isBonus && (
                              <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black rounded-full text-xs font-semibold flex items-center gap-1">
                                <Gift className="w-3 h-3" /> BÔNUS
                              </span>
                            )}
                          </div>
                          {section.description && (
                            <p className="text-xs md:text-sm text-muted-foreground mt-1">{section.description}</p>
                          )}
                        </div>
                      )}
                      <ContentSection contents={section.contents || []} onContentClick={handleClick} />
                    </div>
                  ))}
                  {productAds.map((ad) => (
                    <div key={ad.id} className="mt-8 mb-4">
                      {ad.title && (
                        <h4 className="text-center text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">
                          {ad.title}
                        </h4>
                      )}
                      <div className="max-w-md mx-auto bg-card border-2 border-primary/20 rounded-2xl p-4 flex items-center gap-4 shadow-xl hover:border-primary/40 transition-colors">
                        <div className="h-20 w-20 rounded-xl bg-muted flex-shrink-0 overflow-hidden shadow-inner">
                          {ad.productThumb ? (
                            <img src={ad.productThumb} alt={ad.productTitle} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Play className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-foreground truncate">{ad.productTitle}</h5>
                          {ad.productDescription && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {ad.productDescription}
                            </p>
                          )}
                          <Button 
                            size="sm" 
                            className="mt-3 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
                            onClick={() => window.location.href = ad.productSalesUrl || `/dashboard/produto/${ad.productSlug}`}
                          >
                            ACESSAR AGORA
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

      {selectedContent && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedContent(null)}
        >
          <div className="w-full max-w-5xl my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">{selectedContent.title}</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedContent(null)} className="text-white">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {selectedContent.type === 'video' ? (
              <>
                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                  {(selectedContent as ModuleVideo).isFileVideo && (selectedContent as ModuleVideo).videoFileUrl ? (
                    <video
                      src={(selectedContent as ModuleVideo).videoFileUrl}
                      title={selectedContent.title}
                      className="w-full h-full"
                      controls
                      autoPlay
                    />
                  ) : (
                    <iframe
                      src={getYoutubeEmbedUrl((selectedContent as ModuleVideo).youtubeUrl)}
                      title={selectedContent.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
                {(selectedContent as ModuleVideo).description && (
                  <p className="text-white/70 mt-4">{(selectedContent as ModuleVideo).description}</p>
                )}
              </>
            ) : (
              <div className="bg-card p-6 rounded-lg">
                {(selectedContent as ModuleText).content.split('\n').map((paragraph, idx) => (
                  <p key={idx} className="mb-4 last:mb-0 text-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersModulesView;
