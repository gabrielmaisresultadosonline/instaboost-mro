/**
 * MRO INSTAGRAM (/IG) — Agente de IA do Direct.
 *
 * Responsabilidades:
 *  - carregar configuração do agente por workspace (ig_ai_settings);
 *  - casar automações por palavra-chave (ig_automations);
 *  - gerar resposta com o Lovable AI Gateway (sem chave do cliente);
 *  - enviar o Direct pela API oficial da Meta e registrar tudo em log.
 *
 * Regras de negócio importantes:
 *  - a IA só responde se `enabled` e `auto_reply` estiverem ligados;
 *  - conversa com `ai_paused = true` é atendimento humano: a IA não fala;
 *  - palavra-chave de handoff pausa a conversa e avisa a equipe;
 *  - limite de respostas por conversa evita loop infinito com bots.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { igLog, loggedGraphFetch } from "./ig-log.ts";

const GRAPH = "https://graph.instagram.com/v21.0";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export interface IgAiSettings {
  id: string;
  tenant_id: string;
  enabled: boolean;
  auto_reply: boolean;
  model: string;
  tone: string;
  persona: string;
  business_context: string | null;
  knowledge: string | null;
  greeting: string | null;
  handoff_keywords: string[];
  max_replies_per_conversation: number;
  reply_delay_seconds: number;
}

export interface IgAutomationRow {
  id: string;
  name: string;
  channel: "direct" | "comment";
  match_type: "contains" | "exact" | "any" | "starts_with";
  keywords: string[];
  reply_text: string;
  priority: number;
  triggered_count: number;
}

/** Garante uma linha de configuração para o workspace (idempotente). */
export async function loadAiSettings(db: SupabaseClient, tenantId: string): Promise<IgAiSettings> {
  const { data } = await db.from("ig_ai_settings").select("*").eq("tenant_id", tenantId).maybeSingle();
  if (data) return data as IgAiSettings;

  const { data: created, error } = await db
    .from("ig_ai_settings")
    .insert({ tenant_id: tenantId })
    .select("*")
    .single();

  if (error || !created) throw new Error("Não foi possível preparar as configurações da IA.");
  return created as IgAiSettings;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Retorna a primeira automação ativa que casa com o texto recebido. */
export async function matchAutomation(
  db: SupabaseClient,
  tenantId: string,
  channel: "direct" | "comment",
  text: string | null,
): Promise<IgAutomationRow | null> {
  const { data } = await db
    .from("ig_automations")
    .select("id, name, channel, match_type, keywords, reply_text, priority, triggered_count")
    .eq("tenant_id", tenantId)
    .eq("channel", channel)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("priority", { ascending: true });

  const rows = (data ?? []) as IgAutomationRow[];
  const haystack = normalize(text ?? "");

  for (const row of rows) {
    if (row.match_type === "any") return row;
    if (!haystack) continue;
    const keywords = row.keywords.map(normalize).filter(Boolean);
    const hit = keywords.some((keyword) => {
      if (row.match_type === "exact") return haystack === keyword;
      if (row.match_type === "starts_with") return haystack.startsWith(keyword);
      return haystack.includes(keyword);
    });
    if (hit) return row;
  }
  return null;
}

/** Histórico recente da conversa em formato de chat para a IA. */
async function conversationHistory(
  db: SupabaseClient,
  conversationId: string,
  limit = 12,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const { data } = await db
    .from("ig_messages")
    .select("direction, text, sent_at")
    .eq("conversation_id", conversationId)
    .not("text", "is", null)
    .order("sent_at", { ascending: false })
    .limit(limit);

  return (data ?? [])
    .reverse()
    .map((row) => ({
      role: (row.direction === "out" ? "assistant" : "user") as "user" | "assistant",
      content: String(row.text ?? "").slice(0, 1500),
    }))
    .filter((message) => message.content.length > 0);
}

function buildSystemPrompt(settings: IgAiSettings, participant: string): string {
  return [
    `Você é ${settings.persona}.`,
    `Tom de voz: ${settings.tone}.`,
    `Você conversa pelo Direct do Instagram com @${participant}.`,
    settings.business_context ? `Contexto do negócio:\n${settings.business_context}` : "",
    settings.knowledge ? `Base de conhecimento (use apenas o que estiver aqui como fato):\n${settings.knowledge}` : "",
    "Regras obrigatórias:",
    "- Responda em português do Brasil, no máximo 2 parágrafos curtos e no limite de 850 caracteres.",
    "- Nunca invente preço, prazo, link ou promessa que não esteja na base de conhecimento.",
    "- Se não souber, diga que vai confirmar com a equipe humana.",
    "- Não use markdown, títulos nem listas numeradas: é uma mensagem de chat.",
    "- Não repita a saudação se a conversa já começou.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Gera a resposta da IA. Retorna null quando o gateway falha (log já registrado). */
export async function generateAiReply(
  db: SupabaseClient,
  params: {
    settings: IgAiSettings;
    conversationId: string;
    participant: string;
    incomingText: string | null;
    tenantId: string;
  },
): Promise<string | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    await igLog(db, {
      scope: "ig-ai",
      step: "gateway.missing_key",
      level: "error",
      tenant_id: params.tenantId,
      message: "LOVABLE_API_KEY ausente no ambiente das funções.",
    });
    return null;
  }

  const history = await conversationHistory(db, params.conversationId);
  const messages = [
    { role: "system", content: buildSystemPrompt(params.settings, params.participant) },
    ...history,
  ];
  if (params.incomingText && history.at(-1)?.content !== params.incomingText) {
    messages.push({ role: "user", content: params.incomingText.slice(0, 1500) });
  }

  const started = Date.now();
  const response = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: params.settings.model, messages, max_tokens: 400 }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (!response.ok || payload.error) {
    await igLog(db, {
      scope: "ig-ai",
      step: "gateway.completion",
      level: "error",
      tenant_id: params.tenantId,
      http_status: response.status,
      duration_ms: Date.now() - started,
      message:
        response.status === 429
          ? "Limite de uso da IA atingido. Tente novamente em instantes."
          : response.status === 402
            ? "Créditos de IA esgotados no workspace Lovable."
            : payload.error?.message ?? `HTTP ${response.status}`,
    });
    return null;
  }

  const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
  await igLog(db, {
    scope: "ig-ai",
    step: "gateway.completion",
    tenant_id: params.tenantId,
    http_status: response.status,
    duration_ms: Date.now() - started,
    message: `resposta gerada (${text.length} caracteres)`,
  });

  if (!text) return null;
  return text.slice(0, 900);
}

