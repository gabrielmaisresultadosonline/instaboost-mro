/**
 * Realtime próprio, sobre LISTEN/NOTIFY do PostgreSQL.
 *
 * Desafio: as telas que usam tempo real (Inbox do IG, CRM) chamam
 * `supabase.channel(...).on('postgres_changes', ...)`. Para não reescrever
 * essas telas, este módulo fala o mesmo protocolo (Phoenix sobre WebSocket)
 * que o SDK espera em `/realtime/v1/websocket`.
 *
 * Fonte dos eventos: o trigger `realtime_notify` (ver migrations/000_bootstrap.sql)
 * publica cada INSERT/UPDATE/DELETE no canal `realtime_changes`.
 */

import { WebSocketServer, type WebSocket } from "ws";
import type { Server } from "node:http";
import { Client } from "pg";
import { env } from "./env.js";

interface Binding {
  /** Id numérico devolvido no join; o SDK usa isso para rotear o evento. */
  id: number;
  event: string;
  table: string;
  /** Filtro no formato `coluna=eq.valor`, opcional. */
  filter: string | null;
}

interface Channel {
  topic: string;
  bindings: Binding[];
}

interface Connection {
  socket: WebSocket;
  channels: Map<string, Channel>;
}

interface ChangePayload {
  table: string;
  type: "INSERT" | "UPDATE" | "DELETE";
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
  truncated?: boolean;
}

const connections = new Set<Connection>();
let bindingSequence = 1;

export function attachRealtime(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  // O SDK conecta em /realtime/v1/websocket; aceitamos também o caminho curto
  // para clientes próprios.
  server.on("upgrade", (request, socket, head) => {
    const pathname = (request.url ?? "").split("?")[0];
    if (pathname !== "/realtime/v1/websocket" && pathname !== "/realtime/v1") {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
  });

  wss.on("connection", (socket) => {
    const connection: Connection = { socket, channels: new Map() };
    connections.add(connection);

    socket.on("message", (raw) => handleMessage(connection, String(raw)));
    socket.on("close", () => connections.delete(connection));
    socket.on("error", () => connections.delete(connection));
  });

  startListener();
}

function handleMessage(connection: Connection, raw: string): void {
  let message: { topic?: string; event?: string; payload?: unknown; ref?: string };
  try {
    message = JSON.parse(raw);
  } catch {
    return;
  }

  const { topic, event, ref } = message;
  if (!topic || !event) return;

  if (event === "heartbeat") {
    reply(connection, topic, ref, { status: "ok", response: {} });
    return;
  }

  if (event === "phx_join") {
    const payload = message.payload as
      | { config?: { postgres_changes?: { event?: string; table?: string; filter?: string }[] } }
      | undefined;

    const requested = payload?.config?.postgres_changes ?? [];
    const bindings: Binding[] = requested.map((item) => ({
      id: bindingSequence++,
      event: (item.event ?? "*").toUpperCase(),
      table: item.table ?? "*",
      filter: item.filter ?? null,
    }));

    connection.channels.set(topic, { topic, bindings });

    // O SDK só considera o canal inscrito depois deste reply com os ids.
    reply(connection, topic, ref, {
      status: "ok",
      response: {
        postgres_changes: bindings.map((binding) => ({
          id: binding.id,
          event: binding.event === "*" ? "*" : binding.event,
          schema: "public",
          table: binding.table,
          filter: binding.filter ?? undefined,
        })),
      },
    });
    return;
  }

  if (event === "phx_leave") {
    connection.channels.delete(topic);
    reply(connection, topic, ref, { status: "ok", response: {} });
    return;
  }

  if (event === "access_token") {
    // Renovação de token: nossas policies são avaliadas na API REST, e o canal
    // não expõe dados além do que o trigger publica, então apenas confirmamos.
    reply(connection, topic, ref, { status: "ok", response: {} });
  }
}

function reply(connection: Connection, topic: string, ref: string | undefined, payload: unknown): void {
  send(connection.socket, { topic, event: "phx_reply", payload, ref: ref ?? null });
}

function send(socket: WebSocket, message: unknown): void {
  if (socket.readyState === 1) socket.send(JSON.stringify(message));
}

/** Avalia o filtro `coluna=eq.valor` que o SDK envia no join. */
function matchesFilter(filter: string | null, record: Record<string, unknown> | null): boolean {
  if (!filter) return true;
  if (!record) return false;

  const match = /^([A-Za-z0-9_]+)=(eq|neq|gt|gte|lt|lte|in)\.(.*)$/.exec(filter);
  if (!match) return true;

  const [, column, operator, rawValue] = match;
  const actual = record[column];
  if (actual === undefined) return false;

  const actualText = String(actual);

  switch (operator) {
    case "eq":
      return actualText === rawValue;
    case "neq":
      return actualText !== rawValue;
    case "gt":
      return Number(actual) > Number(rawValue);
    case "gte":
      return Number(actual) >= Number(rawValue);
    case "lt":
      return Number(actual) < Number(rawValue);
    case "lte":
      return Number(actual) <= Number(rawValue);
    case "in":
      return rawValue.replace(/^\(|\)$/g, "").split(",").includes(actualText);
    default:
      return true;
  }
}

function broadcast(change: ChangePayload): void {
  const commitTimestamp = new Date().toISOString();

  for (const connection of connections) {
    for (const channel of connection.channels.values()) {
      const target = change.type === "DELETE" ? change.old_record : change.record;

      const ids = channel.bindings
        .filter((binding) => binding.table === change.table || binding.table === "*")
        .filter((binding) => binding.event === "*" || binding.event === change.type)
        .filter((binding) => matchesFilter(binding.filter, target))
        .map((binding) => binding.id);

      if (ids.length === 0) continue;

      send(connection.socket, {
        topic: channel.topic,
        event: "postgres_changes",
        ref: null,
        payload: {
          ids,
          data: {
            schema: "public",
            table: change.table,
            commit_timestamp: commitTimestamp,
            type: change.type,
            // `columns` vazio faz o SDK entregar os valores como vieram do JSON.
            columns: [],
            record: change.record ?? {},
            old_record: change.old_record ?? {},
            errors: null,
          },
        },
      });
    }
  }
}

/**
 * Conexão dedicada para o LISTEN. Não pode sair do pool: o pool recicla
 * conexões e a inscrição seria perdida silenciosamente.
 */
function startListener(): void {
  const client = new Client({ connectionString: env.database.url });

  client
    .connect()
    .then(() => client.query("LISTEN realtime_changes"))
    .then(() => console.log("[realtime] escutando o canal realtime_changes"))
    .catch((error: Error) => {
      console.error("[realtime] falha ao conectar, nova tentativa em 5s:", error.message);
      setTimeout(startListener, 5_000);
    });

  client.on("notification", (message) => {
    if (!message.payload) return;
    try {
      broadcast(JSON.parse(message.payload) as ChangePayload);
    } catch (error) {
      console.error("[realtime] payload inválido:", (error as Error).message);
    }
  });

  client.on("error", (error) => {
    console.error("[realtime] conexão caiu, reconectando:", error.message);
    client.end().catch(() => undefined);
    setTimeout(startListener, 5_000);
  });
}

export function realtimeStatus(): { connections: number; channels: number } {
  let channels = 0;
  for (const connection of connections) channels += connection.channels.size;
  return { connections: connections.size, channels };
}
