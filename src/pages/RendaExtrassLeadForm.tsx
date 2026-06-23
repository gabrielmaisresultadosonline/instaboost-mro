import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ArrowLeft, Loader2, Monitor, XCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const LS_KEY = 'renda-extrass:lead';

export type RendaExtrassLead = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
};

export const getStoredLead = (): RendaExtrassLead | null => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

interface Props {
  onComplete: (lead: RendaExtrassLead) => void;
}

const onlyDigits = (v: string) => v.replace(/\D/g, '');
const formatWhats = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const RendaExtrassLeadForm = ({ onComplete }: Props) => {
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [hasDesktop, setHasDesktop] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const next = () => setStep((s) => (s + 1) as typeof step);
  const back = () => setStep((s) => (Math.max(0, s - 1)) as typeof step);

  const validateStep = (): string | null => {
    if (step === 0 && name.trim().length < 2) return 'Digite seu nome completo';
    if (step === 1 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'E-mail inválido';
    if (step === 2 && onlyDigits(whatsapp).length < 10) return 'WhatsApp inválido';
    if (step === 3 && hasDesktop === null) return 'Selecione uma opção';
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) {
      toast.error(err);
      return;
    }
    if (step === 3) {
      if (hasDesktop === false) {
        setStep(4);
        return;
      }
      submit();
      return;
    }
    next();
  };

  const submit = async () => {
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        whatsapp: onlyDigits(whatsapp),
        has_desktop: true,
        user_agent: navigator.userAgent,
      };
      // Try update first via select-then-upsert (unique on lower(email))
      const { data: existing } = await supabase
        .from('renda_extrass_leads')
        .select('id')
        .eq('email', payload.email)
        .maybeSingle();

      let id: string;
      if (existing?.id) {
        id = existing.id;
        await supabase.from('renda_extrass_leads').update(payload).eq('id', id);
      } else {
        const { data, error } = await supabase
          .from('renda_extrass_leads')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        id = data.id;
      }

      const lead: RendaExtrassLead = { id, name: payload.name, email: payload.email, whatsapp: payload.whatsapp };
      localStorage.setItem(LS_KEY, JSON.stringify(lead));
      try { (window as any).fbq?.('track', 'Lead', { content_name: 'renda-extrass', email: payload.email }); } catch {}
      toast.success('Cadastro concluído! Liberando o vídeo...');
      onComplete(lead);
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao salvar cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step + 1) / 4) * 100;

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0d0d16] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="mb-6">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${step === 4 ? 100 : progress}%` }}
            />
          </div>
          <p className="text-xs text-white/40 mt-2 text-center">
            {step === 4 ? 'Cadastro indisponível' : `Etapa ${step + 1} de 4`}
          </p>
        </div>

        {step === 0 && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="text-2xl font-black">Qual é o seu nome?</h2>
            <p className="text-white/60 text-sm">Vamos começar com seu nome completo.</p>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
              placeholder="Seu nome completo"
              className="bg-white/5 border-white/10 h-12 text-base"
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="text-2xl font-black">Seu melhor e-mail</h2>
            <p className="text-white/60 text-sm">Vamos enviar materiais e o acesso para esse e-mail.</p>
            <Input
              autoFocus
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
              placeholder="voce@email.com"
              className="bg-white/5 border-white/10 h-12 text-base"
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="text-2xl font-black">Seu WhatsApp</h2>
            <p className="text-white/60 text-sm">Com DDD. É por aqui que vamos te dar suporte.</p>
            <Input
              autoFocus
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatWhats(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
              placeholder="(11) 99999-9999"
              className="bg-white/5 border-white/10 h-12 text-base"
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="text-2xl font-black flex items-center gap-2">
              <Monitor className="w-6 h-6 text-emerald-400" />
              Você tem computador?
            </h2>
            <p className="text-white/60 text-sm">
              Esse método precisa ser executado em <strong>computador de mesa, notebook ou MacBook</strong>.
              Não funciona apenas com celular.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setHasDesktop(true)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  hasDesktop === true
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="font-bold">Sim, tenho computador / notebook / MacBook</div>
                <div className="text-xs text-white/50 mt-1">Posso seguir com o cadastro</div>
              </button>
              <button
                onClick={() => setHasDesktop(false)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  hasDesktop === false
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="font-bold">Não, tenho apenas celular</div>
                <div className="text-xs text-white/50 mt-1">Cadastro não disponível</div>
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5 text-center py-6 animate-fade-in">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-black">Cadastro indisponível</h2>
            <p className="text-white/60 text-sm">
              Este método exige um <strong>computador, notebook ou MacBook</strong> para ser executado.
              Sem isso não conseguimos liberar o acesso ao treinamento.
            </p>
            <p className="text-white/40 text-xs">
              Quando tiver um computador disponível, volte aqui para fazer o cadastro.
            </p>
          </div>
        )}

        {step < 4 && (
          <div className="flex items-center justify-between gap-3 mt-8">
            {step > 0 ? (
              <Button variant="ghost" onClick={back} disabled={loading} className="text-white/60">
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
            ) : <div />}
            <Button
              onClick={handleNext}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-6 h-12 rounded-xl"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : step === 3 ? (
                <>Finalizar <CheckCircle2 className="w-5 h-5 ml-2" /></>
              ) : (
                <>Continuar <ArrowRight className="w-5 h-5 ml-2" /></>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RendaExtrassLeadForm;
