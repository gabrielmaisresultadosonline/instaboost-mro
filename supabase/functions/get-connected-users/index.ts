import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Limit: only the 200 most recent sessions (avoids upstream timeout on large tables)
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 500);

    const { data, error } = await supabase
      .from('user_sessions')
      .select('squarecloud_username, email, days_remaining, last_access, updated_at')
      .not('last_access', 'is', null)
      .order('last_access', { ascending: false })
      .limit(limit)
      .abortSignal(AbortSignal.timeout(10000)); // Set a 10s timeout for the query itself

    if (error) {
      console.error('[get-connected-users] Error:', error.message);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`[get-connected-users] Found ${data?.length || 0} users`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        users: data || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-connected-users] Error:', error);
    const isTimeout = error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'));
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: isTimeout ? 'Database request timed out' : (error instanceof Error ? error.message : 'Unknown error')
      }),
      { status: isTimeout ? 504 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});