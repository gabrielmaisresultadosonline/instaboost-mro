import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Body = {
  limit?: number;
  offset?: number;
};

const safeNumber = (value: unknown, fallback: number) => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

// Extract original URL if wrapped in weserv proxy
const unwrapImageUrl = (url: string): string => {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname === 'images.weserv.nl') {
      const original = u.searchParams.get('url');
      return original ? decodeURIComponent(original) : url;
    }
  } catch {
    // ignore
  }
  return url;
};

// Cache image in our storage and return public URL
const cacheProfileImage = async (
  supabase: any,
  username: string,
  imageUrl: string,
  supabaseUrl: string
): Promise<string> => {
  if (!imageUrl || !username) return '';

  const originalUrl = unwrapImageUrl(imageUrl);
  if (!originalUrl) return '';

  const fileName = `${username.toLowerCase()}.jpg`;
  const bucketName = 'profile-cache';

  // Check if already cached
  const { data: existingFile } = await supabase.storage
    .from(bucketName)
    .list('', { search: fileName });

  if (existingFile && existingFile.length > 0) {
    // Return cached URL
    return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fileName}`;
  }

  // Download image from Instagram CDN
  try {
    const response = await fetch(originalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.instagram.com/',
      },
    });

    if (!response.ok) {
      console.log(`[get-active-clients] Failed to fetch image for ${username}: ${response.status}`);
      return '';
    }

    const imageBlob = await response.blob();
    
    // Upload to our storage
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, imageBlob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.log(`[get-active-clients] Failed to upload image for ${username}:`, uploadError.message);
      return '';
    }

    console.log(`[get-active-clients] Cached image for ${username}`);
    return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fileName}`;
  } catch (err) {
    console.log(`[get-active-clients] Error caching image for ${username}:`, err);
    return '';
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: Body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(safeNumber(body.limit, 60), 1), 200);
    const offset = Math.max(safeNumber(body.offset, 0), 0);

    console.log('[get-active-clients] Loading admin sync-data.json...', { limit, offset });

    // Read from the same cloud file the admin uses (admin/sync-data.json)
    const filePath = 'admin/sync-data.json';
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('user-data')
      .download(filePath);

    if (downloadError) {
      const msg = downloadError.message || '';
      const isNotFound = msg.includes('not found') || msg.includes('Object not found');
      console.log('[get-active-clients] No admin data found', { isNotFound, msg });

      return new Response(
        JSON.stringify({ success: true, clients: [], total: 0, hasMore: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const text = await fileData.text();
    const adminData = JSON.parse(text);

    const rawProfiles: any[] = Array.isArray(adminData?.profiles) ? adminData.profiles : [];

    // Map profiles with original URLs
    const mapped = rawProfiles
      .map((p) => ({
        username: String(p?.username ?? '').trim(),
        originalImageUrl: String(p?.profilePicUrl ?? '').trim(),
        followers: safeNumber(p?.followers, 0),
      }))
      .filter((p) => p.username && p.followers > 0);

    // De-duplicate by username
    const seen = new Set<string>();
    const unique = mapped.filter((p) => {
      const key = p.username.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by followers desc
    unique.sort((a, b) => b.followers - a.followers);

    const total = unique.length;
    const page = unique.slice(offset, offset + limit);

    // Cache images for this page and return our storage URLs
    const clientsWithCachedImages = await Promise.all(
      page.map(async (p) => {
        const cachedUrl = await cacheProfileImage(supabase, p.username, p.originalImageUrl, supabaseUrl);
        return {
          username: p.username,
          profilePicture: cachedUrl, // Now points to our storage
          followers: p.followers,
        };
      })
    );

    const hasMore = offset + limit < total;

    console.log('[get-active-clients] Returning page with cached images', { total, count: clientsWithCachedImages.length, hasMore });

    return new Response(
      JSON.stringify({ success: true, clients: clientsWithCachedImages, total, hasMore }),
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
