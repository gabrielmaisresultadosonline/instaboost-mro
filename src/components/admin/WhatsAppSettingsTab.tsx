import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, RefreshCw, MessageCircle } from "lucide-react";

const WhatsAppSettingsTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    id: "",
    whatsapp_number: "",
    page_title: "",
    page_subtitle: "",
    button_text: "",
    whatsapp_message: "",
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("whatsapp_page_settings")
        .select("id, whatsapp_number, page_title, page_subtitle, button_text, whatsapp_message")
        .limit(1)
        .single();
      if (data) {
        setSettings({
          id: data.id,
          whatsapp_number: data.whatsapp_number,
          page_title: data.page_title,
          page_subtitle: data.page_subtitle,
          button_text: data.button_text || "",
          whatsapp_message: data.whatsapp_message || "",
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("whatsapp_page_settings")
      .update({
        whatsapp_number: settings.whatsapp_number,
        page_title: settings.page_title,
        page_subtitle: settings.page_subtitle,
        button_text: settings.button_text,
        whatsapp_message: settings.whatsapp_message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    if (error) toast.error("Erro ao salvar");
    else toast.success("Configurações do WhatsApp salvas!");
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <MessageCircle className="w-6 h-6 text-primary" />
        Configurações do WhatsApp
      </h2>

      <div className="glass-card p-6 space-y-5">
        <div>
          <Label>Número do WhatsApp (com DDI)</Label>
          <Input
            value={settings.whatsapp_number}
            onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
            placeholder="5511999999999"
            className="bg-secondary/50 mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Ex: 5511999999999 (usado na página /whatsapp)
          </p>
        </div>

        <div>
          <Label>Título da página</Label>
          <Input
            value={settings.page_title}
            onChange={(e) => setSettings({ ...settings, page_title: e.target.value })}
            className="bg-secondary/50 mt-1"
          />
        </div>
        
        <div>
          <Label>Texto do botão principal</Label>
          <Input
            value={settings.button_text}
            onChange={(e) => setSettings({ ...settings, button_text: e.target.value })}
            className="bg-secondary/50 mt-1"
            placeholder="FALAR NO WHATSAPP"
          />
        </div>

        <div>
          <Label>Mensagem padrão do WhatsApp</Label>
          <Input
            value={settings.whatsapp_message}
            onChange={(e) => setSettings({ ...settings, whatsapp_message: e.target.value })}
            className="bg-secondary/50 mt-1"
            placeholder="Olá, vim pelo site..."
          />
        </div>

        <div>
          <Label>Subtítulo da página</Label>
          <Input
            value={settings.page_subtitle}
            onChange={(e) => setSettings({ ...settings, page_subtitle: e.target.value })}
            className="bg-secondary/50 mt-1"
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
};

export default WhatsAppSettingsTab;
