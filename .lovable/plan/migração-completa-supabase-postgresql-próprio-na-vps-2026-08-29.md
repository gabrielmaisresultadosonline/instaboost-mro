# Migração completa: Supabase → PostgreSQL próprio na VPS

## Situação real do projeto

Levantamento feito agora no código e no banco:

- **219 tabelas** no schema `public`
- **162 edge functions** (Deno) — auth, webhooks de pagamento, IA, CRM, WhatsApp, IG, dumps
- **213 páginas** React que importam o client do Supabase
- **9 buckets de storage** (vídeos, imagens, prints, backups, cache de perfis)
- Auth próprio já é majoritariamente **custom** (tabelas `*_users` com SHA-256), o que facilita muito
- Segredos: Stripe, InfiniPay, DeepSeek, Meta, SMTP, Bright Data, RapidAPI etc.

Isso não é uma troca de string de conexão: é a construção de um backend próprio. O plano abaixo é o caminho mais seguro — sem quebrar nada em produção e mantendo o Supabase no ar até o corte final.

## Estratégia: camada de compatibilidade

Em vez de reescrever 213 páginas, criamos um backend na VPS que **fala o mesmo protocolo** que o app já usa hoje. Assim o frontend muda praticamente só numa variável de ambiente.

```text
Frontend (React)                    VPS (Node + Express)
  supabase.from('x').select() ──►  /rest/v1/x        ──► PostgreSQL local
  supabase.functions.invoke()  ──►  /functions/v1/*   ──► funções portadas
  supabase.storage.from(...)   ──►  /storage/v1/*     ──► /var/www/uploads
  supabase.auth                ──►  /auth/v1/*        ──► JWT próprio
```

## Fases

### Fase 1 — Backend na VPS (`server/`)
- PostgreSQL 16 + extensões usadas hoje: `pgcrypto`, `uuid-ossp`, `pg_trgm`, `pgjwt`, `pg_cron` (substitui os cron jobs do Supabase), `pg_net` opcional
- API Node/Express com:
  - **REST compatível**: `select/insert/update/delete/upsert`, filtros (`eq`, `in`, `ilike`, `order`, `limit`, `range`), `maybeSingle`, `count`
  - **RLS real**: cada request abre a sessão com `SET LOCAL role` + `request.jwt.claims`, então as 219 tabelas mantêm as políticas atuais
  - **Storage**: upload/download/signed URLs gravando em disco (`/var/www/uploads/<bucket>/...`), servido pelo Nginx com cache
  - **Auth**: JWT assinado localmente, compatível com o formato de token atual
  - **Realtime**: WebSocket com `LISTEN/NOTIFY` para as telas que usam realtime (Inbox IG, CRM)
- **Funções**: as 162 funções Deno rodam quase sem alteração sob um runtime de compatibilidade (`Deno.env` → `process.env`, `serve()` → rota Express). Segredos passam para `.env` do servidor.

### Fase 2 — Migração de dados e mídia
Script único (`migrate:all`) que:
1. Extrai o schema completo (tabelas, índices, constraints, triggers, funções, enums, políticas) e aplica no Postgres local
2. Copia as 219 tabelas em lotes, com verificação de contagem por tabela
3. Baixa todos os arquivos dos 9 buckets para `/var/www/uploads`, preservando os caminhos — as URLs públicas continuam válidas via rewrite no Nginx
4. Reescreve no banco as URLs `*.supabase.co/storage/...` para o domínio próprio
5. Gera relatório: linhas por tabela, arquivos por bucket, divergências

Pode rodar quantas vezes quiser (incremental/idempotente) — inclusive um último sync no dia do corte.

### Fase 3 — Corte
- Frontend passa a apontar para `https://api.maisresultadosonline.com.br` (uma variável)
- Webhooks (InfiniPay, Meta, Stripe) repontados para o domínio próprio
- Supabase fica intacto como espelho de segurança até você confirmar

## Comando único

Depois de configurado, no terminal da VPS:

```bash
./deploy.sh
```

Ele faz: `git pull` → instala deps → aplica migrations → sincroniza dados e mídia pendentes → build do frontend → restart do backend (PM2) → reload do Nginx → health check com rollback automático se falhar.

## Detalhes técnicos

- `server/`: Express + `pg` (pool), Zod na validação, PM2 em cluster
- `server/compat/`: adaptadores REST/Storage/Auth/Realtime + shim das funções Deno
- `migrations/`: schema exportado do Supabase, versionado
- `scripts/migrate-*.ts`: schema, dados, storage, verificação
- `nginx/`: proxy da API, `/uploads` estático (limite de 300MB mantido), SSL
- Frontend: `src/integrations/supabase/client.ts` continua exportando `supabase`, mas apontando para o backend próprio — nenhuma página precisa ser reescrita
- Backups: `pg_dump` diário + rsync da pasta de uploads

## Ordem de execução

1. Backend + camada de compatibilidade (REST, Auth, Storage, Realtime)
2. Migração de schema + `deploy.sh`
3. Port das 162 funções (por lotes, começando por pagamentos e auth)
4. Migração de dados e mídia + verificação
5. Corte do frontend e webhooks

Vou começar pela Fase 1 e pelo `deploy.sh`, que é o que te dá o comando único.
