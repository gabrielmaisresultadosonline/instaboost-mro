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

    console.log('[get-active-clients] Fetching profiles from squarecloud_user_profiles...');

    // Fetch all profiles with their data
    const { data: profiles, error } = await supabase
      .from('squarecloud_user_profiles')
      .select('instagram_username, profile_data, synced_at')
      .order('synced_at', { ascending: false });

    if (error) {
      console.error('[get-active-clients] Error:', error.message);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Extract only public info: photo, username, followers
    const activeClients = (profiles || []).map((profile: any) => {
      const data = profile.profile_data || {};
      return {
        username: profile.instagram_username || data.username || '',
        profilePicture: data.profilePicture || data.profile_pic_url || '',
        followers: data.followers || data.follower_count || 0,
      };
    }).filter((client: any) => client.username && client.followers > 0);

    // Remove duplicates by username
    const uniqueClients = activeClients.reduce((acc: any[], client: any) => {
      if (!acc.find((c: any) => c.username === client.username)) {
        acc.push(client);
      }
      return acc;
    }, []);

    console.log(`[get-active-clients] Found ${uniqueClients.length} unique active clients`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        clients: uniqueClients
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-active-clients] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
