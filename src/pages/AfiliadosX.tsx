import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/userStorage";
import type { MROUser } from "@/types/user";
import {
  ArrowRight, Camera, CheckCircle2, Copy, DollarSign, Eye, Loader2,
  Lock, Sparkles, TrendingUp, User as UserIcon,
} from "lucide-react";

interface CreatedAffiliate {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  links: {
    promo: string;
    promoRendaExtra: string;
    dashboard: string;
  };
}

export default function AfiliadosX() {
  const navigate = useNavigate();
  const [user, setUser] = useState<MROUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [created, setCreated] = useState<CreatedAffiliate | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    desired_id: "",
    email: "",
    password: "",
    photo_url: "" as string,
  });

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setUser(u);
      if (u) {
        setForm(f => ({
          ...f,
          first_name: f.first_name || (u.username || ""),
          desired_id: f.desired_id || (u.username || "").toLowerCase(),
        }));
      }
      setChecking(false);
    })();
  }, []);

  const handlePhotoPick = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem válida");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 3MB)");
      return;
    }
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `afiliadosx/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("assets").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("assets").getPublicUrl(path);
      setPhotoPreview(data.publicUrl);
      setForm(f => ({ ...f, photo_url: data.publicUrl }));
    } catch (e: any) {
      toast.error("Falha no upload: " + (e?.message || "erro"));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const submit = async () => {
    if (!user) return;
    if (!form.first_name.trim()) return toast.error("Informe seu nome");
    if (!form.email.includes("@")) return toast.error("Email inválido");
    if (!form.password || form.password.length < 3) return toast.error("Informe sua senha MRO");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("afiliadosx", {
        body: {
          action: "register",
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          desired_id: form.desired_id.trim(),
          email: form.email.trim().toLowerCase(),
          squarecloud_username: user.username.toLowerCase(),
          password: form.password,
          photo_url: form.photo_url || null,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao cadastrar");
      setCreated(data.affiliate as CreatedAffiliate);
      toast.success("Afiliado ativado! Confira seu email.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Copiado"));
  };

  // -------- Not logged in gate --------
  if (checking) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <Card className="max-w-lg w-full bg-zinc-950 border-yellow-500/30 p-8 text-center">
          <Lock className="w-14 h-14 mx-auto text-yellow-500 mb-4" />
          <h1 className="text-2xl font-black mb-2">Programa de Afiliados MRO</h1>
          <p className="text-zinc-400 mb-6 text-sm">
            Este programa é exclusivo para clientes ativos MRO Instagram. Faça login primeiro em <strong className="text-yellow-500">/instagram</strong> e volte aqui.
          </p>
          <Button onClick={() => navigate("/instagram")} className="bg-yellow-500 hover:bg-yellow-400 text-black font-black w-full">
            Ir para /instagram <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
      </div>
    );
  }

  // -------- Success view --------
  if (created) {
    const base = window.location.origin;
    const items = [
      { label: "Link principal (Instagram PRO)", href: base + created.links.promo },
      { label: "Link Renda Extra", href: base + created.links.promoRendaExtra },
      { label: "Painel Dashboard", href: base + created.links.dashboard },
    ];
    return (
      <div className="min-h-screen bg-black text-white px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/40 p-8 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h1 className="text-3xl font-black mb-2">Você é oficialmente afiliado(a) MRO 🎉</h1>
            <p className="text-zinc-400 text-sm">
              Enviamos os links para <strong className="text-white">{created.email}</strong>. A senha do dashboard é a mesma do <strong className="text-yellow-500">/instagram</strong>.
            </p>
          </Card>

          <Card className="bg-zinc-950 border-zinc-800 p-6 space-y-4">
            {items.map(it => (
              <div key={it.href} className="space-y-1">
                <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">{it.label}</p>
                <div className="flex gap-2">
                  <Input readOnly value={it.href} className="bg-black border-zinc-800 text-yellow-400 text-xs" />
                  <Button size="sm" variant="outline" onClick={() => copy(it.href)} className="border-yellow-500/40">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </Card>

          <div className="flex gap-3">
            <Button onClick={() => navigate(created.links.dashboard)} className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-black">
              Ir para o Dashboard
            </Button>
            <Button variant="outline" asChild className="border-zinc-700">
              <Link to="/instagram">Voltar</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // -------- Registration form --------
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-red-500/10" />
        <div className="relative max-w-5xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-black uppercase tracking-widest text-yellow-400">Exclusivo para clientes MRO</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black leading-[1.05] mb-4">
            Ganhe <span className="text-yellow-400">R$ 97</span> por venda<br />aprovada como afiliado(a)
          </h1>
          <p className="text-zinc-400 max-w-2xl mx-auto text-base md:text-lg">
            Você já usa a ferramenta — divulgue, receba em cada venda PRO aprovada e acompanhe tudo em tempo real no seu painel.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-5xl mx-auto px-4 pb-10 grid md:grid-cols-3 gap-4">
        {[
          { icon: DollarSign, title: "R$ 97 por venda", desc: "Comissão fixa sobre cada plano PRO aprovado no seu link." },
          { icon: Eye,        title: "100% transparente", desc: "Você vê em tempo real tentativas e vendas aprovadas." },
          { icon: TrendingUp, title: "Dois links prontos", desc: "Instagram PRO e Renda Extra — divulgue onde quiser." },
        ].map(b => (
          <Card key={b.title} className="bg-zinc-950 border-zinc-800 p-5">
            <b.icon className="w-6 h-6 text-yellow-400 mb-3" />
            <p className="font-black mb-1">{b.title}</p>
            <p className="text-xs text-zinc-500 leading-relaxed">{b.desc}</p>
          </Card>
        ))}
      </section>

      {/* Form */}
      <section className="max-w-2xl mx-auto px-4 pb-20">
        <Card className="bg-zinc-950 border-yellow-500/30 p-6 md:p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <UserIcon className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-black">Ativar meu cadastro</h2>
          </div>
          <p className="text-xs text-zinc-500">
            Você entrará como <strong className="text-yellow-400">{user.username}</strong>. Para validar, informe a mesma senha usada no <strong>/instagram</strong>.
          </p>

          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-6 h-6 text-zinc-600" />
              )}
            </div>
            <div className="flex-1">
              <Label className="text-xs uppercase tracking-widest text-zinc-500 font-black">Foto (opcional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoPick(f); }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 border-zinc-700"
                disabled={uploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : "Escolher foto"}
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-widest text-zinc-500 font-black">Nome</Label>
              <Input
                value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                className="bg-black border-zinc-800 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-zinc-500 font-black">Sobrenome</Label>
              <Input
                value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                className="bg-black border-zinc-800 mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest text-zinc-500 font-black">Identificador do link (opcional)</Label>
            <Input
              value={form.desired_id}
              onChange={e => setForm(f => ({ ...f, desired_id: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") }))}
              placeholder="ex.: joao"
              className="bg-black border-zinc-800 mt-1"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Seus links serão <span className="text-yellow-400">/promo/{form.desired_id || "seuid"}</span> e <span className="text-yellow-400">/promorendaextra/{form.desired_id || "seuid"}</span>
            </p>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest text-zinc-500 font-black">Email para receber comissões</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="bg-black border-zinc-800 mt-1"
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest text-zinc-500 font-black">Sua senha MRO (a mesma do /instagram)</Label>
            <Input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="bg-black border-zinc-800 mt-1"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Também será a senha do seu painel de resumo.
            </p>
          </div>

          <Button
            onClick={submit}
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black text-base py-6"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>Ativar meu cadastro <ArrowRight className="w-5 h-5 ml-2" /></>
            )}
          </Button>

          <p className="text-[11px] text-zinc-500 text-center">
            Ao ativar, você concorda que enviaremos os links de venda e o acesso do painel para o email informado.
          </p>
        </Card>
      </section>
    </div>
  );
}
