/**
 * Realtime via LISTEN/NOTIFY do próprio PostgreSQL.
 *
 * Substitui o serviço de realtime externo nas telas que dependem dele
 * (Inbox do IG e CRM). Um trigger genérico publica as mudanças no canal
 * `realtime_changes`; este módulo distribui para os clientes WebSocket
 * inscritos na tabela correspondente.
 */

import { WebSocketServer, type WebSocket } from "ws";
import type { Server } from "node:http";
import { Client } from "pg";
import { env } from "./env.js";

interface Subscriber {
  socket: WebSocket;
  /** Tabelas assinadas por este cliente. */
  tables: Set<string>;
}

const subscribers = new Set<Subscriber>();

export function attachRealtime(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/realtime/v1" });

  wss.on("connection", (socket) => {
    const subscriber: Subscriber = { socket, tables: new Set() };
    subscribers.add(subscriber);

    socket.on("message", (raw) => {
      try {
        const message = JSON.parse(String(raw)) as {
          event?: string;
          table?: string;
        };
        if (message.event === "subscribe" && message.table) {
          subscriber.tables.add(message.table);
          socket.send(JSON.stringify({ event: "subscribed", table: message.table }));
        }
        if (message.event === "unsubscribe" && message.table) {
          subscriber.tables.delete(message.table);
        }
        if (message.event === "ping") {
          socket.send(JSON.stringify({ event: "pong" }));
        }
      } catch {
        socket.send(JSON.stringify({ event: "error", message: "payload inválido" }));
      }
    });

    socket.on("close", () => subscribers.delete(subscriber));
    socket.on("error", () => subscribers.delete(subscriber));
  });

  startListener();
}

/**
 * Conexão dedicada para LISTEN — não pode sair do pool, porque o pool
 * recicla conexões e a inscrição seria perdida silenciosamente.
 */
function startListener(): void {
  const client = new Client({ connectionString: env.database.url });

  client
    .connect()
    .then(() => client.query("LISTEN realtime_changes"))
    .then(() => console.log("[realtime] escutando canal realtime_changes"))
    .catch((error: Error) => {
      console.error("[realtime] falha ao conectar:", error.message);
      setTimeout(startListener, 5_000);
    });

  client.on("notification", (message) => {
    if (!message.payload) return;
    try {
      const change = JSON.parse(message.payload) as {
        table: string;
        type: string;
        record: unknown;
        old_record: unknown;
      };
      broadcast(change);
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

function broadcast(change: { table: string; type: string; record: unknown; old_record: unknown }) {
  const payload = JSON.stringify({ event: "change", ...change });
  for (const subscriber of subscribers) {
    if (!subscriber.tables.has(change.table) && !subscriber.tables.has("*")) continue;
    if (subscriber.socket.readyState === 1) {
      subscriber.socket.send(payload);
    }
  }
}

export function realtimeStatus() {
  return {
    connections: subscribers.size,
    subscriptions: [...subscribers].flatMap((s) => [...s.tables]),
  };
}
