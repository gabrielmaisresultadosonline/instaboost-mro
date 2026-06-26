import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
// Unused import removed: import heroImage from "@/assets/renda-extra-hero.png";
import logoMro from "@/assets/logo-mro-white.png";
import MoneyParticles from "@/components/MoneyParticles";
import { Laptop, Monitor, Clock, MapPin, DollarSign, CheckCircle2, Sparkles, ArrowRight, Loader2, X } from "lucide-react";

const RendaExtraLead = () => {
  const [showForm, setShowForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
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

  const [showNoComputerWarning, setShowNoComputerWarning] = useState(false);
  const [canProceedAfterWarning, setCanProceedAfterWarning] = useState(false);
  const [blockedNoComputer, setBlockedNoComputer] = useState(false);
  const [savingBlocked, setSavingBlocked] = useState(false);
  const [launchDateText, setLaunchDateText] = useState("");
  const [launchDateEnabled, setLaunchDateEnabled] = useState(false);

  // Steps are dynamic now - if user doesn't work, skip salary question
  const getEffectiveTotalSteps = () => {
    // 0-nome, 1-email, 2-whatsapp, 3-trabalha, 4-salario (skip if not working), 5-computador, 6-instagram
    return formData.trabalhaAtualmente ? 7 : 6;
  };

  useEffect(() => {
    trackVisit();
    fetchLaunchDate();
  }, []);

  const fetchLaunchDate = async () => {
    try {
      const response = await supabase.functions.invoke("rendaextralead-admin", {
        body: { action: "getPublicSettings" }
      });
      if (response.data?.launch_date && response.data?.launch_date_enabled) {
        const date = new Date(response.data.launch_date);
        const formatted = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
        setLaunchDateText(formatted);
        setLaunchDateEnabled(true);
      } else {
        setLaunchDateEnabled(false);
      }
    } catch (error) {
      console.error("Error fetching launch date:", error);
    }
  };

  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showForm]);

  const trackVisit = async () => {
    try {
      await supabase.from("renda_extra_lead_analytics").insert({
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

  // Effect to handle the 5 second delay for "nenhum" computer option
  useEffect(() => {
    if (showNoComputerWarning) {
      setCanProceedAfterWarning(false);
      const timer = setTimeout(() => {
        setCanProceedAfterWarning(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showNoComputerWarning]);

  // Map current step to actual form step considering skipped salary question
  const getActualStep = (step: number) => {
    if (!formData.trabalhaAtualmente && step >= 4) {
      return step + 1; // Skip salary step
    }
    return step;
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(email.trim());
  };

  const [emailError, setEmailError] = useState("");

  const canProceed = () => {
    const actualStep = getActualStep(currentStep);
    switch (actualStep) {
      case 0: return formData.nomeCompleto.trim() !== "";
      case 1: return isValidEmail(formData.email);
      case 2: return formData.whatsapp.trim() !== "";
      case 3: return true;
      case 4: return formData.mediaSalarial !== "";
      case 5: return formData.tipoComputador !== "";
      case 6: return formData.instagramUsername.trim() !== "";
      default: return false;
    }
  };

  const handleNext = () => {
    const actualStep = getActualStep(currentStep);
    if (actualStep === 1 && !isValidEmail(formData.email)) {
      setEmailError("Digite um email válido (ex: seu@email.com)");
      return;
    }
    if (canProceed() && currentStep < getEffectiveTotalSteps() - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleComputerSelect = async (value: string) => {
    setFormData({ ...formData, tipoComputador: value });
    if (value === "nenhum") {
      setShowNoComputerWarning(true);
      // Save the lead as "blocked" - they won't receive the link
      if (!savingBlocked && !blockedNoComputer) {
        setSavingBlocked(true);
        try {
          await supabase.from("renda_extra_lead_leads").insert({
            nome_completo: formData.nomeCompleto,
            email: formData.email,
            whatsapp: formData.whatsapp,
            trabalha_atualmente: formData.trabalhaAtualmente,
            media_salarial: formData.mediaSalarial || null,
            tipo_computador: "nenhum",
            instagram_username: formData.instagramUsername || null,
          });
          setBlockedNoComputer(true);
        } catch (err) {
          console.error("Error saving blocked lead:", err);
          setBlockedNoComputer(true);
        } finally {
          setSavingBlocked(false);
        }
      }
    } else {
      setShowNoComputerWarning(false);
      setCurrentStep(currentStep + 1);
    }
  };

  const handleProceedWithoutComputer = () => {
    // Disabled - user with no computer cannot proceed
    return;
  };

  const handleSubmit = async () => {
    if (!formData.nomeCompleto || !formData.email || !formData.whatsapp || !formData.mediaSalarial || !formData.tipoComputador || !formData.instagramUsername) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const response = await supabase.functions.invoke("rendaextralead-register", {
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

      await supabase.from("renda_extra_lead_analytics").insert({
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
    const whatsappDirectLink = groupLink || "https://maisresultadosonline.com.br/r/rxl-wa";
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center space-y-8 animate-fade-in">
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-8 rounded-3xl border border-green-500/20 backdrop-blur-xl">
            <CheckCircle2 className="w-20 h-20 text-green-400 mx-auto mb-6" />
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Cadastro Realizado!
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              Entre em contato conosco no WhatsApp agora e vamos liberar a sua aula!
            </p>
            <a 
              href={whatsappDirectLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg px-8 py-4 rounded-2xl hover:scale-105 transition-transform shadow-2xl shadow-green-500/20"
            >
              Aprenda Grátis Agora
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  const renderQuizStep = () => {
    const actualStep = getActualStep(currentStep);
    
    // Step 0 - Nome
    if (actualStep === 0) {
      return (
        <div key="nome" className="space-y-4 animate-fade-in">
          <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-6">
            Qual é o seu nome completo?
          </h3>
          <Input
            value={formData.nomeCompleto}
            onChange={(e) => setFormData({ ...formData, nomeCompleto: e.target.value })}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500/50 text-lg py-6"
            placeholder="Digite seu nome completo"
            autoFocus
          />
        </div>
      );
    }
    
    // Step 1 - Email
    if (actualStep === 1) {
      return (
        <div key="email" className="space-y-4 animate-fade-in">
          <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-6">
            Qual é o seu melhor email?
          </h3>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (emailError) {
                const val = e.target.value.trim();
                if (isValidEmail(val)) setEmailError("");
              }
            }}
            onBlur={() => {
              const val = formData.email.trim();
              if (val && !isValidEmail(val)) {
                setEmailError("Digite um email válido (ex: seu@email.com)");
              } else {
                setEmailError("");
              }
            }}
            className={`bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500/50 text-lg py-6 ${emailError ? "border-red-500" : ""}`}
            placeholder="seu@email.com"
            autoFocus
          />
          {emailError && (
            <p className="text-red-400 text-sm text-center animate-fade-in">{emailError}</p>
          )}
        </div>
      );
    }
    
    // Step 2 - WhatsApp
    if (actualStep === 2) {
      return (
        <div key="whatsapp" className="space-y-4 animate-fade-in">
          <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-6">
            Qual é o seu WhatsApp?
          </h3>
          <Input
            value={formData.whatsapp}
            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500/50 text-lg py-6"
            placeholder="(00) 00000-0000"
            autoFocus
          />
        </div>
      );
    }
    
    // Step 3 - Trabalha
    if (actualStep === 3) {
      return (
        <div key="trabalha" className="space-y-4 animate-fade-in">
          <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-6">
            Você trabalha atualmente?
          </h3>
          <div className="flex flex-col gap-4">
            <Button
              type="button"
              onClick={() => {
                setFormData({ ...formData, trabalhaAtualmente: true });
                setCurrentStep(currentStep + 1);
              }}
              className="w-full bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 text-white font-semibold text-lg py-6 rounded-xl transition-all"
            >
              Sim, trabalho
            </Button>
            <Button
              type="button"
              onClick={() => {
                setFormData({ ...formData, trabalhaAtualmente: false, mediaSalarial: "nao_trabalha" });
                // Skip salary question - go directly to computer step
                setCurrentStep(currentStep + 1);
              }}
              className="w-full bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 text-white font-semibold text-lg py-6 rounded-xl transition-all"
            >
              Não, estou buscando oportunidades
            </Button>
          </div>
        </div>
      );
    }
    
    // Step 4 - Media Salarial (only if trabalhaAtualmente is true)
    if (actualStep === 4) {
      return (
        <div key="salario" className="space-y-4 animate-fade-in">
          <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-6">
            Qual sua média salarial atual?
          </h3>
          <div className="flex flex-col gap-3">
            {[
              { value: "menos_5k", label: "Menos de R$ 5.000" },
              { value: "5k_10k", label: "Entre R$ 5.000 e R$ 10.000" },
              { value: "mais_10k", label: "Mais de R$ 10.000" }
            ].map((option) => (
              <Button
                key={option.value}
                type="button"
                onClick={() => {
                  setFormData({ ...formData, mediaSalarial: option.value });
                  setCurrentStep(currentStep + 1);
                }}
                className={`w-full border text-white font-semibold text-lg py-6 rounded-xl transition-all ${
                  formData.mediaSalarial === option.value 
                    ? "bg-red-500/30 border-red-500" 
                    : "bg-white/5 border-white/10 hover:bg-red-500/20 hover:border-red-500/50"
                }`}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      );
    }
    
    // Step 5 - Computador
    if (actualStep === 5) {
      return (
        <div key="computador" className="space-y-4 animate-fade-in">
          {!showNoComputerWarning ? (
            <>
              <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-6">
                Você possui computador?
              </h3>
              <div className="flex flex-col gap-3">
                {[
                  { value: "computador", label: "Computador de Mesa", icon: Monitor },
                  { value: "notebook", label: "Notebook", icon: Laptop },
                  { value: "macbook", label: "MacBook", icon: Laptop },
                  { value: "nenhum", label: "Nenhum", icon: X }
                ].map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    onClick={() => handleComputerSelect(option.value)}
                    className={`w-full border text-white font-semibold text-lg py-6 rounded-xl transition-all flex items-center justify-center gap-3 ${
                      formData.tipoComputador === option.value 
                        ? "bg-red-500/30 border-red-500" 
                        : "bg-white/5 border-white/10 hover:bg-red-500/20 hover:border-red-500/50"
                    }`}
                  >
                    <option.icon className="w-5 h-5" />
                    {option.label}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
                <div className="text-red-400 text-5xl mb-4">🚫</div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-4">
                  Cadastro Encerrado
                </h3>
                <p className="text-gray-300 text-base md:text-lg leading-relaxed">
                  Você <span className="text-red-400 font-bold">vai precisar</span> de um <span className="text-white font-semibold">Computador</span>, <span className="text-white font-semibold">Notebook</span> ou <span className="text-white font-semibold">MacBook</span> para utilizar o método.
                </p>
                <p className="text-gray-300 text-base mt-4 leading-relaxed">
                  Sem um desses, <span className="text-red-400 font-semibold">não vai conseguir utilizar</span> o sistema.
                </p>
                <p className="text-gray-400 text-sm mt-4">
                  Evolua, adquira um <span className="text-white font-semibold">notebook</span> ou <span className="text-white font-semibold">computador de mesa</span> e volte aqui novamente para concluir o seu cadastro. 💪
                </p>
                {savingBlocked && (
                  <p className="text-gray-500 text-xs mt-4 flex items-center justify-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Salvando seus dados...
                  </p>
                )}
              </div>
              <Button
                type="button"
                onClick={() => setShowForm(false)}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-lg py-6 rounded-xl transition-all"
              >
                Fechar
              </Button>
            </div>
          )}
        </div>
      );
    }
    
    // Step 6 - Instagram
    if (actualStep === 6) {
      return (
        <div key="instagram" className="space-y-4 animate-fade-in">
          <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-6">
            Qual é o seu Instagram?
          </h3>
          <Input
            value={formData.instagramUsername}
            onChange={(e) => setFormData({ ...formData, instagramUsername: e.target.value })}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500/50 text-lg py-6"
            placeholder="@seuperfil"
            autoFocus
          />
        </div>
      );
    }
    
    return null;
  };

  return (
    <>
      {/* Loading Overlay - Liberando vaga */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-gradient-to-br from-[#151a2e] to-[#0d1020] rounded-3xl p-6 sm:p-8 border border-red-500/30 shadow-2xl text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-red-500/20" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-red-500 animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-red-400 animate-pulse" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Estamos liberando sua vaga grátis...
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Aguarde alguns segundos enquanto preparamos tudo para você.
            </p>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4 relative">
              <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-red-500 via-red-400 to-red-600 rounded-full animate-[slide_1.5s_ease-in-out_infinite]" />
            </div>
            <div className="space-y-2 text-left text-xs sm:text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>Validando seus dados</span>
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-red-400 animate-spin flex-shrink-0" />
                <span>Reservando seu acesso</span>
              </div>
              <div className="flex items-center gap-2 opacity-60">
                <div className="w-4 h-4 rounded-full border-2 border-gray-500 flex-shrink-0" />
                <span>Enviando link por email</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Popup Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-gradient-to-br from-[#151a2e] to-[#0d1020] rounded-3xl p-6 md:p-10 border border-white/10 shadow-2xl animate-fade-in">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowForm(false);
                setCurrentStep(0);
              }}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/50 transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Pergunta {currentStep + 1} de {getEffectiveTotalSteps()}</span>
                <span>{Math.round(((currentStep + 1) / getEffectiveTotalSteps()) * 100)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500"
                  style={{ width: `${((currentStep + 1) / getEffectiveTotalSteps()) * 100}%` }}
                />
              </div>
            </div>

            {/* Quiz Content */}
            <div className="min-h-[200px] flex flex-col justify-center">
              {renderQuizStep()}
            </div>

            {/* Navigation Buttons */}
            {(() => {
              const actualStep = getActualStep(currentStep);
              const isAutoAdvanceStep = actualStep === 3 || actualStep === 4 || actualStep === 5;
              const isLastStep = currentStep === getEffectiveTotalSteps() - 1;
              
              if (isAutoAdvanceStep) return null;
              
              return (
                <div className="mt-8 flex gap-3">
                  {currentStep > 0 && (
                    <Button
                      type="button"
                      onClick={() => {
                        // Handle going back correctly
                        if (!formData.trabalhaAtualmente && actualStep === 5) {
                          // If user doesn't work and is on computer step, go back to trabalha step
                          setCurrentStep(3);
                        } else {
                          setCurrentStep(currentStep - 1);
                        }
                      }}
                      className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold py-5 rounded-xl"
                    >
                      Voltar
                    </Button>
                  )}
                  {isLastStep ? (
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!canProceed() || loading}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-5 rounded-xl disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Cadastrando...
                        </>
                      ) : (
                        <>
                          Aprenda Grátis Agora
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={!canProceed()}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-5 rounded-xl disabled:opacity-50"
                    >
                      Próximo
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

    <div className="min-h-screen bg-[#0a0a0a] overflow-x-hidden relative">
      {/* Money Particles Background */}
      <MoneyParticles />

      {/* Hero Section - Bold Editorial */}
      <section className="relative min-h-[100vh] flex flex-col">
        {/* Layered backgrounds: grid + radial + diagonal stripes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
              backgroundSize: "60px 60px",
              maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
            }}
          />
          {/* radial glow yellow */}
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-yellow-400/10 rounded-full blur-[120px]" />
          {/* red glow bottom */}
          <div className="absolute bottom-[-10%] left-1/3 w-[600px] h-[600px] bg-red-600/15 rounded-full blur-[120px]" />
          {/* diagonal accent stripe */}
          <div className="absolute top-0 right-0 w-[60%] h-full bg-gradient-to-bl from-yellow-400/[0.04] via-transparent to-transparent" />
        </div>

        {/* Top bar: logo + ticker */}
        <div className="relative z-10 pt-6 px-4 flex flex-col items-center gap-3">
          <img src={logoMro} alt="MRO" className="w-20 md:w-24 opacity-90" />
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono uppercase tracking-[0.3em] text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>Mais Resultados Online</span>
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            <span className="hidden sm:inline">Renda Extra · 2026</span>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-16">
          {/* Status row */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-7">
            <span className="inline-flex items-center gap-2 bg-red-600 text-white font-black text-[10px] sm:text-xs px-4 py-2 rounded-sm shadow-[0_0_30px_rgba(239,68,68,0.5)] uppercase tracking-[0.2em] border-l-4 border-yellow-400">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              100% Grátis
            </span>
            <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-yellow-400 font-bold text-[10px] sm:text-xs px-4 py-2 rounded-sm uppercase tracking-[0.2em]">
              Vagas limitadas
            </span>
          </div>

          {/* Title — brutalist editorial */}
          <div className="text-center relative z-10 max-w-5xl mx-auto">
            <h1 className="flex flex-col items-center leading-[0.88] uppercase font-black gap-1 sm:gap-2">
              <span className="text-gray-400 text-xl sm:text-2xl md:text-3xl tracking-[0.25em] font-bold">
                Fature mais de
              </span>
              <span
                className="text-[3.5rem] sm:text-[6rem] md:text-[8.5rem] font-black tracking-tighter leading-none"
                style={{
                  background:
                    "linear-gradient(180deg, #fde047 0%, #facc15 45%, #ca8a04 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 6px 30px rgba(250,204,21,0.25))",
                }}
              >
                5 MIL<span className="text-white">/</span>MÊS
              </span>
              <span className="flex items-center gap-3 mt-2">
                <span className="h-[2px] w-8 sm:w-14 bg-red-500" />
                <span className="text-white text-lg sm:text-2xl md:text-3xl tracking-[0.3em] font-bold">
                  COM A MRO
                </span>
                <span className="h-[2px] w-8 sm:w-14 bg-red-500" />
              </span>
            </h1>
          </div>

          {/* Description */}
          <div className="text-center mt-8 max-w-xl mx-auto px-2">
            <p className="text-sm sm:text-base md:text-lg text-gray-300 leading-relaxed">
              Trabalhe no <span className="text-yellow-400 font-semibold">seu horário</span>, em qualquer lugar.
              <br className="hidden sm:block" />
              {' '}Construa sua <span className="text-white font-semibold underline decoration-red-500 decoration-2 underline-offset-4">liberdade financeira</span>.
            </p>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-8">
            <div className="flex items-center gap-2 bg-[#141414] px-4 py-2.5 rounded-sm border border-white/10 hover:border-yellow-400/60 transition-colors">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-gray-200 text-xs sm:text-sm font-medium uppercase tracking-wider">Seu Horário</span>
            </div>
            <div className="flex items-center gap-2 bg-[#141414] px-4 py-2.5 rounded-sm border border-white/10 hover:border-red-500/60 transition-colors">
              <MapPin className="w-4 h-4 text-red-500" />
              <span className="text-gray-200 text-xs sm:text-sm font-medium uppercase tracking-wider">Qualquer Lugar</span>
            </div>
            <div className="flex items-center gap-2 bg-[#141414] px-4 py-2.5 rounded-sm border border-white/10 hover:border-white/60 transition-colors">
              <DollarSign className="w-4 h-4 text-white" />
              <span className="text-gray-200 text-xs sm:text-sm font-medium uppercase tracking-wider">Renda Extra</span>
            </div>
          </div>

          {/* CTA Button — Black/Yellow/Red brutalist */}
          <div className="mt-12 relative group">
            {/* yellow shadow stack */}
            <div className="absolute inset-0 bg-yellow-400 rounded-sm translate-x-1.5 translate-y-1.5 transition-transform group-hover:translate-x-2.5 group-hover:translate-y-2.5" />
            <div className="absolute inset-0 bg-red-600 rounded-sm translate-x-3 translate-y-3 transition-transform group-hover:translate-x-5 group-hover:translate-y-5" />
            <Button
              onClick={() => setShowForm(true)}
              className="relative bg-white text-black hover:bg-white font-black text-base sm:text-lg md:text-xl px-10 sm:px-14 py-7 sm:py-8 rounded-sm border-2 border-black uppercase tracking-[0.15em] transition-transform duration-200 group-hover:-translate-x-1 group-hover:-translate-y-1"
            >
              Aprenda Grátis Agora
              <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Microcopy under CTA */}
          <div className="mt-6 flex items-center gap-2 text-[10px] sm:text-xs font-mono uppercase tracking-[0.25em] text-gray-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400" />
            <span>Sem cartão · Sem compromisso</span>
          </div>
        </div>

        {/* Bottom marquee strip */}
        <div className="relative z-10 border-y border-white/10 bg-yellow-400 overflow-hidden">
          <div className="flex animate-[slide_25s_linear_infinite] whitespace-nowrap py-2.5">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-6 px-6 text-black font-black text-xs sm:text-sm uppercase tracking-[0.25em]">
                <span>★ Renda Extra MRO</span>
                <span>·</span>
                <span>Aulas Grátis</span>
                <span>·</span>
                <span>Resultados Reais</span>
                <span>·</span>
                <span>Trabalhe de Casa</span>
                <span>·</span>
                <span>★ 5 Mil/Mês</span>
                <span>·</span>
                <span>Vagas Limitadas</span>
                <span>·</span>
              </div>
            ))}
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
            Faça o cadastro e fale com a gente no WhatsApp para liberarmos sua aula grátis!
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold text-lg md:text-xl px-10 py-6 rounded-2xl shadow-2xl shadow-red-500/20 hover:scale-105 transition-all duration-300 group mb-8"
          >
            Aprenda Grátis Agora
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 mb-4">
            Aprenda Grátis!
          </h2>
          {launchDateEnabled && launchDateText && (
            <p className="text-gray-500 text-base">
              Lançamento: <span className="text-yellow-400 font-semibold">{launchDateText}</span>
            </p>
          )}
        </div>
      </section>

      {/* Not a Course Section - moved to end */}
      <section className="py-12 px-4">
        <div className="max-w-xl mx-auto">
          <div className="bg-gradient-to-br from-[#1a1f35] to-[#0f1525] rounded-2xl p-6 md:p-8 border border-blue-500/10 text-center mb-8">
            <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-4" />
            <p className="text-xl md:text-2xl font-black text-white mb-2">
              ((NÃO É CURSO É FERRAMENTA!))
            </p>
            <p className="text-gray-400 text-lg">
              Esqueça aulas teóricas. É uma ferramenta automática desenhada para gerar faturamento real superior a 5 mil reais mensais.
            </p>
          </div>

          {/* Ouça Agora Button section removed */}


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

      {/* Final CTA Button */}
      <section className="py-12 px-4">
        <div className="max-w-xl mx-auto text-center">
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold text-lg md:text-xl px-10 py-6 rounded-2xl shadow-2xl shadow-red-500/20 hover:scale-105 transition-all duration-300 group"
          >
            Aprenda Grátis Agora
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t border-white/5 text-center">
        <p className="text-gray-600 text-xs">
          © 2026 MRO - Mais Resultados Online. Todos os direitos reservados.
        </p>
      </footer>
    </div>
    </>
  );
};

export default RendaExtraLead;
