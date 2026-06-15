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
    limits: { fileSize: 5 * 1024 * 1024 * 1024 } // 5GB
});

const jobs = {};

const safeJob = (job) => ({
    id: job.id,
    status: job.status,
    progress: Math.max(0, Math.min(100, Math.round(job.progress || 0))),
    error: job.error || null,
    hls_url: job.hls_url || ('/videos/hls/' + job.id + '/master.m3u8'),
    created_at: job.created_at,
    updated_at: job.updated_at
});

const readJob = (jobId) => {
    const outputDir = path.join(HLS_ROOT, jobId);
    const jobFile = path.join(outputDir, 'job.json');
    const masterFile = path.join(outputDir, 'master.m3u8');

    if (jobs[jobId]) return safeJob(jobs[jobId]);

    let fromDisk = null;
    if (fs.existsSync(jobFile)) {
        try { fromDisk = JSON.parse(fs.readFileSync(jobFile, 'utf8')); } catch (e) {}
    }

    if (fs.existsSync(masterFile)) {
        return safeJob({ id: jobId, ...(fromDisk || {}), status: 'completed', progress: 100, hls_url: '/videos/hls/' + jobId + '/master.m3u8' });
    }

    if (fromDisk) return safeJob({ id: jobId, ...fromDisk });
    if (fs.existsSync(outputDir)) return safeJob({ id: jobId, status: 'processing', progress: 0, hls_url: '/videos/hls/' + jobId + '/master.m3u8' });
    return null;
};

const writeJob = (jobId, patch) => {
    const now = new Date().toISOString();
    const existing = jobs[jobId] || readJob(jobId) || {};
    const outputDir = path.join(HLS_ROOT, jobId);
    const next = {
        id: jobId,
        created_at: existing.created_at || now,
        hls_url: '/videos/hls/' + jobId + '/master.m3u8',
        ...existing,
        ...patch,
        updated_at: now
    };
    jobs[jobId] = next;
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'job.json'), JSON.stringify(safeJob(next), null, 2));
    return next;
};

const secondsFromTimemark = (timemark) => {
    const parts = String(timemark || '').split(':').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return 0;
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
};

const appendLog = (jobId, line) => {
    try {
        const outputDir = path.join(HLS_ROOT, jobId);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const logFile = path.join(outputDir, 'transcode.log');
        const stamp = new Date().toISOString();
        fs.appendFileSync(logFile, `[${stamp}] ${line}\n`);
        console.log(`[${jobId}] ${line}`);
    } catch (e) { console.error('log err', e); }
};

const startTranscoding = (jobId, inputPath, outputDir) => {
    writeJob(jobId, { status: 'processing', progress: 1 });
    try {
        const sz = fs.statSync(inputPath).size;
        appendLog(jobId, `START transcoding | input=${inputPath} | size=${(sz/1024/1024).toFixed(2)}MB`);
    } catch (e) { appendLog(jobId, `START transcoding | stat error: ${e.message}`); }

    ffmpeg.ffprobe(inputPath, (probeErr, metadata) => {
        if (probeErr) appendLog(jobId, `FFPROBE error: ${probeErr.message}`);
        const duration = Number(metadata?.format?.duration || 0);
        const hasAudio = !probeErr && Array.isArray(metadata?.streams) && metadata.streams.some((s) => s.codec_type === 'audio');
        appendLog(jobId, `PROBE ok | duration=${duration.toFixed(1)}s | hasAudio=${hasAudio}`);

        const renditions = [
            { name: '240p',  w: 426,  h: 240,  vb: '400k',  maxrate: '450k',  bufsize: '600k',  ab: '64k'  },
            { name: '480p',  w: 854,  h: 480,  vb: '1000k', maxrate: '1100k', bufsize: '1500k', ab: '96k'  },
            { name: '720p',  w: 1280, h: 720,  vb: '2500k', maxrate: '2750k', bufsize: '3500k', ab: '128k' },
            { name: '1080p', w: 1920, h: 1080, vb: '5000k', maxrate: '5500k', bufsize: '7000k', ab: '192k' }
        ];

        const varStreamMap = renditions.map((_, i) => hasAudio ? `v:${i},a:${i}` : `v:${i}`).join(' ');
        const args = [];
        renditions.forEach((r, i) => {
            args.push('-map', '0:v:0');
            if (hasAudio) args.push('-map', '0:a:0');
            args.push(
                `-c:v:${i}`, 'libx264', '-preset', 'veryfast', `-profile:v:${i}`, 'main',
                `-b:v:${i}`, r.vb, `-maxrate:v:${i}`, r.maxrate, `-bufsize:v:${i}`, r.bufsize,
                `-filter:v:${i}`, `scale=w=${r.w}:h=${r.h}:force_original_aspect_ratio=decrease`,
                `-g:v:${i}`, '60', `-keyint_min:v:${i}`, '60', `-sc_threshold:v:${i}`, '0'
            );
            if (hasAudio) args.push(`-c:a:${i}`, 'aac', `-b:a:${i}`, r.ab, '-ac', '2');
        });

        renditions.forEach((_, i) => {
            const sub = path.join(outputDir, `stream_${i}`);
            if (!fs.existsSync(sub)) fs.mkdirSync(sub, { recursive: true });
        });

        ffmpeg(inputPath)
            .addOptions(args)
            .addOptions([
                '-f', 'hls',
                '-hls_time', '6',
                '-hls_playlist_type', 'vod',
                '-hls_list_size', '0',
                '-hls_segment_filename', path.join(outputDir, 'stream_%v/seg_%d.ts'),
                '-master_pl_name', 'master.m3u8',
                '-var_stream_map', varStreamMap
            ])
            .output(path.join(outputDir, 'stream_%v.m3u8'))
            .on('start', (cmd) => {
                appendLog(jobId, `FFMPEG SPAWN: ${String(cmd).substring(0, 800)}`);
            })
            .on('codecData', (data) => {
                appendLog(jobId, `CODEC: video=${data.video} | audio=${data.audio} | duration=${data.duration}`);
            })
            .on('stderr', (line) => {
                if (/error|failed|Invalid|Unable|No such|Permission/i.test(line)) appendLog(jobId, `STDERR: ${line}`);
            })
            .on('progress', (progress) => {
                const byPercent = Number(progress.percent || 0);
                const byTime = duration > 0 ? (secondsFromTimemark(progress.timemark) / duration) * 100 : 0;
                const computed = Math.max(byPercent, byTime, 1);
                writeJob(jobId, { status: 'processing', progress: computed });
                appendLog(jobId, `PROGRESS ${computed.toFixed(1)}% | timemark=${progress.timemark} | fps=${progress.currentFps || 0} | kbps=${progress.currentKbps || 0} | frames=${progress.frames || 0}`);
            })
            .on('end', () => {
                appendLog(jobId, `END ok — transcoding completed`);
                writeJob(jobId, { status: 'completed', progress: 100 });
                try { fs.unlinkSync(inputPath); } catch (e) {}
            })
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
                appendLog(jobId, `FATAL ERROR: ${err.message || String(err)}`);
                writeJob(jobId, { status: 'error', progress: readJob(jobId)?.progress || 0, error: err.message || String(err) });
            })
            .run();
    });
};

