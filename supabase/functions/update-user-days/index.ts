import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SQUARE_API_BASE = 'https://dashboardmroinstagramvini-online.squareweb.app';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[UPDATE-USER-DAYS] Starting daily update...');

    // Fetch all users from SquareCloud
    const response = await fetch(`${SQUARE_API_BASE}/obter-usuarios`);
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[UPDATE-USER-DAYS] Failed to parse SquareCloud response');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse SquareCloud response' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data.success || !Array.isArray(data.usuarios)) {
      console.error('[UPDATE-USER-DAYS] Invalid response format from SquareCloud');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid response from SquareCloud' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const usuarios = data.usuarios;
    console.log(`[UPDATE-USER-DAYS] Found ${usuarios.length} users to update`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update user_sessions table with new days_remaining values
    let updated = 0;
    let errors = 0;

    for (const usuario of usuarios) {
      const username = usuario.ID;
      const daysRemaining = usuario.data?.dataDeExpiracao ?? 0;

      try {
        // Update user_sessions table
        const { error } = await supabase
          .from('user_sessions')
          .update({ 
            days_remaining: daysRemaining,
            updated_at: new Date().toISOString()
          })
          .eq('squarecloud_username', username);

        if (error) {
          // User might not exist in our database yet - that's ok
          console.log(`[UPDATE-USER-DAYS] User ${username} not in database (or error): ${error.message}`);
        } else {
          updated++;
        }
      } catch (e) {
        console.error(`[UPDATE-USER-DAYS] Error updating ${username}:`, e);
        errors++;
      }
    }

    const result = {
      success: true,
      message: `Updated ${updated} users, ${errors} errors`,
      totalUsers: usuarios.length,
      updated,
      errors,
      timestamp: new Date().toISOString()
    };

    console.log('[UPDATE-USER-DAYS] Update complete:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[UPDATE-USER-DAYS] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
