import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check, Database, Server } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  ANON_KEY_PLACEHOLDER,
  DEFAULT_VPS_API_URL,
  SUPABASE_ANON_KEY,
  saveVpsAnonKey,
  vpsAnonKey as readVpsAnonKey,
  vpsAnonKeyFromBuild,
  vpsApiUrl,
} from '@/lib/vpsApiConfig';

/** Ferramenta a ser documentada. Cada uma tem sua própria função de API. */
export type ExtensionTool = 'mro' | 'zapmro';

interface ExtensionPostgresDocsProps {
  tool: ExtensionTool;
  /** Origem pública da API na VPS. Pode ser trocada pelo admin. */
  defaultApiUrl?: string;
}

const TOOL_META: Record<ExtensionTool, { label: string; fn: string; legacy: string }> = {
  mro: {
    label: 'Ferramenta MRO (Instagram)',
    fn: 'mro-tool-api',
    legacy: 'https://adljdeekwifwcdcgbpit.supabase.co/functions/v1/mro-tool-api',
  },
  zapmro: {
    label: 'ZAPMRO (WhatsApp)',
    fn: 'zapmro-api',
    legacy: 'https://adljdeekwifwcdcgbpit.supabase.co/functions/v1/zapmro-api',
  },
};

const DEFAULT_API = DEFAULT_VPS_API_URL;

/**
 * Documentação da NOVA versão da extensão, já apontando para o backend
 * próprio em PostgreSQL (VPS). O contrato de request/response é idêntico ao
 * atual — o único item que muda na extensão é a URL base (e a chave anon).
 *
 * Motivo do desenho: manter as duas documentações lado a lado permite publicar
 * uma versão nova da extensão e validar em produção ANTES de desligar o
 * Supabase, sem janela de indisponibilidade.
 */
