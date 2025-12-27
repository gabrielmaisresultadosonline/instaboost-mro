# Multi WhatsApp Connect

Sistema completo para gerenciar múltiplas conexões WhatsApp Web usando a biblioteca whatsapp-web.js.

## 📋 Pré-requisitos

- Node.js 18+ (recomendado: 20 LTS)
- NPM ou Yarn
- Navegador Chromium (instalado automaticamente pelo puppeteer)

### Para VPS Linux (Ubuntu/Debian):

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar dependências do Chromium/Puppeteer
sudo apt-get install -y \
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
    libgbm-dev
```

## 🚀 Instalação

1. **Copiar arquivos para a VPS:**
```bash
# Via SCP (do seu computador)
scp -r whatsapp-server/ usuario@sua-vps:/home/usuario/

# Ou via Git (se tiver repositório)
git clone seu-repositorio
cd whatsapp-server
```

2. **Instalar dependências:**
```bash
cd whatsapp-server
npm install
```

3. **Configurar variáveis de ambiente:**
```bash
cp .env.example .env
nano .env
```

Edite o arquivo `.env`:
```
PORT=3000
NODE_ENV=production
```

4. **Iniciar o servidor:**
```bash
# Modo desenvolvimento
npm run dev

# Modo produção
npm start
```

## 🔧 Configuração com PM2 (Recomendado para Produção)

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar aplicação
pm2 start server/index.js --name "whatsapp-multi"

# Configurar para iniciar no boot
pm2 startup
pm2 save

# Comandos úteis
pm2 logs whatsapp-multi    # Ver logs
pm2 restart whatsapp-multi # Reiniciar
pm2 stop whatsapp-multi    # Parar
pm2 status                 # Ver status
```

## 🌐 Configuração com Nginx (Proxy Reverso)

```nginx
# /etc/nginx/sites-available/whatsapp
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ativar configuração:
```bash
sudo ln -s /etc/nginx/sites-available/whatsapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 📱 API Endpoints

### Criar nova sessão
```
POST /api/create-session
Response: { success: true, sessionId: "session_xxx" }
```

### Listar sessões ativas
```
GET /api/active-sessions
Response: { sessions: [...] }
```

### Desconectar sessão
```
POST /api/disconnect-session
Body: { sessionId: "session_xxx" }
```

### Enviar mensagem
```
POST /api/send-message
Body: { 
    sessionId: "session_xxx",
    number: "5511999999999",
    message: "Olá!"
}
```

### Obter contatos
```
GET /api/contacts/:sessionId
```

## 🔌 WebSocket Events

### Cliente → Servidor
- `bind-session`: Vincular socket a uma sessão
- `get-sessions`: Solicitar lista de sessões

### Servidor → Cliente
- `qr-generated`: QR Code gerado (base64)
- `client-ready`: Cliente WhatsApp conectado
- `auth-failed`: Falha na autenticação
- `session-update`: Atualização de status
- `session-removed`: Sessão removida
- `message-received`: Mensagem recebida

## 📁 Estrutura de Arquivos

```
whatsapp-server/
├── server/
│   ├── index.js           # Servidor principal
│   └── .wwebjs_auth/      # Dados de autenticação (gerado automaticamente)
├── public/
│   ├── index.html         # Interface web
│   └── app.js             # JavaScript do frontend
├── package.json
├── .env
└── README.md
```

## ⚠️ Notas Importantes

1. **Sessões são persistentes**: As sessões ficam salvas na pasta `.wwebjs_auth/`

2. **Limite de conexões**: WhatsApp pode limitar conexões simultâneas

3. **Uso de recursos**: Cada sessão consome ~100-200MB de RAM

4. **Backup**: Faça backup regular da pasta `.wwebjs_auth/` para manter as sessões

## 🐛 Troubleshooting

### Erro: "Failed to launch the browser process"
```bash
# Instalar dependências adicionais
sudo apt-get install -y chromium-browser
```

### Erro de memória
```bash
# Aumentar memória swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### QR Code não aparece
- Verifique se a porta está aberta no firewall
- Verifique os logs: `pm2 logs whatsapp-multi`

## 📞 Suporte

Em caso de dúvidas, verifique os logs e a documentação do whatsapp-web.js:
https://wwebjs.dev/
