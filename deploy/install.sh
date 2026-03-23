#!/bin/bash

# =============================================================
# Script de Instalação Automática - I.A MRO
# Para Ubuntu LTS (VPS Hostinger)
# Repositório: https://github.com/gabrielmaisresultadosonline/instaboost-mro.git
# Domínio: maisresultadosonline.com.br
# =============================================================

set -e

echo "🚀 Iniciando instalação do I.A MRO..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variáveis
APP_NAME="ia-mro"
APP_DIR="/var/www/$APP_NAME"
WHATSAPP_DIR="$APP_DIR/whatsapp-server"
DOMAIN="maisresultadosonline.com.br"
REPO_URL="https://github.com/gabrielmaisresultadosonline/instaboost-mro.git"

echo -e "${YELLOW}Atualizando sistema...${NC}"
sudo apt update && sudo apt upgrade -y

echo -e "${YELLOW}Instalando dependências do sistema...${NC}"
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# Dependências para Puppeteer/Chromium (WhatsApp Web)
echo -e "${YELLOW}Instalando dependências do Chromium...${NC}"
sudo apt install -y \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    libgbm-dev || true

# Instalar Node.js 20 LTS
echo -e "${YELLOW}Instalando Node.js 20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2 globalmente
echo -e "${YELLOW}Instalando PM2...${NC}"
sudo npm install -g pm2

# Verificar versões
echo -e "${GREEN}Node.js: $(node -v)${NC}"
echo -e "${GREEN}NPM: $(npm -v)${NC}"

# Criar diretório da aplicação
echo -e "${YELLOW}Criando diretório da aplicação...${NC}"
sudo mkdir -p /var/www
cd /var/www

# Clonar ou atualizar repositório
echo -e "${YELLOW}Clonando/Atualizando repositório...${NC}"
if [ -d "$APP_NAME" ]; then
    cd $APP_NAME
    git fetch origin
    git reset --hard origin/main
else
    git clone $REPO_URL $APP_NAME
    cd $APP_NAME
fi

sudo chown -R $USER:$USER $APP_DIR

# ============= Frontend =============
echo -e "${YELLOW}Instalando dependências do frontend...${NC}"
npm install

echo -e "${YELLOW}Fazendo build do frontend...${NC}"
npm run build

# ============= WhatsApp Backend =============
echo -e "${YELLOW}Configurando WhatsApp Multi Connect...${NC}"

if [ -d "$WHATSAPP_DIR" ]; then
    cd $WHATSAPP_DIR
    
    npm install
    
    # Criar .env
    echo "PORT=3001" > .env
    echo "NODE_ENV=production" >> .env
    
    # Iniciar com PM2
    pm2 delete whatsapp-multi 2>/dev/null || true
    pm2 start server/index.js --name "whatsapp-multi"
    pm2 save
    pm2 startup | tail -1 | bash || true
    
    cd $APP_DIR
fi

# Configurar Nginx
echo -e "${YELLOW}Configurando Nginx...${NC}"
sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    root $APP_DIR/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;

    # Cache static assets
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

    # SPA routing - all routes go to index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

# Ativar site
sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar e reiniciar Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo -e "${GREEN}✅ Instalação concluída!${NC}"
echo ""
echo -e "${YELLOW}📌 Configurando SSL com Let's Encrypt...${NC}"
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || {
    echo -e "${YELLOW}⚠️  SSL não configurado automaticamente. Execute manualmente:${NC}"
    echo "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
}

echo ""
echo -e "${GREEN}✅ Tudo pronto!${NC}"
echo ""
echo "🌐 Frontend: https://$DOMAIN"
echo "📱 WhatsApp API: https://$DOMAIN/whatsapp-api/"
echo ""
echo "📝 Para atualizar futuramente, execute:"
echo "   cd $APP_DIR && ./deploy/update.sh"
echo ""
echo "📊 Comandos PM2 úteis:"
echo "   pm2 status              # Ver status"
echo "   pm2 logs whatsapp-multi # Ver logs"
echo "   pm2 restart whatsapp-multi # Reiniciar"
echo ""
