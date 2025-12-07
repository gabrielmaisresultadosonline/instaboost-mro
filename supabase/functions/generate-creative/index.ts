import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreativeRequest {
  strategy: {
    title: string;
    description: string;
    type: string;
  };
  profile: {
    username: string;
    fullName: string;
    category: string;
  };
  niche: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { strategy, profile, niche }: CreativeRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Gerando criativo para:', profile.username, 'estratégia:', strategy.type);

    // Gerar CTA e headline com IA
    const textResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é um copywriter especialista em criativos para Instagram. Crie textos curtos e impactantes.'
          },
          {
            role: 'user',
            content: `Crie um headline e CTA para um criativo de Instagram.

Nicho: ${niche}
Estratégia: ${strategy.type}
Perfil: @${profile.username}

Retorne JSON:
{
  "headline": "frase impactante curta (max 8 palavras)",
  "cta": "chamada para ação (max 5 palavras)",
  "colors": "sugestão de cores dominantes para a imagem"
}`
          }
        ],
      }),
    });

    let headline = 'Transforme seu negócio hoje!';
    let ctaText = 'Saiba mais agora';
    let colorSuggestion = 'verde e azul profissional';

    if (textResponse.ok) {
      const textData = await textResponse.json();
      const content = textData.choices?.[0]?.message?.content;
      if (content) {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            headline = parsed.headline || headline;
            ctaText = parsed.cta || ctaText;
            colorSuggestion = parsed.colors || colorSuggestion;
          }
        } catch (e) {
          console.log('Error parsing text response:', e);
        }
      }
    }

    // Gerar imagem com Gemini Image
    console.log('Gerando imagem com Gemini...');
    
    const imagePrompt = `Create a professional Instagram marketing post image. 
Style: Modern, clean, high-conversion design.
Theme: ${niche} business, ${strategy.type} strategy.
Colors: ${colorSuggestion}
Requirements:
- Professional and trustworthy look
- Clear focal point
- Space for text overlay
- No text in the image itself
- 1:1 aspect ratio (square)
- High quality, premium feel
- Suitable for ${profile.category || 'business'} niche`;

    const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: imagePrompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    let imageUrl = null;

    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      const images = imageData.choices?.[0]?.message?.images;
      
      if (images && images.length > 0) {
        imageUrl = images[0].image_url?.url;
        console.log('Image generated successfully');
      }
    } else {
      console.log('Image generation failed:', await imageResponse.text());
    }

    // Se a geração de imagem falhar, usa um placeholder
    if (!imageUrl) {
      imageUrl = `https://picsum.photos/seed/${Date.now()}/1080/1080`;
      console.log('Using placeholder image');
    }

    const creative = {
      id: `creative_${Date.now()}`,
      imageUrl,
      headline,
      ctaText,
      strategyId: strategy.type,
      createdAt: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify({ success: true, creative }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating creative:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erro ao gerar criativo', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
