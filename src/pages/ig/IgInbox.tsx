/**
 * /IG/inbox — Direct do Instagram em tempo real, com resposta pela API oficial.
 *
 * As mensagens chegam pelo webhook da Meta (ig-webhook → ig-worker) e a tela
 * escuta as tabelas via Realtime, sem polling agressivo.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import IgLayout from "@/components/ig/IgLayout";
import IgGuard from "@/components/ig/IgGuard";
import { IgEmpty, IgError, IgLoading } from "@/components/ig/IgStates";
import { igApi, type IgConversation, type IgMessage } from "@/lib/ig/api";
import { useIgSession } from "@/lib/ig/useIgSession";
import { useToast } from "@/hooks/use-toast";

function formatTime(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function participantLabel(conversation: IgConversation): string {
  return conversation.participant_username
    ? `@${conversation.participant_username}`
    : conversation.participant_name ?? `Contato ${conversation.participant_id.slice(-6)}`;
}

const IgInboxContent = ({
  tenantId,
  tenants,
  activeTenantId,
  onTenantChange,
}: {
  tenantId: string;
  tenants: Parameters<typeof IgLayout>[0]["tenants"];
  activeTenantId: string | null;
  onTenantChange: (id: string) => void;
}) => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<IgConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<IgMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const result = await igApi.conversations(tenantId);
      setConversations(result.conversations);
      setError(null);
      return result.conversations;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as conversas.");
      return [];
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const loadMessages = useCallback(
    async (conversationId: string, silent = false) => {
      if (!silent) setLoadingMessages(true);
      try {
        const result = await igApi.messages(tenantId, conversationId);
        setMessages(result.messages);
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)),
        );
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: err instanceof Error ? err.message : "Não foi possível abrir a conversa.",
        });
      } finally {
        setLoadingMessages(false);
      }
    },
    [tenantId, toast],
  );

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  // Realtime: novas mensagens e atualização da lista de conversas.
  useEffect(() => {
    const channel = supabase
      .channel(`ig-inbox-${tenantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ig_conversations", filter: `tenant_id=eq.${tenantId}` },
        () => {
          void loadConversations();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ig_messages", filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          const row = payload.new as { conversation_id?: string };
          if (row.conversation_id && row.conversation_id === selectedId) {
            void loadMessages(row.conversation_id, true);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenantId, selectedId, loadConversations, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const handleSend = async () => {
    const text = draft.trim();
    if (!selectedId || !text) return;
    setSending(true);
    try {
      await igApi.sendMessage(tenantId, selectedId, text);
      setDraft("");
      await loadMessages(selectedId, true);
      await loadConversations();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Não foi possível enviar",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleSync = async () => {
    try {
      await igApi.subscribeWebhook(tenantId);
      toast({ title: "Recebimento reativado", description: "Sua conta voltou a assinar os eventos de Direct." });
      await loadConversations();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    }
  };

  return (
    <IgLayout
      title="Inbox"
      description="Directs recebidos pela API oficial do Instagram, em tempo real."
      tenants={tenants}
      activeTenantId={activeTenantId}
      onTenantChange={onTenantChange}
      actions={
        <Button variant="outline" size="sm" onClick={handleSync}>
          <RefreshCcw className="mr-2 h-4 w-4" aria-hidden />
          Reativar recebimento
        </Button>
      }
    >
      {error ? (
        <IgError message={error} onRetry={loadConversations} />
      ) : loading ? (
        <IgLoading label="Carregando conversas..." />
      ) : conversations.length === 0 ? (
        <IgEmpty
          title="Nenhuma conversa ainda"
          description="Envie um Direct para a conta conectada. Se nada aparecer, clique em Reativar recebimento para assinar novamente os eventos da Meta."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          {/* Lista de conversas */}
          <ul className="max-h-[70vh] space-y-2 overflow-y-auto rounded-xl border border-border bg-card p-2">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={cn(
                    "w-full rounded-lg px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedId === conversation.id ? "bg-primary/10" : "hover:bg-muted",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{participantLabel(conversation)}</span>
                    {conversation.unread_count > 0 ? (
                      <Badge className="shrink-0">{conversation.unread_count}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {conversation.last_message_text ?? "Sem mensagens"}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{formatTime(conversation.last_message_at)}</p>
                </button>
              </li>
            ))}
          </ul>

          {/* Conversa */}
          <div className="flex max-h-[70vh] min-h-[420px] flex-col rounded-xl border border-border bg-card">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
                Selecione uma conversa para responder.
              </div>
            ) : (
              <>
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold">{participantLabel(selected)}</p>
                  <p className="text-xs text-muted-foreground">
                    A Meta permite responder até 24h após a última mensagem do usuário.
                  </p>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {loadingMessages ? (
                    <IgLoading label="Carregando mensagens..." />
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma mensagem nesta conversa.</p>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn("flex", message.direction === "out" ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                            message.direction === "out"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground",
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {message.text ?? "[anexo recebido no Instagram]"}
                          </p>
                          <p className="mt-1 text-[11px] opacity-70">{formatTime(message.sent_at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>

                <form
                  className="flex items-center gap-2 border-t border-border px-4 py-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSend();
                  }}
                >
                  <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Escreva sua resposta..."
                    maxLength={950}
                    aria-label="Mensagem"
                  />
                  <Button type="submit" disabled={sending || !draft.trim()}>
                    <Send className="mr-2 h-4 w-4" aria-hidden />
                    {sending ? "Enviando..." : "Enviar"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </IgLayout>
  );
};

const IgInbox = () => {
  const { loading, me, activeTenantId, setActiveTenantId, error } = useIgSession();

  if (loading) return <IgLoading label="Carregando..." />;
  if (error) return <IgError message={error} />;

  const tenantId = activeTenantId ?? me?.tenants[0]?.id ?? null;
  if (!tenantId) {
    return (
      <IgLayout title="Inbox">
        <IgEmpty title="Workspace não encontrado" description="Recarregue a página ou faça login novamente." />
      </IgLayout>
    );
  }

  return (
    <IgInboxContent
      tenantId={tenantId}
      tenants={me?.tenants ?? []}
      activeTenantId={activeTenantId}
      onTenantChange={setActiveTenantId}
    />
  );
};

const IgInboxPage = () => (
  <IgGuard>
    <IgInbox />
  </IgGuard>
);

export default IgInboxPage;
