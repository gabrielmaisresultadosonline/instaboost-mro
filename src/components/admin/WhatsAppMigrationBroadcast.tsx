import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  MessageCircle,
  Search,
  Trash2,
  Send,
  RefreshCw,
  Loader2,
  Mail,
  CheckCircle2,
  XCircle,
  TestTube2,
  History,
  Users,
} from "lucide-react";

// ---------------- Default professional template ----------------
const DEFAULT_SUBJECT = "📢 Importante: Novo número oficial de contato da MRO";

const WHATSAPP_URL = "https://maisresultadosonline.com.br/whatsapp";
const INSTAGRAM_URL = "https://instagram.com/maisresultadosonline";

const buildDefaultHtml = () => `
<div style="max-width:620px;margin:0 auto;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#222;border:1px solid #eee;border-radius:10px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#000 0%,#1a1a1a 100%);padding:28px;text-align:center;border-bottom:3px solid #FFD700;">
    <div style="display:inline-block;background:#FFD700;color:#000;padding:8px 22px;border-radius:6px;font-size:24px;font-weight:bold;letter-spacing:2px;">MRO</div>
    <p style="color:#fff;margin:14px 0 0 0;font-size:13px;letter-spacing:1px;">MAIS RESULTADOS ONLINE</p>
  </div>

  <div style="padding:32px 28px;">
    <h2 style="color:#111;margin:0 0 16px 0;font-size:22px;">Estamos melhorando ainda mais o nosso atendimento 💛</h2>

    <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 14px 0;">
      Olá! Aqui é a equipe de <strong>suporte da MRO – Mais Resultados Online</strong>.
    </p>

    <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 14px 0;">
      Este e-mail é <strong>apenas informativo</strong>: estamos <strong>migrando o nosso contato oficial</strong> para um <strong>novo número de WhatsApp</strong>, com o objetivo de melhorar a velocidade do atendimento, organizar melhor os tickets de suporte e oferecer uma experiência cada vez mais profissional para você que confia no nosso trabalho.
    </p>

    <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 14px 0;">
      O número antigo será <strong>desativado em breve</strong>. Para continuar recebendo suporte, atualizações da plataforma, novidades, materiais e ofertas exclusivas, <strong>salve o nosso novo contato</strong> clicando no botão abaixo:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0;">
      <tr>
        <td style="text-align:center;background:#25D366;border-radius:10px;">
          <a href="${WHATSAPP_URL}" style="display:block;color:#ffffff;text-decoration:none;font-weight:bold;font-size:17px;padding:16px 22px;">📱 Falar no novo WhatsApp oficial</a>
        </td>
      </tr>
    </table>

    <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 14px 0;">
      Aproveite e siga também o nosso <strong>Instagram oficial</strong> para acompanhar bastidores, dicas, lançamentos e conteúdos exclusivos sobre marketing digital, Instagram e geração de resultados online:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 26px 0;">
      <tr>
        <td style="text-align:center;background:linear-gradient(45deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);border-radius:10px;">
          <a href="${INSTAGRAM_URL}" style="display:block;color:#ffffff;text-decoration:none;font-weight:bold;font-size:17px;padding:16px 22px;">📸 Seguir @maisresultadosonline</a>
        </td>
      </tr>
    </table>

    <div style="background:#FFF8E1;border-left:4px solid #FFD700;padding:14px 16px;border-radius:6px;margin:18px 0;">
      <p style="margin:0;color:#5d4500;font-size:13px;line-height:1.6;">
        <strong>Importante:</strong> não responda mensagens enviadas pelo número antigo. Toda a comunicação oficial passa a ser feita pelo novo WhatsApp acima. Assim garantimos que sua dúvida seja respondida com prioridade.
      </p>
    </div>

    <p style="color:#333;font-size:15px;line-height:1.7;margin:18px 0 0 0;">
      Nosso compromisso é continuar entregando suporte humano, ágil e de alta qualidade para todos os nossos clientes. Obrigado por fazer parte da comunidade MRO. 💛
    </p>

    <p style="color:#333;font-size:15px;line-height:1.7;margin:18px 0 0 0;">
      Atenciosamente,<br/>
      <strong>Equipe MRO — Mais Resultados Online</strong>
    </p>
  </div>

  <div style="background:#1a1a1a;padding:14px;text-align:center;">
    <p style="color:#888;margin:0;font-size:11px;">© ${new Date().getFullYear()} MRO - Mais Resultados Online · E-mail informativo</p>
  </div>
</div>
`;

// ---------------- Types ----------------
interface RecipientRow {
  id: string;
  email: string;
  name: string | null;
  source: "mro_orders" | "created_accesses";
}

interface LogRow {
  id: string;
  recipient_email: string;
  subject: string;
  status: string;
  sent_at: string;
  error_message: string | null;
}

