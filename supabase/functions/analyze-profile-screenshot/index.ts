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
    const { screenshot_url, username, ocr_text } = await req.json();

    if (!screenshot_url) {
      return Response.json(
        { success: false, error: 'URL do screenshot é obrigatória' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`🔍 Analyzing profile screenshot for @${username || 'unknown'} with DeepSeek`);

    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    const normalizedUsername = String(username || 'username').replace('@', '').trim().toLowerCase();
    const normalizedOcrText = typeof ocr_text === 'string' ? ocr_text.trim() : '';

    if (!normalizedOcrText) {
      return Response.json({
        success: false,
        error: 'ocr_required',
        message: `Não conseguimos validar o @ do print de @${normalizedUsername}. Envie um print real do perfil para continuar.`
      }, { status: 400, headers: corsHeaders });
    }

    const systemPrompt = `Você é um especialista em marketing digital e leitura de OCR de prints de perfis do Instagram.

PRIMEIRO: Verifique se o texto OCR pertence realmente a um print/screenshot de perfil do Instagram.
Se NÃO for um print do Instagram (por exemplo: foto aleatória, meme, outro app, ou OCR sem sinais de perfil), responda APENAS:
{"not_instagram": true}

Se FOR um print válido do Instagram, use APENAS as informações visíveis no OCR abaixo. Não invente números. Se algum campo não estiver legível, use 0 ou string vazia.

RETORNE APENAS JSON VÁLIDO no seguinte formato:
{
  "not_instagram": false,
  "extracted_data": {
    "username": "username exato visível no print, sem @",
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
- Se o OCR mostrar pontuação brasileira como 4.254 ou 1,2 mil, converta para número inteiro.
- Extraia o username real visível no print. Nunca copie automaticamente o username informado pelo sistema se ele não estiver visível no OCR.
- Se o @ visível no print for diferente de @${normalizedUsername}, ainda retorne o username extraído corretamente no JSON.`;

    const userPrompt = `Leia o OCR deste print do Instagram e extraia os dados visíveis do perfil.
Depois gere uma análise profissional curta baseada no que aparece no texto.
Se este OCR NÃO corresponder a um print de perfil do Instagram, retorne {"not_instagram": true}.

@ esperado no cadastro: @${normalizedUsername}

OCR do print:
"""
${normalizedOcrText.slice(0, 12000)}
"""`;

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
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.2,
            max_tokens: 2500,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;

          if (content) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const analysisResult = JSON.parse(jsonMatch[0]);

              if (analysisResult.not_instagram === true) {
                console.log('❌ Image is not an Instagram profile screenshot');
                return Response.json({
                  success: false,
                  error: 'not_instagram_profile',
                  message: 'Não conseguimos ler o print do perfil. Você precisa enviar um print real do perfil do Instagram que está utilizando.'
                }, { headers: corsHeaders });
              }

              const extracted = analysisResult.extracted_data || {};
              const extractedUsername = String(extracted.username || '').replace('@', '').trim().toLowerCase();

               if (!extractedUsername) {
                 return Response.json({
                   success: false,
                   error: 'username_not_detected',
                   message: `Não conseguimos confirmar o @ do print de @${normalizedUsername}. Envie um print real e nítido do perfil @${normalizedUsername}.`
                 }, { headers: corsHeaders });
               }

              if (extractedUsername && extractedUsername !== normalizedUsername) {
                console.log(`❌ Username mismatch: expected @${normalizedUsername}, got @${extractedUsername}`);
                return Response.json({
                  success: false,
                  error: 'username_mismatch',
                  message: `O print enviado é do perfil @${extractedUsername}, mas a conta cadastrada é @${normalizedUsername}. Envie um print real do perfil @${normalizedUsername}.`
                }, { headers: corsHeaders });
              }

              extracted.username = extractedUsername || normalizedUsername;

              return Response.json({
                success: true,
                analysis: analysisResult.analysis,
                extracted_data: extracted,
                visual_observations: analysisResult.visual_observations || null,
              }, { headers: corsHeaders });
            }
          }
        } else {
          const errorText = await response.text();
          console.error('❌ DeepSeek screenshot analysis error:', response.status, errorText);
        }
      } catch (deepseekError) {
        console.error('❌ DeepSeek screenshot analysis failed:', deepseekError);
      }
    }

    return Response.json({
      success: false,
      error: 'analysis_unavailable',
      message: `Não foi possível validar o print de @${normalizedUsername} agora. Envie novamente um print real do perfil.`,
    }, { status: 503, headers: corsHeaders });

  } catch (error) {
    console.error('❌ Error analyzing screenshot:', error);
    return Response.json(
      { success: false, error: 'Erro ao analisar screenshot' },
      { status: 500, headers: corsHeaders }
    );
  }
});
