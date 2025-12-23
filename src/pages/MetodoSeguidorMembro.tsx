import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Play, Lock, LogOut, User, Key, Loader2, ChevronRight, ChevronLeft, Clock, Video as VideoIcon, BookOpen, ExternalLink, Sparkles } from "lucide-react";
import logoMro from "@/assets/logo-mro.png";

interface Video { id: string; title: string; description: string; video_url: string; video_type: string; thumbnail_url: string; duration: string; order_index: number; }
interface Upsell { id: string; module_id: string; title: string; description: string; thumbnail_url: string; button_text: string; button_url: string; price: string; original_price: string; show_after_days: number; }
interface Module { id: string; title: string; description: string; thumbnail_url: string; order_index: number; videos: Video[]; upsells: Upsell[]; }
interface Banner { id: string; title: string; description: string; image_url: string; link_url: string; link_text: string; }

const MetodoSeguidorMembro = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userData, setUserData] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [daysSinceStart, setDaysSinceStart] = useState(0);

  useEffect(() => {
    const checkSession = async () => {
      const savedSession = localStorage.getItem("metodo_seguidor_session");
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          const { data } = await supabase.functions.invoke("metodo-seguidor-auth", { body: { action: "verify", userId: session.id } });
          if (data?.success && data?.user) {
            setUserData(data.user);
            setIsLoggedIn(true);
            if (data.user.subscription_start) {
              const start = new Date(data.user.subscription_start);
              const now = new Date();
              setDaysSinceStart(Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
            }
          } else { localStorage.removeItem("metodo_seguidor_session"); }
        } catch (e) { localStorage.removeItem("metodo_seguidor_session"); }
      }
      setCheckingSession(false);
    };
    checkSession();
  }, []);

  useEffect(() => { if (isLoggedIn) { loadModules(); loadBanners(); } }, [isLoggedIn]);

  // Auto-slide banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => setCurrentBanner(prev => (prev + 1) % banners.length), 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const loadModules = async () => {
    setLoadingModules(true);
    try {
      const { data: modulesData } = await supabase.from("metodo_seguidor_modules").select("*").eq("is_active", true).order("order_index");
      const { data: videosData } = await supabase.from("metodo_seguidor_videos").select("*").eq("is_active", true).order("order_index");
      const { data: upsellsData } = await supabase.from("metodo_seguidor_upsells").select("*").eq("is_active", true).order("order_index");
      if (modulesData) {
        const modulesWithVideos = modulesData.map(module => ({
          ...module,
          videos: (videosData || []).filter(v => v.module_id === module.id),
          upsells: (upsellsData || []).filter(u => u.module_id === module.id)
        }));
        setModules(modulesWithVideos);
      }
    } catch (error) { console.error("Error loading modules:", error); toast.error("Erro ao carregar conteúdo"); }
    finally { setLoadingModules(false); }
  };

  const loadBanners = async () => {
    try {
      const { data } = await supabase.from("metodo_seguidor_banners").select("*").eq("is_active", true).order("order_index");
      if (data) setBanners(data);
    } catch (error) { console.error("Error loading banners:", error); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("metodo-seguidor-auth", { body: { action: "login", username: username.trim(), password: password.trim() } });
      if (error || !data?.success) { toast.error(data?.error || "Credenciais inválidas"); return; }
      localStorage.setItem("metodo_seguidor_session", JSON.stringify(data.user));
      setUserData(data.user);
      setIsLoggedIn(true);
      if (data.user.subscription_start) {
        const start = new Date(data.user.subscription_start);
        setDaysSinceStart(Math.floor((new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      }
      toast.success("Login realizado com sucesso!");
    } catch (error) { console.error("Login error:", error); toast.error("Erro ao fazer login."); }
    finally { setLoading(false); }
  };

  const handleLogout = () => { localStorage.removeItem("metodo_seguidor_session"); setIsLoggedIn(false); setUserData(null); setSelectedModule(null); setSelectedVideo(null); };

  const getVideoEmbedUrl = (video: Video) => {
    if (video.video_type === "youtube") {
      const url = video.video_url;
      let videoId = "";
      if (url.includes("youtube.com/watch")) videoId = new URL(url).searchParams.get("v") || "";
      else if (url.includes("youtu.be/")) videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
      else if (url.includes("youtube.com/embed/")) videoId = url.split("embed/")[1]?.split("?")[0] || "";
      else videoId = url;
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return video.video_url;
  };

  if (checkingSession) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-10 h-10 text-amber-400 animate-spin" /></div>;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={logoMro} alt="MRO" className="h-16 mx-auto mb-6 object-contain" />
            <h1 className="text-2xl font-bold text-white mb-2">Área de Membros</h1>
            <p className="text-gray-400">Método de Correção de Seguidores</p>
          </div>
          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 backdrop-blur-lg">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Usuário</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input type="text" placeholder="Seu usuário" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10 bg-gray-800 border-gray-700 text-white" required />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Senha</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input type="password" placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 bg-gray-800 border-gray-700 text-white" required />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-6">
                {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Entrando...</> : <><Lock className="w-5 h-5 mr-2" />Entrar</>}
              </Button>
            </form>
          </div>
          <p className="text-center text-gray-500 text-sm mt-6">Ainda não tem acesso? <a href="/comprouseguidores" className="text-amber-400 hover:underline">Clique aqui</a></p>
        </div>
      </div>
    );
  }

  if (selectedVideo) {
    return (
      <div className="min-h-screen bg-black text-white">
        <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-lg border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => setSelectedVideo(null)} className="flex items-center gap-2 text-gray-400 hover:text-white"><ChevronRight className="w-5 h-5 rotate-180" /><span>Voltar</span></button>
            <img src={logoMro} alt="MRO" className="h-8 object-contain" />
            <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-white"><LogOut className="w-5 h-5" /></button>
          </div>
        </header>
        <div className="pt-20 pb-8 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden mb-6">
              {selectedVideo.video_type === "youtube" ? <iframe src={getVideoEmbedUrl(selectedVideo)} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <video src={selectedVideo.video_url} controls className="w-full h-full" />}
            </div>
            <h1 className="text-2xl font-bold mb-4">{selectedVideo.title}</h1>
            {selectedVideo.description && <p className="text-gray-400">{selectedVideo.description}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (selectedModule) {
    const visibleUpsells = selectedModule.upsells.filter(u => daysSinceStart >= u.show_after_days);
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white">
        <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-lg border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => setSelectedModule(null)} className="flex items-center gap-2 text-gray-400 hover:text-white"><ChevronRight className="w-5 h-5 rotate-180" /><span>Módulos</span></button>
            <img src={logoMro} alt="MRO" className="h-8 object-contain" />
            <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-white"><LogOut className="w-5 h-5" /></button>
          </div>
        </header>
        <div className="pt-20 pb-8 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">{selectedModule.title}</h1>
              {selectedModule.description && <p className="text-gray-400">{selectedModule.description}</p>}
            </div>
            {selectedModule.videos.length === 0 ? (
              <div className="text-center py-12 bg-gray-900/50 rounded-xl border border-gray-800"><VideoIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" /><p className="text-gray-400">Nenhum vídeo disponível neste módulo ainda.</p></div>
            ) : (
              <div className="space-y-4">
                {selectedModule.videos.map((video, index) => (
                  <button key={video.id} onClick={() => setSelectedVideo(video)} className="w-full bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-amber-500/50 hover:bg-gray-900 transition-all text-left">
                    <div className="relative flex-shrink-0">
                      <div className="w-32 h-20 bg-gray-800 rounded-lg overflow-hidden">{video.thumbnail_url ? <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><VideoIcon className="w-8 h-8 text-gray-600" /></div>}</div>
                      <div className="absolute inset-0 flex items-center justify-center"><div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center"><Play className="w-5 h-5 text-black ml-0.5" fill="currentColor" /></div></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1"><span className="text-xs text-amber-400 font-medium">Aula {index + 1}</span>{video.duration && <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />{video.duration}</span>}</div>
                      <h3 className="font-medium text-white truncate">{video.title}</h3>
                      {video.description && <p className="text-sm text-gray-400 line-clamp-1">{video.description}</p>}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
            {visibleUpsells.length > 0 && (
              <div className="mt-8 space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-400" />Conteúdo Premium</h2>
                {visibleUpsells.map(upsell => (
                  <a key={upsell.id} href={upsell.button_url} target="_blank" rel="noopener noreferrer" className="block bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/50 rounded-xl p-4 hover:border-purple-400 transition-all">
                    <div className="flex items-center gap-4">
                      {upsell.thumbnail_url && <img src={upsell.thumbnail_url} alt={upsell.title} className="w-24 h-24 object-cover rounded-lg" />}
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{upsell.title}</h3>
                        {upsell.description && <p className="text-sm text-gray-400">{upsell.description}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          {upsell.original_price && <span className="text-gray-500 line-through text-sm">{upsell.original_price}</span>}
                          {upsell.price && <span className="text-green-400 font-bold text-lg">{upsell.price}</span>}
                        </div>
                      </div>
                      <Button className="bg-purple-600 hover:bg-purple-700">{upsell.button_text}<ExternalLink className="w-4 h-4 ml-2" /></Button>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <img src={logoMro} alt="MRO" className="h-10 object-contain" />
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm hidden md:block">Olá, <span className="text-amber-400">{userData?.instagram_username || userData?.email}</span></span>
            <Button onClick={handleLogout} variant="ghost" size="sm" className="text-gray-400 hover:text-white"><LogOut className="w-5 h-5 mr-2" />Sair</Button>
          </div>
        </div>
      </header>

      <div className="pt-20 pb-8">
        {/* Banner Carousel */}
        {banners.length > 0 && (
          <div className="relative mb-8">
            <div className="overflow-hidden">
              <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${currentBanner * 100}%)` }}>
                {banners.map(banner => (
                  <div key={banner.id} className="w-full flex-shrink-0">
                    <div className="relative aspect-[21/9] md:aspect-[3/1] max-h-[400px]">
                      <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                      <div className="absolute inset-0 flex items-center">
                        <div className="max-w-7xl mx-auto px-4 w-full">
                          <div className="max-w-lg">
                            {banner.title && <h2 className="text-2xl md:text-4xl font-bold mb-2">{banner.title}</h2>}
                            {banner.description && <p className="text-gray-300 mb-4">{banner.description}</p>}
                            {banner.link_url && <a href={banner.link_url} target="_blank" rel="noopener noreferrer"><Button className="bg-amber-500 hover:bg-amber-600 text-black">{banner.link_text || "Saiba Mais"}<ExternalLink className="w-4 h-4 ml-2" /></Button></a>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {banners.length > 1 && (
              <>
                <button onClick={() => setCurrentBanner(prev => (prev - 1 + banners.length) % banners.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/80"><ChevronLeft className="w-6 h-6" /></button>
                <button onClick={() => setCurrentBanner(prev => (prev + 1) % banners.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/80"><ChevronRight className="w-6 h-6" /></button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">{banners.map((_, i) => <button key={i} onClick={() => setCurrentBanner(i)} className={`w-2 h-2 rounded-full transition-colors ${i === currentBanner ? "bg-amber-500" : "bg-white/30"}`} />)}</div>
              </>
            )}
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-10">
            <h1 className="text-3xl font-bold mb-2">Bem-vindo ao Método de Correção</h1>
            <p className="text-gray-400">Siga os módulos abaixo para recuperar o alcance do seu perfil</p>
          </div>

          {loadingModules ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-10 h-10 text-amber-400 animate-spin" /></div>
          ) : modules.length === 0 ? (
            <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800"><BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" /><h2 className="text-xl font-bold mb-2">Conteúdo em breve</h2><p className="text-gray-400">Os módulos estão sendo preparados!</p></div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((module, index) => (
                <button key={module.id} onClick={() => setSelectedModule(module)} className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden hover:border-amber-500/50 hover:scale-[1.02] transition-all text-left group">
                  <div className="aspect-[9/16] max-h-64 bg-gray-800 relative">
                    {module.thumbnail_url ? <img src={module.thumbnail_url} alt={module.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-600/20 to-orange-600/20"><BookOpen className="w-16 h-16 text-amber-400/50" /></div>}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center"><Play className="w-8 h-8 text-black ml-1" fill="currentColor" /></div></div>
                  </div>
                  <div className="p-4">
                    <span className="text-amber-400 text-sm font-medium">Módulo {index + 1}</span>
                    <h3 className="font-bold text-lg mt-1">{module.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{module.videos.length} vídeos</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetodoSeguidorMembro;