export default function WhatsAppMigrationBroadcast() {
  const [loading, setLoading] = useState(false);
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [search, setSearch] = useState("");

  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [bodyHtml, setBodyHtml] = useState(buildDefaultHtml());

  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  const [minDelay, setMinDelay] = useState(6);
  const [maxDelay, setMaxDelay] = useState(14);

  const [skipAlreadySent, setSkipAlreadySent] = useState(true);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, total: 0, current: "" });
  const [sendLogs, setSendLogs] = useState<string[]>([]);

  const [history, setHistory] = useState<LogRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadRecipients();
    loadHistory();
  }, []);

  const loadRecipients = async () => {
    setLoading(true);
    try {
      const [{ data: orders }, { data: accesses }] = await Promise.all([
        supabase
          .from("mro_orders")
          .select("id, email, username, status")
          .in("status", ["paid", "completed", "expired"]),
        supabase
          .from("created_accesses")
          .select("id, customer_email, customer_name"),
      ]);

      const map = new Map<string, RecipientRow>();
      const clean = (raw: string) =>
        (raw.includes(":") ? raw.split(":").pop()! : raw).trim();

      (orders || []).forEach((o: any) => {
        if (!o.email) return;
        const e = clean(o.email).toLowerCase();
        if (!e || map.has(e)) return;
        map.set(e, { id: `o_${o.id}`, email: clean(o.email), name: o.username, source: "mro_orders" });
      });
      (accesses || []).forEach((a: any) => {
        if (!a.customer_email) return;
        const e = clean(a.customer_email).toLowerCase();
        if (!e || map.has(e)) return;
        map.set(e, {
          id: `a_${a.id}`,
          email: clean(a.customer_email),
          name: a.customer_name,
          source: "created_accesses",
        });
      });

      setRecipients(Array.from(map.values()));
      toast.success(`${map.size} destinatários carregados`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar destinatários");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from("broadcast_email_logs")
        .select("id, recipient_email, subject, status, sent_at, error_message")
        .ilike("subject", "%novo número oficial%")
        .order("sent_at", { ascending: false })
        .limit(200);
      setHistory((data as LogRow[]) || []);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return recipients;
    return recipients.filter(
      (r) => r.email.toLowerCase().includes(t) || (r.name?.toLowerCase() || "").includes(t)
    );
  }, [recipients, search]);

  const removeRecipient = (id: string) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const sleep = (s: number) => new Promise((r) => setTimeout(r, s * 1000));
  const randDelay = () => Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

  const sendOne = async (to: string, name?: string | null) => {
    const { error } = await supabase.functions.invoke("broadcast-email", {
      body: {
        to,
        subject,
        body: bodyHtml,
        rawHtml: true,
        userName: name || undefined,
      },
    });
    if (error) throw error;
  };

  const handleTest = async () => {
    if (!testEmail.trim()) return toast.error("Informe um email de teste");
    setSendingTest(true);
    try {
      await sendOne(testEmail.trim(), "Teste");
      toast.success(`Email de teste enviado para ${testEmail}`);
    } catch (e: any) {
      toast.error("Falha no envio de teste: " + (e?.message || "erro"));
    } finally {
      setSendingTest(false);
    }
  };

  const handleBroadcast = async () => {
    if (recipients.length === 0) return toast.error("Lista vazia");
    if (!subject.trim() || !bodyHtml.trim()) return toast.error("Assunto e corpo obrigatórios");
    if (!confirm(`Enviar para ${recipients.length} destinatários?`)) return;

    setSending(true);
    setSendLogs([]);
    setProgress({ sent: 0, total: recipients.length, current: "" });

    // Already-sent set (by exact subject)
    let alreadySent = new Set<string>();
    if (skipAlreadySent) {
      let from = 0;
      const size = 1000;
      while (true) {
        const { data } = await supabase
          .from("broadcast_email_logs")
          .select("recipient_email")
          .eq("subject", subject)
          .eq("status", "sent")
          .range(from, from + size - 1);
        if (!data || data.length === 0) break;
        data.forEach((r: any) => alreadySent.add(r.recipient_email.toLowerCase()));
        if (data.length < size) break;
        from += size;
      }
    }

    const queue = recipients.filter((r) => {
      if (skipAlreadySent && alreadySent.has(r.email.toLowerCase())) {
        setSendLogs((p) => [...p, `⏭️ ${r.email} - já avisado anteriormente`]);
        return false;
      }
      return true;
    });

    setProgress({ sent: 0, total: queue.length, current: "" });

    let ok = 0;
    let err = 0;
    for (let i = 0; i < queue.length; i++) {
      const r = queue[i];
      setProgress({ sent: i, total: queue.length, current: r.email });
      try {
        await sendOne(r.email, r.name);
        ok++;
        setSendLogs((p) => [...p, `✅ ${r.email}`]);
      } catch (e: any) {
        err++;
        setSendLogs((p) => [...p, `❌ ${r.email} - ${e?.message || "erro"}`]);
      }
      if (i < queue.length - 1) {
        const d = randDelay();
        setSendLogs((p) => [...p, `⏳ aguardando ${d}s...`]);
        await sleep(d);
      }
    }
    setProgress({ sent: queue.length, total: queue.length, current: "" });
    setSending(false);
    toast.success(`Envio finalizado: ${ok} ok / ${err} erro`);
    loadHistory();
  };

  const pct = progress.total > 0 ? Math.round((progress.sent / progress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800/80 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-400" />
            Aviso de migração de WhatsApp
          </CardTitle>
          <p className="text-gray-400 text-sm">
            Envia um e-mail informativo para todos os clientes (ativos e expirados) avisando sobre o novo número oficial. Inclui botão de WhatsApp e Instagram.
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista */}
        <Card className="bg-gray-800/80 border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Destinatários
                <Badge className="bg-blue-500/20 text-blue-300 ml-2">{filtered.length}/{recipients.length}</Badge>
              </CardTitle>
              <Button size="sm" variant="outline" onClick={loadRecipients} disabled={loading} className="border-gray-600 text-gray-300">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar para remover..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-gray-700/50 border-gray-600 text-white"
              />
            </div>
            <ScrollArea className="h-[420px] pr-2">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-gray-400">Nenhum destinatário</div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((r) => (
                    <div key={r.id} className="flex items-center justify-between bg-gray-700/30 hover:bg-gray-700/50 p-2 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm truncate">{r.email}</p>
                        {r.name && <p className="text-gray-400 text-xs truncate">{r.name}</p>}
                      </div>
                      <Badge variant="outline" className={r.source === "mro_orders" ? "border-blue-500/40 text-blue-300 text-xs" : "border-green-500/40 text-green-300 text-xs"}>
                        {r.source === "mro_orders" ? "MRO" : "Admin"}
                      </Badge>
                      <Button size="sm" variant="ghost" onClick={() => removeRecipient(r.id)} className="text-red-400 hover:bg-red-900/30 ml-2">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Composição + envio */}
        <Card className="bg-gray-800/80 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-400" />
              Conteúdo do e-mail
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Assunto</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-gray-700/50 border-gray-600 text-white" />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">HTML do e-mail (já configurado)</Label>
              <Textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                className="bg-gray-700/50 border-gray-600 text-white font-mono text-xs min-h-[180px]"
              />
              <Button size="sm" variant="outline" onClick={() => setBodyHtml(buildDefaultHtml())} className="border-gray-600 text-gray-300">
                Restaurar modelo padrão
              </Button>
            </div>

            {/* Teste */}
            <div className="border border-yellow-700/40 bg-yellow-900/10 rounded-lg p-3 space-y-2">
              <Label className="text-yellow-300 flex items-center gap-2"><TestTube2 className="w-4 h-4" /> Enviar email de teste</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="seu-email@exemplo.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="bg-gray-700/50 border-gray-600 text-white"
                />
                <Button onClick={handleTest} disabled={sendingTest} className="bg-yellow-600 hover:bg-yellow-700">
                  {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-gray-300 text-xs">Delay mín (s)</Label>
                <Input type="number" min={1} value={minDelay} onChange={(e) => setMinDelay(Number(e.target.value))} className="bg-gray-700/50 border-gray-600 text-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300 text-xs">Delay máx (s)</Label>
                <Input type="number" min={1} value={maxDelay} onChange={(e) => setMaxDelay(Number(e.target.value))} className="bg-gray-700/50 border-gray-600 text-white" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="skip-sent" checked={skipAlreadySent} onCheckedChange={(v) => setSkipAlreadySent(!!v)} />
              <label htmlFor="skip-sent" className="text-sm text-gray-300 cursor-pointer">
                Não reenviar para quem já recebeu este aviso (histórico)
              </label>
            </div>

            <Button
              onClick={handleBroadcast}
              disabled={sending || recipients.length === 0}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando {progress.sent}/{progress.total}...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Enviar aviso para {recipients.length} destinatário(s)</>
              )}
            </Button>

            {(sending || progress.total > 0) && (
              <div className="space-y-2">
                <Progress value={pct} className="h-3" />
                <p className="text-xs text-gray-400">
                  {pct}% — {progress.current && `Enviando para ${progress.current}`}
                </p>
              </div>
            )}

            {sendLogs.length > 0 && (
              <ScrollArea className="h-[140px] bg-gray-900/50 rounded-lg p-3">
                <div className="space-y-1 font-mono text-xs">
                  {sendLogs.map((l, i) => (
                    <p key={i} className={l.startsWith("✅") ? "text-green-400" : l.startsWith("❌") ? "text-red-400" : "text-yellow-400"}>
                      {l}
                    </p>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Histórico */}
      <Card className="bg-gray-800/80 border-gray-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-white flex items-center gap-2">
              <History className="w-5 h-5 text-orange-400" />
              Histórico deste aviso ({history.length})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={loadHistory} disabled={loadingHistory} className="border-gray-600 text-gray-300">
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingHistory ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {history.length === 0 ? (
              <p className="text-gray-400 text-center py-6">Nenhum envio registrado ainda</p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className={`flex items-center justify-between p-3 rounded-lg border ${h.status === "sent" ? "bg-green-900/20 border-green-700/40" : "bg-red-900/20 border-red-700/40"}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {h.status === "sent" ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                      <span className="text-white text-sm truncate">{h.recipient_email}</span>
                    </div>
                    <span className="text-gray-400 text-xs">{new Date(h.sent_at).toLocaleString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
