import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield, Settings, Link, MessageSquare, Save, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MROCriativoAdmin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === "mro@gmail.com" && password === "Ga145523@") {
      setIsAuthenticated(true);
      toast.success("Bem-vindo, Administrador!");
    } else {
      toast.error("Credenciais inválidas");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050508]">
        <Card className="w-full max-w-md bg-[#0a0a0f] border-white/10">
          <CardHeader>
            <CardTitle className="text-center text-white flex items-center justify-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              MRO Criativo Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/10" />
              <Input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/5 border-white/10" />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white">Entrar</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] p-8 text-white">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <h1 className="text-3xl font-black text-white">Painel de Configurações <span className="text-primary">MRO Criativo</span></h1>
          <Button variant="outline" onClick={() => navigate("/mrocriativo")}>Voltar ao site</Button>
        </header>

        <Tabs defaultValue="apis" className="space-y-4">
          <TabsList className="bg-white/5 border-white/10">
            <TabsTrigger value="apis"><Key className="w-4 h-4 mr-2" />Autenticações (API)</TabsTrigger>
            <TabsTrigger value="urls"><Link className="w-4 h-4 mr-2" />URLs</TabsTrigger>
            <TabsTrigger value="fallbacks"><MessageSquare className="w-4 h-4 mr-2" />Fallbacks</TabsTrigger>
          </TabsList>

          <TabsContent value="apis">
            <Card className="bg-[#0a0a0f] border-white/10">
              <CardHeader><CardTitle>Configurações de API</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Meta Client ID</Label><Input className="bg-white/5" /></div>
                  <div className="space-y-2"><Label>Meta Client Secret</Label><Input className="bg-white/5" /></div>
                </div>
                <Button><Save className="w-4 h-4 mr-2" />Salvar</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="urls">
            <Card className="bg-[#0a0a0f] border-white/10">
              <CardHeader><CardTitle>Configurações de URLs</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Redirect URL (Auth)</Label><Input className="bg-white/5" /></div>
                <Button><Save className="w-4 h-4 mr-2" />Salvar</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fallbacks">
            <Card className="bg-[#0a0a0f] border-white/10">
              <CardHeader><CardTitle>Configurações de Fallback</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Mensagem de Erro Padrão</Label><Input className="bg-white/5" /></div>
                <Button><Save className="w-4 h-4 mr-2" />Salvar</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MROCriativoAdmin;
