import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCode } from 'lucide-react';

const ENDPOINT = 'https://adljdeekwifwcdcgbpit.supabase.co/functions/v1/mro-tool-api';

const Block: React.FC<{ title: string; description?: string; code: string }> = ({ title, description, code }) => (
  <Card className="p-4 space-y-2">
    <h4 className="font-semibold text-sm">{title}</h4>
    {description && <p className="text-xs text-muted-foreground">{description}</p>}
    <pre className="bg-muted rounded-md p-3 text-[11px] overflow-x-auto whitespace-pre">{code}</pre>
  </Card>
);

/** Documentação da API de controle de acesso da Ferramenta MRO (para a extensão). */
const MroApiDocumentation: React.FC = () => (
  <div className="space-y-4">
    <Card className="p-4 space-y-2">
      <div className="flex items-center gap-2">
        <FileCode className="w-4 h-4 text-primary" />
        <h3 className="font-semibold">API de controle de acessos — Ferramenta MRO</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Endpoint único (POST, JSON). O campo <code>action</code> define a operação.
      </p>
      <pre className="bg-muted rounded-md p-3 text-[11px] overflow-x-auto">{ENDPOINT}</pre>
      <div className="flex flex-wrap gap-2 pt-1">
        <Badge variant="outline">Vitalício = 999999 dias</Badge>
        <Badge variant="outline">Anual = mostra os dias restantes</Badge>
        <Badge variant="outline">Mensal = dias restantes</Badge>
        <Badge variant="secondary">5 testes por mês · 1 dia cada</Badge>
      </div>
    </Card>

    <Block
      title="1) Login (usuário OU email + senha)"
      description="Retorna o plano, as contas fixas, as contas em teste e os slots disponíveis."
      code={`POST ${ENDPOINT}
{
  "action": "login",
  "username": "usuariovip",   // ou "email": "cliente@email.com"
  "password": "senha"
}

// Resposta
{
  "success": true,
  "user": {
    "username": "usuariovip",
    "plan_type": "vitalicio",      // vitalicio | anual | mensal
    "lifetime": true,
    "days_remaining": 999999,
    "plan_accounts": 4,
    "access_allowed": true
  },
  "accounts": [{ "instagram_username": "minhaconta" }],
  "trial_accounts": [],
  "trials": { "limit": 5, "used": 0, "remaining": 5, "duration_days": 1 },
  "slots": { "total": 4, "used": 1, "available": 3 }
}`}
    />

    <Block
      title="2) Verificar usuário (sem senha)"
      code={`{ "action": "verify_user", "username": "usuariovip" }`}
    />

    <Block
      title="3) Verificar se a conta do Instagram está liberada"
      description="Use antes de iniciar automação em qualquer conta."
      code={`{ "action": "check_account", "username": "usuariovip", "instagram": "minhaconta" }

// Resposta
{ "success": true, "allowed": true, "is_trial": false }`}
    />

    <Block
      title="4) Cadastrar conta do plano"
      description="Bloqueia automaticamente quando o cliente tenta cadastrar mais contas do que o plano permite."
      code={`{ "action": "add_account", "username": "usuariovip", "instagram": "novaconta" }

// Limite atingido
{
  "success": false,
  "limit_reached": true,
  "error": "Você não pode cadastrar mais contas do que o seu plano permite (4 contas)..."
}`}
    />

    <Block
      title="5) Cadastrar conta de TESTE (5 por mês, 1 dia cada)"
      description="Não consome slot do plano. Expira sozinha em 24h."
      code={`{ "action": "add_account", "username": "usuariovip", "instagram": "contateste", "trial": true }

// Resposta
{ "success": true, "trial": true, "trial_expires_at": "2026-07-30T12:00:00.000Z" }

// Testes esgotados
{ "success": false, "trials_exhausted": true, "error": "Você já usou seus 5 testes deste mês" }`}
    />

    <Block
      title="Exemplo de uso na extensão"
      code={`const res = await fetch("${ENDPOINT}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "login", username, password })
});
const data = await res.json();
if (!data.success) return alert(data.error);
// data.slots.available -> quantas contas ainda pode cadastrar
// data.trials.remaining -> quantos testes de 1 dia restam neste mês`}
    />
  </div>
);

export default MroApiDocumentation;
