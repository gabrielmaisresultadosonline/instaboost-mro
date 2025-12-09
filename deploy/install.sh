#!/bin/bash

# =============================================================
# Script de Instalação Automática - I.A MRO
# Para Ubuntu LTS (VPS Hostinger)
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
DOMAIN="${1:-localhost}"

echo -e "${YELLOW}Atualizando sistema...${NC}"
sudo apt update && sudo apt upgrade -y

echo -e "${YELLOW}Instalando dependências do sistema...${NC}"
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# Instalar Node.js 20 LTS
echo -e "${YELLOW}Instalando Node.js 20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar versões
echo -e "${GREEN}Node.js: $(node -v)${NC}"
echo -e "${GREEN}NPM: $(npm -v)${NC}"

# Criar diretório da aplicação
echo -e "${YELLOW}Criando diretório da aplicação...${NC}"
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# Clonar repositório (substitua pela URL do seu repo)
echo -e "${YELLOW}Clonando repositório...${NC}"
cd /var/www
if [ -d "$APP_NAME" ]; then
    cd $APP_NAME
    git pull origin main
else
    echo "❌ Clone o repositório manualmente:"
    echo "   git clone https://github.com/SEU_USUARIO/SEU_REPO.git $APP_NAME"
    echo ""
    echo "Depois execute: cd $APP_DIR && npm install && npm run build"
    exit 1
fi

# Instalar dependências e fazer build
echo -e "${YELLOW}Instalando dependências...${NC}"
npm install

echo -e "${YELLOW}Fazendo build da aplicação...${NC}"
npm run build

# Configurar Nginx
echo -e "${YELLOW}Configurando Nginx...${NC}"
sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    root $APP_DIR/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
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
echo "📌 Próximos passos:"
echo "   1. Configure seu domínio DNS apontando para este servidor"
echo "   2. Para SSL gratuito, execute: sudo certbot --nginx -d $DOMAIN"
echo ""
echo "🌐 Acesse: http://$DOMAIN"
echo ""
