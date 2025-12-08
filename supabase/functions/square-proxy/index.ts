import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SQUARE_API_BASE = 'https://dashboardmroinstagramvini-online.squareweb.app';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, method, body, contentType } = await req.json();

    const fetchOptions: RequestInit = {
      method: method || 'POST',
      headers: {},
    };

    if (body) {
      if (contentType === 'form') {
        fetchOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        fetchOptions.body = body;
      } else {
        fetchOptions.headers = { 'Content-Type': 'application/json' };
        fetchOptions.body = JSON.stringify(body);
      }
    }

    const response = await fetch(`${SQUARE_API_BASE}${endpoint}`, fetchOptions);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Square proxy error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
