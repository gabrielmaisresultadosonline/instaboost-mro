import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, LogOut, RefreshCw, Search, Download, CheckCircle2, XCircle, Trash2, Lock, Unlock } from 'lucide-react';

const ADMIN_EMAIL = 'mro@gmail.com';
const ADMIN_PASS = 'Ga145523@';
const SESSION_KEY = 'renda-extrass:admin-session';

type Lead = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  has_desktop: boolean;
  video_completed: boolean;
  video_25_at: string | null;
  video_50_at: string | null;
  video_100_at: string | null;
  offer_email_sent_at: string | null;
  reminder1_sent_at: string | null;
  reminder2_sent_at: string | null;
  offer_expires_at: string | null;
  offer_expired: boolean;
  access_liberated: boolean;
  created_at: string;
};

const RendaExtrassAdmin = () => {
  const [authed, setAuthed] = useState<boolean>(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('renda_extrass_leads')
        .select('id,name,email,whatsapp,has_desktop,video_completed,video_25_at,video_50_at,video_100_at,offer_email_sent_at,reminder1_sent_at,reminder2_sent_at,offer_expires_at,offer_expired,access_liberated,created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLeads((data || []) as Lead[]);
    } catch (e: any) {
      toast.error('Erro ao carregar cadastros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed) load();
  }, [authed]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASS) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setAuthed(true);
      toast.success('Bem-vindo!');
    } else {
      toast.error('Credenciais inválidas');
    }
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir este cadastro?')) return;
    const { error } = await supabase.from('renda_extrass_leads').delete().eq('id', id);
    if (error) return toast.error('Erro ao excluir');
    toast.success('Excluído');
    setLeads((l) => l.filter((x) => x.id !== id));
  };

  const toggleLiberated = async (id: string, current: boolean) => {
    const next = !current;
    const { error } = await supabase.from('renda_extrass_leads').update({ access_liberated: next }).eq('id', id);
    if (error) return toast.error('Erro ao atualizar');
    toast.success(next ? 'Acesso liberado' : 'Acesso bloqueado');
    setLeads((l) => l.map((x) => (x.id === id ? { ...x, access_liberated: next } : x)));
  };

  const exportCsv = () => {
    const rows = [
      ['Nome', 'Email', 'WhatsApp', 'Computador', 'Vídeo Concluído', 'Cadastrado em'],
      ...leads.map((l) => [
        l.name,
        l.email,
        l.whatsapp,
        l.has_desktop ? 'Sim' : 'Não',
        l.video_completed ? 'Sim' : 'Não',
        new Date(l.created_at).toLocaleString('pt-BR'),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `renda-extrass-leads-${Date.now()}.csv`;
    a.click();
  };

  const filtered = leads.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.whatsapp.includes(q);
  });

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0a0a14] text-white flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md bg-[#0d0d16] border border-white/10 rounded-3xl p-8 space-y-5 shadow-2xl"
        >
          <h1 className="text-2xl font-black">Painel /renda-extrass</h1>
          <p className="text-white/50 text-sm">Acesso restrito.</p>
          <Input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/5 border-white/10 h-12"
            autoFocus
          />
          <Input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/5 border-white/10 h-12"
          />
          <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black h-12">
            Entrar
          </Button>
        </form>
      </div>
    );
  }

  const total = leads.length;
  const v25 = leads.filter((l) => !!l.video_25_at).length;
  const v50 = leads.filter((l) => !!l.video_50_at).length;
  const v100 = leads.filter((l) => !!l.video_100_at).length;
  const offerSent = leads.filter((l) => !!l.offer_email_sent_at).length;
  const expired = leads.filter((l) => l.offer_expired).length;

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black">Cadastros /renda-extrass</h1>
            <p className="text-white/50 text-sm">Painel administrativo</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading} className="border-white/10">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
            <Button variant="outline" onClick={exportCsv} className="border-white/10">
              <Download className="w-4 h-4 mr-2" /> CSV
            </Button>
            <Button variant="ghost" onClick={logout} className="text-white/60">
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="bg-[#0d0d16] border-white/10 p-4">
            <div className="text-white/50 text-[10px] uppercase tracking-wider">Cadastros</div>
            <div className="text-2xl font-black mt-1">{total}</div>
          </Card>
          <Card className="bg-[#0d0d16] border-white/10 p-4">
            <div className="text-white/50 text-[10px] uppercase tracking-wider">Vídeo 25%</div>
            <div className="text-2xl font-black mt-1 text-blue-300">{v25}</div>
          </Card>
          <Card className="bg-[#0d0d16] border-white/10 p-4">
            <div className="text-white/50 text-[10px] uppercase tracking-wider">Vídeo 50%</div>
            <div className="text-2xl font-black mt-1 text-amber-300">{v50}</div>
          </Card>
          <Card className="bg-[#0d0d16] border-white/10 p-4">
            <div className="text-white/50 text-[10px] uppercase tracking-wider">Vídeo 100%</div>
            <div className="text-2xl font-black mt-1 text-emerald-400">{v100}</div>
          </Card>
          <Card className="bg-[#0d0d16] border-white/10 p-4">
            <div className="text-white/50 text-[10px] uppercase tracking-wider">Oferta enviada</div>
            <div className="text-2xl font-black mt-1 text-emerald-300">{offerSent}</div>
          </Card>
          <Card className="bg-[#0d0d16] border-white/10 p-4">
            <div className="text-white/50 text-[10px] uppercase tracking-wider">Expirados 24h</div>
            <div className="text-2xl font-black mt-1 text-red-400">{expired}</div>
          </Card>
        </div>


        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <Input
            placeholder="Buscar por nome, e-mail ou WhatsApp"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 h-12"
          />
        </div>

        <Card className="bg-[#0d0d16] border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-white/60 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">E-mail</th>
                  <th className="text-left p-3">WhatsApp</th>
                  <th className="text-left p-3">Vídeo %</th>
                  <th className="text-left p-3">Oferta</th>
                  <th className="text-left p-3">Acesso</th>
                  <th className="text-left p-3">Cadastro</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const pct = l.video_100_at ? 100 : l.video_50_at ? 50 : l.video_25_at ? 25 : 0;
                  return (
                  <tr key={l.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 font-medium">{l.name}</td>
                    <td className="p-3 text-white/70">{l.email}</td>
                    <td className="p-3 text-white/70">{l.whatsapp}</td>
                    <td className="p-3">
                      <Badge className={
                        pct === 100 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                        pct >= 50 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                        pct >= 25 ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                        'border-white/10 text-white/40 bg-transparent'
                      }>{pct}%</Badge>
                    </td>
                    <td className="p-3 text-xs">
                      {l.offer_expired ? (
                        <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Expirada</Badge>
                      ) : l.offer_email_sent_at ? (
                        <div className="space-y-0.5">
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Enviada</Badge>
                          <div className="text-white/40">
                            {l.reminder1_sent_at ? '✓R1 ' : ''}{l.reminder2_sent_at ? '✓R2' : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    <td className="p-3 text-white/50 text-xs">
                      {new Date(l.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => remove(l.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-white/40">
                      {loading ? 'Carregando...' : 'Nenhum cadastro encontrado'}
                    </td>
                  </tr>
                )}
              </tbody>

            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RendaExtrassAdmin;
