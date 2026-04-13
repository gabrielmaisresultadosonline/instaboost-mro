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
    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    const normalizedUsername = String(username || 'username').replace('@', '').trim().toLowerCase();

    const systemPrompt = `Você é um especialista em marketing digital e leitura visual de prints de perfis do Instagram.

PRIMEIRO: Verifique se a imagem é realmente um print/screenshot de um perfil do Instagram. 
Se NÃO for um print do Instagram (por exemplo: foto aleatória, meme, outro app, etc), responda APENAS:
{"not_instagram": true}

Se FOR um print válido do Instagram, leia o print do perfil e extraia APENAS dados realmente visíveis na imagem.
Não invente números. Se algum campo não estiver legível, use 0 ou string vazia.

RETORNE APENAS JSON VÁLIDO no seguinte formato:
{
  "not_instagram": false,
  "extracted_data": {
    "username": "${normalizedUsername}",
    "full_name": "",
    "bio": "",
    "followers": 0,
    "following": 0,
    "posts_count": 0,
    "is_business": true,
    "category": "",
    "external_link": "",
    "profile_picture_visible": true,
    "posts_visible": []
  },
  "analysis": {
    "strengths": ["pontos fortes identificados com emoji"],
    "weaknesses": ["pontos fracos identificados com emoji"],
    "opportunities": ["oportunidades de melhoria com emoji"],
    "niche": "nicho identificado",
    "audienceType": "tipo de público-alvo estimado",
    "contentScore": número de 0 a 100,
    "engagementScore": número de 0 a 100,
    "profileScore": número de 0 a 100,
    "recommendations": ["recomendações específicas"]
  },
  "visual_observations": {
    "profile_quality": "avaliação da qualidade visual do perfil",
    "brand_consistency": "consistência visual da marca",
    "content_variety": "variedade do conteúdo visível",
    "grid_aesthetic": "estética do grid de posts"
  }
}

Regras extras:
- followers, following e posts_count devem ser números inteiros.
- Se o print mostrar pontuação brasileira como 4.254 ou 1,2 mil, converta para número inteiro.
- Preserve o username informado se ele bater com o print.`;

    const userPrompt = `Leia este print do Instagram e extraia os dados visíveis do perfil @${normalizedUsername}.
Depois gere uma análise profissional curta baseada no que aparece no print.
Se esta imagem NÃO for um print de perfil do Instagram, retorne {"not_instagram": true}.`;

    // Try Lovable AI (Gemini vision) first
    if (LOVABLE_API_KEY) {
      const visionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: userPrompt },
                { type: 'image_url', image_url: { url: screenshot_url } }
              ]
            }
          ],
          temperature: 0.2,
          max_tokens: 2500,
        }),
      });

      if (visionResponse.ok) {
        const visionData = await visionResponse.json();
        const content = visionData.choices?.[0]?.message?.content;

        if (content) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const analysisResult = JSON.parse(jsonMatch[0]);
            
            // Check if NOT an Instagram profile
            if (analysisResult.not_instagram === true) {
              console.log('❌ Image is not an Instagram profile screenshot');
              return Response.json({
                success: false,
                error: 'not_instagram_profile',
                message: 'Não conseguimos ler o print do perfil. Você precisa enviar um print real do perfil do Instagram que está utilizando.'
              }, { headers: corsHeaders });
            }
            
            const extracted = analysisResult.extracted_data || {};
            extracted.username = extracted.username || normalizedUsername;

            return Response.json({
              success: true,
              analysis: analysisResult.analysis,
              extracted_data: extracted,
              visual_observations: analysisResult.visual_observations || null,
            }, { headers: corsHeaders });
          }
        }
      } else {
        const errorText = await visionResponse.text();
        console.error('❌ Vision API error:', visionResponse.status, errorText);
      }
    }

    // Fallback textual analysis (DeepSeek - no vision, limited)
    if (DEEPSEEK_API_KEY) {
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
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 3000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const analysisResult = JSON.parse(jsonMatch[0]);
            return Response.json({
              success: true,
              analysis: analysisResult.analysis,
              extracted_data: {
                username: normalizedUsername,
                ...(analysisResult.extracted_data || {})
              },
              visual_observations: analysisResult.visual_observations
            }, { headers: corsHeaders });
          }
        }
      }
    }

    // All APIs failed
    return Response.json({
      success: true,
      analysis: generateFallbackAnalysis(username),
      extracted_data: { username: normalizedUsername, followers: 0, following: 0, posts_count: 0 },
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ Error analyzing screenshot:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao analisar screenshot';
    return Response.json(
      { success: false, error: errorMessage, analysis: generateFallbackAnalysis() },
      { status: 500, headers: corsHeaders }
    );
  }
});

function generateFallbackAnalysis(username?: string) {
  return {
    strengths: [
      '✅ Perfil visualmente apresentável',
      '✅ Presença no Instagram estabelecida',
      '✅ Potencial para crescimento orgânico'
    ],
    weaknesses: [
      '⚠️ Análise completa não disponível no momento',
      '⚠️ Recomendamos tentar novamente em alguns minutos'
    ],
    opportunities: [
      '🎯 Implementar estratégia MRO para crescimento',
      '🎯 Otimizar bio e chamadas para ação',
      '🎯 Aumentar consistência de posts'
    ],
    niche: username ? `Nicho de @${username}` : 'A ser identificado',
    audienceType: 'Público local',
    contentScore: 65,
    engagementScore: 60,
    profileScore: 62,
    recommendations: [
      'Tente enviar novamente para análise completa',
      'Certifique-se que o print mostra todo o perfil',
      'Imagens mais nítidas geram melhores análises'
    ]
  };
}
