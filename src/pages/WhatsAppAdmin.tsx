import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, LogOut } from "lucide-react";

const WhatsAppAdmin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [settings, setSettings] = useState({
    id: "",
    whatsapp_number: "",
    whatsapp_message: "",
    page_title: "",
    page_subtitle: "",
    button_text: "",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleLogin = async () => {
    setLoginLoading(true);
    const { data } = await supabase
      .from("whatsapp_page_settings")
      .select("admin_email, admin_password")
      .limit(1)
      .single();

    if (data && email === data.admin_email && password === data.admin_password) {
      setAuthenticated(true);
      toast.success("Login realizado com sucesso!");
    } else {
      toast.error("Email ou senha incorretos");
    }
    setLoginLoading(false);
  };

  useEffect(() => {
    if (!authenticated) return;
    const load = async () => {
      const { data } = await supabase
        .from("whatsapp_page_settings")
        .select("*")
        .limit(1)
        .single();
      if (data) {
        setSettings({
          id: data.id,
          whatsapp_number: data.whatsapp_number,
          whatsapp_message: data.whatsapp_message,
          page_title: data.page_title,
          page_subtitle: data.page_subtitle,
          button_text: data.button_text,
        });
      }
      setLoading(false);
    };
    load();
  }, [authenticated]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("whatsapp_page_settings")
      .update({
        whatsapp_number: settings.whatsapp_number,
        whatsapp_message: settings.whatsapp_message,
        page_title: settings.page_title,
        page_subtitle: settings.page_subtitle,
        button_text: settings.button_text,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    if (error) {
      toast.error("Erro ao salvar configurações");
    } else {
      toast.success("Configurações salvas com sucesso!");
    }
    setSaving(false);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] to-[#1a1a2e] flex items-center justify-center p-4">
        <div className="bg-[#1e1e2e] rounded-2xl p-8 max-w-sm w-full space-y-6 border border-gray-800">
          <h1 className="text-xl font-bold text-white text-center">
            Admin WhatsApp
          </h1>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#2a2a3e] border-gray-700 text-white"
                placeholder="Email"
              />
            </div>
            <div>
              <Label className="text-gray-300">Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#2a2a3e] border-gray-700 text-white"
                placeholder="Senha"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button
              onClick={handleLogin}
              disabled={loginLoading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loginLoading ? "Entrando..." : "Entrar"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] to-[#1a1a2e] p-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Admin WhatsApp</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAuthenticated(false)}
            className="text-gray-400 hover:text-white"
          >
            <LogOut className="w-4 h-4 mr-1" /> Sair
          </Button>
        </div>

        <div className="bg-[#1e1e2e] rounded-2xl p-6 space-y-5 border border-gray-800">
          <div>
            <Label className="text-gray-300">Número do WhatsApp (com DDI)</Label>
            <Input
              value={settings.whatsapp_number}
              onChange={(e) =>
                setSettings({ ...settings, whatsapp_number: e.target.value })
              }
              className="bg-[#2a2a3e] border-gray-700 text-white"
              placeholder="5511999999999"
            />
            <p className="text-xs text-gray-500 mt-1">Ex: 5511999999999</p>
          </div>

          <div>
            <Label className="text-gray-300">Mensagem pré-preenchida</Label>
            <Input
              value={settings.whatsapp_message}
              onChange={(e) =>
                setSettings({ ...settings, whatsapp_message: e.target.value })
              }
              className="bg-[#2a2a3e] border-gray-700 text-white"
            />
          </div>

          <div>
            <Label className="text-gray-300">Título da página</Label>
            <Input
              value={settings.page_title}
              onChange={(e) =>
                setSettings({ ...settings, page_title: e.target.value })
              }
              className="bg-[#2a2a3e] border-gray-700 text-white"
            />
          </div>

          <div>
            <Label className="text-gray-300">Subtítulo da página</Label>
            <Input
              value={settings.page_subtitle}
              onChange={(e) =>
                setSettings({ ...settings, page_subtitle: e.target.value })
              }
              className="bg-[#2a2a3e] border-gray-700 text-white"
            />
          </div>

          <div>
            <Label className="text-gray-300">Texto do botão</Label>
            <Input
              value={settings.button_text}
              onChange={(e) =>
                setSettings({ ...settings, button_text: e.target.value })
              }
              className="bg-[#2a2a3e] border-gray-700 text-white"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppAdmin;
