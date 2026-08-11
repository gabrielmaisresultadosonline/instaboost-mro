
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, Plus, FileText, Search, Loader2, 
  ShieldBan, ShieldCheck, Mail, Phone, Lock,
  Clock, Calendar, Award
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
    const { data, error } = await supabase
      .from('lovablack_users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: "Erro ao buscar usuários", description: error.message, variant: "destructive" });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.name) {
      toast({ title: "Campos obrigatórios", description: "Preencha nome, email e senha.", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from('lovablack_users')
      .insert([newUser]);

    if (error) {
      toast({ title: "Erro ao criar usuário", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário criado com sucesso!" });
      setIsCreateOpen(false);
      setNewUser({ name: "", email: "", password: "", whatsapp: "", plan_type: "trial" });
      fetchUsers();
    }
  };

  const toggleBlock = async (user: any) => {
    const { error } = await supabase
      .from('lovablack_users')
      .update({ blocked: !user.blocked })
      .eq('id', user.id);

    if (error) {
      toast({ title: "Erro ao alterar status", description: error.message, variant: "destructive" });
    } else {
      fetchUsers();
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> LOVABLACK - Controle de Usuários
          </h2>
          <p className="text-muted-foreground">Gerencie acessos Mensais, Vitalícios e Testes de 20 minutos.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsDocsOpen(true)} variant="outline" className="gap-2">
            <FileText className="h-4 w-4" /> Documentação API
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
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
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : filteredUsers.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">Nenhum usuário encontrado.</p>
        ) : (
          filteredUsers.map(user => (
            <Card key={user.id} className={user.blocked ? "opacity-60 border-destructive/20" : ""}>
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold flex items-center gap-2">
                      {user.name}
                      {user.plan_type === 'lifetime' && <Badge className="bg-amber-500">Vitalício</Badge>}
                      {user.plan_type === 'monthly' && <Badge className="bg-blue-500">Mensal</Badge>}
                      {user.plan_type === 'trial' && <Badge variant="outline">Teste</Badge>}
                    </h4>
                    <div className="text-sm text-muted-foreground flex items-center gap-3">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {user.email}</span>
                      {user.whatsapp && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {user.whatsapp}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {user.plan_type === 'trial' && (
                    <div className="text-xs text-right mr-4">
                      <span className="text-muted-foreground">Expira em:</span>
                      <p className="font-mono text-primary">{new Date(user.trial_expires_at).toLocaleString()}</p>
                    </div>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => toggleBlock(user)}>
                    {user.blocked ? <ShieldCheck className="h-4 w-4 text-green-500" /> : <ShieldBan className="h-4 w-4 text-destructive" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Docs Dialog */}
      <Dialog open={isDocsOpen} onOpenChange={setIsDocsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Documentação da API Lovablack</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-auto">
            <div className="bg-muted p-4 rounded-md">
              <h5 className="font-bold text-sm mb-2">Endpoint de Login (Extensão)</h5>
              <code className="text-xs block bg-black text-green-400 p-2 rounded">
                POST /functions/v1/lovablack-api<br/>
                Body: {"{ \"action\": \"login\", \"email\": \"...\", \"password\": \"...\" }" }
              </code>
            </div>
            <div className="bg-muted p-4 rounded-md">
              <h5 className="font-bold text-sm mb-2">Resposta de Sucesso</h5>
              <pre className="text-xs text-blue-400">
{`{
  "success": true,
  "user": {
    "name": "João",
    "plan_type": "lifetime",
    "is_active": true
  }
}`}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Usuário Lovablack</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome Completo</label>
              <Input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="Ex: João Silva" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail (Login)</label>
              <Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="joao@email.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Senha</label>
              <Input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="******" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">WhatsApp (Opcional)</label>
              <Input value={newUser.whatsapp} onChange={e => setNewUser({...newUser, whatsapp: e.target.value})} placeholder="5511999999999" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Plano</label>
              <Select value={newUser.plan_type} onValueChange={v => setNewUser({...newUser, plan_type: v})}>
                <SelectTrigger>
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
          <DialogFooter>
            <Button onClick={handleCreateUser}>Criar Acesso</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
