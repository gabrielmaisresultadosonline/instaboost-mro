#!/bin/bash

set -e

# Script de configuração do Servidor de Vídeo (HLS Transcoding)
# Uso: sudo ./setup-video-server.sh seu-dominio.com

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "Erro: Forneça o seu domínio. Ex: sudo ./setup-video-server.sh video.seudominio.com"
    exit 1
fi

echo "--- Iniciando configuração do Servidor de Vídeo para $DOMAIN ---"

# 1. Atualizar pacotes
sudo apt-get update
sudo apt-get install -y ffmpeg curl nodejs nginx certbot python3-certbot-nginx

# 2. Criar diretórios
sudo mkdir -p /var/www/video-server/videos/hls
sudo mkdir -p /var/www/video-server/uploads
sudo chown -R $USER:$USER /var/www/video-server

# 3. Criar o servidor Node.js (Bun seria melhor, mas Node é mais comum)
cat <<EOF > /var/www/video-server/package.json
{
  "name": "mro-video-server",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "fluent-ffmpeg": "^2.1.2"
  }
}
EOF

cat <<'EOF' > /var/www/video-server/server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
app.use(cors());
app.use(express.json());

const VIDEO_ROOT = path.join(__dirname, 'videos');
const HLS_ROOT = path.join(VIDEO_ROOT, 'hls');
const UPLOAD_ROOT = path.join(__dirname, 'uploads');

for (const dir of [VIDEO_ROOT, HLS_ROOT, UPLOAD_ROOT]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Servir arquivos estáticos (vídeos e HLS)
app.use('/videos', express.static(VIDEO_ROOT, {
    setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

app.get('/health', (_req, res) => {
    res.json({ success: true, service: 'video-server', status: 'online' });
});

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_ROOT),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ 
    storage,
    limits: { fileSize: 3 * 1024 * 1024 * 1024 } // 3GB
});

const jobs = {};

app.post('/api/video/upload', upload.single('video'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file' });

    const inputPath = req.file.path;
    const fileName = path.parse(req.file.filename).name;
    const outputDir = path.join(HLS_ROOT, fileName);
    
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const jobId = fileName;
    jobs[jobId] = { status: 'processing', progress: 0 };

    // Iniciar transcoding HLS em background
    ffmpeg(inputPath)
        .output(path.join(outputDir, 'master.m3u8'))
        .format('hls')
        .addOption('-hls_time', 10)
        .addOption('-hls_list_size', 0)
        .addOption('-hls_segment_filename', path.join(outputDir, 'seg_%d.ts'))
        .on('progress', (progress) => {
            if (jobs[jobId]) jobs[jobId].progress = Math.round(progress.percent || 0);
        })
        .on('end', () => {
            if (jobs[jobId]) {
                jobs[jobId].status = 'completed';
                jobs[jobId].progress = 100;
            }
            fs.unlinkSync(inputPath); // Remove original upload
        })
        .on('error', (err) => {
            console.error('FFmpeg error:', err);
            if (jobs[jobId]) jobs[jobId].status = 'error';
        })
        .run();

    res.json({
        success: true,
        job_id: jobId,
        video_url: '/videos/uploads/' + req.file.filename,
        hls_url: '/videos/hls/' + fileName + '/master.m3u8'
    });
});

app.get('/api/video/status/:id', (req, res) => {
    const job = jobs[req.params.id];
    if (!job) return res.status(404).json({ error: 'Not found' });
    res.json(job);
});

app.get('/api/video/list', (req, res) => {
    if (!fs.existsSync(HLS_ROOT)) return res.json({ success: true, files: [] });
    
    const files = fs.readdirSync(HLS_ROOT)
        .filter(name => fs.existsSync(path.join(HLS_ROOT, name, 'master.m3u8')))
        .map(name => {
            const stats = fs.statSync(path.join(HLS_ROOT, name));
            return {
                name,
                url: '/videos/hls/' + name + '/master.m3u8',
                hls_url: '/videos/hls/' + name + '/master.m3u8',
                size: 0, // HLS é composto por vários arquivos
                created: stats.birthtime
            };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created));

    res.json({ success: true, files });
});

app.delete('/api/video/:name', (req, res) => {
    const name = req.params.name;
    const dir = path.join(HLS_ROOT, name);
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true });
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, '0.0.0.0', () => console.log('Video server running on port ' + PORT));
EOF

# 4. Instalar dependências Node
cd /var/www/video-server
npm install

# 5. Configurar Nginx + SSL para o domínio do servidor de vídeo
sudo tee /etc/nginx/sites-available/video-server > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 3G;
    client_body_timeout 7200s;
    proxy_read_timeout 7200s;
    proxy_send_timeout 7200s;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
        if (\$request_method = OPTIONS) { return 204; }
    }

    location /videos/ {
        alias /var/www/video-server/videos/;
        add_header Access-Control-Allow-Origin * always;
        add_header Cross-Origin-Resource-Policy cross-origin always;
        autoindex on;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/video-server /etc/nginx/sites-enabled/video-server
sudo nginx -t && sudo systemctl restart nginx

echo "🔐 Emitindo/renovando SSL correto para $DOMAIN..."
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" --redirect || {
    echo "⚠️ Certbot não conseguiu emitir o SSL automaticamente. Verifique se o DNS de $DOMAIN aponta para este VPS e rode: sudo certbot --nginx -d $DOMAIN"
}
sudo nginx -t && sudo systemctl reload nginx

# 6. Configurar PM2 para manter o servidor rodando
sudo npm install -g pm2
pm2 delete video-server >/dev/null 2>&1 || true
pm2 start server.js --name "video-server" --update-env
pm2 save
pm2 startup

echo "--- Configuração concluída! ---"
echo "Acesse seu servidor em: https://$DOMAIN"
echo "Certifique-se de apontar o DNS do seu domínio para o IP deste servidor."
