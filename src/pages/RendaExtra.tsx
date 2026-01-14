import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/renda-extra-hero.png";
import notebookImage from "@/assets/mro-notebook.jpg";
import logoMro from "@/assets/logo-mro-white.png";
import { Laptop, Monitor, Clock, MapPin, DollarSign, CheckCircle2, Sparkles, ArrowRight, Loader2 } from "lucide-react";

const RendaExtra = () => {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [groupLink, setGroupLink] = useState("");
  const [formData, setFormData] = useState({
    nomeCompleto: "",
    email: "",
    whatsapp: "",
    trabalhaAtualmente: false,
    mediaSalarial: "",
    tipoComputador: "",
    instagramUsername: ""
  });

  useEffect(() => {
    trackVisit();
  }, []);

  const trackVisit = async () => {
    try {
      await supabase.from("renda_extra_analytics").insert({
        event_type: "page_view",
        source_url: window.location.href,
        user_agent: navigator.userAgent,
        device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop",
        referrer: document.referrer || null
      });
    } catch (error) {
      console.error("Error tracking visit:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nomeCompleto || !formData.email || !formData.whatsapp || !formData.mediaSalarial || !formData.tipoComputador) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const response = await supabase.functions.invoke("renda-extra-register", {
        body: {
          nome_completo: formData.nomeCompleto,
          email: formData.email,
          whatsapp: formData.whatsapp,
          trabalha_atualmente: formData.trabalhaAtualmente,
          media_salarial: formData.mediaSalarial,
          tipo_computador: formData.tipoComputador,
          instagram_username: formData.instagramUsername
        }
      });

      if (response.error) throw response.error;

      setGroupLink(response.data.whatsappGroupLink);
      setSubmitted(true);

      toast({
        title: "Cadastro realizado!",
        description: "Você receberá um email com mais informações."
      });

      await supabase.from("renda_extra_analytics").insert({
        event_type: "lead_conversion",
        source_url: window.location.href,
        user_agent: navigator.userAgent,
        device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop"
      });

      if (typeof window !== "undefined" && (window as any).fbq) {
        (window as any).fbq("track", "Lead");
      }

    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({
        title: "Erro ao cadastrar",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center space-y-8 animate-fade-in">
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-8 rounded-3xl border border-green-500/20 backdrop-blur-xl">
            <CheckCircle2 className="w-20 h-20 text-green-400 mx-auto mb-6" />
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Cadastro Realizado!
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              Você receberá um email de confirmação. Agora, entre no grupo do WhatsApp!
            </p>
            <a 
              href={groupLink || "#"} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg px-8 py-4 rounded-2xl hover:scale-105 transition-transform shadow-2xl shadow-green-500/20"
            >
              Entrar no Grupo do WhatsApp
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] overflow-x-hidden">
      {/* Hero Section with Image Background */}
      <section className="relative min-h-[90vh] flex flex-col">
        {/* Background Gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-yellow-500/5 via-transparent to-transparent blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-green-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-yellow-500/5 rounded-full blur-3xl" />
        </div>

        {/* Small Logo */}
        <div className="relative z-10 pt-6 px-4 flex justify-center">
          <img src={logoMro} alt="MRO" className="w-20 md:w-24 opacity-90" />
        </div>

        {/* Badge */}
        <div className="relative z-10 flex justify-center mt-4">
          <div className="bg-yellow-500/10 border border-yellow-500/30 px-5 py-1.5 rounded-full">
            <span className="text-yellow-400 font-medium text-xs tracking-[0.2em] uppercase">
              Renda Extra
            </span>
          </div>
        </div>

        {/* Hero Content with Overlapping Title */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 -mt-4">
          {/* Hero Image with Title Overlay */}
          <div className="relative w-full max-w-xl mx-auto">
            <img 
              src={heroImage} 
              alt="Resultados MRO" 
              className="w-full max-w-md mx-auto drop-shadow-2xl"
            />
            
            {/* Title Overlapping Bottom of Image */}
            <div className="absolute -bottom-4 left-0 right-0 text-center">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-none" style={{ textShadow: '0 8px 32px rgba(0, 0, 0, 0.9), 0 4px 16px rgba(0, 0, 0, 0.8), 0 0 60px rgba(0, 0, 0, 0.6)' }}>
                <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                  5 a 10
                </span>
                <br />
                <span className="text-green-400 uppercase tracking-tight">MIL MENSAL</span>
              </h1>
            </div>
          </div>

          {/* Subtitle */}
          <div className="text-center mt-16 space-y-4 max-w-2xl mx-auto">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-white">
              utilizando a ferramenta <span className="text-yellow-400 font-bold">MRO</span>!
            </h2>
            <p className="text-base md:text-lg text-gray-400">
              Utilize no seu horário, em <span className="text-green-400 font-medium">qualquer lugar do mundo</span>!
              <br />
              Extremamente uma <span className="text-yellow-400 font-medium">liberdade financeira</span>!
            </p>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm px-4 py-2.5 rounded-full border border-white/10 hover:border-green-500/30 transition-colors">
              <Clock className="w-4 h-4 text-green-400" />
              <span className="text-gray-300 text-sm font-medium">Seu Horário</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm px-4 py-2.5 rounded-full border border-white/10 hover:border-yellow-500/30 transition-colors">
              <MapPin className="w-4 h-4 text-yellow-400" />
              <span className="text-gray-300 text-sm font-medium">Qualquer Lugar</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm px-4 py-2.5 rounded-full border border-white/10 hover:border-emerald-500/30 transition-colors">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-gray-300 text-sm font-medium">Renda Extra</span>
            </div>
          </div>
        </div>
      </section>

      {/* Not a Course Section */}
      <section className="py-12 px-4">
        <div className="max-w-xl mx-auto">
          <div className="bg-gradient-to-br from-[#1a1f35] to-[#0f1525] rounded-2xl p-6 md:p-8 border border-blue-500/10 text-center">
            <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-4" />
            <p className="text-lg md:text-xl font-semibold text-white">
              Isso <span className="text-yellow-400">NÃO É</span> um curso!
            </p>
            <p className="text-gray-400 mt-2">
              É uma <span className="text-green-400 font-semibold">ferramenta automática</span> que vai fazer você faturar mais de 5k mensal!
            </p>
          </div>

          {/* Requirements */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
            <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-4 py-2.5 rounded-xl">
              <Laptop className="w-5 h-5 text-orange-400" />
              <span className="text-orange-200 text-sm font-medium">Precisa de Notebook</span>
            </div>
            <span className="text-gray-600 text-sm">ou</span>
            <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-4 py-2.5 rounded-xl">
              <Monitor className="w-5 h-5 text-orange-400" />
              <span className="text-orange-200 text-sm font-medium">Computador de Mesa</span>
            </div>
          </div>
        </div>
      </section>

      {/* Text Section */}
      <section className="py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Aprenda a nova onda do mercado <span className="text-green-400">grátis</span>!
          </h3>
          <p className="text-gray-400 text-base">
            Faça o cadastro e participe do grupo de lançamento grátis para entender melhor!
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 mb-4">
            Aprenda Grátis!
          </h2>
          <p className="text-gray-500 text-base mb-8">
            Lançamento: <span className="text-yellow-400 font-semibold">21 de Janeiro de 2026</span>
          </p>

          {!showForm ? (
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-lg md:text-xl px-10 py-6 rounded-2xl shadow-2xl shadow-green-500/20 hover:scale-105 transition-all duration-300 group"
            >
              Participar Agora!
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          ) : (
            <div className="mt-6 max-w-md mx-auto bg-gradient-to-br from-[#151a2e] to-[#0d1020] rounded-2xl p-6 md:p-8 border border-white/5 shadow-2xl animate-fade-in">
              <h3 className="text-xl font-bold text-white mb-5">Pré-Cadastro</h3>
              
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div>
                  <Label htmlFor="nomeCompleto" className="text-gray-400 text-sm">Nome Completo *</Label>
                  <Input
                    id="nomeCompleto"
                    value={formData.nomeCompleto}
                    onChange={(e) => setFormData({ ...formData, nomeCompleto: e.target.value })}
                    className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-green-500/50"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-gray-400 text-sm">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-green-500/50"
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="whatsapp" className="text-gray-400 text-sm">WhatsApp *</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-green-500/50"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>

                <div className="flex items-center space-x-3 py-1">
                  <Checkbox
                    id="trabalhaAtualmente"
                    checked={formData.trabalhaAtualmente}
                    onCheckedChange={(checked) => setFormData({ ...formData, trabalhaAtualmente: !!checked })}
                    className="border-white/20 data-[state=checked]:bg-green-500"
                  />
                  <Label htmlFor="trabalhaAtualmente" className="text-gray-400 text-sm">
                    Trabalha atualmente?
                  </Label>
                </div>

                <div>
                  <Label className="text-gray-400 text-sm">Média salarial? *</Label>
                  <RadioGroup
                    value={formData.mediaSalarial}
                    onValueChange={(value) => setFormData({ ...formData, mediaSalarial: value })}
                    className="mt-2 space-y-2"
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="menos_5k" id="menos_5k" className="border-white/20 text-green-500" />
                      <Label htmlFor="menos_5k" className="text-gray-400 text-sm">Menos de R$ 5.000</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="5k_10k" id="5k_10k" className="border-white/20 text-green-500" />
                      <Label htmlFor="5k_10k" className="text-gray-400 text-sm">Entre R$ 5.000 e R$ 10.000</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="mais_10k" id="mais_10k" className="border-white/20 text-green-500" />
                      <Label htmlFor="mais_10k" className="text-gray-400 text-sm">Mais de R$ 10.000</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-gray-400 text-sm">Possui computador? *</Label>
                  <RadioGroup
                    value={formData.tipoComputador}
                    onValueChange={(value) => setFormData({ ...formData, tipoComputador: value })}
                    className="mt-2 space-y-2"
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="computador" id="computador" className="border-white/20 text-green-500" />
                      <Label htmlFor="computador" className="text-gray-400 text-sm">Computador de Mesa</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="notebook" id="notebook" className="border-white/20 text-green-500" />
                      <Label htmlFor="notebook" className="text-gray-400 text-sm">Notebook</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="macbook" id="macbook" className="border-white/20 text-green-500" />
                      <Label htmlFor="macbook" className="text-gray-400 text-sm">MacBook</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="nenhum" id="nenhum" className="border-white/20 text-green-500" />
                      <Label htmlFor="nenhum" className="text-gray-400 text-sm">Nenhum</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="instagram" className="text-gray-400 text-sm">Instagram (opcional)</Label>
                  <Input
                    id="instagram"
                    value={formData.instagramUsername}
                    onChange={(e) => setFormData({ ...formData, instagramUsername: e.target.value })}
                    className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-green-500/50"
                    placeholder="@seuperfil"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-base py-5 rounded-xl shadow-xl mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    "Participar do Grupo"
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t border-white/5 text-center">
        <p className="text-gray-600 text-xs">
          © 2026 MRO - Mais Resultados Online. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
};

export default RendaExtra;
