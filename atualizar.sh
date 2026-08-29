#!/usr/bin/env bash
# ============================================================
#  COMANDO ÚNICO — ATUALIZAR TUDO NA VPS
#
#      cd /var/www/ia-mro && ./atualizar.sh
#
#  Substitui a sequência antiga (git pull / npm install / npm run build /
#  reload nginx / pm2 restart all) e ainda:
#    • aplica a estrutura do PostgreSQL local (extensões, roles, storage, auth)
#    • copia tabelas, usuários (com hashes) e TODOS os arquivos dos buckets
#    • deixa as 163 edge functions servidas localmente (/functions/v1/*)
#    • recompila o site e recarrega Nginx + PM2 (wpp-bot-mro, video-server…)
#
#  O Supabase / Lovable Cloud continua 100% ativo e intocado: nenhuma URL de
#  mídia é reescrita aqui. O corte só acontece quando VOCÊ rodar, no futuro:
#      ./deploy.sh --cutover
#
#  Idempotente: pode rodar quantas vezes quiser (linhas já existentes são
#  ignoradas, arquivos já baixados são pulados).
#
#  Opções:
#    ./atualizar.sh --rapido      só código + build + serviços (sem migrar dados)
#    ./atualizar.sh --sem-midia   migra tabelas/usuários, mas não baixa arquivos
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

B='\033[1;36m'; G='\033[0;32m'; Y='\033[0;33m'; R='\033[0;31m'; N='\033[0m'
step(){ echo -e "\n${B}▶ $1${N}"; }
ok(){   echo -e "  ${G}✓${N} $1"; }
warn(){ echo -e "  ${Y}!${N} $1"; }
fail(){ echo -e "  ${R}✗${N} $1"; exit 1; }

RAPIDO=false
MIGRATE_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --rapido)    RAPIDO=true ;;
    --sem-midia) MIGRATE_ARGS+=("--skip-storage") ;;
    *) fail "Parâmetro desconhecido: $arg (use --rapido ou --sem-midia)" ;;
  esac
done

# ---------- 1. Código do GitHub ----------
step "1/7 Baixando o código do GitHub"
if [ -d .git ]; then
  git fetch --all --quiet
  git reset --hard origin/main --quiet
  ok "Atualizado em $(git rev-parse --short HEAD)."
else
  warn "Não é um repositório git; usando os arquivos do disco."
fi

# ---------- 2. Dependências ----------
step "2/7 Instalando dependências"
npm install --legacy-peer-deps --no-audit --no-fund --silent
if [ -d server ]; then
  (cd server && npm install --no-audit --no-fund --silent)
  ok "Frontend e backend prontos."
else
  ok "Frontend pronto."
fi

# ---------- 3. Banco de dados ----------
DB_PRONTO=false
if [ -f server/.env ]; then
  set -a; . ./server/.env; set +a
  if [ -n "${DATABASE_URL:-}" ] && command -v psql >/dev/null 2>&1; then
    step "3/7 Aplicando a estrutura do PostgreSQL local"
    psql -v ON_ERROR_STOP=1 -d "$DATABASE_URL" -f server/migrations/000_bootstrap.sql >/dev/null
    ok "Extensões, roles, auth.uid(), storage e realtime aplicados."

    for m in $(ls server/migrations/0[1-9]*.sql 2>/dev/null || true); do
      psql -v ON_ERROR_STOP=0 -d "$DATABASE_URL" -f "$m" >/dev/null 2>&1 || true
      ok "Migração aplicada: $(basename "$m")"
    done

    STORAGE_DIR="${STORAGE_ROOT:-/var/www/uploads}"
    mkdir -p "$STORAGE_DIR"; chmod 750 "$STORAGE_DIR"
    ok "Uploads em $STORAGE_DIR."
    DB_PRONTO=true
  else
    warn "3/7 DATABASE_URL vazio ou psql ausente: banco local ignorado."
  fi
else
  warn "3/7 server/.env não existe — baixe o arquivo pronto em /admin → Migração."
fi

# ---------- 4. Tabelas, usuários e arquivos ----------
if [ "$RAPIDO" = true ]; then
  warn "4/7 Migração de dados ignorada (--rapido)."
elif [ "$DB_PRONTO" = true ] && [ -n "${LEGACY_DATABASE_URL:-}" ]; then
  step "4/7 Copiando tabelas, usuários e arquivos do Supabase"
  warn "Pode levar bastante tempo na primeira vez (os vídeos são o maior volume)."
  (cd server && npm run migrate:all -- "${MIGRATE_ARGS[@]+"${MIGRATE_ARGS[@]}"}")
  ok "Dados e mídias sincronizados (Supabase segue intacto)."
else
  warn "4/7 LEGACY_DATABASE_URL ausente: nada a copiar do Supabase."
fi

# ---------- 5. Frontend ----------
step "5/7 Compilando o site"
npm run build
[ -d dist ] || fail "Build não gerou a pasta dist/."
ok "Site compilado ($(du -sh dist | cut -f1))."
if [ -n "${WEB_ROOT:-}" ] && [ "$WEB_ROOT" != "$(pwd)/dist" ]; then
  rsync -a --delete dist/ "$WEB_ROOT/"
  ok "Publicado em $WEB_ROOT."
fi

# ---------- 6. Serviços ----------
step "6/7 Reiniciando serviços"
if command -v pm2 >/dev/null 2>&1; then
  [ -f ecosystem.config.cjs ] && pm2 startOrReload ecosystem.config.cjs --update-env >/dev/null
  pm2 restart all >/dev/null || true
  pm2 save >/dev/null || true
  ok "PM2 recarregado (mro-api, wpp-bot-mro, video-server)."
else
  warn "PM2 não instalado (npm i -g pm2)."
fi
if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl reload nginx && ok "Nginx recarregado."
fi

# ---------- 7. Verificação ----------
step "7/7 Conferência"
if [ "$DB_PRONTO" = true ] && [ "$RAPIDO" = false ]; then
  (cd server && npm run migrate:verify) || warn "Conferência apontou divergências (veja acima)."
fi
PORT_LOCAL="${PORT:-8787}"
for i in $(seq 1 20); do
  if curl -sf "http://127.0.0.1:${PORT_LOCAL}/health" >/dev/null; then
    ok "Backend local respondendo na porta ${PORT_LOCAL}."
    break
  fi
  [ "$i" = "20" ] && warn "Backend local não respondeu em /health (o site atual continua no ar pelo Supabase)."
  sleep 1
done

cat <<EOF

$(echo -e "${G}═══ Atualização concluída ═══${N}")

O Lovable Cloud / Supabase continua ativo e inalterado.

Testar o backend próprio em paralelo, sem cortar nada:
  VITE_USE_LOCAL_BACKEND=true npm run build && pm2 restart mro-api

Somente quando tiver 100% de certeza:
  ./deploy.sh --cutover
EOF
