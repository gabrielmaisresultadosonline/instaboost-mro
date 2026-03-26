import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

const ZapMROLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simple admin auth - same pattern as other pages
    if (email === "mro@gmail.com" && password === "Ga145523@") {
      sessionStorage.setItem("zapmro_tool_auth", "true");
      sessionStorage.setItem("zapmro_tool_user", email);
      toast.success("Login realizado com sucesso!");
      navigate("/zapmro-tool");
    } else {
      toast.error("Email ou senha incorretos");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0d1117] to-[#1a1a2e] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] mb-4 shadow-lg shadow-[#25D366]/20">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">ZAP MRO</h1>
          <p className="text-gray-400 mt-2">Plataforma WhatsApp Cloud CRM</p>
        </div>

        <Card className="bg-[#161b22] border-[#30363d] shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white text-center text-lg">Acesse sua conta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-10 bg-[#0d1117] border-[#30363d] text-white placeholder:text-gray-600 focus:border-[#25D366] focus:ring-[#25D366]/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 bg-[#0d1117] border-[#30363d] text-white placeholder:text-gray-600 focus:border-[#25D366] focus:ring-[#25D366]/20"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20bd5a] hover:to-[#0f7a6b] text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-[#25D366]/20"
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-gray-600 text-xs mt-6">
          © {new Date().getFullYear()} MRO - Mais Resultados Online
        </p>
      </div>
    </div>
  );
};

export default ZapMROLogin;
