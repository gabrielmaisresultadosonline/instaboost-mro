import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, LogIn, Save, Copy, Check, Trash2, Send, UserPlus, Webhook, RefreshCw } from "lucide-react";

interface Buyer {
  id: string;
  email: string;
  name: string | null;
  status: string;
  source: string;
  kiwify_event: string | null;
  created_at: string;
}

export default function PostsPromptsAdmin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [openaiKey, setOpenaiKey] = useState("");
  const [masked, setMasked] = useState("");
  const [loading, setLoading] = useState(false);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [sendOnAdd, setSendOnAdd] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookToken, setWebhookToken] = useState("");
  const [copied, setCopied] = useState<string>("");

  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    return await supabase.functions.invoke("postsprompts-admin", {
      body: { action, email, password, ...extra },
    });
  };

  const login = async () => {
    setLoading(true);
    const { data, error } = await call("login");
    setLoading(false);
    if (error || !data?.success) return toast.error("Credenciais inválidas");
    setAuthed(true);
    toast.success("Logado");
  };

  const loadAll = async () => {
    const [k, b, w] = await Promise.all([call("get"), call("list_buyers"), call("webhook_info")]);
    setMasked((k.data as any)?.masked || "");
    setBuyers(((b.data as any)?.buyers as Buyer[]) || []);
    setWebhookUrl((w.data as any)?.url || "");
    setWebhookToken((w.data as any)?.token || "");
  };

  useEffect(() => {
    if (authed) loadAll();
  }, [authed]);

  const save = async () => {
    if (!openaiKey.trim()) return toast.error("Cole a chave");
    setLoading(true);
    const { data, error } = await call("save", { openai_api_key: openaiKey.trim() });
    setLoading(false);
    if (error || !data?.success) return toast.error("Erro ao salvar");
    toast.success("Chave OpenAI salva");
    setOpenaiKey("");
    loadAll();
  };

  const addBuyer = async () => {
    if (!newEmail.trim()) return toast.error("Email obrigatório");
    setLoading(true);
    const { data, error } = await call("add_buyer", {
      buyer_email: newEmail.trim(),
      buyer_name: newName.trim() || null,
      send_email: sendOnAdd,
    });
    setLoading(false);
    if (error || !(data as any)?.success) return toast.error("Erro ao adicionar");
    toast.success(sendOnAdd ? "Adicionado e email enviado!" : "Adicionado!");
    if (sendOnAdd && (data as any)?.email_sent === false) {
      toast.error("Email não enviado: " + ((data as any)?.email_error || "erro"));
    }
    setNewEmail("");
    setNewName("");
    loadAll();
  };

  const sendAccess = async (bEmail: string) => {
    const { data } = await call("send_access", { buyer_email: bEmail });
    if ((data as any)?.success) toast.success("Email enviado para " + bEmail);
    else toast.error("Erro: " + ((data as any)?.error || ""));
  };

  const removeBuyer = async (bEmail: string) => {
    if (!confirm(`Remover acesso de ${bEmail}?`)) return;
    await call("remove_buyer", { buyer_email: bEmail });
    toast.success("Removido");
    loadAll();
  };

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copiado");
    setTimeout(() => setCopied(""), 1500);
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
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">PostsPrompts • Admin</h1>
          <Button variant="outline" size="sm" onClick={loadAll}>
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
        </div>

        {/* WEBHOOK KIWIFY */}
        <Card className="p-6 space-y-4 border-purple-500/40">
          <div className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-purple-500" />
            <h2 className="text-xl font-semibold">Webhook Kiwify</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure este Webhook na Kiwify (Configurações → Webhooks → Novo). Marque os eventos:
            <strong> Pix gerado, Compra aprovada, Compra recusada, Reembolso, Chargeback, Assinatura cancelada</strong>.
            Quando uma compra é aprovada, o email do cliente é cadastrado automaticamente e recebe o acesso. Em reembolso/cancelamento, o acesso é removido.
          </p>

          <div className="space-y-2">
            <Label>URL do Webhook (cole na Kiwify)</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
              <Button onClick={() => copy(webhookUrl, "url")} variant="outline">
                {copied === "url" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Token (já incluso na URL acima)</Label>
            <div className="flex gap-2">
              <Input value={webhookToken} readOnly className="font-mono" />
              <Button onClick={() => copy(webhookToken, "tok")} variant="outline">
                {copied === "tok" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="bg-muted p-3 rounded text-sm">
            <strong>Produto na Kiwify:</strong> MROIMAGEM PRO — selecione na seção "Produtos" do webhook.
          </div>
        </Card>

        {/* ADD MANUAL */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-green-500" />
            <h2 className="text-xl font-semibold">Adicionar acesso manual</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Use para testar o fluxo de email sem precisar do webhook, ou liberar acesso manualmente.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Email do cliente</Label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="cliente@email.com" />
            </div>
            <div className="space-y-2">
              <Label>Nome (opcional)</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do cliente" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sendOnAdd} onChange={(e) => setSendOnAdd(e.target.checked)} />
            Enviar email de acesso ao adicionar
          </label>
          <Button onClick={addBuyer} disabled={loading}>
            <UserPlus className="w-4 h-4 mr-2" /> Adicionar e {sendOnAdd ? "enviar" : "salvar"}
          </Button>
        </Card>

        {/* BUYERS TABLE */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Acessos cadastrados ({buyers.length})</h2>
          {buyers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum acesso ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b">
                  <tr>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Nome</th>
                    <th className="py-2 pr-3">Origem</th>
                    <th className="py-2 pr-3">Evento</th>
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {buyers.map((b) => (
                    <tr key={b.id} className="border-b hover:bg-muted/40">
                      <td className="py-2 pr-3 font-mono text-xs">{b.email}</td>
                      <td className="py-2 pr-3">{b.name || "—"}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${b.source === "kiwify" ? "bg-purple-500/20 text-purple-700" : "bg-blue-500/20 text-blue-700"}`}>
                          {b.source}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-xs">{b.kiwify_event || "—"}</td>
                      <td className="py-2 pr-3 text-xs">{new Date(b.created_at).toLocaleString("pt-BR")}</td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => sendAccess(b.email)} title="Reenviar email">
                            <Send className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => removeBuyer(b.email)} title="Remover">
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* OPENAI KEY */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Chave OpenAI</h2>
          <p className="text-sm text-muted-foreground">
            Usada para gerar os prompts profissionais (começa com <code>sk-</code>).
          </p>
          {masked && (
            <div className="text-sm p-3 rounded bg-muted">
              Chave atual: <span className="font-mono">{masked}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label>Nova chave</Label>
            <Input type="password" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} placeholder="sk-..." />
          </div>
          <Button onClick={save} disabled={loading}>
            <Save className="w-4 h-4 mr-2" /> Salvar
          </Button>
        </Card>
      </div>
    </div>
  );
}