app.post('/api/video/upload', upload.single('video'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file' });

    const inputPath = req.file.path;
    const fileName = path.parse(req.file.filename).name;
    const outputDir = path.join(HLS_ROOT, fileName);
    
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const jobId = fileName;
    writeJob(jobId, { status: 'queued', progress: 0 });

    res.json({
        success: true,
        job_id: jobId,
        video_url: '/videos/uploads/' + req.file.filename,
        hls_url: '/videos/hls/' + fileName + '/master.m3u8'
    });

    setImmediate(() => startTranscoding(jobId, inputPath, outputDir));
});

app.get('/api/video/status/:id', (req, res) => {
    const job = readJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Not found' });
    res.json(job);
});

app.get('/api/video/logs/:id', (req, res) => {
    const logFile = path.join(HLS_ROOT, req.params.id, 'transcode.log');
    if (!fs.existsSync(logFile)) return res.json({ success: true, logs: [], note: 'no log yet' });
    try {
        const content = fs.readFileSync(logFile, 'utf8');
        const lines = content.trim().split('\n');
        const tail = lines.slice(-200);
        res.json({ success: true, logs: tail, total: lines.length });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/video/list', (req, res) => {
    if (!fs.existsSync(HLS_ROOT)) return res.json({ success: true, files: [] });
    
    const names = new Set([
        ...fs.readdirSync(HLS_ROOT).filter(name => fs.statSync(path.join(HLS_ROOT, name)).isDirectory()),
        ...Object.keys(jobs)
    ]);

    const files = [...names]
        .map(name => {
            const stats = fs.statSync(path.join(HLS_ROOT, name));
            const job = readJob(name) || { status: 'processing', progress: 0 };
            const ready = fs.existsSync(path.join(HLS_ROOT, name, 'master.m3u8'));
            return {
                name,
                url: '/videos/hls/' + name + '/master.m3u8',
                hls_url: '/videos/hls/' + name + '/master.m3u8',
                size: 0, // HLS é composto por vários arquivos
                created: stats.birthtime,
                status: ready ? 'completed' : job.status,
                progress: ready ? 100 : (job.progress || 0),
                ready,
                can_use: ready
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

    # Uploads grandes (até 5GB) e timeouts longos para 800MB+ em conexões lentas
    client_max_body_size 5G;
    client_body_buffer_size 1m;
    client_body_timeout 7200s;
    client_header_timeout 7200s;
    send_timeout 7200s;
    keepalive_timeout 7200s;

    proxy_connect_timeout 7200s;
    proxy_read_timeout 7200s;
    proxy_send_timeout 7200s;
    proxy_request_buffering off;   # streaming upload (evita travar em 80%)
    proxy_buffering off;
    proxy_http_version 1.1;

    location / {
        # NÃO adicionar CORS aqui — o Express (cors()) já envia.
        # Duplicar gera "Access-Control-Allow-Origin: *, *" e quebra o browser.
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /videos/ {
        alias /var/www/video-server/videos/;
        add_header Access-Control-Allow-Origin * always;
        add_header Cross-Origin-Resource-Policy cross-origin always;
        add_header Cache-Control "public, max-age=31536000" always;
        autoindex off;
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
