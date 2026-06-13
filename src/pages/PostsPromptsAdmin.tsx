import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, LogIn, Save } from "lucide-react";

export default function PostsPromptsAdmin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [openaiKey, setOpenaiKey] = useState("");
  const [masked, setMasked] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("postsprompts-admin", {
      body: { action: "login", email, password },
    });
    setLoading(false);
    if (error || !data?.success) return toast.error("Credenciais inválidas");
    setAuthed(true);
    toast.success("Logado");
    loadKey();
  };

  const loadKey = async () => {
    const { data } = await supabase.functions.invoke("postsprompts-admin", {
      body: { action: "get", email, password },
    });
    setMasked(data?.masked || "");
  };

  const save = async () => {
    if (!openaiKey.trim()) return toast.error("Cole a chave");
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("postsprompts-admin", {
      body: { action: "save", email, password, openai_api_key: openaiKey.trim() },
    });
    setLoading(false);
    if (error || !data?.success) return toast.error("Erro ao salvar");
    toast.success("Chave OpenAI salva");
    setOpenaiKey("");
    loadKey();
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 space-y-4">
          <div className="text-center space-y-2">
            <KeyRound className="w-10 h-10 mx-auto text-primary" />
            <h1 className="text-2xl font-bold">Admin PostsPrompts</h1>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mro@gmail.com" />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} />
          </div>
          <Button onClick={login} disabled={loading} className="w-full">
            <LogIn className="w-4 h-4 mr-2" /> Entrar
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">PostsPrompts • Admin</h1>
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Chave OpenAI</h2>
          <p className="text-sm text-muted-foreground">
            Cole sua API key da OpenAI (começa com <code>sk-</code>). Ela será usada para gerar os prompts profissionais.
          </p>
          {masked && (
            <div className="text-sm p-3 rounded bg-muted">
              Chave atual: <span className="font-mono">{masked}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label>Nova chave</Label>
            <Input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          <Button onClick={save} disabled={loading}>
            <Save className="w-4 h-4 mr-2" /> Salvar
          </Button>
        </Card>
      </div>
    </div>
  );
}
