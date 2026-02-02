import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "API key não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { templateId, inputImageUrl, userId, format } = await req.json();

    if (!templateId || !inputImageUrl || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Dados incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    console.log("Generating image with Nano Banana...");
    console.log("Template prompt:", template.prompt);
    console.log("Format:", format, "Dimensions:", dimensions);

    // Call Lovable AI (Nano Banana) for image generation
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: fullPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: inputImageUrl
                }
              },
              {
                type: "image_url",
                image_url: {
                  url: template.image_url
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Muitas requisições. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Créditos insuficientes. Entre em contato com o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: "Erro ao gerar imagem" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    const generatedImageBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageBase64) {
      console.error("No image in response:", JSON.stringify(aiData).substring(0, 500));
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
