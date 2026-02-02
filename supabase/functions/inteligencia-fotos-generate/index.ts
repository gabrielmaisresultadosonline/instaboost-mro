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

    // Determine dimensions based on format
    const dimensions = format === "stories" 
      ? { width: 1080, height: 1920 }
      : { width: 1350, height: 1080 };

    // Build the prompt combining template prompt with user image
    const fullPrompt = `${template.prompt}

Use the person's face/body from the reference image provided to create a new image with these exact characteristics. 
The output should be a high-quality image at ${dimensions.width}x${dimensions.height} pixels.
Maintain the person's features exactly as shown in the reference.
Ultra high resolution, professional quality.`;

    console.log("Generating image with Google Gemini API...");
    console.log("Template prompt:", template.prompt);
    console.log("Format:", format, "Dimensions:", dimensions);

    // Fetch images and convert to base64
    const [userImageResponse, templateImageResponse] = await Promise.all([
      fetch(inputImageUrl),
      fetch(template.image_url)
    ]);

    const userImageBuffer = await userImageResponse.arrayBuffer();
    const templateImageBuffer = await templateImageResponse.arrayBuffer();

    const userImageBase64 = btoa(String.fromCharCode(...new Uint8Array(userImageBuffer)));
    const templateImageBase64 = btoa(String.fromCharCode(...new Uint8Array(templateImageBuffer)));

    // Get MIME types
    const userImageMime = userImageResponse.headers.get("content-type") || "image/jpeg";
    const templateImageMime = templateImageResponse.headers.get("content-type") || "image/jpeg";

    // Prepare request body
    const requestBody = {
      contents: [
        {
          parts: [
            { text: fullPrompt },
            {
              inline_data: {
                mime_type: userImageMime,
                data: userImageBase64
              }
            },
            {
              inline_data: {
                mime_type: templateImageMime,
                data: templateImageBase64
              }
            }
          ]
        }
      ],
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