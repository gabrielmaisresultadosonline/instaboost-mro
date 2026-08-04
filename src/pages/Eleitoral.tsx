import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, ChevronRight, MessageSquare, User, Phone, Mail, Instagram, Target, BarChart3, Rocket, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { trackPageView } from '@/lib/facebookTracking';

const QUESTIONS = [
  {
    id: 'nome',
    question: 'Qual é o seu nome?',
    type: 'text',
    icon: User,
  },
  {
    id: 'whatsapp',
    question: 'Qual é seu WhatsApp?',
    type: 'tel',
    placeholder: '(00) 00000-0000',
    icon: Phone,
  },
  {
    id: 'email',
    question: 'Qual é seu melhor e-mail?',
    type: 'email',
    icon: Mail,
  },
  {
    id: 'instagram',
    question: 'Qual é seu Instagram?',
    type: 'text',
    placeholder: '@seuusuario',
    optional: true,
    icon: Instagram,
  },
  {
    id: 'cargo',
    question: 'Você é candidato a qual cargo?',
    type: 'choice',
    options: ['Deputado Estadual', 'Deputado Federal', 'Senador', 'Governador'],
    icon: Target,
  },
  {
    id: 'candidatura_definida',
    question: 'Sua candidatura já está definida?',
    type: 'choice',
    options: ['Sim', 'Ainda estou decidindo', 'Estou avaliando'],
    icon: HelpCircle,
  },
  {
    id: 'equipe_marketing',
    question: 'Você já possui equipe de marketing?',
    type: 'choice',
    options: ['Não', 'Sim, mas preciso melhorar', 'Tenho apenas um designer', 'Tenho agência'],
    icon: BarChart3,
  },
  {
    id: 'investimento_anuncios',
    question: 'Quanto pretende investir em anúncios durante a campanha?',
    type: 'choice',
    options: ['Até R$ 2.000', 'R$ 2.000 a R$ 5.000', 'R$ 5.000 a R$ 10.000', 'Mais de R$ 10.000'],
    icon: Target,
  },
  {
    id: 'maior_dificuldade',
    question: 'Qual é sua maior dificuldade hoje?',
    type: 'choice',
    options: ['Conseguir mais alcance', 'Crescer no Instagram', 'Criar conteúdo', 'Fazer anúncios', 'Conseguir mais votos', 'Ainda não comecei'],
    icon: Rocket,
  },
  {
    id: 'urgencia',
    question: 'Gostaria de resolver o marketing da sua campanha ainda esta semana?',
    type: 'choice',
    options: ['Sim, quero começar imediatamente.', 'Sim, mas preciso conversar primeiro.', 'Estou apenas pesquisando.'],
    icon: Rocket,
  },
];

