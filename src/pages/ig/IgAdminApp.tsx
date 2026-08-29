/**
 * MRO INSTAGRAM (/IG) — App da Meta: configuração e documentação.
 * O App Secret é enviado apenas para a Edge Function e nunca retorna ao cliente.
 */
import { useEffect, useState } from "react";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { igAdminApi } from "@/lib/ig/adminApi";
import IgAdminShell from "@/components/ig/IgAdminShell";
import { IgLoading } from "@/components/ig/IgStates";

const DEFAULT_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
  "instagram_business_content_publish",
  "instagram_business_manage_insights",
].join(",");

const CALLBACK_URL = `${window.location.origin}/IG/auth/instagram/callback`;
const WEBHOOK_URL = "https://adljdeekwifwcdcgbpit.supabase.co/functions/v1/ig-webhook";

export default function IgAdminApp() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [scopes, setScopes] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [hasSecret, setHasSecret] = useState(false);
  const [source, setSource] = useState<string>("none");

  useEffect(() => {
    let active = true;
    igAdminApi
      .appConfig()
      .then(({ config }) => {
        if (!active) return;
        setAppId(config.app_id ?? "");
        setScopes(config.scopes ?? DEFAULT_SCOPES);
        setVerifyToken(config.webhook_verify_token ?? "");
        setHasSecret(config.has_app_secret);
        setSource(config.source);
      })
      .catch((error: unknown) =>
        toast({
          title: "Não foi possível carregar a configuração",
          description: error instanceof Error ? error.message : "Tente novamente.",
          variant: "destructive",
        }),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    if (!appId.trim()) {
      toast({ title: "Informe o App ID", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await igAdminApi.saveAppConfig({
        app_id: appId.trim(),
        app_secret: appSecret.trim() || undefined,
        scopes: scopes.trim() || undefined,
        redirect_uri: CALLBACK_URL,
        webhook_verify_token: verifyToken.trim() || undefined,
      });
      setAppSecret("");
      setHasSecret(true);
      setSource("database");
      toast({ title: "Configuração salva", description: "As conexões novas já usam estas credenciais." });
    } catch (error) {
      toast({
        title: "Não foi possível salvar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <IgAdminShell title="App da Meta / Instagram">
      {loading ? (
        <IgLoading label="Carregando configuração..." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                Credenciais do App
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ig-app-id">App ID (Instagram App ID)</Label>
                <Input id="ig-app-id" value={appId} onChange={(e) => setAppId(e.target.value)} placeholder="1234567890" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ig-app-secret">App Secret</Label>
                <Input
                  id="ig-app-secret"
                  type="password"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder={hasSecret ? "•••••••• (já salvo — preencha só para trocar)" : "Cole o App Secret"}
                />
                <p className="text-xs text-muted-foreground">
                  Armazenado apenas no backend. Nunca é exibido nem enviado ao navegador.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ig-scopes">Permissões (scopes)</Label>
                <Input id="ig-scopes" value={scopes} onChange={(e) => setScopes(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ig-verify">Webhook Verify Token</Label>
                <Input id="ig-verify" value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} />
              </div>

              <p className="text-xs text-muted-foreground">
                Origem atual das credenciais:{" "}
                <span className="font-semibold text-foreground">
                  {source === "database" ? "salvas neste painel" : source === "secrets" ? "secrets do servidor" : "não configuradas"}
                </span>
              </p>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="mr-2 h-4 w-4" aria-hidden />
                )}
                Salvar configuração
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documentação — como configurar na Meta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  Em <span className="text-foreground">developers.facebook.com</span>, crie um app do tipo{" "}
                  <span className="text-foreground">Business</span> e adicione o produto{" "}
                  <span className="text-foreground">Instagram → API configurada com login do Instagram</span>.
                </li>
                <li>Copie o Instagram App ID e o App Secret e salve no formulário ao lado.</li>
                <li>
                  Em <span className="text-foreground">Business login settings</span>, cadastre a URI de redirecionamento
                  OAuth exatamente como abaixo.
                </li>
                <li>
                  Em <span className="text-foreground">Webhooks</span>, use a Callback URL e o Verify Token abaixo e
                  assine os campos <span className="text-foreground">messages, comments, live_comments, message_reactions</span>.
                </li>
                <li>
                  Solicite no App Review as permissões avançadas listadas em “Permissões (scopes)”. A conta do cliente
                  precisa ser Profissional (Business ou Criador).
                </li>
              </ol>

              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground">OAuth Redirect URI</p>
                  <code className="block break-all text-xs">{CALLBACK_URL}</code>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Webhook Callback URL</p>
                  <code className="block break-all text-xs">{WEBHOOK_URL}</code>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Deauthorize / Data deletion</p>
                  <code className="block break-all text-xs">{`${window.location.origin}/politica-de-privacidade-ig`}</code>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </IgAdminShell>
  );
}
