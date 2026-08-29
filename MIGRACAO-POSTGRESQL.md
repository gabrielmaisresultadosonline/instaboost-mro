# Migração para PostgreSQL próprio na VPS

Sai o Supabase, entra um backend seu: PostgreSQL na hospedagem, uploads em disco,
funções rodando localmente. O Supabase continua ativo até você rodar o corte final —
nada é desligado antes da conferência passar.

---

## O que foi construído

| Peça | Onde | Substitui |
|---|---|---|
| API REST (PostgREST-compatível) | `server/src/rest/` | `/rest/v1` |
| Autenticação JWT | `server/src/auth/` | `/auth/v1` |
| Storage em disco | `server/src/storage/` | `/storage/v1` (9 buckets) |
| Host das funções (Deno local) | `server/src/functions/` | `/functions/v1` (162 funções) |
| Realtime (LISTEN/NOTIFY) | `server/src/realtime.ts` | `/realtime/v1` |
| Estrutura do banco | `server/migrations/000_bootstrap.sql` | extensões, roles, `auth.uid()` |
| Migração de dados | `server/scripts/` | 219 tabelas + mídias + contas |

O ponto central: **as 213 páginas não foram alteradas.** Elas seguem importando
`@/integrations/supabase/client`, e o Vite redireciona esse caminho para o cliente
da VPS quando `VITE_USE_LOCAL_BACKEND=true`. Uma variável liga e desliga o corte.

As policies de RLS também não foram reescritas: recriamos `auth.uid()` e
`auth.jwt()` no banco novo, e cada requisição roda numa transação com
`SET LOCAL ROLE` — o mesmo contrato que o Supabase usa.

---

## Instalação (uma vez)

```bash
sudo ./deploy/install-vps.sh          # PostgreSQL 16 + extensões, Node 20, Deno, Nginx, PM2
cd server && npm ci && npm run keys   # gera JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY
cp .env.example .env                  # preencha com as chaves e os segredos atuais
```

No `.env` do servidor, preencha também para a migração:

```
LEGACY_DATABASE_URL=postgres://...     # o SUPABASE_DB_URL atual
LEGACY_SUPABASE_SERVICE_KEY=...        # service role atual (só para baixar arquivos)
```

Depois: Nginx (`deploy/nginx-vps.conf`) e HTTPS via `certbot`.

---

## Comando único

```bash
./deploy.sh              # atualiza código, banco, backend e site
./deploy.sh --migrate    # o acima + sincroniza dados e arquivos do Supabase
./deploy.sh --cutover    # corte final: migra, reescreve as URLs de mídia e valida
```

`--migrate` é **repetível**: linhas já existentes são ignoradas (`ON CONFLICT DO NOTHING`)
e arquivos já baixados são pulados. Rode quantas vezes quiser durante a transição.

---

## Ordem recomendada do corte

1. `./deploy.sh --migrate` — traz tudo, mas ainda não mexe nas URLs.
2. `cd server && npm run migrate:verify` — precisa terminar sem divergência.
3. Suba o site com `VITE_USE_LOCAL_BACKEND=true` e teste login, upload, checkout e inbox.
4. `./deploy.sh --cutover` — reescreve as URLs de mídia para o seu domínio.
5. Rode `--migrate` uma última vez para capturar leads que entraram no meio do caminho.
6. Só então desative o Supabase.

---

## Detalhes que importam

**Senhas preservadas.** Pela API do Supabase os hashes não são exportáveis, mas pelo
banco direto são. `migrate-users.ts` copia o hash bcrypt como está, então ninguém
precisa redefinir senha.

**As 162 funções não foram reescritas.** Elas são código Deno com imports por URL;
portá-las para Node significaria reintroduzir bugs em fluxos de pagamento. Em vez
disso, o Deno roda na VPS e cada função sobe em seu próprio processo, sob demanda.
Dentro delas, `SUPABASE_URL` aponta para a sua própria API — o SDK passa a falar com
o Postgres local sem nenhuma alteração de código.

**Vídeos e imagens.** O Nginx serve `/storage/v1/object/public/` direto do disco,
sem passar pelo Node. Uploads continuam com limite de 300MB.

**Agendamentos.** `pg_cron` assume o que era feito pelo serviço externo. Exemplo para
a rotina diária de dias restantes:

```sql
SELECT cron.schedule('sync-zapmro', '5 3 * * *', 'SELECT public.sync_zapmro_days()');
```

**Segredos.** Os 25 segredos das funções não são legíveis pela API do Supabase —
copie os valores do painel para `server/.env` uma vez (a lista está no `.env.example`).

---

## Diagnóstico

```bash
curl https://api.maisresultadosonline.com.br/health   # banco, funções ativas, realtime
pm2 logs mro-api                                     # log do backend
psql -d "$DATABASE_URL" -c "SELECT step, status, started_at FROM migration_runs ORDER BY started_at DESC LIMIT 10;"
```
