import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (msg: string, data?: unknown) =>
  console.log(`[bd-followers] ${msg}`, data ? JSON.stringify(data) : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "check";

    // Get settings
    const { data: settings } = await supabase
      .from("mro_direct_settings")
      .select("*")
      .limit(1)
      .single();

    if (!settings) {
      return json({ success: false, error: "Settings not configured" });
    }

    // ── ACTIVATE: Set baseline and start polling ──
    if (action === "activate") {
      const username = body.username || settings.instagram_username;
      if (!username) {
        return json({ success: false, error: "Instagram username required" });
      }

      // Get current follower count from Graph API
      let currentCount = 0;
      if (settings.page_access_token && settings.instagram_account_id) {
        const countRes = await fetch(
          `https://graph.facebook.com/v21.0/${settings.instagram_account_id}?fields=followers_count&access_token=${settings.page_access_token}`
        );
        const countData = await countRes.json();
        if (countRes.ok && countData.followers_count != null) {
          currentCount = countData.followers_count;
        }
      }

      // Seed the last 10 followers from Bright Data to establish baseline
      log("Seeding last 10 followers via Bright Data...");
      const allFollowers = await scrapeFollowers(username);
      const followers = allFollowers.slice(0, 10); // Only last 10
      
      if (followers.length > 0) {
        // Insert all current followers as "already welcomed" (baseline)
        const inserts = followers.map((f: any) => ({
          instagram_account_id: settings.instagram_account_id || "unknown",
          follower_id: f.id || f.pk || f.username,
          follower_username: f.username,
          welcomed: true, // baseline = already welcomed
        }));

        for (const batch of chunkArray(inserts, 50)) {
          await supabase
            .from("mro_direct_known_followers")
            .upsert(batch, { onConflict: "instagram_account_id,follower_id", ignoreDuplicates: true });
        }
        log(`Seeded ${followers.length} existing followers as baseline`);
      }

      // Update settings
      await supabase
        .from("mro_direct_settings")
        .update({
          follower_polling_active: true,
          follower_count_baseline: currentCount,
          instagram_username: username,
          last_follower_check: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", settings.id);

      return json({
        success: true,
        baseline: currentCount,
        seeded_followers: followers.length,
        message: `Polling ativado! Baseline: ${currentCount} seguidores, ${followers.length} seguidores registrados.`,
      });
    }

    // ── DEACTIVATE ──
    if (action === "deactivate") {
      await supabase
        .from("mro_direct_settings")
        .update({
          follower_polling_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settings.id);

      return json({ success: true, message: "Polling desativado" });
    }

    // ── STATUS ──
    if (action === "status") {
      const { count: knownCount } = await supabase
        .from("mro_direct_known_followers")
        .select("*", { count: "exact", head: true })
        .eq("instagram_account_id", settings.instagram_account_id || "unknown");

      const { count: unwelcomedCount } = await supabase
        .from("mro_direct_known_followers")
        .select("*", { count: "exact", head: true })
        .eq("instagram_account_id", settings.instagram_account_id || "unknown")
        .eq("welcomed", false);

      return json({
        success: true,
        polling_active: settings.follower_polling_active || false,
        baseline: settings.follower_count_baseline,
        last_check: settings.last_follower_check,
        username: settings.instagram_username,
        threshold: settings.follower_check_threshold || 2,
        known_followers: knownCount || 0,
        pending_welcome: unwelcomedCount || 0,
      });
    }

    // ── CHECK: Main polling logic ──
    if (!settings.follower_polling_active) {
      return json({ success: true, skipped: true, reason: "Polling not active" });
    }

    if (!settings.page_access_token || !settings.instagram_account_id) {
      return json({ success: false, error: "Token or IG ID not configured" });
    }

    const threshold = settings.follower_check_threshold || 2;

    // Step 1: Get current follower count from Graph API (free, instant)
    const countRes = await fetch(
      `https://graph.facebook.com/v21.0/${settings.instagram_account_id}?fields=followers_count&access_token=${settings.page_access_token}`
    );
    const countData = await countRes.json();

    if (!countRes.ok) {
      log("Error fetching follower count", countData.error);
      return json({ success: false, error: countData.error?.message || "Graph API error" });
    }

    const currentCount = countData.followers_count;
    const baseline = settings.follower_count_baseline || 0;
    const diff = currentCount - baseline;

    log(`Follower check: baseline=${baseline}, current=${currentCount}, diff=${diff}, threshold=${threshold}`);

    // Update last check time
    await supabase
      .from("mro_direct_settings")
      .update({ last_follower_check: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", settings.id);

    if (diff < threshold) {
      return json({
        success: true,
        checked: true,
        baseline,
        current: currentCount,
        diff,
        threshold,
        message: `Sem novos seguidores suficientes (${diff}/${threshold})`,
      });
    }

    // Step 2: Follower count increased! Scrape followers list with Bright Data
    log(`Follower increase detected! ${diff} new followers. Scraping list...`);
    
    const username = settings.instagram_username;
    if (!username) {
      return json({ success: false, error: "Instagram username not set" });
    }

    const scrapedFollowers = await scrapeFollowers(username);
    
    if (scrapedFollowers.length === 0) {
      log("No followers returned from Bright Data");
      return json({ success: true, checked: true, diff, scrape_failed: true });
    }

    // Step 3: Compare with known followers
    const { data: knownFollowers } = await supabase
      .from("mro_direct_known_followers")
      .select("follower_id, follower_username")
      .eq("instagram_account_id", settings.instagram_account_id);

    const knownIds = new Set((knownFollowers || []).map((f: any) => f.follower_id));
    const knownUsernames = new Set((knownFollowers || []).map((f: any) => f.follower_username?.toLowerCase()));

    const newFollowers = scrapedFollowers.filter((f: any) => {
      const id = f.id || f.pk || f.username;
      return !knownIds.has(String(id)) && !knownUsernames.has(f.username?.toLowerCase());
    });

    log(`Found ${newFollowers.length} new followers out of ${scrapedFollowers.length} scraped`);

    if (newFollowers.length === 0) {
      // Update baseline even if no new detected (count drift)
      await supabase
        .from("mro_direct_settings")
        .update({ follower_count_baseline: currentCount, updated_at: new Date().toISOString() })
        .eq("id", settings.id);

      return json({ success: true, checked: true, new_followers: 0, baseline_updated: currentCount });
    }

    // Step 4: Try to get IGSID via Business Discovery and insert new followers
    let welcomeSent = 0;
    const newFollowerRecords = [];

    for (const follower of newFollowers.slice(0, 20)) { // Limit to 20 per check
      const followerUsername = follower.username;
      let followerId = String(follower.id || follower.pk || follower.username);

      // Try Business Discovery to get Instagram Scoped ID
      try {
        const discoveryRes = await fetch(
          `https://graph.facebook.com/v21.0/${settings.instagram_account_id}?fields=business_discovery.fields(id,username,name)&business_discovery=@${followerUsername}&access_token=${settings.page_access_token}`
        );
        const discoveryData = await discoveryRes.json();
        
        if (discoveryRes.ok && discoveryData.business_discovery?.id) {
          followerId = discoveryData.business_discovery.id;
          log(`Resolved IGSID for @${followerUsername}: ${followerId}`);
        }
      } catch (e) {
        log(`Could not resolve IGSID for @${followerUsername}`, { error: String(e) });
      }

      // Insert as unwelcomed
      newFollowerRecords.push({
        instagram_account_id: settings.instagram_account_id,
        follower_id: followerId,
        follower_username: followerUsername,
        welcomed: false,
      });
    }

    // Batch insert new followers
    if (newFollowerRecords.length > 0) {
      await supabase
        .from("mro_direct_known_followers")
        .upsert(newFollowerRecords, { onConflict: "instagram_account_id,follower_id", ignoreDuplicates: true });
    }

    // Step 5: Update baseline
    await supabase
      .from("mro_direct_settings")
      .update({ follower_count_baseline: currentCount, updated_at: new Date().toISOString() })
      .eq("id", settings.id);

    // Step 6: Trigger the existing poll-followers function to send DMs
    try {
      await fetch(`${supabaseUrl}/functions/v1/mro-direct-poll-followers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({}),
      });
      log("Triggered poll-followers to send welcome DMs");
    } catch (e) {
      log("Error triggering poll-followers", { error: String(e) });
    }

    return json({
      success: true,
      checked: true,
      baseline,
      current: currentCount,
      diff,
      new_followers_detected: newFollowerRecords.length,
      message: `Detectados ${newFollowerRecords.length} novos seguidores! DMs de boas-vindas sendo enviadas.`,
    });

  } catch (error) {
    log("Error", { error: String(error) });
    return json({ success: false, error: String(error) }, 500);
  }
});

// ── BRIGHT DATA SCRAPER ──
async function scrapeFollowers(username: string): Promise<any[]> {
  const apiToken = Deno.env.get("BRIGHTDATA_API_TOKEN");
  const sessionId = Deno.env.get("INSTAGRAM_SESSION_ID");
  
  if (!apiToken) {
    log("BRIGHTDATA_API_TOKEN not configured");
    return [];
  }

  try {
    // Method 1: Use Bright Data Web Unlocker to access Instagram's private API
    const webUnlockerZone = Deno.env.get("BRIGHTDATA_WEB_UNLOCKER_ZONE") || "web_unlocker1";
    
    // First, get the user's PK from their profile
    const profileUrl = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
    
    const headers: Record<string, string> = {
      "User-Agent": "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229258)",
      "X-IG-App-ID": "936619743392459",
    };
    
    if (sessionId) {
      headers["Cookie"] = `sessionid=${sessionId}`;
    }

    // Get profile to extract PK
    log("Fetching profile PK via Bright Data...");
    const profileRes = await fetch(
      `https://brd-customer-hl_4b49de84-zone-${webUnlockerZone}:${apiToken}@brd.superproxy.io:33335`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: profileUrl,
          headers,
        }),
      }
    ).catch(() => null);

    // Alternative: Use Bright Data's SERP API directly
    if (!profileRes || !profileRes.ok) {
      log("Web Unlocker failed, trying direct scrape...");
      return await scrapeFollowersDirect(username, apiToken, sessionId);
    }

    const profileData = await profileRes.json().catch(() => null);
    const userPk = profileData?.data?.user?.id;

    if (!userPk) {
      log("Could not extract user PK, trying direct scrape...");
      return await scrapeFollowersDirect(username, apiToken, sessionId);
    }

    log(`Got user PK: ${userPk}, fetching followers...`);

    // Fetch followers using the private API
    const followersUrl = `https://i.instagram.com/api/v1/friendships/${userPk}/followers/?count=50`;
    
    const followersRes = await fetch(
      `https://brd-customer-hl_4b49de84-zone-${webUnlockerZone}:${apiToken}@brd.superproxy.io:33335`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: followersUrl,
          headers,
        }),
      }
    ).catch(() => null);

    if (!followersRes || !followersRes.ok) {
      log("Followers fetch failed");
      return await scrapeFollowersDirect(username, apiToken, sessionId);
    }

    const followersData = await followersRes.json().catch(() => null);
    const users = followersData?.users || [];

    log(`Got ${users.length} followers from private API`);

    return users.map((u: any) => ({
      id: String(u.pk || u.pk_id),
      username: u.username,
      full_name: u.full_name,
    }));

  } catch (error) {
    log("Bright Data scrape error", { error: String(error) });
    return [];
  }
}

