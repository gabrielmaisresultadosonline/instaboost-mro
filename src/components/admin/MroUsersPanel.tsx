import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Users, Loader2, RefreshCw, Search, Trash2, Save, Plus, X, Instagram, RotateCcw, Infinity as InfinityIcon, ImageOff,
  Copy, Eye, EyeOff, Mail,
} from 'lucide-react';
import { copyAccessToClipboard } from '@/lib/accessClipboard';

export interface MroAccount {
  id: string;
  instagram_username: string;
  is_trial: boolean;
  trial_expires_at: string | null;
  created_at: string;
  /** Print capturado na área /instagram (pode não existir). */
  screenshot_url?: string | null;
}

export interface MroUser {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  is_active: boolean;
  plan_accounts: number;
  expiration_days: number;
  lifetime: boolean;
  plan_type: string;
  days_remaining: number;
  last_access: string | null;
  created_at: string;
  has_password: boolean;
  password_plain?: string | null;
  accounts: MroAccount[];
  trial_accounts: MroAccount[];
  trials_remaining: number;
}

type UserForm = {
  username: string;
  name: string;
  email: string;
  password: string;
  plan_accounts: string;
  expiration_days: string;
  is_active: boolean;
};

const EMPTY_USER: UserForm = {
  username: '', name: '', email: '', password: '', plan_accounts: '4', expiration_days: '30', is_active: true,
};

const LIFETIME = 999999;

