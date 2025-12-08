import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreativeConfig {
  colors: {
    primary: string;
    secondary: string;
    text: string;
  };
  logoType: 'profile' | 'custom' | 'none';
  customLogoUrl?: string;
  businessType: string;
}

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
  config?: CreativeConfig;
  logoUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { strategy, profile, niche, config, logoUrl }: CreativeRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Gerando criativo para:', profile.username, 'estratégia:', strategy.type);

    // Get colors from config or use defaults
    const colors = config?.colors || { primary: '#1e40af', secondary: '#3b82f6', text: '#ffffff' };
    const businessType = config?.businessType || niche || 'marketing digital';

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
            content: 'Você é um copywriter especialista em criativos para Instagram. Crie textos curtos e impactantes para alta conversão.'
          },
          {
            role: 'user',
            content: `Crie um headline e CTA para um criativo de Instagram.

Nicho: ${niche}
Tipo de Negócio: ${businessType}
Estratégia: ${strategy.type} - ${strategy.title}
Perfil: @${profile.username}
Cores escolhidas: ${colors.primary} e ${colors.secondary}

Retorne JSON:
{
  "headline": "frase impactante curta com gatilho mental (max 8 palavras)",
  "cta": "chamada para ação urgente (max 5 palavras)"
}`
          }
        ],
      }),
    });

    let headline = 'Transforme seu negócio hoje!';
    let ctaText = 'Saiba mais agora';

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
          }
        } catch (e) {
          console.log('Error parsing text response:', e);
        }
      }
    }

    // Build detailed image prompt with professional style guidance
    console.log('Gerando imagem com Gemini Nano Banana...');
    
    const imagePrompt = `Create an ULTRA PROFESSIONAL Instagram marketing creative image.

STYLE REFERENCE - REPLICATE THIS EXACT QUALITY:
- Premium dark gradient background with subtle tech elements (like bokeh lights, geometric patterns)
- Futuristic/innovation feel with professional business aesthetic
- Central powerful imagery: can include handshakes, technology, human-robot interaction, abstract business concepts
- Color scheme: Dark base with ${colors.primary} and ${colors.secondary} as vibrant accent colors
- Dramatic lighting with depth and dimension
- Ultra high definition, 4K quality rendering

EXACT LAYOUT REQUIREMENTS:
- TOP 15%: Clean dark space for logo placement (centered, leave empty)
- CENTER 60%: Stunning visual imagery representing ${businessType}
  * Professional, trust-building, innovative
  * Can include: abstract tech, business handshakes, futuristic elements
  * Strong visual impact with ${colors.primary} accent lighting
- BOTTOM 25%: Gradient fade area for text overlay (leave empty for headline/CTA)

CRITICAL RULES:
- NO TEXT whatsoever in the image
- NO logos or brand marks
- Aspect ratio: PERFECT 1:1 SQUARE (1080x1080 pixels)
- Style: Premium advertising agency quality
- Feel: Trust, innovation, growth, partnership
- Industry context: ${businessType}
- Marketing strategy: ${strategy.type}

Create an image that looks like it was made by a top-tier Brazilian marketing agency for a high-converting Instagram campaign. Ultra premium, modern, innovative, and professional.`;

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

    // Calculate expiration (1 month from now)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const creative = {
      id: `creative_${Date.now()}`,
      imageUrl,
      headline,
      ctaText,
      strategyId: strategy.type,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      colors,
      logoUrl: logoUrl || null,
      downloaded: false,
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
