import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Save, Trash2, Package, Video } from "lucide-react";

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
  const [tutorials, setTutorials] = useState<HubTutorialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<HubProductRow | null>(null);
  const [tutorialDraft, setTutorialDraft] = useState<HubTutorialRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("hub-api", { body: { action: "admin_list_products" } });
      if (data?.success) {
        setProducts(data.products || []);
        setTutorials(data.tutorials || []);
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
          const productTutorials = tutorials.filter((t) => t.product_id === product.id);
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
                  <div className="flex gap-2">
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? "Ativo" : "Inativo"}
                    </Badge>
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


                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Video className="h-4 w-4" /> Tutoriais ({productTutorials.length})
                    </p>
                    <Button size="sm" variant="secondary" onClick={() => setTutorialDraft(emptyTutorial(product.id!))}>
                      <Plus className="h-4 w-4" /> Novo tutorial
                    </Button>
                  </div>
                  {productTutorials.map((tutorial) => (
                    <div key={tutorial.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2">
                      <span className="text-sm text-foreground">{tutorial.title}</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setTutorialDraft(tutorial)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteTutorial(tutorial.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {tutorialDraft && tutorialDraft.product_id === product.id && (
                    <div className="space-y-3 rounded-lg border border-border p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Título</Label>
                          <Input
                            value={tutorialDraft.title}
                            onChange={(e) => setTutorialDraft({ ...tutorialDraft, title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Capa (URL)</Label>
                          <Input
                            value={tutorialDraft.cover_url || ""}
                            onChange={(e) => setTutorialDraft({ ...tutorialDraft, cover_url: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Vídeo (URL)</Label>
                          <Input
                            value={tutorialDraft.video_url || ""}
                            onChange={(e) => setTutorialDraft({ ...tutorialDraft, video_url: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Download (URL)</Label>
                          <Input
                            value={tutorialDraft.download_url || ""}
                            onChange={(e) => setTutorialDraft({ ...tutorialDraft, download_url: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea
                          value={tutorialDraft.description || ""}
                          onChange={(e) => setTutorialDraft({ ...tutorialDraft, description: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveTutorial} disabled={saving}>
                          <Save className="h-4 w-4" /> Salvar tutorial
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setTutorialDraft(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
