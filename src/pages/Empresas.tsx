import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { CheckCircle2, MessageCircle, Sparkles, TrendingUp, Users, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Settings {
  whatsapp_group_link: string;
  page_title: string | null;
  page_subtitle: string | null;
}

const Empresas = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ link: string } | null>(null);

  const [form, setForm] = useState({
    nome_completo: "",
    whatsapp: "",
    email: "",
    tem_empresa: "",
    vende_produto: "",
    presta_servico: "",
    iniciando_digital: "",
    marca_e_passa: "",
  });

  useEffect(() => {
    supabase
      .from("empresas_settings")
      .select("whatsapp_group_link, page_title, page_subtitle")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSettings(data as Settings | null));
  }, []);

  const scrollToForm = () => {
    document.getElementById("form")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_completo.trim() || !form.whatsapp.trim() || !form.email.trim()) {
      toast.error("Preencha nome, WhatsApp e email");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("empresas-register", {
        body: form,
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Erro ao cadastrar");
      setDone({ link: data.whatsappGroupLink });
      toast.success("Cadastro realizado! Confira seu email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold">Cadastro confirmado!</h1>
            <p className="text-muted-foreground">
              Enviamos um email com o link do grupo. Você também pode entrar agora:
            </p>
            <a href={done.link} target="_blank" rel="noreferrer">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                <MessageCircle className="w-5 h-5 mr-2" />
                PARTICIPAR DO GRUPO NO WHATSAPP
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <Helmet>
        <title>Grupo Grátis MRO Empresas - Cresça no Digital</title>
        <meta
          name="description"
          content="Participe grátis do grupo especial MRO para empresas, pequenos negócios, vendedores e prestadores de serviço."
        />
      </Helmet>

      {/* HERO */}
      <section className="px-6 pt-12 pb-10 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
          <Sparkles className="w-4 h-4" /> GRUPO ESPECIAL · 100% GRATUITO
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
          {settings?.page_title || "Aprenda grátis como a MRO pode te ajudar no seu negócio!"}
        </h1>
        <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
          {settings?.page_subtitle ||
            "Grupo Especial para empresas, pequenos negócios, vendedores e prestadores de serviço que precisam crescer no digital de forma real e constante."}
        </p>
        <Button
          size="lg"
          onClick={scrollToForm}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-base md:text-lg px-8 py-6 shadow-lg shadow-emerald-600/20"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          PARTICIPAR DO GRUPO GRÁTIS
        </Button>
        <p className="text-sm text-slate-500 mt-3">Vagas limitadas · sem custo</p>
      </section>

      {/* BENEFITS */}
      <section className="px-6 pb-12 max-w-5xl mx-auto grid md:grid-cols-3 gap-4">
        {[
          { icon: TrendingUp, t: "Crescimento Real", d: "Estratégias que funcionam para pequenos negócios no digital." },
          { icon: Users, t: "Comunidade Ativa", d: "Empresários, vendedores e prestadores trocando experiências." },
          { icon: Rocket, t: "Conteúdo Exclusivo", d: "Aprenda como usar a MRO para escalar suas vendas." },
        ].map(({ icon: Icon, t, d }) => (
          <Card key={t} className="border-emerald-100">
            <CardContent className="p-6">
              <Icon className="w-8 h-8 text-emerald-600 mb-3" />
              <h3 className="font-bold text-slate-900 mb-1">{t}</h3>
              <p className="text-sm text-slate-600">{d}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* CTA MID */}
      <section className="px-6 pb-12 text-center">
        <Button
          size="lg"
          onClick={scrollToForm}
          variant="outline"
          className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Participe grátis do grupo
        </Button>
      </section>

      {/* FORM */}
      <section id="form" className="px-6 pb-20">
        <Card className="max-w-xl mx-auto shadow-xl">
          <CardContent className="p-6 md:p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                Garanta sua vaga no grupo
              </h2>
              <p className="text-slate-600 mt-2">Preencha abaixo e receba o link por email.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="nome">Nome completo *</Label>
                <Input
                  id="nome"
                  value={form.nome_completo}
                  onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
                  maxLength={200}
                  required
                />
              </div>
              <div>
                <Label htmlFor="whatsapp">Número de WhatsApp *</Label>
                <Input
                  id="whatsapp"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  placeholder="(11) 99999-9999"
                  maxLength={30}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={255}
                  required
                />
              </div>

              {[
                { key: "tem_empresa", label: "Hoje você tem empresa?" },
                { key: "vende_produto", label: "Vende algum produto?" },
                { key: "presta_servico", label: "Presta algum serviço?" },
                { key: "iniciando_digital", label: "Está iniciando no digital?" },
                { key: "marca_e_passa", label: "Marca e passa (cliente recorrente)?" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <Label className="mb-2 block">{label}</Label>
                  <RadioGroup
                    value={(form as Record<string, string>)[key]}
                    onValueChange={(v) => setForm({ ...form, [key]: v })}
                    className="flex gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="sim" id={`${key}-sim`} />
                      <Label htmlFor={`${key}-sim`} className="font-normal cursor-pointer">Sim</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="nao" id={`${key}-nao`} />
                      <Label htmlFor={`${key}-nao`} className="font-normal cursor-pointer">Não</Label>
                    </div>
                  </RadioGroup>
                </div>
              ))}

              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-lg py-6"
              >
                {submitting ? "Enviando..." : (
                  <>
                    <MessageCircle className="w-5 h-5 mr-2" />
                    PARTICIPAR DO GRUPO GRÁTIS
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-slate-500">
                Ao enviar você concorda em receber o link do grupo no seu email.
              </p>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Empresas;
