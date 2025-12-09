import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Mail, 
  Eye, 
  EyeOff,
  Save,
  DollarSign,
  Calendar,
  Trash2,
  ExternalLink,
  Code,
  Instagram
} from 'lucide-react';

interface PaidMemberUser {
  id: string;
  username: string;
  email: string;
  password: string;
  instagram_username?: string;
  subscription_status: 'active' | 'pending' | 'expired';
  subscription_end?: string;
  strategies_generated: number;
  creatives_used: number;
  created_at: string;
}

interface PixelConfig {
  pixelId: string;
  events: {
    registration: boolean;
    purchase: boolean;
  };
}

const PAID_MEMBERS_KEY = 'mro_paid_members';
const PIXEL_CONFIG_KEY = 'mro_pixel_config';
const STRIPE_LINK_KEY = 'mro_stripe_link';

const getPaidMembers = (): PaidMemberUser[] => {
  const stored = localStorage.getItem(PAID_MEMBERS_KEY);
  return stored ? JSON.parse(stored) : [];
};

const savePaidMembers = (members: PaidMemberUser[]) => {
  localStorage.setItem(PAID_MEMBERS_KEY, JSON.stringify(members));
};

const getPixelConfig = (): PixelConfig => {
  const stored = localStorage.getItem(PIXEL_CONFIG_KEY);
  return stored ? JSON.parse(stored) : {
    pixelId: '',
    events: { registration: true, purchase: true }
  };
};

const savePixelConfig = (config: PixelConfig) => {
  localStorage.setItem(PIXEL_CONFIG_KEY, JSON.stringify(config));
};

const getStripeLink = (): string => {
  return localStorage.getItem(STRIPE_LINK_KEY) || '';
};

const saveStripeLink = (link: string) => {
  localStorage.setItem(STRIPE_LINK_KEY, link);
};

