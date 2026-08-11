
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, Plus, FileText, Search, Loader2, 
  ShieldBan, ShieldCheck, Mail, Phone, Clock, MessageSquare
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LovablackPanel() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    whatsapp: "",
    plan_type: "trial"
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Usando query direta com casting para evitar erros de tipo se a tabela for nova
      const { data, error } = await (supabase as any)
        .from('lovablack_users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error(error);
      toast({ title: "Erro ao buscar usuários", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.name) {
      toast({ title: "Campos obrigatórios", description: "Preencha nome, email e senha.", variant: "destructive" });
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('lovablack_users')
        .insert([newUser]);

      if (error) throw error;

      toast({ title: "Usuário criado com sucesso!" });
      setIsCreateOpen(false);
      setNewUser({ name: "", email: "", password: "", whatsapp: "", plan_type: "trial" });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Erro ao criar usuário", description: error.message, variant: "destructive" });
    }
  };

  const toggleBlock = async (user: any) => {
    try {
      const { error } = await (supabase as any)
        .from('lovablack_users')
        .update({ blocked: !user.blocked })
        .eq('id', user.id);

      if (error) throw error;
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Erro ao alterar status", description: error.message, variant: "destructive" });
    }
  };

  const updateMessage = async (userId: string, message: string) => {
    try {
      const { error } = await (supabase as any)
        .from('lovablack_users')
        .update({ custom_message: message })
        .eq('id', userId);

      if (error) throw error;
      toast({ title: "Mensagem atualizada!" });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Erro ao atualizar mensagem", description: error.message, variant: "destructive" });
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> LOVABLACK - Controle de Usuários
          </h2>
          <p className="text-muted-foreground text-sm">Gerencie acessos Mensais, Vitalícios e Testes de 20 minutos.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsDocsOpen(true)} variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" /> Documentação API
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Novo Usuário
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar por nome ou email..." 
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filteredUsers.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">Nenhum usuário encontrado.</p>
        ) : (
          filteredUsers.map(user => (
            <Card key={user.id} className={user.blocked ? "opacity-60 border-destructive/20 bg-muted/10" : "bg-card shadow-sm"}>
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-full hidden sm:block">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-bold text-foreground">{user.name}</h4>
                      {user.plan_type === 'lifetime' && <Badge className="bg-amber-600 text-[10px] h-5">Vitalício</Badge>}
                      {user.plan_type === 'monthly' && <Badge className="bg-blue-600 text-[10px] h-5">Mensal</Badge>}
                      {user.plan_type === 'trial' && <Badge variant="outline" className="text-[10px] h-5">Teste</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {user.email}</span>
                      {user.whatsapp && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {user.whatsapp}</span>}
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Acesso: {user.last_access ? new Date(user.last_access).toLocaleString() : 'Nunca'}</span>
                    </div>
                    {user.custom_message && (
                      <div className="mt-2 p-1.5 rounded bg-primary/5 border border-primary/10 text-[10px] flex items-center gap-1.5 max-w-md">
                        <MessageSquare className="h-3 w-3 text-primary shrink-0" />
                        <span className="italic truncate">{user.custom_message}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {user.plan_type === 'trial' && (
                    <div className="text-[10px] text-right mr-2 leading-tight">
                      <span className="text-muted-foreground block">Expira em:</span>
                      <span className={new Date(user.trial_expires_at) < new Date() ? "text-destructive font-bold" : "font-mono text-primary font-bold"}>
                        {new Date(user.trial_expires_at).toLocaleString()}
                        {new Date(user.trial_expires_at) < new Date() && " (EXPIRADO)"}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 border-l pl-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-primary"
                      onClick={() => {
                        const msg = prompt("Mensagem de aviso para o usuário (Pop-up na extensão):", user.custom_message || "");
                        if (msg !== null) updateMessage(user.id, msg);
                      }}
                      title="Definir Mensagem/Aviso"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => toggleBlock(user)}
                      title={user.blocked ? "Desbloquear" : "Bloquear"}
                    >
                      {user.blocked ? <ShieldCheck className="h-4 w-4 text-green-500" /> : <ShieldBan className="h-4 w-4 text-destructive" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Docs Dialog */}
      <Dialog open={isDocsOpen} onOpenChange={setIsDocsOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Documentação da API Lovablack
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-auto pr-2">
            <div className="space-y-2">
              <h5 className="font-bold text-sm text-foreground">Visão Geral</h5>
              <p className="text-xs text-muted-foreground">
                API para autenticação em extensões Chrome e outros serviços externos usando e-mail e senha cadastrados aqui.
              </p>
            </div>

            <div className="bg-muted/50 p-3 rounded-md border border-border">
              <h5 className="font-bold text-xs mb-2 flex items-center gap-1.5">
                <Badge variant="outline" className="text-[9px] px-1 bg-green-500/10 text-green-500 border-green-500/20">POST</Badge>
                Login (Extensão)
              </h5>
              <code className="text-[10px] block bg-black/90 text-green-400 p-2 rounded overflow-x-auto whitespace-pre">
                {`URL: /functions/v1/lovablack-api\nContent-Type: application/json\n\n{\n  "action": "login",\n  "email": "usuario@exemplo.com",\n  "password": "senha_do_usuario"\n}`}
              </code>
            </div>

            <div className="bg-muted/50 p-3 rounded-md border border-border">
              <h5 className="font-bold text-xs mb-2">Estrutura de Resposta</h5>
              <pre className="text-[10px] text-blue-400 bg-black/90 p-2 rounded overflow-x-auto">
{`{
  "success": true,
  "user": {
    "name": "João Silva",
    "email": "joao@email.com",
    "plan_type": "lifetime",
    "is_active": true,
    "is_expired": false,
    "expires_at": null,
    "last_access": "2026-08-11T20:30:00Z",
    "custom_message": "Seu acesso expira em 2 dias. Renove agora!"
  }
}`}
              </pre>
            </div>

            <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
              <p className="text-[10px] text-amber-600 font-medium">
                * Usuários do tipo "Teste" retornam false se os 20 minutos expirarem ou se forem bloqueados manualmente.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Usuário Lovablack</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome Completo</label>
              <Input 
                value={newUser.name} 
                onChange={e => setNewUser({...newUser, name: e.target.value})} 
                placeholder="Ex: João Silva" 
                className="bg-muted/30"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">E-mail (Login)</label>
                <Input 
                  type="email" 
                  value={newUser.email} 
                  onChange={e => setNewUser({...newUser, email: e.target.value})} 
                  placeholder="joao@email.com" 
                  className="bg-muted/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Senha</label>
                <Input 
                  type="password" 
                  value={newUser.password} 
                  onChange={e => setNewUser({...newUser, password: e.target.value})} 
                  placeholder="******" 
                  className="bg-muted/30"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">WhatsApp (Opcional)</label>
                <Input 
                  value={newUser.whatsapp} 
                  onChange={e => setNewUser({...newUser, whatsapp: e.target.value})} 
                  placeholder="5511999999999" 
                  className="bg-muted/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de Plano</label>
                <Select value={newUser.plan_type} onValueChange={v => setNewUser({...newUser, plan_type: v})}>
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Teste (20 min)</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="lifetime">Vitalício</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser}>Criar Acesso</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
