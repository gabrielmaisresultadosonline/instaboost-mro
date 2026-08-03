import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Facebook, Instagram, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FBConfig {
  id: string;
  app_id: string;
  app_secret: string;
}

interface ProjectConnection {
  id: string;
  project_id: string;
  connected_as_name: string;
  fb_page_id: string;
  ig_business_id: string;
}

interface Project {
  id: string;
  company_name: string;
}

interface MktCCConfigPanelProps {
  creds: { email: string; password: string };
  projects: Project[];
}

export const MktCCConfigPanel = ({ creds, projects }: MktCCConfigPanelProps) => {
  const [config, setConfig] = useState<FBConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [connections, setConnections] = useState<Record<string, ProjectConnection>>({});

  const call = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("mktcc-api", {
      body: { action, email: creds.email, password: creds.password, ...extra },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "Erro");
    return data;
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("mktcc_fb_configs").select("*").maybeSingle();
      if (error) throw error;
      if (data) {
        setConfig(data);
        setAppId(data.app_id);
        setAppSecret(data.app_secret);
      }
      
      const { data: connData, error: connError } = await supabase.from("mktcc_project_connections").select("*");
      if (connError) throw connError;
      const connMap: Record<string, ProjectConnection> = {};
      connData.forEach(c => connMap[c.project_id] = c);
      setConnections(connMap);
    } catch (err) {
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadConfig(); }, []);

  const saveFBConfig = async () => {
    setSaving(true);
    try {
      if (config) {
        const { error } = await supabase.from("mktcc_fb_configs").update({ app_id: appId, app_secret: appSecret }).eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mktcc_fb_configs").insert({ app_id: appId, app_secret: appSecret });
        if (error) throw error;
      }
      toast.success("Configuração do App salva!");
      loadConfig();
    } catch (err) {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const startFBLogin = (projectId: string) => {
    if (!appId) return toast.error("Configure o App ID primeiro");
    // Interface para login do Facebook (abstração para o admin)
    // Em um cenário real, isso abriria o FB SDK ou redirecionaria
    toast.info("Iniciando fluxo de login Meta Business Suite...");
    window.alert("Aqui o admin faria o login com o Facebook pessoal (gestor) para selecionar as páginas da empresa " + projects.find(p => p.id === projectId)?.company_name);
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="w-5 h-5 text-blue-600" />
            Meta App Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Facebook App ID</Label>
              <Input value={appId} onChange={e => setAppId(e.target.value)} placeholder="Ex: 123456789" />
            </div>
            <div className="space-y-2">
              <Label>App Secret</Label>
              <Input type="password" value={appSecret} onChange={e => setAppSecret(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <Button onClick={saveFBConfig} disabled={saving} className="w-full md:w-auto">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Credenciais do App
          </Button>
          <p className="text-[10px] text-muted-foreground uppercase font-bold">
            Estas credenciais são usadas para autenticar com a Meta Graph API e permitir postagem automática.
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase">Conexões por Empresa</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {projects.map(project => {
              const conn = connections[project.id];
              return (
                <div key={project.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-bold">{project.company_name}</p>
                    {conn ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> CONECTADO
                        </Badge>
                        <span className="text-[10px] text-muted-foreground uppercase font-mono">
                          PG: {conn.fb_page_id} | IG: {conn.ig_business_id}
                        </span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[10px] mt-1">
                        <AlertCircle className="w-3 h-3 mr-1" /> NÃO CONECTADO
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant={conn ? "outline" : "default"} onClick={() => startFBLogin(project.id)}>
                      {conn ? "Reconectar" : "Conectar Facebook"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
