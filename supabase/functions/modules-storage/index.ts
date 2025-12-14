import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create service client for storage operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { action, data, platform } = await req.json();
    
    // Modules data is stored as separate files per platform
    // MRO uses the original path for backward compatibility
    const filePath = platform === 'zapmro' ? 'admin/zapmro-modules-data.json' : 'admin/modules-data.json';
    console.log(`[modules-storage] Action: ${action}, Platform: ${platform || 'mro'}, Path: ${filePath}`);

    if (action === 'save') {
      // Save modules data as JSON file
      if (!data) {
        return new Response(
          JSON.stringify({ success: false, error: 'Data is required for save action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });

      // Upload/update the file using service client
      const { error: uploadError } = await supabaseAdmin.storage
        .from('user-data')
        .upload(filePath, blob, {
          contentType: 'application/json',
          upsert: true
        });

      if (uploadError) {
        console.error('[modules-storage] Upload error:', uploadError);
        return new Response(
          JSON.stringify({ success: false, error: uploadError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[modules-storage] Modules saved: ${data.modules?.length || 0} modules`);
      return new Response(
        JSON.stringify({ success: true, message: 'Modules saved successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'load') {
      // Load modules data from JSON file using service client
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from('user-data')
        .download(filePath);

      if (downloadError) {
        // File doesn't exist yet - return empty data
        if (downloadError.message.includes('not found') || downloadError.message.includes('Object not found')) {
          console.log(`[modules-storage] No modules data found`);
          return new Response(
            JSON.stringify({ success: true, data: null, exists: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.error('[modules-storage] Download error:', downloadError);
        return new Response(
          JSON.stringify({ success: false, error: downloadError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const text = await fileData.text();
      const modulesData = JSON.parse(text);
      
      console.log(`[modules-storage] Modules loaded: ${modulesData.modules?.length || 0} modules`);
      return new Response(
        JSON.stringify({ success: true, data: modulesData, exists: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action. Use: save or load' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[modules-storage] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});