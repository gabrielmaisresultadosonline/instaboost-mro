import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Build weserv proxy URL
const toWeservUrl = (url: string): string => {
  const original = unwrapImageUrl(url || '');
  if (!original) return '';
  if (original.includes('images.weserv.nl')) return original;
  if (!original.startsWith('http')) return '';
  return `https://images.weserv.nl/?url=${encodeURIComponent(original)}&w=200&h=200&fit=cover&output=jpg&q=85`;
};

// Download and cache a single profile image
const cacheProfileImage = async (
  supabase: any,
  supabaseUrl: string,
  username: string,
  sourceUrl: string
): Promise<{ username: string; success: boolean; url?: string; error?: string }> => {
  if (!username || !sourceUrl) {
    return { username, success: false, error: 'Missing data' };
  }

  const fileName = `${username.toLowerCase()}.jpg`;
  const folder = 'profiles';
  const objectPath = `${folder}/${fileName}`;
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/profile-cache/${objectPath}`;

  // Check if already cached
  const { data: existing } = await supabase.storage
    .from('profile-cache')
    .list(folder, { search: fileName });

  if (existing && existing.length > 0) {
    return { username, success: true, url: publicUrl };
  }

  const fetchUrl = toWeservUrl(sourceUrl);
  if (!fetchUrl) {
    return { username, success: false, error: 'Invalid source URL' };
  }

  try {
    const resp = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });

    if (!resp.ok) {
      return { username, success: false, error: `Fetch failed: ${resp.status}` };
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
      return { username, success: false, error: uploadError.message };
    }

    return { username, success: true, url: publicUrl };
  } catch (e) {
    return { username, success: false, error: String(e) };
  }
};

// Process profiles in batches with concurrency control
const processBatch = async (
  supabase: any,
  supabaseUrl: string,
  profiles: Array<{ username: string; imageUrl: string }>,
  concurrency: number = 5
): Promise<{ cached: number; failed: number; skipped: number; errors: string[] }> => {
  let cached = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  const processItem = async (profile: { username: string; imageUrl: string }) => {
    const result = await cacheProfileImage(supabase, supabaseUrl, profile.username, profile.imageUrl);
    if (result.success) {
      if (result.url?.includes('profile-cache')) {
        cached++;
      } else {
        skipped++;
      }
    } else {
      failed++;
      if (result.error) {
        errors.push(`${profile.username}: ${result.error}`);
      }
    }
  };

  // Process with concurrency limit
  const queue = [...profiles];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < concurrency; i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) {
          await processItem(item);
        }
      }
    })());
  }

  await Promise.all(workers);

  return { cached, failed, skipped, errors: errors.slice(0, 20) }; // Limit errors to first 20
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { action, batchSize = 100, offset = 0 } = body;

    // Load admin sync data
    const filePath = 'admin/sync-data.json';
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('user-data')
      .download(filePath);

    if (downloadError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin data not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const text = await fileData.text();
    const adminData = JSON.parse(text);
    const rawProfiles: any[] = Array.isArray(adminData?.profiles) ? adminData.profiles : [];

    // Extract unique profiles with image URLs
    const seen = new Set<string>();
    const allProfiles = rawProfiles
      .map((p) => {
        const username = String(p?.username ?? p?.profile?.username ?? '').trim().toLowerCase();
        const imageUrl = String(
          p?.profilePicUrl ??
            p?.profilePicture ??
            p?.profile_pic_url ??
            p?.profile_image_link ??
            p?.profile?.profilePicUrl ??
            p?.profile?.profilePicture ??
            ''
        ).trim();

        return { username, imageUrl };
      })
      .filter((p) => {
        if (!p.username || !p.imageUrl || seen.has(p.username)) return false;
        seen.add(p.username);
        return true;
      });

    const total = allProfiles.length;

    if (action === 'status') {
      // Just return status without processing
      // Count cached images
      const { data: cachedFiles } = await supabase.storage
        .from('profile-cache')
        .list('profiles', { limit: 2000 });

      const cachedCount = cachedFiles?.length || 0;

      return new Response(
        JSON.stringify({
          success: true,
          total,
          cached: cachedCount,
          remaining: total - cachedCount,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'process-batch') {
      // Process a specific batch
      const batch = allProfiles.slice(offset, offset + batchSize);
      
      console.log(`[cache-profile-images] Processing batch: offset=${offset}, size=${batch.length}, total=${total}`);

      const result = await processBatch(supabase, supabaseUrl, batch, 8);

      const hasMore = offset + batchSize < total;

      return new Response(
        JSON.stringify({
          success: true,
          ...result,
          processed: batch.length,
          total,
          offset,
          hasMore,
          nextOffset: hasMore ? offset + batchSize : null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'process-all') {
      // Start background processing of ALL profiles
      const processAllInBackground = async () => {
        let currentOffset = 0;
        const batchSz = 50;
        let totalCached = 0;
        let totalFailed = 0;

        while (currentOffset < total) {
          const batch = allProfiles.slice(currentOffset, currentOffset + batchSz);
          console.log(`[cache-profile-images] Background: processing ${currentOffset}-${currentOffset + batch.length} of ${total}`);
          
          const result = await processBatch(supabase, supabaseUrl, batch, 6);
          totalCached += result.cached;
          totalFailed += result.failed;
          
          currentOffset += batchSz;
          
          // Small delay between batches to avoid rate limiting
          await new Promise(r => setTimeout(r, 500));
        }

        console.log(`[cache-profile-images] Background complete: cached=${totalCached}, failed=${totalFailed}`);
      };

      // Use EdgeRuntime.waitUntil for background processing
      // @ts-ignore
      if (typeof EdgeRuntime !== 'undefined') {
        // @ts-ignore
        EdgeRuntime.waitUntil(processAllInBackground());
      } else {
        // Fallback for non-Edge environments
        processAllInBackground();
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Background caching started',
          total,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default: return info
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Use action: status, process-batch, or process-all',
        total,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[cache-profile-images] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
