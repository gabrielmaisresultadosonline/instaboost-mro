import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Strategy, InstagramProfile, ProfileAnalysis } from '@/types/instagram';
import { Sparkles, Loader2, Zap, MessageSquare, Calendar, Users, User, Clock, AlertCircle } from 'lucide-react';
import { generateStrategy } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { canGenerateStrategy, getStrategyDaysRemaining } from '@/lib/storage';

interface StrategyGeneratorProps {
  profile: InstagramProfile;
  analysis: ProfileAnalysis;
  onStrategyGenerated: (strategy: Strategy) => void;
  existingStrategies: Strategy[];
  profileId?: string;
}

export const StrategyGenerator = ({ profile, analysis, onStrategyGenerated, existingStrategies, profileId }: StrategyGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<'mro' | 'content' | 'engagement' | 'sales' | 'bio'>('mro');
  const { toast } = useToast();

  const canGenerate = canGenerateStrategy(profileId);
  const daysRemaining = getStrategyDaysRemaining(profileId);

  const strategyTypes = [
    { id: 'mro', label: 'Estratégia MRO', icon: <Zap className="w-5 h-5" />, description: 'Interações orgânicas em massa' },
    { id: 'content', label: 'Conteúdo', icon: <Calendar className="w-5 h-5" />, description: 'Calendário de publicações' },
    { id: 'engagement', label: 'Engajamento', icon: <Users className="w-5 h-5" />, description: 'Stories e interação' },
    { id: 'sales', label: 'Vendas', icon: <MessageSquare className="w-5 h-5" />, description: 'Scripts e abordagem' },
    { id: 'bio', label: 'Bio Instagram', icon: <User className="w-5 h-5" />, description: 'Otimização de bio' },
  ];

  const handleGenerateStrategy = async () => {
    if (!canGenerate) {
      toast({
        title: "Limite mensal atingido",
        description: `Você poderá gerar nova estratégia em ${daysRemaining} dias`,
        variant: "destructive",
      });
      return;
    }

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
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-display font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          Gerar Nova Estratégia com IA
        </h3>
        
        {/* Days remaining indicator */}
        {!canGenerate && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/20 text-warning border border-warning/30">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">{daysRemaining} dias para próxima</span>
          </div>
        )}
        
        {canGenerate && existingStrategies.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/20 text-success border border-success/30">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Disponível para gerar</span>
          </div>
        )}
      </div>

      {/* Limit warning */}
      {!canGenerate && (
        <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-warning">Limite mensal atingido</p>
              <p className="text-sm text-muted-foreground">
                Você pode gerar <strong>1 estratégia por mês</strong> por perfil. 
                Próxima geração disponível em <strong>{daysRemaining} dias</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Strategy Type Selection */}
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6 ${!canGenerate ? 'opacity-50 pointer-events-none' : ''}`}>
        {strategyTypes.map((type) => (
          <button
            type="button"
            key={type.id}
            onClick={() => setSelectedType(type.id as typeof selectedType)}
            disabled={!canGenerate}
            className={`p-4 rounded-lg border transition-all duration-300 text-left cursor-pointer ${
              selectedType === type.id 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50'
            } ${!canGenerate ? 'cursor-not-allowed' : ''}`}
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
        type="button"
        onClick={handleGenerateStrategy} 
        disabled={isGenerating || !canGenerate}
        variant="gradient"
        size="lg"
        className="w-full cursor-pointer"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Gerando com IA...
          </>
        ) : !canGenerate ? (
          <>
            <Clock className="w-5 h-5" />
            Disponível em {daysRemaining} dias
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
        Usando I.A da MRO - Mais Resultados Online para gerar estratégia personalizada para o nicho: {analysis.niche}
      </p>
    </div>
  );
};
