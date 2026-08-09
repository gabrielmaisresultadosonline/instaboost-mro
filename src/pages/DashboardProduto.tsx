import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { markHubReturn } from "@/lib/hubReturn";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Download, Play, ExternalLink, Package, FileText, Music, BookOpen } from "lucide-react";
import { getDashboardSession, type HubProduct } from "./Dashboard";
import MembersModulesView from "@/components/members/MembersModulesView";
import { loadModulesFromCloud, type TutorialModule, type ModulePlatform } from "@/lib/adminConfig";

interface HubTutorial {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  video_url: string | null;
  download_url: string | null;
}

interface EbookItem {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  audio_url: string;
  ebook_url: string;
}

export default function DashboardProduto() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<HubProduct | null>(null);
  const [tutorials, setTutorials] = useState<HubTutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<HubTutorial | null>(null);
  const [modules, setModules] = useState<TutorialModule[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [downloadLink, setDownloadLink] = useState("");
  
  const [ebooks, setEbooks] = useState<EbookItem[]>([]);
  const [viewingFile, setViewingFile] = useState<{ type: 'pdf' | 'audio', url: string, title: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("hub-api", { body: { action: "product", slug } });
      if (data?.success) {
        const prod = data.product as HubProduct;
        setProduct(prod);
        setTutorials((data.tutorials || []) as HubTutorial[]);
        setActive((data.tutorials || [])[0] || null);

        if ((prod as any).is_ebook_hub) {
          const { data: ebookData } = await supabase
            .from('hub_product_ebooks' as any)
            .select('*')
            .eq('product_id', prod.id)
            .order('order_index');
          if (ebookData) setEbooks(ebookData as EbookItem[]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const loadMembersArea = useCallback(async () => {
    if (!slug) return;
    setModulesLoading(true);
    try {
      const cloud = await loadModulesFromCloud(`hub-${slug}` as ModulePlatform);
      setModules(cloud?.modules || []);
      setDownloadLink(cloud?.settings?.downloadLink || "");
    } catch (error) {
      console.error("[DashboardProduto] Falha ao carregar módulos:", error);
      setModules([]);
    } finally {
      setModulesLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!getDashboardSession()) {
      navigate("/dashboard");
      return;
    }
    load();
    loadMembersArea();
  }, [load, loadMembersArea, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Produto não encontrado.</p>
        <Button onClick={() => navigate("/dashboard")}>Voltar para os produtos</Button>
      </div>
    );
  }

  if ((product as any).is_ebook_hub) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <header className="border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-zinc-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="font-black uppercase tracking-tighter italic text-lg">{product.title}</h1>
            </div>
            <Badge className="bg-yellow-400 text-black font-black uppercase text-[10px]">Hub Premium</Badge>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ebooks.map((item) => (
              <Card key={item.id} className="bg-zinc-900 border-zinc-800 overflow-hidden group hover:border-yellow-400/50 transition-all duration-300">
                <div className="aspect-[3/4] relative overflow-hidden bg-zinc-800">
                  {item.cover_url ? (
                    <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-zinc-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="font-bold text-lg uppercase italic leading-tight">{item.title}</h3>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex gap-2">
                    {item.ebook_url && (
                      <Button 
                        className="flex-1 bg-white text-black hover:bg-zinc-200 font-bold text-xs uppercase"
                        onClick={() => setViewingFile({ type: 'pdf', url: item.ebook_url, title: item.title })}
                      >
                        <FileText className="w-3 h-3 mr-1" /> Ler Ebook
                      </Button>
                    )}
                    {item.audio_url && (
                      <Button 
                        className="flex-1 bg-yellow-400 text-black hover:bg-yellow-500 font-bold text-xs uppercase"
                        onClick={() => setViewingFile({ type: 'audio', url: item.audio_url, title: item.title })}
                      >
                        <Music className="w-3 h-3 mr-1" /> Ouvir
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>

        {viewingFile && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
              <h2 className="font-bold uppercase italic text-zinc-400">{viewingFile.title}</h2>
              <Button variant="ghost" onClick={() => setViewingFile(null)} className="text-zinc-400 hover:text-white">
                Fechar
              </Button>
            </header>
            <div className="flex-1 overflow-hidden bg-zinc-900">
              {viewingFile.type === 'pdf' ? (
                <iframe src={`${viewingFile.url}#toolbar=0`} className="w-full h-full border-0" />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-8">
                  <div className="max-w-md w-full space-y-8 text-center">
                    <div className="w-32 h-32 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto text-yellow-400">
                      <Music className="w-16 h-16 animate-pulse" />
                    </div>
                    <audio controls className="w-full h-12" controlsList="nodownload">
                      <source src={viewingFile.url} type="audio/mpeg" />
                    </audio>
                    <p className="text-zinc-500 font-medium italic">Modo de escuta ativa ativado.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" /> Ver todos os produtos
          </Button>
          {product.app_route && (
            <Button
              size="sm"
              onClick={() => {
                markHubReturn();
                navigate(product.app_route as string);
              }}
            >
              Abrir ferramenta <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{product.title}</h1>
          {product.description && <p className="text-muted-foreground mt-2">{product.description}</p>}
        </div>

        {downloadLink && (
          <Button onClick={() => window.open(downloadLink, "_blank", "noopener,noreferrer")}>
            <Download className="h-4 w-4" /> Baixar arquivo
          </Button>
        )}

        {(modulesLoading || modules.length > 0) && (
          <MembersModulesView modules={modules} isLoading={modulesLoading} />
        )}

        {active?.video_url && (
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
            {active.video_url.includes("youtube") || active.video_url.includes("vimeo") ? (
              <iframe src={active.video_url} title={active.title} className="h-full w-full" allowFullScreen />
            ) : (
              <video src={active.video_url} controls className="h-full w-full" poster={active.cover_url || undefined} />
            )}
          </div>
        )}

        {tutorials.length === 0 ? (
          modules.length === 0 && !modulesLoading ? (
            <p className="text-muted-foreground">Nenhum conteúdo cadastrado ainda para este produto.</p>
          ) : null
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutorials.map((tutorial) => (
              <Card
                key={tutorial.id}
                className={`overflow-hidden cursor-pointer transition-shadow hover:shadow-lg ${
                  active?.id === tutorial.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setActive(tutorial)}
              >
                <div className="aspect-video bg-muted flex items-center justify-center">
                  {tutorial.cover_url ? (
                    <img src={tutorial.cover_url} alt={tutorial.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <Package className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <CardContent className="pt-4 space-y-2">
                  <h3 className="font-semibold text-foreground">{tutorial.title}</h3>
                  {tutorial.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{tutorial.description}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    {tutorial.video_url && (
                      <Button size="sm" variant="secondary" onClick={() => setActive(tutorial)}>
                        <Play className="h-4 w-4" /> Assistir
                      </Button>
                    )}
                    {tutorial.download_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(tutorial.download_url as string, "_blank");
                        }}
                      >
                        <Download className="h-4 w-4" /> Download
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
