import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  UserPlus, 
  Users, 
  Mail, 
  RefreshCw, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Search
} from 'lucide-react';

interface CreatedAccess {
  id: string;
  customer_email: string;
  customer_name: string | null;
  username: string;
  password: string;
  service_type: 'whatsapp' | 'instagram';
  access_type: 'annual' | 'lifetime' | 'monthly';
  days_access: number;
  api_created: boolean;
  email_sent: boolean;
  email_sent_at: string | null;
  notes: string | null;
  created_at: string;
}

const ADMIN_PASSWORD = 'MRO2024@admin';

export default function AdminUsuario() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [accesses, setAccesses] = useState<CreatedAccess[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CreatedAccess>>({});

  // Form state
  const [form, setForm] = useState({
    customerEmail: '',
    customerName: '',
    username: '',
    password: '',
    serviceType: 'instagram' as 'whatsapp' | 'instagram',
    accessType: 'annual' as 'annual' | 'lifetime' | 'monthly',
    daysAccess: 365,
    notes: '',
  });

  useEffect(() => {
    const savedAuth = localStorage.getItem('adminusuario_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      loadAccesses();
    }
  }, []);

  const handleLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('adminusuario_auth', 'true');
      loadAccesses();
      toast.success('Login realizado com sucesso!');
    } else {
      toast.error('Senha incorreta!');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminusuario_auth');
    setAdminPassword('');
  };

  const loadAccesses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('manage-user-access', {
        body: { action: 'list_accesses' },
      });

      if (error) throw error;
      setAccesses(data.accesses || []);
    } catch (error: any) {
      toast.error('Erro ao carregar acessos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm({ ...form, password });
  };

  const handleCreateAccess = async () => {
    if (!form.customerEmail || !form.username || !form.password) {
      toast.error('Preencha todos os campos obrigatórios!');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('manage-user-access', {
        body: {
          action: 'create_access',
          ...form,
        },
      });

      if (error) throw error;

      toast.success(
        `Acesso criado! API: ${data.apiCreated ? '✅' : '❌'} | Email: ${data.emailSent ? '✅' : '❌'}`
      );

      setForm({
        customerEmail: '',
        customerName: '',
        username: '',
        password: '',
        serviceType: 'instagram',
        accessType: 'annual',
        daysAccess: 365,
        notes: '',
      });

      loadAccesses();
    } catch (error: any) {
      toast.error('Erro ao criar acesso: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('manage-user-access', {
        body: { action: 'resend_email', id },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Email reenviado com sucesso!');
        loadAccesses();
      } else {
        toast.error('Erro ao reenviar email');
      }
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccess = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este acesso?')) return;

    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('manage-user-access', {
        body: { action: 'delete_access', id },
      });

      if (error) throw error;
      toast.success('Acesso excluído!');
      loadAccesses();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (access: CreatedAccess) => {
    setEditingId(access.id);
    setEditForm({
      customer_email: access.customer_email,
      customer_name: access.customer_name,
      notes: access.notes,
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('manage-user-access', {
        body: { action: 'update_access', id, updates: editForm },
      });

      if (error) throw error;
      toast.success('Acesso atualizado!');
      setEditingId(null);
      loadAccesses();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredAccesses = accesses.filter(
    (a) =>
      a.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.customer_name && a.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-yellow-500/30">
          <CardHeader className="text-center">
            <Lock className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <CardTitle className="text-white text-2xl">Admin Usuários</CardTitle>
            <CardDescription className="text-gray-400">
              Digite a senha para acessar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-300">Senha</Label>
              <Input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Digite a senha..."
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <Button
              onClick={handleLogin}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
            >
              Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Usuários</h1>
            <p className="text-gray-400">Gerencie acessos WhatsApp e Instagram</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadAccesses} variant="outline" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={handleLogout} variant="destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="create" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
              <UserPlus className="w-4 h-4 mr-2" />
              Criar Acesso
            </TabsTrigger>
            <TabsTrigger value="list" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
              <Users className="w-4 h-4 mr-2" />
              Acessos ({accesses.length})
            </TabsTrigger>
          </TabsList>

          {/* Create Access Tab */}
          <TabsContent value="create">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-yellow-500" />
                  Criar Novo Acesso
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Crie acesso na API e envie email automaticamente para o cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Email do Cliente *</Label>
                    <Input
                      type="email"
                      value={form.customerEmail}
                      onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                      placeholder="cliente@email.com"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Nome do Cliente</Label>
                    <Input
                      value={form.customerName}
                      onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                      placeholder="Nome completo"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Usuário *</Label>
                    <Input
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      placeholder="nome_usuario"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Senha *</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Senha"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                      <Button
                        type="button"
                        onClick={generatePassword}
                        variant="outline"
                        className="shrink-0"
                      >
                        Gerar
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Serviço *</Label>
                    <Select
                      value={form.serviceType}
                      onValueChange={(value: 'whatsapp' | 'instagram') =>
                        setForm({ ...form, serviceType: value })
                      }
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram">MRO Instagram</SelectItem>
                        <SelectItem value="whatsapp">ZAPMRO (WhatsApp)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Tipo de Acesso *</Label>
                    <Select
                      value={form.accessType}
                      onValueChange={(value: 'annual' | 'lifetime' | 'monthly') =>
                        setForm({ ...form, accessType: value })
                      }
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Anual (365 dias)</SelectItem>
                        <SelectItem value="lifetime">Vitalício</SelectItem>
                        <SelectItem value="monthly">Mensal (30 dias)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Dias de Acesso</Label>
                    <Input
                      type="number"
                      value={form.daysAccess}
                      onChange={(e) => setForm({ ...form, daysAccess: parseInt(e.target.value) || 365 })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Observações</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Notas internas..."
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <Button
                  onClick={handleCreateAccess}
                  disabled={loading}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-lg py-6"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="w-5 h-5 mr-2" />
                  )}
                  Criar Acesso e Enviar Email
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* List Accesses Tab */}
          <TabsContent value="list" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por email, usuário ou nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="grid gap-4">
              {filteredAccesses.length === 0 ? (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="py-10 text-center text-gray-400">
                    Nenhum acesso encontrado
                  </CardContent>
                </Card>
              ) : (
                filteredAccesses.map((access) => (
                  <Card key={access.id} className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      {editingId === access.id ? (
                        <div className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <Input
                              value={editForm.customer_email || ''}
                              onChange={(e) =>
                                setEditForm({ ...editForm, customer_email: e.target.value })
                              }
                              placeholder="Email"
                              className="bg-gray-700 border-gray-600 text-white"
                            />
                            <Input
                              value={editForm.customer_name || ''}
                              onChange={(e) =>
                                setEditForm({ ...editForm, customer_name: e.target.value })
                              }
                              placeholder="Nome"
                              className="bg-gray-700 border-gray-600 text-white"
                            />
                          </div>
                          <Textarea
                            value={editForm.notes || ''}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            placeholder="Notas"
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleSaveEdit(access.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Salvar
                            </Button>
                            <Button
                              onClick={() => setEditingId(null)}
                              variant="outline"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant={access.service_type === 'instagram' ? 'default' : 'secondary'}
                                className={
                                  access.service_type === 'instagram'
                                    ? 'bg-pink-600'
                                    : 'bg-green-600'
                                }
                              >
                                {access.service_type === 'instagram' ? 'Instagram' : 'WhatsApp'}
                              </Badge>
                              <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                                {access.access_type === 'lifetime'
                                  ? 'Vitalício'
                                  : access.access_type === 'annual'
                                  ? 'Anual'
                                  : 'Mensal'}
                              </Badge>
                              {access.api_created && (
                                <Badge className="bg-blue-600">API ✓</Badge>
                              )}
                              {access.email_sent && (
                                <Badge className="bg-purple-600">Email ✓</Badge>
                              )}
                            </div>
                            <div className="text-white">
                              <span className="font-semibold">{access.customer_name || 'Sem nome'}</span>
                              <span className="text-gray-400 ml-2">({access.customer_email})</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span>
                                Usuário: <code className="text-yellow-400">{access.username}</code>
                              </span>
                              <span className="flex items-center gap-1">
                                Senha:{' '}
                                <code className="text-yellow-400">
                                  {showPasswords[access.id] ? access.password : '••••••••'}
                                </code>
                                <button
                                  onClick={() =>
                                    setShowPasswords({
                                      ...showPasswords,
                                      [access.id]: !showPasswords[access.id],
                                    })
                                  }
                                >
                                  {showPasswords[access.id] ? (
                                    <EyeOff className="w-3 h-3" />
                                  ) : (
                                    <Eye className="w-3 h-3" />
                                  )}
                                </button>
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Criado em:{' '}
                              {new Date(access.created_at).toLocaleString('pt-BR')}
                              {access.notes && (
                                <span className="ml-4 text-gray-400">Notas: {access.notes}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              onClick={() => handleResendEmail(access.id)}
                              size="sm"
                              variant="outline"
                              disabled={loading}
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => startEditing(access)}
                              size="sm"
                              variant="outline"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteAccess(access.id)}
                              size="sm"
                              variant="destructive"
                              disabled={loading}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
