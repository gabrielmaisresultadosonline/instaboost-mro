#!/usr/bin/env bash
# ============================================================
#  COMANDO ÚNICO — PREPARAR O POSTGRESQL DA VPS COM TUDO
#
#    sudo ./migrar-tudo.sh
#
#  O que ele faz (nesta ordem):
#    1. Instala PostgreSQL 16 + extensões, Node 20, Deno, Nginx, PM2
#    2. Gera as chaves (JWT/ANON/SERVICE) se ainda não existirem
#    3. Cria a estrutura do banco (extensões, roles, auth.uid(), storage)
#    4. Copia as 219 tabelas, os usuários (com os hashes de senha)
#       e BAIXA TODOS os arquivos dos 9 buckets (vídeos, imagens, PDFs)
#       para o disco da VPS
#    5. Confere linha por linha e arquivo por arquivo
#
#  IMPORTANTE: o Lovable Cloud / Supabase continua 100% ativo e intocado.
#  Nada é desligado, nenhuma URL de mídia é reescrita aqui. O corte só
#  acontece quando VOCÊ rodar depois:  ./deploy.sh --cutover
#
#  Pode rodar quantas vezes quiser: é idempotente (linhas já existentes
#  são ignoradas e arquivos já baixados são pulados).
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

B='\033[1;36m'; G='\033[0;32m'; Y='\033[0;33m'; R='\033[0;31m'; N='\033[0m'
step(){ echo -e "\n${B}▶ $1${N}"; }
ok(){   echo -e "  ${G}✓${N} $1"; }
warn(){ echo -e "  ${Y}!${N} $1"; }
fail(){ echo -e "  ${R}✗${N} $1"; exit 1; }

SKIP_INSTALL=false
for arg in "$@"; do
  case "$arg" in
    --sem-instalar) SKIP_INSTALL=true ;;
    *) fail "Parâmetro desconhecido: $arg (use --sem-instalar)" ;;
  esac
done

# ---------- 1. Infraestrutura ----------
if [ "$SKIP_INSTALL" = true ] || command -v psql >/dev/null 2>&1; then
  warn "Infraestrutura já presente (ou --sem-instalar): pulando a instalação."
else
  step "1/5 Instalando a infraestrutura na VPS"
  [ "$(id -u)" -eq 0 ] || fail "Rode com sudo nesta primeira vez: sudo ./migrar-tudo.sh"
  bash deploy/install-vps.sh
  ok "PostgreSQL, Node, Deno, Nginx e PM2 instalados."
fi

for bin in node npm psql; do
  command -v "$bin" >/dev/null 2>&1 || fail "$bin não encontrado — rode: sudo ./deploy/install-vps.sh"
done

# ---------- 2. Dependências e chaves ----------
step "2/5 Dependências e chaves"
npm ci --no-audit --no-fund --silent
(cd server && npm ci --no-audit --no-fund --silent)

if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  (cd server && npm run keys)
  echo
  fail "Criei server/.env com chaves novas.
       Abra o painel /admin → aba Migração, baixe o .env pronto (já vem com
       LEGACY_DATABASE_URL, LEGACY_SUPABASE_SERVICE_KEY e os 25 segredos),
       cole o conteúdo em server/.env e rode este comando de novo."
fi

set -a; . ./server/.env; set +a
[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL vazio em server/.env."
[ -n "${LEGACY_DATABASE_URL:-}" ] || fail "LEGACY_DATABASE_URL vazio: sem ele não há de onde copiar os dados."
[ -n "${LEGACY_SUPABASE_SERVICE_KEY:-}" ] || warn "LEGACY_SUPABASE_SERVICE_KEY vazio: os arquivos de mídia NÃO serão baixados."
ok "Ambiente validado."

# ---------- 3. Estrutura do banco ----------
step "3/5 Criando a estrutura do banco local"
psql -v ON_ERROR_STOP=1 -d "$DATABASE_URL" -f server/migrations/000_bootstrap.sql >/dev/null
ok "Extensões, roles, auth.uid(), storage e realtime prontos."

# ---------- 4. Pasta de uploads ----------
STORAGE_DIR="${STORAGE_ROOT:-/var/www/uploads}"
mkdir -p "$STORAGE_DIR"
chmod 750 "$STORAGE_DIR"
ok "Uploads em $STORAGE_DIR."

# ---------- 5. Migração completa ----------
step "4/5 Copiando schema, dados, usuários e TODAS as mídias"
warn "Isso pode levar bastante tempo — os vídeos são o maior volume."
(cd server && npm run migrate:all)   # sem --apply-urls: não mexe em nada no Supabase

step "5/5 Conferência final"
(cd server && npm run migrate:verify)

cat <<EOF

$(echo -e "${G}═══ VPS preparada ═══${N}")

O Lovable Cloud continua ativo e inalterado. Nada foi desligado.

Para testar em paralelo, sem cortar nada:
  VITE_USE_LOCAL_BACKEND=true npm run build && pm2 startOrReload ecosystem.config.cjs

Para sincronizar novamente o que entrou no meio do caminho:
  ./migrar-tudo.sh --sem-instalar

Quando tiver 100% de certeza, aí sim o corte final:
  ./deploy.sh --cutover
EOF
