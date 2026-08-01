import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "mro@gmail.com";
const ADMIN_PASSWORD = "Ga145523@";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PROJECT_PUBLIC_FIELDS =
  "id,company_name,strategy_title,strategy_text,summary_text,next_steps_text,instagram_handle,avatar_url";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const raw = await req.text();
    let body: Record<string, any> = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { return json({ success: false, error: "invalid_json" }, 400); }
    const action = String(body.action || "");

    /* ---------------- CLIENT (código de acesso) ---------------- */

    if (action === "client_load") {
      const code = String(body.code || "").trim().toUpperCase();
      if (code.length < 4) return json({ success: false, error: "Código inválido" }, 400);

      const { data: project } = await supabase
        .from("mktcc_projects")
        .select(PROJECT_PUBLIC_FIELDS + ",is_active")
        .eq("access_code", code)
        .maybeSingle();

      if (!project || !project.is_active) return json({ success: false, error: "Código não encontrado" }, 404);

      const { data: posts } = await supabase
        .from("mktcc_posts")
        .select("*")
        .eq("project_id", project.id)
        .order("order_index", { ascending: true });

      const { is_active: _omit, ...publicProject } = project as Record<string, any>;
      return json({ success: true, project: publicProject, posts: posts || [] });
    }

    if (action === "client_review") {
      const code = String(body.code || "").trim().toUpperCase();
      const postId = String(body.post_id || "");
      const status = String(body.status || "");
      const note = String(body.client_note || "").slice(0, 4000);
      if (!["approved", "changes", "pending"].includes(status)) return json({ success: false, error: "status inválido" }, 400);

      const { data: project } = await supabase
        .from("mktcc_projects").select("id").eq("access_code", code).eq("is_active", true).maybeSingle();
      if (!project) return json({ success: false, error: "Código não encontrado" }, 404);

      const { error } = await supabase
        .from("mktcc_posts")
        .update({ status, client_note: note, reviewed_at: new Date().toISOString() })
        .eq("id", postId)
        .eq("project_id", project.id);
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true });
    }

    /* ---------------- ADMIN ---------------- */

    if (body.email !== ADMIN_EMAIL || body.password !== ADMIN_PASSWORD) {
      return json({ success: false, error: "unauthorized" }, 401);
    }

    if (action === "login") return json({ success: true });

    if (action === "list_projects") {
      const { data } = await supabase.from("mktcc_projects").select("*").order("created_at", { ascending: false });
      return json({ success: true, projects: data || [] });
    }

    if (action === "create_project") {
      const code = String(body.access_code || "").trim().toUpperCase() ||
        Math.random().toString(36).slice(2, 8).toUpperCase();
      const { data, error } = await supabase.from("mktcc_projects").insert({
        company_name: String(body.company_name || "Nova Empresa").slice(0, 200),
        access_code: code,
        instagram_handle: String(body.instagram_handle || "").slice(0, 100),
      }).select("*").single();
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, project: data });
    }

    if (action === "update_project") {
      const patch: Record<string, any> = {};
      for (const key of ["company_name", "strategy_title", "strategy_text", "summary_text", "next_steps_text", "instagram_handle", "avatar_url", "access_code", "is_active"]) {
        if (key in body) patch[key] = key === "access_code" ? String(body[key]).trim().toUpperCase() : body[key];
      }
      const { error } = await supabase.from("mktcc_projects").update(patch).eq("id", body.project_id);
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true });
    }

    if (action === "delete_project") {
      const { error } = await supabase.from("mktcc_projects").delete().eq("id", body.project_id);
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true });
    }

    if (action === "list_posts") {
      const { data } = await supabase.from("mktcc_posts").select("*")
        .eq("project_id", body.project_id).order("order_index", { ascending: true });
      return json({ success: true, posts: data || [] });
    }

    if (action === "create_post") {
      const { data: last } = await supabase.from("mktcc_posts").select("order_index")
        .eq("project_id", body.project_id).order("order_index", { ascending: false }).limit(1).maybeSingle();
      const { data, error } = await supabase.from("mktcc_posts").insert({
        project_id: body.project_id,
        post_type: ["image", "video", "carousel"].includes(body.post_type) ? body.post_type : "image",
        media_urls: Array.isArray(body.media_urls) ? body.media_urls : [],
        caption: String(body.caption || ""),
        order_index: (last?.order_index ?? -1) + 1,
      }).select("*").single();
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, post: data });
    }

    if (action === "update_post") {
      const patch: Record<string, any> = {};
      for (const key of ["post_type", "media_urls", "caption", "order_index", "status", "client_note"]) {
        if (key in body) patch[key] = body[key];
      }
      const { error } = await supabase.from("mktcc_posts").update(patch).eq("id", body.post_id);
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true });
    }

    if (action === "reorder_posts") {
      const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
      for (let i = 0; i < ids.length; i++) {
        await supabase.from("mktcc_posts").update({ order_index: i }).eq("id", ids[i]);
      }
      return json({ success: true });
    }

    if (action === "delete_post") {
      const { error } = await supabase.from("mktcc_posts").delete().eq("id", body.post_id);
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true });
    }

    if (action === "upload_media") {
      const fileBase64 = String(body.file_base64 || "");
      const filename = String(body.filename || `file-${Date.now()}`).replace(/[^\w.\-]/g, "_");
      if (!fileBase64) return json({ success: false, error: "arquivo ausente" }, 400);

      let contentType = String(body.content_type || "application/octet-stream");
      let base64 = fileBase64;
      const match = fileBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) { contentType = match[1]; base64 = match[2]; }

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const path = `mktcc/${body.project_id || "geral"}/${Date.now()}-${filename}`;
      const { error } = await supabase.storage.from("assets").upload(path, bytes, { contentType, upsert: true });
      if (error) return json({ success: false, error: error.message }, 400);
      const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
      return json({ success: true, url: urlData.publicUrl, content_type: contentType });
    }

    return json({ success: false, error: "invalid_action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    console.error("[mktcc-api]", message);
    return json({ success: false, error: message }, 500);
  }
});
