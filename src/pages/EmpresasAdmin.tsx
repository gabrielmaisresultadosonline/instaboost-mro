import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Save, Users, Link as LinkIcon, RefreshCw } from "lucide-react";

const ADMIN_EMAIL = "mro@gmail.com";
const ADMIN_PASSWORD = "Ga145523@";

interface Lead {
  id: string;
  nome_completo: string;
  whatsapp: string;
  email: string;
  tem_empresa: string | null;
  vende_produto: string | null;
  presta_servico: string | null;
  iniciando_digital: string | null;
  marca_e_passa: string | null;
  email_confirmacao_enviado: boolean | null;
  created_at: string;
}

interface Settings {
  id: string;
  whatsapp_group_link: string;
  page_title: string | null;
  page_subtitle: string | null;
}

const EmpresasAdmin = () => {
  const [auth, setAuth] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [settings, setSettings] = useState<Settings | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("empresas-admin-auth") === "1") setAuth(true);
  }, []);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      sessionStorage.setItem("empresas-admin-auth", "1");
      setAuth(true);
    } else {
      toast.error("Credenciais inválidas");
    }
  };

  const loadAll = async () => {
    setLoading(true);
    const [{ data: s }, { data: l }] = await Promise.all([
      supabase.from("empresas_settings").select("*").limit(1).maybeSingle(),
      supabase.from("empresas_leads").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    setSettings(s as Settings | null);
    setLeads((l as Lead[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (auth) loadAll();
  }, [auth]);

  const saveSettings = async () => {
    if (!settings) return;
    const { error } = await supabase
      .from("empresas_settings")
      .update({
        whatsapp_group_link: settings.whatsapp_group_link,
        page_title: settings.page_title,
        page_subtitle: settings.page_subtitle,
      })
      .eq("id", settings.id);
    if (error) toast.error(error.message);
    else toast.success("Configurações salvas");
  };

  if (!auth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" /> Admin Empresas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={login} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label>Senha</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full">Entrar</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin · /empresas</h1>
          <Button variant="outline" onClick={loadAll} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        <Tabs defaultValue="settings">
          <TabsList>
            <TabsTrigger value="settings"><LinkIcon className="w-4 h-4 mr-2" />Configurações</TabsTrigger>
            <TabsTrigger value="leads"><Users className="w-4 h-4 mr-2" />Leads ({leads.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <Card>
              <CardHeader><CardTitle>Configurações da página</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {settings && (
                  <>
                    <div>
                      <Label>Link do Grupo do WhatsApp</Label>
                      <Input
                        value={settings.whatsapp_group_link}
                        onChange={(e) => setSettings({ ...settings, whatsapp_group_link: e.target.value })}
                        placeholder="https://chat.whatsapp.com/..."
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Este link será enviado por email para todos os cadastrados.
                      </p>
                    </div>
                    <div>
                      <Label>Título da página</Label>
                      <Input
                        value={settings.page_title || ""}
                        onChange={(e) => setSettings({ ...settings, page_title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Subtítulo</Label>
                      <Textarea
                        value={settings.page_subtitle || ""}
                        onChange={(e) => setSettings({ ...settings, page_subtitle: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <Button onClick={saveSettings}>
                      <Save className="w-4 h-4 mr-2" /> Salvar
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads">
            <Card>
              <CardHeader><CardTitle>Cadastros do grupo</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>WhatsApp</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Serviço</TableHead>
                        <TableHead>Iniciando</TableHead>
                        <TableHead>Marca/Passa</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                          <TableCell>{l.nome_completo}</TableCell>
                          <TableCell>{l.whatsapp}</TableCell>
                          <TableCell>{l.email}</TableCell>
                          <TableCell>{l.tem_empresa || "-"}</TableCell>
                          <TableCell>{l.vende_produto || "-"}</TableCell>
                          <TableCell>{l.presta_servico || "-"}</TableCell>
                          <TableCell>{l.iniciando_digital || "-"}</TableCell>
                          <TableCell>{l.marca_e_passa || "-"}</TableCell>
                          <TableCell>
                            {l.email_confirmacao_enviado
                              ? <Badge className="bg-emerald-600">Enviado</Badge>
                              : <Badge variant="secondary">Pendente</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                      {leads.length === 0 && (
                        <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nenhum cadastro ainda.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EmpresasAdmin;
