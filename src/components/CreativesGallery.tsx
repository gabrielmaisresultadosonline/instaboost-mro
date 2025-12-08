import { Creative } from '@/types/instagram';
import { Download, Image as ImageIcon, Clock, Check, AlertCircle } from 'lucide-react';
import { markCreativeAsDownloaded } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface CreativesGalleryProps {
  creatives: Creative[];
  creativesRemaining: number;
  onUpdate?: () => void;
}

export const CreativesGallery = ({ creatives, creativesRemaining, onUpdate }: CreativesGalleryProps) => {
  const { toast } = useToast();

  const downloadCreative = (creative: Creative) => {
    window.open(creative.imageUrl, '_blank');
    
    if (!creative.downloaded) {
      markCreativeAsDownloaded(creative.id);
      toast({
        title: "Download iniciado",
        description: "Criativo marcado como usado",
      });
      onUpdate?.();
    }
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffTime = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpirationStatus = (expiresAt: string) => {
    const days = getDaysRemaining(expiresAt);
    if (days <= 0) return { text: 'Expirado', color: 'text-destructive', urgent: true };
    if (days <= 7) return { text: `${days}d restantes`, color: 'text-warning', urgent: true };
    return { text: `${days}d restantes`, color: 'text-muted-foreground', urgent: false };
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

      {/* Info Banner */}
      <div className="p-3 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground flex items-start gap-2">
        <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          Criativos ficam disponíveis por <strong>1 mês</strong> após criação. 
          Após o download, contam como usados.
        </p>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {creatives.map((creative) => {
          const expStatus = creative.expiresAt 
            ? getExpirationStatus(creative.expiresAt) 
            : { text: 'Sem expiração', color: 'text-muted-foreground', urgent: false };

          return (
            <div 
              key={creative.id} 
              className="glass-card overflow-hidden group relative"
            >
              {/* Status badges */}
              <div className="absolute top-2 left-2 right-2 z-10 flex justify-between items-start">
                {/* Downloaded badge */}
                {creative.downloaded && (
                  <span className="px-2 py-1 rounded-full bg-success/80 text-success-foreground text-xs flex items-center gap-1 backdrop-blur-sm">
                    <Check className="w-3 h-3" />
                    Baixado
                  </span>
                )}
                
                {/* Expiration badge */}
                <span className={`px-2 py-1 rounded-full bg-background/80 text-xs flex items-center gap-1 backdrop-blur-sm ml-auto ${expStatus.color}`}>
                  {expStatus.urgent && <AlertCircle className="w-3 h-3" />}
                  <Clock className="w-3 h-3" />
                  {expStatus.text}
                </span>
              </div>

              {/* Logo overlay - CENTERED at top */}
              {creative.logoUrl && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10">
                  <img 
                    src={creative.logoUrl} 
                    alt="Logo" 
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg"
                  />
                </div>
              )}

              <div className="aspect-square relative">
                <img 
                  src={creative.imageUrl} 
                  alt="Criativo"
                  className="w-full h-full object-cover"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent flex flex-col items-center justify-end p-4">
                  <p className="text-sm font-semibold text-center mb-2">{creative.headline}</p>
                  <span 
                    className="px-3 py-1 rounded-full text-xs"
                    style={{ 
                      backgroundColor: creative.colors?.primary || 'hsl(var(--primary))', 
                      color: creative.colors?.text || 'hsl(var(--primary-foreground))' 
                    }}
                  >
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
                Criado em {new Date(creative.createdAt).toLocaleDateString('pt-BR')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
