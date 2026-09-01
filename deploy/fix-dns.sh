#!/usr/bin/env bash
# ============================================================
# Corrige o resolvedor DNS interno da VPS.
#
# Causa: o systemd-resolved usa o DNS do provedor (153.92.2.6) como
# servidor atual. Esse resolvedor falha em responder registros novos
# atrás do Cloudflare Proxy, então `dig api.maisresultadosonline.com.br`
# na VPS não devolve nada, apesar de 1.1.1.1 responder normalmente.
#
# Correção: fixar 1.1.1.1 / 8.8.8.8 como DNS globais do systemd-resolved,
# desativar DNSSEC (o resolvedor do provedor devolve respostas truncadas),
# garantir que /etc/resolv.conf aponte para o stub do resolved e limpar o
# cache. NADA no Cloudflare é alterado — o registro A continua 72.60.250.206
# com proxy laranja.
#
# Uso:  sudo ./deploy/fix-dns.sh
# ============================================================
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Rode com sudo."; exit 1; }

DOMAINS=(
  "api.maisresultadosonline.com.br"
  "maisresultadosonline.com.br"
)

GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; BLUE='\033[1;36m'; NC='\033[0m'
step() { echo -e "\n${BLUE}▶ $1${NC}"; }
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; exit 1; }

command -v dig >/dev/null 2>&1 || { apt-get update -qq && apt-get install -y -qq dnsutils; }

step "Estado atual"
resolvectl status 2>/dev/null | sed -n '1,20p' || cat /etc/resolv.conf

# ---------- 1. DNS global do systemd-resolved ----------
step "Fixando resolvedores públicos no systemd-resolved"
mkdir -p /etc/systemd/resolved.conf.d
cat > /etc/systemd/resolved.conf.d/99-mro-dns.conf <<'CONF'
# Gerado por deploy/fix-dns.sh — resolvedores confiáveis para a VPS.
# O DNS do provedor falhava em resolver subdomínios atrás do Cloudflare.
[Resolve]
DNS=1.1.1.1 1.0.0.1 8.8.8.8 8.8.4.4
FallbackDNS=9.9.9.9 149.112.112.112
# DNSSEC=no: o caminho até o resolvedor do provedor devolvia respostas
# truncadas/sem assinatura, o que fazia o resolved descartar o resultado.
DNSSEC=no
DNSOverTLS=no
Cache=yes
CONF
ok "/etc/systemd/resolved.conf.d/99-mro-dns.conf escrito."

# ---------- 2. Impedir que o DHCP/cloud-init reinjete o DNS do provedor ----------
step "Removendo o DNS do provedor das interfaces (netplan)"
for file in /etc/netplan/*.yaml; do
  [ -f "$file" ] || continue
  if grep -q "153.92.2.6" "$file"; then
    cp "$file" "$file.bak.$(date +%s)"
    sed -i 's/153\.92\.2\.6/1.1.1.1/g' "$file"
    ok "$(basename "$file"): 153.92.2.6 → 1.1.1.1 (backup criado)."
    NETPLAN_CHANGED=1
  fi
done
if [ "${NETPLAN_CHANGED:-0}" = "1" ]; then
  netplan apply || warn "netplan apply falhou; siga apenas com o resolved."
fi

# ---------- 3. resolv.conf apontando para o stub do resolved ----------
step "Normalizando /etc/resolv.conf"
if [ -L /etc/resolv.conf ] && readlink -f /etc/resolv.conf | grep -q "stub-resolv.conf"; then
  ok "Já é o link simbólico correto."
else
  [ -e /etc/resolv.conf ] && cp -L /etc/resolv.conf "/etc/resolv.conf.bak.$(date +%s)" 2>/dev/null || true
  ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
  ok "Link recriado para /run/systemd/resolve/stub-resolv.conf."
fi

# ---------- 4. Reiniciar e limpar cache ----------
step "Recarregando o systemd-resolved"
systemctl enable --now systemd-resolved >/dev/null 2>&1 || true
systemctl restart systemd-resolved
resolvectl flush-caches || true
sleep 2
ok "Serviço reiniciado e cache limpo."

# ---------- 5. Validação ----------
step "Validando a resolução"
FAILED=0
for domain in "${DOMAINS[@]}"; do
  answer="$(dig +short +time=3 +tries=2 "$domain" | tr '\n' ' ' | xargs || true)"
  if [ -n "$answer" ]; then
    ok "$domain → $answer"
  else
    warn "$domain não resolveu pelo resolvedor local."
    FAILED=1
  fi
done

step "Validando HTTPS pelo domínio público"
for domain in "${DOMAINS[@]}"; do
  if code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -I "https://$domain")" && [ "$code" != "000" ]; then
    ok "https://$domain → HTTP $code"
  else
    warn "https://$domain não respondeu."
    FAILED=1
  fi
done

echo
if [ "$FAILED" = "0" ]; then
  echo -e "${GREEN}═══ DNS interno corrigido ═══${NC}"
  echo "Próximos passos da migração:"
  echo "  cd server && npm run migrate:verify"
  echo "  ./deploy.sh --cutover      # aplica as URLs de mídia (--apply-urls) e o cron"
  exit 0
fi

echo -e "${YELLOW}Ainda com pendência. Diagnóstico rápido:${NC}"
resolvectl status | sed -n '1,30p'
echo
echo "Se o resolvedor local continuar falhando, use o modo direto (sem stub):"
echo "  printf 'nameserver 1.1.1.1\\nnameserver 8.8.8.8\\noptions timeout:2 attempts:2\\n' > /etc/resolv.conf.direct"
echo "  systemctl disable --now systemd-resolved && cp /etc/resolv.conf.direct /etc/resolv.conf"
exit 1