export default function SalesDashboard() {
  const { toast } = useToast();
  const [members, setMembers] = useState<PaidMemberUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [pixelConfig, setPixelConfig] = useState<PixelConfig>(getPixelConfig());
  const [stripeLink, setStripeLink] = useState(getStripeLink());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = () => {
    setIsRefreshing(true);
    const loadedMembers = getPaidMembers();
    
    // Update expired subscriptions
    const now = new Date();
    const updatedMembers = loadedMembers.map(member => {
      if (member.subscription_end && new Date(member.subscription_end) < now && member.subscription_status === 'active') {
        return { ...member, subscription_status: 'expired' as const };
      }
      return member;
    });
    
    savePaidMembers(updatedMembers);
    setMembers(updatedMembers);
    setIsRefreshing(false);
  };

  const togglePassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getRemainingDays = (endDate?: string): number => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleDeleteMember = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este membro?')) return;
    
    const updated = members.filter(m => m.id !== id);
    savePaidMembers(updated);
    setMembers(updated);
    
    // Also delete associated data
    localStorage.removeItem(`mro_strategy_${id}`);
    localStorage.removeItem(`mro_profile_${id}`);
    
    toast({ title: "Membro removido", description: "O membro foi excluído com sucesso" });
  };

  const handleToggleStatus = (member: PaidMemberUser) => {
    const newStatus = member.subscription_status === 'active' ? 'expired' : 'active';
    const newEndDate = newStatus === 'active' 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : member.subscription_end;
    
    const updated = members.map(m => 
      m.id === member.id 
        ? { ...m, subscription_status: newStatus as any, subscription_end: newEndDate }
        : m
    );
    
    savePaidMembers(updated);
    setMembers(updated);
    
    toast({ 
      title: newStatus === 'active' ? "Membro ativado" : "Membro desativado",
      description: newStatus === 'active' ? "30 dias adicionados" : "Assinatura expirada"
    });
  };

  const handleSavePixelConfig = () => {
    savePixelConfig(pixelConfig);
    toast({ title: "Pixel salvo!", description: "Configuração do Facebook Pixel atualizada" });
  };

  const handleSaveStripeLink = () => {
    saveStripeLink(stripeLink);
    toast({ title: "Link salvo!", description: "Link de pagamento Stripe atualizado" });
  };

  const filteredMembers = members.filter(m =>
    m.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.instagram_username || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = members.filter(m => m.subscription_status === 'active').length;
  const expiredCount = members.filter(m => m.subscription_status === 'expired').length;
  const pendingCount = members.filter(m => m.subscription_status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6 text-center">
            <Users className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{members.length}</p>
            <p className="text-xs text-muted-foreground">Total Membros</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Ativos</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
            <p className="text-2xl font-bold">{expiredCount}</p>
            <p className="text-xs text-muted-foreground">Expirados</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6 text-center">
            <Clock className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
            <p className="text-2xl font-bold">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Pixel & Stripe Config */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Stripe Link */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Link de Pagamento Stripe
            </CardTitle>
            <CardDescription>
              Configure o link de pagamento para o plano R$57/mês
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>URL do Checkout Stripe</Label>
              <Input
                value={stripeLink}
                onChange={(e) => setStripeLink(e.target.value)}
                placeholder="https://buy.stripe.com/..."
                className="mt-1"
              />
            </div>
            <Button onClick={handleSaveStripeLink} className="w-full gap-2">
              <Save className="w-4 h-4" />
              Salvar Link
            </Button>
          </CardContent>
        </Card>

        {/* Facebook Pixel */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5 text-blue-500" />
              Facebook Pixel
            </CardTitle>
            <CardDescription>
              Configure o Pixel para rastrear cadastros e vendas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>ID do Pixel</Label>
              <Input
                value={pixelConfig.pixelId}
                onChange={(e) => setPixelConfig(prev => ({ ...prev, pixelId: e.target.value }))}
                placeholder="123456789012345"
                className="mt-1"
              />
            </div>
            <div className="space-y-2">
              <Label>Eventos Ativos</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pixelConfig.events.registration}
                    onChange={(e) => setPixelConfig(prev => ({
                      ...prev,
                      events: { ...prev.events, registration: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">Cadastro (Lead)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pixelConfig.events.purchase}
                    onChange={(e) => setPixelConfig(prev => ({
                      ...prev,
                      events: { ...prev.events, purchase: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">Venda (Purchase)</span>
                </label>
              </div>
            </div>
            <Button onClick={handleSavePixelConfig} className="w-full gap-2">
              <Save className="w-4 h-4" />
              Salvar Pixel
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Pixel Code Preview */}
      {pixelConfig.pixelId && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Code className="w-4 h-4" />
              Código do Pixel (Adicionar no index.html)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-secondary/50 p-4 rounded-lg text-xs overflow-x-auto">
{`<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelConfig.pixelId}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${pixelConfig.pixelId}&ev=PageView&noscript=1"
/></noscript>
<!-- End Facebook Pixel Code -->`}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Membros do Plano R$57/mês
          </h2>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMembers}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou @instagram..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum membro encontrado</p>
              <p className="text-sm mt-2">Os membros aparecerão aqui após o pagamento</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((member) => {
              const remainingDays = getRemainingDays(member.subscription_end);
              
              return (
                <Card key={member.id} className={`glass-card transition-all ${
                  member.subscription_status === 'expired' ? 'opacity-60 border-red-500/30' :
                  member.subscription_status === 'active' ? 'border-green-500/30' :
                  'border-yellow-500/30'
                }`}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-primary-foreground font-bold text-xl">
                        {member.username.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{member.username}</span>
                          <Badge variant={
                            member.subscription_status === 'active' ? 'default' :
                            member.subscription_status === 'expired' ? 'destructive' : 'secondary'
                          }>
                            {member.subscription_status === 'active' ? 'Ativo' :
                             member.subscription_status === 'expired' ? 'Expirado' : 'Pendente'}
                          </Badge>
                          {member.subscription_status === 'active' && (
                            <span className="text-xs text-green-500 font-medium">
                              {remainingDays} dias restantes
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {member.email}
                          </span>
                          {member.instagram_username && (
                            <span className="flex items-center gap-1">
                              <Instagram className="w-3 h-3" />
                              @{member.instagram_username}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Senha: {showPasswords[member.id] ? member.password : '••••••••'}
                            <button
                              onClick={() => togglePassword(member.id)}
                              className="ml-1 hover:text-foreground"
                            >
                              {showPasswords[member.id] ? <EyeOff className="w-3 h-3 inline" /> : <Eye className="w-3 h-3 inline" />}
                            </button>
                          </span>
                          <span>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            Cadastro: {new Date(member.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          {member.subscription_end && (
                            <span>
                              Expira: {new Date(member.subscription_end).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-muted-foreground">
                            Estratégias: {member.strategies_generated}/1
                          </span>
                          <span className="text-muted-foreground">
                            Criativos: {member.creatives_used}/6
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(member)}
                          className={member.subscription_status === 'active' ? 'text-red-500' : 'text-green-500'}
                        >
                          {member.subscription_status === 'active' ? (
                            <>
                              <XCircle className="w-4 h-4 mr-1" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Ativar +30 dias
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMember(member.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
