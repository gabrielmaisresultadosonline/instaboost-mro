import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Users,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Save,
  Megaphone,
  Plus,
  KeyRound,
  Copy,
  Eye,
  EyeOff,
  Mail,
} from 'lucide-react';

import { copyAccessToClipboard } from '@/lib/accessClipboard';

export interface ZapmroUser {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  is_active: boolean | null;
  days_remaining: number | null;
  expires_at: string | null;
  last_access: string | null;
  created_at: string;
  has_password: boolean;
  password_plain?: string | null;
  whatsapp?: string | null;
  whatsapp_limit?: number | null;
  registered_numbers?: string[] | null;
}


export interface ZapmroAnnouncement {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  is_active: boolean;
  is_blocking: boolean;
  display_duration: number;
  end_date: string | null;
  created_at: string;
}

type UserForm = {
  id?: string;
  username: string;
  name: string;
  email: string;
  password: string;
  days_remaining: string;
  is_active: boolean;
  whatsapp: string;
  whatsapp_limit: string;
};


const EMPTY_USER: UserForm = {
  username: '',
  name: '',
  email: '',
  password: '',
  days_remaining: '365',
  is_active: true,
  whatsapp: '',
  whatsapp_limit: '1',
};


type AnnouncementForm = {
  id?: string;
  title: string;
  content: string;
  image_url: string;
  video_url: string;
  is_active: boolean;
  is_blocking: boolean;
};

const EMPTY_ANNOUNCEMENT: AnnouncementForm = {
  title: '',
  content: '',
  image_url: '',
  video_url: '',
  is_active: true,
  is_blocking: false,
};

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString('pt-BR') : '—';

