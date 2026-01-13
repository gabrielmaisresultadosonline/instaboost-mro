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
  ArrowRight,
  Lock
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

  if (loadingSettings) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />
      </div>
    );
  }

  if (!settings?.is_active) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-zinc-900 border-zinc-800">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Teste Indisponível</h2>
            <p className="text-gray-400">O teste grátis está temporariamente desabilitado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success screen - after registration
  if (accessData) {
    return (
      <div className="min-h-screen bg-black py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <img src={logoMro} alt="MRO" className="h-14 mx-auto mb-4" />
            <div className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-full text-lg font-bold">
              <CheckCircle2 className="w-6 h-6" />
              Teste Liberado com Sucesso!
            </div>
          </div>

          <Card className="bg-zinc-900 border-zinc-800 mb-6">
            <CardContent className="p-6 space-y-6">
              {/* Expiration Warning */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-5 rounded-xl border-2 border-red-400">
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
              <div className="bg-zinc-800 p-6 rounded-xl space-y-4 border border-yellow-500/30">
                <h3 className="font-bold text-lg text-yellow-400 flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  Seus Dados de Acesso
                </h3>
                
                <div className="grid gap-3">
                  <div className="bg-zinc-900 p-4 rounded-lg flex items-center justify-between border border-zinc-700">
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Usuário:</span>
                      <span className="font-mono font-bold text-lg text-white">{accessData.username}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="text-yellow-400 hover:text-yellow-300" onClick={() => copyToClipboard(accessData.username, 'Usuário')}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="bg-zinc-900 p-4 rounded-lg flex items-center justify-between border border-zinc-700">
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Senha:</span>
                      <span className="font-mono font-bold text-lg text-white">{accessData.password}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="text-yellow-400 hover:text-yellow-300" onClick={() => copyToClipboard(accessData.password, 'Senha')}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tutorial Videos Warning */}
              <div className="bg-zinc-800 border-2 border-yellow-500 p-5 rounded-xl">
                <div className="flex items-start gap-3">
                  <Play className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-yellow-400 text-lg mb-2">📺 Assista os Vídeos Tutoriais!</p>
                    <p className="text-gray-300 mb-3">
                      Para instalar e utilizar a ferramenta corretamente, assista os vídeos abaixo:
                    </p>
                    
                    {/* Videos Grid */}
                    <div className="grid md:grid-cols-3 gap-3 mb-4">
                      {settings?.welcome_video_url && (
                        <a href={settings.welcome_video_url} target="_blank" rel="noopener noreferrer"
                          className="bg-zinc-900 p-3 rounded-lg flex items-center gap-2 hover:bg-zinc-700 transition-colors border border-zinc-700">
                          <div className="bg-yellow-400 rounded-full p-1">
                            <Play className="w-4 h-4 text-black" />
                          </div>
                          <span className="font-medium text-sm text-white">Bem-vindo</span>
                        </a>
                      )}
                      {settings?.installation_video_url && (
                        <a href={settings.installation_video_url} target="_blank" rel="noopener noreferrer"
                          className="bg-zinc-900 p-3 rounded-lg flex items-center gap-2 hover:bg-zinc-700 transition-colors border border-zinc-700">
                          <div className="bg-yellow-400 rounded-full p-1">
                            <Download className="w-4 h-4 text-black" />
                          </div>
                          <span className="font-medium text-sm text-white">Instalação</span>
                        </a>
                      )}
                      {settings?.usage_video_url && (
                        <a href={settings.usage_video_url} target="_blank" rel="noopener noreferrer"
                          className="bg-zinc-900 p-3 rounded-lg flex items-center gap-2 hover:bg-zinc-700 transition-colors border border-zinc-700">
                          <div className="bg-yellow-400 rounded-full p-1">
                            <Zap className="w-4 h-4 text-black" />
                          </div>
                          <span className="font-medium text-sm text-white">Como Usar</span>
                        </a>
                      )}
                    </div>

                    {/* No Support Warning */}
                    <div className="bg-red-900/50 border-2 border-red-500 p-3 rounded-lg">
                      <p className="text-red-400 font-bold text-sm">🚫 NÃO TEMOS SUPORTE PARA TESTES GRÁTIS!</p>
                      <p className="text-red-300 text-xs mt-1">Para ter suporte, adquira um de nossos planos.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid gap-3">
                {settings?.download_link && (
                  <a href={settings.download_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-yellow-400 text-black py-4 px-6 rounded-xl font-bold text-lg hover:bg-yellow-300 transition-colors">
                    <Download className="w-5 h-5" />
                    Download do Sistema
                  </a>
                )}
                {settings?.group_link && (
                  <a href={settings.group_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-green-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:bg-green-500 transition-colors">
                    <MessageCircle className="w-5 h-5" />
                    Entrar no Grupo VIP
                  </a>
                )}
              </div>

              {/* Support Types */}
              <div className="bg-zinc-800 border border-zinc-700 p-5 rounded-xl">
                <h3 className="font-bold text-yellow-400 text-center mb-4">
                  💡 Está com dificuldade? Conheça nossos Suportes Premium!
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-700">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-orange-500 rounded-lg p-1.5">
                        <ExternalLink className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="font-bold text-orange-400">Suporte AnyDesk</h4>
                    </div>
                    <p className="text-gray-400 text-sm">
                      <strong className="text-white">Acesso remoto</strong> - Configuramos tudo no seu PC em tempo real!
                    </p>
                  </div>
                  <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-700">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-green-500 rounded-lg p-1.5">
                        <Phone className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="font-bold text-green-400">Suporte WhatsApp</h4>
                    </div>
                    <p className="text-gray-400 text-sm">
                      <strong className="text-white">Atendimento direto</strong> - Tire dúvidas por mensagens ou áudios!
                    </p>
                  </div>
                </div>
                <p className="text-center text-yellow-400 font-semibold mt-3 text-sm">
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
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-lg w-full bg-zinc-900 border-zinc-800">
          <CardContent className="p-8 text-center">
            <img src={logoMro} alt="MRO" className="h-12 mx-auto mb-6" />
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Você já testou!</h2>
            <p className="text-gray-400 mb-6">
              Este Instagram já foi utilizado para teste em {formatExpirationDate(existingTrial.tested_at)}.
            </p>
            <a 
              href="https://maisresultadosonline.com.br/instagram-nova"
              className="inline-flex items-center gap-2 bg-yellow-400 text-black font-bold px-8 py-4 rounded-xl hover:bg-yellow-300 transition-colors"
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
    <div className="min-h-screen bg-black">
      {/* Header with Logo */}
      <header className="py-6 px-4 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto flex justify-center">
          <img src={logoMro} alt="MRO" className="h-12 md:h-16" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 py-8 md:py-12 bg-gradient-to-b from-zinc-900 to-black">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            Não gaste com anúncios,<br />
            <span className="text-yellow-400">
              utilize a MRO!
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 mb-8">
            <span className="inline-flex items-center gap-1 text-white">
              <TrendingUp className="w-5 h-5 text-yellow-400" /> Mais Engajamento
            </span>
            <span className="mx-2 text-zinc-600">•</span>
            <span className="inline-flex items-center gap-1 text-white">
              <Users className="w-5 h-5 text-yellow-400" /> Mais Clientes
            </span>
            <span className="mx-2 text-zinc-600">•</span>
            <span className="inline-flex items-center gap-1 text-white">
              <Rocket className="w-5 h-5 text-yellow-400" /> Mais Resultados
            </span>
            <br className="md:hidden" />
            <span className="text-yellow-400 font-semibold"> No automático!</span>
          </p>

          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 mb-8 inline-block">
            <p className="text-white text-lg md:text-xl font-medium">
              ✅ Resultados comprovados em até <span className="text-yellow-400 font-bold">7 horas</span> de uso!
            </p>
          </div>
        </div>
      </section>

      {/* 24h Warning - MUITO DESTACADO */}
      <section className="px-4 mb-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-950 border-4 border-red-500 rounded-2xl p-6 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <div className="flex items-start gap-4">
              <div className="bg-red-600 rounded-full p-3 flex-shrink-0 animate-pulse">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-red-400 mb-2">⚠️ ATENÇÃO: Teste de 24 horas!</p>
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

      {/* Strategy Highlight - MUITO DESTACADO */}
      <section className="px-4 mb-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-zinc-900 border-2 border-yellow-500 rounded-2xl p-6 text-center">
            <div className="inline-flex items-center gap-2 bg-yellow-400 text-black px-4 py-2 rounded-full font-bold text-sm mb-4">
              <Sparkles className="w-4 h-4" />
              EXCLUSIVO
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              TESTE 1 DAS NOSSAS <span className="text-yellow-400">20+ ESTRATÉGIAS!</span>
            </h2>
            <p className="text-gray-400">
              Este teste libera apenas <strong className="text-yellow-400">1 das nossas 20 estratégias</strong>! 
              Para ter acesso ao plano completo, você precisará adquirir. 
              <strong className="text-green-400"> Aproveite o teste e garanta o valor promocional após!</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Tutorial Videos Warning */}
      <section className="px-4 mb-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-zinc-900 border-2 border-yellow-500/50 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="bg-yellow-400 rounded-full p-3 flex-shrink-0">
                <Play className="w-6 h-6 text-black" />
              </div>
              <div>
                <p className="text-xl font-bold text-yellow-400 mb-2">📺 Assista os Vídeos Tutoriais!</p>
                <p className="text-gray-400 mb-3">
                  Após liberar seu teste, assista os vídeos tutoriais para aprender a <strong className="text-white">instalar</strong> e <strong className="text-white">utilizar</strong> a ferramenta corretamente.
                </p>
                <div className="bg-red-950 border-2 border-red-500 rounded-lg p-4 mt-3">
                  <p className="text-red-400 font-bold mb-2">🚫 NÃO TEMOS SUPORTE PARA TESTES GRÁTIS!</p>
                  <p className="text-gray-400 text-sm">
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
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-yellow-400 text-center mb-6">
              💡 Está com dificuldade? Conheça nossos Suportes Premium!
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-zinc-800 rounded-xl p-5 border border-zinc-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-orange-500 rounded-lg p-2">
                    <ExternalLink className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-orange-400">Suporte AnyDesk</h4>
                </div>
                <p className="text-gray-400 text-sm mb-3">
                  <strong className="text-white">Acesso Remoto ao seu computador</strong> - Nosso especialista acessa seu PC e configura tudo pra você, em tempo real!
                </p>
                <ul className="text-gray-500 text-sm space-y-1">
                  <li>✅ Instalação completa</li>
                  <li>✅ Configuração personalizada</li>
                  <li>✅ Resolução imediata de problemas</li>
                </ul>
              </div>

              <div className="bg-zinc-800 rounded-xl p-5 border border-zinc-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-green-500 rounded-lg p-2">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-green-400">Suporte WhatsApp</h4>
                </div>
                <p className="text-gray-400 text-sm mb-3">
                  <strong className="text-white">Atendimento via WhatsApp</strong> - Tire dúvidas, receba orientações e soluções por mensagens ou áudios!
                </p>
                <ul className="text-gray-500 text-sm space-y-1">
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
              className="bg-yellow-400 hover:bg-yellow-300 text-black text-xl px-12 py-8 rounded-2xl shadow-[0_0_30px_rgba(250,204,21,0.4)] transform hover:scale-105 transition-all duration-300 font-bold"
            >
              <Rocket className="w-6 h-6 mr-2" />
              Liberar Teste Grátis de 24h
              <ArrowRight className="w-6 h-6 ml-2" />
            </Button>
          ) : (
            <Card className="bg-zinc-900 border-zinc-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Cadastre-se para testar</h2>
                  <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="fullName" className="flex items-center gap-2 text-gray-300">
                      <User className="w-4 h-4" /> Nome Completo
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome completo"
                      className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email" className="flex items-center gap-2 text-gray-300">
                      <Mail className="w-4 h-4" /> E-mail
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="whatsapp" className="flex items-center gap-2 text-gray-300">
                      <Phone className="w-4 h-4" /> WhatsApp
                    </Label>
                    <Input
                      id="whatsapp"
                      value={whatsapp}
                      onChange={handleWhatsappChange}
                      placeholder="(00) 00000-0000"
                      className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="instagram" className="flex items-center gap-2 text-gray-300">
                      <Instagram className="w-4 h-4" /> Instagram (sem @)
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                      <Input
                        id="instagram"
                        value={instagramUsername}
                        onChange={(e) => setInstagramUsername(e.target.value.replace('@', ''))}
                        placeholder="seuinstagram"
                        className="pl-8 bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-yellow-400 hover:bg-yellow-300 text-black py-6 text-lg font-bold"
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
      <section className="px-4 py-12 bg-zinc-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
            Nossa Proposta
          </h2>
          <p className="text-lg md:text-xl text-gray-400 leading-relaxed">
            Ajudar você a <span className="text-yellow-400 font-bold">vender mais</span>: aumentar o engajamento, 
            atrair mais clientes e ampliar seu público de forma automática, com nosso método e nossa 
            ferramenta para o Instagram.
          </p>
        </div>
      </section>

      {/* Features Section - ONLY "Segue perfis estratégicos" highlighted */}
      <section className="px-4 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
            O que você vai receber <span className="text-yellow-400">✅🚀</span>
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* I.A. MRO - SEM COR (bloqueado) */}
            <Card className="bg-zinc-900/50 border-zinc-800 opacity-60">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-500 text-lg">I.A. MRO (NOVA)</h3>
                      <Lock className="w-4 h-4 text-gray-600" />
                    </div>
                    <p className="text-gray-600 text-sm">Personalização completa para o seu nicho</p>
                  </div>
                </div>
                
                <ul className="space-y-2">
                  {['Cria legendas prontas e otimizadas', 'Gera biografias profissionais', 'Indica melhores horários para postar', 'Recomenda hashtags relevantes'].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-600">
                      <Lock className="w-4 h-4 mt-1 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-600 mt-4 text-center">🔒 Disponível no plano completo</p>
              </CardContent>
            </Card>

            {/* Automação Estratégica MRO - COM COR (liberado) */}
            <Card className="bg-zinc-900 border-2 border-yellow-500 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-black" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-yellow-400 text-lg">Automação Estratégica MRO</h3>
                      <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">LIBERADO</span>
                    </div>
                    <p className="text-gray-300 text-sm">Operações diárias para atrair público real</p>
                  </div>
                </div>
                
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-gray-500">
                    <Lock className="w-4 h-4 mt-1 flex-shrink-0" />
                    <span className="text-sm">Curte fotos relevantes</span>
                  </li>
                  <li className="flex items-start gap-2 text-yellow-400 bg-yellow-400/10 p-2 rounded-lg border border-yellow-500">
                    <CheckCircle2 className="w-4 h-4 mt-1 flex-shrink-0 text-green-400" />
                    <span className="text-sm font-bold">Segue perfis estratégicos ✅</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-500">
                    <Lock className="w-4 h-4 mt-1 flex-shrink-0" />
                    <span className="text-sm">Reage aos Stories com ❤️</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-500">
                    <Lock className="w-4 h-4 mt-1 flex-shrink-0" />
                    <span className="text-sm">Interage com até 200 pessoas/dia</span>
                  </li>
                </ul>
                <p className="text-xs text-green-400 mt-4 text-center font-bold">✅ Esta estratégia está liberada no teste!</p>
              </CardContent>
            </Card>

            {/* Área de Membros - SEM COR (bloqueado) */}
            <Card className="bg-zinc-900/50 border-zinc-800 opacity-60">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center">
                    <Video className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-500 text-lg">Área de Membros Vitalícia</h3>
                      <Lock className="w-4 h-4 text-gray-600" />
                    </div>
                    <p className="text-gray-600 text-sm">Acesso completo a conteúdos exclusivos</p>
                  </div>
                </div>
                
                <ul className="space-y-2">
                  {['Vídeos estratégicos passo a passo', 'Como deixar perfil profissional', 'Como agendar postagens', 'Estratégias para bombar do zero'].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-600">
                      <Lock className="w-4 h-4 mt-1 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-600 mt-4 text-center">🔒 Disponível no plano completo</p>
              </CardContent>
            </Card>

            {/* Grupo VIP - SEM COR (bloqueado) */}
            <Card className="bg-zinc-900/50 border-zinc-800 opacity-60">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-500 text-lg">Grupo VIP de Suporte</h3>
                      <Lock className="w-4 h-4 text-gray-600" />
                    </div>
                    <p className="text-gray-600 text-sm">Networking e suporte especializado</p>
                  </div>
                </div>
                
                <ul className="space-y-2">
                  {['Acesso ao grupo VIP exclusivo', 'Tire dúvidas com especialistas', 'Atualizações em primeira mão'].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-600">
                      <Lock className="w-4 h-4 mt-1 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-600 mt-4 text-center">🔒 Disponível no plano completo</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Automation Features */}
      <section className="px-4 py-12 bg-zinc-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">
            Automações Incluídas <span className="text-gray-500 text-lg">(Plano Completo)</span>
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: Heart, text: 'Curtir fotos', locked: true },
              { icon: UserPlus, text: 'Seguir perfis', locked: false },
              { icon: Eye, text: 'Ver Stories', locked: true },
              { icon: Heart, text: 'Reagir Stories', locked: true },
              { icon: Trash2, text: 'Remover fakes', locked: true },
              { icon: Users, text: '200 interações/dia', locked: true }
            ].map((item, index) => (
              <div 
                key={index}
                className={`rounded-xl p-4 flex flex-col items-center text-center gap-2 transition-colors ${
                  item.locked 
                    ? 'bg-zinc-800/50 border border-zinc-700 opacity-50' 
                    : 'bg-yellow-400/10 border-2 border-yellow-500'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  item.locked ? 'bg-zinc-700' : 'bg-yellow-400'
                }`}>
                  <item.icon className={`w-5 h-5 ${item.locked ? 'text-gray-500' : 'text-black'}`} />
                </div>
                <span className={`text-sm font-medium ${item.locked ? 'text-gray-500' : 'text-yellow-400'}`}>
                  {item.text}
                </span>
                {!item.locked && <span className="text-xs text-green-400 font-bold">✅ LIBERADO</span>}
                {item.locked && <Lock className="w-3 h-3 text-gray-600" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-zinc-900 border-2 border-yellow-500 rounded-2xl p-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Pronto para testar gratuitamente?
            </h2>
            <p className="text-gray-400 mb-6">
              Você tem 24 horas para experimentar a ferramenta!
            </p>
            
            {!showForm && (
              <Button 
                onClick={() => setShowForm(true)}
                size="lg"
                className="bg-yellow-400 hover:bg-yellow-300 text-black text-lg px-8 py-6 rounded-xl font-bold"
              >
                <Rocket className="w-5 h-5 mr-2" />
                Liberar Meu Teste Agora
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 bg-zinc-900 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto text-center">
          <img src={logoMro} alt="MRO" className="h-10 mx-auto mb-4 opacity-70" />
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} MRO - Mais Resultados Online. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default TesteGratis;