/** Envia um Direct pela API oficial e grava a mensagem no Inbox. */
export async function sendDirect(
  db: SupabaseClient,
  params: {
    tenantId: string;
    conversation: { id: string; participant_id: string; ig_account_id: string };
    text: string;
    isAi: boolean;
    scope: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  const { data: token } = await db
    .from("ig_tokens")
    .select("access_token")
    .eq("ig_account_id", params.conversation.ig_account_id)
    .maybeSingle();

  if (!token?.access_token) {
    await igLog(db, {
      scope: params.scope,
      step: "send.no_token",
      level: "error",
      tenant_id: params.tenantId,
      ig_account_id: params.conversation.ig_account_id,
      message: "Conta sem token válido — reconecte o Instagram.",
    });
    return { ok: false, error: "Conta do Instagram sem autorização válida. Reconecte em Configurações." };
  }

  const result = await loggedGraphFetch(
    db,
    {
      scope: params.scope,
      step: "send.direct",
      tenant_id: params.tenantId,
      ig_account_id: params.conversation.ig_account_id,
      detail: { conversation_id: params.conversation.id, is_ai: params.isAi, length: params.text.length },
    },
    `${GRAPH}/me/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: params.conversation.participant_id },
        message: { text: params.text },
        access_token: token.access_token,
      }),
    },
  );

  if (!result.ok) {
    return {
      ok: false,
      error:
        result.error ??
        "O Instagram não aceitou o envio. Só é possível responder em até 24h após a última mensagem do usuário.",
    };
  }

  const sentAt = new Date().toISOString();
  await db.from("ig_messages").insert({
    tenant_id: params.tenantId,
    conversation_id: params.conversation.id,
    ig_account_id: params.conversation.ig_account_id,
    mid: (result.payload.message_id as string | undefined) ?? null,
    direction: "out",
    text: params.text,
    is_ai: params.isAi,
    sender_id: null,
    recipient_id: params.conversation.participant_id,
    sent_at: sentAt,
  });

  await db
    .from("ig_conversations")
    .update({
      last_message_text: params.text,
      last_message_at: sentAt,
      last_direction: "out",
      unread_count: 0,
    })
    .eq("id", params.conversation.id);

  return { ok: true };
}

/**
 * Fluxo completo de atendimento automático de um Direct recebido:
 * automação por palavra-chave → handoff → IA.
 */
export async function autoRespondDirect(
  db: SupabaseClient,
  params: { tenantId: string; conversationId: string; incomingText: string | null },
): Promise<void> {
  const { data: conversation } = await db
    .from("ig_conversations")
    .select("id, participant_id, participant_username, ig_account_id, ai_paused, ai_replies_count")
    .eq("id", params.conversationId)
    .maybeSingle();

  if (!conversation) return;

  const base = {
    scope: "ig-agent",
    tenant_id: params.tenantId,
    ig_account_id: conversation.ig_account_id as string,
  };

  if (conversation.ai_paused) {
    await igLog(db, { ...base, step: "skip.paused", message: "Conversa em atendimento humano." });
    return;
  }

  const target = {
    id: conversation.id as string,
    participant_id: conversation.participant_id as string,
    ig_account_id: conversation.ig_account_id as string,
  };

  // 1) Automação por palavra-chave tem prioridade sobre a IA.
  const automation = await matchAutomation(db, params.tenantId, "direct", params.incomingText);
  if (automation) {
    const sent = await sendDirect(db, {
      tenantId: params.tenantId,
      conversation: target,
      text: automation.reply_text,
      isAi: false,
      scope: "ig-agent",
    });
    await igLog(db, {
      ...base,
      step: "automation.triggered",
      level: sent.ok ? "info" : "error",
      message: sent.ok ? `Automação "${automation.name}" respondeu.` : sent.error,
    });
    if (sent.ok) {
      await db
        .from("ig_automations")
        .update({
          triggered_count: automation.triggered_count + 1,
          last_triggered_at: new Date().toISOString(),
        })
        .eq("id", automation.id);
      return;
    }
  }

  // 2) IA de atendimento.
  const settings = await loadAiSettings(db, params.tenantId);
  if (!settings.enabled || !settings.auto_reply) {
    await igLog(db, { ...base, step: "skip.ai_disabled", message: "Resposta automática da IA desligada." });
    return;
  }

  const handoff = settings.handoff_keywords
    .map(normalize)
    .filter(Boolean)
    .some((keyword) => normalize(params.incomingText ?? "").includes(keyword));

  if (handoff) {
    await db.from("ig_conversations").update({ ai_paused: true }).eq("id", conversation.id);
    await db.from("ig_notifications").insert({
      tenant_id: params.tenantId,
      type: "ai.handoff",
      title: "Atendimento humano solicitado",
      body: `A conversa com @${conversation.participant_username ?? conversation.participant_id} foi pausada para um humano responder.`,
    });
    await igLog(db, { ...base, step: "ai.handoff", level: "warn", message: "Palavra-chave de handoff detectada." });
    return;
  }

  if (Number(conversation.ai_replies_count) >= settings.max_replies_per_conversation) {
    await db.from("ig_conversations").update({ ai_paused: true }).eq("id", conversation.id);
    await igLog(db, {
      ...base,
      step: "ai.limit_reached",
      level: "warn",
      message: `Limite de ${settings.max_replies_per_conversation} respostas automáticas atingido.`,
    });
    return;
  }

  const reply = await generateAiReply(db, {
    settings,
    conversationId: conversation.id as string,
    participant: (conversation.participant_username as string | null) ?? "cliente",
    incomingText: params.incomingText,
    tenantId: params.tenantId,
  });

  if (!reply) return;

  const sent = await sendDirect(db, {
    tenantId: params.tenantId,
    conversation: target,
    text: reply,
    isAi: true,
    scope: "ig-agent",
  });

  if (sent.ok) {
    await db
      .from("ig_conversations")
      .update({ ai_replies_count: Number(conversation.ai_replies_count) + 1 })
      .eq("id", conversation.id);
    await igLog(db, { ...base, step: "ai.replied", message: "IA respondeu o Direct." });
  } else {
    await igLog(db, { ...base, step: "ai.send_failed", level: "error", message: sent.error });
  }
}
