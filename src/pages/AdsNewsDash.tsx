import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User, 
  Save, 
  LogOut, 
  Loader2,
  Instagram,
  MessageCircle,
  Send,
  Upload,
  MapPin,
  Briefcase,
  Calculator,
  CreditCard,
  CheckCircle,
  Clock,
  ExternalLink,
  Lock,
  ArrowRight,
  Image,
  X,
  Users
} from "lucide-react";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  subscription_start: string;
  subscription_end: string;
}

interface ClientData {
  id?: string;
  niche: string;
  region: string;
  instagram: string;
  whatsapp: string;
  telegram_group: string;
  logo_url: string;
  observations: string;
  sales_page_url?: string;
  competitor1_instagram?: string;
  competitor2_instagram?: string;
  media_urls?: string[];
  offer_description?: string;
}

interface BalanceOrder {
  id: string;
  amount: number;
  leads_quantity: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

interface PendingPayment {
  email: string;
  password: string;
  paymentLink: string;
  nsuOrder: string;
}

const AdsNewsDash = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [clientData, setClientData] = useState<ClientData>({
    niche: "",
    region: "",
    instagram: "",
    whatsapp: "",
    telegram_group: "",
    logo_url: "",
    observations: "",
    competitor1_instagram: "",
    competitor2_instagram: "",
    media_urls: [],
    offer_description: ""
  });
  const [balanceOrders, setBalanceOrders] = useState<BalanceOrder[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  
  // Payment overlay state
  const [showPaymentOverlay, setShowPaymentOverlay] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(600);
  
  // Balance calculator
  const [leadsQuantity, setLeadsQuantity] = useState(50);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balancePaymentLink, setBalancePaymentLink] = useState("");

  // Calculate cost based on leads (R$3.80 - R$4.70 per lead, using R$4 average)
  const costPerLead = 4;
  const calculatedAmount = Math.max(150, leadsQuantity * costPerLead);

  useEffect(() => {
    // Check if coming from registration with pending payment
    const isPending = searchParams.get('pending') === 'true';
    const email = searchParams.get('email');
    const password = searchParams.get('password');
    
    // Check for pending payment data in localStorage
    const storedPending = localStorage.getItem('ads_pending_payment');
    
    if (isPending && storedPending) {
      const pendingData: PendingPayment = JSON.parse(storedPending);
      setPendingPayment(pendingData);
      setShowPaymentOverlay(true);
      startPaymentCheck(pendingData.email, pendingData.nsuOrder, pendingData.password);
      // Still load user data in background - allow pending users
      if (email && password) {
        loadUserData(email, password, true, true);
      }
    } else if (email && password) {
      handleLogin(email, password);
    } else {
      // Check if user is stored in localStorage
      const storedUser = localStorage.getItem('ads_user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        loadUserData(userData.email, userData.password);
      } else {
        setShowLogin(true);
        setLoading(false);
      }
    }
  }, [searchParams]);

