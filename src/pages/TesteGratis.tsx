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
  ExternalLink
} from 'lucide-react';

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
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagramUsername, setInstagramUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<TrialSettings | null>(null);
  const [accessData, setAccessData] = useState<AccessData | null>(null);
  const [existingTrial, setExistingTrial] = useState<{ tested_at: string } | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Main promotional video (hardcoded for now, can be made configurable)
  const mainVideoUrl = "https://www.youtube.com/embed/YOUR_VIDEO_ID";

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
    
    // Handle various Instagram URL formats
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

    // Remove @ if present
    username = username.replace(/^@/, '');
    
    // Remove any trailing parameters
    username = username.split('?')[0].split('#')[0];

    return username;
  };

  const formatWhatsapp = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (XX) XXXXX-XXXX
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length <= 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
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

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        if (data.alreadyTested) {
          setExistingTrial({ tested_at: data.testedAt });
          toast.error(data.message);
        } else {
          toast.error(data.message || 'Erro ao registrar');
        }
        return;
      }

      // Success!
      setAccessData({
        username: data.username,
        password: data.password,
        expiresAt: data.expiresAt
      });

      toast.success('Teste liberado com sucesso!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao processar registro. Tente novamente.');
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
            <p className="text-white/80">O teste grátis está temporariamente desabilitado. Tente novamente mais tarde.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm py-4 px-4 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <div className="bg-black text-white px-4 py-2 rounded-lg font-bold text-2xl tracking-wider">
            MRO
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Turbine seu Instagram, <span className="text-yellow-400">sem gastar com anúncios!</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90">
            <span className="text-green-400">Mais Engajamento</span> • 
            <span className="text-blue-400"> Mais Clientes</span> • 
            <span className="text-yellow-400"> Mais Resultados</span>
            <span className="text-white/80"> No automático!</span>
          </p>
        </div>

        {/* Main Video */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="aspect-video bg-black/50 rounded-2xl overflow-hidden border-4 border-yellow-400/50">
            <iframe
              src={mainVideoUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        {/* Warning about 24h limit */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-xl p-4 flex items-start gap-3">
            <Clock className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-semibold">⚠️ Atenção: Teste de 24 horas!</p>
              <p className="text-white/80 text-sm">
                Você tem apenas <strong className="text-yellow-400">24 horas</strong> para testar o sistema. 
                Após esse período, não conseguirá testar novamente com este Instagram. 
                <strong className="text-yellow-400"> Valorize seu teste!</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Already tested message */}
        {existingTrial && (
          <div className="max-w-2xl mx-auto mb-8">
            <Card className="bg-red-500/20 border-red-400/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Você já testou!</h3>
                    <p className="text-white/80 mb-4">
                      Este Instagram já foi utilizado para teste em {formatExpirationDate(existingTrial.tested_at)}.
                      Agora você pode adquirir um de nossos planos!
                    </p>
                    <a 
                      href="https://maisresultadosonline.com.br/instagram-nova"
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold px-6 py-3 rounded-lg hover:scale-105 transition-transform"
                    >
                      <Sparkles className="w-5 h-5" />
                      Ver Planos Disponíveis
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Access Granted Section */}
        {accessData && (
          <div className="max-w-3xl mx-auto mb-12">
            <Card className="bg-gradient-to-br from-green-600/30 to-emerald-600/30 border-green-400/50">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-white mb-2">🎉 Teste Liberado!</h2>
                  <p className="text-white/80">
                    Você tem até <strong className="text-yellow-400">{formatExpirationDate(accessData.expiresAt)}</strong> para testar o sistema!
                  </p>
                </div>

                {/* Credentials */}
                <div className="bg-black/30 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 text-center">📋 Seus Dados de Acesso:</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-white/10 rounded-lg p-4">
                      <div>
                        <span className="text-white/60 text-sm block">Usuário:</span>
                        <span className="text-white font-mono text-lg font-bold">{accessData.username}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => copyToClipboard(accessData.username, 'Usuário')}
                        className="text-yellow-400 hover:text-yellow-300"
                      >
                        <Copy className="w-5 h-5" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between bg-white/10 rounded-lg p-4">
                      <div>
                        <span className="text-white/60 text-sm block">Senha:</span>
                        <span className="text-white font-mono text-lg font-bold">{accessData.password}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => copyToClipboard(accessData.password, 'Senha')}
                        className="text-yellow-400 hover:text-yellow-300"
                      >
                        <Copy className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Videos Section */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-white text-center">📺 Vídeos Tutoriais</h3>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Welcome Video */}
                    {settings?.welcome_video_url && (
                      <div className="bg-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded">1º</span>
                          <span className="text-white font-semibold">Bem-vindo</span>
                        </div>
                        <div className="aspect-video bg-black/50 rounded-lg overflow-hidden">
                          <iframe
                            src={settings.welcome_video_url}
                            className="w-full h-full"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    )}

                    {/* Installation Video */}
                    {settings?.installation_video_url && (
                      <div className="bg-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="bg-blue-400 text-black text-xs font-bold px-2 py-1 rounded">2º</span>
                          <span className="text-white font-semibold">Instalação</span>
                        </div>
                        <div className="aspect-video bg-black/50 rounded-lg overflow-hidden">
                          <iframe
                            src={settings.installation_video_url}
                            className="w-full h-full"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    )}

                    {/* Usage Video */}
                    {settings?.usage_video_url && (
                      <div className="bg-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="bg-green-400 text-black text-xs font-bold px-2 py-1 rounded">3º</span>
                          <span className="text-white font-semibold">Utilização</span>
                        </div>
                        <div className="aspect-video bg-black/50 rounded-lg overflow-hidden">
                          <iframe
                            src={settings.usage_video_url}
                            className="w-full h-full"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  {settings?.download_link && (
                    <a 
                      href={settings.download_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold px-6 py-3 rounded-lg hover:scale-105 transition-transform"
                    >
                      <Download className="w-5 h-5" />
                      Download do Sistema
                    </a>
                  )}

                  {settings?.group_link && (
                    <a 
                      href={settings.group_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold px-6 py-3 rounded-lg hover:scale-105 transition-transform"
                    >
                      <Users className="w-5 h-5" />
                      Entrar no Grupo
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Registration Form (only show if not registered and not already tested) */}
        {!accessData && !existingTrial && (
          <div className="max-w-lg mx-auto">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <Sparkles className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                  <h2 className="text-2xl font-bold text-white">Faça seu cadastro</h2>
                  <p className="text-white/80">para liberar o teste grátis de 24h</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label className="text-white flex items-center gap-2 mb-2">
                      <User className="w-4 h-4" />
                      Nome Completo
                    </Label>
                    <Input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome completo"
                      className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-white flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-white flex items-center gap-2 mb-2">
                      <Phone className="w-4 h-4" />
                      WhatsApp
                    </Label>
                    <Input
                      type="tel"
                      value={whatsapp}
                      onChange={handleWhatsappChange}
                      placeholder="(XX) XXXXX-XXXX"
                      className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-white flex items-center gap-2 mb-2">
                      <Instagram className="w-4 h-4" />
                      Instagram
                    </Label>
                    <Input
                      type="text"
                      value={instagramUsername}
                      onChange={(e) => setInstagramUsername(e.target.value)}
                      placeholder="@seuperfil ou link do perfil"
                      className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                      required
                    />
                    <p className="text-white/60 text-xs mt-1">
                      Pode ser @usuario, link do perfil ou link compartilhado
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold py-6 text-lg hover:scale-105 transition-transform"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Liberar Meu Teste Grátis!
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-white/60 text-sm">
          <p>© {new Date().getFullYear()} MRO - Mais Resultados Online</p>
          <p className="mt-1">Todos os direitos reservados</p>
        </div>
      </div>
    </div>
  );
};

export default TesteGratis;