const Eleitoral = () => {
  const [step, setStep] = useState(0); // 0 = Intro, 1-10 = Questions, 11 = Final
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    trackPageView();
  }, []);

  const handleNext = async () => {
    if (step < QUESTIONS.length) {
      setStep(step + 1);
    } else {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Save to database
      const { error } = await supabase.from('eleitoral_leads' as any).insert([answers]);
      
      if (error) throw error;

      // Track Lead event in Meta Pixel
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Lead', {
          content_name: 'Diagnóstico Eleitoral',
          status: 'Completed'
        });
      }

      setStep(QUESTIONS.length + 1);
    } catch (err) {
      console.error('Error saving lead:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsApp = () => {
    const phone = '+555192835863';
    const message = `Olá! Acabei de concluir a análise da minha campanha no site. Gostaria de receber uma proposta para gestão do marketing digital.\n\nResumo:\nNome: ${answers.nome}\nCargo: ${answers.cargo}\nInstagram: ${answers.instagram || 'Não informado'}\nInvestimento: ${answers.investimento_anuncios}`;
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const currentQuestion = QUESTIONS[step - 1];

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4 bg-zinc-950">
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80')] bg-cover bg-center grayscale mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-green-600/20 via-yellow-400/10 to-blue-600/20" />
      </div>

      <div className="w-full max-w-xl relative z-10">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8"
            >
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                  Vamos avaliar sua <span className="text-yellow-400">campanha digital</span>
                </h1>
                <p className="text-lg text-zinc-400">
                  Descubra gratuitamente qual é o melhor plano de marketing para sua candidatura em 2026.
                </p>
              </div>

              <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-md">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center gap-2 text-green-400 font-medium">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Leva menos de 2 minutos.</span>
                  </div>
                </CardContent>
              </Card>

              <Button 
                onClick={() => setStep(1)}
                className="w-full h-14 text-lg bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-xl"
              >
                COMEÇAR <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
          )}

          {step > 0 && step <= QUESTIONS.length && (
            <motion.div
              key={`q-${step}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center text-zinc-500 text-sm font-medium">
                <span>Pergunta {step} de {QUESTIONS.length}</span>
                <div className="h-1 w-32 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-400 transition-all duration-300" 
                    style={{ width: `${(step / QUESTIONS.length) * 100}%` }} 
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-400/10 rounded-xl text-yellow-400">
                    {React.createElement(currentQuestion.icon, { className: "w-6 h-6" })}
                  </div>
                  <h2 className="text-2xl font-bold text-white">{currentQuestion.question}</h2>
                </div>

                {currentQuestion.type === 'choice' ? (
                  <RadioGroup
                    value={answers[currentQuestion.id]}
                    onValueChange={(val) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }))}
                    className="grid gap-3"
                  >
                    {currentQuestion.options?.map((opt) => (
                      <Label
                        key={opt}
                        className={`flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          answers[currentQuestion.id] === opt 
                            ? 'bg-yellow-400/10 border-yellow-400 text-yellow-400' 
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <RadioGroupItem value={opt} className="sr-only" />
                        <span className="text-lg font-medium">{opt}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-2">
                    <Input
                      type={currentQuestion.type}
                      placeholder={currentQuestion.placeholder}
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                      className="h-14 bg-zinc-900/50 border-zinc-800 text-lg text-white focus:border-yellow-400 rounded-xl"
                      autoFocus
                    />
                    {currentQuestion.optional && <p className="text-zinc-500 text-sm">(Opcional)</p>}
                  </div>
                )}
              </div>

              <Button
                disabled={!currentQuestion.optional && !answers[currentQuestion.id]}
                onClick={handleNext}
                className="w-full h-14 text-lg bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-xl"
              >
                {step === QUESTIONS.length ? 'FINALIZAR ANÁLISE' : 'PRÓXIMA PERGUNTA'}
              </Button>
            </motion.div>
          )}

          {step === QUESTIONS.length + 1 && (
            <motion.div
              key="final"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8"
            >
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-500 mb-6">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-white">Sua análise foi concluída.</h2>
                <p className="text-zinc-400">
                  Com base nas suas respostas, acreditamos que podemos ajudar sua campanha a alcançar mais pessoas através de uma gestão profissional de anúncios e presença digital.
                </p>
              </div>

              <Card className="bg-zinc-900/50 border-zinc-800 text-left overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-yellow-400 font-bold uppercase tracking-wider text-sm">Resumo da sua candidatura</h3>
                  <div className="grid gap-3 text-white">
                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-500">Nome</span>
                      <span>{answers.nome}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-500">Cargo</span>
                      <span>{answers.cargo}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-500">Instagram</span>
                      <span>{answers.instagram || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-500">Dificuldade</span>
                      <span>{answers.maior_dificuldade}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400 text-sm italic">
                  "Seu perfil é compatível com nossos serviços de gestão de mídia para campanhas eleitorais. Vamos conversar para montar um plano adequado ao seu orçamento."
                </div>

                <div className="space-y-3">
                  <h3 className="text-white font-bold text-xl">O próximo passo é conversar com um especialista.</h3>
                  <Button
                    onClick={handleWhatsApp}
                    className="w-full h-16 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-lg rounded-xl shadow-lg shadow-green-500/20"
                  >
                    <MessageSquare className="mr-2 w-6 h-6" />
                    📲 FALAR NO WHATSAPP
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Eleitoral;
