/**
 * /IG/automations — automações por palavra-chave no Direct.
 *
 * As automações têm prioridade sobre o agente de IA: quando uma regra casa
 * com a mensagem recebida, ela responde e a IA não é chamada.
 */
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import IgGuard from "@/components/ig/IgGuard";
import IgLayout from "@/components/ig/IgLayout";
import { IgEmpty, IgError, IgLoading } from "@/components/ig/IgStates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { igApi, type IgAutomation } from "@/lib/ig/api";

type Draft = {
  id?: string;
  name: string;
  channel: "direct" | "comment";
  match_type: IgAutomation["match_type"];
  keywords: string;
  reply_text: string;
  is_active: boolean;
  priority: number;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  channel: "direct",
  match_type: "contains",
  keywords: "",
  reply_text: "",
  is_active: true,
  priority: 100,
};

const MATCH_LABEL: Record<IgAutomation["match_type"], string> = {
  contains: "contém a palavra",
  exact: "mensagem exata",
  starts_with: "começa com",
  any: "qualquer mensagem",
};

const IgAutomationsContent = ({ tenantId }: { tenantId: string }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<IgAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await igApi.automations(tenantId);
      setItems(result.automations);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as automações.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await igApi.saveAutomation(tenantId, {
        ...(draft.id ? { id: draft.id } : {}),
        name: draft.name,
        channel: draft.channel,
        match_type: draft.match_type,
        keywords: draft.keywords
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        reply_text: draft.reply_text,
        is_active: draft.is_active,
        priority: draft.priority,
      } as Partial<IgAutomation>);
      setDraft(EMPTY_DRAFT);
      await load();
      toast({ title: "Automação salva", description: "Já está valendo para as próximas mensagens." });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Não foi possível salvar",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: IgAutomation) => {
    try {
      await igApi.saveAutomation(tenantId, { ...item, is_active: !item.is_active });
      await load();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await igApi.deleteAutomation(tenantId, id);
      await load();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    }
  };

  if (loading) return <IgLoading label="Carregando automações..." />;
  if (error) return <IgError message={error} onRetry={load} />;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" aria-hidden />
            {draft.id ? "Editar automação" : "Nova automação"}
          </CardTitle>
          <CardDescription>Resposta imediata, sem custo de IA, na ordem de prioridade.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auto-name">Nome</Label>
            <Input
              id="auto-name"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Preço do plano"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="auto-channel">Canal</Label>
              <Select
                value={draft.channel}
                onValueChange={(value) => setDraft({ ...draft, channel: value as Draft["channel"] })}
              >
                <SelectTrigger id="auto-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="comment">Comentário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="auto-match">Gatilho</Label>
              <Select
                value={draft.match_type}
                onValueChange={(value) => setDraft({ ...draft, match_type: value as Draft["match_type"] })}
              >
                <SelectTrigger id="auto-match">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contém a palavra</SelectItem>
                  <SelectItem value="starts_with">Começa com</SelectItem>
                  <SelectItem value="exact">Mensagem exata</SelectItem>
                  <SelectItem value="any">Qualquer mensagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {draft.match_type !== "any" ? (
            <div className="space-y-2">
              <Label htmlFor="auto-keywords">Palavras-chave (separadas por vírgula)</Label>
              <Input
                id="auto-keywords"
                value={draft.keywords}
                onChange={(event) => setDraft({ ...draft, keywords: event.target.value })}
                placeholder="preço, valor, quanto custa"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="auto-reply">Resposta</Label>
            <Textarea
              id="auto-reply"
              rows={5}
              value={draft.reply_text}
              onChange={(event) => setDraft({ ...draft, reply_text: event.target.value })}
              placeholder="Nosso plano custa R$X por mês e inclui..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="auto-priority">Prioridade (menor vem primeiro)</Label>
              <Input
                id="auto-priority"
                type="number"
                value={draft.priority}
                onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) })}
              />
            </div>
            <div className="flex items-end justify-between gap-2">
              <Label htmlFor="auto-active">Ativa</Label>
              <Switch
                id="auto-active"
                checked={draft.is_active}
                onCheckedChange={(checked) => setDraft({ ...draft, is_active: checked })}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              {saving ? "Salvando..." : draft.id ? "Salvar alterações" : "Criar automação"}
            </Button>
            {draft.id ? (
              <Button variant="ghost" onClick={() => setDraft(EMPTY_DRAFT)}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3 lg:col-span-3">
        {items.length === 0 ? (
          <IgEmpty
            title="Nenhuma automação criada"
            description="Crie regras de palavra-chave para responder as dúvidas mais comuns na hora."
          />
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{item.name}</span>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Ativa" : "Pausada"}
                    </Badge>
                    <Badge variant="outline">{item.channel === "direct" ? "Direct" : "Comentário"}</Badge>
                    <Badge variant="outline">{MATCH_LABEL[item.match_type]}</Badge>
                  </div>
                  {item.keywords.length > 0 ? (
                    <p className="text-xs text-muted-foreground">Gatilhos: {item.keywords.join(", ")}</p>
                  ) : null}
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.reply_text}</p>
                  <p className="text-xs text-muted-foreground">
                    Disparada {item.triggered_count}x · prioridade {item.priority}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={() => void handleToggle(item)}
                    aria-label="Ativar automação"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDraft({
                        id: item.id,
                        name: item.name,
                        channel: item.channel,
                        match_type: item.match_type,
                        keywords: item.keywords.join(", "),
                        reply_text: item.reply_text,
                        is_active: item.is_active,
                        priority: item.priority,
                      })
                    }
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remover automação"
                    onClick={() => void handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

const IgAutomationsPage = () => (
  <IgGuard>
    {({ me, activeTenantId, setActiveTenantId }) => (
      <IgLayout
        title="Automações"
        description="Respostas por palavra-chave no Direct, antes da IA."
        tenants={me?.tenants ?? []}
        activeTenantId={activeTenantId}
        onTenantChange={setActiveTenantId}
      >
        {activeTenantId ? (
          <IgAutomationsContent tenantId={activeTenantId} />
        ) : (
          <IgLoading label="Preparando workspace..." />
        )}
      </IgLayout>
    )}
  </IgGuard>
);

export default IgAutomationsPage;
