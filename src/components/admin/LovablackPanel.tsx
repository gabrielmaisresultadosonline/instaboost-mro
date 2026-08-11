
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
  const [isExternalDocsOpen, setIsExternalDocsOpen] = useState(false);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({
    global_announcement: "",
    min_extension_version: "1.0.0",
    multi_login_block: "false"
  });
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

  const fetchGlobalSettings = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('lovablack_settings')
        .select('*');
      
      if (error) throw error;
      
      const settings: any = {};
      data?.forEach((s: any) => {
        settings[s.key] = s.value;
      });
      setGlobalSettings(prev => ({ ...prev, ...settings }));
    } catch (error) {
      console.error("Erro ao buscar settings:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchGlobalSettings();
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

  const handleSaveGlobalSettings = async () => {
    try {
      for (const [key, value] of Object.entries(globalSettings)) {
        const { error } = await (supabase as any)
          .from('lovablack_settings')
          .upsert({ key, value });
        if (error) throw error;
      }
      toast({ title: "Configurações globais salvas!" });
      setIsGlobalSettingsOpen(false);
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
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
          <Button onClick={() => setIsGlobalSettingsOpen(true)} variant="outline" size="sm" className="gap-2 border-primary/30 hover:bg-primary/5">
            <MessageSquare className="h-4 w-4" /> Avisos Globais
          </Button>
          <Button onClick={() => setIsDocsOpen(true)} variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" /> Documentação API
          </Button>
          <Button onClick={() => setIsExternalDocsOpen(true)} variant="outline" size="sm" className="gap-2 border-blue-500/30 hover:bg-blue-500/5">
            <FileText className="h-4 w-4" /> Integração Externa (Checkout)
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
                {`URL: https://adljdeekwifwcdcgbpit.supabase.co/functions/v1/lovablack-api\nContent-Type: application/json\n\n{\n  "action": "login",\n  "email": "usuario@exemplo.com",\n  "password": "senha_do_usuario",\n  "session_id": "id_unico_da_maquina" // OPCIONAL para bloqueio multi-login\n}`}
              </code>
            </div>

            <div className="bg-muted/50 p-3 rounded-md border border-border">
              <h5 className="font-bold text-xs mb-2">Estrutura de Resposta (Sucesso)</h5>
              <pre className="text-[10px] text-blue-400 bg-black/90 p-2 rounded overflow-x-auto">
{`{
  "success": true,
  "user": {
    "name": "João Silva",
    "is_active": true,
    "is_expired": false,
    "blocked": false,
    "custom_message": "Aviso individual aqui",
    "global_announcement": "Aviso para todos!",
    "min_version": "1.0.0"
  }
}`}
              </pre>
            </div>

            <div className="bg-destructive/10 p-4 rounded-md border border-destructive/20 space-y-3">
              <h5 className="font-bold text-sm text-destructive flex items-center gap-2">
                <ShieldBan className="h-4 w-4" /> Regras de Negócio, Bloqueios e Segurança
              </h5>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-foreground">1. Bloqueio de Acesso (blocked)</p>
                  <p className="text-[10px] text-muted-foreground">Se <code>blocked: true</code>, a extensão deve encerrar a sessão imediatamente, limpar dados sensíveis e exibir tela de bloqueio administrativo.</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-foreground">2. Expiração de Plano (is_expired)</p>
                  <p className="text-[10px] text-muted-foreground">Retorna <code>true</code> se o tempo de teste (20min) acabou ou se a assinatura mensal expirou. A extensão deve redirecionar para a página de checkout <code>/lovablack</code>.</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-foreground">3. Controle de Versão (min_version)</p>
                  <p className="text-[10px] text-muted-foreground">A extensão deve comparar sua versão local (manifest) com <code>min_version</code>. Se for inferior, o uso deve ser bloqueado com link para download da nova versão.</p>
                </div>

                <div className="space-y-1 border-t border-destructive/10 pt-2">
                  <p className="text-[11px] font-bold text-destructive flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> 4. BLOQUEIO MULTI-LOGIN (CRÍTICO)
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Quando o bloqueio está ativo (Configurações Globais), o sistema valida o <code>session_id</code>.
                    <br />• O primeiro login vincula o <code>session_id</code> (HWID ou ID único da máquina) ao usuário.
                    <br />• Tentativas de login com um <code>session_id</code> diferente retornarão <b>Status 403</b> com <code>code: "MULTI_LOGIN"</code>.
                    <br />• <b>Implementação:</b> Armazene o <code>session_id</code> localmente e envie em todas as requisições de validação.
                  </p>
                </div>

                <div className="space-y-1 border-t border-destructive/10 pt-2">
                  <p className="text-[11px] font-bold text-foreground">5. Mensagens e Alertas</p>
                  <p className="text-[10px] text-muted-foreground">
                    • <code>global_announcement</code>: Aviso para toda a base (ex: manutenção).
                    <br />• <code>custom_message</code>: Aviso específico para o usuário logado.
                    <br />• <b>Ação:</b> Se não estiverem vazios, exibir em destaque (Toast ou Modal) na primeira carga da extensão.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* External Site Docs Dialog */}
      <Dialog open={isExternalDocsOpen} onOpenChange={setIsExternalDocsOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-500">
              <Plus className="h-5 w-5" /> Integração de Checkout Externo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-auto pr-2">
            <div className="space-y-2">
              <h5 className="font-bold text-sm text-foreground">Visão Geral</h5>
              <p className="text-xs text-muted-foreground">
                Utilize este guia para integrar o Lovablack em sites de vendas externos. Isso permite que pagamentos processados fora (ex: Hotmart, Kiwify, site próprio) criem automaticamente o acesso no banco de dados.
              </p>
            </div>

            <div className="bg-muted/50 p-3 rounded-md border border-border">
              <h5 className="font-bold text-xs mb-2 flex items-center gap-1.5">
                <Badge className="bg-blue-600 text-[9px] px-1">PASSO 1</Badge>
                Criação de Usuário via API (Webhook)
              </h5>
              <p className="text-[10px] text-muted-foreground mb-2">
                Envie um POST para criar o acesso após a confirmação do pagamento.
              </p>
              <code className="text-[10px] block bg-black/90 text-blue-400 p-2 rounded overflow-x-auto whitespace-pre">
{`URL: https://adljdeekwifwcdcgbpit.supabase.co/functions/v1/lovablack-api
Content-Type: application/json

{
  "action": "create_user",
  "name": "Nome do Cliente",
  "email": "email@cliente.com",
  "password": "senha_gerada_ou_fixa",
  "plan_type": "monthly", // monthly, lifetime, trial
  "whatsapp": "5511999999999"
}`}
              </code>
            </div>

            <div className="bg-muted/50 p-3 rounded-md border border-border">
              <h5 className="font-bold text-xs mb-2 flex items-center gap-1.5 text-green-500">
                <ShieldCheck className="h-3.5 w-3.5" /> Segurança da Requisição
              </h5>
              <p className="text-[10px] text-muted-foreground">
                Para chamadas de servidor (backend), utilize a Service Role Key no cabeçalho <code>Authorization: Bearer [KEY]</code> para bypassar RLS e criar o registro diretamente.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <h5 className="font-bold text-sm text-foreground">Lógica Sugerida para o Site de Vendas</h5>
              <ol className="text-xs text-muted-foreground space-y-2 list-decimal ml-4">
                <li>O cliente realiza o pagamento no seu site externo.</li>
                <li>Seu servidor recebe o Webhook de aprovação.</li>
                <li>Seu servidor chama o endpoint acima do Lovablack.</li>
                <li>O usuário é criado instantaneamente e pode logar na extensão.</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Global Settings Dialog */}
      <Dialog open={isGlobalSettingsOpen} onOpenChange={setIsGlobalSettingsOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Configurações e Avisos Globais
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground">Aviso Global (Todos os usuários)</label>
              <Input 
                value={globalSettings.global_announcement} 
                onChange={e => setGlobalSettings({...globalSettings, global_announcement: e.target.value})} 
                placeholder="Ex: Manutenção agendada para às 22h..." 
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground">Versão Mínima da Extensão</label>
              <Input 
                value={globalSettings.min_extension_version} 
                onChange={e => setGlobalSettings({...globalSettings, min_extension_version: e.target.value})} 
                placeholder="1.0.0" 
                className="bg-muted/30"
              />
              <p className="text-[10px] text-muted-foreground">Usuários com versão inferior serão bloqueados até atualizarem.</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div>
                <label className="text-xs font-bold uppercase text-foreground block">Bloquear Multi-Login</label>
                <p className="text-[10px] text-muted-foreground">Impede que o mesmo usuário use em duas máquinas simultâneas.</p>
              </div>
              <Select 
                value={globalSettings.multi_login_block} 
                onValueChange={val => setGlobalSettings({...globalSettings, multi_login_block: val})}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Ativado</SelectItem>
                  <SelectItem value="false">Desativado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsGlobalSettingsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveGlobalSettings}>Salvar Alterações</Button>
          </DialogFooter>
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
            <Button onClick={handleCreateUser} className="bg-green-600 hover:bg-green-700 text-white">Criar Acesso</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
