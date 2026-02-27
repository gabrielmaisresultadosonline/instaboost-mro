import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (msg: string, data?: unknown) =>
  console.log(`[poll-followers] ${msg}`, data ? JSON.stringify(data) : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get active settings
    const { data: settings } = await supabase
      .from("mro_direct_settings")
      .select("*")
      .limit(1)
      .single();

    if (!settings?.is_active || !settings?.page_access_token || !settings?.instagram_account_id) {
      log("Not active or missing config, skipping");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active welcome_follower automations
    const { data: automations } = await supabase
      .from("mro_direct_automations")
      .select("*")
      .eq("automation_type", "welcome_follower")
      .eq("is_active", true);

    if (!automations || automations.length === 0) {
      log("No active welcome_follower automations");
      return new Response(JSON.stringify({ success: true, no_automations: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch current followers from Instagram API
    const followersUrl = `https://graph.instagram.com/v21.0/${settings.instagram_account_id}?fields=followers_count&access_token=${settings.page_access_token}`;
    
    // Instagram Business API: get followers list
    // Note: The /followers edge requires specific permissions
    let allFollowers: Array<{ id: string; username?: string }> = [];
    let nextUrl: string | null = `https://graph.instagram.com/v21.0/${settings.instagram_account_id}/followers?fields=id,username&limit=100&access_token=${settings.page_access_token}`;

    while (nextUrl) {
      const res = await fetch(nextUrl);
      const data = await res.json();

      if (data.error) {
        log("Instagram API error fetching followers", data.error);
        // If permission error, still return OK
        return new Response(
          JSON.stringify({ success: false, error: data.error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (data.data) {
        allFollowers = allFollowers.concat(data.data);
      }

      nextUrl = data.paging?.next || null;
      // Safety limit
      if (allFollowers.length > 5000) break;
    }

    log("Fetched followers from API", { count: allFollowers.length });

    if (allFollowers.length === 0) {
      return new Response(JSON.stringify({ success: true, followers: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get known followers from DB
    const followerIds = allFollowers.map((f) => f.id);
    const { data: knownFollowers } = await supabase
      .from("mro_direct_known_followers")
      .select("follower_id")
      .eq("instagram_account_id", settings.instagram_account_id)
      .in("follower_id", followerIds);

    const knownSet = new Set((knownFollowers || []).map((k: any) => k.follower_id));

    // Find new followers
    const newFollowers = allFollowers.filter((f) => !knownSet.has(f.id));
    log("New followers detected", { count: newFollowers.length });

    let welcomeSent = 0;

    for (const follower of newFollowers) {
      // Insert as known follower
      await supabase.from("mro_direct_known_followers").upsert(
        {
          instagram_account_id: settings.instagram_account_id,
          follower_id: follower.id,
          follower_username: follower.username || null,
          welcomed: false,
        },
        { onConflict: "instagram_account_id,follower_id" }
      );

      // Send welcome message for each active automation
      for (const auto of automations) {
        // Apply delay
        if (auto.delay_seconds > 0) {
          await new Promise((r) => setTimeout(r, auto.delay_seconds * 1000));
        }

        try {
          const msgRes = await fetch(
            `https://graph.instagram.com/v21.0/${settings.instagram_account_id}/messages`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recipient: { id: follower.id },
                message: { text: auto.reply_message },
                access_token: settings.page_access_token,
              }),
            }
          );

          const msgResult = await msgRes.json();

          await supabase.from("mro_direct_logs").insert({
            automation_id: auto.id,
            event_type: "welcome_follower",
            sender_id: follower.id,
            sender_username: follower.username || null,
            message_sent: auto.reply_message,
            trigger_content: "new_follower",
            status: msgRes.ok ? "sent" : "error",
            error_message: msgRes.ok ? null : (msgResult.error?.message || "Unknown error"),
          });

          if (msgRes.ok) {
            welcomeSent++;
            // Mark as welcomed
            await supabase
              .from("mro_direct_known_followers")
              .update({ welcomed: true })
              .eq("instagram_account_id", settings.instagram_account_id)
              .eq("follower_id", follower.id);

            log("Welcome sent to", { id: follower.id, username: follower.username });
          } else {
            log("Error sending welcome", msgResult.error);
          }
        } catch (e) {
          log("Exception sending welcome", { error: String(e) });
          await supabase.from("mro_direct_logs").insert({
            automation_id: auto.id,
            event_type: "welcome_follower",
            sender_id: follower.id,
            sender_username: follower.username || null,
            message_sent: auto.reply_message,
            trigger_content: "new_follower",
            status: "error",
            error_message: String(e),
          });
        }
      }
    }

    // Also insert existing followers that aren't in DB yet (first run seed)
    if (knownSet.size === 0 && allFollowers.length > 0 && newFollowers.length === allFollowers.length) {
      log("First run - seeding all existing followers without sending messages");
      // On first run, mark all existing as already welcomed to avoid spamming
      const existingRows = allFollowers.map((f) => ({
        instagram_account_id: settings.instagram_account_id,
        follower_id: f.id,
        follower_username: f.username || null,
        welcomed: true, // Mark as welcomed so we don't spam existing followers
      }));

      // Insert in batches of 100
      for (let i = 0; i < existingRows.length; i += 100) {
        const batch = existingRows.slice(i, i + 100);
        await supabase
          .from("mro_direct_known_followers")
          .upsert(batch, { onConflict: "instagram_account_id,follower_id" });
      }

      return new Response(
        JSON.stringify({
          success: true,
          first_run: true,
          seeded: allFollowers.length,
          message: "First run: seeded existing followers. New followers from now on will receive welcome messages.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_followers: allFollowers.length,
        new_followers: newFollowers.length,
        welcome_sent: welcomeSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log("Error", { error: String(error) });
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
