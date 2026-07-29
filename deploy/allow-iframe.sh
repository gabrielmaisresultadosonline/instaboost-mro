#!/bin/bash
# =============================================================
# Libera embed em iframe (qualquer site / extensao) + Deploy
# Uso:  sudo bash /var/www/ia-mro/deploy/allow-iframe.sh
# =============================================================
set -e

APP_DIR="/var/www/ia-mro"
DOMAIN="maisresultadosonline.com.br"

SUDO=""
if [ "${EUID:-$(id -u)}" -ne 0 ]; then SUDO="sudo"; fi

echo "🔓 Liberando iframe (removendo X-Frame-Options)..."

# 1) Descobrir todos os arquivos de config que citam X-Frame-Options
FILES=$($SUDO grep -rl "X-Frame-Options" /etc/nginx/ 2>/dev/null || true)

for f in $FILES; do
  echo "  → limpando $f"
  $SUDO cp "$f" "$f.bak.$(date +%s)"
  # comenta qualquer linha add_header X-Frame-Options
  $SUDO sed -i 's|^\([[:space:]]*\)add_header[[:space:]]\+X-Frame-Options|\1# add_header X-Frame-Options|I' "$f"
done

# 2) Garantir headers de liberacao no server block do site
SITE=""
for cand in /etc/nginx/sites-available/ia-mro \
            /etc/nginx/sites-available/$DOMAIN \
            /etc/nginx/sites-available/default \
            /etc/nginx/conf.d/$DOMAIN.conf; do
  if [ -f "$cand" ] && $SUDO grep -q "$DOMAIN" "$cand"; then SITE="$cand"; break; fi
done

if [ -z "$SITE" ]; then
  SITE=$($SUDO grep -rl "$DOMAIN" /etc/nginx/sites-available /etc/nginx/conf.d 2>/dev/null | head -n1)
fi

if [ -n "$SITE" ]; then
  echo "  → aplicando frame-ancestors em $SITE"
  $SUDO cp "$SITE" "$SITE.bak.$(date +%s)"
  # remove CSP antigo com frame-ancestors para nao duplicar
  $SUDO sed -i '/frame-ancestors/d' "$SITE"
  # insere logo apos cada "server {" que fale do dominio
  $SUDO awk '
    /server[[:space:]]*\{/ && !done {
      print;
      print "    proxy_hide_header X-Frame-Options;";
      print "    add_header Content-Security-Policy \"frame-ancestors *\" always;";
      next
    }
    { print }
  ' "$SITE" > /tmp/nginx_site_patched && $SUDO mv /tmp/nginx_site_patched "$SITE"
else
  echo "  ⚠️  Nao encontrei o server block do dominio. Edite manualmente."
fi

echo "🧪 Testando configuracao do Nginx..."
$SUDO nginx -t

# 3) Atualizar aplicacao
echo "📥 Atualizando codigo..."
cd "$APP_DIR"
git fetch origin
git reset --hard origin/main

echo "📦 Instalando dependencias..."
npm install --legacy-peer-deps

echo "🏗️  Build..."
npm run build

echo "♻️  Reload Nginx..."
$SUDO systemctl reload nginx

if command -v pm2 >/dev/null 2>&1; then
  echo "♻️  Restart PM2..."
  pm2 restart all || true
  pm2 save || true
fi

echo ""
echo "✅ Pronto! Verificando headers:"
curl -sI "https://$DOMAIN/mro-ferramenta" | grep -i -E "x-frame|content-security" || echo "  (sem X-Frame-Options — iframe liberado)"
echo ""
echo "👉 Teste: <iframe src=\"https://$DOMAIN/mro-ferramenta?embed=1\"></iframe>"
