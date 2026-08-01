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
  "id,company_name,strategy_title,strategy_text,summary_text,next_steps_text,instagram_handle,instagram_bio,avatar_url,all_approved_at,next_step_released,before_instagram_urls,before_facebook_urls,before_note,logo_enabled,logo_before_url,logo_after_url,logo_reason,logo_status,logo_client_note,logo_reviewed_at";

// Uma programação é considerada finalizada quando o admin marca como "done"
// ou quando a data programada já passou.
function cycleIsDone(cycle: any): boolean {
  if (!cycle) return false;
  if (cycle.status === "done") return true;
  if (cycle.scheduled_date) {
    const today = new Date().toISOString().slice(0, 10);
    return String(cycle.scheduled_date) < today;
  }
  return false;
}

function publicCycle(cycle: any) {
  return {
    id: cycle.id,
    title: cycle.title,
    scheduled_date: cycle.scheduled_date,
    note: cycle.note,
    status: cycle.status,
    completed_at: cycle.completed_at,
    order_index: cycle.order_index,
    is_done: cycleIsDone(cycle),
  };
}

// Recalcula se todas as publicações do projeto estão aprovadas e marca a data.
async function syncApproval(supabase: any, projectId: string) {
  const { data: rows } = await supabase
    .from("mktcc_posts").select("status").eq("project_id", projectId).eq("is_published", true);
  const posts = rows || [];
  const allApproved = posts.length > 0 && posts.every((p: any) => p.status === "approved");

  const { data: project } = await supabase
    .from("mktcc_projects").select("all_approved_at").eq("id", projectId).maybeSingle();

  if (allApproved && !project?.all_approved_at) {
    await supabase.from("mktcc_projects")
      .update({ all_approved_at: new Date().toISOString() }).eq("id", projectId);
  } else if (!allApproved && project?.all_approved_at) {
    await supabase.from("mktcc_projects")
      .update({ all_approved_at: null }).eq("id", projectId);
  }
  return allApproved;
}

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
        .eq("is_published", true)
        .order("order_index", { ascending: true });

      const { data: cycles } = await supabase
        .from("mktcc_cycles")
        .select("*")
        .eq("project_id", project.id)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });

      const { is_active: _omit, ...publicProject } = project as Record<string, any>;
      return json({
        success: true,
        project: publicProject,
        posts: posts || [],
        cycles: (cycles || []).map(publicCycle),
      });
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

      // Publicações de uma programação já finalizada não podem mais ser editadas.
      const { data: target } = await supabase
        .from("mktcc_posts").select("cycle_id").eq("id", postId).eq("project_id", project.id).maybeSingle();
      if (target?.cycle_id) {
        const { data: cycle } = await supabase
          .from("mktcc_cycles").select("*").eq("id", target.cycle_id).maybeSingle();
        if (cycleIsDone(cycle)) {
          return json({ success: false, error: "Esta programação já foi processada e finalizada." }, 400);
        }
      }

      const { error } = await supabase
        .from("mktcc_posts")
        .update({ status, client_note: note, reviewed_at: new Date().toISOString() })
        .eq("id", postId)
        .eq("project_id", project.id);
      if (error) return json({ success: false, error: error.message }, 400);
      const allApproved = await syncApproval(supabase, project.id);
      return json({ success: true, all_approved: allApproved });
    }

    // Aprovação da nova logo (etapa opcional, só existe se o admin ativar).
    if (action === "client_logo_review") {
      const code = String(body.code || "").trim().toUpperCase();
      const status = String(body.status || "");
      const note = String(body.client_note || "").slice(0, 4000);
      if (!["approved", "changes", "pending"].includes(status)) {
        return json({ success: false, error: "status inválido" }, 400);
      }

      const { data: project } = await supabase
        .from("mktcc_projects").select("id,logo_enabled")
        .eq("access_code", code).eq("is_active", true).maybeSingle();
      if (!project) return json({ success: false, error: "Código não encontrado" }, 404);
      if (!project.logo_enabled) return json({ success: false, error: "Etapa de logo indisponível" }, 400);

      const { error } = await supabase.from("mktcc_projects").update({
        logo_status: status,
        logo_client_note: note,
        logo_reviewed_at: status === "pending" ? null : new Date().toISOString(),
      }).eq("id", project.id);
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
      for (const key of ["company_name", "strategy_title", "strategy_text", "summary_text", "next_steps_text", "instagram_handle", "instagram_bio", "avatar_url", "access_code", "is_active", "next_step_released", "before_instagram_urls", "before_facebook_urls", "before_note"]) {
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

    /* ---------------- ADMIN: programações mensais ---------------- */

    if (action === "list_cycles") {
      const { data } = await supabase.from("mktcc_cycles").select("*")
        .eq("project_id", body.project_id)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });
      return json({ success: true, cycles: (data || []).map(publicCycle) });
    }

    if (action === "create_cycle") {
      const { data: last } = await supabase.from("mktcc_cycles").select("order_index")
        .eq("project_id", body.project_id).order("order_index", { ascending: false }).limit(1).maybeSingle();
      const { data, error } = await supabase.from("mktcc_cycles").insert({
        project_id: body.project_id,
        title: String(body.title || "").slice(0, 200) || "Nova programação",
        scheduled_date: body.scheduled_date || null,
        note: String(body.note || "").slice(0, 4000),
        order_index: (last?.order_index ?? -1) + 1,
      }).select("*").single();
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, cycle: publicCycle(data) });
    }

    if (action === "update_cycle") {
      const patch: Record<string, any> = {};
      for (const key of ["title", "scheduled_date", "note", "order_index"]) {
        if (key in body) patch[key] = key === "scheduled_date" ? (body[key] || null) : body[key];
      }
      if ("status" in body) {
        const status = body.status === "done" ? "done" : "open";
        patch.status = status;
        patch.completed_at = status === "done" ? new Date().toISOString() : null;
      }
      const { error } = await supabase.from("mktcc_cycles").update(patch).eq("id", body.cycle_id);
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true });
    }

    if (action === "delete_cycle") {
      const { error } = await supabase.from("mktcc_cycles").delete().eq("id", body.cycle_id);
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
        aspect_ratio: ["4/5", "1/1", "9/16"].includes(body.aspect_ratio) ? body.aspect_ratio : "4/5",
        is_published: body.is_published === true,
        cycle_id: body.cycle_id || null,
        order_index: (last?.order_index ?? -1) + 1,
      }).select("*").single();
      if (error) return json({ success: false, error: error.message }, 400);
      await syncApproval(supabase, String(body.project_id));
      return json({ success: true, post: data });
    }

    if (action === "update_post") {
      const patch: Record<string, any> = {};
      for (const key of ["post_type", "media_urls", "caption", "order_index", "status", "client_note", "is_published", "aspect_ratio", "cycle_id"]) {
        if (key in body) patch[key] = body[key];
      }
      const { error } = await supabase.from("mktcc_posts").update(patch).eq("id", body.post_id);
      if (error) return json({ success: false, error: error.message }, 400);
      if (body.project_id) await syncApproval(supabase, String(body.project_id));
      return json({ success: true });
    }

    // Publica (ou volta para rascunho) uma publicação: só publicadas aparecem para o cliente.
    if (action === "publish_post") {
      const publish = body.is_published !== false;
      const { data: current, error } = await supabase
        .from("mktcc_posts")
        .update({ is_published: publish })
        .eq("id", String(body.post_id || ""))
        .select("project_id")
        .maybeSingle();
      if (error) return json({ success: false, error: error.message }, 400);
      if (current?.project_id) await syncApproval(supabase, current.project_id);
      return json({ success: true });
    }

    // Aplica uma alteração: arquiva a versão atual (fica cinza para o cliente),
    // grava a nova versão e devolve a publicação para nova aprovação.
    if (action === "revise_post") {
      const postId = String(body.post_id || "");
      const { data: current } = await supabase
        .from("mktcc_posts").select("*").eq("id", postId).maybeSingle();
      if (!current) return json({ success: false, error: "Publicação não encontrada" }, 404);

      const newMedia = Array.isArray(body.media_urls) && body.media_urls.length > 0
        ? body.media_urls
        : current.media_urls;
      const newCaption = typeof body.caption === "string" ? body.caption : current.caption;

      const { error } = await supabase.from("mktcc_posts").update({
        previous_media_urls: current.media_urls || [],
        previous_caption: current.caption || "",
        media_urls: newMedia,
        caption: newCaption,
        post_type: ["image", "video", "carousel"].includes(body.post_type) ? body.post_type : current.post_type,
        revision_note: String(body.revision_note || "").slice(0, 4000),
        revision_count: (current.revision_count || 0) + 1,
        revised_at: new Date().toISOString(),
        status: "pending",
        client_note: "",
        reviewed_at: null,
      }).eq("id", postId);
      if (error) return json({ success: false, error: error.message }, 400);
      await syncApproval(supabase, current.project_id);
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
      if (body.project_id) await syncApproval(supabase, String(body.project_id));
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
