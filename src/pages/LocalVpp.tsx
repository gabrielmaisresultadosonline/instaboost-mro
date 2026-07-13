import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Sparkles, Users, CheckCircle2, ArrowRight, ArrowLeft, Laptop, Monitor, Apple, XCircle,
  Scissors, Pizza, Bike, Beef, UtensilsCrossed, HelpCircle, Instagram, Rocket, ShieldCheck,
} from "lucide-react";

type BusinessType = "salao" | "pizzaria" | "delivery" | "hamburgueria" | "restaurante" | "outro";
type DeviceType = "notebook" | "desktop" | "macbook" | "nenhum";

const BUSINESS_OPTIONS: { id: BusinessType; label: string; icon: React.ReactNode }[] = [
  { id: "salao", label: "Salão de beleza", icon: <Scissors className="w-5 h-5" /> },
  { id: "pizzaria", label: "Pizzaria", icon: <Pizza className="w-5 h-5" /> },
  { id: "delivery", label: "Delivery", icon: <Bike className="w-5 h-5" /> },
  { id: "hamburgueria", label: "Hamburgueria", icon: <Beef className="w-5 h-5" /> },
  { id: "restaurante", label: "Restaurante", icon: <UtensilsCrossed className="w-5 h-5" /> },
  { id: "outro", label: "Outro", icon: <HelpCircle className="w-5 h-5" /> },
];

const DEVICE_OPTIONS: { id: DeviceType; label: string; icon: React.ReactNode }[] = [
  { id: "notebook", label: "Notebook", icon: <Laptop className="w-5 h-5" /> },
  { id: "desktop", label: "Computador de mesa", icon: <Monitor className="w-5 h-5" /> },
  { id: "macbook", label: "MacBook", icon: <Apple className="w-5 h-5" /> },
  { id: "nenhum", label: "Não tenho nenhum", icon: <XCircle className="w-5 h-5" /> },
];

