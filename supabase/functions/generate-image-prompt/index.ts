const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { description, format, colors } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

    const dimensions = format === 'stories' ? '1080x1920 (formato stories vertical)' : '1080x1350 (formato feed Instagram)';
    const colorsList = (colors && colors.length > 0)
      ? colors.map((c: string, i: number) => `Cor ${i + 1}: ${c}`).join(', ')
      : 'Paleta livre profissional';

    const systemPrompt = `Você é um diretor de arte e designer gráfico sênior especialista em criativos para Instagram. Sua tarefa é gerar um PROMPT COMPLETO E PROFISSIONAL em português para criação de uma imagem por IA generativa (estilo MidJourney/DALL-E/Gemini).

REGRAS OBRIGATÓRIAS:
1. O prompt DEVE começar exatamente com: "Crie uma imagem"
2. Inclua o formato exato: ${dimensions}
3. Use as cores informadas pelo usuário como paleta principal: ${colorsList}
4. Estilo: minimalista, profissional, qualidade de designer gráfico nível sênior
5. Descreva: composição, iluminação, tipografia (se houver texto), hierarquia visual, espaçamento, sombras suaves, gradientes sutis, profundidade
6. Mencione: alta resolução, acabamento premium, estética clean, contraste equilibrado
7. NÃO inclua explicações, apenas o prompt pronto para copiar e colar
8. Mantenha entre 150 e 400 palavras
9. Português brasileiro, fluido e técnico`;

    const userPrompt = `Descrição do usuário sobre a imagem desejada:
"${description}"

Formato: ${dimensions}
Cores escolhidas: ${colorsList}

Gere agora o prompt profissional completo começando com "Crie uma imagem".`;

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
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Muitas requisições. Aguarde um momento.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos esgotados. Adicione créditos na workspace.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw new Error(`AI Gateway error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const prompt = data.choices?.[0]?.message?.content?.trim() || '';

    return new Response(JSON.stringify({ prompt }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    console.error('generate-image-prompt error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
