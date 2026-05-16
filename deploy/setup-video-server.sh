#!/bin/bash

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
sudo apt-get install -y ffmpeg curl nodejs npm nginx

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

cat <<EOF > /var/www/video-server/server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (vídeos e HLS)
app.use('/videos', express.static(path.join(__dirname, 'videos')));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ 
    storage,
    limits: { fileSize: 3 * 1024 * 1024 * 1024 } // 3GB
});

const jobs = {};

app.post('/api/video/upload', upload.single('video'), (req, file) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file' });

    const inputPath = req.file.path;
    const fileName = path.parse(req.file.filename).name;
    const outputDir = path.join(__dirname, 'videos', 'hls', fileName);
    
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
    const hlsDir = path.join(__dirname, 'videos', 'hls');
    if (!fs.existsSync(hlsDir)) return res.json({ success: true, files: [] });
    
    const dirs = fs.readdirSync(hlsDir);
    const files = dirs.map(name => {
        const stats = fs.statSync(path.join(hlsDir, name));
        return {
            name,
            url: '/videos/hls/' + name + '/master.m3u8',
            size: 0, // HLS is many files, size is complex
            created: stats.birthtime
        };
    });
    res.json({ success: true, files });
});

app.delete('/api/video/:name', (req, res) => {
    const name = req.params.name;
    const dir = path.join(__dirname, 'videos', 'hls', name);
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true });
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

const PORT = 3001;
app.listen(PORT, () => console.log('Video server running on port ' + PORT));
EOF

# 4. Instalar dependências Node
cd /var/www/video-server
npm install

# 5. Configurar Nginx
sudo cat <<EOF > /etc/nginx/sites-available/video-server
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Aumentar limites de upload
        client_max_body_size 3G;
    }

    location /videos/ {
        alias /var/www/video-server/videos/;
        add_header Access-Control-Allow-Origin *;
        autoindex on;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/video-server /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# 6. Configurar PM2 para manter o servidor rodando
sudo npm install -g pm2
pm2 start server.js --name "video-server"
pm2 save
pm2 startup

echo "--- Configuração concluída! ---"
echo "Acesse seu servidor em: http://$DOMAIN"
echo "Certifique-se de apontar o DNS do seu domínio para o IP deste servidor."
