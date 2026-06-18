import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Chrome, Copy, RefreshCw, ExternalLink, BookOpen, Webhook, Shield } from 'lucide-react';

const CONFIG_KEY = 'extension_menu_config';
// Endpoint público (sem JWT) que a extensão consulta para saber se o menu está
// ativo e qual a versão atual (útil para cache-busting na extensão).
const PUBLIC_CONFIG_URL = `https://adljdeekwifwcdcgbpit.supabase.co/storage/v1/object/public/assets/extension-menu-config.json`;
const PROJECT_URL = 'https://adljdeekwifwcdcgbpit.supabase.co';

type ExtensionConfig = {
  enabled: boolean;
  version: number;
  updatedAt: string;
  redirectMroInstagram: string;
  webhookUrl: string;
};

const DEFAULT: ExtensionConfig = {
  enabled: true,
  version: 1,
  updatedAt: new Date().toISOString(),
  redirectMroInstagram: 'https://maisresultadosonline.com.br/mro-instagram',
  webhookUrl: `${PROJECT_URL}/functions/v1/instagram-admin`,
};

const loadConfig = (): ExtensionConfig => {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT;
};

const CodeBlock = ({ children, title }: { children: string; title?: string }) => {
  const { toast } = useToast();
  return (
    <div className="rounded-lg border bg-zinc-950 text-zinc-100 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-xs font-mono text-zinc-400">{title || 'snippet'}</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-zinc-300 hover:text-white hover:bg-zinc-800"
          onClick={() => {
            navigator.clipboard.writeText(children);
            toast({ title: 'Copiado' });
          }}
        >
          <Copy className="w-3 h-3 mr-1" /> Copiar
        </Button>
      </div>
      <pre className="p-3 text-xs overflow-x-auto font-mono leading-relaxed whitespace-pre">
        {children}
      </pre>
    </div>
  );
};

