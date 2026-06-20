import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Copy, Trash2, RefreshCw, Ban, ShieldCheck, Plus, Key, BookOpen, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const FN_URL = `${SUPABASE_URL}/functions/v1/lovable-extension-license`;
// Token público apenas para o painel — protege contra acessos casuais.
// Para produção, troque pelo secret LOVABLE_EXT_ADMIN_TOKEN configurado na edge function.
const ADMIN_TOKEN = 'lvb-admin-2026-mro';

type Plan = 'teste' | '30d' | '90d' | 'vitalicio';

interface ExtUser {
  id: string;
  email: string;
  license_key: string;
  plan_type: Plan;
  credits: number;
  expires_at: string | null;
  is_banned: boolean;
  current_session_id: string | null;
  last_validated_at: string | null;
  notes: string | null;
  created_at: string;
}

const planLabel: Record<Plan, string> = {
  teste: 'Teste (3 dias)',
  '30d': 'Mensal (30 dias)',
  '90d': 'Trimestral (90 dias)',
  vitalicio: 'Vitalício',
};

export default function LovableExtensionPanel() {
  const { toast } = useToast();
  const [users, setUsers] = useState<ExtUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPlan, setNewPlan] = useState<Plan>('30d');
  const [newNotes, setNewNotes] = useState('');

  const call = async (action: string, payload: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke('lovable-extension-license', {
      body: { action, admin_token: ADMIN_TOKEN, ...payload },
    });
    if (error) throw new Error(error.message || 'Erro ao conectar com o backend');
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await call('list');
      setUsers(data.users || []);
    } catch (e) {
      toast({ title: 'Erro ao carregar', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newEmail.trim()) {
      toast({ title: 'Informe o email', variant: 'destructive' });
      return;
    }
    try {
      await call('create', { email: newEmail, plan_type: newPlan, notes: newNotes });
      toast({ title: 'Usuário criado!', description: `Chave gerada para ${newEmail}` });
      setNewEmail(''); setNewNotes('');
      load();
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleBan = async (u: ExtUser) => {
    await call('update', { id: u.id, is_banned: !u.is_banned });
    load();
  };

  const handleRenew = async (u: ExtUser, plan: Plan) => {
    await call('renew', { id: u.id, plan_type: plan });
    toast({ title: 'Renovado!' });
    load();
  };

  const handleResetSession = async (u: ExtUser) => {
    await call('reset_session', { id: u.id });
    toast({ title: 'Sessão liberada' });
    load();
  };

  const handleDelete = async (u: ExtUser) => {
    if (!confirm(`Excluir ${u.email}?`)) return;
    await call('delete', { id: u.id });
    load();
  };

  const copy = (text: string, label = 'Copiado') => {
    navigator.clipboard.writeText(text);
    toast({ title: label });
  };

  const statusBadge = (u: ExtUser) => {
    if (u.is_banned) return <Badge variant="destructive">Banido</Badge>;
    if (u.expires_at && new Date(u.expires_at) < new Date()) return <Badge variant="destructive">Expirado</Badge>;
    if (u.credits <= 0 && u.plan_type !== 'vitalicio') return <Badge variant="destructive">Sem créditos</Badge>;
    return <Badge className="bg-green-600">Ativo</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Lovable Extensão</h2>
        <p className="text-muted-foreground text-sm">
          Banco de dados separado para licenças da extensão Chrome.
        </p>
      </div>

      {/* Endpoint + Docs */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Key className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Endpoint de Validação</h3>
        </div>
        <div className="flex gap-2 items-center mb-4">
          <Input readOnly value={FN_URL} className="font-mono text-xs" />
          <Button size="sm" variant="outline" onClick={() => copy(FN_URL, 'URL copiada')}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer font-medium flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Documentação para a extensão
          </summary>
          <div className="mt-3 space-y-3 pl-4">
            <div>
              <p className="font-medium mb-1">POST {FN_URL}</p>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{`{
  "action": "validate",
  "license_key": "LVB-XXXXX-XXXXX-XXXXX-XXXXX",
  "session_id": "uuid-único-por-dispositivo",
  "consume_credit": true
}`}</pre>
            </div>
            <div>
              <p className="font-medium mb-1">Respostas possíveis (campo <code>status</code>):</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><code>ok</code> — chave válida, retorna email, plano, créditos, expiração</li>
                <li><code>chave_inexistente</code> — chave não encontrada</li>
                <li><code>usuario_banido</code> — conta suspensa</li>
                <li><code>tempo_esgotado</code> — chave expirada</li>
                <li><code>creditos_esgotados</code> — sem créditos restantes</li>
                <li><code>sessao_duplicada</code> — em uso em outro dispositivo</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">Exemplo JS (na extensão):</p>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{`const res = await fetch("${FN_URL}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "validate",
    license_key: userKey,
    session_id: deviceId,
    consume_credit: true,
  }),
});
const data = await res.json();
switch (data.status) {
  case "ok": /* libera */ break;
  case "usuario_banido": /* bloqueia */ break;
  case "tempo_esgotado": /* expirou */ break;
  case "creditos_esgotados": /* sem créditos */ break;
  case "sessao_duplicada": /* outro device */ break;
  case "chave_inexistente": /* chave errada */ break;
}`}</pre>
            </div>
          </div>
        </details>
      </Card>

      {/* Criar usuário */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Adicionar Usuário Manualmente</h3>
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <Label>Email</Label>
            <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="cliente@email.com" />
          </div>
          <div>
            <Label>Plano</Label>
            <Select value={newPlan} onValueChange={(v) => setNewPlan(v as Plan)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="teste">Teste (3 dias)</SelectItem>
                <SelectItem value="30d">Mensal (30 dias)</SelectItem>
                <SelectItem value="90d">Trimestral (90 dias)</SelectItem>
                <SelectItem value="vitalicio">Vitalício</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleCreate} className="w-full">
              <Plus className="w-4 h-4 mr-1" /> Criar
            </Button>
          </div>
          <div className="md:col-span-4">
            <Label>Notas (opcional)</Label>
            <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={2} />
          </div>
        </div>
      </Card>

      {/* Lista */}
      <Card className="p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Usuários ({users.length})</h3>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>

        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="font-medium">{u.email}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs bg-muted px-2 py-1 rounded">{u.license_key}</code>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copy(u.license_key, 'Chave copiada')}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {statusBadge(u)}
                  <Badge variant="outline">{planLabel[u.plan_type]}</Badge>
                  <Badge variant="outline">{u.credits} créditos</Badge>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Expira: {u.expires_at ? new Date(u.expires_at).toLocaleString('pt-BR') : 'Nunca'}
                {' · '} Última validação: {u.last_validated_at ? new Date(u.last_validated_at).toLocaleString('pt-BR') : 'Nunca'}
                {u.current_session_id && <> {' · '} Sessão ativa</>}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => handleRenew(u, '30d')}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Renovar 30d
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleRenew(u, '90d')}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Renovar 90d
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleResetSession(u)}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Liberar sessão
                </Button>
                <Button size="sm" variant={u.is_banned ? 'default' : 'outline'} onClick={() => handleBan(u)}>
                  {u.is_banned ? <><ShieldCheck className="w-3 h-3 mr-1" /> Desbanir</> : <><Ban className="w-3 h-3 mr-1" /> Banir</>}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(u)}>
                  <Trash2 className="w-3 h-3 mr-1" /> Excluir
                </Button>
              </div>
            </div>
          ))}
          {users.length === 0 && !loading && (
            <p className="text-center text-muted-foreground py-8">Nenhum usuário ainda.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
