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

    console.log('[get-active-clients] Fetching profiles from user_sessions...');

    // Fetch all user sessions with profile data
    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select('profile_sessions')
      .not('profile_sessions', 'is', null);

    if (error) {
      console.error('[get-active-clients] Error:', error.message);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Extract profiles from all sessions
    const allProfiles: any[] = [];
    
    for (const session of (sessions || [])) {
      const profileSessions = session.profile_sessions as any[];
      if (Array.isArray(profileSessions)) {
        for (const ps of profileSessions) {
          if (ps.profile) {
            allProfiles.push({
              username: ps.profile.username || '',
              profilePicture: ps.profile.profilePicture || ps.profile.profile_pic_url || '',
              followers: ps.profile.followers || ps.profile.follower_count || 0,
            });
          }
        }
      }
    }

    // Filter valid profiles and remove duplicates
    const validProfiles = allProfiles.filter(p => p.username && p.followers > 0);
    
    const uniqueClients = validProfiles.reduce((acc: any[], client: any) => {
      if (!acc.find((c: any) => c.username.toLowerCase() === client.username.toLowerCase())) {
        acc.push(client);
      }
      return acc;
    }, []);

    // Sort by followers descending
    uniqueClients.sort((a, b) => b.followers - a.followers);

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
