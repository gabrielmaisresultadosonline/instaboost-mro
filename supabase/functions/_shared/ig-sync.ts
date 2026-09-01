/**
 * MRO INSTAGRAM (/IG) — sincronização com a Graph API oficial da Meta.
 *
 * Todas as funções aqui são "best-effort por item": uma mídia sem insights
 * liberados nunca derruba a sincronização inteira. Erros de autorização são
 * propagados para que a UI possa pedir a reconexão da conta.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const GRAPH = "https://graph.instagram.com/v21.0";

export interface IgAccountRow {
  id: string;
  tenant_id: string;
  instagram_account_id: string | null;
  instagram_user_id: string | null;
}

export interface SyncStepResult {
  ok: boolean;
  count: number;
  error?: string;
}


/** Executa tarefas em paralelo com limite de concorrência (evita timeout na Edge). */
async function mapLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${GRAPH}/${path}?${query}`);
  const payload = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!response.ok || payload?.error) {
    const detail = payload?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(detail);
  }
  return payload;
}

/** Atualiza seguidores, publicações e foto do perfil conectado. */
export async function syncProfile(
  db: SupabaseClient,
  account: IgAccountRow,
  token: string,
): Promise<SyncStepResult> {
  try {
    const data = await graphGet<{
      username?: string;
      name?: string;
      profile_picture_url?: string;
      followers_count?: number;
      media_count?: number;
    }>("me", {
      fields: "username,name,profile_picture_url,followers_count,media_count",
      access_token: token,
    });

    await db
      .from("ig_accounts")
      .update({
        username: data.username ?? null,
        name: data.name ?? null,
        profile_picture_url: data.profile_picture_url ?? null,
        followers_count: data.followers_count ?? null,
        media_count: data.media_count ?? null,
        connection_state: "connected",
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    return { ok: true, count: 1 };
  } catch (error) {
    const message = (error as Error).message;
    console.error("[ig-sync] profile failed:", message.slice(0, 200));
    return { ok: false, count: 0, error: message };
  }
}

interface MetaMedia {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  media_url?: string;
  thumbnail_url?: string;
  like_count?: number;
  comments_count?: number;
  timestamp?: string;
}

/** Busca insights da mídia. Métricas indisponíveis simplesmente ficam nulas. */
async function fetchMediaInsights(
  mediaId: string,
  token: string,
  isReel: boolean,
): Promise<{ views: number | null; reach: number | null; saved: number | null; shares: number | null }> {
  const metrics = isReel ? "views,reach,saved,shares" : "reach,saved,shares";
  try {
    const data = await graphGet<{ data?: Array<{ name: string; values?: Array<{ value?: number }> }> }>(
      `${mediaId}/insights`,
      { metric: metrics, access_token: token },
    );
    const map = new Map<string, number | null>();
    for (const item of data.data ?? []) {
      map.set(item.name, item.values?.[0]?.value ?? null);
    }
    return {
      views: map.get("views") ?? null,
      reach: map.get("reach") ?? null,
      saved: map.get("saved") ?? null,
      shares: map.get("shares") ?? null,
    };
  } catch {
    return { views: null, reach: null, saved: null, shares: null };
  }
}

/** Sincroniza as últimas mídias (posts, carrosséis e Reels) do perfil. */
export async function syncMedia(
  db: SupabaseClient,
  account: IgAccountRow,
  token: string,
  limit = 50,
): Promise<SyncStepResult> {
  try {
    const data = await graphGet<{ data?: MetaMedia[] }>("me/media", {
      fields:
        "id,caption,media_type,media_product_type,permalink,media_url,thumbnail_url,like_count,comments_count,timestamp",
      limit: String(limit),
      access_token: token,
    });

    const list = (data.data ?? []).filter((media) => Boolean(media.id));
    console.log(`[ig-sync] media list: ${list.length} itens`);

    const rows = await mapLimit(list, 8, async (media) => {
      const isReel = (media.media_product_type ?? "").toUpperCase() === "REELS";
      const insights = await fetchMediaInsights(media.id, token, isReel);
      return {
        tenant_id: account.tenant_id,
        ig_account_id: account.id,
        media_id: media.id,
        media_type: media.media_type ?? null,
        media_product_type: media.media_product_type ?? null,
        caption: media.caption ?? null,
        permalink: media.permalink ?? null,
        media_url: media.media_url ?? null,
        thumbnail_url: media.thumbnail_url ?? null,
        like_count: media.like_count ?? null,
        comments_count: media.comments_count ?? null,
        views_count: insights.views,
        reach: insights.reach,
        saved: insights.saved,
        shares: insights.shares,
        published_at: media.timestamp ?? null,
      };
    });

    let saved = 0;
    if (rows.length > 0) {
      const { error } = await db.from("ig_media").upsert(rows, { onConflict: "ig_account_id,media_id" });
      if (error) throw new Error(error.message);
      saved = rows.length;
    }
    console.log(`[ig-sync] media saved: ${saved}`);

    return { ok: true, count: saved };
  } catch (error) {
    const message = (error as Error).message;
    console.error("[ig-sync] media failed:", message.slice(0, 200));
    return { ok: false, count: 0, error: message };
  }
}

interface MetaComment {
  id: string;
  text?: string;
  timestamp?: string;
  username?: string;
  from?: { id?: string; username?: string };
  parent_id?: string;
  hidden?: boolean;
  replies?: { data?: Array<{ id?: string }> };
}

/** Sincroniza comentários das mídias já salvas no banco. */
export async function syncComments(
  db: SupabaseClient,
  account: IgAccountRow,
  token: string,
  mediaLimit = 25,
): Promise<SyncStepResult> {
  const { data: mediaRows } = await db
    .from("ig_media")
    .select("id, media_id")
    .eq("ig_account_id", account.id)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(mediaLimit);

  if (!mediaRows || mediaRows.length === 0) return { ok: true, count: 0 };

  const ownUsername = (
    await db.from("ig_accounts").select("username").eq("id", account.id).maybeSingle()
  ).data?.username;

  let saved = 0;
  let lastError: string | null = null;

  const batches = await mapLimit(mediaRows, 6, async (row) => {
    try {
      const data = await graphGet<{ data?: MetaComment[] }>(`${row.media_id}/comments`, {
        fields: "id,text,timestamp,username,from,parent_id,hidden,replies{id}",
        limit: "50",
        access_token: token,
      });
      return (data.data ?? [])
        .filter((comment) => Boolean(comment.id))
        .map((comment) => {
          const username = comment.username ?? comment.from?.username ?? null;
          return {
            tenant_id: account.tenant_id,
            ig_account_id: account.id,
            media_row_id: row.id,
            comment_id: comment.id,
            media_id: row.media_id,
            parent_comment_id: comment.parent_id ?? null,
            from_id: comment.from?.id ?? null,
            from_username: username,
            text: comment.text ?? null,
            is_own: Boolean(ownUsername && username && ownUsername === username),
            replied: (comment.replies?.data?.length ?? 0) > 0,
            hidden: Boolean(comment.hidden),
            commented_at: comment.timestamp ?? null,
          };
        });
    } catch (error) {
      const message = (error as Error).message;
      lastError = message;
      console.error(`[ig-sync] comments failed for media ${row.media_id}: ${message.slice(0, 160)}`);
      return [];
    }

  });

  const rows = batches.flat();
  if (rows.length > 0) {
    const { error } = await db.from("ig_comments").upsert(rows, { onConflict: "ig_account_id,comment_id" });
    if (error) lastError = error.message;
    else saved = rows.length;
  }
  console.log(`[ig-sync] comments saved: ${saved} de ${mediaRows.length} mídias`);

  if (lastError) console.error("[ig-sync] comments partial failure:", lastError.slice(0, 200));
  return { ok: saved > 0 || !lastError, count: saved, error: lastError ?? undefined };
}

/** Responde publicamente a um comentário. */
export async function replyToComment(commentId: string, message: string, token: string): Promise<void> {
  const response = await fetch(`${GRAPH}/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: token }),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string; error_user_msg?: string } };
  if (!response.ok || payload.error) {
    const detail = payload.error?.error_user_msg ?? payload.error?.message ?? `HTTP ${response.status}`;
    console.error("[ig-sync] comment reply failed:", detail.slice(0, 200));
    throw new Error(detail);
  }
}

