import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Music, BookOpen, Plus, Trash2, Upload, Save, Image as ImageIcon } from "lucide-react";

interface EbookAudioBook {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  audio_url: string;
  ebook_url: string;
  order_index: number;
}

const EbookAudiobookManager = ({ productId }: { productId: string }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<EbookAudioBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<EbookAudioBook | null>(null);

  const loadItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('hub_product_ebooks')
      .select('*')
      .eq('product_id', productId)
      .order('order_index');
    if (data) setItems(data as EbookAudioBook[]);
    setLoading(false);
  };

  React.useEffect(() => { loadItems(); }, [productId]);

  const saveItem = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from('hub_product_ebooks')
      .upsert({ ...editing, product_id: productId });
    
    if (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } else {
      toast({ title: "Salvo com sucesso!" });
      setEditing(null);
      loadItems();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">Ebooks & Audiobooks</h3>
        <Button onClick={() => setEditing({ id: crypto.randomUUID(), title: '', description: '', cover_url: '', audio_url: '', ebook_url: '', order_index: 0 })}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar
        </Button>
      </div>

      {editing && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Label>Título</Label>
            <Input value={editing.title} onChange={e => setEditing({...editing, title: e.target.value})} />
            <Label>Descrição</Label>
            <Input value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} />
            <Label>URL da Capa</Label>
            <Input value={editing.cover_url} onChange={e => setEditing({...editing, cover_url: e.target.value})} />
            <Label>URL do Áudio (MP3)</Label>
            <Input value={editing.audio_url} onChange={e => setEditing({...editing, audio_url: e.target.value})} />
            <Label>URL do PDF</Label>
            <Input value={editing.ebook_url} onChange={e => setEditing({...editing, ebook_url: e.target.value})} />
            <div className="flex gap-2">
              <Button onClick={saveItem}>Salvar</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-3 border rounded">
            <span>{item.title}</span>
            <Button variant="ghost" onClick={() => setEditing(item)}>Editar</Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EbookAudiobookManager;
