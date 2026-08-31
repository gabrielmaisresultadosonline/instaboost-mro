/**
 * /IG/contacts e /IG/crm — contatos reais gerados por Directs e comentários.
 * A lista é a visão tabular; o CRM é o mesmo dado em colunas por estágio.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import IgModuleShell from "@/components/ig/IgModuleShell";
import { IgEmpty, IgError, IgLoading } from "@/components/ig/IgStates";
import { useToast } from "@/hooks/use-toast";
import { igApi, type IgContact, type IgContactStage } from "@/lib/ig/api";

const STAGES: Array<{ value: IgContactStage; label: string }> = [
  { value: "novo", label: "Novo" },
  { value: "contato", label: "Em contato" },
  { value: "qualificado", label: "Qualificado" },
  { value: "negociacao", label: "Negociação" },
  { value: "cliente", label: "Cliente" },
  { value: "perdido", label: "Perdido" },
];

function label(contact: IgContact): string {
  if (contact.username) return `@${contact.username}`;
  return contact.name ?? `Contato ${contact.participant_id.slice(-6)}`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function useContacts(tenantId: string) {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<IgContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await igApi.contacts(tenantId);
      setContacts(result.contacts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os contatos.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStage = useCallback(
    async (contact: IgContact, stage: IgContactStage) => {
      const previous = contacts;
      setContacts((current) => current.map((item) => (item.id === contact.id ? { ...item, stage } : item)));
      try {
        await igApi.updateContact(tenantId, contact.id, { stage });
      } catch (err) {
        setContacts(previous);
        toast({
          variant: "destructive",
          title: "Não foi possível mover o contato",
          description: err instanceof Error ? err.message : "Tente novamente.",
        });
      }
    },
    [contacts, tenantId, toast],
  );

  return { contacts, loading, error, load, changeStage };
}

const emptyState = (
  <IgEmpty
    icon={<Users className="h-6 w-6" aria-hidden />}
    title="Nenhum contato ainda"
    description="Cada pessoa que enviar um Direct ou comentar suas publicações entra aqui automaticamente. Use Sincronizar para importar o histórico recente."
  />
);

const ContactsTable = ({ tenantId }: { tenantId: string }) => {
  const { contacts, loading, error, load, changeStage } = useContacts(tenantId);

  if (error) return <IgError message={error} onRetry={load} />;
  if (loading) return <IgLoading label="Carregando contatos..." />;
  if (contacts.length === 0) return emptyState;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Contato</th>
            <th className="px-4 py-3">Origem</th>
            <th className="px-4 py-3">Última interação</th>
            <th className="px-4 py-3">Estágio</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr key={contact.id} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-3 font-medium text-foreground">{label(contact)}</td>
              <td className="px-4 py-3">
                <Badge variant="secondary">{contact.source === "comment" ? "Comentário" : "Direct"}</Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(contact.last_interaction_at)}</td>
              <td className="px-4 py-3">
                <Select value={contact.stage} onValueChange={(value) => void changeStage(contact, value as IgContactStage)}>
                  <SelectTrigger className="w-40" aria-label={`Estágio de ${label(contact)}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((stage) => (
                      <SelectItem key={stage.value} value={stage.value}>
                        {stage.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const CrmBoard = ({ tenantId }: { tenantId: string }) => {
  const { contacts, loading, error, load, changeStage } = useContacts(tenantId);

  const grouped = useMemo(() => {
    const map = new Map<IgContactStage, IgContact[]>(STAGES.map((stage) => [stage.value, []]));
    for (const contact of contacts) {
      map.get(contact.stage)?.push(contact);
    }
    return map;
  }, [contacts]);

  if (error) return <IgError message={error} onRetry={load} />;
  if (loading) return <IgLoading label="Montando seu CRM..." />;
  if (contacts.length === 0) return emptyState;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {STAGES.map((stage) => {
        const items = grouped.get(stage.value) ?? [];
        return (
          <section key={stage.value} className="rounded-xl border border-border bg-card p-4">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">{stage.label}</h2>
              <Badge variant="secondary">{items.length}</Badge>
            </header>
            <ul className="space-y-2">
              {items.map((contact) => (
                <li key={contact.id} className="rounded-lg border border-border/70 bg-background p-3">
                  <p className="text-sm font-medium text-foreground">{label(contact)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(contact.last_interaction_at)}</p>
                  <Select value={contact.stage} onValueChange={(value) => void changeStage(contact, value as IgContactStage)}>
                    <SelectTrigger className="mt-2 h-8 text-xs" aria-label={`Mover ${label(contact)}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              ))}
              {items.length === 0 ? <li className="text-xs text-muted-foreground">Vazio</li> : null}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

export function IgContactsPage() {
  return (
    <IgModuleShell title="Contatos" description="Pessoas reais que interagiram com sua conta">
      {({ tenantId }) => <ContactsTable tenantId={tenantId} />}
    </IgModuleShell>
  );
}

export function IgCrmPage() {
  return (
    <IgModuleShell title="CRM" description="Funil de relacionamento por estágio">
      {({ tenantId }) => <CrmBoard tenantId={tenantId} />}
    </IgModuleShell>
  );
}

export default IgContactsPage;