// Fallback: Direct HTML scrape approach
async function scrapeFollowersDirect(username: string, apiToken: string, sessionId: string | undefined): Promise<any[]> {
  try {
    log("Trying Bright Data Web Scraper API for followers...");
    
    // Use Bright Data's dataset API to scrape the profile and get recent followers info
    const res = await fetch("https://api.brightdata.com/datasets/v3/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify([
        {
          url: `https://www.instagram.com/${username}/`,
          dataset_id: "gd_l1vikfch901nx3by4", // Instagram Profiles dataset
        },
      ]),
    });

    if (!res.ok) {
      const errText = await res.text();
      log("Bright Data dataset API failed", { status: res.status, body: errText });
      return [];
    }

    const data = await res.json();
    log("Bright Data dataset response", { snapshot_id: data.snapshot_id });

    // The dataset API is async - it returns a snapshot_id
    // For immediate results, we need to poll. But for now, return empty
    // and let the next check pick up results.
    
    // Alternative: try direct mobile API with session
    if (sessionId) {
      return await scrapeWithSession(username, sessionId);
    }

    return [];
  } catch (error) {
    log("Direct scrape error", { error: String(error) });
    return [];
  }
}

// Direct mobile API with session cookie
async function scrapeWithSession(username: string, sessionId: string): Promise<any[]> {
  try {
    const headers = {
      "User-Agent": "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; en_US)",
      "X-IG-App-ID": "936619743392459",
      Cookie: `sessionid=${sessionId}`,
    };

    // Get user PK
    const profileRes = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      { headers }
    );

    if (!profileRes.ok) {
      log("Direct profile fetch failed");
      return [];
    }

    const profileData = await profileRes.json();
    const userPk = profileData?.data?.user?.id;

    if (!userPk) {
      log("No user PK in direct response");
      return [];
    }

    // Get followers
    const followersRes = await fetch(
      `https://i.instagram.com/api/v1/friendships/${userPk}/followers/?count=50`,
      { headers }
    );

    if (!followersRes.ok) {
      log("Direct followers fetch failed", { status: followersRes.status });
      return [];
    }

    const followersData = await followersRes.json();
    const users = followersData?.users || [];

    log(`Got ${users.length} followers via direct session`);

    return users.map((u: any) => ({
      id: String(u.pk || u.pk_id),
      username: u.username,
      full_name: u.full_name,
    }));
  } catch (error) {
    log("Session scrape error", { error: String(error) });
    return [];
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
