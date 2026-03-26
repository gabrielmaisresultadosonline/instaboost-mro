#!/bin/bash

# =============================================================
# Script de Atualização - I.A MRO
# Para Ubuntu LTS (VPS Hostinger)
# =============================================================

set -e

echo "🔄 Atualizando I.A MRO..."

APP_NAME="ia-mro"
APP_DIR="/var/www/$APP_NAME"
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

# ============= Limpar legado whatsapp-server (se existir) =============
if command -v pm2 >/dev/null 2>&1; then
    pm2 delete zapmro-cloud 2>/dev/null || true
    pm2 delete whatsapp-multi 2>/dev/null || true
    pm2 save || true
fi
rm -rf "$APP_DIR/whatsapp-server" 2>/dev/null || true

echo "📦 Instalando dependências do frontend..."
npm install

echo "🔨 Fazendo build do frontend..."
npm run build

# ============= Nginx =============
echo ""
echo "🧩 Verificando Nginx..."

# Só cria config Nginx se NÃO existir (preserva SSL/certbot)
if [ ! -f "$NGINX_SITE" ]; then
  echo "🛠️ Criando configuração Nginx inicial..."
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

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)\$ {
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
  $SUDO ln -sf "$NGINX_SITE" "/etc/nginx/sites-enabled/$APP_NAME"
  echo "✅ Nginx configurado. Rode: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
else
  echo "✅ Config Nginx já existe (preservando SSL/certbot)"
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
echo "📝 Prompts MRO: https://$PROMPTS_DOMAIN"
echo ""
