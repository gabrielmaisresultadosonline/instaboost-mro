import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Bot, Sparkles, MessageSquare, Shield, Zap } from "lucide-react";

export default function AgenteMRO() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    document.title = "AgenteMRO — Agente de IA para WhatsApp Oficial";
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate("/agentemro/painel");
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/agentemro/painel");
      setChecking(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/agentemro/painel`,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já pode entrar.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-2">
          <Bot className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg">AgenteMRO</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12 grid gap-10 md:grid-cols-2 items-center">
        <section>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Agente de IA no seu <span className="text-primary">WhatsApp Oficial</span>
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            Atenda, qualifique e venda 24/7 com a API oficial da Meta. Setup em minutos, IA treinada no seu negócio.
          </p>
          <ul className="mt-6 space-y-3">
            <li className="flex gap-3"><Sparkles className="w-5 h-5 text-primary shrink-0" /> IA responde no tom da sua marca</li>
            <li className="flex gap-3"><MessageSquare className="w-5 h-5 text-primary shrink-0" /> API oficial WhatsApp (Meta)</li>
            <li className="flex gap-3"><Shield className="w-5 h-5 text-primary shrink-0" /> Dados isolados por conta com RLS</li>
            <li className="flex gap-3"><Zap className="w-5 h-5 text-primary shrink-0" /> Deploy instantâneo, sem servidor</li>
          </ul>
        </section>

        <Card className="border-border shadow-lg">
          <CardHeader>
            <CardTitle>Acessar painel</CardTitle>
            <CardDescription>Entre ou crie sua conta AgenteMRO</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>

              <form onSubmit={handleAuth} className="space-y-4 mt-6">
                <TabsContent value="signup" className="space-y-4 mt-0">
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required={mode === "signup"} />
                  </div>
                </TabsContent>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