/** Aba de usuários da ferramenta ZAPMRO (login por usuário/email + senha). */
export const ZapmroUsersTab: React.FC = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<ZapmroUser[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<UserForm>(EMPTY_USER);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [syncing, setSyncing] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  /** Vincula emails e senhas já cadastrados nos acessos criados. */
  const handleSyncCredentials = async () => {
    setSyncing(true);
    try {
      const { data } = await supabase.functions.invoke('zapmro-api', { body: { action: 'sync_credentials' } });
      if (data?.success) {
        toast({
          title: 'Acessos vinculados',
          description: `${data.updated ?? 0} usuário(s) atualizados (${data.passwords ?? 0} senha(s) recuperadas).`,
        });
        void load();
      } else {
        toast({ title: data?.error || 'Erro ao vincular acessos', variant: 'destructive' });
      }
    } finally {
      setSyncing(false);
    }
  };

  /** Reenvia o acesso (usuário + senha) para o email cadastrado. */
  const handleSendAccess = async (user: ZapmroUser) => {
    setSendingId(user.id);
    try {
      const { data } = await supabase.functions.invoke('zapmro-api', {
        body: { action: 'send_access', id: user.id },
      });
      if (data?.success) toast({ title: 'Acesso enviado!', description: `Email enviado para ${user.email}` });
      else toast({ title: data?.error || 'Erro ao enviar acesso', variant: 'destructive' });
    } finally {
      setSendingId(null);
    }
  };


  const handleCopyAccess = async (user: ZapmroUser) => {
    const ok = await copyAccessToClipboard({
      username: user.username,
      password: user.password_plain,
      email: user.email,
    });
    toast(
      ok
        ? { title: 'Acesso copiado!' }
        : { title: 'Não foi possível copiar', variant: 'destructive' },
    );
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.functions.invoke('zapmro-api', {
        body: { action: 'list_users' },
      });
      if (data?.success) setUsers(data.users || []);
      else toast({ title: 'Erro ao carregar usuários', variant: 'destructive' });
    } catch (error) {
      console.error('[ZapmroUsers] load', error);
      toast({ title: 'Erro ao carregar usuários', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!form.username.trim()) {
      toast({ title: 'Informe o nome de usuário', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const { data } = await supabase.functions.invoke('zapmro-api', {
        body: {
          action: 'upsert_user',
          username: form.username,
          name: form.name,
          email: form.email,
          password: form.password || undefined,
          days_remaining: form.days_remaining,
          is_active: form.is_active,
          whatsapp: form.whatsapp,
          whatsapp_limit: form.whatsapp_limit,
        },
      });

      if (data?.success) {
        toast({ title: 'Usuário salvo!' });
        setForm(EMPTY_USER);
        void load();
      } else {
        toast({ title: data?.error || 'Erro ao salvar', variant: 'destructive' });
      }
    } catch (error) {
      console.error('[ZapmroUsers] save', error);
      toast({ title: 'Erro ao salvar usuário', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (user: ZapmroUser) => {
    if (!window.confirm(`Remover o usuário ${user.username}?`)) return;
    const { data } = await supabase.functions.invoke('zapmro-api', {
      body: { action: 'delete_user', id: user.id },
    });
    if (data?.success) {
      toast({ title: 'Usuário removido' });
      void load();
    } else {
      toast({ title: 'Erro ao remover usuário', variant: 'destructive' });
    }
  };

  const handleRemoveWhatsapp = async (userId: string, number: string) => {
    if (!window.confirm(`Remover o número ${number} deste usuário?`)) return;
    const { data } = await supabase.functions.invoke('zapmro-api', {
      body: { action: 'remove_whatsapp', id: userId, number },
    });
    if (data?.success) {
      toast({ title: 'Número removido' });
      void load();
    } else {
      toast({ title: 'Erro ao remover número', variant: 'destructive' });
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.name || '').toLowerCase().includes(q),
    );
  }, [users, search]);

  /** Limite inicial de renderização para não sobrecarregar a página. */
  const PAGE_SIZE = 50;
  const [showAll, setShowAll] = useState(false);
  const visible = useMemo(
    () => (showAll || search.trim() ? filtered : filtered.slice(0, PAGE_SIZE)),
    [filtered, showAll, search],
  );
  const hiddenCount = filtered.length - visible.length;

  return (
    <div className="space-y-6">
      <Card className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">{form.id ? 'Editar usuário' : 'Novo usuário / atualizar senha'}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="zap-username">Usuário</Label>
            <Input
              id="zap-username"
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              placeholder="usuario"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zap-name">Nome</Label>
            <Input
              id="zap-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Nome do cliente"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zap-email">Email</Label>
            <Input
              id="zap-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="cliente@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zap-password">Senha</Label>
            <Input
              id="zap-password"
              type="text"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder={form.id ? 'Deixe vazio para manter' : 'Senha de acesso'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zap-days">Dias de acesso</Label>
            <Input
              id="zap-days"
              type="number"
              value={form.days_remaining}
              onChange={(e) => setForm((p) => ({ ...p, days_remaining: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zap-whatsapp">WhatsApp (Admin)</Label>
            <Input
              id="zap-whatsapp"
              value={form.whatsapp}
              onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
              placeholder="Ex: 5511999999999"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zap-whatsapp-limit">Limite de Números (-1 = Ilimitado)</Label>
            <Input
              id="zap-whatsapp-limit"
              type="number"
              value={form.whatsapp_limit}
              onChange={(e) => setForm((p) => ({ ...p, whatsapp_limit: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-3 pt-6">

            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))}
            />
            <span className="text-sm text-muted-foreground">Acesso liberado</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
          {form.id && (
            <Button variant="outline" onClick={() => setForm(EMPTY_USER)}>
              Cancelar edição
            </Button>
          )}
        </div>
      </Card>

      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por usuário, nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={() => void handleSyncCredentials()} disabled={syncing}>
          {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
          Vincular emails e senhas
        </Button>
        <Button variant="outline" onClick={() => void load()} disabled={isLoading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
          Atualizar ({users.length})
        </Button>

      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Nenhum usuário encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((user) => (
            <Card key={user.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{user.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email || 'sem email'}</p>
                </div>
                <Badge variant={user.is_active === false ? 'destructive' : 'default'}>
                  {user.is_active === false ? 'Bloqueado' : 'Ativo'}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Nome: {user.name || '—'}</p>
                <p>Acesso: {
                  (user.days_remaining ?? 0) >= 9999 ? 'Vitalício' : 
                  (user.days_remaining ?? 0) > 180 ? 'Anual' :
                  (user.days_remaining ?? 0) > 31 ? 'Semestral' : 'Mensal'
                } ({user.days_remaining ?? 0} dias)</p>
                <p>WhatsApp: {user.whatsapp || '—'}</p>
                <p>Limite WhatsApp: {user.whatsapp_limit === -1 ? 'Ilimitado' : user.whatsapp_limit} ({user.registered_numbers?.length || 0} reg.)</p>
                
                {user.registered_numbers && user.registered_numbers.length > 0 && (
                  <div className="mt-2 space-y-1 bg-muted/50 p-2 rounded-md">
                    <p className="font-semibold text-[10px] uppercase tracking-wider flex items-center justify-between">
                      Números Registrados
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-4 p-0 text-[10px]" 
                        onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                      >
                        {expandedUser === user.id ? 'Ocultar' : 'Ver todos'}
                      </Button>
                    </p>
                    {user.registered_numbers.slice(0, expandedUser === user.id ? undefined : 2).map((num) => (
                      <div key={num} className="flex items-center justify-between group">
                        <span className="text-[11px] font-mono">{num}</span>
                        <button 
                          onClick={() => handleRemoveWhatsapp(user.id, num)}
                          className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {user.registered_numbers.length > 2 && expandedUser !== user.id && (
                      <p className="text-[10px] text-center pt-1">+ {user.registered_numbers.length - 2} números</p>
                    )}
                  </div>
                )}

                <p className="flex items-center gap-1 pt-1">

                  Senha:{' '}
                  <span className="font-mono text-foreground">
                    {user.password_plain
                      ? visiblePasswords[user.id]
                        ? user.password_plain
                        : '••••••••'
                      : user.has_password
                      ? 'cadastrada (não visível)'
                      : 'não cadastrada'}
                  </span>
                  {user.password_plain && (
                    <button
                      type="button"
                      aria-label={visiblePasswords[user.id] ? 'Ocultar senha' : 'Mostrar senha'}
                      onClick={() => setVisiblePasswords((p) => ({ ...p, [user.id]: !p[user.id] }))}
                    >
                      {visiblePasswords[user.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </p>
                <p>Último acesso: {formatDate(user.last_access)}</p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    setForm({
                      id: user.id,
                      username: user.username,
                      name: user.name || '',
                      email: user.email || '',
                      password: user.password_plain || '',
                      days_remaining: String(user.days_remaining ?? 365),
                      is_active: user.is_active !== false,
                      whatsapp: user.whatsapp || '',
                      whatsapp_limit: String(user.whatsapp_limit ?? 1),
                    })
                  }

                >
                  Editar
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => void handleCopyAccess(user)}>
                  <Copy className="w-3.5 h-3.5" /> Copiar acesso
                </Button>
                {user.email && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    disabled={sendingId === user.id}
                    onClick={() => void handleSendAccess(user)}
                  >
                    {sendingId === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    Enviar acesso
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => void handleDelete(user)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {!isLoading && hiddenCount > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setShowAll(true)}>
            Ver todos ({hiddenCount} restantes)
          </Button>
        </div>
      )}
    </div>
  );
};

/** Aba de avisos exibidos nos tutoriais dos alunos e na ferramenta externa. */
export const ZapmroAnnouncementsTab: React.FC = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<ZapmroAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<AnnouncementForm>(EMPTY_ANNOUNCEMENT);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.functions.invoke('zapmro-api', {
        body: { action: 'list_announcements' },
      });
      if (data?.success) setItems(data.announcements || []);
    } catch (error) {
      console.error('[ZapmroAnnouncements] load', error);
      toast({ title: 'Erro ao carregar avisos', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Informe o título do aviso', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const { data } = await supabase.functions.invoke('zapmro-api', {
        body: { action: 'save_announcement', ...form },
      });
      if (data?.success) {
        toast({ title: 'Aviso salvo!' });
        setForm(EMPTY_ANNOUNCEMENT);
        void load();
      } else {
        toast({ title: data?.error || 'Erro ao salvar aviso', variant: 'destructive' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remover este aviso?')) return;
    const { data } = await supabase.functions.invoke('zapmro-api', {
      body: { action: 'delete_announcement', id },
    });
    if (data?.success) {
      toast({ title: 'Aviso removido' });
      void load();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">{form.id ? 'Editar aviso' : 'Novo aviso'}</h3>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ann-title">Título</Label>
          <Input
            id="ann-title"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Atualização da extensão"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ann-content">Conteúdo</Label>
          <Textarea
            id="ann-content"
            rows={4}
            value={form.content}
            onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
            placeholder="Mensagem exibida na área de tutoriais e na ferramenta"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ann-image">Imagem (URL)</Label>
            <Input
              id="ann-image"
              value={form.image_url}
              onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ann-video">Vídeo (URL)</Label>
            <Input
              id="ann-video"
              value={form.video_url}
              onChange={(e) => setForm((p) => ({ ...p, video_url: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-3">
            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))}
            />
            <span className="text-sm text-muted-foreground">Ativo</span>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={form.is_blocking}
              onCheckedChange={(checked) => setForm((p) => ({ ...p, is_blocking: checked }))}
            />
            <span className="text-sm text-muted-foreground">Bloqueante</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Salvar aviso
          </Button>
          {form.id && (
            <Button variant="outline" onClick={() => setForm(EMPTY_ANNOUNCEMENT)}>
              Cancelar edição
            </Button>
          )}
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Nenhum aviso cadastrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((item) => (
            <Card key={item.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{item.title}</p>
                <div className="flex gap-1">
                  {item.is_blocking && <Badge variant="destructive">Bloqueante</Badge>}
                  <Badge variant={item.is_active ? 'default' : 'secondary'}>
                    {item.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
              {item.content && (
                <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-4">{item.content}</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    setForm({
                      id: item.id,
                      title: item.title,
                      content: item.content || '',
                      image_url: item.image_url || '',
                      video_url: item.video_url || '',
                      is_active: item.is_active,
                      is_blocking: item.is_blocking,
                    })
                  }
                >
                  Editar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => void handleDelete(item.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export const ZapmroUsersIcon = Users;
