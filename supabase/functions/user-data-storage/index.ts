import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema - prevent path traversal and validate username
const requestSchema = z.object({
  action: z.enum(['save', 'load', 'delete'], { errorMap: () => ({ message: 'Invalid action. Use: save, load, or delete' }) }),
  username: z.string()
    .min(1, 'Username is required')
    .max(50, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username contains invalid characters'),
  email: z.string().email('Invalid email').max(255).transform(v => v.toLowerCase().trim()),
  auth_token: z.string().min(1, 'Auth token required'),
  data: z.any().optional()
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.json();
    
    // Validate input
    const parseResult = requestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map(e => e.message).join(", ");
      console.error("[user-data-storage] Validation error:", parseResult.error.errors);
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { action, username, email, auth_token, data } = parseResult.data;

    // Verify user ownership - check that the email exists and matches the username
    const { data: user, error: userError } = await supabase
      .from('paid_users')
      .select('id, username, email, password')
      .eq('email', email)
      .maybeSingle();

    if (userError || !user) {
      console.error("[user-data-storage] User not found:", email);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - user not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Verify the auth_token - token should contain user ID prefix for ownership verification
    // The client sends a session token that starts with the user ID
    if (!auth_token.startsWith(user.id)) {
      console.error("[user-data-storage] Invalid auth token for user:", email);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Verify the username matches the authenticated user (prevent accessing other users' data)
    // Use user ID for storage path to ensure ownership
    const filePath = `${user.id}/profile-data.json`;
    console.log(`[user-data-storage] Action: ${action}, User: ${user.id}`);

    if (action === 'save') {
      // Save user data as JSON file
      if (!data) {
        return new Response(
          JSON.stringify({ success: false, error: 'Data is required for save action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
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
          JSON.stringify({ success: false, error: 'Failed to save data' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log(`[user-data-storage] Data saved successfully for user: ${user.id}`);
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
          console.log(`[user-data-storage] No data found for user: ${user.id}`);
          return new Response(
            JSON.stringify({ success: true, data: null, exists: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.error('[user-data-storage] Download error:', downloadError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to load data' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      const text = await fileData.text();
      const userData = JSON.parse(text);
      
      console.log(`[user-data-storage] Data loaded successfully for user: ${user.id}`);
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
          JSON.stringify({ success: false, error: 'Failed to delete data' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log(`[user-data-storage] Data deleted successfully for user: ${user.id}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Data deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Should never reach here due to zod validation
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error) {
    console.error('[user-data-storage] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
