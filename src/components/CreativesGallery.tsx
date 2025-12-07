import { Creative } from '@/types/instagram';
import { Download, Trash2, Image as ImageIcon } from 'lucide-react';

interface CreativesGalleryProps {
  creatives: Creative[];
  creativesRemaining: number;
}

export const CreativesGallery = ({ creatives, creativesRemaining }: CreativesGalleryProps) => {
  const downloadCreative = (creative: Creative) => {
    // In a real app, this would download the actual image
    window.open(creative.imageUrl, '_blank');
  };

  if (creatives.length === 0) {
    return (
      <div className="glass-card p-8 text-center animate-slide-up">
        <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-display font-semibold mb-2">Nenhum criativo ainda</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Gere sua primeira estratégia e depois crie criativos personalizados.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary">
          <span className="text-2xl font-bold">{creativesRemaining}</span>
          <span className="text-sm">criativos disponíveis</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-display font-bold">Seus Criativos</h3>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary">
          <span className="font-bold">{creativesRemaining}</span>
          <span className="text-sm">restantes</span>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {creatives.map((creative) => (
          <div 
            key={creative.id} 
            className="glass-card overflow-hidden group relative"
          >
            <div className="aspect-square relative">
              <img 
                src={creative.imageUrl} 
                alt="Criativo"
                className="w-full h-full object-cover"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent flex flex-col items-center justify-end p-4">
                <p className="text-sm font-semibold text-center mb-2">{creative.headline}</p>
                <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs">
                  {creative.ctaText}
                </span>
              </div>
              
              {/* Actions Overlay */}
              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  onClick={() => downloadCreative(creative)}
                  className="p-3 rounded-full bg-primary text-primary-foreground hover:scale-110 transition-transform"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Date */}
            <div className="p-2 text-xs text-muted-foreground text-center">
              {new Date(creative.createdAt).toLocaleDateString('pt-BR')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
