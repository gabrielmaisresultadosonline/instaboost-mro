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
  const [niche, setNiche] = useState('');
  const [goal, setGoal] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('both'); // stories, posts, both
  const [faceMode, setFaceMode] = useState('with-face');
  const [imageCount, setImageCount] = useState(7);

  const handleGenerate = () => {
    if (!niche || !goal) {
      toast.error("Por favor, preencha o seu nicho e objetivo.");
      return;
    }
    setIsGenerating(true);
    toast.info("Iniciando geração de estratégias e criativos...");
    // Simulação de delay
    setTimeout(() => {
      setIsGenerating(false);
      toast.success("Estratégias geradas com sucesso!");
    }, 3000);
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
                            onChange={(e) => setNiche(e.target.value)}
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
                            onChange={(e) => setGoal(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                            <Palette size={16} className="text-pink-500" />
                            Cores da Marca
                          </label>
                          <div className="flex gap-2">
                            <div className="w-8 h-8 rounded-md bg-purple-600 cursor-pointer border border-white/10"></div>
                            <div className="w-8 h-8 rounded-md bg-blue-500 cursor-pointer border border-white/10"></div>
                            <div className="w-8 h-8 rounded-md bg-black cursor-pointer border border-white/10"></div>
                            <button className="w-8 h-8 rounded-md bg-white/5 border border-dashed border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors">
                              <Plus size={14} />
                            </button>
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
                            <div className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-2 hover:bg-white/5 transition-colors cursor-pointer">
                              <ImageIcon size={32} className="text-gray-500 mb-2" />
                              <p className="text-sm font-medium">Subir Foto da Pessoa</p>
                              <p className="text-xs text-gray-500">A face será preservada em todas as imagens</p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-2 hover:bg-white/5 transition-colors cursor-pointer">
                            <Layout size={32} className="text-gray-500 mb-2" />
                            <p className="text-sm font-medium">Incluir Logomarca</p>
                            <p className="text-xs text-gray-500">A logo será aplicada harmoniosamente</p>
                          </div>
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
                      Utilizando o motor GPT-4o + DALL-E 3 para resultados fotorrealistas de alta consistência.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'workflow' && (
              <div className="animate-in fade-in zoom-in-95 duration-500">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold mb-2">Workflow de Atendimento</h1>
                  <p className="text-gray-400">Visualize seu fluxo de automação e estratégias de conversão.</p>
                </div>

                <Card className="bg-[#16161E] border-white/5 p-8 min-h-[600px] relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #444 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                  
                  {/* Mock Workflow Diagram */}
                  <div className="flex flex-col items-center gap-12 relative z-10 scale-90 md:scale-100">
                    <div className="bg-purple-600 p-4 rounded-xl shadow-lg shadow-purple-900/40 min-w-[150px] text-center border border-purple-400/30">
                      <span className="font-bold">Início: Criativo</span>
                    </div>
                    
                    <div className="w-[2px] h-12 bg-gradient-to-b from-purple-600 to-blue-500 relative">
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-blue-500"></div>
                    </div>

                    <div className="grid grid-cols-3 gap-16">
                      <div className="flex flex-col items-center">
                        <div className="bg-blue-600 p-4 rounded-xl shadow-lg shadow-blue-900/40 min-w-[150px] text-center border border-blue-400/30">
                          <span className="font-bold">Interação Post</span>
                        </div>
                        <div className="w-[2px] h-12 bg-blue-500 relative">
                           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-blue-500"></div>
                        </div>
                        <div className="bg-[#222] p-4 rounded-xl border border-white/10 min-w-[150px] text-center">
                          <span className="text-sm">IA Responde Comentário</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="bg-pink-600 p-4 rounded-xl shadow-lg shadow-pink-900/40 min-w-[150px] text-center border border-pink-400/30">
                          <span className="font-bold">Direct Automation</span>
                        </div>
                        <div className="w-[2px] h-12 bg-pink-500 relative">
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-pink-500"></div>
                        </div>
                        <div className="bg-[#222] p-4 rounded-xl border border-white/10 min-w-[150px] text-center">
                          <span className="text-sm">Fluxo Conversacional</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="bg-orange-600 p-4 rounded-xl shadow-lg shadow-orange-900/40 min-w-[150px] text-center border border-orange-400/30">
                          <span className="font-bold">Lead Qualificado</span>
                        </div>
                        <div className="w-[2px] h-12 bg-orange-500 relative">
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-orange-500"></div>
                        </div>
                        <div className="bg-[#222] p-4 rounded-xl border border-white/10 min-w-[150px] text-center">
                          <span className="text-sm">Venda / WhatsApp</span>
                        </div>
                      </div>
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
                        <Input type="password" placeholder="sk-..." className="bg-black/20 border-white/10 flex-1" value="••••••••••••••••" />
                        <Button variant="outline" className="border-white/10">Atualizar</Button>
                      </div>
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