/** Painel de controle de usuários da Ferramenta MRO (contas de Instagram + planos). */
const MroUsersPanel: React.FC = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<MroUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<UserForm>(EMPTY_USER);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newAccount, setNewAccount] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ url: string; username: string } | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const handleCopyAccess = async (u: MroUser) => {
    const ok = await copyAccessToClipboard({ username: u.username, password: u.password_plain, email: u.email });
    toast(ok ? { title: 'Acesso copiado!' } : { title: 'Não foi possível copiar', variant: 'destructive' });
  };

  const call = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('mro-tool-api', { body });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Erro na operação');
    return data;
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call({ action: 'list_users' });
      setUsers((data.users || []) as MroUser[]);
    } catch (err) {
      toast({
        title: 'Erro ao carregar usuários',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [call, toast]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const [syncing, setSyncing] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  /** Vincula emails e senhas já cadastrados na área /instagram aos usuários da ferramenta. */
  const handleSyncEmails = async () => {
    setSyncing(true);
    try {
      const data = await call({ action: 'sync_credentials' });
      toast({
        title: 'Acessos vinculados',
        description: `${data.updated ?? 0} usuário(s) atualizados (${data.passwords ?? 0} senha(s) recuperadas do /instagram).`,
      });
      await loadUsers();
    } catch (err) {
      toast({
        title: 'Erro ao vincular acessos',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  /** Reenvia o acesso (usuário + senha) para o email cadastrado do cliente. */
  const handleSendAccess = async (u: MroUser) => {
    setSendingId(u.id);
    try {
      await call({ action: 'send_access', id: u.id });
      toast({ title: 'Acesso enviado!', description: `Email enviado para ${u.email}` });
    } catch (err) {
      toast({
        title: 'Erro ao enviar acesso',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSendingId(null);
    }
  };




  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) =>
      u.username.toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      u.accounts.some((a) => a.instagram_username.toLowerCase().includes(term)),
    );
  }, [users, search]);

  /** Limite inicial de renderização para não travar a página com muitos usuários. */
  const PAGE_SIZE = 50;
  const [showAll, setShowAll] = useState(false);
  const visible = useMemo(
    () => (showAll || search.trim() ? filtered : filtered.slice(0, PAGE_SIZE)),
    [filtered, showAll, search],
  );
  const hiddenCount = filtered.length - visible.length;

  const handleSave = async () => {
    if (!form.username.trim()) {
      toast({ title: 'Usuário obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await call({
        action: 'upsert_user',
        username: form.username,
        name: form.name,
        email: form.email,
        password: form.password || undefined,
        plan_accounts: form.plan_accounts,
        expiration_days: form.expiration_days,
        is_active: form.is_active,
      });
      toast({ title: 'Usuário salvo!' });
      setForm(EMPTY_USER);
      loadUsers();
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (body: Record<string, unknown>, okMessage: string) => {
    try {
      await call(body);
      toast({ title: okMessage });
      loadUsers();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    }
  };

  const handleAddAccount = async (user: MroUser) => {
    const value = (newAccount[user.id] || '').trim();
    if (!value) return;
    setNewAccount((prev) => ({ ...prev, [user.id]: '' }));
    await runAction({ action: 'admin_add_account', user_id: user.id, instagram: value }, 'Conta adicionada');
  };

  const editUser = (u: MroUser) => {
    setForm({
      username: u.username,
      name: u.name || '',
      email: u.email || '',
      password: u.password_plain || '',
      plan_accounts: String(u.plan_accounts),
      expiration_days: String(u.expiration_days),
      is_active: u.is_active,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Formulário */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Cadastrar / editar usuário</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Usuário</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="usuariovip" />
          </div>
          <div className="space-y-1">
            <Label>Email (login alternativo)</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="cliente@email.com" />
          </div>
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do cliente" />
          </div>
          <div className="space-y-1">
            <Label>Senha {form.password ? '' : '(deixe vazio para manter)'}</Label>
            <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••" />
          </div>
          <div className="space-y-1">
            <Label>Contas do plano</Label>
            <Input type="number" min={0} value={form.plan_accounts} onChange={(e) => setForm({ ...form, plan_accounts: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Dias de acesso (999999 = vitalício)</Label>
            <Input type="number" min={0} value={form.expiration_days} onChange={(e) => setForm({ ...form, expiration_days: e.target.value })} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <span className="text-sm">Acesso ativo</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setForm(EMPTY_USER)}>Limpar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </div>
      </Card>

      {/* Busca */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por usuário, email ou conta do Instagram" />
        </div>
        <Badge variant="secondary">{filtered.length} usuários</Badge>
        <Badge variant="outline" className="gap-1">
          <Instagram className="w-3 h-3" />
          {filtered.reduce((acc, u) => acc + u.accounts.length + u.trial_accounts.length, 0)} contas
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Mail className="w-3 h-3" />
          {filtered.filter((u) => !!u.email).length} com email
        </Badge>

        <Button variant="outline" size="sm" onClick={() => void handleSyncEmails()} disabled={syncing} className="gap-2">
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          Vincular emails e senhas do /instagram
        </Button>

        <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Atualizar
        </Button>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {visible.map((u) => {
          const isOpen = expanded === u.id;
          const slotsUsed = u.accounts.length;
          const full = slotsUsed >= u.plan_accounts;
          const allAccounts = [...u.accounts, ...u.trial_accounts];
          return (
            <Card key={u.id} className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <button className="font-semibold text-left" onClick={() => setExpanded(isOpen ? null : u.id)}>
                  {u.username}
                </button>
                {u.email && <span className="text-xs text-muted-foreground">{u.email}</span>}
                <Badge variant={u.is_active ? 'default' : 'destructive'}>{u.is_active ? 'Ativo' : 'Inativo'}</Badge>
                <Badge variant="outline" className="gap-1">
                  {u.expiration_days >= LIFETIME ? <><InfinityIcon className="w-3 h-3" /> Vitalício</> : `${u.expiration_days} dias`}
                </Badge>
                <Badge variant={full ? 'destructive' : 'secondary'}>{slotsUsed}/{u.plan_accounts} contas</Badge>
                <Badge variant="outline">{u.trials_remaining}/5 testes</Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  senha:{' '}
                  <span className="font-mono text-foreground">
                    {u.password_plain
                      ? visiblePasswords[u.id]
                        ? u.password_plain
                        : '••••••••'
                      : u.has_password
                      ? 'não visível'
                      : '—'}
                  </span>
                  {u.password_plain && (
                    <button
                      type="button"
                      aria-label={visiblePasswords[u.id] ? 'Ocultar senha' : 'Mostrar senha'}
                      onClick={() => setVisiblePasswords((p) => ({ ...p, [u.id]: !p[u.id] }))}
                    >
                      {visiblePasswords[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </span>
                <div className="flex-1" />
                <Button size="sm" variant="outline" onClick={() => editUser(u)}>Editar</Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => void handleCopyAccess(u)}>
                  <Copy className="w-3.5 h-3.5" /> Copiar acesso
                </Button>
                {u.email && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    disabled={sendingId === u.id}
                    onClick={() => void handleSendAccess(u)}
                  >
                    {sendingId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    Enviar acesso
                  </Button>
                )}
                <Button size="sm" variant="outline" className="gap-1" onClick={() => runAction({ action: 'reset_trials', id: u.id }, 'Testes reiniciados')}>
                  <RotateCcw className="w-3 h-3" /> Testes
                </Button>
                <Button size="sm" variant="destructive" onClick={() => runAction({ action: 'delete_user', id: u.id }, 'Usuário removido')}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Cascata de contas do Instagram — sempre visível */}
              <div className="mt-3 pl-3 border-l-2 border-border space-y-1">
                {allAccounts.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60 transition-colors"
                  >
                    <span className="text-muted-foreground text-xs">└</span>
                    {a.screenshot_url ? (
                      <button
                        type="button"
                        title="Ver print do perfil"
                        onClick={() => setPreview({ url: a.screenshot_url as string, username: a.instagram_username })}
                        className="shrink-0 rounded-md overflow-hidden border border-border w-10 h-10 bg-muted"
                      >
                        <img
                          src={a.screenshot_url}
                          alt={`Print do perfil @${a.instagram_username.replace(/^@/, '')}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ) : (
                      <div className="shrink-0 w-10 h-10 rounded-md border border-dashed border-border flex items-center justify-center">
                        <ImageOff className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <Instagram className={cn('w-3.5 h-3.5', a.is_trial ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="text-sm font-medium">@{a.instagram_username.replace(/^@/, '')}</span>
                    {a.is_trial && <Badge variant="outline" className="text-[10px] py-0">teste</Badge>}
                    {!a.screenshot_url && (
                      <span className="text-[10px] text-muted-foreground">sem print</span>
                    )}
                    <div className="flex-1" />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-destructive"
                      onClick={() => runAction({ action: 'remove_account', id: a.id }, 'Conta removida')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}

                {!allAccounts.length && (
                  <span className="text-xs text-muted-foreground">Nenhuma conta do Instagram cadastrada.</span>
                )}
              </div>

              {isOpen && (
                <div className="mt-4 space-y-3 border-t pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      className={cn('max-w-xs')}
                      value={newAccount[u.id] || ''}
                      onChange={(e) => setNewAccount((prev) => ({ ...prev, [u.id]: e.target.value }))}
                      placeholder="nova conta do Instagram"
                    />
                    <Button size="sm" className="gap-1" onClick={() => handleAddAccount(u)}>
                      <Plus className="w-3 h-3" /> Adicionar conta
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Limite do plano: {u.plan_accounts}. Para liberar mais, aumente "Contas do plano" ao editar.
                    </span>
                  </div>
                </div>
              )}

            </Card>
          );
        })}
        {!loading && !filtered.length && (
          <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
        )}
        {!loading && hiddenCount > 0 && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" onClick={() => setShowAll(true)}>
              Ver todos ({hiddenCount} restantes)
            </Button>
          </div>
        )}
      </div>

      {/* Print do perfil em tamanho grande */}
      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Print de @{preview?.username.replace(/^@/, '')}</DialogTitle>
          </DialogHeader>
          {preview && (
            <img
              src={preview.url}
              alt={`Print do perfil @${preview.username.replace(/^@/, '')}`}
              className="w-full rounded-md border border-border"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MroUsersPanel;
