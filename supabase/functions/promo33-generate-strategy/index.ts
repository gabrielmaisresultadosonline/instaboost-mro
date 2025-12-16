import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { type, email, instagram_username, instagram_data } = await req.json();

    console.log(`[promo33-generate-strategy] Type: ${type}, Instagram: ${instagram_username}`);

    // Get user
    const { data: user, error: userError } = await supabase
      .from('promo33_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Usuário não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check subscription
    if (user.subscription_status !== 'active') {
      return new Response(
        JSON.stringify({ success: false, message: 'Assinatura não está ativa' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build prompt based on strategy type
    const profileInfo = `
Perfil: @${instagram_username}
Nome: ${instagram_data.fullName || 'Não informado'}
Bio: ${instagram_data.bio || 'Não informada'}
Seguidores: ${instagram_data.followers || 0}
Seguindo: ${instagram_data.following || 0}
Posts: ${instagram_data.posts?.length || 0}
`;

    let prompt = '';
    let systemPrompt = `Você é um especialista em marketing digital e Instagram da MRO - Mais Resultados Online. 
Gere estratégias práticas, objetivas e prontas para implementar. Use linguagem direta e amigável.
Responda sempre em português brasileiro.`;

    switch (type) {
      case 'bio':
        prompt = `${profileInfo}

Crie uma estratégia completa de otimização de BIO para este perfil. Inclua:
1. Análise da bio atual (se houver)
2. Sugestão de nova bio otimizada (máximo 150 caracteres)
3. CTA (call-to-action) ideal
4. Emojis estratégicos
5. Link ideal para colocar na bio

Seja específico e dê exemplos práticos.`;
        break;

      case 'growth':
        prompt = `${profileInfo}

Crie uma estratégia completa de CRESCIMENTO ORGÂNICO para este perfil. Inclua:
1. Análise do perfil atual
2. Plano de ação para os próximos 30 dias
3. Horários ideais para postar
4. Tipos de conteúdo que mais engajam
5. Estratégia de hashtags (10-15 hashtags específicas)
6. Técnicas de engajamento
7. Como usar Stories e Reels

Seja específico com números e exemplos.`;
        break;

      case 'sales':
        prompt = `${profileInfo}

Crie SCRIPTS DE VENDAS para usar no Direct deste perfil. Inclua:
1. Script de primeiro contato com lead frio
2. Script de follow-up
3. Script de fechamento
4. Respostas para objeções comuns
5. Como qualificar leads pelo Direct
6. Gatilhos mentais para usar

Dê exemplos de mensagens prontas para copiar e colar.`;
        break;

      case 'content':
        prompt = `${profileInfo}

Crie uma estratégia de CONTEÚDO/CRIATIVOS para este perfil. Inclua:
1. 10 ideias de posts para o feed
2. 10 ideias de Stories
3. 5 ideias de Reels virais
4. Calendário semanal de conteúdo
5. Legendas prontas (3 exemplos)
6. CTAs para usar nas postagens

Seja criativo e específico para o nicho do perfil.`;
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, message: 'Tipo de estratégia inválido' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Call DeepSeek API
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    
    if (!deepseekApiKey) {
      console.error('[promo33-generate-strategy] DEEPSEEK_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, message: 'API não configurada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[promo33-generate-strategy] DeepSeek error:', errorText);
      throw new Error('Erro ao gerar estratégia');
    }

    const aiResponse = await response.json();
    const strategyContent = aiResponse.choices?.[0]?.message?.content;

    if (!strategyContent) {
      throw new Error('Resposta vazia da IA');
    }

    // Update user with new strategy
    const existingStrategies = user.strategies_generated || [];
    const updatedStrategies = [
      ...existingStrategies.filter((s: any) => s.type !== type),
      {
        type,
        content: strategyContent,
        generated_at: new Date().toISOString()
      }
    ];

    const { data: updatedUser, error: updateError } = await supabase
      .from('promo33_users')
      .update({ strategies_generated: updatedStrategies })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[promo33-generate-strategy] Update error:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, user: updatedUser }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[promo33-generate-strategy] Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
