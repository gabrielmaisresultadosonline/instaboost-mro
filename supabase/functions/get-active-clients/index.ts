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

// Build a stable proxy URL using weserv (and force jpg output)
const toWeservUrl = (url: string): string => {
  const original = unwrapImageUrl(url || '');
  if (!original) return '';

  // If already a weserv url, use as-is
  if (original.includes('images.weserv.nl')) return original;

  if (!original.startsWith('http')) return '';

  return `https://images.weserv.nl/?url=${encodeURIComponent(original)}&w=200&h=200&fit=cover&output=jpg&q=85`;
};

const dicebearFallback = (username: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${username}&backgroundColor=10b981`;

const publicCacheUrl = (supabaseUrl: string, objectPath: string) =>
  `${supabaseUrl}/storage/v1/object/public/profile-cache/${objectPath}`;

// Cache in our own public storage (so it works on VPS + mobile consistently)
const ensureCachedProfileImage = async (
  supabase: any,
  supabaseUrl: string,
  username: string,
  sourceUrl: string
): Promise<string> => {
  if (!username) return '';

  const fileName = `${username.toLowerCase()}.jpg`;
  const folder = 'profiles';
  const objectPath = `${folder}/${fileName}`;

  // Check if already cached
  const { data: existing } = await supabase.storage
    .from('profile-cache')
    .list(folder, { search: fileName });

  if (existing && existing.length > 0) {
    return publicCacheUrl(supabaseUrl, objectPath);
  }

  const fetchUrl = toWeservUrl(sourceUrl);
  if (!fetchUrl) return dicebearFallback(username);

  try {
    const resp = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });

    if (!resp.ok) {
      console.log(`[get-active-clients] Image fetch failed for ${username}: ${resp.status}`);
      return fetchUrl;
    }

    const blob = await resp.blob();
    const contentType = resp.headers.get('content-type') || 'image/jpeg';

    const { error: uploadError } = await supabase.storage
      .from('profile-cache')
      .upload(objectPath, blob, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.log(`[get-active-clients] Image upload failed for ${username}:`, uploadError.message);
      return fetchUrl;
    }

    return publicCacheUrl(supabaseUrl, objectPath);
  } catch (e) {
    console.log(`[get-active-clients] Image cache error for ${username}:`, e);
    return fetchUrl;
  }
};

// Simple concurrency control to avoid timeouts when loading larger pages
const mapWithConcurrency = async (items: any[], concurrency: number, mapper: (item: any, idx: number) => Promise<any>) => {
  const results = new Array(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await mapper(items[i], i);
    }
  };

  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, worker);
  await Promise.all(workers);
  return results;
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

    // Map profiles and try multiple picture fields (admin data can vary)
    const mapped = rawProfiles
      .map((p) => {
        const username = String(p?.username ?? p?.profile?.username ?? '').trim();
        const pic = String(
          p?.profilePicUrl ??
            p?.profilePicture ??
            p?.profile_pic_url ??
            p?.profile_image_link ??
            p?.profile?.profilePicUrl ??
            p?.profile?.profilePicture ??
            ''
        ).trim();

        return {
          username,
          originalImageUrl: pic,
          followers: safeNumber(p?.followers ?? p?.profile?.followers, 0),
        };
      })
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

    // Ensure images are cached in our own storage (more reliable on VPS/mobile)
    const clientsWithImages = await mapWithConcurrency(page, 8, async (p) => {
      const imageUrl = await ensureCachedProfileImage(supabase, supabaseUrl, p.username, p.originalImageUrl);
      return {
        username: p.username,
        profilePicture: imageUrl,
        followers: p.followers,
      };
    });

    const hasMore = offset + limit < total;

    console.log('[get-active-clients] Returning page', { total, count: clientsWithImages.length, hasMore });

    return new Response(
      JSON.stringify({ success: true, clients: clientsWithImages, total, hasMore }),
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
