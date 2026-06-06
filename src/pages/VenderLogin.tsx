import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowRight, Loader2, Mail, Lock, User, Phone, Play, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export default function VenderLogin() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(true);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    whatsapp: ""
  });

  useEffect(() => {
    const saved = localStorage.getItem('vender_user');
    if (saved) {
      const u = JSON.parse(saved);
      if (u.acesso_liberado) {
        setUser(u);
      }
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.from('vender_usuarios').insert([{
        nome: formData.nome,
        email: formData.email,
        senha: formData.senha,
        whatsapp: formData.whatsapp
      }]).select().single();

      if (error) throw error;

      const { error: pError } = await supabase.from('vender_pagamentos').insert([{
        usuario_id: data.id,
        valor: 25.00,
        status: 'pendente'
      }]).select().single();

      if (pError) throw pError;

      toast.success("Cadastro realizado! Redirecionando para pagamento...");
      
      setTimeout(() => {
        window.open('https://infinitepay.io/checkout?amount=2500', '_blank');
        setIsRegister(false);
      }, 2000);

    } catch (err: any) {
      toast.error(err.message || "Erro no cadastro");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vender_usuarios')
        .select('*')
        .eq('email', formData.email)
        .eq('senha', formData.senha)
        .single();

      if (error || !data) {
        toast.error("Email ou senha inválidos");
        return;
      }

      if (!data.acesso_liberado) {
        toast.error("Pagamento ainda não reconhecido ou acesso bloqueado.");
        return;
      }

      localStorage.setItem('vender_user', JSON.stringify(data));
      setUser(data);
      toast.success("Acesso autorizado!");

    } catch (err) {
      toast.error("Erro no login");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="min-h-screen bg-black text-white p-4 md:p-12 font-sans selection:bg-yellow-400 selection:text-black">
        <div className="max-w-5xl mx-auto">
          <header className="mb-16 text-center">
            <div className="flex justify-center mb-8">
              <Logo size="lg" />
            </div>
            <h1 className="text-4xl md:text-6xl font-black mb-6 italic uppercase tracking-tighter">
              BEM-VINDO, <span className="text-yellow-500">{user.nome.split(' ')[0]}</span>!
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto font-medium">
              Assista por completo a imersão sobre a MRO e descubra como automatizar suas vendas hoje.
            </p>
          </header>

          <div className="aspect-video mb-16 rounded-[2.5rem] overflow-hidden border-4 border-zinc-900 shadow-2xl shadow-yellow-500/5 relative group">
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            <iframe 
              src="https://www.youtube.com/embed/5u3d1ZVb7tM" 
              className="w-full h-full" 
              allowFullScreen 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <Card className="bg-zinc-900/50 border-white/5 hover:border-yellow-500/30 transition-all cursor-pointer group rounded-[2rem] overflow-hidden" onClick={() => {
              toast.info("Você recebeu um desconto para o plano anual! Liberado em 24h no link /instagram-nova-promoo2");
            }}>
              <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 fill-current" />
                </div>
                <h3 className="text-2xl font-black italic uppercase italic">Utilize a MRO no <br /> seu negócio agora</h3>
                <p className="text-gray-400 text-sm">Desbloqueie o potencial máximo da ferramenta com o plano anual.</p>
                <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-black uppercase italic h-14 rounded-xl">Ver Desconto</Button>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group rounded-[2rem] overflow-hidden" onClick={() => {
               toast("Fature mais de 5 mil mensal prestando serviço com a MRO!");
               window.open('https://youtu.be/-0CHlqHVe0g', '_blank');
            }}>
              <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  <ArrowRight className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black italic uppercase italic">Renda extra <br /> com a MRO</h3>
                <p className="text-gray-400 text-sm">Aprenda a faturar mais de R$ 5 mil mensais prestando serviços.</p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic h-14 rounded-xl">Assistir Live</Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center">
            <Button variant="ghost" className="text-gray-500 font-bold uppercase tracking-widest hover:text-white" onClick={() => {
              localStorage.removeItem('vender_user');
              setUser(null);
            }}>Encerrar Sessão</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-sans">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-500/5 blur-[120px] rounded-full" />
      </div>

      <Card className="w-full max-w-md bg-zinc-900/80 border-zinc-800 text-white backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10">
        <CardHeader className="text-center space-y-4 pt-10">
          <div className="flex justify-center mb-2">
            <Logo size="lg" />
          </div>
          <CardTitle className="text-3xl font-black italic uppercase tracking-tighter">
            {isRegister ? "FAÇA SEU CADASTRO" : "ÁREA DO ALUNO"}
          </CardTitle>
          <CardDescription className="text-gray-400 font-medium">
            {isRegister ? "Preencha seus dados para receber o acesso imediato" : "Entre com suas credenciais de acesso"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-10">
          <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-5">
            {isRegister && (
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" />
                  <Input 
                    placeholder="Ex: João Silva" 
                    className="pl-12 bg-black border-zinc-800 focus:border-yellow-500 h-14 rounded-2xl font-bold" 
                    required
                    value={formData.nome}
                    onChange={e => setFormData({...formData, nome: e.target.value})}
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">E-mail de Acesso</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" />
                <Input 
                  type="email" 
                  placeholder="seu@email.com" 
                  className="pl-12 bg-black border-zinc-800 focus:border-yellow-500 h-14 rounded-2xl font-bold" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Senha Segura</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" />
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-12 bg-black border-zinc-800 focus:border-yellow-500 h-14 rounded-2xl font-bold" 
                  required
                  value={formData.senha}
                  onChange={e => setFormData({...formData, senha: e.target.value})}
                />
              </div>
            </div>

            {isRegister && (
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">WhatsApp (DDD)</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" />
                  <Input 
                    placeholder="(00) 00000-0000" 
                    className="pl-12 bg-black border-zinc-800 focus:border-yellow-500 h-14 rounded-2xl font-bold" 
                    required
                    value={formData.whatsapp}
                    onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-black h-16 rounded-2xl text-lg uppercase italic mt-4 shadow-lg shadow-yellow-500/10" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : (isRegister ? "PAGAR R$ 25 E COMEÇAR AGORA" : "ENTRAR NA PLATAFORMA")}
            </Button>

            <div className="text-center pt-4">
              <button 
                type="button"
                className="text-sm font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
                onClick={() => setIsRegister(!isRegister)}
              >
                {isRegister ? "Já possui acesso? Clique aqui" : "Ainda não cadastrado? Clique aqui"}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 pt-4 opacity-30">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Tecnologia 100% Criptografada</span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