const ExtensionPostgresDocs: React.FC<ExtensionPostgresDocsProps> = ({
  tool,
  defaultApiUrl = vpsApiUrl(),
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState<string>(defaultApiUrl);
  const [anonKey, setAnonKey] = useState<string>(() => readVpsAnonKey());
  const keyFromBuild = vpsAnonKeyFromBuild();

  const meta = TOOL_META[tool];
  const base = apiUrl.replace(/\/+$/, '');
  const endpoint = `${base}/functions/v1/${meta.fn}`;

  /**
   * Sem chave preenchida usamos um marcador explícito em vez de string vazia:
   * um curl com `apikey: ` vazio falharia silenciosamente com 401 e o
   * programador perderia tempo procurando o erro no lugar errado.
   */
  const vpsKey = anonKey.trim() || ANON_KEY_PLACEHOLDER;
  const supaKey = SUPABASE_ANON_KEY || 'COLE_AQUI_A_ANON_KEY_DO_SUPABASE';

  const saveVpsKey = (value: string): void => {
    setAnonKey(value);
    saveVpsAnonKey(value);
  };


  const copy = (key: string, value: string): void => {
    void navigator.clipboard.writeText(value);
    setCopied(key);
    toast({ title: 'Copiado!' });
    window.setTimeout(() => setCopied(null), 1500);
  };

  const curl = useMemo(
    () => `curl -X POST '${endpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'apikey: ${vpsKey}' \\
  -H 'Authorization: Bearer ${vpsKey}' \\
  -d '{"action":"login","username":"usuario","password":"senha"}'`,
    [endpoint, vpsKey],
  );

  const keysSnippet = useMemo(
    () => `# ---- Chaves de API (headers) ----
# Backend ATUAL (Supabase)
SUPABASE_URL=https://adljdeekwifwcdcgbpit.supabase.co
SUPABASE_ANON_KEY=${supaKey}

# Backend NOVO (PostgreSQL na VPS)
API_URL=${base}
API_ANON_KEY=${vpsKey}

# Em ambos os backends a chave vai nos DOIS headers:
#   apikey: <ANON_KEY>
#   Authorization: Bearer <ANON_KEY>   (ou o JWT do usuário logado)`,
    [base, supaKey, vpsKey],
  );

  const migrationSnippet = useMemo(
    () => `// ===== extensão: config.js =====
// Mantenha AS DUAS URLs durante a transição.
const BACKENDS = {
  supabase: {
    url: "${meta.legacy}",
    apikey: "${supaKey}",
  },
  postgres: {
    url: "${endpoint}",
    apikey: "${vpsKey}",
  },
};

// ATENÇÃO: mantenha "supabase" enquanto a VPS não devolver os headers de CORS
// ('Access-Control-Allow-Origin') para https://www.instagram.com. Com PREFER
// "postgres" antes disso o preflight falha e a extensão fica sem backend.
const PREFER = "supabase";

async function api(body) {
  const order = PREFER === "postgres" ? ["postgres", "supabase"] : ["supabase", "postgres"];
  let lastError = null;

  for (const key of order) {
    const cfg = BACKENDS[key];
    try {
      const res = await fetch(cfg.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: cfg.apikey,
          Authorization: "Bearer " + cfg.apikey,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok && res.status >= 500) throw new Error("backend " + key + " indisponível");
      return { ...(await res.json()), _backend: key };
    } catch (error) {
      lastError = error;   // tenta o próximo backend
    }
  }
  throw lastError ?? new Error("Nenhum backend respondeu");
}`,
    [endpoint, meta.legacy, supaKey, vpsKey],
  );

  const healthSnippet = `# 1) o backend da VPS está de pé?
# Não depende de jq: curl falha se a API não responder com HTTP 2xx.
curl -fsS ${base}/health && echo

# 2) a função da extensão responde?
curl -fsS -X POST '${endpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'apikey: ${vpsKey}' \\
  -H 'Authorization: Bearer ${vpsKey}' \\
  -d '{"action":"verify_user","username":"usuario_de_teste"}' && echo

# 3) CORS liberado para a extensão? (motivo nº1 de falha em produção)
# A resposta do preflight PRECISA conter 'access-control-allow-origin'.
curl -si -X OPTIONS '${endpoint}' \\
  -H 'Origin: https://www.instagram.com' \\
  -H 'Access-Control-Request-Method: POST' \\
  -H 'Access-Control-Request-Headers: authorization, apikey, content-type' \\
  | grep -i 'access-control-allow' || echo 'FALHOU: VPS sem CORS — mantenha PREFER = "supabase"'`;

  const Block: React.FC<{ id: string; title: string; description?: string; code: string }> = ({
    id,
    title,
    description,
    code,
  }) => (
    <Card className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-sm">{title}</h4>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        <Button size="sm" variant="outline" onClick={() => copy(id, code)}>
          {copied === id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      </div>
      <pre className="bg-muted rounded-md p-3 text-[11px] overflow-x-auto whitespace-pre">{code}</pre>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Documentação PostgreSQL (VPS) — {meta.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-1">
            <p className="text-xs font-semibold text-destructive">
              ⚠️ Enquanto o domínio da VPS não responder, use o backend atual (nuvem)
            </p>
            <p className="text-xs text-muted-foreground">
              Se a extensão apontar para <code>{base}</code> antes do corte, o navegador bloqueia com{' '}
              <em>“No 'Access-Control-Allow-Origin' header”</em> / <code>ERR_FAILED</code> — o servidor nem é
              alcançado. Por isso os exemplos abaixo já vêm com <code>PREFER = "supabase"</code> e o checklist do
              item 5 tem um teste de CORS obrigatório.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Esta é a documentação da <strong>versão nova</strong> da extensão, já apontando para o backend próprio em
            PostgreSQL. Todas as <em>actions</em>, campos de envio e respostas são <strong>exatamente os mesmos</strong>{' '}
            da documentação atual (Supabase) — só muda a URL base e a chave <code>apikey</code>. Assim você publica a
            versão nova, valida em produção e só depois desliga o backend antigo.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border p-3 space-y-1">
              <Badge variant="outline" className="gap-1">
                <Server className="w-3 h-3" /> Atual (Supabase)
              </Badge>
              <code className="block text-[11px] break-all text-muted-foreground">{meta.legacy}</code>
            </div>
            <div className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-1">
              <Badge className="gap-1">
                <Database className="w-3 h-3" /> Nova (PostgreSQL / VPS)
              </Badge>
              <code className="block text-[11px] break-all">{endpoint}</code>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="pg-api-url">
              Origem da API na VPS
            </label>
            <div className="flex gap-2">
              <input
                id="pg-api-url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-xs"
                placeholder={DEFAULT_API}
              />
              <Button size="sm" variant="outline" onClick={() => copy('endpoint', endpoint)}>
                {copied === 'endpoint' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="pg-anon-key">
              ANON_KEY da VPS {keyFromBuild ? '(carregada automaticamente do build da VPS)' : '(gerada no painel → aba Migração)'}
            </label>
            <div className="flex gap-2">
              <input
                id="pg-anon-key"
                value={anonKey}
                onChange={(e) => saveVpsKey(e.target.value)}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-xs font-mono"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
              <Button size="sm" variant="outline" onClick={() => copy('anon', vpsKey)}>
                {copied === 'anon' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
            {keyFromBuild ? (
              <p className="text-xs text-emerald-600">
                Chave lida do <code>.env</code> gerado pelo <code>./atualizar.sh</code> na VPS — já preenchida em todos os
                exemplos abaixo.
              </p>
            ) : (
              !anonKey.trim() && (
                <p className="text-xs text-yellow-600">
                  Cole aqui a <code>ANON_KEY</code> do <code>server/.env</code> da VPS. Enquanto estiver vazia, os exemplos
                  abaixo mostram <code>{ANON_KEY_PLACEHOLDER}</code> no lugar da chave.
                </p>
              )
            )}
          </div>


          <div className="rounded-md border p-3 space-y-1">
            <Badge variant="outline">ANON_KEY do Supabase (atual)</Badge>
            <code className="block text-[11px] break-all text-muted-foreground">{supaKey}</code>
          </div>
        </CardContent>
      </Card>

      <Block
        id="keys"
        title="1) Chaves de API (copie e envie ao programador)"
        description="Todas as chaves necessárias nos dois backends. Nada aqui é segredo de servidor — são chaves publicáveis (role anon)."
        code={keysSnippet}
      />

      <Block
        id="curl"
        title="2) Teste rápido (login)"
        description="O corpo do POST é idêntico ao da API atual, já com a chave anon preenchida."
        code={curl}
      />


      <Block
        id="paridade"
        title="3) Paridade de rotas (o que muda)"
        description="Mapa de conversão entre os dois backends. Nenhum campo de resposta muda."
        code={`Supabase                                     →  PostgreSQL (VPS)
/functions/v1/${meta.fn}${' '.repeat(Math.max(1, 22 - meta.fn.length))}→  /functions/v1/${meta.fn}
/rest/v1/<tabela>                            →  /rest/v1/<tabela>
/storage/v1/object/public/<bucket>/<arquivo> →  /storage/v1/object/public/<bucket>/<arquivo>
/auth/v1/*                                   →  /auth/v1/*

Header 'apikey'
  Supabase: ${supaKey}
  VPS:      ${vpsKey}
Header 'Authorization: Bearer <ANON_KEY ou JWT>' → claims idênticos (HS256)`}
      />

      <Block
        id="config"
        title="4) Código da extensão com fallback automático"
        description="Publique com PREFER='supabase' (nuvem) enquanto a VPS não liberar CORS para https://www.instagram.com. Só troque para 'postgres' após o checklist abaixo passar."
        code={migrationSnippet}
      />


      <Block
        id="health"
        title="5) Checklist de validação antes de desligar o Supabase"
        description="Rode na VPS ou no seu terminal. Só desligue o backend antigo quando as duas respostas vierem OK."
        code={healthSnippet}
      />

      <Card className="p-4 space-y-2 border-yellow-500/40 bg-yellow-500/5">
        <h4 className="font-semibold text-sm text-yellow-600">⚠️ Ordem segura de corte</h4>
        <ol className="text-xs text-muted-foreground list-decimal pl-5 space-y-1">
          <li>Rodar a sincronização na VPS (dados + usuários + mídias) até a conferência não apontar divergências.</li>
          <li>Publicar a versão nova da extensão com <code>PREFER = "postgres"</code> e fallback ligado.</li>
          <li>Acompanhar o campo <code>_backend</code> nas respostas: quando ninguém mais cair em "supabase", o corte é seguro.</li>
          <li>Rodar a sincronização final e só então desligar o backend antigo.</li>
        </ol>
      </Card>
    </div>
  );
};

export default ExtensionPostgresDocs;