/**
 * Deriva/atualiza contatos do CRM a partir das conversas e comentários reais
 * já persistidos. Nunca inventa contatos.
 */
export async function rebuildContacts(db: SupabaseClient, account: IgAccountRow): Promise<SyncStepResult> {
  let upserts = 0;

  const { data: conversations } = await db
    .from("ig_conversations")
    .select("participant_id, participant_username, participant_name, participant_picture_url, last_message_at")
    .eq("ig_account_id", account.id)
    .limit(500);

  for (const conversation of conversations ?? []) {
    if (!conversation.participant_id) continue;
    const { error } = await db.from("ig_contacts").upsert(
      {
        tenant_id: account.tenant_id,
        ig_account_id: account.id,
        participant_id: conversation.participant_id,
        username: conversation.participant_username,
        name: conversation.participant_name,
        picture_url: conversation.participant_picture_url,
        source: "direct",
        last_interaction_at: conversation.last_message_at,
      },
      { onConflict: "ig_account_id,participant_id", ignoreDuplicates: false },
    );
    if (!error) upserts++;
  }

  const { data: comments } = await db
    .from("ig_comments")
    .select("from_id, from_username, commented_at")
    .eq("ig_account_id", account.id)
    .eq("is_own", false)
    .not("from_id", "is", null)
    .limit(500);

  const seen = new Set<string>();
  for (const comment of comments ?? []) {
    const id = comment.from_id as string;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const { error } = await db.from("ig_contacts").upsert(
      {
        tenant_id: account.tenant_id,
        ig_account_id: account.id,
        participant_id: id,
        username: comment.from_username,
        source: "comment",
        last_interaction_at: comment.commented_at,
      },
      { onConflict: "ig_account_id,participant_id", ignoreDuplicates: true },
    );
    if (!error) upserts++;
  }

  return { ok: true, count: upserts };
}
