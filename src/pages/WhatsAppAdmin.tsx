import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Save, LogOut } from "lucide-react";

const ADMIN_SESSION_STORAGE_KEY = "whatsapp_admin_session_token";

interface OptionItem {
  id: string;
  label: string;
  message: string;
  icon_type: string;
  color: string;
  order_index: number;
  is_active: boolean;
}

const ICON_OPTIONS = [
  { value: "sparkles", label: "Estrela" },
  { value: "headset", label: "Suporte" },
  { value: "help", label: "Dúvida" },
];

const WhatsAppAdmin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [settings, setSettings] = useState({
    id: "",
    whatsapp_number: "",
    page_title: "",
    page_subtitle: "",
    button_text: "",
    whatsapp_message: "",
    photo_url: "",
  });
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const clearSession = () => {
    localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    setSessionToken("");
    setAuthenticated(false);
  };

  const fetchAdminData = async (tokenOverride?: string) => {
    const token = tokenOverride || sessionToken || localStorage.getItem(ADMIN_SESSION_STORAGE_KEY) || "";
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: response, error } = await supabase.functions.invoke("whatsapp-page", {
      body: { action: "adminData", token },
    });

    if (error || !response?.success) {
      if (response?.error?.includes("Sessão expirada")) {
        clearSession();
      }
      toast.error(response?.error || error?.message || "Erro ao carregar dados");
      setLoading(false);
      return;
    }

    const nextSettings = response.settings || {};
    setSettings({
      id: nextSettings.id || "",
      whatsapp_number: nextSettings.whatsapp_number || "",
      page_title: nextSettings.page_title || "",
      page_subtitle: nextSettings.page_subtitle || "",
      button_text: nextSettings.button_text || "",
      whatsapp_message: nextSettings.whatsapp_message || "",
      photo_url: nextSettings.photo_url || "",
    });
    setOptions(Array.isArray(response.options) ? (response.options as OptionItem[]) : []);
    setAuthenticated(true);
    setLoading(false);
  };

  const handleLogin = async () => {
    setLoginLoading(true);

    const { data: response, error } = await supabase.functions.invoke("whatsapp-page", {
      body: { 
        action: "login",
        email: email,
        password: password,
      },
    });

    if (error || !response?.success || !response?.token) {
      toast.error(response?.error || error?.message || "Email ou senha incorretos");
      setLoginLoading(false);
      return;
    }

    localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, response.token);
    setSessionToken(response.token);
    setAuthenticated(true);
    toast.success("Login realizado com sucesso!");
    await fetchAdminData(response.token);
    setLoginLoading(false);
  };

  useEffect(() => {
    const storedToken = localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (!storedToken) {
      setLoading(false);
      return;
    }

    setSessionToken(storedToken);
    setAuthenticated(true);
    fetchAdminData(storedToken);
  }, []);

  const handleSaveSettings = async () => {
    if (!settings.whatsapp_number) {
      toast.error("O número do WhatsApp é obrigatório");
      return;
    }

    setSaving(true);
    const token = sessionToken || localStorage.getItem(ADMIN_SESSION_STORAGE_KEY) || "";
    
    if (!token) {
      toast.error("Sessão não encontrada. Faça login novamente.");
      setAuthenticated(false);
      setSaving(false);
      return;
    }

    console.log("Saving settings with token length:", token.length);

    try {
      const { data: response, error } = await supabase.functions.invoke("whatsapp-page", {
        body: {
          action: "saveSettings",
          token,
          whatsapp_number: settings.whatsapp_number,
          page_title: settings.page_title,
          page_subtitle: settings.page_subtitle,
          button_text: settings.button_text,
          whatsapp_message: settings.whatsapp_message,
          photo_url: settings.photo_url,
        },
      });

      if (error || !response?.success) {
        console.error("Save error:", error || response?.error);
        if (response?.error?.includes("Sessão expirada") || error?.status === 401) {
          toast.error("Sessão expirada. Por favor, faça login novamente.");
          clearSession();
        } else {
          toast.error(response?.error || error?.message || "Erro ao salvar");
        }
      } else {
        toast.success("Configurações salvas!");
        // We don't necessarily need to refetch everything if we just saved
        // but it ensures UI is in sync
        await fetchAdminData(token);
      }
    } catch (err) {
      console.error("Unexpected error during save:", err);
      toast.error("Ocorreu um erro inesperado ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOption = async (option: OptionItem) => {
    const token = sessionToken || localStorage.getItem(ADMIN_SESSION_STORAGE_KEY) || "";
    const { data: response, error } = await supabase.functions.invoke("whatsapp-page", {
      body: {
        action: "saveOption",
        token,
        id: option.id,
        label: option.label,
        message: option.message,
        icon_type: option.icon_type,
        color: option.color,
        order_index: option.order_index,
        is_active: option.is_active,
      },
    });

    if (error || !response?.success) {
      if (response?.error?.includes("Sessão expirada")) clearSession();
      toast.error(response?.error || error?.message || "Erro ao salvar opção");
    } else {
      toast.success("Opção salva!");
      await fetchAdminData(token);
    }
  };

  const handleAddOption = async () => {
    const token = sessionToken || localStorage.getItem(ADMIN_SESSION_STORAGE_KEY) || "";
    const { data: response, error } = await supabase.functions.invoke("whatsapp-page", {
      body: { action: "addOption", token, order_index: options.length },
    });

    if (error || !response?.success) {
      if (response?.error?.includes("Sessão expirada")) clearSession();
      toast.error(response?.error || error?.message || "Erro ao criar opção");
    } else {
      toast.success("Opção criada!");
      await fetchAdminData(token);
    }
  };

  const handleDeleteOption = async (id: string) => {
    const token = sessionToken || localStorage.getItem(ADMIN_SESSION_STORAGE_KEY) || "";
    const { data: response, error } = await supabase.functions.invoke("whatsapp-page", {
      body: { action: "deleteOption", token, id },
    });

    if (error || !response?.success) {
      if (response?.error?.includes("Sessão expirada")) clearSession();
      toast.error(response?.error || error?.message || "Erro ao excluir");
    } else {
      toast.success("Opção excluída!");
      await fetchAdminData(token);
    }
  };

  const updateOption = (id: string, field: keyof OptionItem, value: string | number | boolean) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, [field]: value } : o)));
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] to-[#1a1a2e] flex items-center justify-center p-4">
        <div className="bg-[#1e1e2e] rounded-2xl p-8 max-w-sm w-full space-y-6 border border-gray-800">
          <h1 className="text-xl font-bold text-white text-center">Admin WhatsApp</h1>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[#2a2a3e] border-gray-700 text-white" />
            </div>
            <div>
              <Label className="text-gray-300">Senha</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#2a2a3e] border-gray-700 text-white" onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            </div>
            <Button onClick={handleLogin} disabled={loginLoading} className="w-full bg-green-600 hover:bg-green-700">
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
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white">Admin WhatsApp</h1>
            <p className="text-xs text-gray-400">Página de links e opções de contato</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={clearSession} className="text-gray-400 hover:text-white">
              <LogOut className="w-4 h-4 mr-1" /> Sair
            </Button>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-[#1e1e2e] rounded-2xl p-6 space-y-5 border border-gray-800">
          <h2 className="text-white font-semibold text-lg text-center mb-4">Configurações Gerais</h2>
          
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Título da Página</Label>
              <Input 
                value={settings.page_title} 
                onChange={(e) => setSettings({ ...settings, page_title: e.target.value })} 
                className="bg-[#2a2a3e] border-gray-700 text-white" 
                placeholder="Ex: Gabriel está disponível agora" 
              />
            </div>

            <div>
              <Label className="text-gray-300">Subtítulo da Página</Label>
              <Input 
                value={settings.page_subtitle} 
                onChange={(e) => setSettings({ ...settings, page_subtitle: e.target.value })} 
                className="bg-[#2a2a3e] border-gray-700 text-white" 
                placeholder="Ex: Sobre o que gostaria de falar..." 
              />
            </div>

            <div>
              <Label className="text-gray-300">Número do WhatsApp (com DDI)</Label>
              <Input 
                value={settings.whatsapp_number} 
                onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })} 
                className="bg-[#2a2a3e] border-gray-700 text-white h-12 text-lg" 
                placeholder="5511999999999" 
              />
            </div>
          </div>

          <Button onClick={handleSaveSettings} disabled={saving} className="w-full bg-green-600 hover:bg-green-700 h-12 font-bold text-lg">
            <Save className="w-5 h-5 mr-2" /> {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppAdmin;
