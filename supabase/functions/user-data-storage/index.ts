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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, username, data } = await req.json();
    
    if (!username) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const filePath = `${username}/profile-data.json`;
    console.log(`[user-data-storage] Action: ${action}, User: ${username}`);

    if (action === 'save') {
      // Save user data as JSON file
      if (!data) {
        return new Response(
          JSON.stringify({ success: false, error: 'Data is required for save action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });

      // Upload/update the file
      const { error: uploadError } = await supabase.storage
        .from('user-data')
        .upload(filePath, blob, {
          contentType: 'application/json',
          upsert: true
        });

      if (uploadError) {
        console.error('[user-data-storage] Upload error:', uploadError);
        return new Response(
          JSON.stringify({ success: false, error: uploadError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[user-data-storage] Data saved successfully for user: ${username}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Data saved successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'load') {
      // Load user data from JSON file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('user-data')
        .download(filePath);

      if (downloadError) {
        // File doesn't exist yet - return empty data
        if (downloadError.message.includes('not found') || downloadError.message.includes('Object not found')) {
          console.log(`[user-data-storage] No data found for user: ${username}`);
          return new Response(
            JSON.stringify({ success: true, data: null, exists: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.error('[user-data-storage] Download error:', downloadError);
        return new Response(
          JSON.stringify({ success: false, error: downloadError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const text = await fileData.text();
      const userData = JSON.parse(text);
      
      console.log(`[user-data-storage] Data loaded successfully for user: ${username}`);
      return new Response(
        JSON.stringify({ success: true, data: userData, exists: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'delete') {
      // Delete user data file
      const { error: deleteError } = await supabase.storage
        .from('user-data')
        .remove([filePath]);

      if (deleteError) {
        console.error('[user-data-storage] Delete error:', deleteError);
        return new Response(
          JSON.stringify({ success: false, error: deleteError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[user-data-storage] Data deleted successfully for user: ${username}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Data deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action. Use: save, load, or delete' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[user-data-storage] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
