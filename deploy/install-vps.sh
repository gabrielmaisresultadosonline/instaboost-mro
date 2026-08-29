#!/usr/bin/env bash
# ============================================================
# Instalação única da VPS (Ubuntu 22.04/24.04).
# Instala PostgreSQL 16 + extensões, Node 20, Deno, Nginx, PM2
# e cria o banco/usuário da aplicação.
#
# Uso:  sudo ./deploy/install-vps.sh
# ============================================================
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Rode com sudo."; exit 1; }

DB_NAME="${DB_NAME:-mro}"
DB_USER="${DB_USER:-mro}"
DB_PASS="${DB_PASS:-$(openssl rand -hex 16)}"
STORAGE_DIR="${STORAGE_DIR:-/var/www/uploads}"

echo "▶ Pacotes base"
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg lsb-release git rsync ufw nginx \
  postgresql-16 postgresql-contrib-16 postgresql-16-cron

echo "▶ Node.js 20"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi
npm i -g pm2 --silent

echo "▶ Deno (runtime das funções)"
if ! command -v deno >/dev/null 2>&1; then
  curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh -s -- -y
fi

echo "▶ Banco de dados"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}' CREATEROLE;
  END IF;
END \$\$;
SQL
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"

# pg_cron substitui os agendamentos do serviço anterior (ex.: sync_zapmro_days).
PG_CONF="/etc/postgresql/16/main/postgresql.conf"
if ! grep -q "shared_preload_libraries.*pg_cron" "$PG_CONF"; then
  echo "shared_preload_libraries = 'pg_cron'" >> "$PG_CONF"
  echo "cron.database_name = '${DB_NAME}'" >> "$PG_CONF"
fi
# Ajustes de desempenho para uma base com 219 tabelas.
grep -q "^max_connections" "$PG_CONF" || echo "max_connections = 200" >> "$PG_CONF"
grep -q "^shared_buffers" "$PG_CONF" || echo "shared_buffers = 512MB" >> "$PG_CONF"
grep -q "^work_mem" "$PG_CONF" || echo "work_mem = 16MB" >> "$PG_CONF"
systemctl restart postgresql

echo "▶ Diretórios"
mkdir -p "$STORAGE_DIR" /var/log/mro
chown -R "${SUDO_USER:-root}":"${SUDO_USER:-root}" "$STORAGE_DIR" /var/log/mro

echo "▶ Firewall"
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 'Nginx Full' >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true

cat <<INFO

═══ Instalação concluída ═══

Coloque em server/.env:

  DATABASE_URL=postgres://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}
  STORAGE_ROOT=${STORAGE_DIR}

Guarde a senha do banco: ${DB_PASS}

Próximos passos:
  1. cd server && npm ci && npm run keys     # gera JWT_SECRET e as chaves
  2. preencha server/.env (inclusive LEGACY_* para a migração)
  3. copie deploy/nginx-vps.conf para /etc/nginx/sites-available/mro e ative
  4. certbot --nginx -d maisresultadosonline.com.br -d api.maisresultadosonline.com.br
  5. ./deploy.sh --migrate

INFO
