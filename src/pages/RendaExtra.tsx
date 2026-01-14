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
    // Track page visit
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

      setGroupLink(response.data.groupLink);
      setSubmitted(true);

      toast({
        title: "Cadastro realizado!",
        description: "Você receberá um email com mais informações."
      });

      // Track conversion
      await supabase.from("renda_extra_analytics").insert({
        event_type: "lead_conversion",
        source_url: window.location.href,
        user_agent: navigator.userAgent,
        device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop"
      });

      // Facebook Pixel Lead Event
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center space-y-8 animate-fade-in">
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-8 rounded-3xl border border-green-500/30">
            <CheckCircle2 className="w-20 h-20 text-green-400 mx-auto mb-6 animate-pulse" />
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Parabéns! Seu cadastro foi realizado!
            </h1>
            <p className="text-gray-300 text-lg mb-8">
              Você receberá um email de confirmação com todas as informações. 
              Agora, participe do grupo do WhatsApp para não perder o lançamento!
            </p>
            <a 
              href={groupLink || "#"} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-xl px-8 py-4 rounded-xl hover:scale-105 transition-transform shadow-2xl"
            >
              Entrar no Grupo do WhatsApp
              <ArrowRight className="w-6 h-6" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        {/* Logo */}
        <img src={logoMro} alt="MRO" className="w-40 md:w-52 mb-6 animate-fade-in" />

        {/* Badge */}
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/40 px-6 py-2 rounded-full mb-6 animate-fade-in">
          <span className="text-yellow-400 font-semibold text-sm md:text-base tracking-wide">
            RENDA EXTRA
          </span>
        </div>

        {/* Hero Image */}
        <div className="relative z-10 mb-8 animate-fade-in">
          <img 
            src={heroImage} 
            alt="Resultados MRO" 
            className="w-full max-w-2xl mx-auto drop-shadow-2xl"
          />
        </div>

        {/* Main Headline */}
        <div className="text-center max-w-4xl mx-auto space-y-6 animate-fade-in">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-green-400 to-emerald-500 leading-tight">
            5 a 10 mil mensal
          </h1>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
            utilizando a ferramenta <span className="text-yellow-400">MRO</span>!
          </h2>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
            Utilize no seu horário, em <span className="text-green-400 font-semibold">qualquer lugar do mundo</span>! 
            Extremamente uma <span className="text-yellow-400 font-semibold">liberdade financeira</span>!
          </p>

          {/* Key Features */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <Clock className="w-5 h-5 text-green-400" />
              <span className="text-gray-300">Seu Horário</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <MapPin className="w-5 h-5 text-yellow-400" />
              <span className="text-gray-300">Qualquer Lugar</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span className="text-gray-300">Renda Extra</span>
            </div>
          </div>
        </div>

        {/* Alert - Not a course */}
        <div className="mt-12 max-w-2xl mx-auto bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-6 text-center animate-fade-in">
          <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg">
            Isso <span className="text-yellow-400">NÃO É</span> um curso!
          </p>
          <p className="text-gray-300 mt-2">
            É uma <span className="text-green-400 font-bold">ferramenta automática</span> que vai fazer você faturar mais de 5k mensal!
          </p>
        </div>

        {/* Requirements */}
        <div className="mt-8 flex flex-col md:flex-row items-center gap-4 text-center md:text-left animate-fade-in">
          <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 px-5 py-3 rounded-xl">
            <Laptop className="w-6 h-6 text-orange-400" />
            <span className="text-orange-200 font-medium">Precisa de Notebook</span>
          </div>
          <span className="text-gray-500">ou</span>
          <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 px-5 py-3 rounded-xl">
            <Monitor className="w-6 h-6 text-orange-400" />
            <span className="text-orange-200 font-medium">Computador de Mesa</span>
          </div>
        </div>
      </section>

      {/* Notebook Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <img 
              src={notebookImage} 
              alt="MRO no Notebook" 
              className="w-full max-w-md mx-auto rounded-2xl shadow-2xl"
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Aprenda a nova onda do mercado <span className="text-green-400">grátis</span>!
            </h3>
            <p className="text-gray-300 text-lg mb-6">
              Faça o cadastro e participe do grupo de lançamento grátis para entender melhor de tudo! 
              Utilize essa ferramenta e mude sua vida financeira!
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-6 animate-pulse">
            Aprenda Grátis!
          </h2>
          <p className="text-gray-400 text-lg mb-4">
            Lançamento da aula grátis: <span className="text-yellow-400 font-bold">21 de Janeiro de 2026</span>
          </p>

          {!showForm ? (
            <Button 
              onClick={() => setShowForm(true)}
              size="xl"
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-xl px-12 py-6 rounded-2xl shadow-2xl shadow-green-500/30 hover:scale-105 transition-all duration-300 animate-bounce"
            >
              Participar Agora!
              <ArrowRight className="w-6 h-6 ml-2" />
            </Button>
          ) : (
            <div className="mt-8 max-w-xl mx-auto bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 shadow-2xl animate-fade-in">
              <h3 className="text-2xl font-bold text-white mb-6">Faça seu Pré-Cadastro</h3>
              
              <form onSubmit={handleSubmit} className="space-y-5 text-left">
                <div>
                  <Label htmlFor="nomeCompleto" className="text-gray-300">Nome Completo *</Label>
                  <Input
                    id="nomeCompleto"
                    value={formData.nomeCompleto}
                    onChange={(e) => setFormData({ ...formData, nomeCompleto: e.target.value })}
                    className="mt-1 bg-gray-800/50 border-gray-600 text-white"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-gray-300">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 bg-gray-800/50 border-gray-600 text-white"
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="whatsapp" className="text-gray-300">WhatsApp *</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="mt-1 bg-gray-800/50 border-gray-600 text-white"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="trabalhaAtualmente"
                    checked={formData.trabalhaAtualmente}
                    onCheckedChange={(checked) => setFormData({ ...formData, trabalhaAtualmente: !!checked })}
                    className="border-gray-600"
                  />
                  <Label htmlFor="trabalhaAtualmente" className="text-gray-300">
                    Trabalha atualmente?
                  </Label>
                </div>

                <div>
                  <Label className="text-gray-300">Qual sua média salarial? *</Label>
                  <RadioGroup
                    value={formData.mediaSalarial}
                    onValueChange={(value) => setFormData({ ...formData, mediaSalarial: value })}
                    className="mt-2 space-y-2"
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="menos_5k" id="menos_5k" className="border-gray-600" />
                      <Label htmlFor="menos_5k" className="text-gray-300">Menos de R$ 5.000</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="5k_10k" id="5k_10k" className="border-gray-600" />
                      <Label htmlFor="5k_10k" className="text-gray-300">Entre R$ 5.000 e R$ 10.000</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="mais_10k" id="mais_10k" className="border-gray-600" />
                      <Label htmlFor="mais_10k" className="text-gray-300">Mais de R$ 10.000</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-gray-300">Tem computador, notebook ou macbook? *</Label>
                  <RadioGroup
                    value={formData.tipoComputador}
                    onValueChange={(value) => setFormData({ ...formData, tipoComputador: value })}
                    className="mt-2 space-y-2"
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="computador" id="computador" className="border-gray-600" />
                      <Label htmlFor="computador" className="text-gray-300">Computador de Mesa</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="notebook" id="notebook" className="border-gray-600" />
                      <Label htmlFor="notebook" className="text-gray-300">Notebook</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="macbook" id="macbook" className="border-gray-600" />
                      <Label htmlFor="macbook" className="text-gray-300">MacBook</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="nenhum" id="nenhum" className="border-gray-600" />
                      <Label htmlFor="nenhum" className="text-gray-300">Nenhum</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="instagram" className="text-gray-300">Perfil do Instagram (opcional)</Label>
                  <Input
                    id="instagram"
                    value={formData.instagramUsername}
                    onChange={(e) => setFormData({ ...formData, instagramUsername: e.target.value })}
                    className="mt-1 bg-gray-800/50 border-gray-600 text-white"
                    placeholder="@seuperfil"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-lg py-6 rounded-xl shadow-xl"
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
      <footer className="py-8 border-t border-gray-800 text-center">
        <img src={logoMro} alt="MRO" className="w-24 mx-auto mb-4 opacity-50" />
        <p className="text-gray-500 text-sm">
          © {new Date().getFullYear()} MRO. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
};

export default RendaExtra;
