import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Sparkles, Zap, Shield, Clock, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type Language = 'pt' | 'en';

const translations = {
  pt: {
    extensionWithAI: 'Extensão com IA',
    title1: 'Corrija Todos os Seus Textos',
    title2: 'Automaticamente com IA',
    description: 'Escreva sem erros em qualquer lugar da internet. Nossa extensão usa inteligência artificial para corrigir gramática, ortografia e melhorar seus textos instantaneamente.',
    from: 'De R$ 49,90/mês',
    month: '/mês',
    access30days: '⚡ Acesso por 30 dias',
    offerExpires: 'Oferta expira em:',
    startNow: 'Comece Agora',
    fullName: 'Seu nome completo',
    email: 'Seu melhor e-mail',
    phone: 'Celular com DDD (ex: 11999999999)',
    cta: 'QUERO CORRIGIR MEUS TEXTOS →',
    processing: 'Processando...',
    benefits: [
      'Acesso imediato após pagamento',
      'Suporte via WhatsApp',
      'Garantia de 7 dias'
    ],
    features: [
      { text: 'Correção instantânea de textos' },
      { text: 'IA avançada MRO Corretor' },
      { text: 'Funciona em qualquer site' },
      { text: 'Economia de tempo' },
    ],
    howItWorks: 'Como Funciona',
    steps: [
      { step: '1', title: 'Instale a Extensão', desc: 'Baixe e instale nossa extensão no seu navegador' },
      { step: '2', title: 'Faça Login', desc: 'Use o e-mail cadastrado para acessar' },
      { step: '3', title: 'Corrija Textos', desc: 'Selecione qualquer texto e corrija com 1 clique' },
    ],
    linkGenerated: '🎉 Link Gerado!',
    emailLabel: 'E-mail:',
    orderLabel: 'Pedido:',
    payNow: '💳 PAGAR AGORA',
    alreadyPaid: 'JÁ PAGUEI - VERIFICAR',
    verifying: 'Verificando...',
    autoVerification: 'A verificação é automática. Aguarde alguns segundos após o pagamento.',
    footer: '© 2025 Corretor MRO - Todos os direitos reservados',
    validEmail: 'Digite um e-mail válido',
    validName: 'Digite seu nome',
    validPhone: 'Digite seu celular com DDD (mínimo 10 dígitos)',
    linkSuccess: 'Link de pagamento gerado!',
    checkoutError: 'Erro ao criar checkout',
    processError: 'Erro ao processar. Tente novamente.',
    paymentConfirmed: 'Pagamento confirmado! Redirecionando...',
    orderExpired: 'Pedido expirado. Gere um novo link.',
    waitingPayment: 'Aguardando confirmação de pagamento...',
    checkError: 'Erro ao verificar pagamento',
  },
  en: {
    extensionWithAI: 'AI Extension',
    title1: 'Correct All Your Texts',
    title2: 'Automatically with AI',
    description: 'Write without errors anywhere on the internet. Our extension uses artificial intelligence to correct grammar, spelling and improve your texts instantly.',
    from: 'From $9.90/month',
    month: '/month',
    access30days: '⚡ 30-day access',
    offerExpires: 'Offer expires in:',
    startNow: 'Start Now',
    fullName: 'Your full name',
    email: 'Your best email',
    phone: 'Phone with area code (e.g.: 11999999999)',
    cta: 'I WANT TO CORRECT MY TEXTS →',
    processing: 'Processing...',
    benefits: [
      'Immediate access after payment',
      'WhatsApp support',
      '7-day guarantee'
    ],
    features: [
      { text: 'Instant text correction' },
      { text: 'Advanced MRO Corretor AI' },
      { text: 'Works on any website' },
      { text: 'Save time' },
    ],
    howItWorks: 'How It Works',
    steps: [
      { step: '1', title: 'Install Extension', desc: 'Download and install our extension in your browser' },
      { step: '2', title: 'Log In', desc: 'Use your registered email to access' },
      { step: '3', title: 'Correct Texts', desc: 'Select any text and correct with 1 click' },
    ],
    linkGenerated: '🎉 Link Generated!',
    emailLabel: 'Email:',
    orderLabel: 'Order:',
    payNow: '💳 PAY NOW',
    alreadyPaid: 'ALREADY PAID - VERIFY',
    verifying: 'Verifying...',
    autoVerification: 'Verification is automatic. Wait a few seconds after payment.',
    footer: '© 2025 Corretor MRO - All rights reserved',
    validEmail: 'Enter a valid email',
    validName: 'Enter your name',
    validPhone: 'Enter your phone with area code (minimum 10 digits)',
    linkSuccess: 'Payment link generated!',
    checkoutError: 'Error creating checkout',
    processError: 'Error processing. Try again.',
    paymentConfirmed: 'Payment confirmed! Redirecting...',
    orderExpired: 'Order expired. Generate a new link.',
    waitingPayment: 'Waiting for payment confirmation...',
    checkError: 'Error checking payment',
  }
};

