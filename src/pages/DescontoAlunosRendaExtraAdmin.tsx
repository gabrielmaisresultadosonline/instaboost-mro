import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Loader2, Save, Power, LogOut } from "lucide-react";

const DescontoAlunosRendaExtraAdmin = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  const CREDENTIALS = {
    email: "mro@gmail.com",
    password: "Ga145523@"
  };

  useEffect(() => {
    const session = localStorage.getItem("desconto_alunos_admin_session");
    if (session === "active") {
      setIsLoggedIn(true);
      fetchSettings();
    }
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("desconto_alunos_settings")
        .select("is_active")
        .single();

      if (error) throw error;
      if (data) setIsActive(data.is_active);
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginData.email === CREDENTIALS.email && loginData.password === CREDENTIALS.password) {
      setIsLoggedIn(true);
      localStorage.setItem("desconto_alunos_admin_session", "active");
      fetchSettings();
      toast.success("Login realizado com sucesso");
    } else {
      toast.error("E-mail ou senha incorretos");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("desconto_alunos_admin_session");
    toast.info("Sessão encerrada");
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      const { error } = await supabase
        .from("desconto_alunos_settings")
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .filter('id', 'neq', '00000000-0000-0000-0000-000000000000'); // Dummy filter to avoid error if no policy allows broad update

      // Since we don't know the ID, let's fetch first or update all (should only be one row)
      const { data: rows } = await supabase.from("desconto_alunos_settings").select("id").limit(1);
      if (rows && rows.length > 0) {
        const { error: updateError } = await supabase
          .from("desconto_alunos_settings")
          .update({ is_active: isActive, updated_at: new Date().toISOString() })
          .eq("id", rows[0].id);
        
        if (updateError) throw updateError;
      }

      toast.success("Configuração salva com sucesso!");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaveLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800 text-white">
          <CardHeader className="text-center">
            <div className="mx-auto bg-green-500/10 p-3 rounded-full w-fit mb-4">
              <Lock className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold">Admin Desconto Alunos</CardTitle>
            <CardDescription className="text-gray-400">
              Entre com suas credenciais para gerenciar o status do desconto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="mro@gmail.com"
                  className="bg-gray-800 border-gray-700 text-white"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  className="bg-gray-800 border-gray-700 text-white"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6">
                Acessar Painel
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Painel de Controle</h1>
            <p className="text-gray-400">Gerencie a visibilidade do desconto para alunos</p>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="text-gray-400 hover:text-white">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        <Card className="bg-gray-900 border-gray-800 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Power className={`w-5 h-5 ${isActive ? "text-green-500" : "text-red-500"}`} />
              Status do Desconto
            </CardTitle>
            <CardDescription className="text-gray-400">
              {isActive 
                ? "O desconto está ATIVO e os alunos podem comprar normalmente." 
                : "O desconto está DESATIVADO e os alunos verão a mensagem de 'Desconto Encerrado'."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-xl border border-gray-700">
              <div className="space-y-0.5">
                <Label className="text-base font-bold">Ativar Desconto</Label>
                <p className="text-sm text-gray-400">
                  Desative para mostrar a mensagem de encerramento na página.
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                className="data-[state=checked]:bg-green-500"
              />
            </div>

            <Button 
              onClick={handleSave} 
              disabled={saveLoading || loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6"
            >
              {saveLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
              Salvar Alteração
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DescontoAlunosRendaExtraAdmin;