# MRO INSTAGRAM — SaaS multi-tenant em `/IG`

Plataforma completa de Instagram (APIs oficiais Meta, sem scraping) isolada no namespace `/IG`, sem tocar em nenhuma rota, tabela ou função existente do projeto.

## Adequações necessárias à stack atual (importante)

O projeto é React 18 + Vite + Supabase (Lovable Cloud). Duas peças do briefing não existem aqui e serão substituídas por equivalentes funcionalmente iguais:

| Pedido | Nesta stack |
|---|---|
| Next.js / servidor Node.js | React + Vite no front; toda lógica de servidor em Edge Functions (Deno) — mesmo papel, sem servidor próprio |
| Redis + Worker | Fila em Postgres (`ig_jobs`) + worker em Edge Function acionada por cron, com retry/backoff/dead-letter/idempotência |

Tudo o mais do briefing (multi-tenant, RLS, OAuth Meta, webhooks, IA, CRM, admin, auditoria, planos) é implementado como especificado.

## Escopo desta entrega — FASE 1

Base sólida para as fases seguintes:

1. **Banco multi-tenant** com prefixo `ig_` (isolado do resto do projeto):
   `ig_tenants`, `ig_tenant_members`, `ig_profiles`, `ig_accounts`, `ig_tokens`, `ig_webhook_events`, `ig_jobs`, `ig_audit_logs`, `ig_plans`, `ig_subscriptions`, `ig_usage`, `ig_notifications`.
   Enum `ig_role`: `owner | admin | manager | agent | analyst`. Papel global `super_admin` em tabela separada.
   RLS em 100% das tabelas + GRANTs; toda policy passa por função `security definer` `ig_is_tenant_member(tenant_id)` / `ig_has_tenant_role(...)`, sem recursão. Índices em `tenant_id`, `ig_account_id`, `created_at`.
   Tokens da Meta ficam em `ig_tokens` **sem** policy de leitura para `authenticated` — apenas `service_role` (Edge Functions) acessa.

2. **Auth e onboarding**: `/IG`, `/IG/login`, `/IG/register`, `/IG/forgot-password`, `/IG/reset-password`. Supabase Auth (e-mail/senha + Google). No signup cria-se tenant + membro `owner` via trigger. Onboarding: "Conecte seu Instagram para começar".

3. **OAuth Meta oficial**: Edge Function `ig-oauth` (`get-app-id`, `exchange-code`) e rota `/IG/auth/instagram/callback`. App Secret e access tokens nunca chegam ao front. Estado de conexão: 🟢 Conectado / 🟠 Reconexão necessária.

4. **Webhook**: Edge Function `ig-webhook` com `GET` (verify token) e `POST` (validação de assinatura `X-Hub-Signature-256`). Grava evento em `ig_webhook_events` com chave de idempotência, enfileira em `ig_jobs` e retorna 200 imediatamente. Worker `ig-worker` processa com retry/backoff.

5. **Dashboard**: `/IG/dashboard` com layout do produto (sidebar + header, responsivo), seletor de conta/tenant, cards de métricas com filtro de período. Sem dados → "Sem dados disponíveis"; nunca números fictícios.

6. **Admin global**: `/IG/admin/login` (conta `mro@gmail.com`, senha via secret, hash Argon2id-equivalente no servidor, troca obrigatória no primeiro acesso), `/IG/admin/dashboard`, `/IG/admin/users`, `/IG/admin/instagram`, `/IG/admin/logs`. Toda ação de super admin é auditada em `ig_audit_logs`.

7. **Fundações transversais**: mecanismo central de planos/limites (`ig_plans` + helper `useEntitlements`), rate limit no login/webhook/admin, tratamento de erro Meta traduzido para o usuário (detalhe técnico só no log), estados de UI (loading/skeleton/empty/error/retry) em todas as telas.

8. **Docs e testes**: `docs/IG_README.md`, `docs/META_INSTAGRAM.md`, `.env.example` (sem secrets reais) e testes Vitest incluindo o obrigatório **"Cliente A não acessa dados do Cliente B"**.

## Fases seguintes (entregas posteriores)

- **Fase 2** — Inbox/Direct, comentários, resposta privada, automações e palavras-chave, IA no Direct + modo humano.
- **Fase 3** — Publicação (imagem/vídeo/carrossel/Reel), calendário, Reels, Stories suportados.
- **Fase 4** — Insights, Analytics (crescimento/conteúdo/audiência), Score, Oportunidades, funil de atribuição.
- **Fase 5** — IA de conteúdo, base de conhecimento, CRM Kanban, equipe, modo agência, admin completo.

## Secrets necessários

`META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `IG_ADMIN_INITIAL_PASSWORD`. `LOVABLE_API_KEY` já existe e cobre a IA. Peço cada um no momento de usar.

## Garantias sobre o sistema atual

Nada existente é alterado: tabelas novas com prefixo `ig_`, Edge Functions novas com prefixo `ig-`, páginas novas em `src/pages/ig/`, rotas novas em `/IG/*` adicionadas ao final do roteador. `HubEntryGate`, home `/`, `/admin` e demais produtos ficam intactos.
