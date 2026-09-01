/**
 * /IG/diagnostico — por que o Direct (ou qualquer módulo) não abre.
 *
 * Executa as mesmas chamadas que o backend faz na Graph API e mostra o
 * resultado passo a passo: HTTP, erro literal da Meta, contagens no banco e
 * fila de jobs. Todo o relatório também é impresso no console do navegador
 * (F12) e pode ser copiado para colar no terminal/suporte.
 */
import { useCallback, useEffect, useState } from "react";
import { ClipboardCopy, RefreshCcw, Stethoscope, Terminal } from "lucide-react";
import IgGuard from "@/components/ig/IgGuard";
import IgLayout from "@/components/ig/IgLayout";
import { IgEmpty, IgError, IgLoading } from "@/components/ig/IgStates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { igApi, type IgDiagLog, type IgDiagReport } from "@/lib/ig/api";

/** Traduz os erros mais comuns da Meta em uma ação concreta. */
function explain(step: string, error: string | null): string | null {
  if (!error) return null;
  const lower = error.toLowerCase();
  if (lower.includes("permission") || lower.includes("scope")) {
    return "Falta permissão no app da Meta. Reconecte o Instagram concedendo acesso a mensagens (instagram_business_manage_messages).";
  }
  if (lower.includes("expired") || lower.includes("session")) {
    return "O token expirou. Reconecte a conta em Configurações → Instagram.";
  }
  if (step.includes("conversations")) {
    return "A conta precisa liberar o acesso a mensagens no app do Instagram: Configurações → Mensagens e respostas aos stories → Ferramentas conectadas → Permitir acesso a mensagens.";
  }
  return null;
}

const LEVEL_VARIANT: Record<IgDiagLog["level"], "default" | "secondary" | "destructive" | "outline"> = {
  debug: "outline",
  info: "secondary",
  warn: "default",
  error: "destructive",
};

