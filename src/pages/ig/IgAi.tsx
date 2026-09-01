/**
 * /IG/ai — Agente de IA que atende o Direct do Instagram.
 *
 * A IA responde somente quando "Agente ativo" e "Responder sozinha" estão
 * ligados. Toda geração passa pelo backend (Lovable AI), nunca pelo navegador,
 * e cada tentativa fica registrada em /IG/diagnostico.
 */
import { useCallback, useEffect, useState } from "react";
import { Bot, Save } from "lucide-react";
import IgGuard from "@/components/ig/IgGuard";
import IgLayout from "@/components/ig/IgLayout";
import { IgError, IgLoading } from "@/components/ig/IgStates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { igApi, type IgAiSettings } from "@/lib/ig/api";

const MODELS = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash — equilíbrio (recomendado)" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite — mais rápido e econômico" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro — respostas mais elaboradas" },
];

const IgAiContent = ({ tenantId }: { tenantId: string }) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<IgAiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keywords, setKeywords] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await igApi.aiSettings(tenantId);
      setSettings(result.settings);
      setKeywords((result.settings.handoff_keywords ?? []).join(", "));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as configurações da IA.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (values: Partial<IgAiSettings>) =>
    setSettings((prev) => (prev ? { ...prev, ...values } : prev));

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const result = await igApi.saveAiSettings(tenantId, {
        enabled: settings.enabled,
        auto_reply: settings.auto_reply,
        model: settings.model,
        tone: settings.tone,
        persona: settings.persona,
        business_context: settings.business_context ?? "",
        knowledge: settings.knowledge ?? "",
        greeting: settings.greeting ?? "",
        max_replies_per_conversation: settings.max_replies_per_conversation,
        handoff_keywords: keywords
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      });
      setSettings(result.settings);
      toast({ title: "Configurações salvas", description: "O agente já está usando estas regras." });
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

  if (loading) return <IgLoading label="Carregando o agente de IA..." />;
  if (error) return <IgError message={error} onRetry={load} />;
  if (!settings) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" aria-hidden />
            Estado do agente
          </CardTitle>
          <CardDescription>Sem estas duas chaves ligadas a IA nunca envia mensagem.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="ai-enabled">Agente ativo</Label>
              <p className="text-xs text-muted-foreground">Libera sugestões de resposta no Inbox.</p>
            </div>
            <Switch
              id="ai-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => patch({ enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="ai-auto">Responder sozinha</Label>
              <p className="text-xs text-muted-foreground">Responde Directs recebidos automaticamente.</p>
            </div>
            <Switch
              id="ai-auto"
              checked={settings.auto_reply}
              onCheckedChange={(checked) => patch({ auto_reply: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-model">Modelo</Label>
            <Select value={settings.model} onValueChange={(value) => patch({ model: value })}>
              <SelectTrigger id="ai-model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-limit">Máximo de respostas automáticas por conversa</Label>
            <Input
              id="ai-limit"
              type="number"
              min={1}
              max={50}
              value={settings.max_replies_per_conversation}
              onChange={(event) => patch({ max_replies_per_conversation: Number(event.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              Ao atingir o limite a conversa é pausada para atendimento humano.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-handoff">Palavras que chamam um humano</Label>
            <Input
              id="ai-handoff"
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
              placeholder="falar com humano, atendente, reclamação"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Personalidade e conhecimento</CardTitle>
          <CardDescription>
            A IA só afirma o que estiver escrito aqui. Preços, prazos e links precisam constar na base.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ai-persona">Quem a IA é</Label>
              <Input
                id="ai-persona"
                value={settings.persona}
                onChange={(event) => patch({ persona: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-tone">Tom de voz</Label>
              <Input id="ai-tone" value={settings.tone} onChange={(event) => patch({ tone: event.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-greeting">Saudação (primeira mensagem)</Label>
            <Input
              id="ai-greeting"
              value={settings.greeting ?? ""}
              onChange={(event) => patch({ greeting: event.target.value })}
              placeholder="Oi! Que bom te ver por aqui 👋"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-context">Contexto do negócio</Label>
            <Textarea
              id="ai-context"
              rows={5}
              value={settings.business_context ?? ""}
              onChange={(event) => patch({ business_context: event.target.value })}
              placeholder="O que a empresa faz, para quem vende, diferenciais, horário de atendimento..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-knowledge">Base de conhecimento</Label>
            <Textarea
              id="ai-knowledge"
              rows={10}
              value={settings.knowledge ?? ""}
              onChange={(event) => patch({ knowledge: event.target.value })}
              placeholder={"Perguntas frequentes, planos e preços, política de troca, link de checkout..."}
            />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" aria-hidden />
            {saving ? "Salvando..." : "Salvar configurações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const IgAi = () => (
  <IgGuard>
    {({ me, activeTenantId, setActiveTenantId }) => (
      <IgLayout
        title="Agente de IA"
        description="Atendimento automático dos Directs com a API oficial do Instagram."
        tenants={me?.tenants ?? []}
        activeTenantId={activeTenantId}
        onTenantChange={setActiveTenantId}
      >
        {activeTenantId ? <IgAiContent tenantId={activeTenantId} /> : <IgLoading label="Preparando workspace..." />}
      </IgLayout>
    )}
  </IgGuard>
);

export default IgAi;
