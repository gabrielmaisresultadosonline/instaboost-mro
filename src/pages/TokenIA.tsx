import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, AlertCircle, Copy, Trash2, KeyRound, LogOut } from "lucide-react";

const ADMIN_EMAIL = "mro@gmail.com";
const ADMIN_PASSWORD = "Ga145523@";
const STORAGE_KEY = "tokenia_authenticated";

const SUPABASE_URL = "https://adljdeekwifwcdcgbpit.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkbGpkZWVrd2lmd2NkY2dicGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjk0MDMsImV4cCI6MjA4MDcwNTQwM30.odKBOAuEEW0WJEburLRTL9Qj1EbitETmhxqNoE_F_g4";

const ENDPOINT = `${SUPABASE_URL}/functions/v1/api-token`;

type Token = { key: string; value: string; description: string | null; updated_at: string };

const TokenIA = () => {
  const { toast } = useToast();
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");

  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);

  const [key, setKey] = useState("deepseek");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "true") setAuthed(true);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ action: "list", admin_password: ADMIN_PASSWORD }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro");
      setTokens(json.tokens || []);
    } catch (e: any) {
      toast({ title: "Erro ao carregar", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed) load();
  }, [authed]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim().toLowerCase() === ADMIN_EMAIL && pwd === ADMIN_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setAuthed(true);
    } else setError("Credenciais inválidas");
  };

  const save = async () => {
    if (!key.trim() || !value.trim()) {
      toast({ title: "Preencha chave e valor", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ key: key.trim(), value: value.trim(), description, admin_password: ADMIN_PASSWORD }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro");
      toast({ title: "Token salvo!", description: `Chave: ${key}` });
      setValue("");
      setDescription("");
      load();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const del = async (k: string) => {
    if (!confirm(`Excluir token "${k}"?`)) return;
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ action: "delete", key: k, admin_password: ADMIN_PASSWORD }),
    });
    if (res.ok) {
      toast({ title: "Excluído" });
      load();
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado!` });
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="p-8 max-w-md w-full">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <KeyRound className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Token IA</h1>
            <p className="text-muted-foreground text-sm">Gestão de tokens externos</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Lock className="w-4 h-4" /> Senha</Label>
              <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">Entrar</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <KeyRound className="w-5 h-5" /> Token IA
            </h1>
            <p className="text-xs text-muted-foreground">Armazene tokens (DeepSeek, etc.) e use o link público nas ferramentas.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { sessionStorage.removeItem(STORAGE_KEY); setAuthed(false); }}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold">Adicionar / Atualizar Token</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Chave (identificador)</Label>
              <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="deepseek" />
            </div>
            <div className="space-y-1">
              <Label>Descrição (opcional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="DeepSeek API key" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Valor do Token</Label>
            <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} placeholder="sk-..." className="font-mono text-xs" />
          </div>
          <Button onClick={save} className="w-full">Salvar Token</Button>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">Tokens armazenados {loading && "(carregando...)"}</h2>
          {tokens.length === 0 && <p className="text-sm text-muted-foreground">Nenhum token cadastrado.</p>}
          {tokens.map((t) => {
            const url = `${ENDPOINT}?key=${encodeURIComponent(t.key)}`;
            return (
              <div key={t.key} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{t.key}</p>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => del(t.key)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor atual</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={t.value} className="font-mono text-xs" />
                    <Button variant="outline" size="sm" onClick={() => copy(t.value, "Token")}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Link público (GET → JSON)</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={url} className="font-mono text-xs" />
                    <Button variant="outline" size="sm" onClick={() => copy(url, "Link")}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Resposta: <code>{`{ "key": "${t.key}", "value": "...", "updated_at": "..." }`}</code>
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground">Atualizado: {new Date(t.updated_at).toLocaleString("pt-BR")}</p>
              </div>
            );
          })}
        </Card>

        <Card className="p-5 space-y-2 text-sm">
          <h3 className="font-semibold">Como usar na sua ferramenta</h3>
          <p className="text-muted-foreground text-xs">Exemplo em JavaScript:</p>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{`const r = await fetch("${ENDPOINT}?key=deepseek");
const { value } = await r.json();
// use 'value' como Bearer token`}</pre>
          <p className="text-muted-foreground text-xs">Ou via curl:</p>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{`curl "${ENDPOINT}?key=deepseek"`}</pre>
        </Card>
      </main>
    </div>
  );
};

export default TokenIA;
