import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';
import { getAdminSessionToken } from '@/lib/adminConfig';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Database, Download, HardDrive, RefreshCw, FileCode, ShieldCheck, Loader2 } from 'lucide-react';

/** Metadados de uma tabela retornados pelo manifesto do dump. */
interface DumpTableInfo {
  table_name: string;
  row_count: number;
}

/** Metadados de um bucket de storage. */
interface DumpBucketInfo {
  name: string;
  public: boolean;
}

/** Estrutura completa do banco retornada pela função `dump_schema_info`. */
interface SchemaInfo {
  columns: Array<Record<string, unknown>>;
  constraints: Array<{ table_name: string; name: string; definition: string }>;
  indexes: Array<{ table_name: string; name: string; definition: string }>;
  policies: Array<Record<string, unknown>>;
  triggers: Array<{ table_name: string; name: string; definition: string }>;
  functions: Array<{ name: string; definition: string }>;
  enums: Array<{ name: string; values: string[] }>;
  grants: Array<{ table_name: string; grantee: string; privilege_type: string }>;
  rls: Array<{ table_name: string; rls_enabled: boolean }>;
}

const PAGE_SIZE = 1000;

/** Código-fonte das Edge Functions e migrations, embutido em tempo de build. */
const edgeFunctionSources = import.meta.glob('/supabase/functions/**/*.{ts,json,toml}', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const migrationSources = import.meta.glob('/{supabase,drizzle}/migrations/**/*.sql', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

/** Converte um valor JS para literal SQL seguro. */
const toSqlLiteral = (value: unknown): string => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `'${text.replace(/'/g, "''")}'`;
};

/** Gera INSERTs completos para as linhas de uma tabela. */
const buildInsertStatements = (table: string, rows: Array<Record<string, unknown>>): string => {
  if (rows.length === 0) return `-- Tabela public.${table}: sem registros\n`;
  const columns = Object.keys(rows[0]);
  const lines = rows.map(
    (row) =>
      `INSERT INTO public.${table} (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${columns
        .map((c) => toSqlLiteral(row[c]))
        .join(', ')}) ON CONFLICT DO NOTHING;`,
  );
  return `-- ${rows.length} registro(s) em public.${table}\n${lines.join('\n')}\n`;
};

/** Reconstrói o DDL do banco a partir dos metadados coletados. */
const buildSchemaSql = (schema: SchemaInfo): string => {
  const out: string[] = ['-- ============================================================', '-- ESTRUTURA COMPLETA DO BANCO (schema public)', '-- ============================================================', ''];

  out.push('-- ENUMS');
  for (const e of schema.enums) {
    out.push(`CREATE TYPE public.${e.name} AS ENUM (${(e.values ?? []).map((v) => `'${v}'`).join(', ')});`);
  }
  out.push('');

  const byTable = new Map<string, Array<Record<string, unknown>>>();
  for (const col of schema.columns) {
    const table = String(col.table_name);
    if (!byTable.has(table)) byTable.set(table, []);
    byTable.get(table)!.push(col);
  }

  out.push('-- TABELAS');
  for (const [table, cols] of [...byTable.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const defs = cols.map((col) => {
      const udt = String(col.udt_name ?? '');
      const dataType = String(col.data_type ?? 'text');
      const type = dataType === 'USER-DEFINED' ? `public.${udt}` : dataType === 'ARRAY' ? `${udt.replace(/^_/, '')}[]` : dataType;
      const nullable = col.is_nullable === 'NO' ? ' NOT NULL' : '';
      const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      return `  "${col.column_name}" ${type}${def}${nullable}`;
    });
    out.push(`CREATE TABLE IF NOT EXISTS public.${table} (\n${defs.join(',\n')}\n);`);
  }
  out.push('');

  out.push('-- CONSTRAINTS (PK, FK, UNIQUE, CHECK)');
  for (const c of schema.constraints) {
    out.push(`ALTER TABLE ${c.table_name} ADD CONSTRAINT "${c.name}" ${c.definition};`);
  }
  out.push('');

  out.push('-- ÍNDICES');
  for (const i of schema.indexes) {
    if (i.name.endsWith('_pkey')) continue;
    out.push(`${i.definition};`);
  }
  out.push('');

  out.push('-- FUNÇÕES');
  for (const f of schema.functions) out.push(`${f.definition};`);
  out.push('');

  out.push('-- TRIGGERS');
  for (const t of schema.triggers) out.push(`${t.definition};`);
  out.push('');

  out.push('-- GRANTS');
  for (const g of schema.grants) {
    if (!['anon', 'authenticated', 'service_role'].includes(g.grantee)) continue;
    out.push(`GRANT ${g.privilege_type} ON public.${g.table_name} TO ${g.grantee};`);
  }
  out.push('');

  out.push('-- ROW LEVEL SECURITY');
  for (const r of schema.rls) {
    if (r.rls_enabled) out.push(`ALTER TABLE public.${r.table_name} ENABLE ROW LEVEL SECURITY;`);
  }
  out.push('');

  out.push('-- POLICIES');
  for (const p of schema.policies) {
    const roles = Array.isArray(p.roles) ? (p.roles as string[]).join(', ') : String(p.roles ?? 'public');
    const cmd = String(p.cmd ?? 'ALL');
    const using = p.qual ? ` USING (${p.qual})` : '';
    const check = p.with_check ? ` WITH CHECK (${p.with_check})` : '';
    out.push(`CREATE POLICY "${p.name}" ON public.${p.table_name} AS ${p.permissive ?? 'PERMISSIVE'} FOR ${cmd} TO ${roles}${using}${check};`);
  }

  return out.join('\n');
};

/**
 * Painel de exportação total (dump) do projeto: banco de dados completo,
 * storage, usuários, edge functions, migrations e documentação de importação.
 */
export default function DumpPanel() {
  const { toast } = useToast();
  const [manifest, setManifest] = useState<{ tables: DumpTableInfo[]; buckets: DumpBucketInfo[]; generated_at?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [percent, setPercent] = useState(0);
  const [includeStorageFiles, setIncludeStorageFiles] = useState(false);
  const [search, setSearch] = useState('');
  const cancelled = useRef(false);

  const call = useCallback(async <T,>(payload: Record<string, unknown>): Promise<T> => {
    const token = getAdminSessionToken();
    if (!token) throw new Error('Sessão de admin expirada. Faça login novamente.');
    const { data, error } = await supabase.functions.invoke('full-dump', { body: { ...payload, token } });
    if (error) throw new Error(error.message);
    if (!data?.success) throw new Error(data?.error || 'Falha na requisição');
    return data as T;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call<{ tables: DumpTableInfo[]; buckets: DumpBucketInfo[]; generated_at: string }>({ action: 'manifest' });
      setManifest({ tables: data.tables ?? [], buckets: data.buckets ?? [], generated_at: data.generated_at });
    } catch (error) {
      toast({ title: 'Erro ao carregar o manifesto', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [call, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const tables = manifest?.tables ?? [];
    return {
      tables: tables.length,
      rows: tables.reduce((sum, t) => sum + Number(t.row_count ?? 0), 0),
      buckets: manifest?.buckets.length ?? 0,
      functions: new Set(Object.keys(edgeFunctionSources).map((p) => p.split('/')[3])).size,
    };
  }, [manifest]);

  const filteredTables = useMemo(() => {
    const term = search.trim().toLowerCase();
    const tables = manifest?.tables ?? [];
    return term ? tables.filter((t) => t.table_name.toLowerCase().includes(term)) : tables;
  }, [manifest, search]);

  /** Executa o dump completo e entrega um arquivo .zip para download. */
  const handleExport = async () => {
    if (!manifest) return;
    cancelled.current = false;
    setExporting(true);
    setPercent(0);
    const startedAt = new Date();

    try {
      const zip = new JSZip();

      // ---------- 1. Estrutura do banco ----------
      setProgress('Coletando estrutura do banco...');
      const schemaResponse = await call<{ schema: SchemaInfo }>({ action: 'schema' });
      const schema = schemaResponse.schema;
      zip.file('database/schema.json', JSON.stringify(schema, null, 2));
      zip.file('database/01_schema.sql', buildSchemaSql(schema));

      // ---------- 2. Dados de todas as tabelas ----------
      const tables = manifest.tables;
      const dataSql: string[] = ['-- DADOS COMPLETOS DE TODAS AS TABELAS', ''];
      for (let index = 0; index < tables.length; index += 1) {
        if (cancelled.current) throw new Error('Exportação cancelada');
        const table = tables[index];
        setProgress(`Tabela ${index + 1}/${tables.length}: ${table.table_name} (${table.row_count} linhas)`);
        setPercent(Math.round(((index + 1) / (tables.length + 4)) * 100));

        const rows: Array<Record<string, unknown>> = [];
        let offset = 0;
        // Paginação para suportar tabelas grandes sem estourar memória do servidor.
        while (true) {
          const page = await call<{ rows: Array<Record<string, unknown>> }>({
            action: 'table',
            table: table.table_name,
            limit: PAGE_SIZE,
            offset,
          });
          const batch = page.rows ?? [];
          rows.push(...batch);
          if (batch.length < PAGE_SIZE) break;
          offset += PAGE_SIZE;
        }

        zip.file(`database/data/${table.table_name}.json`, JSON.stringify(rows, null, 2));
        dataSql.push(buildInsertStatements(table.table_name, rows));
      }
      zip.file('database/02_data.sql', dataSql.join('\n'));

      // ---------- 3. Usuários do Auth ----------
      setProgress('Exportando usuários de autenticação...');
      const authUsers: Array<Record<string, unknown>> = [];
      let page = 1;
      while (page <= 50) {
        const result = await call<{ users: Array<Record<string, unknown>>; has_more: boolean }>({ action: 'auth_users', page });
        authUsers.push(...(result.users ?? []));
        if (!result.has_more) break;
        page += 1;
      }
      zip.file('auth/users.json', JSON.stringify(authUsers, null, 2));

      // ---------- 4. Storage ----------
      setProgress('Listando arquivos de storage...');
      const storageIndex: Record<string, unknown> = {};
      for (const bucket of manifest.buckets) {
        const result = await call<{ files: Array<{ path: string; public_url: string; size: number | null }> }>({
          action: 'storage',
          bucket: bucket.name,
        });
        storageIndex[bucket.name] = { public: bucket.public, files: result.files };
        zip.file(`storage/${bucket.name}.json`, JSON.stringify(result.files, null, 2));

        if (includeStorageFiles && bucket.public) {
          for (const file of result.files) {
            if (cancelled.current) throw new Error('Exportação cancelada');
            setProgress(`Baixando ${bucket.name}/${file.path}`);
            try {
              const response = await fetch(file.public_url);
              if (!response.ok) continue;
              zip.file(`storage/files/${bucket.name}/${file.path}`, await response.blob());
            } catch {
              // Arquivo indisponível: registrado apenas no índice.
            }
          }
        }
      }
      zip.file('storage/index.json', JSON.stringify(storageIndex, null, 2));

      // ---------- 5. Edge Functions e migrations ----------
      setProgress('Empacotando Edge Functions e migrations...');
      for (const [path, loader] of Object.entries(edgeFunctionSources)) {
        const content = await loader();
        zip.file(`edge-functions/${path.replace('/supabase/functions/', '')}`, content);
      }
      for (const [path, loader] of Object.entries(migrationSources)) {
        const content = await loader();
        zip.file(`migrations/${path.replace(/^\//, '')}`, content);
      }

      // ---------- 6. Documentação ----------
      const documentation = `# Dump completo do projeto

Gerado em: ${startedAt.toLocaleString('pt-BR')}

## Conteúdo do pacote

| Pasta | Descrição |
| --- | --- |
| \`database/01_schema.sql\` | Estrutura completa: enums, tabelas, constraints, índices, funções, triggers, grants, RLS e policies. |
| \`database/02_data.sql\` | Todos os registros de todas as tabelas em INSERTs idempotentes (\`ON CONFLICT DO NOTHING\`). |
| \`database/data/*.json\` | Dados por tabela em JSON (útil para importação programática). |
| \`database/schema.json\` | Metadados brutos do schema. |
| \`auth/users.json\` | Usuários de autenticação (sem senhas — hashes não são exportáveis pela API). |
| \`storage/*.json\` | Índice de todos os arquivos por bucket, com URLs públicas. |
| \`storage/files/**\` | Arquivos binários (somente se a opção de download foi marcada). |
| \`edge-functions/**\` | Código-fonte completo de todas as Edge Functions. |
| \`migrations/**\` | Histórico de migrations SQL do projeto. |

## Estatísticas

- Tabelas exportadas: ${tables.length}
- Registros totais estimados: ${totals.rows}
- Buckets de storage: ${manifest.buckets.length}
- Usuários de autenticação: ${authUsers.length}
- Arquivos de Edge Functions: ${Object.keys(edgeFunctionSources).length}

## Como importar em outro projeto

1. **Banco de dados**
   \`\`\`bash
   psql "$DATABASE_URL" -f database/01_schema.sql
   psql "$DATABASE_URL" -f database/02_data.sql
   \`\`\`
   Execute nessa ordem. O schema já inclui \`GRANT\`s e políticas de RLS.

2. **Edge Functions**
   Copie \`edge-functions/\` para \`supabase/functions/\` no novo projeto e faça o deploy.
   Reconfigure os secrets manualmente — **nenhum secret é exportado neste pacote**.

3. **Storage**
   Crie os buckets listados em \`storage/index.json\` com a mesma visibilidade
   (\`public: true/false\`) e envie os arquivos de \`storage/files/\` mantendo os caminhos.

4. **Autenticação**
   As senhas do Auth não podem ser exportadas. Importe \`auth/users.json\` criando os
   usuários via Admin API e dispare redefinição de senha, ou mantenha os logins próprios
   das tabelas de aplicação (exportadas normalmente em \`database/\`).

## Observações de segurança

- Este pacote contém dados pessoais e credenciais de aplicação. Armazene com cuidado.
- Chaves de serviço, secrets e senhas de infraestrutura **não** são incluídos.
`;
      zip.file('README.md', documentation);
      zip.file(
        'manifest.json',
        JSON.stringify({ generated_at: startedAt.toISOString(), tables, buckets: manifest.buckets, auth_users: authUsers.length }, null, 2),
      );

      setProgress('Compactando arquivo...');
      setPercent(98);
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dump-completo-${startedAt.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      setPercent(100);
      setProgress('Dump concluído!');
      toast({ title: 'Dump exportado!', description: `${tables.length} tabelas, ${manifest.buckets.length} buckets e todas as Edge Functions.` });
    } catch (error) {
      toast({ title: 'Erro ao exportar', description: (error as Error).message, variant: 'destructive' });
      setProgress('');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Database className="h-5 w-5 text-primary" /> Dump Completo do Projeto
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Exporta banco de dados, storage, usuários, edge functions e documentação de importação em um único .zip.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading || exporting}>
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} /> Atualizar
            </Button>
            <Button onClick={() => void handleExport()} disabled={exporting || loading || !manifest} className="w-full sm:w-auto">
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {exporting ? 'Exportando...' : 'Dump Export'}
            </Button>
          </div>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={includeStorageFiles}
            onChange={(event) => setIncludeStorageFiles(event.target.checked)}
            disabled={exporting}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          Incluir os arquivos binários de storage (vídeos e imagens) — o pacote fica bem maior
        </label>

        {exporting && (
          <div className="mt-4 space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
            </div>
            <p className="truncate text-xs text-muted-foreground">{progress}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Tabelas', value: totals.tables, icon: <Database className="h-4 w-4" /> },
          { label: 'Registros', value: totals.rows.toLocaleString('pt-BR'), icon: <ShieldCheck className="h-4 w-4" /> },
          { label: 'Buckets', value: totals.buckets, icon: <HardDrive className="h-4 w-4" /> },
          { label: 'Edge Functions', value: totals.functions, icon: <FileCode className="h-4 w-4" /> },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              {card.icon}
              <span className="text-xs uppercase tracking-wide">{card.label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-foreground">Tabelas incluídas no dump</h3>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar tabela..."
            className="sm:max-w-xs"
          />
        </div>
        <div className="max-h-[420px] overflow-auto p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando manifesto...</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTables.map((table) => (
                <div key={table.table_name} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                  <span className="truncate text-sm text-foreground">{table.table_name}</span>
                  <Badge variant="secondary">{Number(table.row_count).toLocaleString('pt-BR')}</Badge>
                </div>
              ))}
              {filteredTables.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tabela encontrada.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
