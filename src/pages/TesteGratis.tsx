import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Sparkles, 
  Play, 
  Download, 
  Users, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Instagram,
  Mail,
  Phone,
  User,
  Copy,
  ExternalLink,
  Rocket,
  X,
  Zap,
  Heart,
  UserPlus,
  Eye,
  Trash2,
  Video,
  MessageCircle,
  Crown,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import logoMro from '@/assets/logo-mro-2.png';

interface TrialSettings {
  mro_master_username: string;
  mro_master_password: string;
  welcome_video_url: string | null;
  installation_video_url: string | null;
  usage_video_url: string | null;
  download_link: string | null;
  group_link: string | null;
  trial_duration_hours: number;
  is_active: boolean;
}

interface AccessData {
  username: string;
  password: string;
  expiresAt: string;
}

const TesteGratis = () => {
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagramUsername, setInstagramUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<TrialSettings | null>(null);
  const [accessData, setAccessData] = useState<AccessData | null>(null);
  const [existingTrial, setExistingTrial] = useState<{ tested_at: string } | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('free_trial_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Error loading settings:', error);
        return;
      }

      setSettings(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const normalizeInstagram = (input: string): string => {
    let username = input.trim().toLowerCase();
    const patterns = [
      /instagram\.com\/([^/?#]+)/,
      /^@?([a-zA-Z0-9._]+)$/
    ];

    for (const pattern of patterns) {
      const match = username.match(pattern);
      if (match) {
        username = match[1];
        break;
      }
    }

    username = username.replace(/^@/, '');
    username = username.split('?')[0].split('#')[0];
    return username;
  };

  const formatWhatsapp = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(formatWhatsapp(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName || !email || !whatsapp || !instagramUsername) {
      toast.error('Preencha todos os campos!');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Email inválido!');
      return;
    }

    const normalizedIG = normalizeInstagram(instagramUsername);
    if (!normalizedIG || normalizedIG.length < 3) {
      toast.error('Instagram inválido!');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('free-trial-register', {
        body: {
          fullName,
          email,
          whatsapp: whatsapp.replace(/\D/g, ''),
          instagramUsername: normalizedIG
        }
      });

      if (error) throw new Error(error.message);

      if (!data.success) {
        if (data.alreadyTested) {
          setExistingTrial({ tested_at: data.testedAt });
          toast.error(data.message);
        } else {
          toast.error(data.message || 'Erro ao registrar');
        }
        return;
      }

      setAccessData({
        username: data.username,
        password: data.password,
        expiresAt: data.expiresAt
      });

      toast.success('Teste liberado com sucesso!');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erro ao processar registro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const formatExpirationDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const features = [
    {
      icon: Sparkles,
      title: 'I.A. MRO (NOVA)',
      description: 'Personalização completa para o seu nicho, em segundos',
      items: [
        'Cria legendas prontas e otimizadas',
        'Gera biografias profissionais',
        'Indica melhores horários para postar',
        'Recomenda hashtags relevantes'
      ]
    },
    {
      icon: Zap,
      title: 'Automação Estratégica MRO',
      description: 'Operações diárias para atrair público real',
      items: [
        'Curte fotos relevantes',
        'Segue perfis estratégicos',
        'Reage aos Stories com ❤️',
        'Interage com até 200 pessoas/dia'
      ]
    },
    {
      icon: Video,
      title: 'Área de Membros Vitalícia',
      description: 'Acesso completo a conteúdos exclusivos',
      items: [
        'Vídeos estratégicos passo a passo',
        'Como deixar perfil profissional',
        'Como agendar postagens',
        'Estratégias para bombar do zero'
      ]
    },
    {
      icon: MessageCircle,
      title: 'Grupo VIP de Suporte',
      description: 'Networking e suporte especializado',
      items: [
        'Acesso ao grupo VIP exclusivo',
        'Tire dúvidas com especialistas',
        'Atualizações em primeira mão'
      ]
    }
  ];

  if (loadingSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />
      </div>
    );
  }

  if (!settings?.is_active) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Teste Indisponível</h2>
            <p className="text-white/80">O teste grátis está temporariamente desabilitado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success screen - after registration
  if (accessData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <img src={logoMro} alt="MRO" className="h-14 mx-auto mb-4" />
            <div className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-full text-lg font-bold">
              <CheckCircle2 className="w-6 h-6" />
              Teste Liberado com Sucesso!
            </div>
          </div>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-2xl mb-6">
            <CardContent className="p-6 space-y-6">
              {/* Expiration Warning */}
              <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-5 rounded-xl">
                <div className="flex items-start gap-4">
                  <Clock className="w-8 h-8 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-xl mb-1">⚠️ ATENÇÃO: Você tem 24 HORAS!</p>
                    <p className="opacity-90">
                      Seu teste expira em: <strong>{formatExpirationDate(accessData.expiresAt)}</strong>
                    </p>
                    <p className="opacity-90 mt-1">
                      Após esse período, NÃO conseguirá testar novamente com este Instagram.
                    </p>
                  </div>
                </div>
              </div>

              {/* Credentials */}
              <div className="bg-gradient-to-r from-purple-100 to-indigo-100 p-6 rounded-xl space-y-4">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-purple-600" />
                  Seus Dados de Acesso
                </h3>
                
                <div className="grid gap-3">
                  <div className="bg-white p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Usuário:</span>
                      <span className="font-mono font-bold text-lg">{accessData.username}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(accessData.username, 'Usuário')}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="bg-white p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Senha:</span>
                      <span className="font-mono font-bold text-lg">{accessData.password}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(accessData.password, 'Senha')}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tutorial Videos Warning */}
              <div className="bg-blue-50 border-2 border-blue-400 p-5 rounded-xl">
                <div className="flex items-start gap-3">
                  <Play className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-blue-800 text-lg mb-2">📺 Assista os Vídeos Tutoriais!</p>
                    <p className="text-blue-700 mb-3">
                      Para instalar e utilizar a ferramenta corretamente, assista os vídeos abaixo:
                    </p>
                    
                    {/* Videos Grid */}
                    <div className="grid md:grid-cols-3 gap-3 mb-4">
                      {settings?.welcome_video_url && (
                        <a href={settings.welcome_video_url} target="_blank" rel="noopener noreferrer"
                          className="bg-white p-3 rounded-lg flex items-center gap-2 hover:bg-blue-100 transition-colors">
                          <div className="bg-yellow-400 rounded-full p-1">
                            <Play className="w-4 h-4 text-black" />
                          </div>
                          <span className="font-medium text-sm">Bem-vindo</span>
                        </a>
                      )}
                      {settings?.installation_video_url && (
                        <a href={settings.installation_video_url} target="_blank" rel="noopener noreferrer"
                          className="bg-white p-3 rounded-lg flex items-center gap-2 hover:bg-blue-100 transition-colors">
                          <div className="bg-blue-400 rounded-full p-1">
                            <Download className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium text-sm">Instalação</span>
                        </a>
                      )}
                      {settings?.usage_video_url && (
                        <a href={settings.usage_video_url} target="_blank" rel="noopener noreferrer"
                          className="bg-white p-3 rounded-lg flex items-center gap-2 hover:bg-blue-100 transition-colors">
                          <div className="bg-green-400 rounded-full p-1">
                            <Zap className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium text-sm">Como Usar</span>
                        </a>
                      )}
                    </div>

                    {/* No Support Warning */}
                    <div className="bg-red-100 border border-red-300 p-3 rounded-lg">
                      <p className="text-red-700 font-bold text-sm">🚫 NÃO TEMOS SUPORTE PARA TESTES GRÁTIS!</p>
                      <p className="text-red-600 text-xs mt-1">Para ter suporte, adquira um de nossos planos.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid gap-3">
                {settings?.download_link && (
                  <a href={settings.download_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity">
                    <Download className="w-5 h-5" />
                    Download do Sistema
                  </a>
                )}
                {settings?.group_link && (
                  <a href={settings.group_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-green-500 text-white py-4 px-6 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity">
                    <MessageCircle className="w-5 h-5" />
                    Entrar no Grupo VIP
                  </a>
                )}
              </div>

              {/* Support Types */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-center mb-4">
                  💡 Está com dificuldade? Conheça nossos Suportes Premium!
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-orange-500 rounded-lg p-1.5">
                        <ExternalLink className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="font-bold text-orange-700">Suporte AnyDesk</h4>
                    </div>
                    <p className="text-gray-600 text-sm">
                      <strong>Acesso remoto</strong> - Configuramos tudo no seu PC em tempo real!
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-green-500 rounded-lg p-1.5">
                        <Phone className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="font-bold text-green-700">Suporte WhatsApp</h4>
                    </div>
                    <p className="text-gray-600 text-sm">
                      <strong>Atendimento direto</strong> - Tire dúvidas por mensagens ou áudios!
                    </p>
                  </div>
                </div>
                <p className="text-center text-green-700 font-semibold mt-3 text-sm">
                  👆 Ambos inclusos nos planos pagos!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Already tested screen
  if (existingTrial) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full bg-white/95 backdrop-blur border-0 shadow-2xl">
          <CardContent className="p-8 text-center">
            <img src={logoMro} alt="MRO" className="h-12 mx-auto mb-6" />
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Você já testou!</h2>
            <p className="text-gray-600 mb-6">
              Este Instagram já foi utilizado para teste em {formatExpirationDate(existingTrial.tested_at)}.
            </p>
            <a 
              href="https://maisresultadosonline.com.br/instagram-nova"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform"
            >
              <Sparkles className="w-5 h-5" />
              Ver Planos Disponíveis
              <ExternalLink className="w-4 h-4" />
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main landing page
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      {/* Header with Logo */}
      <header className="py-6 px-4">
        <div className="max-w-6xl mx-auto flex justify-center">
          <img src={logoMro} alt="MRO" className="h-12 md:h-16" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            Não gaste com anúncios,<br />
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              utilize a MRO!
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-purple-200 mb-8">
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="w-5 h-5" /> Mais Engajamento
            </span>
            <span className="mx-2">•</span>
            <span className="inline-flex items-center gap-1">
              <Users className="w-5 h-5" /> Mais Clientes
            </span>
            <span className="mx-2">•</span>
            <span className="inline-flex items-center gap-1">
              <Rocket className="w-5 h-5" /> Mais Resultados
            </span>
            <br className="md:hidden" />
            <span className="text-yellow-400 font-semibold"> No automático!</span>
          </p>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 inline-block">
            <p className="text-white text-lg md:text-xl font-medium">
              ✅ Resultados comprovados em até <span className="text-yellow-400 font-bold">7 horas</span> de uso!
            </p>
          </div>
        </div>
      </section>

      {/* Strategy Highlight - MUITO DESTACADO */}
      <section className="px-4 mb-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-purple-600/40 to-indigo-600/40 border-2 border-purple-400 rounded-2xl p-6 text-center">
            <div className="inline-flex items-center gap-2 bg-yellow-400 text-black px-4 py-2 rounded-full font-bold text-sm mb-4">
              <Sparkles className="w-4 h-4" />
              EXCLUSIVO
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              TESTE 1 DAS NOSSAS <span className="text-yellow-400">20+ ESTRATÉGIAS!</span>
            </h2>
            <p className="text-white/90">
              Este teste libera apenas <strong className="text-yellow-400">1 das nossas 20 estratégias</strong>! 
              Para ter acesso ao plano completo, você precisará adquirir. 
              <strong className="text-green-400"> Aproveite o teste e garanta o valor promocional após!</strong>
            </p>
          </div>
        </div>
      </section>

      {/* 24h Warning - MUITO DESTACADO */}
      <section className="px-4 mb-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-red-600/30 to-orange-600/30 border-2 border-red-400 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="bg-red-500 rounded-full p-3 flex-shrink-0 animate-pulse">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400 mb-2">⚠️ ATENÇÃO: Teste de 24 horas!</p>
                <p className="text-white text-lg mb-3">
                  Você tem apenas <strong className="text-yellow-400 text-xl">24 HORAS</strong> para testar o sistema. 
                  Após esse período, <strong className="text-red-400">NÃO conseguirá testar novamente</strong> com este Instagram.
                </p>
                <p className="text-yellow-400 font-bold text-xl">🔥 VALORIZE SEU TESTE!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tutorial Videos Warning */}
      <section className="px-4 mb-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-blue-600/20 border-2 border-blue-400 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-500 rounded-full p-3 flex-shrink-0">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-blue-400 mb-2">📺 Assista os Vídeos Tutoriais!</p>
                <p className="text-white/90 mb-3">
                  Após liberar seu teste, assista os vídeos tutoriais para aprender a <strong className="text-blue-400">instalar</strong> e <strong className="text-blue-400">utilizar</strong> a ferramenta corretamente.
                </p>
                <div className="bg-red-500/30 border border-red-400 rounded-lg p-4 mt-3">
                  <p className="text-red-400 font-bold mb-2">🚫 NÃO TEMOS SUPORTE PARA TESTES GRÁTIS!</p>
                  <p className="text-white/80 text-sm">
                    Para ter acesso ao suporte, você precisará adquirir um de nossos planos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Support Types */}
      <section className="px-4 mb-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-400 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-green-400 text-center mb-6">
              💡 Está com dificuldade? Conheça nossos Suportes Premium!
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/10 rounded-xl p-5 border border-white/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-orange-500 rounded-lg p-2">
                    <ExternalLink className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-orange-400">Suporte AnyDesk</h4>
                </div>
                <p className="text-white/80 text-sm mb-3">
                  <strong className="text-white">Acesso Remoto ao seu computador</strong> - Nosso especialista acessa seu PC e configura tudo pra você, em tempo real!
                </p>
                <ul className="text-white/70 text-sm space-y-1">
                  <li>✅ Instalação completa</li>
                  <li>✅ Configuração personalizada</li>
                  <li>✅ Resolução imediata de problemas</li>
                </ul>
              </div>

              <div className="bg-white/10 rounded-xl p-5 border border-white/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-green-500 rounded-lg p-2">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-green-400">Suporte WhatsApp</h4>
                </div>
                <p className="text-white/80 text-sm mb-3">
                  <strong className="text-white">Atendimento via WhatsApp</strong> - Tire dúvidas, receba orientações e soluções por mensagens ou áudios!
                </p>
                <ul className="text-white/70 text-sm space-y-1">
                  <li>✅ Resposta rápida</li>
                  <li>✅ Orientações passo a passo</li>
                  <li>✅ Envio de prints e vídeos</li>
                </ul>
              </div>
            </div>
            <p className="text-center text-yellow-400 font-semibold mt-4 text-sm">
              👆 Ambos os suportes estão inclusos nos nossos planos pagos!
            </p>
          </div>
        </div>
      </section>

      {/* CTA Button - LIBERAR TESTE */}
      <section className="px-4 py-8">
        <div className="max-w-lg mx-auto text-center">
          {!showForm ? (
            <Button 
              onClick={() => setShowForm(true)}
              size="lg"
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xl px-12 py-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300 animate-pulse"
            >
              <Rocket className="w-6 h-6 mr-2" />
              Liberar Teste Grátis de 24h
              <ArrowRight className="w-6 h-6 ml-2" />
            </Button>
          ) : (
            <Card className="bg-white/95 backdrop-blur border-0 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Cadastre-se para testar</h2>
                  <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="fullName" className="flex items-center gap-2 text-gray-700">
                      <User className="w-4 h-4" /> Nome Completo
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome completo"
                      className="mt-1"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email" className="flex items-center gap-2 text-gray-700">
                      <Mail className="w-4 h-4" /> E-mail
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="mt-1"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="whatsapp" className="flex items-center gap-2 text-gray-700">
                      <Phone className="w-4 h-4" /> WhatsApp
                    </Label>
                    <Input
                      id="whatsapp"
                      value={whatsapp}
                      onChange={handleWhatsappChange}
                      placeholder="(00) 00000-0000"
                      className="mt-1"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="instagram" className="flex items-center gap-2 text-gray-700">
                      <Instagram className="w-4 h-4" /> Instagram (sem @)
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                      <Input
                        id="instagram"
                        value={instagramUsername}
                        onChange={(e) => setInstagramUsername(e.target.value.replace('@', ''))}
                        placeholder="seuinstagram"
                        className="pl-8"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-6 text-lg font-bold"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        Liberar Meu Teste Grátis
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    ⚠️ Você só pode testar uma vez por Instagram
                  </p>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Value Proposition */}
      <section className="px-4 py-12 bg-black/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
            Nossa Proposta
          </h2>
          <p className="text-lg md:text-xl text-purple-200 leading-relaxed">
            Ajudar você a <span className="text-yellow-400 font-bold">vender mais</span>: aumentar o engajamento, 
            atrair mais clientes e ampliar seu público de forma automática, com nosso método e nossa 
            ferramenta para o Instagram.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
            O que você vai receber <span className="text-yellow-400">✅🚀</span>
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur border-purple-500/30 hover:bg-white/15 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{feature.title}</h3>
                      <p className="text-purple-300 text-sm">{feature.description}</p>
                    </div>
                  </div>
                  
                  <ul className="space-y-2">
                    {feature.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-purple-200">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Automation Features */}
      <section className="px-4 py-12 bg-black/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">
            Automações Incluídas
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: Heart, text: 'Curtir fotos' },
              { icon: UserPlus, text: 'Seguir perfis' },
              { icon: Eye, text: 'Ver Stories' },
              { icon: Heart, text: 'Reagir Stories' },
              { icon: Trash2, text: 'Remover fakes' },
              { icon: Users, text: '200 interações/dia' }
            ].map((item, index) => (
              <div 
                key={index}
                className="bg-white/10 backdrop-blur rounded-xl p-4 flex flex-col items-center text-center gap-2 hover:bg-white/15 transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-white text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Pronto para testar gratuitamente?
            </h2>
            <p className="text-gray-800 mb-6">
              Você tem 24 horas para experimentar a ferramenta!
            </p>
            
            {!showForm && (
              <Button 
                onClick={() => setShowForm(true)}
                size="lg"
                className="bg-gray-900 hover:bg-gray-800 text-white text-lg px-8 py-6 rounded-xl"
              >
                <Rocket className="w-5 h-5 mr-2" />
                Liberar Meu Teste Agora
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 bg-black/30">
        <div className="max-w-4xl mx-auto text-center">
          <img src={logoMro} alt="MRO" className="h-10 mx-auto mb-4 opacity-70" />
          <p className="text-purple-300 text-sm">
            © {new Date().getFullYear()} MRO - Mais Resultados Online. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default TesteGratis;
