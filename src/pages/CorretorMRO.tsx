import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Sparkles, Zap, Shield, Clock, Star } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const CorretorMRO: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [promoTimeLeft, setPromoTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

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

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error('Digite um e-mail válido');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('corretor-checkout', {
        body: { email }
      });

      if (error) throw error;

      if (data?.payment_link) {
        window.location.href = data.payment_link;
      } else {
        toast.error('Erro ao criar checkout');
      }
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao processar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: Sparkles, text: 'Correção instantânea de textos' },
    { icon: Zap, text: 'IA avançada com ChatGPT' },
    { icon: Shield, text: 'Funciona em qualquer site' },
    { icon: Clock, text: 'Economia de tempo' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            <span className="font-bold text-lg">Corretor MRO</span>
          </div>
          <div className="text-sm">
            Oferta expira em:{' '}
            <span className="font-mono bg-white/20 px-2 py-1 rounded">
              {String(promoTimeLeft.hours).padStart(2, '0')}:
              {String(promoTimeLeft.minutes).padStart(2, '0')}:
              {String(promoTimeLeft.seconds).padStart(2, '0')}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full mb-6">
            <Star className="w-4 h-4" />
            <span className="text-sm font-medium">Extensão com IA</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Corrija Todos os Seus Textos
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Automaticamente com IA
            </span>
          </h1>

          <p className="text-gray-300 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Escreva sem erros em qualquer lugar da internet. Nossa extensão usa inteligência artificial 
            para corrigir gramática, ortografia e melhorar seus textos instantaneamente.
          </p>

          {/* Preço */}
          <div className="mb-8">
            <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 p-1 rounded-2xl">
              <div className="bg-gray-900 rounded-xl px-8 py-6">
                <p className="text-gray-400 text-sm line-through mb-1">De R$ 49,90/mês</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl text-white font-bold">R$</span>
                  <span className="text-6xl text-white font-bold">19</span>
                  <span className="text-3xl text-white font-bold">,90</span>
                  <span className="text-gray-400 text-lg">/mês</span>
                </div>
                <p className="text-green-400 text-sm mt-2">⚡ Acesso por 30 dias</p>
              </div>
            </div>
          </div>
        </div>

        {/* Benefícios */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {benefits.map((benefit, index) => (
            <Card key={index} className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-4 text-center">
                <benefit.icon className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-gray-300 text-sm">{benefit.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Formulário de checkout */}
        <Card className="bg-gray-800/80 border-gray-700 max-w-md mx-auto">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white text-center mb-4">
              Comece Agora
            </h3>
            
            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Seu melhor e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-6 text-lg font-bold"
                disabled={loading}
              >
                {loading ? 'Processando...' : 'QUERO CORRIGIR MEUS TEXTOS →'}
              </Button>
            </form>

            <div className="mt-4 space-y-2">
              {['Acesso imediato após pagamento', 'Suporte via WhatsApp', 'Garantia de 7 dias'].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Como funciona */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Como Funciona</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Instale a Extensão', desc: 'Baixe e instale nossa extensão no seu navegador' },
              { step: '2', title: 'Faça Login', desc: 'Use o e-mail cadastrado para acessar' },
              { step: '3', title: 'Corrija Textos', desc: 'Selecione qualquer texto e corrija com 1 clique' },
            ].map((item, index) => (
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
          <p>© {new Date().getFullYear()} Corretor MRO - Todos os direitos reservados</p>
        </footer>
      </main>
    </div>
  );
};

export default CorretorMRO;
