import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StrategyRequest {
  profile: {
    username: string;
    fullName: string;
    bio: string;
    followers: number;
    category: string;
  };
  analysis: {
    niche: string;
    recommendations: string[];
  };
  type: 'mro' | 'content' | 'engagement' | 'sales';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profile, analysis, type }: StrategyRequest = await req.json();
    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    console.log('Gerando estratégia:', type, 'para:', profile.username);

    const strategyPrompts: Record<string, string> = {
      mro: `Crie uma estratégia MRO (Marketing de Relacionamento Orgânico) completa para @${profile.username}.

A ferramenta MRO funciona assim:
- Interage organicamente com 200 pessoas por dia (100 manhã, 100 noite)
- Curte fotos, visualiza stories, chama atenção de forma natural
- Foca em público-alvo do nicho: ${analysis.niche}

Inclua:
1. Passos detalhados para configurar e executar a estratégia MRO
2. Horários ideais para interações
3. Como selecionar o público-alvo correto
4. Scripts de abordagem quando pessoas respondem
5. Calendário de Stories semanal com CTAs
6. Gatilhos de escassez para conversão`,

      content: `Crie um calendário de conteúdo semanal completo para @${profile.username}.

Nicho: ${analysis.niche}
Objetivo: Maximizar engajamento e conversão

Inclua:
1. Tipo de post para cada dia da semana
2. Melhores horários para postar
3. Formatos (Reels, Carrossel, Stories, etc.)
4. CTAs específicos para cada tipo de conteúdo
5. Calendário de Stories diário com botões de ação`,

      engagement: `Crie uma estratégia de engajamento para aumentar a interação de @${profile.username}.

Inclua:
1. Técnicas para aumentar comentários e salvamentos
2. Estratégia de Stories com enquetes e perguntas
3. Como responder comentários para gerar mais engajamento
4. Uso de CTAs que funcionam
5. Colaborações e parcerias sugeridas`,

      sales: `Crie scripts de vendas completos para @${profile.username}.

Nicho: ${analysis.niche}

Inclua:
1. Script para primeiro contato via DM
2. Script para lead quente que demonstrou interesse
3. Scripts para objeções comuns (preço, tempo, confiança)
4. Gatilhos de escassez e urgência
5. Follow-up estruturado
6. Frases de fechamento`,
    };

    const systemPrompt = `Você é um especialista em marketing digital e vendas no Instagram.
Crie estratégias práticas e acionáveis em português brasileiro.

RETORNE JSON VÁLIDO no formato:
{
  "title": "título da estratégia",
  "description": "descrição breve",
  "steps": ["passo 1 com emoji", "passo 2 com emoji", ...],
  "scripts": [
    {
      "situation": "situação",
      "opening": "frase de abertura",
      "body": "desenvolvimento",
      "closing": "fechamento",
      "scarcityTriggers": ["gatilho 1", "gatilho 2"]
    }
  ],
  "storiesCalendar": [
    {
      "day": "Segunda",
      "stories": [
        {"time": "08:00", "type": "engagement", "content": "conteúdo", "hasButton": false},
        {"time": "18:00", "type": "cta", "content": "oferta", "hasButton": true, "buttonText": "Saiba mais"}
      ]
    }
  ]
}`;

    let strategyResult = null;

    // Tenta com DeepSeek primeiro
    if (DEEPSEEK_API_KEY) {
      try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: strategyPrompts[type] }
            ],
            temperature: 0.8,
            max_tokens: 4000,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              strategyResult = JSON.parse(jsonMatch[0]);
              console.log('DeepSeek strategy successful');
            }
          }
        }
      } catch (e) {
        console.error('DeepSeek error:', e);
      }
    }

    // Fallback para Lovable AI
    if (!strategyResult && LOVABLE_API_KEY) {
      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: strategyPrompts[type] }
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              strategyResult = JSON.parse(jsonMatch[0]);
              console.log('Lovable AI strategy successful');
            }
          }
        }
      } catch (e) {
        console.error('Lovable AI error:', e);
      }
    }

    // Fallback básico
    if (!strategyResult) {
      strategyResult = generateFallbackStrategy(type, profile, analysis);
    }

    // Adiciona metadados
    strategyResult.id = `strategy_${Date.now()}`;
    strategyResult.type = type;
    strategyResult.createdAt = new Date().toISOString();

    return new Response(
      JSON.stringify({ success: true, strategy: strategyResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating strategy:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erro ao gerar estratégia', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateFallbackStrategy(type: string, profile: any, analysis: any) {
  const strategies: Record<string, any> = {
    mro: {
      title: `Estratégia MRO para @${profile.username}`,
      description: `Estratégia de crescimento orgânico através de interações em massa focada no nicho de ${analysis.niche}.`,
      steps: [
        '🎯 Defina seu público-alvo ideal no nicho de ' + analysis.niche,
        '📍 Configure a localização para sua região de atuação',
        '⏰ Horários ideais: 8h-10h e 18h-21h',
        '👥 Meta diária: 200 interações (100 manhã + 100 noite)',
        '❤️ Curta 3-5 fotos por perfil antes de interagir',
        '👀 Visualize os Stories para aparecer',
        '💬 Responda stories com enquetes',
        '📊 Monitore resultados semanalmente',
      ],
      scripts: [{
        situation: 'Cliente chegou pelo DM após interação MRO',
        opening: 'Oi! 👋 Que bom te ver por aqui! Posso te ajudar?',
        body: 'Trabalhamos com soluções personalizadas para seu negócio.',
        closing: 'Essa semana temos condições especiais. Posso explicar?',
        scarcityTriggers: ['⚡ Vagas limitadas', '🔥 Preço especial só até sexta'],
      }],
    },
    content: {
      title: `Calendário de Conteúdo para @${profile.username}`,
      description: 'Estratégia semanal otimizada para máximo engajamento.',
      steps: [
        '📸 Segunda: Post carrossel educativo',
        '🎥 Terça: Reels de bastidores',
        '💡 Quarta: Post de valor com CTA',
        '🎬 Quinta: Reels com áudio viral',
        '📝 Sexta: Post de depoimento',
        '🎯 Sábado: Conteúdo humanizado',
        '📊 Domingo: Recap da semana',
      ],
      scripts: [],
    },
    engagement: {
      title: `Estratégia de Engajamento para @${profile.username}`,
      description: 'Aumente sua taxa de engajamento com estas táticas.',
      steps: [
        '📱 Poste Stories 5-8x por dia',
        '💬 Responda TODOS os comentários em 1h',
        '🎯 Use CTAs fortes nos posts',
        '📊 Faça enquetes nos Stories',
        '👀 Use Amigos Próximos para exclusividade',
        '🔔 Ative notificações para responder rápido',
        '🤝 Colabore com perfis do nicho',
      ],
      scripts: [],
    },
    sales: {
      title: `Scripts de Vendas para @${profile.username}`,
      description: 'Scripts de alta conversão para seu nicho.',
      steps: [
        '🎯 Qualifique o lead antes de oferecer',
        '💡 Mostre o problema antes da solução',
        '📊 Use provas sociais',
        '⏰ Crie urgência genuína',
        '🎁 Ofereça bônus exclusivos',
        '🔄 Faça follow-up em 24/48/72h',
      ],
      scripts: [
        {
          situation: 'Primeiro contato - Lead frio',
          opening: 'Oi! 👋 Vi que você acompanha nosso conteúdo. Posso fazer uma pergunta?',
          body: 'Qual seu maior desafio hoje? Pergunto porque podemos ajudar.',
          closing: 'Se fizer sentido, posso explicar como funciona. Sem compromisso! 😊',
          scarcityTriggers: ['Resposta: aguardo seu retorno!'],
        },
        {
          situation: 'Lead quente',
          opening: 'Que bom que se interessou! 🔥',
          body: 'Deixa eu explicar: ajudamos +X pessoas a conseguir resultados.',
          closing: 'Para quem fechar essa semana, tenho condição especial.',
          scarcityTriggers: ['🔥 Bônus só até amanhã', '📍 Só X vagas restantes'],
        },
      ],
    },
  };

  const strategy = strategies[type] || strategies.mro;
  strategy.storiesCalendar = generateStoriesCalendar();
  return strategy;
}

function generateStoriesCalendar() {
  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  return days.map(day => ({
    day,
    stories: [
      { time: '08:00', type: 'engagement', content: 'Bom dia! Enquete interativa', hasButton: false },
      { time: '12:00', type: 'behind-scenes', content: 'Bastidores do dia', hasButton: false },
      { time: '15:00', type: 'cta', content: 'Novidade! Link na bio 👇', hasButton: true, buttonText: 'Saiba mais' },
      { time: '18:00', type: 'testimonial', content: 'Resultado do cliente 🔥', hasButton: false },
      { time: '21:00', type: 'offer', content: 'Última chance! ⏰', hasButton: true, buttonText: 'Aproveitar' },
    ],
  }));
}
