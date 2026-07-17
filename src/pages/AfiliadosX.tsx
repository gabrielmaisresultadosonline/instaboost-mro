import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/userStorage";
import type { MROUser } from "@/types/user";
import {
  ArrowRight, Camera, CheckCircle2, DollarSign, Eye, Loader2,
  LogIn, Lock, Sparkles, Star, TrendingUp, User as UserIcon, Users, Zap,
} from "lucide-react";

export default function AfiliadosX() {
  const navigate = useNavigate();
  const [user, setUser] = useState<MROUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [existingPartner, setExistingPartner] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    show_promo_banner: true,
    photo_url: null as string | null,
  });

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setUser(u);
      if (u) {
        // Check if already partner
        const { data } = await supabase
          .from("partners")
          .select("*")
          .eq("squarecloud_username", u.username.toLowerCase())
          .eq("source", "afiliadosx")
          .maybeSingle();
        if (data) setExistingPartner(data);
        setForm(f => ({ ...f, first_name: f.first_name || (u.username || "") }));
      }
      setChecking(false);
    })();
  }, []);

  const handlePhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 3MB)");
      return;
    }
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `afiliadosx/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("assets").upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("assets").getPublicUrl(path);
      setForm(f => ({ ...f, photo_url: data.publicUrl }));
      setPhotoPreview(data.publicUrl);
      toast.success("Foto enviada");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao enviar foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("afiliadosx", {
        body: {
          action: "register",
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email.toLowerCase().trim(),
          squarecloud_username: user.username.toLowerCase(),
          password: form.password,
          photo_url: form.photo_url,
          show_promo_banner: form.show_promo_banner,
        },
      });
      if (error || !data?.success) {
        toast.error(data?.error || "Erro ao cadastrar");
        return;
      }
      toast.success("Cadastro criado! Enviamos os detalhes no seu email.");
      setExistingPartner(data.partner);
    } catch (err: any) {
      toast.error(err?.message || "Erro");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Not logged in gate ----------------
  if (!checking && !user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <Card className="max-w-lg w-full bg-zinc-900 border-zinc-800 p-10 text-center rounded-3xl">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-yellow-500" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight mb-3">Área Exclusiva</h1>
          <p className="text-zinc-400 mb-6 leading-relaxed">
            O programa de afiliados é <strong className="text-yellow-500">exclusivo para clientes ativos MRO Instagram</strong>.
            Você precisa estar logado com sua conta para se cadastrar como afiliado.
          </p>
          <Button
            onClick={() => navigate("/instagram")}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black h-14 rounded-xl uppercase"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Fazer login no /instagram
          </Button>
          <p className="text-xs text-zinc-500 mt-6">
            Ainda não é cliente?{" "}
            <Link to="/instagram-nova-promo" className="text-yellow-500 underline">Conheça a ferramenta</Link>
          </p>
        </Card>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
      </div>
    );
  }

  // ---------------- Already registered ----------------
  if (existingPartner) {
    const base = "https://maisresultadosonline.com.br";
    const links = [
      { label: "Link principal (Instagram PRO)", url: `${base}/instagram-nova-promo?ref=${existingPartner.slug}` },
      { label: "Link Renda Extra", url: `${base}/renda-extra?ref=${existingPartner.slug}` },
    ];
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-3xl mx-auto p-6 md:p-12">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-4">
              <CheckCircle2 className="w-4 h-4" /> Afiliado Ativo
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-3">
              Olá, <span className="text-yellow-500">{existingPartner.name}</span>!
            </h1>
            <p className="text-zinc-400">Seu cadastro está ativo. Compartilhe seus links e ganhe R$ 97 por venda PRO.</p>
          </div>

          <Card className="bg-zinc-900 border-zinc-800 p-6 md:p-8 rounded-3xl mb-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-4">Seus links</h2>
            <div className="space-y-3">
              {links.map(l => (
                <div key={l.url} className="bg-black border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-500 mb-1">{l.label}</p>
                    <p className="text-sm text-yellow-500 font-mono break-all">{l.url}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => { navigator.clipboard.writeText(l.url); toast.success("Link copiado!"); }}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-black"
                  >
                    Copiar
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Button
            onClick={() => navigate("/afiliadosx/resumo")}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black h-16 rounded-2xl uppercase text-base"
          >
            <TrendingUp className="w-5 h-5 mr-2" />
            Acessar Dashboard Completo
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <p className="text-center text-xs text-zinc-500 mt-6">
            Senha do dashboard = mesma senha do seu login no /instagram
          </p>
        </div>
      </div>
    );
  }

  // ---------------- Registration form ----------------
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-900">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-6 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-6">
            <Sparkles className="w-4 h-4" /> Programa de Afiliados MRO
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
            Ganhe <span className="text-yellow-500">R$ 97</span> por venda aprovada
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Você já usa a ferramenta MRO Instagram. Agora ganhe divulgando para outros e receba{" "}
            <strong className="text-yellow-500">R$ 97 de comissão</strong> a cada venda aprovada do plano PRO.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-5xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-4">
        {[
          { icon: DollarSign, title: "R$ 97 por venda", desc: "Comissão fixa sobre cada plano PRO aprovado." },
          { icon: Eye, title: "100% transparente", desc: "Veja em tempo real quem tentou comprar no seu link, mesmo pagamentos não concluídos." },
          { icon: Zap, title: "Aviso automático", desc: "Recebe email a cada venda aprovada com detalhes da comissão." },
        ].map((b, i) => (
          <Card key={i} className="bg-zinc-900 border-zinc-800 p-6 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mb-4">
              <b.icon className="w-6 h-6 text-yellow-500" />
            </div>
            <h3 className="font-black uppercase text-sm mb-2">{b.title}</h3>
            <p className="text-zinc-400 text-sm">{b.desc}</p>
          </Card>
        ))}
      </section>

      {/* Form */}
      <section className="max-w-2xl mx-auto px-6 pb-16">
        <Card className="bg-zinc-900 border-zinc-800 p-6 md:p-10 rounded-3xl">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-2">Cadastrar como afiliado</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Preencha seus dados para receber seu link exclusivo. Você acessará o dashboard usando a{" "}
              <strong className="text-yellow-500">mesma senha do login no /instagram</strong> — não precisa criar senha nova.
            </p>
          </div>

          <div className="bg-black border border-zinc-800 rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-sm">
              <p className="text-zinc-400">Logado como cliente MRO:</p>
              <p className="font-black text-white">@{user?.username}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Photo */}
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2 block">
                Foto de perfil (opcional)
              </Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center overflow-hidden">
                  {photoPreview ? (
                    <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-8 h-8 text-zinc-600" />
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="border-zinc-700 bg-black hover:bg-zinc-900"
                  >
                    {uploadingPhoto ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
                    {photoPreview ? "Trocar foto" : "Enviar foto"}
                  </Button>
                  <p className="text-xs text-zinc-500 mt-1">Máx 3MB · JPG/PNG</p>
                </div>
              </div>
            </div>

            {/* Show on landing */}
            <div className="flex items-start justify-between gap-4 bg-black border border-zinc-800 rounded-xl p-4">
              <div>
                <p className="font-black text-sm">Exibir minha foto e nome no topo do site</p>
                <p className="text-xs text-zinc-500 mt-1">Ao ativar, quando alguém abrir seu link de venda verá seu nome e foto — gera mais conversão.</p>
              </div>
              <Switch
                checked={form.show_promo_banner}
                onCheckedChange={(v) => setForm(f => ({ ...f, show_promo_banner: v }))}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2 block">Nome</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))}
                  className="bg-black border-zinc-800 h-12 rounded-xl"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2 block">Sobrenome</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))}
                  className="bg-black border-zinc-800 h-12 rounded-xl"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2 block">
                Email (onde chegam os avisos de comissão)
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                className="bg-black border-zinc-800 h-12 rounded-xl"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2 block">
                Sua senha do /instagram (para confirmar sua identidade)
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  className="bg-black border-zinc-800 h-12 rounded-xl pr-16"
                  placeholder="mesma senha do /instagram"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-yellow-500 uppercase"
                >
                  {showPassword ? "Ocultar" : "Ver"}
                </button>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                É a mesma senha do seu usuário SquareCloud. Não guardamos senha nova — o dashboard usa a mesma.
              </p>
            </div>

            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 text-xs text-zinc-300 leading-relaxed">
              <p className="font-black text-yellow-500 mb-2 uppercase tracking-widest">O que você recebe por email:</p>
              <ul className="space-y-1 list-disc list-inside marker:text-yellow-500">
                <li>Seus 2 links de venda (Instagram PRO e Renda Extra)</li>
                <li>Link do dashboard <code>/afiliadosx/resumo</code></li>
                <li>Aviso a cada venda aprovada com valor da comissão</li>
              </ul>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black h-16 rounded-2xl uppercase text-base"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>Ativar meu cadastro de afiliado <ArrowRight className="w-5 h-5 ml-2" /></>
              )}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-zinc-500 mt-6 max-w-md mx-auto leading-relaxed">
          Programa válido apenas para clientes ativos MRO Instagram. Comissão paga por venda aprovada do plano PRO.
          Você verá em tempo real todas as tentativas de compra no seu dashboard.
        </p>
      </section>
    </div>
  );
}
