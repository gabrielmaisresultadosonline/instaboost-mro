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

const publicHlsUrl = (jobId) => '/videos/hls/' + encodeURIComponent(jobId) + '/master.m3u8';

const sanitizeBaseName = (name) => {
    const base = path.parse(name || 'video').name;
    return base
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 140) || 'video';
};

const safeJob = (job) => ({
    id: job.id,
    status: job.status,
    progress: Math.max(0, Math.min(100, Math.round(job.progress || 0))),
    error: job.error || null,
    hls_url: job.hls_url || publicHlsUrl(job.id),
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
        return safeJob({ id: jobId, ...(fromDisk || {}), status: 'completed', progress: 100, hls_url: publicHlsUrl(jobId) });
    }

    if (fromDisk) return safeJob({ id: jobId, ...fromDisk });
    if (fs.existsSync(outputDir)) return safeJob({ id: jobId, status: 'processing', progress: 0, hls_url: publicHlsUrl(jobId) });
    return null;
};

const writeJob = (jobId, patch) => {
    const now = new Date().toISOString();
    const existing = jobs[jobId] || readJob(jobId) || {};
    const outputDir = path.join(HLS_ROOT, jobId);
    const next = {
        id: jobId,
        created_at: existing.created_at || now,
        hls_url: publicHlsUrl(jobId),
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

        const videoStream = !probeErr && Array.isArray(metadata?.streams) ? metadata.streams.find((s) => s.codec_type === 'video') : null;
        const sourceHeight = Number(videoStream?.height || 1080);
        const allRenditions = [
            { name: '240p',  w: 426,  h: 240,  vb: '400k',  maxrate: '450k',  bufsize: '600k',  ab: '64k'  },
            { name: '480p',  w: 854,  h: 480,  vb: '1000k', maxrate: '1100k', bufsize: '1500k', ab: '96k'  },
            { name: '720p',  w: 1280, h: 720,  vb: '2500k', maxrate: '2750k', bufsize: '3500k', ab: '128k' },
            { name: '1080p', w: 1920, h: 1080, vb: '5000k', maxrate: '5500k', bufsize: '7000k', ab: '192k' }
        ];
        const renditions = allRenditions.filter((r) => r.h <= sourceHeight + 16);
        if (!renditions.length) renditions.push(allRenditions[0]);
        appendLog(jobId, `RENDITIONS: sourceHeight=${sourceHeight} | ${renditions.map((r) => r.name).join(', ')}`);

        const bandwidth = (value) => Number(String(value).replace('k', '')) * 1000;
        const normalizePlaylist = (r) => {
            const playlistFile = path.join(outputDir, `${r.name}.m3u8`);
            if (!fs.existsSync(playlistFile)) return;
            const fixed = fs.readFileSync(playlistFile, 'utf8').split('\n').map((line) => {
                const clean = line.trim();
                if (clean && !clean.startsWith('#') && clean.includes('.ts')) return `${r.name}/${path.basename(clean)}`;
                return line;
            }).join('\n');
            fs.writeFileSync(playlistFile, fixed);
        };
        const writeMaster = () => {
            const lines = ['#EXTM3U', '#EXT-X-VERSION:3', '#EXT-X-INDEPENDENT-SEGMENTS'];
            renditions.forEach((r) => {
                lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth(r.maxrate)},AVERAGE-BANDWIDTH=${bandwidth(r.vb)},RESOLUTION=${r.w}x${r.h}`);
                lines.push(`${r.name}.m3u8`);
            });
            fs.writeFileSync(path.join(outputDir, 'master.m3u8'), lines.join('\n') + '\n');
        };

        renditions.forEach((r) => {
            const sub = path.join(outputDir, r.name);
            if (!fs.existsSync(sub)) fs.mkdirSync(sub, { recursive: true });
        });

        const runRendition = (index = 0) => {
            if (index >= renditions.length) {
                writeMaster();
                appendLog(jobId, `END ok — all renditions completed and master.m3u8 created`);
                writeJob(jobId, { status: 'completed', progress: 100 });
                try { fs.unlinkSync(inputPath); } catch (e) {}
                return;
            }

            const r = renditions[index];
            const sub = path.join(outputDir, r.name);
            const outputPlaylist = path.join(outputDir, `${r.name}.m3u8`);
            const segmentPattern = path.join(sub, 'seg_%05d.ts');
            appendLog(jobId, `RENDITION START ${r.name} (${index + 1}/${renditions.length})`);

            const opts = [
                '-map', '0:v:0',
                '-c:v', 'libx264', '-preset', 'veryfast', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-threads', '2',
                '-b:v', r.vb, '-maxrate', r.maxrate, '-bufsize', r.bufsize,
                '-vf', `scale=w=${r.w}:h=${r.h}:force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p`,
                '-g', '60', '-keyint_min', '60', '-sc_threshold', '0',
                '-f', 'hls', '-hls_time', '6', '-hls_playlist_type', 'vod', '-hls_list_size', '0',
                '-hls_segment_filename', segmentPattern
            ];
            if (hasAudio) opts.splice(2, 0, '-map', '0:a:0');
            if (hasAudio) opts.splice(opts.indexOf('-f'), 0, '-c:a', 'aac', '-b:a', r.ab, '-ac', '2');
            else opts.splice(opts.indexOf('-f'), 0, '-an');

            ffmpeg(inputPath)
                .outputOptions(opts)
                .output(outputPlaylist)
                .on('start', (cmd) => appendLog(jobId, `FFMPEG SPAWN ${r.name}: ${String(cmd).substring(0, 900)}`))
                .on('codecData', (data) => appendLog(jobId, `CODEC ${r.name}: video=${data.video} | audio=${data.audio} | duration=${data.duration}`))
                .on('stderr', (line) => { if (/error|failed|Invalid|Unable|No such|Permission|Conversion failed/i.test(line)) appendLog(jobId, `STDERR ${r.name}: ${line}`); })
                .on('progress', (progress) => {
                    const byPercent = Number(progress.percent || 0);
                    const byTime = duration > 0 ? (secondsFromTimemark(progress.timemark) / duration) * 100 : 0;
                    const single = Math.max(byPercent, byTime, 0);
                    const computed = Math.max(1, Math.min(99, ((index + (single / 100)) / renditions.length) * 100));
                    writeJob(jobId, { status: 'processing', progress: computed });
                    appendLog(jobId, `PROGRESS ${computed.toFixed(1)}% | ${r.name}=${single.toFixed(1)}% | timemark=${progress.timemark} | fps=${progress.currentFps || 0} | kbps=${progress.currentKbps || 0} | frames=${progress.frames || 0}`);
                })
                .on('end', () => {
                    normalizePlaylist(r);
                    appendLog(jobId, `RENDITION END ${r.name}`);
                    runRendition(index + 1);
                })
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    appendLog(jobId, `FATAL ERROR ${r.name}: ${err.message || String(err)}`);
                    writeJob(jobId, { status: 'error', progress: readJob(jobId)?.progress || 0, error: `${r.name}: ${err.message || String(err)}` });
                })
                .run();
        };

        runRendition(0);
    });
};

app.post('/api/video/upload', upload.single('video'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file' });

    const inputPath = req.file.path;
    const parsed = path.parse(req.file.originalname || req.file.filename);
    const fileName = Date.now() + '-' + sanitizeBaseName(parsed.name);
    const outputDir = path.join(HLS_ROOT, fileName);
    
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const jobId = fileName;
    writeJob(jobId, { status: 'queued', progress: 0 });

    res.json({
        success: true,
        job_id: jobId,
        video_url: '',
        hls_url: publicHlsUrl(fileName)
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
                url: publicHlsUrl(name),
                hls_url: publicHlsUrl(name),
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
