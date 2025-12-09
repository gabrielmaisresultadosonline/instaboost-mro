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
  logoPosition: 'left' | 'center' | 'right';
  fontColor: string;
  customLogoUrl?: string;
  businessType: string;
  customColors?: string[];
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
  isManualMode?: boolean;
  customPrompt?: string;
  variationSeed?: number; // For ensuring uniqueness
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { strategy, profile, niche, config, logoUrl, isManualMode, customPrompt, variationSeed }: CreativeRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mode = isManualMode ? 'manual' : 'estratégia';
    console.log(`Gerando criativo para: ${profile.username} modo: ${mode} seed: ${variationSeed || 'none'}`);

    // Get colors from config or use defaults
    const colors = config?.colors || { primary: '#1e40af', secondary: '#3b82f6', text: '#ffffff' };
    const businessType = config?.businessType || niche || 'marketing digital';
    const logoPosition = config?.logoPosition || 'center';
    const fontColor = config?.fontColor || '#ffffff';
    const customColors = config?.customColors || [];
    const allColors = [colors.primary, colors.secondary, ...customColors].join(', ');

    // Random variation elements for uniqueness
    const variationId = variationSeed || Date.now();
    const perspectives = ['close-up shot', 'wide angle view', 'aerial perspective', 'side angle', 'dramatic low angle', 'elegant overhead shot'];
    const moods = ['luxurious and premium', 'energetic and dynamic', 'calm and sophisticated', 'bold and impactful', 'warm and inviting', 'modern and sleek'];
    const lightings = ['dramatic studio lighting', 'soft golden hour light', 'neon accent lighting', 'natural daylight', 'cinematic spotlight', 'ambient mood lighting'];
    
    const selectedPerspective = perspectives[variationId % perspectives.length];
    const selectedMood = moods[(variationId + 2) % moods.length];
    const selectedLighting = lightings[(variationId + 4) % lightings.length];

    // Different mental triggers for CTAs
    const triggers = ['escassez', 'autoridade', 'urgência', 'prova social', 'reciprocidade', 'exclusividade'];
    const selectedTrigger = triggers[variationId % triggers.length];

    // Gerar CTA e headline com IA - with variation
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
            content: 'Você é um copywriter especialista em criativos para Instagram. Crie textos curtos e impactantes para alta conversão. Cada criativo deve ser ÚNICO e diferente dos anteriores.'
          },
          {
            role: 'user',
            content: isManualMode && customPrompt 
              ? `Crie um headline e CTA para um criativo de Instagram.

Prompt do usuário: ${customPrompt}
Tipo de Negócio: ${businessType}
Perfil: @${profile.username}
Cores escolhidas: ${allColors}

GATILHO MENTAL OBRIGATÓRIO: Use ${selectedTrigger.toUpperCase()} como principal gatilho mental.

IMPORTANTE: O headline pode ter 2-3 linhas se necessário para ficar mais impactante.
O texto deve ser centralizado com margem, não muito grudado nas bordas.
Seja CRIATIVO e ÚNICO - não repita fórmulas comuns.

Retorne JSON:
{
  "headline": "frase impactante com gatilho de ${selectedTrigger} (pode ter 2-3 linhas, max 15 palavras total)",
  "cta": "chamada para ação urgente (max 5 palavras)"
}`
              : `Crie um headline e CTA ÚNICOS para um criativo de Instagram.

Nicho: ${niche}
Tipo de Negócio: ${businessType}
Estratégia: ${strategy.type} - ${strategy.title}
Perfil: @${profile.username}
Cores escolhidas: ${allColors}

GATILHO MENTAL OBRIGATÓRIO: Use ${selectedTrigger.toUpperCase()} como principal gatilho mental.
Este é o criativo #${variationId % 100} - deve ser COMPLETAMENTE DIFERENTE dos anteriores.

IMPORTANTE: 
- O headline pode ter 2-3 linhas se necessário para ficar mais impactante.
- O texto deve ser centralizado com margem, não muito grudado nas bordas.
- NÃO repita fórmulas ou frases comuns. Seja CRIATIVO e SURPREENDENTE.
- Use linguagem que conecte emocionalmente com o público.

Retorne JSON:
{
  "headline": "frase impactante com gatilho de ${selectedTrigger} (pode ter 2-3 linhas, max 15 palavras total)",
  "cta": "chamada para ação única e urgente (max 5 palavras)"
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
    console.log('Gerando imagem com I.A MRO...');
    
    // Determine logo position description
    const logoPositionDesc = logoPosition === 'left' ? 'TOP LEFT' : 
                             logoPosition === 'right' ? 'TOP RIGHT' : 'TOP CENTER';
    
    // Build custom prompt if in manual mode
    const contentDescription = isManualMode && customPrompt 
      ? customPrompt 
      : `${businessType} - ${strategy.type}: ${strategy.title}`;

    const imagePrompt = `Create an ULTRA PROFESSIONAL Instagram marketing creative image.

CRITICAL QUALITY REQUIREMENTS:
- FULL SCREEN COVERAGE: Image must fill the ENTIRE canvas with NO empty spaces, bars, or borders
- REALISTIC photography style, Full HD quality, 100% sharpness
- 4K advertising agency quality with rich details
- Premium ${selectedMood} atmosphere
- ${selectedLighting} for dramatic effect
- ${selectedPerspective} composition

BUSINESS CONTEXT: ${businessType}
CONTENT THEME: ${contentDescription}
UNIQUE VARIATION: #${variationId % 1000} - This must look COMPLETELY DIFFERENT from any previous generation

COLOR PALETTE:
- Dark elegant gradient base (NO solid color blocks or horizontal bars)
- Accent colors: ${allColors}
- Seamless gradient transitions, NO sharp horizontal lines

MANDATORY LOGO AREA - CRITICAL:
- Reserve a SEAMLESS circular area at ${logoPositionDesc} of the image
- Position: ${logoPosition === 'center' ? 'HORIZONTALLY CENTERED' : logoPosition === 'left' ? 'LEFT SIDE (about 10% from left edge)' : 'RIGHT SIDE (about 10% from right edge)'}, approximately 8-12% from the top edge
- This area must BLEND naturally with the background - NO solid rectangles or bars behind it
- The logo area should be slightly darker/cleaner but NOT a separate shape

VISUAL CONTENT (BE UNIQUE):
- ${selectedPerspective} of imagery relevant to: ${businessType}
- ${selectedMood} visual treatment
- Each generation must have DIFFERENT composition, subjects, and angles
- DO NOT repeat patterns or concepts from other creatives
- Fill ENTIRE image with rich, detailed visuals

LAYOUT STRUCTURE:
- TOP: Clean gradient area for logo overlay (NO bars, NO rectangles)
- CENTER: ${selectedPerspective} visual representing the business
- BOTTOM 30%: Smooth gradient fade for text overlay (seamless, not a bar)

ABSOLUTE RULES:
- NO text in the image
- NO horizontal solid color bars or stripes
- NO empty spaces or borders
- NO logos or brand marks (just seamless dark area for overlay)
- Aspect ratio: 1:1 SQUARE (1080x1080)
- Image must extend EDGE TO EDGE with no visible boundaries
- Background must be a seamless gradient, NOT solid blocks`;

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
