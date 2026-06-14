import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, LogOut, Users, Eye, Mail, Phone, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Lead {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  token: string;
  expires_at: string;
  emails_sent_count: number;
  last_email_sent_at: string | null;
  accessed_discount_at: string | null;
  created_at: string;
}
interface Visit {
  id: string;
  page: string;
  email: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

const STORAGE_KEY = "est4_admin_creds";

export default function EstruturaRendaExtra4Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);

  useEffect(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      try {
        setCreds(JSON.parse(s));
      } catch {}
    }
  }, []);

  const fetchData = async (c: { email: string; password: string }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("estrutura4-discount", {
        body: { action: "admin_list", email: c.email, password: c.password },
      });
      if (error || !data?.success) {
        toast.error("Não autorizado ou erro ao carregar.");
        setCreds(null);
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      setLeads(data.leads || []);
      setVisits(data.visits || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (creds) fetchData(creds);
  }, [creds]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("estrutura4-discount", {
        body: { action: "admin_login", email: email.trim().toLowerCase(), password },
      });
      if (data?.success) {
        const c = { email: email.trim().toLowerCase(), password };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
        setCreds(c);
      } else {
        toast.error("Credenciais inválidas");
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCreds(null);
    setEmail("");
    setPassword("");
    setLeads([]);
    setVisits([]);
  };

  if (!creds) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center px-4">
        <Card className="w-full max-w-md p-6 bg-zinc-900 border-zinc-800">
          <h1 className="text-xl font-bold text-white mb-4 text-center">Admin · Estrutura Renda Extra 4</h1>
          <form onSubmit={login} className="space-y-3">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
            <Input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
            <Button type="submit" disabled={loading} className="w-full">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}</Button>
          </form>
        </Card>
      </div>
    );
  }

  const now = Date.now();
  const activeLeads = leads.filter((l) => new Date(l.expires_at).getTime() > now).length;
  const accessed = leads.filter((l) => l.accessed_discount_at).length;
  const visitsToDiscount = visits.filter((v) => v.page === "/descontoalunosrendaextrasss").length;

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Admin · Desconto Renda Extra 4</h1>
          <Button variant="outline" onClick={logout}><LogOut className="w-4 h-4 mr-2" /> Sair</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="p-4 bg-zinc-900 border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400 text-xs"><Users className="w-4 h-4" />Leads</div>
            <p className="text-2xl font-bold mt-1">{leads.length}</p>
          </Card>
          <Card className="p-4 bg-zinc-900 border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400 text-xs"><Clock className="w-4 h-4" />Desconto ativo</div>
            <p className="text-2xl font-bold mt-1 text-yellow-400">{activeLeads}</p>
          </Card>
          <Card className="p-4 bg-zinc-900 border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400 text-xs"><CheckCircle2 className="w-4 h-4" />Acessaram desconto</div>
            <p className="text-2xl font-bold mt-1 text-green-400">{accessed}</p>
          </Card>
          <Card className="p-4 bg-zinc-900 border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400 text-xs"><Eye className="w-4 h-4" />Visitas /descontoalunosrendaextrasss</div>
            <p className="text-2xl font-bold mt-1">{visitsToDiscount}</p>
          </Card>
        </div>

        <Tabs defaultValue="leads">
          <TabsList className="bg-zinc-900">
            <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
            <TabsTrigger value="visits">Visitas ({visits.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            <Card className="p-0 bg-zinc-900 border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-800 text-zinc-300">
                    <tr>
                      <th className="text-left p-3">Nome</th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">WhatsApp</th>
                      <th className="text-left p-3">Cadastro</th>
                      <th className="text-left p-3">Expira em</th>
                      <th className="text-left p-3">Emails</th>
                      <th className="text-left p-3">Acessou</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.length === 0 && (
                      <tr><td colSpan={7} className="p-6 text-center text-zinc-500">Nenhum lead ainda.</td></tr>
                    )}
                    {leads.map((l) => {
                      const exp = new Date(l.expires_at).getTime();
                      const expired = exp < now;
                      return (
                        <tr key={l.id} className="border-t border-zinc-800">
                          <td className="p-3">{l.nome}</td>
                          <td className="p-3 text-zinc-300">{l.email}</td>
                          <td className="p-3">{l.whatsapp}</td>
                          <td className="p-3 text-zinc-400">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                          <td className={`p-3 ${expired ? "text-red-400" : "text-yellow-400"}`}>
                            {new Date(l.expires_at).toLocaleString("pt-BR")} {expired && "(expirado)"}
                          </td>
                          <td className="p-3">{l.emails_sent_count}</td>
                          <td className="p-3">{l.accessed_discount_at ? new Date(l.accessed_discount_at).toLocaleString("pt-BR") : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="visits">
            <Card className="p-0 bg-zinc-900 border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-800 text-zinc-300">
                    <tr>
                      <th className="text-left p-3">Página</th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">IP</th>
                      <th className="text-left p-3">Quando</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.length === 0 && (
                      <tr><td colSpan={4} className="p-6 text-center text-zinc-500">Nenhuma visita ainda.</td></tr>
                    )}
                    {visits.map((v) => (
                      <tr key={v.id} className="border-t border-zinc-800">
                        <td className="p-3 text-zinc-300">{v.page}</td>
                        <td className="p-3">{v.email || "—"}</td>
                        <td className="p-3 text-zinc-500 text-xs">{v.ip || "—"}</td>
                        <td className="p-3 text-zinc-400">{new Date(v.created_at).toLocaleString("pt-BR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
