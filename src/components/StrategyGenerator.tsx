import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Strategy, InstagramProfile, ProfileAnalysis } from '@/types/instagram';
import { Sparkles, Loader2, Zap, MessageSquare, Calendar, Users, User } from 'lucide-react';
import { generateStrategy } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface StrategyGeneratorProps {
  profile: InstagramProfile;
  analysis: ProfileAnalysis;
  onStrategyGenerated: (strategy: Strategy) => void;
  existingStrategies: Strategy[];
}

export const StrategyGenerator = ({ profile, analysis, onStrategyGenerated, existingStrategies }: StrategyGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<'mro' | 'content' | 'engagement' | 'sales' | 'bio'>('mro');
  const { toast } = useToast();

  const strategyTypes = [
    { id: 'mro', label: 'Estratégia MRO', icon: <Zap className="w-5 h-5" />, description: 'Interações orgânicas em massa' },
    { id: 'content', label: 'Conteúdo', icon: <Calendar className="w-5 h-5" />, description: 'Calendário de publicações' },
    { id: 'engagement', label: 'Engajamento', icon: <Users className="w-5 h-5" />, description: 'Stories e interação' },
    { id: 'sales', label: 'Vendas', icon: <MessageSquare className="w-5 h-5" />, description: 'Scripts e abordagem' },
    { id: 'bio', label: 'Bio Instagram', icon: <User className="w-5 h-5" />, description: 'Otimização de bio' },
  ];

  const handleGenerateStrategy = async () => {
    setIsGenerating(true);
    
    toast({
      title: "Gerando estratégia com IA...",
      description: `Criando ${strategyTypes.find(t => t.id === selectedType)?.label}`,
    });

    try {
      const result = await generateStrategy(profile, analysis, selectedType);

      if (result.success && result.strategy) {
        onStrategyGenerated(result.strategy);
        toast({
          title: "Estratégia gerada! 🎯",
          description: result.strategy.title,
        });
      } else {
        toast({
          title: "Erro ao gerar estratégia",
          description: result.error || "Tente novamente",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar a estratégia",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="glass-card glow-border p-6 animate-slide-up">
      <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-primary" />
        Gerar Nova Estratégia com IA
      </h3>

      {/* Strategy Type Selection */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {strategyTypes.map((type) => (
          <button
            type="button"
            key={type.id}
            onClick={() => setSelectedType(type.id as typeof selectedType)}
            className={`p-4 rounded-lg border transition-all duration-300 text-left cursor-pointer ${
              selectedType === type.id 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className={`mb-2 ${selectedType === type.id ? 'text-primary' : 'text-muted-foreground'}`}>
              {type.icon}
            </div>
            <p className="font-semibold text-sm">{type.label}</p>
            <p className="text-xs text-muted-foreground">{type.description}</p>
          </button>
        ))}
      </div>

      <Button 
        onClick={handleGenerateStrategy} 
        disabled={isGenerating}
        variant="gradient"
        size="lg"
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Gerando com IA...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Gerar Estratégia {strategyTypes.find(t => t.id === selectedType)?.label}
          </>
        )}
      </Button>

      {/* Info */}
      <p className="text-xs text-muted-foreground text-center mt-4">
        Usando DeepSeek + Google AI para gerar estratégia personalizada para o nicho: {analysis.niche}
      </p>
    </div>
  );
};