const LocalVpp = () => {
  const [step, setStep] = useState(0); // 0 = landing; 1..5 = form steps; 6 = success
  const [loading, setLoading] = useState(false);
  const [groupLink, setGroupLink] = useState<string>("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [business, setBusiness] = useState<BusinessType | "">("");
  const [device, setDevice] = useState<DeviceType | "">("");
  const [instagram, setInstagram] = useState("");

  useEffect(() => {
    document.title = "MRO | Atraia mais clientes sem gastar com anúncios";
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("localvpp-admin", {
          body: { action: "get_public_settings" },
        });
        if (data?.settings?.whatsapp_group_link) setGroupLink(data.settings.whatsapp_group_link);
      } catch { /* ignore */ }
      const fbq = (window as any).fbq;
      if (fbq) fbq("track", "PageView");
    })();
  }, []);

  const openForm = () => {
    setStep(1);
    const fbq = (window as any).fbq;
    if (fbq) fbq("track", "Lead", { content_name: "LocalVPP Free Group" });
    setTimeout(() => document.getElementById("form-top")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const submitLead = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from("localvpp_leads").insert({
        nome_completo: nome.trim(),
        email: email.trim().toLowerCase() || null,
        whatsapp: whatsapp.replace(/\D/g, ""),
        business_type: business,
        device_type: device,
        instagram: instagram.trim() || null,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
      });
      if (error) throw error;
      const fbq = (window as any).fbq;
      if (fbq) fbq("track", "CompleteRegistration", { content_name: "LocalVPP Free Group" });
      setStep(8);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar cadastro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-400 selection:text-black overflow-x-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[10%] w-[500px] h-[500px] rounded-full bg-yellow-500/10 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-yellow-400/5 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-6 py-10 md:py-16">
        {/* HERO */}
        {step === 0 && (
          <>
            <div className="text-center space-y-6 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-[11px] font-black uppercase tracking-[0.2em]">
                <Sparkles className="w-3.5 h-3.5" /> 100% Grátis
              </div>

              <h1 className="text-4xl md:text-6xl font-black leading-[1.02] tracking-tight uppercase">
                Precisa de <span className="text-yellow-400">público local?</span>
              </h1>
              <p className="text-xl md:text-2xl text-neutral-200 font-bold">
                Não gaste com anúncios — utilize a <span className="text-yellow-400">ferramenta MRO</span>!
              </p>

              <div className="pt-2 space-y-3 text-neutral-300 text-base md:text-lg">
                <p className="font-semibold">Especial para você que tem um:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {["Salão de beleza", "Delivery", "Diskbebidas", "Restaurante", "Pizzaria", "Hamburgueria"].map((t) => (
                    <span key={t} className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-sm font-bold">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-base md:text-lg text-neutral-300 leading-relaxed max-w-2xl mx-auto pt-4">
                Já ajudamos <span className="text-yellow-400 font-black">mais de 1.800 empresas</span>.
                Participe do grupo e entenda tudo completo — <span className="text-yellow-400 font-black">GRÁTIS!</span>
              </p>

              <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 md:p-6 max-w-2xl mx-auto text-left">
                <p className="text-neutral-200 text-sm md:text-base">
                  💻 Precisa apenas ter um <span className="text-yellow-400 font-bold">notebook básico</span> para instalar,
                  utilizar e deixar rodando no automático.
                </p>
              </div>

              <p className="text-2xl md:text-3xl font-black uppercase pt-2">
                Participe do grupo grátis e entenda tudo!
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button onClick={openForm} size="lg" className="group bg-yellow-400 hover:bg-yellow-300 text-black font-black h-14 px-8 rounded-xl text-base tracking-wide shadow-[0_0_40px_rgba(250,204,21,0.35)] hover:shadow-[0_0_60px_rgba(250,204,21,0.6)] transition-all animate-pulse">
                  <Rocket className="mr-2 w-5 h-5" /> PARTICIPE GRÁTIS
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition" />
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-neutral-500 text-xs uppercase tracking-widest font-semibold">
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-yellow-400" /> +1.800 empresas</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-yellow-400" /> Método validado</div>
                <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-yellow-400" /> 100% Grátis</div>
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="mt-16 md:mt-20 text-center">
              <Button onClick={openForm} size="lg" className="group bg-yellow-400 hover:bg-yellow-300 text-black font-black h-14 px-10 rounded-xl text-base tracking-wide shadow-[0_0_40px_rgba(250,204,21,0.35)] animate-pulse">
                <Rocket className="mr-2 w-5 h-5" /> PARTICIPE GRÁTIS
              </Button>
            </div>
          </>
        )}

        {/* FORM */}
        {step >= 1 && step <= 7 && (
          <div id="form-top" className="max-w-xl mx-auto">
            <div className="relative rounded-[2rem] p-[1.5px] bg-gradient-to-br from-yellow-400/60 via-yellow-500/40 to-yellow-400/60 shadow-[0_20px_60px_-15px_rgba(245,158,11,0.35)]">
              <div className="rounded-[1.9rem] bg-gradient-to-b from-zinc-950 to-black p-6 sm:p-8">
                {/* Progress */}
                <div className="flex items-center gap-2 mb-6">
                  {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                    <div
                      key={s}
                      className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-yellow-400" : "bg-neutral-800"}`}
                    />
                  ))}
                </div>
                <p className="text-[11px] uppercase tracking-widest text-yellow-300 font-black mb-2">Etapa {step} de 7</p>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-6">
                  Preencha o formulário para participar grátis.
                </h2>

                {/* Step 1: name */}
                {step === 1 && (
                  <div className="space-y-4">
                    <Label className="text-sm font-bold text-neutral-200">Nome completo</Label>
                    <Input
                      autoFocus
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Seu nome completo"
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-12"
                    />
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => {
                          if (!nome.trim() || nome.trim().split(/\s+/).length < 2) return toast.error("Informe seu nome completo");
                          setStep(2);
                        }}
                        className="bg-yellow-400 hover:bg-yellow-300 text-black font-black h-12 px-8"
                      >
                        Avançar <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2: whatsapp */}
                {step === 2 && (
                  <div className="space-y-4">
                    <Label className="text-sm font-bold text-neutral-200">Número de WhatsApp</Label>
                    <Input
                      autoFocus
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="(11) 99999-9999"
                      inputMode="numeric"
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-12"
                    />
                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep(1)} className="border-neutral-700 bg-neutral-900 text-white h-12">
                        <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
                      </Button>
                      <Button
                        onClick={() => {
                          if (whatsapp.replace(/\D/g, "").length < 10) return toast.error("WhatsApp inválido");
                          setStep(3);
                        }}
                        className="bg-yellow-400 hover:bg-yellow-300 text-black font-black h-12 px-8"
                      >
                        Avançar <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: email */}
                {step === 3 && (
                  <div className="space-y-4">
                    <Label className="text-sm font-bold text-neutral-200">Seu melhor e-mail</Label>
                    <Input
                      autoFocus
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@email.com"
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-12"
                    />
                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep(2)} className="border-neutral-700 bg-neutral-900 text-white h-12">
                        <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
                      </Button>
                      <Button
                        onClick={() => {
                          if (!email.includes("@")) return toast.error("E-mail inválido");
                          setStep(4);
                        }}
                        className="bg-yellow-400 hover:bg-yellow-300 text-black font-black h-12 px-8"
                      >
                        Avançar <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 4: business type */}
                {step === 4 && (
                  <div className="space-y-4">
                    <p className="text-neutral-300 font-semibold">Você tem hoje o quê?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {BUSINESS_OPTIONS.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setBusiness(o.id)}
                          className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left font-bold transition-all ${
                            business === o.id
                              ? "bg-yellow-400 text-black border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]"
                              : "bg-zinc-900 border-zinc-700 text-white hover:border-yellow-400/60"
                          }`}
                        >
                          <span className={business === o.id ? "text-black" : "text-yellow-400"}>{o.icon}</span>
                          {o.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep(3)} className="border-neutral-700 bg-neutral-900 text-white h-12">
                        <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
                      </Button>
                      <Button
                        onClick={() => {
                          if (!business) return toast.error("Selecione uma opção");
                          setStep(5);
                        }}
                        className="bg-yellow-400 hover:bg-yellow-300 text-black font-black h-12 px-8"
                      >
                        Avançar <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 5: device */}
                {step === 5 && (
                  <div className="space-y-4">
                    <p className="text-neutral-300 font-semibold">
                      Você tem notebook, computador de mesa ou MacBook?
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {DEVICE_OPTIONS.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setDevice(o.id)}
                          className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left font-bold transition-all ${
                            device === o.id
                              ? o.id === "nenhum"
                                ? "bg-red-500 text-white border-red-500"
                                : "bg-yellow-400 text-black border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]"
                              : "bg-zinc-900 border-zinc-700 text-white hover:border-yellow-400/60"
                          }`}
                        >
                          <span className={device === o.id ? (o.id === "nenhum" ? "text-white" : "text-black") : "text-yellow-400"}>
                            {o.icon}
                          </span>
                          {o.label}
                        </button>
                      ))}
                    </div>

                    {device === "nenhum" && (
                      <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-5 text-red-100">
                        <p className="font-black mb-2">Poxa, infelizmente não vai conseguir participar 😔</p>
                        <p className="text-sm text-red-100/90 leading-relaxed">
                          Você precisa ter pelo menos uma máquina para conseguir instalar e utilizar nossa ferramenta e
                          nosso método. Quando tiver um computador de mesa, notebook ou Mac, volte aqui novamente.
                          Obrigado pelo interesse!
                        </p>
                      </div>
                    )}

                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep(4)} className="border-neutral-700 bg-neutral-900 text-white h-12">
                        <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
                      </Button>
                      <Button
                        onClick={() => {
                          if (!device) return toast.error("Selecione uma opção");
                          if (device === "nenhum") return toast.error("Você precisa ter uma máquina para prosseguir");
                          setStep(6);
                        }}
                        disabled={device === "nenhum"}
                        className="bg-yellow-400 hover:bg-yellow-300 text-black font-black h-12 px-8 disabled:opacity-40"
                      >
                        Avançar <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 6: instagram */}
                {step === 6 && (
                  <div className="space-y-4">
                    <p className="text-neutral-300 font-semibold">Qual é o seu Instagram?</p>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400" />
                      <Input
                        autoFocus
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value.replace(/^@/, ""))}
                        placeholder="seu.instagram"
                        className="pl-11 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-12"
                      />
                    </div>
                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep(5)} className="border-neutral-700 bg-neutral-900 text-white h-12">
                        <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
                      </Button>
                      <Button
                        onClick={() => {
                          if (!instagram.trim()) return toast.error("Informe seu Instagram");
                          setStep(7);
                        }}
                        className="bg-yellow-400 hover:bg-yellow-300 text-black font-black h-12 px-8"
                      >
                        Avançar <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 7: review + submit */}
                {step === 7 && (
                  <div className="space-y-4">
                    <p className="text-neutral-300 font-semibold">Confira seus dados antes de finalizar:</p>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2 text-sm">
                      <Row label="Nome" value={nome} />
                      <Row label="WhatsApp" value={whatsapp} />
                      <Row label="E-mail" value={email} />
                      <Row label="Negócio" value={BUSINESS_OPTIONS.find((b) => b.id === business)?.label || "—"} />
                      <Row label="Dispositivo" value={DEVICE_OPTIONS.find((d) => d.id === device)?.label || "—"} />
                      <Row label="Instagram" value={`@${instagram}`} />
                    </div>
                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep(6)} className="border-neutral-700 bg-neutral-900 text-white h-12">
                        <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
                      </Button>
                      <Button
                        onClick={submitLead}
                        disabled={loading}
                        className="bg-yellow-400 hover:bg-yellow-300 text-black font-black h-12 px-8"
                      >
                        {loading ? "Enviando..." : (<>Finalizar <CheckCircle2 className="ml-2 w-4 h-4" /></>)}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {step === 8 && (
          <div className="max-w-xl mx-auto text-center">
            <div className="rounded-[2rem] p-[1.5px] bg-gradient-to-br from-green-400/60 via-yellow-400/40 to-green-400/60">
              <div className="rounded-[1.9rem] bg-gradient-to-b from-zinc-950 to-black p-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 ring-2 ring-green-400/40 mb-4">
                  <CheckCircle2 className="w-12 h-12 text-green-400" />
                </div>
                <h2 className="text-3xl md:text-4xl font-black mb-3">Parabéns! 🎉</h2>
                <p className="text-neutral-200 text-base md:text-lg leading-relaxed mb-4">
                  Seu interesse foi registrado com sucesso. Participe agora do nosso grupo no botão abaixo.
                </p>
                <p className="text-neutral-400 text-sm mb-6">
                  Enviamos também o link no seu e-mail. <span className="text-yellow-400 font-bold">Participe agora
                  e aprenda tudo por completo!</span>
                </p>
                {groupLink ? (
                  <a
                    href={groupLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-black h-14 rounded-xl text-base animate-pulse shadow-[0_0_40px_rgba(34,197,94,0.4)]"
                  >
                    📱 ENTRAR NO GRUPO DO WHATSAPP <ArrowRight className="w-5 h-5" />
                  </a>
                ) : (
                  <p className="text-yellow-300 text-sm">
                    Em instantes você recebe o link do grupo no seu e-mail e WhatsApp.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4">
    <span className="text-neutral-500 font-semibold">{label}</span>
    <span className="text-white font-bold text-right break-all">{value}</span>
  </div>
);

export default LocalVpp;
