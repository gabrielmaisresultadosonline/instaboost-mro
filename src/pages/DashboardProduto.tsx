import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, Download, Play, ExternalLink, Package } from "lucide-react";
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("hub-api", { body: { action: "product", slug } });
      if (data?.success) {
        setProduct(data.product as HubProduct);
        setTutorials((data.tutorials || []) as HubTutorial[]);
        setActive((data.tutorials || [])[0] || null);
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  // Carrega a área de membros (módulos) publicada para este produto
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

        {/* Área de membros montada no /admin (mesmo padrão do ZAPMRO) */}
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
