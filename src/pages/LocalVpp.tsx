import { useEffect, useState } from "react";
import { trackLead } from "@/lib/facebookTracking";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Users, CheckCircle2, ArrowRight, ArrowLeft, Laptop, Monitor, Apple, XCircle,
  Scissors, Pizza, Bike, Beef, UtensilsCrossed, HelpCircle, Instagram, Rocket, ShieldCheck, Building2,
} from "lucide-react";

type BusinessType = "salao" | "pizzaria" | "delivery" | "hamburgueria" | "restaurante" | "outro";
type DeviceType = "notebook" | "desktop" | "macbook" | "nenhum";
type Objective = "vender_mais" | "curiosidade" | "";

const WHATSAPP_PHONE = "555192835863";
const WA_MSG_VENDER = "Vim pelo site, gostaria de saber mais !";
const WA_MSG_CURIOSIDADE = "Vi o anúncio passando e gostaria de entender como funciona !";
const waLink = (msg: string) => `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;

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

const TOTAL_STEPS = 8;

const LocalVpp = () => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [business, setBusiness] = useState<BusinessType | "">("");
  const [device, setDevice] = useState<DeviceType | "">("");
  const [instagram, setInstagram] = useState("");
  const [objetivo, setObjetivo] = useState<Objective>("");
  const [askAgain, setAskAgain] = useState(false); // segunda pergunta se disse "não"
  const [finalWaMsg, setFinalWaMsg] = useState<string>(WA_MSG_VENDER);

  useEffect(() => {
    document.title = "MRO | Atraia mais clientes sem gastar com anúncios";
    const fbq = (window as any).fbq;
    if (fbq) fbq("track", "PageView");
  }, []);

  const openForm = () => {
    setStep(1);
    setTimeout(() => document.getElementById("form-top")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const submitLead = async (finalObjetivo: Objective, waMsg: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("localvpp-admin", {
        body: {
          action: "submit_lead",
          nome: nome.trim(),
          empresa: empresa.trim(),
          email: email.trim().toLowerCase(),
          whatsapp: whatsapp.replace(/\D/g, ""),
          business_type: business,
          device_type: device,
          instagram: instagram.trim(),
          objetivo: finalObjetivo,
          referrer: document.referrer || null,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao enviar");
      // Lead bloqueado (sem máquina): salva contato, mas não envia email/libera WhatsApp/pixel
      if (data?.blocked) {
        setStep(10); // tela de bloqueio
        return;
      }
      // Pixel de Lead APENAS quando o usuário tem máquina e será direcionado ao WhatsApp
      const hasDevice = device === "notebook" || device === "desktop" || device === "macbook";
      if (hasDevice) {
        const fbq = (window as any).fbq;
        if (fbq) {
          fbq("track", "Lead", { content_name: "LocalVPP Contato", content_category: "Lead" });
          fbq("track", "CompleteRegistration", { content_name: "LocalVPP Contato" });
        }
        trackLead("LocalVPP Contato");
      }
      setFinalWaMsg(waMsg);
      setStep(9); // sucesso — abre WhatsApp automático
      // Abre o WhatsApp direto (nova aba); fallback é o botão na tela
      setTimeout(() => {
        try { window.open(waLink(waMsg), "_blank", "noopener"); } catch { /* ignore */ }
      }, 300);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar cadastro");
    } finally {
      setLoading(false);
    }
  };

  // Salva lead automaticamente ao selecionar "nenhum" (sem avançar)
  const saveBlockedLead = async () => {
    try {
      await supabase.functions.invoke("localvpp-admin", {
        body: {
          action: "submit_lead",
          nome: nome.trim() || "Sem nome",
          empresa: empresa.trim(),
          email: email.trim().toLowerCase() || `sem-email-${Date.now()}@localvpp.local`,
          whatsapp: whatsapp.replace(/\D/g, "") || "0000000000",
          business_type: business || "outro",
          device_type: "nenhum",
          instagram: instagram.trim(),
          objetivo: objetivo || "",
          referrer: document.referrer || null,
        },
      });
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-400 selection:text-black overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[10%] w-[500px] h-[500px] rounded-full bg-yellow-500/10 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-yellow-400/5 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className={`relative z-10 max-w-5xl mx-auto px-5 sm:px-6 ${step === 0 ? "py-10 md:py-16" : "min-h-screen flex items-center justify-center py-8"}`}>
        {/* HERO */}
        {step === 0 && (
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <h1 className="mt-7 text-[38px] leading-[0.95] sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-[-0.03em] uppercase">
              Mais Vendas{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_4px_20px_rgba(250,204,21,0.35)]">
                  Sem investir
                </span>
              </span>
              <br className="hidden sm:block" /> em anúncios!
            </h1>

            <p className="mt-6 text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white">
              UTILIZE A <span className="text-yellow-400">MRO!</span>
            </p>

            <div className="mt-10 w-full max-w-2xl">
              <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-neutral-500 font-black mb-4">
                Especial para você que tem
              </p>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
                {["Salão de beleza", "Delivery", "Diskbebidas", "Restaurante", "Pizzaria", "Hamburgueria"].map((t) => (
                  <span key={t} className="px-3.5 py-2 rounded-full bg-neutral-900/80 border border-neutral-800 text-sm font-bold text-neutral-200 backdrop-blur">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <p className="mt-10 text-base sm:text-lg md:text-xl text-neutral-300 leading-relaxed max-w-2xl">
              Já ajudamos <span className="text-yellow-400 font-black">mais de 1.800 empresas</span> a atrair mais clientes.
              Agora é a sua vez.
            </p>

            <div className="mt-6 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 md:p-6 max-w-2xl w-full">
              <p className="text-neutral-200 text-sm md:text-base leading-relaxed">
                💻 Basta ter um <span className="text-yellow-400 font-black">notebook básico</span> para instalar,
                utilizar e deixar rodando no automático.
              </p>
            </div>

            <div className="mt-8 max-w-2xl w-full text-center">
              <p className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
                Precisa de <span className="text-yellow-400">público local?</span>
              </p>
              <p className="mt-2 text-lg sm:text-xl md:text-2xl text-neutral-200 font-bold">
                Não gaste com anúncios — utilize a{" "}
                <span className="text-yellow-400">ferramenta MRO</span>.
              </p>
            </div>

            <div className="mt-14 w-full max-w-2xl">
              <div className="relative rounded-[2rem] p-[2px] bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600 shadow-[0_25px_80px_-20px_rgba(250,204,21,0.6)]">
                <div className="absolute -inset-4 bg-yellow-400/20 blur-3xl rounded-[2rem] -z-10" />
                <div className="rounded-[1.9rem] bg-gradient-to-b from-zinc-950 to-black px-6 sm:px-10 py-8 sm:py-10 flex flex-col items-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/15 border border-green-400/40 text-green-300 text-[10px] font-black uppercase tracking-[0.25em]">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Atendimento aberto agora
                  </div>
                  <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight leading-[1] text-center">
                    Entre em <span className="text-yellow-400">contato</span> conosco
                    <br className="hidden sm:block" /> e saiba mais!
                  </h2>
                  <p className="mt-3 text-neutral-400 text-sm sm:text-base max-w-md">
                    Fale com nosso time no WhatsApp e entenda como a MRO pode te ajudar a vender mais.
                  </p>
                  <Button
                    onClick={openForm}
                    size="lg"
                    className="group mt-6 w-full sm:w-auto bg-yellow-400 hover:bg-yellow-300 text-black font-black h-16 px-10 rounded-2xl text-base sm:text-lg tracking-wide shadow-[0_0_50px_rgba(250,204,21,0.5)] hover:shadow-[0_0_70px_rgba(250,204,21,0.75)] transition-all animate-pulse"
                  >
                    <Rocket className="mr-2 w-5 h-5" /> QUERO FALAR AGORA
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition" />
                  </Button>
                  <p className="mt-3 text-[11px] uppercase tracking-widest text-neutral-500 font-bold">
                    Leva menos de 1 minuto
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-neutral-500 text-xs uppercase tracking-widest font-semibold">
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-yellow-400" /> +1.800 empresas</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-yellow-400" /> Método validado</div>
              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-yellow-400" /> Atendimento humano</div>
            </div>
          </div>
        )}

        {/* FORM */}
        {step >= 1 && step <= 8 && (
          <div id="form-top" className="w-full max-w-xl mx-auto">
            <div className="relative rounded-[2rem] p-[1.5px] bg-gradient-to-br from-yellow-400/60 via-yellow-500/40 to-yellow-400/60 shadow-[0_20px_60px_-15px_rgba(245,158,11,0.35)]">
              <div className="rounded-[1.9rem] bg-gradient-to-b from-zinc-950 to-black p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-6">
                  {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i + 1 <= step ? "bg-yellow-400" : "bg-neutral-800"}`} />
                  ))}
                </div>
                <p className="text-[11px] uppercase tracking-widest text-yellow-300 font-black mb-2">Etapa {step} de {TOTAL_STEPS}</p>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-6">
                  Preencha para falar com nosso time.
                </h2>

                {/* 1: nome */}
                {step === 1 && (
                  <div className="space-y-4">
                    <Label className="text-sm font-bold text-neutral-200">Nome completo</Label>
                    <Input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo"
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-12" />
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => {
                          if (!nome.trim() || nome.trim().split(/\s+/).length < 2) return toast.error("Informe seu nome completo");
                          setStep(2);
                        }}
                        className="bg-yellow-400 hover:bg-yellow-300 text-black font-black h-12 px-8">
                        Avançar <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* 2: empresa */}
                {step === 2 && (
                  <div className="space-y-4">
                    <Label className="text-sm font-bold text-neutral-200">Nome da sua empresa</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400" />
                      <Input autoFocus value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ex: Pizzaria do João"
                        className="pl-11 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-12" />
                    </div>
                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep(1)} className="border-neutral-700 bg-neutral-900 text-white h-12">
                        <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
                      </Button>
                      <Button
                        onClick={() => {
                          if (!empresa.trim()) return toast.error("Informe o nome da empresa");
                          setStep(3);
                        }}
                        className="bg-yellow-400 hover:bg-yellow-300 text-black font-black h-12 px-8">
                        Avançar <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* 3: negócio */}
                {step === 3 && (
                  <div className="space-y-4">
                    <p className="text-neutral-300 font-semibold">Qual seu tipo de negócio?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {BUSINESS_OPTIONS.map((o) => (
                        <button key={o.id} type="button" onClick={() => setBusiness(o.id)}
                          className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left font-bold transition-all ${
                            business === o.id
                              ? "bg-yellow-400 text-black border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]"
                              : "bg-zinc-900 border-zinc-700 text-white hover:border-yellow-400/60"
                          }`}>
                          <span className={business === o.id ? "text-black" : "text-yellow-400"}>{o.icon}</span>
                          {o.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep(2)} className="border-neutral-700 bg-neutral-900 text-white h-12">
                        <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
                      </Button>
                      <Button
                        onClick={() => { if (!business) return toast.error("Selecione uma opção"); setStep(4); }}
                        className="bg-yellow-400 hover:bg-yellow-300 text-black font-black h-12 px-8">
                        Avançar <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* 4: whatsapp */}
                {step === 4 && (
                  <div className="space-y-4">
                    <Label className="text-sm font-bold text-neutral-200">Número de WhatsApp</Label>
                    <Input autoFocus value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="(11) 99999-9999" inputMode="numeric"
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-12" />
                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep(3)} className="border-neutral-700 bg-neutral-900 text-white h-12">
                        <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
                      </Button>
                      <Button
                        onClick={() => {
                          if (whatsapp.replace(/\D/g, "").length < 10) return toast.error("WhatsApp inválido");
                          setStep(5);
                        }}
                        className="bg-yellow-400 hover:bg-yellow-300 text-black font-black h-12 px-8">
                        Avançar <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* 5: email */}
                {step === 5 && (
                  <div className="space-y-4">
                    <Label className="text-sm font-bold text-neutral-200">Seu melhor e-mail</Label>
                    <Input autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@email.com"
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-12" />
                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep(4)} className="border-neutral-700 bg-neutral-900 text-white h-12">
                        <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
                      </Button>
                      <Button
                        onClick={() => { if (!email.includes("@")) return toast.error("E-mail inválido"); setStep(6); }}
                        className="bg-yellow-400 hover:bg-yellow-300 text-black font-black h-12 px-8">
                        Avançar <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* 6: dispositivo */}
                {step === 6 && (
                  <div className="space-y-4">
                    <p className="text-neutral-300 font-semibold">Você tem notebook, computador de mesa ou MacBook?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {DEVICE_OPTIONS.map((o) => (
                        <button key={o.id} type="button"
                          onClick={() => { setDevice(o.id); if (o.id === "nenhum") saveBlockedLead(); }}
                          className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left font-bold transition-all ${
                            device === o.id
                              ? o.id === "nenhum" ? "bg-red-500 text-white border-red-500" : "bg-yellow-400 text-black border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]"
                              : "bg-zinc-900 border-zinc-700 text-white hover:border-yellow-400/60"
                          }`}>
                          <span className={device === o.id ? (o.id === "nenhum" ? "text-white" : "text-black") : "text-yellow-400"}>{o.icon}</span>
                          {o.label}
                        </button>
                      ))}
                    </div>

                    {device === "nenhum" && (
                      <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-5 text-red-100">
                        <p className="font-black mb-2">Poxa, infelizmente não vai conseguir continuar 😔</p>
                        <p className="text-sm text-red-100/90 leading-relaxed">
                          Você precisa ter pelo menos uma máquina (notebook, computador ou Mac) para conseguir instalar e utilizar nossa ferramenta.
                          Guardamos seu contato — quando tiver, volte aqui novamente. Obrigado pelo interesse!
                        </p>
                      </div>
                    )}

                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep(5)} className="border-neutral-700 bg-neutral-900 text-white h-12">
                        <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
                      </Button>
                      <Button
                        onClick={() => {
                          if (!device) return toast.error("Selecione uma opção");
                          if (device === "nenhum") return toast.error("Você precisa ter uma máquina para prosseguir");
                          setStep(7);
                        }}
                        disabled={device === "nenhum"}
                        className="bg-yellow-400 hover:bg-yellow-300 text-black font-black h-12 px-8 disabled:opacity-40">
                        Avançar <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* 7: instagram */}
                {step === 7 && (
                  <div className="space-y-4">
                    <p className="text-neutral-300 font-semibold">Qual é o seu Instagram?</p>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400" />
                      <Input autoFocus value={instagram}
                        onChange={(e) => setInstagram(e.target.value.replace(/^@/, ""))}
                        placeholder="seu.instagram"
                        className="pl-11 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-12" />
                    </div>
                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep(6)} className="border-neutral-700 bg-neutral-900 text-white h-12">
                        <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
                      </Button>
                      <Button
                        onClick={() => { if (!instagram.trim()) return toast.error("Informe seu Instagram"); setStep(8); }}
                        className="bg-yellow-400 hover:bg-yellow-300 text-black font-black h-12 px-8">
                        Avançar <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* 8: objetivo */}
                {step === 8 && (
                  <div className="space-y-4">
                    {!askAgain ? (
                      <>
                        <p className="text-xl font-black text-white leading-snug">
                          Seu objetivo é <span className="text-yellow-400">aumentar suas vendas</span> hoje?
                        </p>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => { setObjetivo("vender_mais"); submitLead("vender_mais", WA_MSG_VENDER); }}
                            className="px-4 py-4 rounded-xl bg-yellow-400 text-black font-black hover:bg-yellow-300 transition-all disabled:opacity-50">
                            Sim
                          </button>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => setAskAgain(true)}
                            className="px-4 py-4 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-black hover:border-yellow-400/60 transition-all disabled:opacity-50">
                            Não
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-black text-white leading-snug">
                          Você hoje está apenas por <span className="text-yellow-400">curiosidade</span> e gostaria de saber mais?
                        </p>
                        <div className="grid grid-cols-1 gap-3 pt-2">
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => { setObjetivo("curiosidade"); submitLead("curiosidade", WA_MSG_CURIOSIDADE); }}
                            className="px-4 py-4 rounded-xl bg-yellow-400 text-black font-black hover:bg-yellow-300 transition-all disabled:opacity-50">
                            Isso mesmo
                          </button>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => setAskAgain(false)}
                            className="px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-neutral-300 font-semibold hover:border-yellow-400/60 transition-all disabled:opacity-50">
                            Voltar
                          </button>
                        </div>
                      </>
                    )}
                    {loading && <p className="text-neutral-400 text-sm text-center pt-2">Enviando...</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {step === 9 && (
          <div className="w-full max-w-xl mx-auto text-center">
            <div className="rounded-[2rem] p-[1.5px] bg-gradient-to-br from-green-400/60 via-yellow-400/40 to-green-400/60">
              <div className="rounded-[1.9rem] bg-gradient-to-b from-zinc-950 to-black p-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 ring-2 ring-green-400/40 mb-4">
                  <CheckCircle2 className="w-12 h-12 text-green-400" />
                </div>
                <h2 className="text-3xl md:text-4xl font-black mb-3">Tudo certo! 🎉</h2>
                <p className="text-neutral-200 text-base md:text-lg leading-relaxed mb-4">
                  Estamos abrindo o WhatsApp automaticamente...
                </p>
                <p className="text-neutral-400 text-sm mb-6">
                  Se não abrir sozinho, toque no botão abaixo. Também enviamos o contato no seu e-mail.
                </p>
                <a
                  href={waLink(finalWaMsg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-black h-14 rounded-xl text-base animate-pulse shadow-[0_0_40px_rgba(34,197,94,0.4)]"
                >
                  📱 FALAR NO WHATSAPP AGORA <ArrowRight className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalVpp;
