import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Link2, Users, LogOut, Search, RefreshCw } from "lucide-react";

interface ZapZapLead {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  email_enviado: boolean;
  created_at: string;
}

const TOKEN_KEY = "zapzap_admin_token";

const ZapZapAdmin = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [creds, setCreds] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<ZapZapLead[]>([]);
  const [grupoLink, setGrupoLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState("");
  const [verTodos, setVerTodos] = useState(false);

  useEffect(() => {
    document.title = "ZapZap Admin | Leads e Link do Grupo";
  }, []);

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("zapzap-register", { body });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "Erro na requisição");
    return data;
  };

  const carregar = async (t: string) => {
    setLoading(true);
    try {
      const [list, settings] = await Promise.all([
        call({ action: "list", token: t }),
        call({ action: "get_settings" }),
      ]);
      setLeads(list.leads ?? []);
      setGrupoLink(settings.grupo_link ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar dados");
      if (String(e).includes("Unauthorized")) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) carregar(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async () => {
    setLoading(true);
    try {
      const data = await call({ action: "login", ...creds });
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
    } catch {
      toast.error("Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  };

  const salvarLink = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await call({ action: "save_settings", token, grupo_link: grupoLink.trim() });
      toast.success("Link do grupo salvo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b141a] p-4">
        <div className="w-full max-w-sm rounded-2xl border border-[#25D366]/30 bg-[#111b21] p-6">
          <h1 className="text-xl font-bold text-slate-100">ZapZap Admin</h1>
          <Input
            placeholder="E-mail"
            value={creds.email}
            onChange={(e) => setCreds({ ...creds, email: e.target.value })}
            className="mt-4 border-white/10 bg-[#0b141a] text-slate-100"
          />
          <Input
            type="password"
            placeholder="Senha"
            value={creds.password}
            onChange={(e) => setCreds({ ...creds, password: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && login()}
            className="mt-3 border-white/10 bg-[#0b141a] text-slate-100"
          />
          <Button
            onClick={login}
            disabled={loading}
            className="mt-4 w-full bg-[#25D366] font-bold text-[#062e15] hover:bg-[#1ebe5b]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
          </Button>
        </div>
      </div>
    );
  }

  const filtrados = leads.filter((l) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return (
      l.nome.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.whatsapp.toLowerCase().includes(q)
    );
  });
  const visiveis = verTodos || busca.trim() ? filtrados : filtrados.slice(0, 50);

  return (
    <div className="min-h-screen bg-[#0b141a] p-4 text-slate-100 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">ZapZap Admin</h1>
            <p className="text-sm text-slate-400">Link do grupo e leads capturados em /zapzap</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => carregar(token)} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem(TOKEN_KEY);
                setToken(null);
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111b21] p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Link2 className="h-5 w-5 text-[#25D366]" /> Link do Grupo no WhatsApp
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Este link é liberado no final do quiz e enviado por e-mail para cada cadastro.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Input
              value={grupoLink}
              onChange={(e) => setGrupoLink(e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
              className="border-white/10 bg-[#0b141a] text-slate-100"
            />
            <Button
              onClick={salvarLink}
              disabled={saving}
              className="bg-[#25D366] font-bold text-[#062e15] hover:bg-[#1ebe5b]"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111b21] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Users className="h-5 w-5 text-[#25D366]" /> Cadastrados ({leads.length})
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar nome, e-mail ou WhatsApp"
                className="w-full border-white/10 bg-[#0b141a] pl-9 text-slate-100 sm:w-80"
              />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase text-slate-400">
                  <th className="py-2 pr-4">Nome</th>
                  <th className="py-2 pr-4">E-mail</th>
                  <th className="py-2 pr-4">WhatsApp</th>
                  <th className="py-2 pr-4">E-mail enviado</th>
                  <th className="py-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((l) => (
                  <tr key={l.id} className="border-b border-white/5">
                    <td className="py-2 pr-4">{l.nome}</td>
                    <td className="py-2 pr-4 text-slate-300">{l.email}</td>
                    <td className="py-2 pr-4 text-slate-300">{l.whatsapp}</td>
                    <td className="py-2 pr-4">
                      {l.email_enviado ? (
                        <span className="text-[#25D366]">Sim</span>
                      ) : (
                        <span className="text-amber-400">Não</span>
                      )}
                    </td>
                    <td className="py-2 text-slate-400">
                      {new Date(l.created_at).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
                {!visiveis.length && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      {loading ? "Carregando..." : "Nenhum cadastro encontrado"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!verTodos && !busca.trim() && filtrados.length > 50 && (
            <Button variant="outline" className="mt-4 w-full" onClick={() => setVerTodos(true)}>
              Ver todos ({filtrados.length})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZapZapAdmin;
