import { Strategy } from '@/types/instagram';
import { Zap, Calendar, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface StrategyDisplayProps {
  strategy: Strategy;
  onGenerateCreative: (strategy: Strategy) => void;
  creativesRemaining: number;
}

export const StrategyDisplay = ({ strategy, onGenerateCreative, creativesRemaining }: StrategyDisplayProps) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    steps: true,
    scripts: false,
    stories: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const typeIcons = {
    mro: <Zap className="w-5 h-5" />,
    content: <Calendar className="w-5 h-5" />,
    engagement: <MessageSquare className="w-5 h-5" />,
    sales: <MessageSquare className="w-5 h-5" />,
  };

  const typeColors = {
    mro: 'bg-primary/20 text-primary',
    content: 'bg-mro-cyan/20 text-mro-cyan',
    engagement: 'bg-mro-purple/20 text-mro-purple',
    sales: 'bg-mro-green/20 text-mro-green',
  };

  return (
    <div className="glass-card p-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className={`p-2 rounded-lg ${typeColors[strategy.type]}`}>
              {typeIcons[strategy.type]}
            </span>
            <h3 className="text-xl font-display font-bold">{strategy.title}</h3>
          </div>
          <p className="text-muted-foreground text-sm">{strategy.description}</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(strategy.createdAt).toLocaleDateString('pt-BR')}
        </span>
      </div>

      {/* Steps */}
      <CollapsibleSection
        title="Passos da Estratégia"
        isExpanded={expandedSections.steps}
        onToggle={() => toggleSection('steps')}
      >
        <ul className="space-y-2">
          {strategy.steps.map((step, i) => (
            <li key={i} className="text-sm p-3 rounded-lg bg-secondary/50 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Scripts */}
      {strategy.scripts.length > 0 && (
        <CollapsibleSection
          title="Scripts de Vendas"
          isExpanded={expandedSections.scripts}
          onToggle={() => toggleSection('scripts')}
        >
          <div className="space-y-4">
            {strategy.scripts.map((script, i) => (
              <div key={i} className="p-4 rounded-lg bg-secondary/30 border border-border">
                <p className="font-semibold text-sm mb-3 text-primary">{script.situation}</p>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase">Abertura:</span>
                    <p className="mt-1">{script.opening}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase">Desenvolvimento:</span>
                    <p className="mt-1">{script.body}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase">Fechamento:</span>
                    <p className="mt-1">{script.closing}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase">Gatilhos de Escassez:</span>
                    <ul className="mt-1 space-y-1">
                      {script.scarcityTriggers.map((trigger, j) => (
                        <li key={j} className="text-mro-green">{trigger}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Stories Calendar */}
      {strategy.storiesCalendar && (
        <CollapsibleSection
          title="Calendário de Stories"
          isExpanded={expandedSections.stories}
          onToggle={() => toggleSection('stories')}
        >
          <div className="overflow-x-auto">
            <div className="flex gap-4 min-w-max pb-4">
              {strategy.storiesCalendar.map((day, i) => (
                <div key={i} className="w-48 flex-shrink-0">
                  <p className="font-semibold text-sm mb-3 text-center p-2 rounded-lg bg-primary/10">
                    {day.day}
                  </p>
                  <div className="space-y-2">
                    {day.stories.map((story, j) => (
                      <div 
                        key={j} 
                        className={`p-2 rounded-lg text-xs ${
                          story.hasButton ? 'bg-primary/20 border border-primary/30' : 'bg-secondary/50'
                        }`}
                      >
                        <span className="text-muted-foreground">{story.time}</span>
                        <p className="mt-1">{story.content}</p>
                        {story.hasButton && (
                          <span className="inline-block mt-2 px-2 py-1 bg-primary text-primary-foreground rounded text-xs">
                            {story.buttonText}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Generate Creative Button */}
      <div className="mt-6 pt-6 border-t border-border">
        <button
          onClick={() => onGenerateCreative(strategy)}
          disabled={creativesRemaining === 0}
          className={`w-full p-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
            creativesRemaining > 0
              ? 'bg-animated-gradient text-primary-foreground btn-glow hover:scale-[1.02]'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          {creativesRemaining > 0 ? (
            <>
              🎨 Gerar Criativo para esta Estratégia
              <span className="text-xs opacity-80">({creativesRemaining} restantes)</span>
            </>
          ) : (
            'Limite de criativos atingido este mês'
          )}
        </button>
      </div>
    </div>
  );
};

const CollapsibleSection = ({ 
  title, 
  isExpanded, 
  onToggle, 
  children 
}: { 
  title: string; 
  isExpanded: boolean; 
  onToggle: () => void; 
  children: React.ReactNode;
}) => (
  <div className="mb-4">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
    >
      <span className="font-semibold text-sm">{title}</span>
      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
    </button>
    {isExpanded && <div className="mt-3">{children}</div>}
  </div>
);
