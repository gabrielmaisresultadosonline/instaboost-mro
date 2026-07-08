import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock, Mail, KeyRound, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "postscomia_member";
const REMEMBER_KEY = "postscomia_remember";
const heading = { fontFamily: "'Sora', system-ui, sans-serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };

export default function PostsComIALogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "recover">("login");
  const [recoverMsg, setRecoverMsg] = useState("");

  // Prefill from remembered credentials
  useEffect(() => {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (raw) {
        const r = JSON.parse(raw);
        if (r?.email) setEmail(r.email);
        if (r?.password) setPassword(r.password);
        setRemember(true);
      }
    } catch { /* ignore */ }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await supabase.functions.invoke("postscomia-admin", {
        body: { action: "user_login", email: email.trim().toLowerCase(), password },
      });
      if (data?.success) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ email: data.user.email, name: data.user.name }));
        if (remember) {
          localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email: email.trim().toLowerCase(), password }));
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
        navigate("/postscomia/membros");
      } else {
        setError(data?.error || "Falha no acesso");
      }
    } catch {
      setError("Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecover(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setRecoverMsg("");
    try {
      const { data } = await supabase.functions.invoke("postscomia-admin", {
        body: { action: "user_recover", email: email.trim().toLowerCase() },
      });
      if (data?.success) {
        setRecoverMsg("Enviamos uma nova senha para o seu e-mail. Verifique também SPAM / Promoções.");
      } else {
        setError(data?.error || "Não foi possível recuperar");
      }
    } catch {
      setError("Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-[#f5f5f5] flex items-center justify-center px-4 relative overflow-hidden" style={body}>
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(#f5f5f5 1px, transparent 1px), linear-gradient(90deg, #f5f5f5 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#eab308] opacity-[0.08] blur-[140px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#eab308]/30 bg-[#eab308]/5 text-[#eab308] text-[11px] font-bold tracking-[0.2em] uppercase mb-4">
            <Sparkles className="w-3 h-3" />
            Área de Membros
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2" style={heading}>
            {mode === "login" ? "Acesse seus módulos" : "Recuperar senha"}
          </h1>
          <p className="text-[#a1a1aa] text-sm">
            {mode === "login"
              ? "Entre com o e-mail e a senha que você recebeu."
              : "Digite seu e-mail para receber uma nova senha."}
          </p>
        </div>

        <form
          onSubmit={mode === "login" ? handleLogin : handleRecover}
          className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-7 shadow-[0_0_80px_rgba(234,179,8,0.08)]"
        >
          <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[#a1a1aa] mb-2">
            E-mail
          </label>
          <div className="relative mb-4">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-black border border-white/10 focus:border-[#eab308]/60 rounded-lg outline-none text-sm"
              placeholder="voce@email.com"
            />
          </div>

          {mode === "login" && (
            <>
              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[#a1a1aa] mb-2">
                Senha
              </label>
              <div className="relative mb-4">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-black border border-white/10 focus:border-[#eab308]/60 rounded-lg outline-none text-sm font-mono"
                  placeholder="••••••••"
                />
              </div>

              <label className="flex items-center gap-2 mb-4 cursor-pointer select-none text-xs text-[#a1a1aa] hover:text-white transition">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => {
                    setRemember(e.target.checked);
                    if (!e.target.checked) localStorage.removeItem(REMEMBER_KEY);
                  }}
                  className="w-4 h-4 accent-[#eab308] cursor-pointer"
                />
                Lembrar meu login neste dispositivo
              </label>
            </>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}
          {recoverMsg && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm">
              {recoverMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-lg bg-[#eab308] hover:bg-[#fde047] text-black font-black tracking-wide text-sm flex items-center justify-center gap-2 transition disabled:opacity-60 shadow-[0_0_40px_rgba(234,179,8,0.3)]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {mode === "login" ? "ENTRAR" : "ENVIAR NOVA SENHA"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="mt-5 text-center">
            {mode === "login" ? (
              <button
                type="button"
                onClick={() => { setMode("recover"); setError(""); setRecoverMsg(""); }}
                className="text-xs text-[#a1a1aa] hover:text-[#eab308] inline-flex items-center gap-1"
              >
                <KeyRound className="w-3 h-3" /> Esqueci minha senha
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setRecoverMsg(""); }}
                className="text-xs text-[#a1a1aa] hover:text-[#eab308]"
              >
                ← Voltar para login
              </button>
            )}
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-[#71717a]">
          Ainda não comprou?{" "}
          <a href="/postscomia" className="text-[#eab308] hover:underline">
            Conheça o curso
          </a>
        </div>
      </div>
    </div>
  );
}
