import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, code, redirect_uri } = await req.json();

    const appId = Deno.env.get("FACEBOOK_APP_ID")!;
    const appSecret = Deno.env.get("FACEBOOK_APP_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "get-app-id") {
      return json({ app_id: appId });
    }

    if (action === "exchange-code") {
      if (!code || !redirect_uri) {
        throw new Error("code e redirect_uri são obrigatórios");
      }

      // Step 1: Exchange code for short-lived user access token
      const tokenRes = await fetch("https://graph.facebook.com/v21.0/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri,
          client_id: appId,
          client_secret: appSecret,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || tokenData.error) {
        console.error("Token exchange error:", tokenData);
        throw new Error(tokenData.error?.message || "Erro ao trocar código por token");
      }

      const userAccessToken = tokenData.access_token;

      // Step 2: Exchange for long-lived token
      const longLivedRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userAccessToken}`
      );
      const longLivedData = await longLivedRes.json();
      const longLivedToken = longLivedData.access_token || userAccessToken;

      // Step 3: Get pages and find Instagram Business Account
      const pagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${longLivedToken}`
      );
      const pagesData = await pagesRes.json();

      if (!pagesRes.ok || !pagesData.data) {
        throw new Error(pagesData.error?.message || "Erro ao buscar páginas do Facebook");
      }

      // Find page with IG business account
      let page = null;
      for (const p of pagesData.data) {
        if (p.instagram_business_account) {
          page = p;
          break;
        }
        // Try fetching individually
        const igRes = await fetch(
          `https://graph.facebook.com/v21.0/${p.id}?fields=instagram_business_account&access_token=${p.access_token}`
        );
        const igData = await igRes.json();
        if (igData.instagram_business_account) {
          page = { ...p, instagram_business_account: igData.instagram_business_account };
          break;
        }
      }

      if (!page || !page.instagram_business_account) {
        // Return pages info for debugging
        const pageNames = pagesData.data.map((p: any) => p.name);
        throw new Error(
          `Nenhuma conta Instagram Business encontrada. Páginas: ${pageNames.join(", ")}. Certifique-se que seu Instagram é Business/Creator e está vinculado a uma Página.`
        );
      }

      const igAccountId = page.instagram_business_account.id;
      const pageAccessToken = page.access_token;

      // Step 4: Get Instagram profile info
      const profileRes = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}?fields=id,name,username,biography,profile_picture_url,followers_count,media_count&access_token=${pageAccessToken}`
      );
      const profile = await profileRes.json();

      if (!profileRes.ok) {
        // Fallback with fewer fields
        const fallbackRes = await fetch(
          `https://graph.facebook.com/v21.0/${igAccountId}?fields=id,name,username&access_token=${pageAccessToken}`
        );
        const fallbackProfile = await fallbackRes.json();
        if (!fallbackRes.ok) {
          throw new Error(fallbackProfile.error?.message || "Erro ao buscar perfil do Instagram");
        }
        Object.assign(profile, fallbackProfile);
      }

      // Step 5: Save settings to database
      const { data: existing } = await supabase
        .from("mro_direct_settings")
        .select("id")
        .limit(1)
        .single();

      const settingsData = {
        page_access_token: pageAccessToken,
        instagram_account_id: igAccountId,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase.from("mro_direct_settings").update(settingsData).eq("id", existing.id);
      } else {
        await supabase.from("mro_direct_settings").insert(settingsData);
      }

      return json({
        success: true,
        profile,
        page_name: page.name,
      });
    }

    return json({ error: "Ação não reconhecida" }, 400);
  } catch (error) {
    console.error("[mro-direct-oauth] Error:", error);
    return json({ error: error.message }, 500);
  }
});
