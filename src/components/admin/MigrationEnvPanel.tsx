import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminSessionToken } from '@/lib/adminConfig';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Copy, Download, KeyRound, Loader2, RefreshCw, ServerCog, ShieldCheck } from 'lucide-react';

/** Parâmetros de infraestrutura usados para montar o `.env`. */
interface EnvFormState {
  apiUrl: string;
  siteUrl: string;
  dbUser: string;
  dbName: string;
  dbHost: string;
  dbPort: string;
  dbPassword: string;
  storageRoot: string;
  denoBin: string;
}

/** Resposta da Edge Function `migration-env`. */
interface EnvResult {
  env: string;
  frontend_env: string;
  db_password: string;
  secrets_total: number;
  secrets_found: number;
  missing: string[];
  generated_at: string;
}

const DEFAULT_FORM: EnvFormState = {
  apiUrl: 'https://api.maisresultadosonline.com.br',
  siteUrl: 'https://maisresultadosonline.com.br',
  dbUser: 'mro',
  dbName: 'mro',
  dbHost: '127.0.0.1',
  dbPort: '5432',
  dbPassword: '',
  storageRoot: '/var/www/uploads',
  denoBin: '/usr/local/bin/deno',
};

/** Dispara o download de um texto como arquivo. */
const downloadText = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

/**
 * Painel de Migração: gera e baixa o `server/.env` já completo — chaves novas
 * do backend próprio, os segredos de integração atuais e as variáveis LEGACY_*.
 */
const MigrationEnvPanel = () => {
  const { toast } = useToast();
  const [form, setForm] = useState<EnvFormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnvResult | null>(null);

  const update = (key: keyof EnvFormState) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAdminSessionToken();
      if (!token) {
        toast({ title: 'Sessão expirada', description: 'Faça login novamente no admin.', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.functions.invoke('migration-env', {
        body: { token, ...form },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error ?? 'Falha ao gerar o .env');

      setResult(data as EnvResult);
      toast({
        title: '.env gerado',
        description: `${data.secrets_found}/${data.secrets_total} segredos preenchidos automaticamente.`,
      });
    } catch (err) {
      toast({
        title: 'Erro ao gerar',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [form, toast]);

  const copy = async (content: string, label: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: 'Copiado', description: `${label} copiado para a área de transferência.` });
    } catch {
      toast({ title: 'Não foi possível copiar', description: 'Use o botão de download.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
        <ServerCog className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Migração — gerar server/.env</h2>
          <p className="text-sm text-muted-foreground">
            Gera o arquivo <code className="text-foreground">.env</code> do backend próprio já preenchido: chaves novas
            (JWT, anon, service role), os segredos de integração com os valores atuais e as variáveis{' '}
            <code className="text-foreground">LEGACY_*</code> dos scripts de migração. Nada precisa ser digitado à mão.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <p className="text-sm text-foreground">
            O arquivo contém <strong>chaves privadas</strong>. Baixe apenas em um computador seu, envie direto para a VPS
            (<code>server/.env</code>) e nunca coloque no Git.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="env-api">URL da API na VPS</Label>
          <Input id="env-api" value={form.apiUrl} onChange={update('apiUrl')} placeholder="https://api.seudominio.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="env-site">URL do site</Label>
          <Input id="env-site" value={form.siteUrl} onChange={update('siteUrl')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="env-dbuser">Usuário do Postgres</Label>
          <Input id="env-dbuser" value={form.dbUser} onChange={update('dbUser')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="env-dbname">Banco</Label>
          <Input id="env-dbname" value={form.dbName} onChange={update('dbName')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="env-dbhost">Host do Postgres</Label>
          <Input id="env-dbhost" value={form.dbHost} onChange={update('dbHost')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="env-dbport">Porta</Label>
          <Input id="env-dbport" value={form.dbPort} onChange={update('dbPort')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="env-dbpass">Senha do Postgres</Label>
          <Input
            id="env-dbpass"
            value={form.dbPassword}
            onChange={update('dbPassword')}
            placeholder="deixe vazio para gerar uma senha forte"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="env-storage">Pasta de uploads</Label>
          <Input id="env-storage" value={form.storageRoot} onChange={update('storageRoot')} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="env-deno">Caminho do Deno</Label>
          <Input id="env-deno" value={form.denoBin} onChange={update('denoBin')} />
        </div>
      </div>

      <Button onClick={generate} disabled={loading} className="w-full sm:w-auto">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
        {loading ? 'Gerando...' : 'Gerar .env completo'}
      </Button>

      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              {result.secrets_found}/{result.secrets_total} segredos preenchidos
            </Badge>
            {result.missing.length > 0 && (
              <Badge variant="destructive">{result.missing.length} sem valor: {result.missing.join(', ')}</Badge>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground">server/.env (backend)</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => copy(result.env, 'server/.env')}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar
                </Button>
                <Button size="sm" onClick={() => downloadText('server.env', result.env)}>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar
                </Button>
              </div>
            </div>
            <pre className="max-h-72 overflow-auto rounded bg-muted p-3 text-xs text-muted-foreground">{result.env}</pre>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground">.env do frontend (build do site)</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => copy(result.frontend_env, 'frontend .env')}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar
                </Button>
                <Button size="sm" onClick={() => downloadText('frontend.env', result.frontend_env)}>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar
                </Button>
              </div>
            </div>
            <pre className="max-h-52 overflow-auto rounded bg-muted p-3 text-xs text-muted-foreground">
              {result.frontend_env}
            </pre>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            <p className="mb-2 font-semibold text-foreground">Como usar na VPS</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Envie o arquivo baixado como <code className="text-foreground">server/.env</code> (renomeie de{' '}
                <code className="text-foreground">server.env</code>).
              </li>
              <li>
                Crie o usuário do banco com a senha:{' '}
                <code className="text-foreground">{result.db_password}</code>
              </li>
              <li>
                Rode <code className="text-foreground">./deploy.sh --migrate</code> e depois{' '}
                <code className="text-foreground">npm run migrate:verify</code>.
              </li>
            </ol>
          </div>

          <Button variant="outline" onClick={generate} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Gerar novamente (novas chaves)
          </Button>
        </div>
      )}
    </div>
  );
};

export default MigrationEnvPanel;