const ExtensionDocs = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<ExtensionConfig>(loadConfig);

  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  const update = (patch: Partial<ExtensionConfig>) => {
    setConfig((c) => ({ ...c, ...patch, updatedAt: new Date().toISOString() }));
  };

  const bumpVersion = () => {
    update({ version: config.version + 1 });
    toast({ title: 'Versão atualizada', description: `v${config.version + 1} — a extensão vai recarregar o menu no próximo poll.` });
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Chrome className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Extensão do Navegador</h2>
          <p className="text-sm text-muted-foreground">
            Documentação para integrar a extensão Chrome com a página <code>/instagram</code> —
            cadastro fixo, cadastro teste, leitura de dados do perfil e menu de usuário dentro da extensão.
          </p>
        </div>
      </div>

      {/* Controle do menu */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="font-bold">Controle do menu na extensão</h3>
          <Badge variant="secondary">v{config.version}</Badge>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
          <div>
            <Label className="font-semibold">Menu ativo</Label>
            <p className="text-xs text-muted-foreground">
              Quando desligado, a extensão esconde o menu do usuário (cadastro + tutoriais).
            </p>
          </div>
          <Switch checked={config.enabled} onCheckedChange={(v) => update({ enabled: v })} />
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Redirect "Acessar Video Aulas"</Label>
            <Input
              value={config.redirectMroInstagram}
              onChange={(e) => update({ redirectMroInstagram: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Webhook (POST de cadastro)</Label>
            <Input
              value={config.webhookUrl}
              onChange={(e) => update({ webhookUrl: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={bumpVersion} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Atualizar versão (forçar refresh na extensão)
          </Button>
          <Button variant="outline" asChild>
            <a href={PUBLIC_CONFIG_URL} target="_blank" rel="noreferrer" className="gap-2">
              <ExternalLink className="w-4 h-4" /> Ver JSON público
            </a>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Última alteração: {new Date(config.updatedAt).toLocaleString('pt-BR')}
        </p>
      </Card>

      {/* O que é /instagram */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <h3 className="font-bold">Como funciona a página <code>/instagram</code></h3>
        </div>
        <ul className="text-sm space-y-2 list-disc pl-5 text-muted-foreground">
          <li>
            <b>Cadastro fixo</b>: vinculado à conta logada do usuário. Busca dados reais do perfil
            do Instagram (bio, foto, seguidores, posts) via Bright Data / scraping.
          </li>
          <li>
            <b>Cadastro de teste</b>: usado para validação rápida (igual ao <code>/estruturarendaextra</code>).
            Não precisa buscar dados — só registra o handle. Mostra <b>quantos testes restam</b> e
            quantas contas fixas já existem na conta.
          </li>
          <li>
            Na extensão (já logada no Instagram no navegador do usuário), o fluxo é o mesmo: ao clicar
            "Cadastrar conta atual", a extensão extrai os dados da página do Instagram e envia para o
            nosso servidor — ou marca como teste, sem extrair.
          </li>
          <li>
            Após cadastro, o menu da extensão exibe: <b>dias de utilização restantes</b>, <b>contas
            cadastradas</b>, <b>testes disponíveis</b> e botão "Acessar Video Aulas" → abre
            <code>{config.redirectMroInstagram}</code>.
          </li>
        </ul>
      </Card>

      {/* Webhook spec */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Webhook className="w-4 h-4 text-primary" />
          <h3 className="font-bold">Webhook de cadastro (extensão → servidor)</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          A extensão envia <code>POST</code> para o endpoint abaixo com a sessão do usuário (email
          ou username da conta MRO logada) e os dados extraídos do Instagram.
        </p>

        <CodeBlock title="POST /functions/v1/instagram-admin">
{`POST ${config.webhookUrl}
Content-Type: application/json
Authorization: Bearer <SUPABASE_ANON_KEY>

{
  "action": "registerProfileFromExtension",
  "userEmail": "cliente@email.com",
  "type": "fixed",            // "fixed" (conta fixa) ou "test" (teste)
  "instagramUsername": "perfilcliente",
  "profileData": {            // obrigatório quando type = "fixed"
    "fullName": "Nome Completo",
    "bio": "Bio do perfil...",
    "avatarUrl": "https://...jpg",
    "followers": 1234,
    "following": 567,
    "postsCount": 89,
    "isPrivate": false,
    "isVerified": false
  },
  "source": "chrome-extension",
  "extensionVersion": "1.0.0"
}`}
        </CodeBlock>

        <p className="text-sm text-muted-foreground">
          Resposta esperada (para a extensão atualizar o menu imediatamente):
        </p>

        <CodeBlock title="Response 200">
{`{
  "success": true,
  "menu": {
    "daysRemaining": 27,
    "fixedAccounts": 2,
    "fixedAccountsLimit": 3,
    "testAccountsUsed": 4,
    "testAccountsLimit": 10,
    "videoLessonsUrl": "${config.redirectMroInstagram}"
  }
}`}
        </CodeBlock>
      </Card>

      {/* Polling de menu */}
      <Card className="p-5 space-y-4">
        <h3 className="font-bold">Buscar status do menu (a cada abertura da extensão)</h3>
        <p className="text-sm text-muted-foreground">
          A extensão deve consultar <b>dois</b> endpoints ao abrir: (1) o JSON público com a versão
          do menu (controle global) e (2) o status do usuário (contas, dias, testes).
        </p>

        <CodeBlock title="1. Config global (cache 5min)">
{`GET ${PUBLIC_CONFIG_URL}
// retorna { enabled, version, redirectMroInstagram }
// se enabled=false → esconde o menu inteiro
// se version mudou → invalida cache local`}
        </CodeBlock>

        <CodeBlock title="2. Status do usuário logado">
{`POST ${config.webhookUrl}
Content-Type: application/json
Authorization: Bearer <SUPABASE_ANON_KEY>

{
  "action": "getExtensionMenu",
  "userEmail": "cliente@email.com"
}`}
        </CodeBlock>
      </Card>

      {/* Exemplo background.js */}
      <Card className="p-5 space-y-3">
        <h3 className="font-bold">Exemplo (background.js da extensão)</h3>
        <CodeBlock title="background.js">
{`// Ao abrir o popup da extensão
async function loadMenu() {
  const userEmail = (await chrome.storage.local.get('userEmail')).userEmail;
  if (!userEmail) return showLogin();

  const cfg = await fetch('${PUBLIC_CONFIG_URL}').then(r => r.json());
  if (!cfg.enabled) return hideMenu();

  const status = await fetch('${config.webhookUrl}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
    },
    body: JSON.stringify({ action: 'getExtensionMenu', userEmail })
  }).then(r => r.json());

  renderMenu({
    days: status.menu.daysRemaining,
    fixed: status.menu.fixedAccounts + '/' + status.menu.fixedAccountsLimit,
    tests: status.menu.testAccountsUsed + '/' + status.menu.testAccountsLimit,
    videoLessonsUrl: cfg.redirectMroInstagram
  });
}

// Botão "Cadastrar conta atual" (já logado no Instagram)
async function registerCurrent(type /* 'fixed' | 'test' */) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const profileData = type === 'fixed'
    ? await chrome.tabs.sendMessage(tab.id, { cmd: 'scrapeInstagramProfile' })
    : null;

  return fetch('${config.webhookUrl}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
    },
    body: JSON.stringify({
      action: 'registerProfileFromExtension',
      userEmail: (await chrome.storage.local.get('userEmail')).userEmail,
      type,
      instagramUsername: profileData?.username || (await getCurrentIgHandle(tab)),
      profileData,
      source: 'chrome-extension',
      extensionVersion: chrome.runtime.getManifest().version
    })
  }).then(r => r.json());
}`}
        </CodeBlock>
      </Card>

      {/* Integração com /mro-instagram */}
      <Card className="p-5 space-y-4 border-primary/40 bg-primary/5">
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-primary" />
          <h3 className="font-bold">Integração com a página <code>/mro-instagram</code></h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Dois modos suportados — a extensão pode usar qualquer um (ou os dois). O servidor
          identifica o usuário pelo <b>email da conta MRO logada</b> + um token da extensão
          (devolvido em <code>getExtensionMenu</code>).
        </p>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-lg border p-3 bg-background">
            <h4 className="font-semibold text-sm mb-1">1. SSO — login automático em /mro-instagram</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Usuário já logado na extensão abre <code>/mro-instagram</code> e a extensão injeta
              a sessão para autenticar sem digitar nada.
            </p>
            <p className="text-xs"><b>Dados necessários:</b></p>
            <ul className="text-xs list-disc pl-4 text-muted-foreground space-y-0.5">
              <li><code>userEmail</code> — email MRO logado na extensão</li>
              <li><code>extensionToken</code> — token de sessão da extensão</li>
              <li><code>extensionVersion</code></li>
            </ul>
          </div>

          <div className="rounded-lg border p-3 bg-background">
            <h4 className="font-semibold text-sm mb-1">2. Cadastro direto pela /mro-instagram</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Na própria página o usuário clica em "Cadastrar com extensão" e a extensão envia
              os dados do perfil do Instagram da aba ativa.
            </p>
            <p className="text-xs"><b>Dados necessários:</b></p>
            <ul className="text-xs list-disc pl-4 text-muted-foreground space-y-0.5">
              <li><code>userEmail</code></li>
              <li><code>type</code>: <code>"fixed"</code> ou <code>"test"</code></li>
              <li><code>instagramUsername</code></li>
              <li><code>profileData</code> (igual ao webhook acima) — só se <code>fixed</code></li>
              <li><code>source</code>: <code>"mro-instagram-extension"</code></li>
            </ul>
          </div>
        </div>

        <CodeBlock title="SSO — content-script da extensão → /mro-instagram">
{`// content-script.js (injetado em https://maisresultadosonline.com.br/mro-instagram)
const { userEmail, extensionToken } = await chrome.storage.local.get([
  'userEmail', 'extensionToken'
]);

window.postMessage({
  type: 'MRO_EXTENSION_LOGIN',
  payload: {
    userEmail,
    extensionToken,
    extensionVersion: chrome.runtime.getManifest().version
  }
}, 'https://maisresultadosonline.com.br');`}
        </CodeBlock>

        <CodeBlock title="Validação no servidor (action: ssoFromExtension)">
{`POST ${config.webhookUrl}
{
  "action": "ssoFromExtension",
  "userEmail": "cliente@email.com",
  "extensionToken": "<token recebido em getExtensionMenu>"
}

// Resposta: { success, session: { ... }, menu: { ... } }`}
        </CodeBlock>
      </Card>

      {/* Próximos passos */}
      <Card className="p-5 space-y-2 border-amber-500/40 bg-amber-500/5">
        <h3 className="font-bold text-amber-700 dark:text-amber-400">⚠️ Próximos passos no servidor</h3>
        <p className="text-sm text-muted-foreground">
          As ações <code>registerProfileFromExtension</code>, <code>getExtensionMenu</code> e
          <code>ssoFromExtension</code> ainda precisam ser adicionadas à edge function
          <code>instagram-admin</code>, junto com o listener <code>postMessage</code> em
          <code>/mro-instagram</code> para receber o login automático. Confirme aqui no chat
          quando quiser que eu implemente.
        </p>
      </Card>
    </div>
  );
};

export default ExtensionDocs;
