#!/bin/bash

# =============================================================
# Script de Atualização - I.A MRO
# Executa pull, rebuild e restart
# =============================================================

set -e

APP_DIR="/var/www/ia-mro"

echo "🔄 Atualizando I.A MRO..."

cd $APP_DIR

echo "📥 Baixando atualizações..."
git pull origin main

echo "📦 Instalando dependências..."
npm install

echo "🔨 Fazendo build..."
npm run build

echo "✅ Atualização concluída!"
echo "🌐 Site atualizado automaticamente (arquivos estáticos)"
