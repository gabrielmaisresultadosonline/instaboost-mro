import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowRight, Loader2, Mail, Lock, User, Phone, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
    // Check local storage for session
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
      // 1. Create user in DB
      const { data, error } = await supabase.from('vender_usuarios').insert([{
        nome: formData.nome,
        email: formData.email,
        senha: formData.senha,
        whatsapp: formData.whatsapp
      }]).select().single();

      if (error) throw error;

      // 2. Create payment entry
      const { data: pData, error: pError } = await supabase.from('vender_pagamentos').insert([{
        usuario_id: data.id,
        valor: 25.00,
        status: 'pendente'
      }]).select().single();

      if (pError) throw pError;

      // 3. Simulate payment redirect (as user requested InfinitePay)
      toast.success("Cadastro realizado! Redirecionando para pagamento...");
      
      // In a real app, we'd call InfinitePay API here. 
      // For now, we simulate the flow.
      setTimeout(() => {
        window.open('https://infinitepay.io/checkout?amount=2500', '_blank');
        setIsRegister(false); // Move to login
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
      toast.success("Bem-vindo!");

    } catch (err) {
      toast.error("Erro no login");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-12 text-center">
            <h1 className="text-4xl font-black mb-4">Olá, {user.nome}!</h1>
            <p className="text-xl text-gray-400">Assista por completo a imersão sobre a MRO e como podemos te ajudar.</p>
          </header>

          <div className="aspect-video mb-12 rounded-3xl overflow-hidden border border-zinc-800">
            <iframe 
              src="https://www.youtube.com/embed/5u3d1ZVb7tM" 
              className="w-full h-full" 
              allowFullScreen 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Button size="lg" className="h-20 text-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800" onClick={() => {
              toast.info("Você compreendeu como a MRO vai te ajudar... (Desconto anual disponível em 24h em /instagram-nova-promoo2)");
            }}>
              Utilize a MRO no seu negocio agora
            </Button>

            <Button size="lg" className="h-20 text-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800" onClick={() => {
               toast("Sabia que voce pode prestar serviço com a ferramenta MRo e faturar mais de 5 mil mensal? Sim, assitir a live por completo.");
               window.open('https://youtu.be/-0CHlqHVe0g', '_blank');
            }}>
              Renda extra com a MRO
            </Button>
          </div>
          
          <Button variant="ghost" className="mt-12 text-gray-500" onClick={() => {
            localStorage.removeItem('vender_user');
            setUser(null);
          }}>Sair</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-white">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-black">{isRegister ? "Comece Agora" : "Acessar Área de Alunos"}</CardTitle>
          <CardDescription className="text-gray-400">
            {isRegister ? "Preencha seus dados para receber o acesso" : "Entre com seu email e senha criados no cadastro"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input 
                    placeholder="João Silva" 
                    className="pl-10 bg-black border-zinc-800" 
                    required
                    value={formData.nome}
                    onChange={e => setFormData({...formData, nome: e.target.value})}
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input 
                  type="email" 
                  placeholder="seu@email.com" 
                  className="pl-10 bg-black border-zinc-800" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10 bg-black border-zinc-800" 
                  required
                  value={formData.senha}
                  onChange={e => setFormData({...formData, senha: e.target.value})}
                />
              </div>
            </div>

            {isRegister && (
              <div className="space-y-2">
                <label className="text-sm font-medium">WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input 
                    placeholder="(00) 00000-0000" 
                    className="pl-10 bg-black border-zinc-800" 
                    required
                    value={formData.whatsapp}
                    onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-12" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : (isRegister ? "Pagar R$ 25 e Garantir Acesso" : "Entrar")}
            </Button>

            <div className="text-center pt-4">
              <button 
                type="button"
                className="text-sm text-gray-400 hover:text-white"
                onClick={() => setIsRegister(!isRegister)}
              >
                {isRegister ? "Já tem conta? Clique aqui para entrar" : "Ainda não tem conta? Clique aqui"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
