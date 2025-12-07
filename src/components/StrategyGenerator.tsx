import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Strategy, InstagramProfile, ProfileAnalysis } from '@/types/instagram';
import { Sparkles, Loader2, Zap, MessageSquare, Calendar, Users } from 'lucide-react';

interface StrategyGeneratorProps {
  profile: InstagramProfile;
  analysis: ProfileAnalysis;
  onStrategyGenerated: (strategy: Strategy) => void;
  existingStrategies: Strategy[];
}

export const StrategyGenerator = ({ profile, analysis, onStrategyGenerated, existingStrategies }: StrategyGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<'mro' | 'content' | 'engagement' | 'sales'>('mro');

  const strategyTypes = [
    { id: 'mro', label: 'Estratégia MRO', icon: <Zap className="w-5 h-5" />, description: 'Interações orgânicas em massa' },
    { id: 'content', label: 'Conteúdo', icon: <Calendar className="w-5 h-5" />, description: 'Calendário de publicações' },
    { id: 'engagement', label: 'Engajamento', icon: <Users className="w-5 h-5" />, description: 'Stories e interação' },
    { id: 'sales', label: 'Vendas', icon: <MessageSquare className="w-5 h-5" />, description: 'Scripts e abordagem' },
  ];

  const generateStrategy = async () => {
    setIsGenerating(true);
    
    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const strategy = generateMockStrategy(selectedType, profile, analysis);
    onStrategyGenerated(strategy);
    setIsGenerating(false);
  };

  return (
    <div className="glass-card glow-border p-6 animate-slide-up">
      <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-primary" />
        Gerar Nova Estratégia
      </h3>

      {/* Strategy Type Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {strategyTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id as typeof selectedType)}
            className={`p-4 rounded-lg border transition-all duration-300 text-left ${
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
        onClick={generateStrategy} 
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
        A IA irá analisar seu perfil e gerar uma estratégia personalizada para o nicho: {analysis.niche}
      </p>
    </div>
  );
};

function generateMockStrategy(type: string, profile: InstagramProfile, analysis: ProfileAnalysis): Strategy {
  const strategies: Record<string, Partial<Strategy>> = {
    mro: {
      title: `Estratégia MRO para @${profile.username}`,
      description: `Estratégia de crescimento orgânico através de interações em massa focada no nicho de ${analysis.niche}. A ferramenta MRO irá interagir com 200 pessoas por dia, curtindo fotos, stories e chamando atenção de forma orgânica.`,
      steps: [
        '🎯 Defina seu público-alvo: pessoas interessadas em ' + analysis.niche,
        '📍 Configure a localização para sua cidade/região de atuação',
        '⏰ Horário ideal: 8h-10h e 18h-21h (maior atividade)',
        '👥 Meta diária: 200 interações (100 manhã + 100 noite)',
        '❤️ Curta 3-5 fotos por perfil antes de seguir',
        '👀 Visualize os Stories dos perfis para aparecer',
        '💬 Responda stories com enquetes e perguntas',
        '📊 Monitore os resultados semanalmente',
      ],
      scripts: [
        {
          situation: 'Cliente chegou pelo DM após interação MRO',
          opening: `Oi! 👋 Que bom te ver por aqui! Vi que você curtiu nosso conteúdo sobre ${analysis.niche}. Posso te ajudar com algo específico?`,
          body: `Trabalhamos com [SERVIÇO] e temos ajudado muitas pessoas como você a [RESULTADO]. O legal é que a gente personaliza tudo conforme sua necessidade.`,
          closing: `Olha, essa semana temos condições especiais. Posso te explicar rapidinho? Vai levar só 2 minutinhos! 🚀`,
          scarcityTriggers: [
            '⚡ Vagas limitadas essa semana',
            '🔥 Preço especial só até sexta',
            '📍 Atendemos apenas sua região',
            '⏰ Próxima disponibilidade só mês que vem',
          ],
        },
      ],
      storiesCalendar: generateStoriesCalendar(),
    },
    content: {
      title: `Calendário de Conteúdo para @${profile.username}`,
      description: `Estratégia de conteúdo semanal otimizada para máximo engajamento no nicho de ${analysis.niche}.`,
      steps: [
        '📸 Segunda: Post carrossel educativo (dicas do nicho)',
        '🎥 Terça: Reels de bastidores ou processo',
        '💡 Quarta: Post de valor com call-to-action',
        '🎬 Quinta: Reels trending (use áudios virais)',
        '📝 Sexta: Post de depoimento/resultado',
        '🎯 Sábado: Conteúdo leve/humanizado',
        '📊 Domingo: Recap da semana + CTA',
      ],
      scripts: [],
      storiesCalendar: generateStoriesCalendar(),
    },
    engagement: {
      title: `Estratégia de Engajamento para @${profile.username}`,
      description: `Aumente sua taxa de engajamento de ${profile.engagement.toFixed(1)}% para 5%+ com estas táticas.`,
      steps: [
        '📱 Poste Stories 5-8x por dia em horários estratégicos',
        '💬 Responda TODOS os comentários em até 1 hora',
        '🎯 Use CTAs fortes: "Comente SIM se concorda"',
        '📊 Faça enquetes e perguntas nos Stories',
        '👀 Use a função "Amigos Próximos" para exclusividade',
        '🔔 Ative notificações para responder rápido',
        '🤝 Colabore com perfis do mesmo nicho',
      ],
      scripts: [],
      storiesCalendar: generateStoriesCalendar(),
    },
    sales: {
      title: `Scripts de Vendas para @${profile.username}`,
      description: `Scripts de alta conversão para transformar seguidores em clientes no nicho de ${analysis.niche}.`,
      steps: [
        '🎯 Qualifique o lead antes de oferecer',
        '💡 Mostre o problema antes da solução',
        '📊 Use provas sociais e resultados',
        '⏰ Crie urgência genuína',
        '🎁 Ofereça bônus exclusivos',
        '🔄 Faça follow-up em 24/48/72h',
      ],
      scripts: [
        {
          situation: 'Primeiro contato - Lead frio',
          opening: `Oi [NOME]! 👋 Vi que você acompanha nosso conteúdo sobre ${analysis.niche}. Posso te fazer uma pergunta rápida?`,
          body: `Estou fazendo uma pesquisa com nossos seguidores: qual seu maior desafio hoje com [TEMA]? Pergunto porque temos uma solução que pode te ajudar.`,
          closing: `Se fizer sentido pra você, posso te explicar como funciona. Sem compromisso! 😊`,
          scarcityTriggers: ['Resposta: aguardo seu retorno!'],
        },
        {
          situation: 'Lead quente - Demonstrou interesse',
          opening: `[NOME]! Que bom que se interessou! 🔥`,
          body: `Deixa eu te explicar como funciona: [EXPLICAÇÃO BREVE]. O diferencial é que [BENEFÍCIO ÚNICO]. Já ajudamos +X pessoas a [RESULTADO].`,
          closing: `Para clientes que fecham essa semana, tenho uma condição especial. Quer saber mais?`,
          scarcityTriggers: [
            '🔥 Bônus exclusivo só até amanhã',
            '📍 Só X vagas restantes',
            '💰 Esse valor é só essa semana',
          ],
        },
        {
          situation: 'Objeção: "Tá caro"',
          opening: `Entendo perfeitamente, [NOME]!`,
          body: `Deixa eu te fazer uma conta rápida: quanto você perde hoje por não ter [SOLUÇÃO]? Se nosso serviço te gera [RESULTADO], em quanto tempo ele se paga?`,
          closing: `Posso parcelar em até X vezes. E se não funcionar, tem garantia de X dias. O que acha?`,
          scarcityTriggers: ['Parcelamento especial só hoje', 'Garantia de resultados'],
        },
      ],
      storiesCalendar: generateStoriesCalendar(),
    },
  };

  return {
    id: `strategy_${Date.now()}`,
    type: type as Strategy['type'],
    createdAt: new Date().toISOString(),
    ...strategies[type],
  } as Strategy;
}

function generateStoriesCalendar() {
  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  
  return days.map(day => ({
    day,
    stories: [
      { time: '08:00', type: 'engagement' as const, content: 'Bom dia! Enquete: O que vocês preferem? A ou B?', hasButton: false },
      { time: '12:00', type: 'behind-scenes' as const, content: 'Bastidores do dia a dia', hasButton: false },
      { time: '15:00', type: 'cta' as const, content: 'Novidade especial! Link na bio 👇', hasButton: true, buttonText: 'Saiba mais', buttonUrl: '#' },
      { time: '18:00', type: 'testimonial' as const, content: 'Resultado do cliente [NOME]! 🔥', hasButton: false },
      { time: '21:00', type: 'offer' as const, content: 'Última chance! Promoção termina hoje ⏰', hasButton: true, buttonText: 'Aproveitar', buttonUrl: '#' },
    ],
  }));
}
