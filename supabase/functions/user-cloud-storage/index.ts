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

    const { action, username, email, daysRemaining, profileSessions, archivedProfiles } = await req.json();
    
    console.log(`📦 user-cloud-storage: action=${action}, username=${username}`);

    if (!username) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LOAD - Get user data from database
    if (action === 'load') {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('squarecloud_username', username.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error('Error loading user data:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!data) {
        console.log(`📦 No existing data for user ${username}`);
        return new Response(
          JSON.stringify({ success: true, exists: false, data: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`📦 Loaded data for ${username}: ${data.profile_sessions?.length || 0} profiles`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          exists: true, 
          data: {
            email: data.email,
            daysRemaining: data.days_remaining,
            profileSessions: data.profile_sessions || [],
            archivedProfiles: data.archived_profiles || [],
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SAVE - Save/update user data to database
    if (action === 'save') {
      // First check if user exists
      const { data: existing } = await supabase
        .from('user_sessions')
        .select('id, email')
        .eq('squarecloud_username', username.toLowerCase())
        .maybeSingle();

      const saveData: any = {
        squarecloud_username: username.toLowerCase(),
        days_remaining: daysRemaining || 365,
        profile_sessions: profileSessions || [],
        archived_profiles: archivedProfiles || [],
      };

      // Only set email if:
      // 1. User doesn't exist yet, OR
      // 2. User exists but has no email set
      if (email && (!existing || !existing.email)) {
        saveData.email = email;
      }

      let result;
      if (existing) {
        // Update existing record (don't change email if already set)
        const { data, error } = await supabase
          .from('user_sessions')
          .update(saveData)
          .eq('id', existing.id)
          .select()
          .single();
        result = { data, error };
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('user_sessions')
          .insert(saveData)
          .select()
          .single();
        result = { data, error };
      }

      if (result.error) {
        console.error('Error saving user data:', result.error);
        return new Response(
          JSON.stringify({ success: false, error: result.error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`📦 Saved data for ${username}: ${profileSessions?.length || 0} profiles`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            email: result.data.email,
            daysRemaining: result.data.days_remaining,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET_EMAIL - Check if email is locked for this user
    if (action === 'get_email') {
      const { data } = await supabase
        .from('user_sessions')
        .select('email')
        .eq('squarecloud_username', username.toLowerCase())
        .maybeSingle();

      return new Response(
        JSON.stringify({ 
          success: true, 
          email: data?.email || null,
          isLocked: !!data?.email
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in user-cloud-storage:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
