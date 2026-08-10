import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const BASE_URL = 'https://adljdeekwifwcdcgbpit.supabase.co/functions/v1/zapmro-api';

interface EndpointDoc {
  name: string;
  action: string;
  description: string;
  body: Record<string, unknown>;
  response: Record<string, unknown>;
}

const ENDPOINTS: EndpointDoc[] = [
  {
    name: 'Login (usuário/email + senha)',
    action: 'login',
    description:
      'Autentica o usuário em qualquer site ou extensão. Aceita nome de usuário OU email junto com a senha. Retorna erro caso o acesso esteja expirado ou bloqueado.',
    body: { action: 'login', username: 'usuario_ou_email', password: 'senha' },
    response: {
      success: true,
      user: {
        id: 'uuid',
        username: 'usuario',
        email: 'cliente@email.com',
        name: 'Nome do Cliente',
        is_active: true,
        days_remaining: 300,
        whatsapp_limit: 1,
        registered_numbers: ['5511999999999'],
        expires_at: null,
      },

    },
  },
  {
    name: 'Verificar acesso (sem senha)',
    action: 'verify_user',
    description:
      'Consulta se um usuário existe e se o acesso continua liberado. Ideal para revalidar a sessão da extensão periodicamente.',
    body: { action: 'verify_user', username: 'usuario_ou_email' },
    response: {
      success: true,
      user: { 
        username: 'usuario', 
        is_active: true, 
        days_remaining: 300, 
        whatsapp_limit: 1,
        registered_numbers: [],
        access_denied_reason: null 
      },
    },

  },
  {
    name: 'Avisos ativos',
    action: 'get_announcements',
    description:
      'Retorna os avisos ativos cadastrados no painel. Os mesmos avisos aparecem na área de tutoriais dos alunos e podem ser exibidos dentro da ferramenta/extensão.',
    body: { action: 'get_announcements' },
    response: {
      success: true,
      announcements: [
        {
          id: 'uuid',
          title: 'Atualização obrigatória',
          content: 'Texto do aviso',
          image_url: null,
          video_url: null,
          is_blocking: false,
          display_duration: 0,
        },
      ],
    },
  },
];

interface PlanDoc {
  label: string;
  description: string;
  example: Record<string, unknown>;
}

/** Como cada tipo de plano se apresenta na resposta da API. */
const PLANS: PlanDoc[] = [
  {
    label: 'Vitalício',
    description:
      'Sem data de expiração. Cadastre o usuário sem "expires_at" e com days_remaining alto (ex.: 9999). Acesso liberado enquanto is_active for true.',
    example: { is_active: true, expires_at: null, days_remaining: 9999, plan_type: 'vitalicio', whatsapp_limit: -1 },
  },

  {
    label: 'Anual',
    description:
      'Expira em 365 dias. Cadastre "expires_at" com a data de vencimento e days_remaining com os dias restantes.',
    example: { is_active: true, expires_at: '2027-07-29T00:00:00.000Z', days_remaining: 365, plan_type: 'anual' },
  },
  {
    label: 'Semestral',
    description:
      'Expira em 180 dias. Cadastre a data de vencimento e os dias restantes correspondentes.',
    example: { is_active: true, expires_at: '2027-02-06T00:00:00.000Z', days_remaining: 180, plan_type: 'semestral' },
  },
  {
    label: 'Mensal',
    description:
      'Expira em 30 dias. Ao expirar, a API retorna success:false com "Acesso expirado".',
    example: { is_active: true, expires_at: '2026-09-09T00:00:00.000Z', days_remaining: 30, plan_type: 'mensal' },
  },
];

const planSnippet = `// Resposta do action "login" ou "verify_user"
const { user } = await res.json();

if (!user.is_active) {
  // bloqueado ou expirado -> user.access_denied_reason
  return bloquear(user.access_denied_reason);
}

// O plano vem diretamente da API no campo plan_type:
// 'vitalicio', 'anual', 'semestral' ou 'mensal'
// A API retorna success: false e needs_renewal: true se o acesso expirar.
const plano = user.plan_type; 

if (user.days_remaining <= 0 && user.plan_type !== 'vitalicio') {
  exibirAviso("Seu acesso expirou!");
  deslogar();
}

const saudacao = \`Seja bem vindo, \${user.name || user.username}!\`;
const status = user.plan_type === 'vitalicio' 
  ? 'Acesso Vitalício' 
  : \`Dias restantes: \${user.days_remaining}\`;

exibirInfo(saudacao, status);
liberarAcesso(plano);
exibirLimite(user.whatsapp_limit); // -1 para ilimitado`;



const ZapmroAPIDocumentation: React.FC = () => {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (key: string, value: string) => {
    void navigator.clipboard.writeText(value);
    setCopied(key);
    toast({ title: 'Copiado!' });
    window.setTimeout(() => setCopied(null), 1500);
  };

  const curlExample = `curl -X POST '${BASE_URL}' \\
  -H 'Content-Type: application/json' \\
  -d '{"action":"login","username":"usuario","password":"senha"}'`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5 text-primary" />
            Documentação da API — Controle de Acessos ZAPMRO
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use esta API em qualquer outro site ou extensão. O login é validado aqui no painel: se o usuário
            existir e o acesso estiver ativo, a ferramenta libera o uso.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">POST</Badge>
            <code className="text-xs bg-muted px-2 py-1 rounded break-all">{BASE_URL}</code>
            <Button size="sm" variant="outline" onClick={() => copy('url', BASE_URL)}>
              {copied === 'url' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
          <div className="relative">
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">{curlExample}</pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
              onClick={() => copy('curl', curlExample)}
            >
              {copied === 'curl' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tipos de acesso (Vitalício, Anual e Mensal)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            O tipo de plano é identificado pelos campos <code className="text-xs">expires_at</code> e{' '}
            <code className="text-xs">days_remaining</code> retornados no login/verificação. A ferramenta
            externa deve interpretar assim:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PLANS.map((plan) => (
              <div key={plan.label} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{plan.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
                <pre className="text-[11px] bg-muted p-2 rounded overflow-x-auto">
                  {JSON.stringify(plan.example, null, 2)}
                </pre>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold mb-1">Como detectar no seu código</p>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">{planSnippet}</pre>
          </div>
          <Button size="sm" variant="outline" onClick={() => copy('plans', planSnippet)}>
            {copied === 'plans' ? <Check className="w-3 h-3 mr-2" /> : <Copy className="w-3 h-3 mr-2" />}
            Copiar exemplo
          </Button>
        </CardContent>
      </Card>

      {ENDPOINTS.map((endpoint) => (
        <Card key={endpoint.action}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              {endpoint.name}
              <Badge variant="outline">{endpoint.action}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{endpoint.description}</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold mb-1">Requisição</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                  {JSON.stringify(endpoint.body, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1">Resposta</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                  {JSON.stringify(endpoint.response, null, 2)}
                </pre>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copy(endpoint.action, JSON.stringify(endpoint.body, null, 2))}
            >
              {copied === endpoint.action ? (
                <Check className="w-3 h-3 mr-2" />
              ) : (
                <Copy className="w-3 h-3 mr-2" />
              )}
              Copiar exemplo
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ZapmroAPIDocumentation;
