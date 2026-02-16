#!/bin/bash

# ==============================================
# Video Server Setup Script for Hostinger VPS
# Installs ffmpeg, Node.js video server, and
# configures Nginx for HLS streaming
# ==============================================

set -e

DOMAIN=${1:-"seu-dominio.com"}
APP_DIR="/var/www/ia-mro"
VIDEOS_DIR="$APP_DIR/videos"
VIDEO_SERVER_DIR="$APP_DIR/deploy/video-server"

echo "============================================"
echo "  Configurando Video Server + HLS Streaming"
echo "  Domínio: $DOMAIN"
echo "============================================"

# 1. Install ffmpeg
echo ""
echo "📦 Instalando ffmpeg..."
apt-get update
apt-get install -y ffmpeg

# Verify
ffmpeg -version | head -1
echo "✅ ffmpeg instalado!"

# 2. Create videos directory
echo ""
echo "📁 Criando diretórios de vídeo..."
mkdir -p "$VIDEOS_DIR/hls"
chown -R www-data:www-data "$VIDEOS_DIR"

# 3. Install video server dependencies
echo ""
echo "📦 Instalando dependências do video server..."
cd "$VIDEO_SERVER_DIR"
npm install

# 4. Create systemd service for video server
echo ""
echo "⚙️ Criando serviço do video server..."
cat > /etc/systemd/system/video-server.service << EOF
[Unit]
Description=MRO Video Upload & HLS Transcoding Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$VIDEO_SERVER_DIR
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment=VIDEO_PORT=3002
Environment=VIDEOS_DIR=$VIDEOS_DIR
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=video-server

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable video-server
systemctl restart video-server

echo "✅ Video server rodando na porta 3002!"

# 5. Update Nginx configuration
echo ""
echo "🌐 Atualizando configuração do Nginx..."

# Check if video location already exists
if ! grep -q "location /videos/" /etc/nginx/sites-available/$DOMAIN 2>/dev/null; then
  # Add video serving and proxy config before the closing }
  NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
  
  if [ -f "$NGINX_CONF" ]; then
    # Insert before the last closing brace
    sed -i '/^}$/i \
    # === Video Streaming Configuration === \
    \
    # Serve video files directly via Nginx (efficient) \
    location /videos/ { \
        alias '"$VIDEOS_DIR"'/; \
        \
        # Enable range requests (essential for video seeking) \
        add_header Accept-Ranges bytes; \
        \
        # CORS headers \
        add_header Access-Control-Allow-Origin *; \
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS"; \
        \
        # Cache video segments \
        location ~* \\.ts$ { \
            add_header Cache-Control "public, max-age=31536000"; \
            add_header Access-Control-Allow-Origin *; \
        } \
        \
        # No cache for playlists (they may update) \
        location ~* \\.m3u8$ { \
            add_header Cache-Control "no-cache"; \
            add_header Access-Control-Allow-Origin *; \
            types { application/vnd.apple.mpegurl m3u8; } \
        } \
        \
        # Optimize for large files \
        sendfile on; \
        tcp_nopush on; \
        tcp_nodelay on; \
        directio 512; \
        aio on; \
    } \
    \
    # Proxy video upload API to Node.js server \
    location /api/video/ { \
        proxy_pass http://127.0.0.1:3002; \
        proxy_http_version 1.1; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        \
        # Allow large uploads (3GB) \
        client_max_body_size 3G; \
        proxy_request_buffering off; \
        proxy_read_timeout 3600s; \
        proxy_send_timeout 3600s; \
    }' "$NGINX_CONF"
    
    echo "✅ Nginx configurado para video streaming!"
  else
    echo "⚠️ Arquivo Nginx não encontrado: $NGINX_CONF"
    echo "   Adicione manualmente a configuração de vídeo."
  fi
fi

# CRITICAL: Set client_max_body_size globally in nginx.conf (http block)
echo ""
echo "📐 Configurando limite global de upload no Nginx..."
NGINX_MAIN="/etc/nginx/nginx.conf"
if [ -f "$NGINX_MAIN" ]; then
  if grep -q "client_max_body_size" "$NGINX_MAIN"; then
    sed -i 's/client_max_body_size.*/client_max_body_size 3G;/' "$NGINX_MAIN"
  else
    sed -i '/http {/a \    client_max_body_size 3G;' "$NGINX_MAIN"
  fi
  echo "✅ nginx.conf atualizado com client_max_body_size 3G"
fi

# Also set in server block
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
if [ -f "$NGINX_CONF" ]; then
  if grep -q "client_max_body_size" "$NGINX_CONF"; then
    sed -i 's/client_max_body_size.*/client_max_body_size 3G;/' "$NGINX_CONF"
  else
    sed -i '/server_name/a \    client_max_body_size 3G;' "$NGINX_CONF"
  fi
fi

# Increase proxy timeouts and buffering in the video location block
if [ -f "$NGINX_CONF" ]; then
  if ! grep -q "proxy_buffering off" "$NGINX_CONF"; then
    sed -i '/location \/api\/video\//,/}/ {
      /proxy_read_timeout/d
      /proxy_send_timeout/d
      /proxy_request_buffering/d
      /client_max_body_size/a \        proxy_buffering off;\n        proxy_read_timeout 7200s;\n        proxy_send_timeout 7200s;\n        proxy_connect_timeout 300s;
    }' "$NGINX_CONF" 2>/dev/null || true
  fi
fi

# Test and reload Nginx
nginx -t && systemctl reload nginx

echo ""
echo "============================================"
echo "  ✅ Video Server configurado com sucesso!"
echo "============================================"
echo ""
echo "  Upload endpoint: https://$DOMAIN/api/video/upload"
echo "  Videos servidos: https://$DOMAIN/videos/"
echo "  HLS streams:     https://$DOMAIN/videos/hls/"
echo ""
echo "  Serviço: systemctl status video-server"
echo "  Logs:    journalctl -u video-server -f"
echo ""
echo "  Para verificar ffmpeg: ffmpeg -version"
echo "============================================"
