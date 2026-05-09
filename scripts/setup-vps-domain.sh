#!/bin/bash

# Script para Automatização do Nginx Reverse Proxy - WhatsApp Audio Bridge
# Domínio: maisresultadosonline.com.br
# Porta Interna: 3000

echo "--------------------------------------------------"
echo "🚀 Iniciando Configuração Automática do Bridge..."
echo "--------------------------------------------------"

# 1. Verificar se é root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Por favor, execute como root (use sudo)."
  exit
fi

# 2. Instalar Nginx se não existir
if ! command -v nginx &> /dev/null; then
    echo "📦 Instalando Nginx..."
    apt update && apt install -y nginx
fi

# 3. Criar configuração do Nginx
DOMAIN="maisresultadosonline.com.br"
CONF_FILE="/etc/nginx/sites-available/whatsapp-bridge"

echo "📝 Criando arquivo de configuração em $CONF_FILE..."

cat > $CONF_FILE <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location /bridge/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Aumentar timeouts para processamento de áudio
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;

        # Permitir uploads grandes
        client_max_body_size 50M;
    }
}
EOF

# 4. Ativar o site
echo "🔗 Ativando configuração..."
ln -sf $CONF_FILE /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 5. Testar e Reiniciar Nginx
echo "⚙️ Testando Nginx..."
nginx -t
if [ $? -eq 0 ]; then
    systemctl restart nginx
    echo "✅ Nginx reiniciado com sucesso!"
else
    echo "❌ Erro na configuração do Nginx. Verifique os logs."
    exit 1
fi

# 6. Dica de SSL (Certbot)
echo "--------------------------------------------------"
echo "🔒 CONFIGURAÇÃO DE SEGURANÇA (SSL)"
echo "--------------------------------------------------"
echo "Para ativar o HTTPS (recomendado), execute:"
echo "sudo apt install certbot python3-certbot-nginx -y"
echo "sudo certbot --nginx -d $DOMAIN"
echo "--------------------------------------------------"
echo "✅ TUDO PRONTO!"
echo "Sua URL no CRM agora será: http://$DOMAIN/bridge"
echo "Após o Certbot, será: https://$DOMAIN/bridge"
echo "--------------------------------------------------"
