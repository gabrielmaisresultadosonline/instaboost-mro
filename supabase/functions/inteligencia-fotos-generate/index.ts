import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getRetryAfterSeconds(headers: Headers): number | null {
  const raw = headers.get("retry-after");
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { templateId, inputImageUrl, userId, format } = await req.json();

    if (!templateId || !inputImageUrl || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Dados incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Google Gemini API key from settings
    const { data: apiKeySetting, error: settingError } = await supabase
      .from("inteligencia_fotos_settings")
      .select("setting_value")
      .eq("setting_key", "google_gemini_api_key")
      .single();

    if (settingError || !apiKeySetting?.setting_value) {
      console.error("API key not configured:", settingError);
      return new Response(
        JSON.stringify({ success: false, error: "API key do Google Gemini não configurada. Configure nas configurações do admin." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiApiKey = apiKeySetting.setting_value;

    // Get template with prompt
    const { data: template, error: templateError } = await supabase
      .from("inteligencia_fotos_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ success: false, error: "Template não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine dimensions based on format - HIGH QUALITY 1K-2K
    const dimensions = format === "stories" 
      ? { width: 1080, height: 1920 }  // 1K Stories (Full HD vertical)
      : { width: 2048, height: 1638 }; // 2K Post (high quality landscape)

    // Build the prompt - USER'S PHOTO IS THE MAIN SUBJECT
    // Template is only for style/scene reference
    const fullPrompt = `CRITICAL INSTRUCTION: Generate a NEW high-quality image using the PERSON from the FIRST uploaded image as the MAIN SUBJECT.

${template.prompt}

MANDATORY REQUIREMENTS:
1. The person's face, body, and features from the FIRST image (user's photo) MUST be preserved EXACTLY - same face, same body proportions, same appearance
2. The SECOND image (template) is ONLY for style, scene, composition, and aesthetic reference - do NOT use the person from the template
3. Place the person from the first image INTO the scene/style shown in the template
4. Output resolution: ${dimensions.width}x${dimensions.height} pixels
5. Fill the ENTIRE canvas edge-to-edge with no margins or empty space
6. Master quality, Full HD to 4K, 90% sharpness, realistic textures
7. Hyper-realistic photography appearance, professional lighting

The final image must look like a professional photo of the person from the first image, styled according to the template's aesthetic.`;

    console.log("Generating image with Google Gemini API...");
    console.log("Template prompt:", template.prompt);
    console.log("Format:", format, "Dimensions:", dimensions);
    console.log("User photo will be used as main subject");

    // Fetch ONLY the user's image - this is what we're generating with
    const userImageResponse = await fetch(inputImageUrl);
    if (!userImageResponse.ok) {
      console.error("Failed to fetch user image:", userImageResponse.status);
      return new Response(
        JSON.stringify({ success: false, error: "Não foi possível carregar sua foto. Tente novamente." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userImageBuffer = await userImageResponse.arrayBuffer();
    const userImageBase64 = btoa(String.fromCharCode(...new Uint8Array(userImageBuffer)));
    const userImageMime = userImageResponse.headers.get("content-type") || "image/jpeg";

    // Also fetch template for style reference
    let templateImageBase64 = "";
    let templateImageMime = "image/jpeg";
    try {
      const templateImageResponse = await fetch(template.image_url);
      if (templateImageResponse.ok) {
        const templateImageBuffer = await templateImageResponse.arrayBuffer();
        templateImageBase64 = btoa(String.fromCharCode(...new Uint8Array(templateImageBuffer)));
        templateImageMime = templateImageResponse.headers.get("content-type") || "image/jpeg";
      }
    } catch (e) {
      console.log("Template image fetch failed, proceeding with prompt only");
    }

    // Prepare request body - USER IMAGE FIRST (main subject), template second (style reference)
    const parts: any[] = [
      { text: fullPrompt },
      {
        inline_data: {
          mime_type: userImageMime,
          data: userImageBase64
        }
      }
    ];

    // Add template image as style reference if available
    if (templateImageBase64) {
      parts.push({
        inline_data: {
          mime_type: templateImageMime,
          data: templateImageBase64
        }
      });
    }

    const requestBody = {
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"]
      }
    };

    // IMPORTANT: do NOT retry on 429 here.
    // Retrying immediately will multiply requests and make rate limiting worse.
    // Using gemini-2.0-flash-exp-image-generation - the official experimental model that supports image output
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorText);
      
      if (geminiResponse.status === 429) {
        const retryAfter = getRetryAfterSeconds(geminiResponse.headers) ?? 60;
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "API do Google Gemini está sobrecarregada. Aguarde 1-2 minutos e tente novamente.",
            retryAfter
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (geminiResponse.status === 403) {
        return new Response(
          JSON.stringify({ success: false, error: "API key inválida ou sem permissões para geração de imagens." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: `Erro da API Gemini: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    console.log("Gemini response received");

    // Extract the generated image from Gemini response
    let generatedImageBase64 = null;
    
    if (geminiData.candidates && geminiData.candidates[0]?.content?.parts) {
      for (const part of geminiData.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          generatedImageBase64 = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!generatedImageBase64) {
      console.error("No image in response:", JSON.stringify(geminiData).substring(0, 1000));
      return new Response(
        JSON.stringify({ success: false, error: "Imagem não foi gerada. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract base64 data and upload to storage
    const base64Data = generatedImageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const fileName = `generations/${userId}/${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("inteligencia-fotos")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao salvar imagem gerada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: urlData } = supabase.storage
      .from("inteligencia-fotos")
      .getPublicUrl(uploadData.path);

    const generatedImageUrl = urlData.publicUrl;

    // Save generation to database
    const { error: insertError } = await supabase
      .from("inteligencia_fotos_generations")
      .insert({
        user_id: userId,
        template_id: templateId,
        input_image_url: inputImageUrl,
        generated_image_url: generatedImageUrl,
        format: format || "post",
      });

    if (insertError) {
      console.error("Insert generation error:", insertError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        generatedImageUrl,
        message: "Imagem gerada com sucesso!"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno ao gerar imagem" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});