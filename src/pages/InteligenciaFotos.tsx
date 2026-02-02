import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Sparkles, Image, History, Shield, Zap, Star } from "lucide-react";

const InteligenciaFotos = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("inteligencia-fotos-auth", {
        body: {
          action: "login",
          email: formData.email,
          password: formData.password,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || "Erro ao fazer login");
      }

      sessionStorage.setItem("inteligencia_fotos_user", JSON.stringify(data.user));
      toast.success("Login realizado com sucesso!");
      window.location.href = "/inteligenciafotos/dashboard";
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("inteligencia-fotos-auth", {
        body: {
          action: "register",
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || "Erro ao criar conta");
      }

      sessionStorage.setItem("inteligencia_fotos_user", JSON.stringify(data.user));
      toast.success("Conta criada com sucesso!");
      window.location.href = "/inteligenciafotos/dashboard";
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-200 px-4 py-2 rounded-full text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            Tecnologia de IA Avançada
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Inteligência <span className="text-purple-400">Fotos</span>
          </h1>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto mb-8">
            Transforme suas fotos em artes profissionais para Instagram usando 
            Inteligência Artificial. Posts e Stories incríveis em segundos!
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-white/10 border-purple-500/30 text-white">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-6 h-6 text-purple-300" />
              </div>
              <h3 className="font-semibold mb-2">Suba Sua Foto</h3>
              <p className="text-purple-200 text-sm">
                Envie sua foto de rosto ou corpo inteiro
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-purple-500/30 text-white">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Image className="w-6 h-6 text-purple-300" />
              </div>
              <h3 className="font-semibold mb-2">Escolha o Estilo</h3>
              <p className="text-purple-200 text-sm">
                Selecione entre diversos templates profissionais
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-purple-500/30 text-white">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-purple-300" />
              </div>
              <h3 className="font-semibold mb-2">Gere em Segundos</h3>
              <p className="text-purple-200 text-sm">
                IA gera sua arte profissional instantaneamente
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Login/Register Form */}
        <div className="max-w-md mx-auto">
          <Card className="bg-white/95 backdrop-blur shadow-2xl">
            <CardHeader>
              <CardTitle className="text-center text-2xl">
                {isLogin ? "Entrar" : "Criar Conta"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={isLogin ? "login" : "register"} onValueChange={(v) => setIsLogin(v === "login")}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Cadastro</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="seu@email.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Senha</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        placeholder="••••••••"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
                      {loading ? "Entrando..." : "Entrar"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome Completo</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="Seu nome"
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-email">E-mail</Label>
                      <Input
                        id="register-email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="seu@email.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">WhatsApp</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-password">Senha</Label>
                      <Input
                        id="register-password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        placeholder="••••••••"
                        minLength={6}
                      />
                    </div>
                    <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
                      {loading ? "Criando conta..." : "Criar Conta Grátis"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="mt-6 text-center">
                <a 
                  href="/inteligenciafotos/admin" 
                  className="text-sm text-purple-600 hover:underline"
                >
                  Acesso Administrativo
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Benefits */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-white mb-8">Por que usar o Inteligência Fotos?</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Star, title: "Qualidade Pro", desc: "Artes com acabamento profissional" },
              { icon: Zap, title: "Super Rápido", desc: "Geração em poucos segundos" },
              { icon: History, title: "Histórico", desc: "Salve e acesse suas criações" },
              { icon: Shield, title: "Seguro", desc: "Suas fotos protegidas" },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-6 h-6 text-purple-300" />
                </div>
                <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-purple-200 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteligenciaFotos;