const CorretorMRO: React.FC = () => {
  const [language, setLanguage] = useState<Language>('pt');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [promoTimeLeft, setPromoTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  
  // Estado após criar pagamento
  const [paymentCreated, setPaymentCreated] = useState(false);
  const [nsuOrder, setNsuOrder] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [checkingPayment, setCheckingPayment] = useState(false);

  const t = translations[language];

  // Countdown de 7 horas - sempre reinicia quando entra na página
  useEffect(() => {
    const PROMO_DURATION = 7 * 60 * 60 * 1000;
    const promoEndTime = Date.now() + PROMO_DURATION;

    const updateCountdown = () => {
      const currentTime = Date.now();
      const diff = promoEndTime - currentTime;

      if (diff <= 0) {
        setPromoTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setPromoTimeLeft({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Verificação automática de pagamento a cada 5 segundos quando estiver aguardando
  useEffect(() => {
    if (!paymentCreated || !nsuOrder) return;

    const checkPayment = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-corretor-payment', {
          body: { nsu_order: nsuOrder }
        });

        if (error) throw error;

        if (data?.paid) {
          toast.success(t.paymentConfirmed);
          window.location.href = `/corretormro/obrigado?email=${encodeURIComponent(email)}&nsu=${nsuOrder}`;
        }
      } catch (err) {
        console.error('Erro ao verificar pagamento:', err);
      }
    };

    const interval = setInterval(checkPayment, 5000);
    return () => clearInterval(interval);
  }, [paymentCreated, nsuOrder, email, t.paymentConfirmed]);

  const formatPhone = (value: string) => {
    // Remove tudo que não for número
    const numbers = value.replace(/\D/g, '');
    // Limita a 11 dígitos
    return numbers.slice(0, 11);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error(t.validEmail);
      return;
    }

    if (!name || name.trim().length < 2) {
      toast.error(t.validName);
      return;
    }

    // Validar celular - mínimo 10 dígitos (DDD + número)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error(t.validPhone);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('corretor-checkout', {
        body: { 
          email: email.trim().toLowerCase(),
          name: name.trim(),
          phone: cleanPhone
        }
      });

      if (error) throw error;

      if (data?.payment_link) {
        setPaymentCreated(true);
        setNsuOrder(data.nsu_order);
        setPaymentLink(data.payment_link);
        toast.success(t.linkSuccess);
      } else {
        toast.error(t.checkoutError);
      }
    } catch (err) {
      console.error('Erro:', err);
      toast.error(t.processError);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayment = () => {
    if (paymentLink) {
      window.open(paymentLink, '_blank');
    }
  };

  const handleCheckPaymentManual = async () => {
    if (!nsuOrder) return;

    setCheckingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-corretor-payment', {
        body: { nsu_order: nsuOrder }
      });

      if (error) throw error;

      if (data?.paid) {
        toast.success(t.paymentConfirmed);
        window.location.href = `/corretormro/obrigado?email=${encodeURIComponent(email)}&nsu=${nsuOrder}`;
      } else if (data?.status === 'expired') {
        toast.error(t.orderExpired);
        setPaymentCreated(false);
      } else {
        toast.info(t.waitingPayment);
      }
    } catch (err) {
      toast.error(t.checkError);
    } finally {
      setCheckingPayment(false);
    }
  };

  const featureIcons = [Sparkles, Zap, Shield, Clock];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            <span className="font-bold text-lg">Corretor MRO</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <div className="flex items-center gap-2 bg-white/10 rounded-full p-1">
              <button
                onClick={() => setLanguage('pt')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                  language === 'pt' ? 'bg-white text-blue-600' : 'text-white hover:bg-white/10'
                }`}
              >
                🇧🇷 PT
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                  language === 'en' ? 'bg-white text-blue-600' : 'text-white hover:bg-white/10'
                }`}
              >
                🇺🇸 EN
              </button>
            </div>

            <div className="text-sm hidden sm:block">
              {t.offerExpires}{' '}
              <span className="font-mono bg-white/20 px-2 py-1 rounded">
                {String(promoTimeLeft.hours).padStart(2, '0')}:
                {String(promoTimeLeft.minutes).padStart(2, '0')}:
                {String(promoTimeLeft.seconds).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full mb-6">
            <Star className="w-4 h-4" />
            <span className="text-sm font-medium">{t.extensionWithAI}</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            {t.title1}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              {t.title2}
            </span>
          </h1>

          <p className="text-gray-300 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            {t.description}
          </p>

          {/* Preço */}
          <div className="mb-8">
            <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 p-1 rounded-2xl">
              <div className="bg-gray-900 rounded-xl px-8 py-6">
                <p className="text-gray-400 text-sm line-through mb-1">{t.from}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl text-white font-bold">R$</span>
                  <span className="text-6xl text-white font-bold">19</span>
                  <span className="text-3xl text-white font-bold">,90</span>
                  <span className="text-gray-400 text-lg">{t.month}</span>
                </div>
                <p className="text-green-400 text-sm mt-2">{t.access30days}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Benefícios */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {t.features.map((feature, index) => {
            const Icon = featureIcons[index];
            return (
              <Card key={index} className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-4 text-center">
                  <Icon className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-gray-300 text-sm">{feature.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Formulário de checkout */}
        <Card className="bg-gray-800/80 border-gray-700 max-w-md mx-auto">
          <CardContent className="p-6">
            {!paymentCreated ? (
              <>
                <h3 className="text-xl font-bold text-white text-center mb-4">
                  {t.startNow}
                </h3>
                
                <form onSubmit={handleCheckout} className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      placeholder={t.fullName}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                      required
                    />
                  </div>

                  <div>
                    <Input
                      type="email"
                      placeholder={t.email}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                      required
                    />
                  </div>

                  <div>
                    <Input
                      type="tel"
                      placeholder={t.phone}
                      value={phone}
                      onChange={handlePhoneChange}
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                      required
                      maxLength={11}
                    />
                    <p className="text-gray-500 text-xs mt-1">
                      {language === 'pt' ? 'Ex: 11999999999' : 'Ex: 11999999999'}
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-6 text-lg font-bold"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        {t.processing}
                      </>
                    ) : (
                      t.cta
                    )}
                  </Button>
                </form>

                <div className="mt-4 space-y-2">
                  {t.benefits.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white text-center mb-4">
                  {t.linkGenerated}
                </h3>
                
                <div className="bg-gray-900 p-4 rounded-lg mb-4">
                  <p className="text-gray-400 text-sm mb-1">{t.emailLabel}</p>
                  <p className="text-white font-medium">{email}</p>
                  <p className="text-gray-400 text-sm mt-3 mb-1">{t.orderLabel}</p>
                  <p className="text-blue-400 font-mono text-sm">{nsuOrder}</p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleOpenPayment}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-6 text-lg font-bold"
                  >
                    {t.payNow}
                  </Button>

                  <Button
                    onClick={handleCheckPaymentManual}
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                    disabled={checkingPayment}
                  >
                    {checkingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        {t.verifying}
                      </>
                    ) : (
                      t.alreadyPaid
                    )}
                  </Button>
                </div>

                <p className="text-gray-500 text-xs text-center mt-4">
                  {t.autoVerification}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Como funciona */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white text-center mb-8">{t.howItWorks}</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {t.steps.map((item, index) => (
              <Card key={index} className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-white font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>{t.footer}</p>
        </footer>
      </main>
    </div>
  );
};

export default CorretorMRO;
