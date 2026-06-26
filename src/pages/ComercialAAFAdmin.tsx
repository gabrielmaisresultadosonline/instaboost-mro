import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, RefreshCw, Mail, Phone, Building2 } from "lucide-react";

interface Lead {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  empresa: string;
  o_que_vende: string | null;
  faturamento: string;
  email_enviado: boolean;
  created_at: string;
}

export default function ComercialAAFAdmin() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("aaf-admin-token"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("comercialaaf-register", {
        body: { action: "login", email, password },
      });
      if (error || !data?.success) throw new Error(data?.error || "Falha no login");
      localStorage.setItem("aaf-admin-token", data.token);
      setToken(data.token);
      toast.success("Login realizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("comercialaaf-register", {
        body: { action: "list", token },
      });
      if (error || !data?.success) {
        if (data?.error === "Unauthorized") {
          localStorage.removeItem("aaf-admin-token");
          setToken(null);
        }
        throw new Error(data?.error || "Erro");
      }
      setLeads(data.leads || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchLeads(); }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <form onSubmit={login} className="w-full max-w-md bg-zinc-900 border border-amber-500/30 rounded-xl p-8 space-y-4">
          <div className="text-center mb-4">
            <Lock className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <h1 className="text-2xl font-bold">Admin Projeto AAF</h1>
          </div>
          <div>
            <Label className="text-amber-300">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-black border-amber-500/20 text-white mt-1" required />
          </div>
          <div>
            <Label className="text-amber-300">Senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-black border-amber-500/20 text-white mt-1" required />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-amber-500/20 px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-amber-400">Projeto AAF — Leads ({leads.length})</h1>
        <div className="flex gap-2">
          <Button onClick={fetchLeads} disabled={loading} variant="outline" size="sm" className="border-amber-500/30 text-amber-300">
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button onClick={() => { localStorage.removeItem("aaf-admin-token"); setToken(null); }} variant="outline" size="sm">Sair</Button>
        </div>
      </header>

      <div className="p-4 max-w-7xl mx-auto">
        {leads.length === 0 ? (
          <div className="text-center text-zinc-500 py-20">Nenhum lead ainda.</div>
        ) : (
          <div className="grid gap-3">
            {leads.map((l) => (
              <div key={l.id} className="bg-zinc-900 border border-amber-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-amber-300">{l.nome}</h3>
                    <p className="text-xs text-zinc-500">{new Date(l.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${l.email_enviado ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"}`}>
                      {l.email_enviado ? "✓ Email enviado" : "Pendente"}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-bold">{l.faturamento}</span>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-zinc-300"><Building2 className="w-4 h-4 text-amber-500" />{l.empresa}</div>
                  <div className="flex items-center gap-2 text-zinc-300"><Mail className="w-4 h-4 text-amber-500" />{l.email}</div>
                  <div className="flex items-center gap-2 text-zinc-300"><Phone className="w-4 h-4 text-amber-500" />{l.whatsapp}</div>
                </div>
                {l.o_que_vende && (
                  <p className="mt-3 text-sm text-zinc-400 bg-black/40 p-3 rounded border border-zinc-800">
                    <strong className="text-zinc-200">O que vende:</strong> {l.o_que_vende}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
