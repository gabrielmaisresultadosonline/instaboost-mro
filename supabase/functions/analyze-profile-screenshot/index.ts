import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { screenshot_url, username } = await req.json();

    if (!screenshot_url) {
      return Response.json(
        { success: false, error: 'URL do screenshot é obrigatória' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`🔍 Analyzing profile screenshot for @${username || 'unknown'}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return Response.json(
        { success: false, error: 'Chave de API não configurada' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Use Gemini Pro vision to analyze the screenshot
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em marketing digital e análise de perfis do Instagram.
Analise o print do perfil do Instagram fornecido e extraia TODAS as informações visíveis.

RETORNE APENAS JSON VÁLIDO no seguinte formato:
{
  "extracted_data": {
    "username": "username se visível",
    "full_name": "nome completo se visível",
    "bio": "texto da bio completo",
    "followers": número de seguidores (número, não string),
    "following": número de seguindo (número),
    "posts_count": número de posts (número),
    "is_business": true/false se identificável,
    "category": "categoria se visível",
    "external_link": "link se visível",
    "profile_picture_visible": true/false,
    "posts_visible": ["descrição dos posts visíveis no grid"]
  },
  "analysis": {
    "strengths": ["pontos fortes identificados com emoji"],
    "weaknesses": ["pontos fracos identificados com emoji"],
    "opportunities": ["oportunidades de melhoria com emoji"],
    "niche": "nicho identificado",
    "audienceType": "tipo de público-alvo estimado",
    "contentScore": número de 0 a 100,
    "engagementScore": número de 0 a 100 (estimado),
    "profileScore": número de 0 a 100,
    "recommendations": ["recomendações específicas"]
  },
  "visual_observations": {
    "profile_quality": "avaliação da qualidade visual do perfil",
    "brand_consistency": "consistência visual da marca",
    "content_variety": "variedade do conteúdo visível",
    "grid_aesthetic": "estética do grid de posts"
  }
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analise este print do perfil do Instagram${username ? ` (@${username})` : ''}. Extraia todas as informações visíveis e forneça uma análise completa.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: screenshot_url
                }
              }
            ]
          }
        ],
        max_tokens: 3000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ AI API error:', errorText);
      
      // Handle specific error codes
      if (response.status === 402) {
        console.error('❌ Payment required - Not enough credits');
        return Response.json({
          success: false,
          error: 'credits_exhausted',
          message: 'Créditos de IA esgotados. A análise será feita com base nos dados disponíveis.',
          analysis: generateFallbackAnalysis()
        }, { status: 200, headers: corsHeaders }); // Return 200 so the app can handle it gracefully
      }
      
      if (response.status === 429) {
        console.error('❌ Rate limit exceeded');
        return Response.json({
          success: false,
          error: 'rate_limited',
          message: 'Muitas requisições. Aguarde alguns segundos e tente novamente.',
          analysis: generateFallbackAnalysis()
        }, { status: 200, headers: corsHeaders });
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('📝 AI response received, parsing...');

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ Could not find JSON in response:', content.substring(0, 500));
      throw new Error('Could not parse AI response');
    }

    const analysisResult = JSON.parse(jsonMatch[0]);
    console.log('✅ Screenshot analysis complete');

    return Response.json({
      success: true,
      analysis: analysisResult.analysis,
      extracted_data: analysisResult.extracted_data,
      visual_observations: analysisResult.visual_observations
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ Error analyzing screenshot:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao analisar screenshot';
    return Response.json(
      { 
        success: false, 
        error: errorMessage,
        analysis: generateFallbackAnalysis()
      },
      { status: 500, headers: corsHeaders }
    );
  }
});

function generateFallbackAnalysis() {
  return {
    strengths: [
      '✅ Perfil visualmente apresentável',
      '✅ Presença no Instagram estabelecida'
    ],
    weaknesses: [
      '⚠️ Análise automática não disponível',
      '⚠️ Recomendamos tentar novamente'
    ],
    opportunities: [
      '🎯 Implementar estratégia MRO para crescimento',
      '🎯 Otimizar bio e chamadas para ação',
      '🎯 Aumentar consistência de posts'
    ],
    niche: 'A ser identificado',
    audienceType: 'Público local',
    contentScore: 50,
    engagementScore: 50,
    profileScore: 50,
    recommendations: [
      'Tente enviar novamente para análise completa',
      'Certifique-se que o print mostra todo o perfil',
      'Imagens mais nítidas geram melhores análises'
    ]
  };
}
