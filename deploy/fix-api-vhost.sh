#!/usr/bin/env bash
# ============================================================
# Corrige o subdomínio da API na VPS.
#
# Sintoma que este script resolve (visto no `npm run migrate:verify`):
#   - https://api.../health responde 200 mas devolve o HTML do site
#   - https://api.../auth/v1/token responde 405
#   - https://api.../storage/v1/object/public/... responde 404
#     mesmo com o arquivo presente em /var/www/uploads
#
# Causa: o vhost da API existe apenas em :80. No HTTPS (443) o Nginx cai no
# "default server", que é o site React — logo tudo vira index.html (200/405) e
# os arquivos com extensão viram 404. Além disso, `alias` + `try_files $uri`
# no bloco de storage devolve 404 por comparar o URI completo.
#
# Uso (na VPS, como root):  sudo ./deploy/fix-api-vhost.sh
# ============================================================
set -euo pipefail

API_HOST="${API_HOST:-api.maisresultadosonline.com.br}"
BACKEND_PORT="${PORT:-8787}"
UPLOADS_DIR="${STORAGE_ROOT:-/var/www/uploads}"
VHOST="/etc/nginx/sites-available/mro-api"

GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; BLUE='\033[1;36m'; NC='\033[0m'
step() { echo -e "\n${BLUE}▶ $1${NC}"; }
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; exit 1; }

[ "$(id -u)" = "0" ] || fail "Rode com sudo."

step "1/5 Backend local"
curl -sf "http://127.0.0.1:${BACKEND_PORT}/health" | grep -q '"ok":true' \
  || fail "Backend não respondeu em 127.0.0.1:${BACKEND_PORT}. Rode: pm2 restart mro-api"
ok "Backend saudável na porta ${BACKEND_PORT}."

step "2/5 Escrevendo o vhost de ${API_HOST}"
cat > "$VHOST" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${API_HOST};

    client_max_body_size 300M;
    client_body_timeout 600s;

    # Arquivos públicos direto do disco. Regex + captura: com \`alias\`,
    # \`try_files \$uri\` compara o URI completo e devolve 404 indevidamente.
    location ~ ^/storage/v1/object/public/(?<storage_path>.+)\$ {
        alias ${UPLOADS_DIR}/\$storage_path;
        add_header Cache-Control "public, max-age=2592000";
        add_header Access-Control-Allow-Origin "*";
        add_header Accept-Ranges bytes;
    }

    location /realtime/v1 {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location / {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_request_buffering off;
        proxy_read_timeout 300s;
        proxy_connect_timeout 30s;
    }
}
NGINX
ln -sf "$VHOST" /etc/nginx/sites-enabled/mro-api
nginx -t >/dev/null || fail "nginx -t falhou. Rode 'nginx -t' para ver o motivo."
systemctl reload nginx
ok "vhost :80 ativo."

step "3/5 Certificado TLS (bloco 443) para ${API_HOST}"
if [ -d "/etc/letsencrypt/live/${API_HOST}" ]; then
  ok "Certificado já existe."
else
  if command -v certbot >/dev/null 2>&1; then
    # Sem o bloco 443 deste host, o HTTPS cai no site React (causa do bug).
    certbot --nginx -d "${API_HOST}" --non-interactive --agree-tos \
      --register-unsafely-without-email --redirect || warn "certbot falhou (Cloudflare em modo proxy? use um certificado origin)."
  else
    warn "certbot não instalado: apt install -y certbot python3-certbot-nginx"
  fi
fi
grep -q "listen 443" "$VHOST" && ok "Bloco 443 presente no vhost." || warn "Sem bloco 443: o HTTPS ainda pode cair no site."
nginx -t >/dev/null && systemctl reload nginx

step "4/5 Permissões de ${UPLOADS_DIR}"
chmod 755 "$UPLOADS_DIR"
ok "$UPLOADS_DIR legível pelo Nginx."

step "5/5 Conferindo pelo domínio"
HEALTH="$(curl -s --max-time 10 "https://${API_HOST}/health" || true)"
if printf '%s' "$HEALTH" | grep -q '"ok":true'; then
  ok "https://${API_HOST}/health devolve JSON do backend."
elif printf '%s' "$HEALTH" | grep -qi '<!doctype html'; then
  fail "Ainda devolve HTML do site: falta o bloco 443 deste host (certbot) ou a Cloudflare aponta o subdomínio para outro lugar."
else
  warn "Resposta inesperada: $(printf '%s' "$HEALTH" | head -c 120)"
fi

echo -e "\n${GREEN}Pronto.${NC} Agora rode: cd /var/www/ia-mro/server && npm run verify"