  const startPaymentCheck = (email: string, orderNsu: string, password: string) => {
    setCheckingPayment(true);
    setTimeRemaining(600);
    
    const startTime = Date.now();
    const maxDuration = 10 * 60 * 1000; // 10 minutes
    
    // Countdown timer
    const countdownInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((maxDuration - elapsed) / 1000));
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);
    
    // Payment check every 4 seconds
    const checkInterval = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke('ads-check-payment', {
          body: { order_nsu: orderNsu, email }
        });

        if (data?.paid) {
          clearInterval(checkInterval);
          clearInterval(countdownInterval);
          setCheckingPayment(false);
          setShowPaymentOverlay(false);
          localStorage.removeItem('ads_pending_payment');
          localStorage.setItem('ads_user', JSON.stringify({ email, password }));
          toast({
            title: "Pagamento confirmado!",
            description: "Acesso liberado! Preencha seus dados."
          });
          // Reload user data
          loadUserData(email, password);
        }
      } catch (error) {
        console.error('Check payment error:', error);
      }
    }, 4000);

    // Stop checking after 10 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
      clearInterval(countdownInterval);
      setCheckingPayment(false);
    }, maxDuration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const loadUserData = async (email: string, password: string, skipOverlayCheck = false, allowPending = false) => {
    try {
      const { data, error } = await supabase.functions.invoke('ads-auth', {
        body: { action: 'login', email, password, allowPending }
      });

      if (error) throw error;

      if (data.success) {
        setUser(data.user);
        if (data.clientData) {
          setClientData({
            niche: data.clientData.niche || "",
            region: data.clientData.region || "",
            instagram: data.clientData.instagram || "",
            whatsapp: data.clientData.whatsapp || "",
            telegram_group: data.clientData.telegram_group || "",
            logo_url: data.clientData.logo_url || "",
            observations: data.clientData.observations || "",
            sales_page_url: data.clientData.sales_page_url || "",
            competitor1_instagram: data.clientData.competitor1_instagram || "",
            competitor2_instagram: data.clientData.competitor2_instagram || "",
            media_urls: data.clientData.media_urls || [],
            offer_description: data.clientData.offer_description || ""
          });
        }
        setBalanceOrders(data.balanceOrders || []);
        
        // Check if user is pending and needs to pay
        if (!skipOverlayCheck && data.user.status === 'pending') {
          // Check for stored pending payment
          const storedPending = localStorage.getItem('ads_pending_payment');
          if (storedPending) {
            const pendingData: PendingPayment = JSON.parse(storedPending);
            setPendingPayment(pendingData);
            setShowPaymentOverlay(true);
            startPaymentCheck(email, pendingData.nsuOrder, password);
          }
        } else {
          // Clear any stored pending payment data if user is active
          localStorage.removeItem('ads_pending_payment');
        }
        
        localStorage.setItem('ads_user', JSON.stringify({ email, password }));
        setShowLogin(false);
      } else {
        throw new Error(data.error);
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao fazer login",
        variant: "destructive"
      });
      setShowLogin(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email?: string, password?: string) => {
    const emailToUse = email || loginData.email;
    const passwordToUse = password || loginData.password;
    
    if (!emailToUse || !passwordToUse) {
      toast({
        title: "Erro",
        description: "Preencha email e senha",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    await loadUserData(emailToUse, passwordToUse);
  };

  const handleLogout = () => {
    localStorage.removeItem('ads_user');
    setUser(null);
    setShowLogin(true);
  };

  const handleSaveData = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('ads-auth', {
        body: {
          action: 'save-client-data',
          userId: user.id,
          niche: clientData.niche,
          region: clientData.region,
          instagram: clientData.instagram,
          whatsapp: clientData.whatsapp,
          telegramGroup: clientData.telegram_group,
          logoUrl: clientData.logo_url,
          observations: clientData.observations,
          competitor1Instagram: clientData.competitor1_instagram,
          competitor2Instagram: clientData.competitor2_instagram,
          mediaUrls: clientData.media_urls,
          offerDescription: clientData.offer_description
        }
      });

      if (error) throw error;

      toast({
        title: "Dados salvos!",
        description: "Suas informações foram salvas com sucesso"
      });
    } catch (error: unknown) {
      console.error('Save error:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar dados",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Erro",
        description: "Apenas arquivos PNG, JPG ou PDF são permitidos",
        variant: "destructive"
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-logo.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-data')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('user-data')
        .getPublicUrl(filePath);

      setClientData({ ...clientData, logo_url: urlData.publicUrl });
      toast({
        title: "Logo enviada!",
        description: "Sua logomarca foi enviada com sucesso"
      });
    } catch (error: unknown) {
      console.error('Upload error:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao enviar logo",
        variant: "destructive"
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    const currentMediaCount = clientData.media_urls?.length || 0;
    const maxFiles = 10;
    const remainingSlots = maxFiles - currentMediaCount;

    if (files.length > remainingSlots) {
      toast({
        title: "Limite excedido",
        description: `Você pode enviar no máximo ${remainingSlots} arquivo(s) (máximo total: ${maxFiles})`,
        variant: "destructive"
      });
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm'];
    const maxSize = 90 * 1024 * 1024; // 90MB

    for (const file of Array.from(files)) {
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Tipo não permitido",
          description: `${file.name}: Apenas imagens (PNG, JPG, GIF, WebP) e vídeos (MP4, MOV, WebM) são permitidos`,
          variant: "destructive"
        });
        return;
      }
      if (file.size > maxSize) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name}: Tamanho máximo é 90MB`,
          variant: "destructive"
        });
        return;
      }
    }

    setUploadingMedia(true);
    const newUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const fileName = `${user.id}-media-${timestamp}.${fileExt}`;
        const filePath = `ads-media/${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(filePath, file, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('assets')
          .getPublicUrl(filePath);

        newUrls.push(urlData.publicUrl);
      }

      setClientData({ 
        ...clientData, 
        media_urls: [...(clientData.media_urls || []), ...newUrls] 
      });
      
      toast({
        title: "Mídia(s) enviada(s)!",
        description: `${newUrls.length} arquivo(s) enviado(s) com sucesso`
      });
    } catch (error: unknown) {
      console.error('Media upload error:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao enviar mídia",
        variant: "destructive"
      });
    } finally {
      setUploadingMedia(false);
      // Reset the input
      e.target.value = '';
    }
  };

  const handleRemoveMedia = (urlToRemove: string) => {
    setClientData({
      ...clientData,
      media_urls: (clientData.media_urls || []).filter(url => url !== urlToRemove)
    });
  };

  const handleAddBalance = async () => {
    if (!user || leadsQuantity < 1) return;

    setBalanceLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ads-balance-checkout', {
        body: {
          userId: user.id,
          email: user.email,
          amount: calculatedAmount,
          leadsQuantity
        }
      });

      if (error) throw error;

      if (data.success && data.paymentLink) {
        setBalancePaymentLink(data.paymentLink);
        toast({
          title: "Link de pagamento gerado!",
          description: "Clique para adicionar saldo"
        });
      }
    } catch (error: unknown) {
      console.error('Balance checkout error:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao gerar pagamento",
        variant: "destructive"
      });
    } finally {
      setBalanceLoading(false);
    }
  };

  const hasPaidBalance = balanceOrders.some(order => order.status === 'paid');
  const hasDataFilled = clientData.niche && clientData.whatsapp;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src="/ads-news-full.png" alt="Ads News" className="h-12 mx-auto mb-4" />
            <CardTitle>Acesse sua conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <Label>Senha</Label>
              <Input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                placeholder="Sua senha"
              />
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => handleLogin()}
            >
              Entrar
            </Button>
            <p className="text-center text-sm text-gray-500">
              Não tem conta? <a href="/anuncios" className="text-blue-600 hover:underline">Cadastre-se aqui</a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Payment Overlay - Blocking until payment confirmed */}
      {showPaymentOverlay && pendingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Blurred background */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          {/* Payment card */}
          <Card className="relative z-10 w-full max-w-md bg-white shadow-2xl">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <Lock className="h-10 w-10 text-orange-600" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Monte sua campanha!
                </h3>
                <p className="text-gray-600">
                  Para liberar o acesso à sua dashboard e montar sua campanha com seus dados, faça o pagamento de:
                </p>
              </div>
              
              <div className="text-4xl font-bold text-orange-600">
                R$ 397
              </div>
              
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white text-lg py-6"
                onClick={() => window.open(pendingPayment.paymentLink, '_blank')}
              >
                Pagar Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              {checkingPayment && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="font-medium">Verificando pagamento...</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Tempo restante: <span className="font-mono font-medium">{formatTime(timeRemaining)}</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Ao identificar o pagamento, sua dashboard será liberada automaticamente
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src="/ads-news-full.png" alt="Ads News" className="h-10" />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              {user?.name}
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome Card */}
        <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold mb-2">Bem-vindo, {user?.name}!</h1>
            <p className="text-blue-100">
              Preencha seus dados abaixo para começarmos a criar seus anúncios
            </p>
            {user?.subscription_end && (
              <p className="text-sm text-blue-200 mt-2">
                Assinatura válida até: {new Date(user.subscription_end).toLocaleDateString('pt-BR')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Client Data Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Dados do seu negócio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Nicho de atuação *
                </Label>
                <Input
                  value={clientData.niche}
                  onChange={(e) => setClientData({ ...clientData, niche: e.target.value })}
                  placeholder="Ex: Restaurante, Loja de roupas, Imobiliária..."
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Região de atuação
                </Label>
                <Input
                  value={clientData.region}
                  onChange={(e) => setClientData({ ...clientData, region: e.target.value })}
                  placeholder="Ex: São Paulo - SP ou Brasil todo"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </Label>
                <Input
                  value={clientData.instagram}
                  onChange={(e) => setClientData({ ...clientData, instagram: e.target.value })}
                  placeholder="@seuinstagram"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp para os leads *
                </Label>
                <Input
                  value={clientData.whatsapp}
                  onChange={(e) => setClientData({ ...clientData, whatsapp: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Link do grupo Telegram (opcional)
                </Label>
                <Input
                  value={clientData.telegram_group}
                  onChange={(e) => setClientData({ ...clientData, telegram_group: e.target.value })}
                  placeholder="https://t.me/seugrupo"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Logomarca (PNG, JPG ou PDF)
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                  />
                  {uploadingLogo && <Loader2 className="h-5 w-5 animate-spin" />}
                </div>
                {clientData.logo_url && (
                  <p className="text-xs text-green-600 mt-1">✓ Logo enviada</p>
                )}
              </div>
            </div>

            {/* Competitors Section */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Concorrentes (para referência)
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Instagram className="h-4 w-4" />
                    Concorrente 1 - Link do Instagram
                  </Label>
                  <Input
                    value={clientData.competitor1_instagram || ""}
                    onChange={(e) => setClientData({ ...clientData, competitor1_instagram: e.target.value })}
                    placeholder="https://instagram.com/concorrente1"
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <Instagram className="h-4 w-4" />
                    Concorrente 2 - Link do Instagram
                  </Label>
                  <Input
                    value={clientData.competitor2_instagram || ""}
                    onChange={(e) => setClientData({ ...clientData, competitor2_instagram: e.target.value })}
                    placeholder="https://instagram.com/concorrente2"
                  />
                </div>
              </div>
            </div>

            {/* Media Upload Section */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Image className="h-4 w-4" />
                Mídias da sua empresa (até 10 arquivos, máx. 90MB cada)
              </h4>
              <p className="text-sm text-gray-500 mb-3">
                Envie fotos, vídeos ou imagens que já tem da sua empresa para usarmos nas campanhas
              </p>
              
              <div className="space-y-3">
                <div className="flex gap-2 items-center">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
                    onChange={handleMediaUpload}
                    disabled={uploadingMedia || (clientData.media_urls?.length || 0) >= 10}
                    multiple
                    className="flex-1"
                  />
                  {uploadingMedia && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
                </div>
                
                <p className="text-xs text-gray-500">
                  {clientData.media_urls?.length || 0}/10 arquivos enviados
                </p>

                {/* Media Preview Grid */}
                {clientData.media_urls && clientData.media_urls.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
                    {clientData.media_urls.map((url, index) => (
                      <div key={index} className="relative group">
                        {url.match(/\.(mp4|mov|webm)$/i) ? (
                          <video 
                            src={url} 
                            className="w-full h-24 object-cover rounded-lg bg-gray-100"
                          />
                        ) : (
                          <img 
                            src={url} 
                            alt={`Mídia ${index + 1}`} 
                            className="w-full h-24 object-cover rounded-lg bg-gray-100"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(url)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Offer Description - Highlighted Yellow */}
            <div className="border-t pt-4 mt-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <Label className="text-yellow-800 font-medium text-base">
                  ✨ Descreva com suas palavras o que você está oferecendo nesse anúncio
                </Label>
                <p className="text-sm text-yellow-700 mb-3">
                  Explique de forma clara e atrativa o que seu cliente vai receber
                </p>
                <Textarea
                  value={clientData.offer_description || ""}
                  onChange={(e) => setClientData({ ...clientData, offer_description: e.target.value })}
                  placeholder="Ex: Curso completo de confeitaria com 50 receitas exclusivas, acesso vitalício e certificado incluso..."
                  rows={4}
                  className="bg-yellow-50 border-yellow-300 focus:border-yellow-400 focus:ring-yellow-400"
                />
              </div>
            </div>

            <div>
              <Label>Observações (informações adicionais sobre o negócio)</Label>
              <Textarea
                value={clientData.observations}
                onChange={(e) => setClientData({ ...clientData, observations: e.target.value })}
                placeholder="Descreva seu negócio, produtos, diferenciais..."
                rows={4}
              />
            </div>

            <Button 
              onClick={handleSaveData} 
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Dados
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Balance Calculator - Only show after data is filled */}
        {hasDataFilled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Adicionar Saldo para Anúncios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Média por lead:</strong> R$3,80 a R$4,70
                </p>
                <p className="text-sm text-blue-600">
                  Calcule quantas pessoas deseja receber no seu WhatsApp por mês
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Quantidade de leads desejados</Label>
                  <Input
                    type="number"
                    min={38}
                    value={leadsQuantity}
                    onChange={(e) => setLeadsQuantity(Math.max(38, parseInt(e.target.value) || 38))}
                  />
                  <p className="text-xs text-gray-500 mt-1">Mínimo: 38 leads (R$150)</p>
                </div>

                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Valor estimado:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      R$ {calculatedAmount.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Para aproximadamente {leadsQuantity} leads
                  </p>
                </div>

                {!balancePaymentLink ? (
                  <Button 
                    onClick={handleAddBalance}
                    disabled={balanceLoading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {balanceLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando pagamento...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Adicionar Saldo - R$ {calculatedAmount.toFixed(2)}
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Button 
                      onClick={() => window.open(balancePaymentLink, '_blank')}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Pagar Saldo - R$ {calculatedAmount.toFixed(2)}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setBalancePaymentLink("")}
                      className="w-full"
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campaign Status - Show after balance is paid */}
        {hasPaidBalance && (
          <Card className="border-2 border-green-500">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="h-10 w-10 text-green-600 animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Estamos gerando suas campanhas!
              </h3>
              <p className="text-gray-600 mb-4">
                Em breve você verá como ficou sua página de vendas/apresentação abaixo.
                Esta é a página que as pessoas vão acessar diretamente pelos nossos anúncios.
              </p>
              
              {clientData.sales_page_url && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 mb-2">Sua página está pronta!</p>
                  <a 
                    href={clientData.sales_page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 font-medium hover:underline flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver Página de Vendas
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Balance History */}
        {balanceOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Saldo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {balanceOrders.map((order) => (
                  <div 
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">R$ {order.amount.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">{order.leads_quantity} leads</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.status === 'paid' ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle className="h-4 w-4" />
                          Pago
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-600 text-sm">
                          <Clock className="h-4 w-4" />
                          Pendente
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdsNewsDash;
