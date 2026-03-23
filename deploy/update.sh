#!/bin/bash

# =============================================================
# Script de Atualização - I.A MRO
# Para Ubuntu LTS (VPS Hostinger)
# =============================================================

set -e

echo "🔄 Atualizando I.A MRO..."

APP_NAME="ia-mro"
APP_DIR="/var/www/$APP_NAME"
WHATSAPP_DIR="$APP_DIR/whatsapp-server"
NGINX_SITE="/etc/nginx/sites-available/$APP_NAME"
DOMAIN="maisresultadosonline.com.br"

# Sudo helper (permite rodar como root ou usuário normal)
SUDO=""
if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  SUDO="sudo"
fi

cd "$APP_DIR"

echo "📥 Baixando atualizações do GitHub..."
git fetch origin
git reset --hard origin/main

echo "📦 Instalando dependências do frontend..."
npm install

echo "🔨 Fazendo build do frontend..."
npm run build

# ============= WhatsApp Backend =============
echo ""
echo "📱 Configurando WhatsApp Multi Connect..."

if [ -d "$WHATSAPP_DIR" ]; then
  cd "$WHATSAPP_DIR"

  echo "📦 Instalando dependências do WhatsApp backend..."
  npm install

  # Criar .env se não existir
  if [ ! -f ".env" ]; then
    echo "PORT=3001" > .env
    echo "NODE_ENV=production" >> .env
  fi

  # Garantir PM2 disponível (algumas VPS instalam npm global fora do PATH)
  NPM_GLOBAL_BIN="$(npm bin -g)"
  export PATH="$NPM_GLOBAL_BIN:$PATH"

  if ! command -v pm2 >/dev/null 2>&1; then
    echo "📦 Instalando PM2..."
    $SUDO npm install -g pm2
    NPM_GLOBAL_BIN="$(npm bin -g)"
    export PATH="$NPM_GLOBAL_BIN:$PATH"
  fi

  # Criar symlink para evitar 'pm2: command not found' depois
  if [ -x "$NPM_GLOBAL_BIN/pm2" ]; then
    $SUDO ln -sf "$NPM_GLOBAL_BIN/pm2" /usr/local/bin/pm2 || true
  fi

  PM2_BIN="$(command -v pm2 || true)"
  if [ -z "$PM2_BIN" ] && [ -x "/usr/local/bin/pm2" ]; then
    PM2_BIN="/usr/local/bin/pm2"
  fi

  if [ -z "$PM2_BIN" ]; then
    echo "❌ PM2 não encontrado após instalação. Rode: $SUDO npm install -g pm2"
    exit 1
  fi

  # Reiniciar ou iniciar o processo
  if "$PM2_BIN" list | grep -q "whatsapp-multi"; then
    echo "🔄 Reiniciando WhatsApp backend..."
    "$PM2_BIN" restart whatsapp-multi
  else
    echo "🚀 Iniciando WhatsApp backend..."
    "$PM2_BIN" start server/index.js --name "whatsapp-multi"
  fi

  "$PM2_BIN" save || true

  cd "$APP_DIR"
else
  echo "⚠️ Pasta whatsapp-server não encontrada em $WHATSAPP_DIR"
fi

# ============= Nginx (proxy do /whatsapp-api/) =============
echo ""
echo "🧩 Verificando Nginx para /whatsapp-api/..."

# Se o Nginx ainda não tiver o proxy, aplicamos um config padrão (com backup)
if ! $SUDO nginx -T 2>/dev/null | grep -q "location /whatsapp-api/"; then
  echo "🛠️ Aplicando configuração do Nginx para WhatsApp (backup do arquivo atual)..."
  if [ -f "$NGINX_SITE" ]; then
    $SUDO cp "$NGINX_SITE" "$NGINX_SITE.bak.$(date +%s)" || true
  fi

  $SUDO tee "$NGINX_SITE" > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    root $APP_DIR/dist;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # WhatsApp API Backend - Proxy para Node.js
    location /whatsapp-api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Socket.io para WhatsApp
    location /socket.io/ {
        proxy_pass http://localhost:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

  $SUDO ln -sf "$NGINX_SITE" "/etc/nginx/sites-enabled/$APP_NAME"
fi

# ============= Subdomínio prompts.maisresultadosonline.com.br =============
PROMPTS_DOMAIN="prompts.$DOMAIN"
PROMPTS_NGINX="/etc/nginx/sites-available/prompts-mro"

if [ ! -f "$PROMPTS_NGINX" ]; then
  echo "🛠️ Criando configuração Nginx para $PROMPTS_DOMAIN..."
  $SUDO tee "$PROMPTS_NGINX" > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $PROMPTS_DOMAIN;
    root $APP_DIR/dist;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

  $SUDO ln -sf "$PROMPTS_NGINX" "/etc/nginx/sites-enabled/prompts-mro"
  echo "✅ Nginx configurado para $PROMPTS_DOMAIN"
  echo ""
  echo "⚠️  Rode o comando abaixo para ativar SSL no subdomínio:"
  echo "   sudo certbot --nginx -d $PROMPTS_DOMAIN"
fi

echo "🔄 Reiniciando Nginx..."
$SUDO nginx -t
$SUDO systemctl restart nginx

echo ""
echo "✅ Atualização concluída!"
echo "🌐 Frontend: https://$DOMAIN"
echo "📱 WhatsApp API: https://$DOMAIN/whatsapp-api/"
echo "🧩 Painel (iframe): https://$DOMAIN/whatsapp"
echo "📝 Prompts MRO: https://$PROMPTS_DOMAIN"
echo ""
