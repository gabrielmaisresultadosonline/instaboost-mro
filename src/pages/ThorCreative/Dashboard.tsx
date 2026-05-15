import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, 
  Image as ImageIcon, 
  Layout, 
  User, 
  Settings, 
  Share2, 
  Plus, 
  Grid,
  FileText,
  Palette,
  Target
} from 'lucide-react';
import { toast } from "sonner";

const ThorCreativeDashboard = () => {
  const [activeTab, setActiveTab] = useState('generator');
  const [niche, setNiche] = useState(localStorage.getItem('thor_niche') || '');
  const [goal, setGoal] = useState(localStorage.getItem('thor_goal') || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('both'); // stories, posts, both
  const [faceMode, setFaceMode] = useState('with-face');
  const [imageCount, setImageCount] = useState(7);
  const [selectedColors, setSelectedColors] = useState<string[]>(JSON.parse(localStorage.getItem('thor_colors') || '["#9333ea", "#3b82f6", "#000000"]'));
  const [apiKey, setApiKey] = useState(localStorage.getItem('thor_openai_token') || '');
  const [isApiKeySaved, setIsApiKeySaved] = useState(!!localStorage.getItem('thor_openai_token'));
  const [userPhoto, setUserPhoto] = useState<string | null>(localStorage.getItem('thor_user_photo'));
  const [brandLogo, setBrandLogo] = useState<string | null>(localStorage.getItem('thor_brand_logo'));
  const [generationStep, setGenerationStep] = useState<'idle' | 'strategies' | 'images' | 'done'>('idle');
  const [strategies, setStrategies] = useState<string[]>([]);
  const [currentImageGenerating, setCurrentImageGenerating] = useState<number | null>(null);
  const [imageProgress, setImageProgress] = useState<number[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'logo') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (type === 'photo') {
          setUserPhoto(base64String);
          localStorage.setItem('thor_user_photo', base64String);
          toast.success("Foto de perfil salva no projeto!");
        } else {
          setBrandLogo(base64String);
          localStorage.setItem('thor_brand_logo', base64String);
          toast.success("Logomarca salva no projeto!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearFile = (type: 'photo' | 'logo') => {
    if (type === 'photo') {
      setUserPhoto(null);
      localStorage.removeItem('thor_user_photo');
    } else {
      setBrandLogo(null);
      localStorage.removeItem('thor_brand_logo');
    }
    toast.info(`${type === 'photo' ? 'Foto' : 'Logo'} removida.`);
  };

  const handleSaveApiKey = () => {
    if (!apiKey.startsWith('sk-')) {
      toast.error("Por favor, insira um token OpenAI válido (iniciando com sk-).");
      return;
    }
    localStorage.setItem('thor_openai_token', apiKey);
    setIsApiKeySaved(true);
    toast.success("Token salvo com sucesso e conectado!");
  };

  const handleColorAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedColors.length < 4) {
      const newColors = [...selectedColors, e.target.value];
      setSelectedColors(newColors);
      localStorage.setItem('thor_colors', JSON.stringify(newColors));
    } else {
      toast.error("Máximo de 4 cores permitido.");
    }
  };

  const removeColor = (index: number) => {
    const newColors = selectedColors.filter((_, i) => i !== index);
    setSelectedColors(newColors);
    localStorage.setItem('thor_colors', JSON.stringify(newColors));
  };

  const handleGenerate = async () => {
    if (!isApiKeySaved) {
      toast.error("Configure e salve seu token OpenAI nas configurações antes de gerar.");
      setActiveTab('settings');
      return;
    }
    if (!niche || !goal) {
      toast.error("Por favor, preencha o seu nicho e objetivo.");
      return;
    }
    
    setIsGenerating(true);
    setGenerationStep('strategies');
    setStrategies([]);
    toast.info("Analisando nicho e criando estratégias...");

    // Step 1: Simulate Strategy Generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    const mockStrategies = [
      `Análise de Público-alvo para ${niche}`,
      "Criação de Linha Editorial Visionária",
      "Definição de Gancho de Atenção (Hook)",
      "Estrutura de Roteiro para Stories de Alta Conversão",
      "Estratégia de Cores e Estética Consistente"
    ];
    setStrategies(mockStrategies);
    toast.success("Estratégias definidas com sucesso!");

    // Wait a bit for the user to see the strategies
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 2: Switch to Workflow and generate images
    setGenerationStep('images');
    setActiveTab('workflow');
    setImageProgress(new Array(imageCount).fill(0));
    setGeneratedImages(new Array(imageCount).fill(''));
    
    for (let i = 0; i < imageCount; i++) {
      setCurrentImageGenerating(i);
      // Simulate image generation progress
      for (let p = 0; p <= 100; p += 20) {
        setImageProgress(prev => {
          const next = [...prev];
          next[i] = p;
          return next;
        });
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      
      // Add a high-quality realistic placeholder after "generation"
      const format = selectedFormat === 'stories' ? '900/1600' : '1080/1080';
      const randomId = Math.floor(Math.random() * 1000);
      const imageUrl = `https://picsum.photos/seed/${randomId}/${format}`;
      
      setGeneratedImages(prev => {
        const next = [...prev];
        next[i] = imageUrl;
        return next;
      });
    }
    
    setGenerationStep('done');
    setIsGenerating(false);
    setCurrentImageGenerating(null);
    toast.success(`Parabéns! ${imageCount} criativos gerados com sucesso.`);
  };

  return (
    <div className="flex h-screen bg-[#0F0F12] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 flex flex-col p-6 bg-[#09090B]">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight">ThorCreative</span>
        </div>

        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab('generator')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'generator' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Sparkles size={20} />
            <span className="font-medium">Gerador</span>
          </button>
          <button 
            onClick={() => setActiveTab('workflow')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'workflow' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Layout size={20} />
            <span className="font-medium">Workflow</span>
          </button>
          <button 
            onClick={() => setActiveTab('gallery')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'gallery' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Grid size={20} />
            <span className="font-medium">Galeria</span>
          </button>
        </nav>

        <div className="mt-auto space-y-2 pt-6 border-t border-white/10">
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Settings size={20} />
            <span className="font-medium">Configurações</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-[#09090B]/50 backdrop-blur-sm z-10">
          <h2 className="text-sm font-medium text-gray-400">Dashboard / <span className="text-white capitalize">{activeTab}</span></h2>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-[#0F0F12] bg-purple-500 flex items-center justify-center text-[10px] font-bold">MRO</div>
            </div>
          </div>
        </header>

        <ScrollArea className="flex-1 p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {activeTab === 'generator' && (
              <div className="animate-in fade-in duration-500">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold mb-2">Criar Novo Conteúdo</h1>
                  <p className="text-gray-400">Defina sua estratégia e gere criativos consistentes com IA.</p>
                </div>

                {generationStep === 'strategies' ? (
                  <div className="animate-in slide-in-from-bottom duration-700">
                    <Card className="bg-[#16161E] border-purple-500/20 p-8">
                      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Sparkles className="text-purple-500" />
                        Estratégias Geradas pelo Thor IA
                      </h2>
                      <div className="space-y-4">
                        {strategies.map((strat, i) => (
                          <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 animate-in fade-in slide-in-from-left duration-500" style={{ animationDelay: `${i * 200}ms` }}>
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">
                              {i + 1}
                            </div>
                            <span className="text-sm font-medium text-gray-200">{strat}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-8 flex items-center justify-center gap-3 text-sm text-gray-400">
                        <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                        <span>Preparando Workflow de Criativos...</span>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Input */}
                  <div className="lg:col-span-2 space-y-6">
                    <Card className="bg-[#16161E] border-white/5 p-6 space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                            <Target size={16} className="text-purple-500" />
                            Seu Nicho de Atuação
                          </label>
                          <Input 
                            placeholder="Ex: Marketing Digital, Nutrição, Advocacia..." 
                            className="bg-black/20 border-white/10 focus:border-purple-500 text-white h-12"
                            value={niche}
                            onChange={(e) => {
                              setNiche(e.target.value);
                              localStorage.setItem('thor_niche', e.target.value);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                            <FileText size={16} className="text-blue-500" />
                            O que você pretende fazer? (Objetivo)
                          </label>
                          <textarea 
                            className="w-full min-h-[100px] bg-black/20 border border-white/10 rounded-lg p-4 focus:outline-none focus:border-purple-500 transition-colors text-sm text-white"
                            placeholder="Descreva suas ideias ou o que deseja alcançar com esses posts..."
                            value={goal}
                            onChange={(e) => {
                              setGoal(e.target.value);
                              localStorage.setItem('thor_goal', e.target.value);
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                            <Palette size={16} className="text-pink-500" />
                            Cores da Marca (Até 4)
                          </label>
                          <div className="flex gap-2 items-center">
                            {selectedColors.map((color, index) => (
                              <div 
                                key={index} 
                                className="w-8 h-8 rounded-md border border-white/20 relative group cursor-pointer"
                                style={{ backgroundColor: color }}
                                onClick={() => removeColor(index)}
                                title="Clique para remover"
                              >
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                  <span className="text-[10px]">✕</span>
                                </div>
                              </div>
                            ))}
                            {selectedColors.length < 4 && (
                              <label className="w-8 h-8 rounded-md bg-white/5 border border-dashed border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer">
                                <Plus size={14} />
                                <input 
                                  type="color" 
                                  className="sr-only" 
                                  onChange={handleColorAdd}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                            <Plus size={16} className="text-green-500" />
                            Quantidade de Imagens
                          </label>
                          <select 
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                            value={imageCount}
                            onChange={(e) => setImageCount(Number(e.target.value))}
                          >
                            <option value={1}>1 Imagem</option>
                            <option value={7}>7 Imagens (Semanal)</option>
                            <option value={15}>15 Imagens (Quinzena)</option>
                            <option value={30}>30 Imagens (Mensal)</option>
                          </select>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-[#16161E] border-white/5 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <User size={20} className="text-orange-500" />
                          Configuração de Personagem / Logo
                        </h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => setFaceMode('with-face')}
                              className={`flex-1 p-3 rounded-xl border transition-all text-sm font-medium ${faceMode === 'with-face' ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-black/20 border-white/5 text-gray-400 hover:bg-white/5'}`}
                            >
                              Com Rosto Específico
                            </button>
                            <button 
                              onClick={() => setFaceMode('no-face')}
                              className={`flex-1 p-3 rounded-xl border transition-all text-sm font-medium ${faceMode === 'no-face' ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-black/20 border-white/5 text-gray-400 hover:bg-white/5'}`}
                            >
                              Sem Rosto
                            </button>
                          </div>
                          
                          {faceMode === 'with-face' && (
                            <div className="flex-1">
                              {!userPhoto ? (
                                <label className="cursor-pointer">
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo')} />
                                  <div className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-2 hover:bg-white/5 hover:border-purple-500/50 transition-all">
                                    <ImageIcon size={32} className="text-gray-500 mb-2" />
                                    <p className="text-sm font-medium">Subir Foto da Pessoa</p>
                                    <p className="text-xs text-gray-500">A face será preservada em todas as imagens</p>
                                  </div>
                                </label>
                              ) : (
                                <div className="relative border border-purple-500/30 rounded-xl p-4 bg-purple-500/5 flex flex-col items-center">
                                  <img src={userPhoto} alt="User" className="w-20 h-20 rounded-full object-cover border-2 border-purple-500 shadow-lg shadow-purple-500/20 mb-2" />
                                  <p className="text-xs font-medium text-purple-400">Rosto Salvo</p>
                                  <button 
                                    onClick={() => handleClearFile('photo')}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          {!brandLogo ? (
                            <label className="cursor-pointer block">
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
                              <div className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-2 hover:bg-white/5 hover:border-purple-500/50 transition-all">
                                <Layout size={32} className="text-gray-500 mb-2" />
                                <p className="text-sm font-medium">Incluir Logomarca</p>
                                <p className="text-xs text-gray-500">A logo será aplicada harmoniosamente</p>
                              </div>
                            </label>
                          ) : (
                            <div className="relative border border-blue-500/30 rounded-xl p-4 bg-blue-500/5 flex flex-col items-center">
                              <img src={brandLogo} alt="Logo" className="h-20 max-w-full object-contain mb-2" />
                              <p className="text-xs font-medium text-blue-400">Logo Salva</p>
                              <button 
                                onClick={() => handleClearFile('logo')}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Right Column: Settings & CTA */}
                  <div className="space-y-6">
                    <Card className="bg-[#16161E] border-white/5 p-6">
                      <h3 className="text-lg font-semibold mb-6">Formatos de Saída</h3>
                      <div className="space-y-3">
                        {['posts', 'stories', 'both'].map((type) => (
                          <div 
                            key={type}
                            onClick={() => setSelectedFormat(type)}
                            className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${selectedFormat === type ? 'bg-purple-500/10 border-purple-500' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}
                          >
                            <span className="text-sm font-medium capitalize">
                              {type === 'both' ? 'Posts + Stories' : type}
                            </span>
                            <div className={`w-4 h-4 rounded-full border-2 ${selectedFormat === type ? 'bg-purple-500 border-purple-500' : 'border-white/20'}`}></div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Button 
                      className="w-full h-16 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-purple-900/20 group"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Processando Inteligência...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Sparkles className="group-hover:animate-pulse" />
                          <span>GERAR ESTRATÉGIA E IMAGENS</span>
                        </div>
                      )}
                    </Button>

                    <p className="text-[11px] text-center text-gray-500">
                      Utilizando o motor <strong>GPT-4o (Omni) + DALL-E 3</strong> — A versão mais atualizada e poderosa para resultados realistas e consistentes.
                    </p>
                  </div>
                </div>
                )}
              </div>
            )}

            {activeTab === 'workflow' && (
              <div className="animate-in fade-in zoom-in-95 duration-500">
                <div className="mb-8 flex justify-between items-end">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">Workflow do Projeto</h1>
                    <p className="text-gray-400">Sequência estratégica de criativos conectados para sua campanha.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-white/10 text-xs h-8">Resetar Fluxo</Button>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-xs h-8">Salvar Estrutura</Button>
                  </div>
                </div>

                <Card className="bg-[#16161E] border-white/5 p-12 min-h-[650px] relative overflow-x-auto flex items-start justify-center">
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
                  
                  {/* Visual Workflow - Connected Images */}
                  <div className="flex items-center gap-0 relative z-10 py-10">
                    {(imageCount > 0 ? Array.from({ length: imageCount }, (_, i) => i + 1) : [1, 2, 3, 4, 5]).map((step, index) => (
                      <React.Fragment key={step}>
                        <div className="flex flex-col items-center group">
                          {/* Card representing a creative/image */}
                          <div className="relative">
                            <div className={`w-32 h-40 rounded-xl border-2 transition-all shadow-2xl relative z-10 overflow-hidden ${currentImageGenerating === index ? 'border-purple-500 bg-purple-500/5 shadow-purple-500/20 animate-pulse' : 'border-white/10 bg-black/40'}`}>
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                {generatedImages[index] ? (
                                  <div className="w-full h-full relative group/img animate-in fade-in zoom-in duration-500">
                                    <img 
                                      src={generatedImages[index]} 
                                      alt={`Geração ${step}`} 
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                      <Button size="sm" className="h-6 text-[8px] bg-purple-600">Ver HD</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-3">
                                    <ImageIcon size={24} className={`${currentImageGenerating === index ? 'text-purple-500' : 'text-gray-600'} mb-2`} />
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Imagem {step}</span>
                                    {(currentImageGenerating === index || (imageProgress[index] > 0 && imageProgress[index] < 100)) && (
                                      <div className="mt-2 w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <div 
                                          className="bg-purple-500 h-full transition-all duration-300 shadow-[0_0_8px_rgba(168,85,247,0.5)]" 
                                          style={{ width: `${imageProgress[index]}%` }}
                                        ></div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {/* Connector Dots */}
                              <div className={`absolute top-1/2 -left-1.5 w-3 h-3 rounded-full border-2 border-[#16161E] z-20 ${imageProgress[index] === 100 ? 'bg-purple-500' : 'bg-gray-800'}`}></div>
                              <div className={`absolute top-1/2 -right-1.5 w-3 h-3 rounded-full border-2 border-[#16161E] z-20 ${imageProgress[index] === 100 ? 'bg-purple-500' : 'bg-gray-800'}`}></div>
                            </div>
                            
                            {/* Label underneath */}
                            <div className="mt-4 text-center">
                              <p className="text-[10px] font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full inline-block">
                                {index === 0 ? 'Atração' : index === 4 ? 'Conversão' : 'Engajamento'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Connector Arrow/Line */}
                        {index < 4 && (
                          <div className="w-16 h-[2px] bg-gradient-to-r from-purple-500 to-purple-500/20 relative -mt-10">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 border-l-[6px] border-t-[4px] border-b-[4px] border-t-transparent border-b-transparent border-l-purple-500/50"></div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}

                    {/* Annotation/Cloud for AI */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white/5 border border-white/10 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl">
                      <Sparkles size={14} className="text-purple-400" />
                      <span className="text-[10px] text-gray-300 font-medium">IA gerando consistência visual entre blocos...</span>
                    </div>
                  </div>

                  {/* Sidebar Info for Workflow */}
                  <div className="absolute left-8 bottom-8 max-w-[200px] space-y-4">
                    <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                      <p className="text-[10px] text-gray-500 mb-1">Estratégia</p>
                      <p className="text-xs font-semibold">Funil de 5 Etapas</p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'gallery' && (
              <div className="animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">Sua Galeria</h1>
                    <p className="text-gray-400">Histórico de todos os criativos gerados para {niche || 'seu nicho'}.</p>
                  </div>
                  <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
                    <Share2 size={18} className="mr-2" />
                    Exportar Tudo
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                      <div className="absolute inset-0 flex items-center justify-center opacity-40 group-hover:opacity-20 transition-opacity">
                         <ImageIcon size={48} />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center">
                         <span className="text-xs font-medium">Post #{i}</span>
                         <Button size="sm" variant="secondary" className="h-7 px-2 text-[10px]">Publicar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="animate-in fade-in duration-500 max-w-2xl">
                <h1 className="text-3xl font-bold mb-8">Configurações da Conta</h1>
                <Card className="bg-[#16161E] border-white/5 p-8 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b border-white/10 pb-2">API Keys</h3>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">OpenAI API Key</label>
                      <div className="flex gap-2">
                        <Input 
                          type="password" 
                          placeholder="sk-..." 
                          className="bg-black/20 border-white/10 flex-1" 
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                        />
                        <Button 
                          variant={isApiKeySaved ? "outline" : "default"} 
                          className={isApiKeySaved ? "border-white/10" : "bg-purple-600 hover:bg-purple-700"}
                          onClick={handleSaveApiKey}
                        >
                          {isApiKeySaved ? "Atualizar" : "Salvar e Conectar"}
                        </Button>
                      </div>
                      {isApiKeySaved && (
                        <p className="text-xs text-green-500 flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          Conectado com sucesso
                        </p>
                      )}
                      <p className="text-xs text-gray-500">Seu token é usado para gerar os textos e imagens de forma privada.</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <h3 className="text-lg font-semibold border-b border-white/10 pb-2">Preferências de Estilo</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Realismo Extremo</span>
                      <div className="w-10 h-5 bg-purple-600 rounded-full relative"><div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Limpeza Visual (Clean Design)</span>
                      <div className="w-10 h-5 bg-purple-600 rounded-full relative"><div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div></div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
};

export default ThorCreativeDashboard;