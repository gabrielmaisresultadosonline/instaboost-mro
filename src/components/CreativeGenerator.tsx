import { useState } from 'react';
import { Strategy, Creative, InstagramProfile } from '@/types/instagram';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Sparkles, Image as ImageIcon } from 'lucide-react';
import { generateCreative } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface CreativeGeneratorProps {
  strategy: Strategy;
  profile: InstagramProfile;
  niche: string;
  onCreativeGenerated: (creative: Creative) => void;
  onClose: () => void;
}

export const CreativeGenerator = ({ strategy, profile, niche, onCreativeGenerated, onClose }: CreativeGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCreative, setGeneratedCreative] = useState<Creative | null>(null);
  const { toast } = useToast();

  const handleGenerateCreative = async () => {
    setIsGenerating(true);
    
    toast({
      title: "Gerando criativo com IA...",
      description: "Criando imagem e copy personalizada",
    });

    try {
      const result = await generateCreative(strategy, profile, niche);

      if (result.success && result.creative) {
        setGeneratedCreative(result.creative);
        toast({
          title: "Criativo gerado! 🎨",
          description: "Imagem e textos prontos para uso",
        });
      } else {
        toast({
          title: "Erro ao gerar criativo",
          description: result.error || "Tente novamente",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o criativo",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveCreative = () => {
    if (generatedCreative) {
      onCreativeGenerated(generatedCreative);
      toast({
        title: "Criativo salvo!",
        description: "Disponível na galeria de criativos",
      });
    }
  };

  const downloadImage = () => {
    if (generatedCreative?.imageUrl) {
      window.open(generatedCreative.imageUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="glass-card glow-border p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-display font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Gerar Criativo com IA
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">
            ✕
          </button>
        </div>

        {/* Strategy Info */}
        <div className="p-4 rounded-lg bg-secondary/50 mb-6">
          <p className="text-sm text-muted-foreground mb-1">Baseado na estratégia:</p>
          <p className="font-semibold">{strategy.title}</p>
        </div>

        {/* Generated Creative Preview */}
        {generatedCreative ? (
          <div className="space-y-4">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-secondary">
              <img 
                src={generatedCreative.imageUrl} 
                alt="Criativo gerado" 
                className="w-full h-full object-cover"
              />
              {/* Overlay with text */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent flex flex-col items-center justify-end p-6">
                <h4 className="text-2xl font-display font-bold text-center mb-2 text-gradient">
                  {generatedCreative.headline}
                </h4>
                <span className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold">
                  {generatedCreative.ctaText}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleGenerateCreative} variant="outline" className="flex-1" disabled={isGenerating}>
                <Sparkles className="w-4 h-4" />
                Gerar Outro
              </Button>
              <Button onClick={downloadImage} variant="outline" className="flex-1">
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
            <Button onClick={saveCreative} variant="gradient" className="w-full">
              <Download className="w-4 h-4" />
              Salvar Criativo
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="aspect-square rounded-lg bg-secondary/50 flex flex-col items-center justify-center text-muted-foreground">
              {isGenerating ? (
                <>
                  <Loader2 className="w-12 h-12 mb-4 animate-spin text-primary" />
                  <p className="text-sm">Gerando criativo com Gemini AI...</p>
                  <p className="text-xs mt-2">Isso pode levar alguns segundos</p>
                </>
              ) : (
                <>
                  <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-sm">Clique para gerar seu criativo</p>
                </>
              )}
            </div>

            <Button 
              onClick={handleGenerateCreative} 
              variant="gradient" 
              size="lg" 
              className="w-full"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Gerar Criativo com IA
                </>
              )}
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-4">
          O criativo será gerado com Google Gemini, incluindo CTAs de alta conversão.
        </p>
      </div>
    </div>
  );
};