const IgDiagnosticsContent = ({ tenantId }: { tenantId: string }) => {
  const { toast } = useToast();
  const [report, setReport] = useState<IgDiagReport[] | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [logs, setLogs] = useState<IgDiagLog[]>([]);
  const [running, setRunning] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const result = await igApi.logs(tenantId);
      setLogs(result.logs);
      // Espelha no console do navegador para leitura rápida (F12 / terminal).
      console.groupCollapsed(`[IG] ${result.logs.length} logs técnicos`);
      result.logs.forEach((log) => {
        const line = `${log.created_at} [${log.scope}] ${log.step} http=${log.http_status ?? "-"} ${log.message ?? ""}`;
        if (log.level === "error") console.error(line, log.detail);
        else console.log(line, log.detail);
      });
      console.groupEnd();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os logs.");
    } finally {
      setLoadingLogs(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const runDiag = async () => {
    setRunning(true);
    try {
      const result = await igApi.diag(tenantId);
      setReport(result.report);
      setHint(result.hint ?? null);
      console.info("[IG] relatório de diagnóstico", result.report);
      await loadLogs();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Diagnóstico falhou",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setRunning(false);
    }
  };

  const copyAll = async () => {
    const text = JSON.stringify({ report, logs }, null, 2);
    await navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Cole no terminal ou envie para o suporte." });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-4 w-4" aria-hidden />
              Teste de conexão com a Meta
            </CardTitle>
            <CardDescription>
              Roda as chamadas reais da Graph API e mostra o erro literal devolvido pelo Instagram.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={runDiag} disabled={running}>
              <RefreshCcw className={running ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} aria-hidden />
              {running ? "Testando..." : "Executar diagnóstico"}
            </Button>
            <Button variant="outline" onClick={copyAll}>
              <ClipboardCopy className="mr-2 h-4 w-4" aria-hidden />
              Copiar tudo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
          {report === null ? (
            <p className="text-sm text-muted-foreground">
              Clique em “Executar diagnóstico” para testar perfil, mídias, conversas e assinatura de webhook.
            </p>
          ) : report.length === 0 ? (
            <IgEmpty title="Sem contas conectadas" description="Conecte um Instagram para diagnosticar." />
          ) : (
            report.map((item, index) => {
              const account = typeof item.account === "object" && item.account ? item.account : null;
              return (
                <div key={index} className="space-y-3 rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">@{account?.username ?? "conta"}</span>
                    <Badge variant={account?.connection_state === "connected" ? "default" : "destructive"}>
                      {account?.connection_state ?? "sem token"}
                    </Badge>
                    <Badge variant={account?.webhook_subscribed ? "default" : "secondary"}>
                      webhook {account?.webhook_subscribed ? "assinado" : "não assinado"}
                    </Badge>
                    {item.pending_jobs ? <Badge variant="outline">{item.pending_jobs} jobs na fila</Badge> : null}
                  </div>

                  <div className="grid gap-2 text-xs sm:grid-cols-5">
                    {Object.entries(item.db_counts ?? {}).map(([table, count]) => (
                      <div key={table} className="rounded-md bg-muted px-2 py-1">
                        <span className="text-muted-foreground">{table.replace("ig_", "")}</span>
                        <span className="ml-1 font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {item.probes.map((probe) => {
                      const tip = explain(probe.step, probe.error);
                      return (
                        <div key={probe.step} className="rounded-md border border-border p-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={probe.ok ? "default" : "destructive"}>{probe.ok ? "OK" : "FALHOU"}</Badge>
                            <code className="text-xs">{probe.step}</code>
                            <span className="text-xs text-muted-foreground">HTTP {probe.http}</span>
                            {probe.count !== null ? (
                              <span className="text-xs text-muted-foreground">{probe.count} item(ns)</span>
                            ) : null}
                          </div>
                          {probe.error ? (
                            <p className="mt-2 break-words font-mono text-xs text-destructive">{probe.error}</p>
                          ) : null}
                          {tip ? <p className="mt-2 text-xs text-muted-foreground">Como resolver: {tip}</p> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="h-4 w-4" aria-hidden />
              Logs técnicos (últimos 200)
            </CardTitle>
            <CardDescription>
              Cada chamada à Meta, resposta do agente de IA e envio de Direct. Também impresso no console (F12).
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadLogs()}>
            <RefreshCcw className="mr-2 h-4 w-4" aria-hidden />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {error ? (
            <IgError message={error} onRetry={loadLogs} />
          ) : loadingLogs ? (
            <IgLoading label="Carregando logs..." />
          ) : logs.length === 0 ? (
            <IgEmpty
              title="Nenhum log ainda"
              description="Execute o diagnóstico ou uma sincronização para gerar registros."
            />
          ) : (
            <div className="max-h-[520px] overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">
              {logs.map((log) => (
                <div key={log.id} className="flex flex-wrap items-start gap-2 border-b border-border/50 py-1.5">
                  <span className="text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("pt-BR")}
                  </span>
                  <Badge variant={LEVEL_VARIANT[log.level]} className="shrink-0">
                    {log.level}
                  </Badge>
                  <span className="text-primary">{log.scope}</span>
                  <span>{log.step}</span>
                  {log.http_status != null ? <span className="text-muted-foreground">http={log.http_status}</span> : null}
                  {log.duration_ms != null ? <span className="text-muted-foreground">{log.duration_ms}ms</span> : null}
                  {log.message ? <span className="break-words">— {log.message}</span> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const IgDiagnostics = () => (
  <IgGuard>
    {({ me, activeTenantId, setActiveTenantId }) => (
      <IgLayout
        title="Diagnóstico"
        description="Descubra exatamente onde a integração com o Instagram está travando."
        tenants={me?.tenants ?? []}
        activeTenantId={activeTenantId}
        onTenantChange={setActiveTenantId}
      >
        {activeTenantId ? (
          <IgDiagnosticsContent tenantId={activeTenantId} />
        ) : (
          <IgLoading label="Preparando workspace..." />
        )}
      </IgLayout>
    )}
  </IgGuard>
);

export default IgDiagnostics;
