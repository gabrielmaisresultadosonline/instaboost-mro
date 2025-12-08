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

    // Build detailed image prompt with business context
    console.log('Gerando imagem com Gemini...');
    
    const imagePrompt = `Create a professional Instagram marketing creative image for a ${businessType} company.

IMPORTANT REQUIREMENTS:
- Theme: ${businessType} industry with ${strategy.type} marketing strategy
- Color scheme: Primary color ${colors.primary}, Secondary color ${colors.secondary}
- Style: Modern, clean, high-conversion design
- Layout: Leave space at top for a logo overlay, leave space at bottom for text overlay
- Aspect ratio: Perfect 1:1 square (Instagram post)
- Quality: Ultra high resolution, professional, premium feel
- DO NOT include any text in the image itself
- DO NOT include any logos or brand marks
- Background should represent ${businessType} context subtly
- Use gradients and lighting that complement the color scheme
- Professional photography style, suitable for ${profile.category || 'business'} niche

The image should evoke trust, professionalism, and urgency - perfect for a ${strategy.type} marketing campaign.`;

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
