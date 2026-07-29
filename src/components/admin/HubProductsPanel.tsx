import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Save, Trash2, Package, LayoutList, ExternalLink } from "lucide-react";
import ModuleManager from "@/components/admin/ModuleManager";
import { loadModulesFromCloud, type ModulePlatform } from "@/lib/adminConfig";

interface HubProductRow {
  id?: string;
  slug: string;
  title: string;
  description: string | null;
  thumb_url: string | null;
  app_route: string | null;
  sales_page_url: string | null;
  price: number;
  access_source: string;
  order_index: number;
  is_active: boolean;
}

interface HubTutorialRow {
  id?: string;
  product_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  video_url: string | null;
  download_url: string | null;
  order_index: number;
  is_active: boolean;
}

const emptyProduct = (): HubProductRow => ({
  slug: "",
  title: "",
  description: "",
  thumb_url: "",
  app_route: "",
  sales_page_url: "",
  price: 0,
  access_source: "manual",
  order_index: 0,
  is_active: true,
});

const emptyTutorial = (productId: string): HubTutorialRow => ({
  product_id: productId,
  title: "",
  description: "",
  cover_url: "",
  video_url: "",
  download_url: "",
  order_index: 0,
  is_active: true,
});

export default function HubProductsPanel() {
  const { toast } = useToast();
  const [products, setProducts] = useState<HubProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<HubProductRow | null>(null);
  // Produto cuja área de membros (módulos) está aberta para edição
  const [membersFor, setMembersFor] = useState<string | null>(null);
  const [hubDownloadLinks, setHubDownloadLinks] = useState<Record<string, string>>({});
  // Quantidade de módulos publicados por slug (para exibir a tarja "Área de membros ativa")
  const [membersCount, setMembersCount] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("hub-api", { body: { action: "admin_list_products" } });
      if (data?.success) {
        const list: HubProductRow[] = data.products || [];
        setProducts(list);

        // Verifica quais produtos já possuem área de membros publicada
        const entries = await Promise.all(
          list
            .filter((p) => !!p.slug)
            .map(async (p) => {
              try {
                const cloud = await loadModulesFromCloud(`hub-${p.slug}` as ModulePlatform);
                return [p.slug, cloud?.modules?.length || 0] as const;
              } catch {
                return [p.slug, 0] as const;
              }
            })
        );
        setMembersCount(Object.fromEntries(entries));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveProduct = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const { data } = await supabase.functions.invoke("hub-api", {
        body: { action: "admin_save_product", product: editing },
      });
      if (data?.success) {
        toast({ title: "Produto salvo" });
        setEditing(null);
        load();
      } else {
        toast({ title: data?.error || "Erro ao salvar", variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id?: string) => {
    if (!id) return;
    if (!confirm("Excluir este produto e seus tutoriais?")) return;
    await supabase.functions.invoke("hub-api", { body: { action: "admin_delete_product", id } });
    load();
  };

  const saveTutorial = async () => {
    if (!tutorialDraft) return;
    setSaving(true);
    try {
      const { data } = await supabase.functions.invoke("hub-api", {
        body: { action: "admin_save_tutorial", tutorial: tutorialDraft },
      });
      if (data?.success) {
        toast({ title: "Tutorial salvo" });
        setTutorialDraft(null);
        load();
      } else {
        toast({ title: data?.error || "Erro ao salvar", variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteTutorial = async (id?: string) => {
    if (!id) return;
    if (!confirm("Excluir este tutorial?")) return;
    await supabase.functions.invoke("hub-api", { body: { action: "admin_delete_tutorial", id } });
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard — Produtos</h2>
          <p className="text-sm text-muted-foreground">
            Produtos exibidos em /dashboard para os clientes, com tutoriais e liberação de acesso.
          </p>
        </div>
        <Button onClick={() => setEditing(emptyProduct())}>
          <Plus className="h-4 w-4" /> Novo produto
        </Button>
      </div>

      {editing && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Slug (URL)</Label>
                <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={editing.description || ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Imagem de capa (URL)</Label>
                <Input value={editing.thumb_url || ""} onChange={(e) => setEditing({ ...editing, thumb_url: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Rota interna (ex: /instagram)</Label>
                <Input value={editing.app_route || ""} onChange={(e) => setEditing({ ...editing, app_route: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Página de vendas</Label>
                <Input
                  value={editing.sales_page_url || ""}
                  onChange={(e) => setEditing({ ...editing, sales_page_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço (R$)</Label>
                <Input
                  type="number"
                  value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Origem do acesso</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editing.access_source}
                  onChange={(e) => setEditing({ ...editing, access_source: e.target.value })}
                >
                  <option value="manual">Manual / compra pela dashboard</option>
                  <option value="mro_tool">MRO Ferramenta</option>
                  <option value="zapmro">ZAPMRO</option>
                  <option value="postscomia">Posts com IA</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={editing.order_index}
                  onChange={(e) => setEditing({ ...editing, order_index: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveProduct} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {products.map((product) => {
          const hasMembers = (membersCount[product.slug] || 0) > 0;
          return (
            <Card key={product.id}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      {product.thumb_url ? (
                        <img src={product.thumb_url} alt={product.title} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{product.title}</p>
                      <p className="text-xs text-muted-foreground">
                        /{product.slug} · R$ {Number(product.price).toFixed(0)} · {product.access_source}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    {hasMembers && (
                      <Badge variant="outline" className="gap-1">
                        <LayoutList className="h-3 w-3" /> Área de membros ativa
                      </Badge>
                    )}
                    {product.app_route && (
                      <Badge variant="outline" className="gap-1">
                        <ExternalLink className="h-3 w-3" /> Redirecionado · {product.app_route}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant={membersFor === product.slug ? "default" : "outline"}
                      onClick={() => setMembersFor(membersFor === product.slug ? null : product.slug)}
                      disabled={!product.slug}
                    >
                      <LayoutList className="h-4 w-4" /> Área de membros
                    </Button>

                    <Button size="sm" variant="outline" onClick={() => setEditing(product)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteProduct(product.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {membersFor === product.slug && product.slug && (
                  <div className="border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground mb-3">
                      Monte a área de membros deste produto (módulos, vídeos MP4/YouTube, capas 1080x1920, seções e
                      botões) — mesmo padrão da área do ZAPMRO.
                    </p>
                    <ModuleManager
                      key={`hub-${product.slug}`}
                      platform={`hub-${product.slug}` as ModulePlatform}
                      downloadLink={hubDownloadLinks[product.slug] || ""}
                      onDownloadLinkChange={(link) =>
                        setHubDownloadLinks((prev) => ({ ...prev, [product.slug]: link }))
                      }
                      onSaveSettings={() => {
                        toast({ title: "Configurações salvas" });
                      }}
                    />
                  </div>
                )}

              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
