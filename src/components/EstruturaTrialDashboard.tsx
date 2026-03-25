import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Sparkles, Clock, CheckCircle2, XCircle, Instagram, Plus, RefreshCw, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Trial {
  id: string;
  instagram_username: string;
  full_name: string;
  email: string;
  created_at: string;
  expires_at: string;
  status: 'active' | 'expired';
  remaining_hours: number;
  remaining_minutes: number;
  instagram_removed: boolean;
}

interface TrialData {
  trials: Trial[];
  total_generated: number;
  trials_last_30_days: number;
  trials_remaining: number;
  max_trials: number;
  trial_duration_hours: number;
}

interface Props {
  onBack: () => void;
  mroUsername: string;
  mroPassword: string;
}

export const EstruturaTrialDashboard = ({ onBack, mroUsername, mroPassword }: Props) => {
  const [data, setData] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [instagramInput, setInstagramInput] = useState('');
  const [showForm, setShowForm] = useState(false);

  const loadTrials = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('estrutura-trials', {
        body: { action: 'list', mro_username: mroUsername }
      });

      if (error) throw error;
      if (result?.success) {
        setData(result);
      } else {
        toast.error(result?.message || 'Erro ao carregar testes');
      }
    } catch (err) {
      console.error('Error loading trials:', err);
      toast.error('Erro ao carregar testes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrials();
  }, [mroUsername]);

  const normalizeIG = (input: string): string => {
    let val = input.trim().toLowerCase();
    // Handle Instagram URLs like https://instagram.com/username or https://www.instagram.com/username/
    const urlMatch = val.match(/(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9._]+)/);
    if (urlMatch) return urlMatch[1];
    // Remove @ prefix
    return val.replace(/^@/, '');
  };

  const handleCreateTrial = async () => {
    const ig = normalizeIG(instagramInput);
    if (!ig) {
      toast.error('Digite o Instagram do cliente');
      return;
    }

    setCreating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('estrutura-trials', {
        body: {
          action: 'create',
          mro_username: mroUsername,
          mro_password: mroPassword,
          instagram_username: ig,
        }
      });

      if (error) throw error;

      if (result?.success) {
        toast.success('Teste criado com sucesso! 🎉');
        setInstagramInput('');
        setShowForm(false);
        await loadTrials();
      } else {
        toast.error(result?.message || 'Erro ao criar teste');
      }
    } catch (err) {
      console.error('Error creating trial:', err);
      toast.error('Erro ao criar teste');
    } finally {
      setCreating(false);
    }
  };

  const activeTrials = data?.trials.filter(t => t.status === 'active') || [];
  const expiredTrials = data?.trials.filter(t => t.status === 'expired') || [];

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0a14]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button size="sm" onClick={onBack} className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold">
            <ArrowLeft size={16} />
            <span className="ml-1">Voltar</span>
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-xs">Logado como</span>
            <span className="text-yellow-400 font-bold text-sm">{mroUsername}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadTrials} className="border-white/20 text-white hover:bg-white/10">
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
          </div>
        ) : (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#12121f] rounded-xl border border-white/10 p-4 text-center">
                <p className="text-2xl font-black text-yellow-400">{data?.total_generated || 0}</p>
                <p className="text-white/50 text-xs mt-1">Total Gerados</p>
              </div>
              <div className="bg-[#12121f] rounded-xl border border-white/10 p-4 text-center">
                <p className="text-2xl font-black text-green-400">{activeTrials.length}</p>
                <p className="text-white/50 text-xs mt-1">Ativos Agora</p>
              </div>
              <div className="bg-[#12121f] rounded-xl border border-white/10 p-4 text-center">
                <p className="text-2xl font-black text-red-400">{expiredTrials.length}</p>
                <p className="text-white/50 text-xs mt-1">Expirados</p>
              </div>
              <div className="bg-[#12121f] rounded-xl border border-white/10 p-4 text-center">
                <p className="text-2xl font-black text-cyan-400">{data?.trials_remaining || 0}/{data?.max_trials || 5}</p>
                <p className="text-white/50 text-xs mt-1">Restantes (30d)</p>
              </div>
            </div>

            {/* Create trial section */}
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                disabled={(data?.trials_remaining || 0) <= 0}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:from-gray-600 disabled:to-gray-700 text-black disabled:text-gray-400 font-black text-lg py-5 rounded-2xl shadow-xl shadow-yellow-500/20 hover:shadow-yellow-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
              >
                <Plus size={24} />
                Gerar Novo Teste Grátis
              </button>
            ) : (
              <div className="bg-[#12121f] rounded-2xl border border-yellow-500/30 p-6 space-y-4">
                <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                  <Instagram size={20} />
                  Criar Teste Grátis
                </h3>
                <p className="text-white/50 text-sm">
                  Digite o Instagram do cliente. O perfil será adicionado à sua conta MRO por {data?.trial_duration_hours || 6} horas.
                </p>
                <Input
                  value={instagramInput}
                  onChange={e => setInstagramInput(e.target.value)}
                  placeholder="@instagram_do_cliente"
                  className="bg-[#0a0a14] border-white/20 text-white placeholder:text-white/30 h-12 text-base"
                />
                <div className="flex gap-3">
                  <Button
                    onClick={handleCreateTrial}
                    disabled={creating || !instagramInput.trim()}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold h-12"
                  >
                    {creating ? (
                      <><Loader2 size={16} className="animate-spin" /> Criando...</>
                    ) : (
                      <><Zap size={16} /> Gerar Teste</>
                    )}
                  </Button>
                  <Button
                    onClick={() => { setShowForm(false); setInstagramInput(''); }}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 h-12"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Active trials */}
            {activeTrials.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                  <Clock size={18} />
                  Testes Ativos ({activeTrials.length})
                </h3>
                {activeTrials.map(trial => (
                  <div key={trial.id} className="bg-[#12121f] rounded-xl border border-green-500/20 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Instagram size={18} className="text-green-400" />
                      </div>
                      <div>
                        <p className="font-bold text-white">@{trial.instagram_username}</p>
                        <p className="text-white/40 text-xs">{new Date(trial.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-green-400 text-sm font-bold">
                        <Clock size={14} />
                        {trial.remaining_hours}h {trial.remaining_minutes}m
                      </div>
                      <p className="text-white/30 text-xs">restante</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Expired trials */}
            {expiredTrials.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-red-400/70 flex items-center gap-2">
                  <XCircle size={18} />
                  Testes Expirados ({expiredTrials.length})
                </h3>
                {expiredTrials.map(trial => (
                  <div key={trial.id} className="bg-[#12121f]/60 rounded-xl border border-white/5 p-4 flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                        <Instagram size={18} className="text-red-400/50" />
                      </div>
                      <div>
                        <p className="font-bold text-white/70">@{trial.instagram_username}</p>
                        <p className="text-white/30 text-xs">{new Date(trial.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-red-400/60 text-xs font-medium px-2 py-1 rounded bg-red-500/10">Expirado</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {(data?.trials.length || 0) === 0 && (
              <div className="text-center py-12">
                <Sparkles className="w-12 h-12 text-yellow-400/30 mx-auto mb-4" />
                <p className="text-white/40 text-lg font-medium">Nenhum teste gerado ainda</p>
                <p className="text-white/25 text-sm mt-1">Clique no botão acima para gerar seu primeiro teste grátis</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
