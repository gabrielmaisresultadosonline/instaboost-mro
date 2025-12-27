#!/bin/bash

# =============================================================
# Script de Atualização - I.A MRO
# Para Ubuntu LTS (VPS Hostinger)
# =============================================================

set -e

echo "🔄 Atualizando I.A MRO..."

APP_DIR="/var/www/ia-mro"
WHATSAPP_DIR="/var/www/ia-mro/whatsapp-server"

cd $APP_DIR

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
    cd $WHATSAPP_DIR
    
    echo "📦 Instalando dependências do WhatsApp backend..."
    npm install
    
    # Criar .env se não existir
    if [ ! -f ".env" ]; then
        echo "PORT=3001" > .env
        echo "NODE_ENV=production" >> .env
    fi
    
    # Instalar PM2 se não estiver instalado
    if ! command -v pm2 &> /dev/null; then
        echo "📦 Instalando PM2..."
        sudo npm install -g pm2
    fi
    
    # Reiniciar ou iniciar o processo
    if pm2 list | grep -q "whatsapp-multi"; then
        echo "🔄 Reiniciando WhatsApp backend..."
        pm2 restart whatsapp-multi
    else
        echo "🚀 Iniciando WhatsApp backend..."
        pm2 start server/index.js --name "whatsapp-multi"
        pm2 save
    fi
    
    cd $APP_DIR
fi

echo "🔄 Reiniciando Nginx..."
sudo systemctl restart nginx

echo ""
echo "✅ Atualização concluída!"
echo "🌐 Frontend: https://maisresultadosonline.com.br"
echo "📱 WhatsApp: https://maisresultadosonline.com.br/whatsapp-api/"
echo ""
