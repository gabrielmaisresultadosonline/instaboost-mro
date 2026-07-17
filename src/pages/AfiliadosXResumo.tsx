import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowLeft, Camera, CheckCircle2, Copy, DollarSign, Eye, Loader2,
  LogOut, RefreshCw, Save, Timer, TrendingUp, User as UserIcon, Users,
} from "lucide-react";

const STORAGE_KEY = "afiliadosx_session";

type Session = { email: string; password: string };

export default function AfiliadosXResumo() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [data, setData] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [edit, setEdit] = useState({ first_name: "", last_name: "", photo_url: null as string | null, show_promo_banner: true });

  // Restore session
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setSession(s);
      } catch {}
    }
  }, []);

  const fetchStats = async (s: Session) => {
    setLoading(true);
    try {
      const { data: r, error } = await supabase.functions.invoke("afiliadosx", {
        body: { action: "stats", email: s.email, password: s.password },
      });
      if (error || !r?.success) {
        toast.error(r?.error || "Sessão inválida");
        localStorage.removeItem(STORAGE_KEY);
        setSession(null);
        return;
      }
      setData(r);
      setEdit({
        first_name: r.partner.name || "",
        last_name: r.partner.last_name || "",
        photo_url: r.partner.photo_url || null,
        show_promo_banner: !!r.partner.show_promo_banner,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchStats(session);
  }, [session]);

  // Auto refresh
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => fetchStats(session), 15000);
    return () => clearInterval(id);
  }, [session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: r, error } = await supabase.functions.invoke("afiliadosx", {
        body: { action: "login", email: loginForm.email.toLowerCase().trim(), password: loginForm.password },
      });
      if (error || !r?.success) {
        toast.error(r?.error || "Falha no login");
        return;
      }
      const s = { email: loginForm.email.toLowerCase().trim(), password: loginForm.password };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      setSession(s);
      toast.success("Bem-vindo(a)!");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setData(null);
  };

  const handlePhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 3 * 1024 * 1024) { toast.error("Máx 3MB"); return; }
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `afiliadosx/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("assets").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data: pd } = supabase.storage.from("assets").getPublicUrl(path);
      setEdit(e => ({ ...e, photo_url: pd.publicUrl }));
      toast.success("Foto atualizada — clique Salvar");
    } catch (e: any) {
      toast.error(e?.message || "Erro");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!session || !data?.partner) return;
    setSavingEdit(true);
    try {
      const { data: r, error } = await supabase.functions.invoke("afiliadosx", {
        body: {
          action: "update",
          partner_id: data.partner.id,
          email: session.email,
          password: session.password,
          first_name: edit.first_name,
          last_name: edit.last_name,
          photo_url: edit.photo_url,
          show_promo_banner: edit.show_promo_banner,
        },
      });
      if (error || !r?.success) {
        toast.error(r?.error || "Erro ao salvar");
        return;
      }
      toast.success("Alterações salvas");
      await fetchStats(session);
    } finally {
      setSavingEdit(false);
    }
  };

  // -------- Login screen --------
  if (!session) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 p-8 md:p-10 rounded-3xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-yellow-500" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Dashboard Afiliado</h1>
            <p className="text-sm text-zinc-500 mt-2">Use seu email de afiliado + senha do /instagram</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2 block">Email</Label>
              <Input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm(f => ({ ...f, email: e.target.value }))}
                className="bg-black border-zinc-800 h-12 rounded-xl"
                required
              />
            </div>
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2 block">
                Senha (mesma do /instagram)
              </Label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(f => ({ ...f, password: e.target.value }))}
                  className="bg-black border-zinc-800 h-12 rounded-xl pr-16"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-yellow-500 uppercase"
                >
                  {showPass ? "Ocultar" : "Ver"}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black h-14 rounded-xl uppercase"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>
          <button
            onClick={() => navigate("/afiliadosx")}
            className="mt-6 w-full text-center text-xs text-zinc-500 hover:text-white uppercase tracking-widest font-black"
          >
            <ArrowLeft className="w-3 h-3 inline mr-1" /> Voltar
          </button>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
      </div>
    );
  }

  const base = "https://maisresultadosonline.com.br";
  const links = [
    { label: "Instagram PRO", url: `${base}/instagram-nova-promo?ref=${data.partner.slug}` },
    { label: "Renda Extra", url: `${base}/renda-extra?ref=${data.partner.slug}` },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-900 sticky top-0 bg-black/90 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500 text-black flex items-center justify-center font-black">
              {data.partner.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div>
              <p className="font-black text-sm">{data.partner.name} {data.partner.last_name}</p>
              <p className="text-xs text-zinc-500">Afiliado MRO · atualiza a cada 15s</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => fetchStats(session)} className="border-zinc-800 bg-transparent">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleLogout} className="border-zinc-800 bg-transparent">
              <LogOut className="w-4 h-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-zinc-900 border-zinc-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase font-black mb-2">
              <DollarSign className="w-3 h-3" /> Comissão
            </div>
            <p className="text-2xl md:text-3xl font-black text-emerald-400">R$ {(data.total_commission || 0).toFixed(2)}</p>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase font-black mb-2">
              <CheckCircle2 className="w-3 h-3" /> Aprovadas
            </div>
            <p className="text-2xl md:text-3xl font-black text-white">{data.approved_count}</p>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase font-black mb-2">
              <Timer className="w-3 h-3" /> Tentativas
            </div>
            <p className="text-2xl md:text-3xl font-black text-yellow-500">{data.attempts_count}</p>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase font-black mb-2">
              <Eye className="w-3 h-3" /> Visitas
            </div>
            <p className="text-2xl md:text-3xl font-black text-white">{data.visits?.length || 0}</p>
          </Card>
        </div>

        {/* Links */}
        <Card className="bg-zinc-900 border-zinc-800 p-5 md:p-6 rounded-2xl">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4">Seus links</h2>
          <div className="space-y-2">
            {links.map(l => (
              <div key={l.url} className="bg-black border border-zinc-800 rounded-xl p-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase font-black text-zinc-500 mb-1">{l.label}</p>
                  <p className="text-xs text-yellow-500 font-mono break-all">{l.url}</p>
                </div>
                <Button size="sm" onClick={() => { navigator.clipboard.writeText(l.url); toast.success("Copiado"); }} className="bg-yellow-500 hover:bg-yellow-400 text-black font-black flex-shrink-0">
                  <Copy className="w-3 h-3 mr-1" /> Copiar
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Perfil / Edit */}
        <Card className="bg-zinc-900 border-zinc-800 p-5 md:p-6 rounded-2xl">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4">Perfil no site</h2>
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-black border border-zinc-800 overflow-hidden flex items-center justify-center">
                {edit.photo_url ? (
                  <img src={edit.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-10 h-10 text-zinc-600" />
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])} />
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadingPhoto} className="w-full mt-2 border-zinc-800 bg-transparent">
                {uploadingPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Camera className="w-3 h-3 mr-1" /> Trocar</>}
              </Button>
            </div>
            <div className="flex-1 space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-zinc-400 mb-1 block">Nome</Label>
                  <Input value={edit.first_name} onChange={(e) => setEdit(x => ({ ...x, first_name: e.target.value }))} className="bg-black border-zinc-800 h-11 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs text-zinc-400 mb-1 block">Sobrenome</Label>
                  <Input value={edit.last_name} onChange={(e) => setEdit(x => ({ ...x, last_name: e.target.value }))} className="bg-black border-zinc-800 h-11 rounded-xl" />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 bg-black border border-zinc-800 rounded-xl p-3">
                <div>
                  <p className="text-sm font-black">Mostrar minha foto e nome no site</p>
                  <p className="text-xs text-zinc-500">Quando alguém entrar via seu link.</p>
                </div>
                <Switch checked={edit.show_promo_banner} onCheckedChange={(v) => setEdit(x => ({ ...x, show_promo_banner: v }))} />
              </div>
              <Button onClick={handleSaveEdit} disabled={savingEdit} className="bg-yellow-500 hover:bg-yellow-400 text-black font-black">
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Salvar alterações</>}
              </Button>
            </div>
          </div>
        </Card>

        {/* Approved */}
        <Card className="bg-zinc-900 border-zinc-800 p-5 md:p-6 rounded-2xl">
          <h2 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-4">✓ Vendas aprovadas ({data.approved_count})</h2>
          {data.approved.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhuma venda aprovada ainda. Divulgue seu link!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-zinc-500 text-xs uppercase">
                  <tr className="border-b border-zinc-800"><th className="text-left py-2">Data</th><th className="text-left py-2">Email</th><th className="text-right py-2">Valor</th><th className="text-right py-2">Comissão</th></tr>
                </thead>
                <tbody>
                  {data.approved.map((o: any) => (
                    <tr key={o.id} className="border-b border-zinc-900">
                      <td className="py-2 text-zinc-400">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                      <td className="py-2">{o.email}</td>
                      <td className="py-2 text-right">R$ {Number(o.amount || 0).toFixed(2)}</td>
                      <td className="py-2 text-right text-emerald-400 font-black">R$ 97,00</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Attempts */}
        <Card className="bg-zinc-900 border-zinc-800 p-5 md:p-6 rounded-2xl">
          <h2 className="text-xs font-black uppercase tracking-widest text-yellow-500 mb-4">◷ Tentativas em tempo real ({data.attempts_count})</h2>
          {data.attempts.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhuma tentativa registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-zinc-500 text-xs uppercase">
                  <tr className="border-b border-zinc-800"><th className="text-left py-2">Data</th><th className="text-left py-2">Email</th><th className="text-right py-2">Valor</th><th className="text-right py-2">Status</th></tr>
                </thead>
                <tbody>
                  {data.attempts.map((o: any) => (
                    <tr key={o.id} className="border-b border-zinc-900">
                      <td className="py-2 text-zinc-400">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                      <td className="py-2">{o.email}</td>
                      <td className="py-2 text-right">R$ {Number(o.amount || 0).toFixed(2)}</td>
                      <td className="py-2 text-right text-yellow-500 uppercase text-xs font-black">{o.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-zinc-500 mt-4">
            💡 100% transparente — toda tentativa aparece aqui em tempo real, mesmo pagamentos não concluídos.
            Faça um teste você mesmo se quiser confirmar.
          </p>
        </Card>

        {/* Visits */}
        <Card className="bg-zinc-900 border-zinc-800 p-5 md:p-6 rounded-2xl">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4">👀 Últimas visitas ({data.visits?.length || 0})</h2>
          {(!data.visits || data.visits.length === 0) ? (
            <p className="text-sm text-zinc-500">Nenhuma visita ainda.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-auto">
              {data.visits.slice(0, 20).map((v: any) => (
                <div key={v.id} className="bg-black border border-zinc-800 rounded-lg p-2 text-xs text-zinc-400 flex justify-between">
                  <span>{new Date(v.created_at).toLocaleString("pt-BR")}</span>
                  <span className="text-zinc-600 truncate ml-2 max-w-[50%]">{v.referer || "direto"}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
