const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const Busboy = require('busboy');

const app = express();
app.use(cors());
app.use(express.json());

// Increase timeout for large uploads (2 hours)
app.use((req, res, next) => {
  req.setTimeout(7200000);
  res.setTimeout(7200000);
  next();
});

const PORT = process.env.VIDEO_PORT || 3002;
const VIDEOS_DIR = process.env.VIDEOS_DIR || '/var/www/ia-mro/videos';
const HLS_DIR = path.join(VIDEOS_DIR, 'hls');

fs.mkdirSync(VIDEOS_DIR, { recursive: true });
fs.mkdirSync(HLS_DIR, { recursive: true });

const transcodingJobs = {};

// Prevent server from crashing on unhandled errors
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message);
  console.error(err.stack);
});
process.on('unhandledRejection', (err) => {
  console.error('[FATAL] Unhandled Rejection:', err);
});

// Upload endpoint - streaming directly to disk (no memory buffering)
app.post('/api/video/upload', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  console.log('[Upload] Starting streaming upload...');

  let busboy;
  try {
    busboy = Busboy({ 
      headers: req.headers,
      limits: { fileSize: 3 * 1024 * 1024 * 1024 } // 3GB
    });
  } catch (err) {
    console.error('[Upload] Busboy init error:', err.message);
    return res.status(400).json({ error: 'Request inválido: ' + err.message });
  }

  let savedFile = null;
  let fileWritten = false;

  busboy.on('file', (fieldname, file, info) => {
    const { filename, mimeType } = info;
    console.log(`[Upload] Receiving file: ${filename} (${mimeType})`);

    if (!mimeType.startsWith('video/')) {
      file.resume(); // drain the stream
      return res.status(400).json({ error: 'Apenas arquivos de vídeo são aceitos' });
    }

    const safeName = (filename || 'video.mp4').replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalName = `${Date.now()}-${safeName}`;
    const filePath = path.join(VIDEOS_DIR, finalName);

    savedFile = { filename: finalName, path: filePath };

    const writeStream = fs.createWriteStream(filePath);
    let bytesReceived = 0;

    file.on('data', (chunk) => {
      bytesReceived += chunk.length;
      // Log progress every 100MB
      if (bytesReceived % (100 * 1024 * 1024) < chunk.length) {
        const mb = (bytesReceived / (1024 * 1024)).toFixed(1);
        console.log(`[Upload] ${finalName}: ${mb}MB received`);
      }
    });

    file.pipe(writeStream);

    writeStream.on('finish', () => {
      fileWritten = true;
      const mb = (bytesReceived / (1024 * 1024)).toFixed(1);
      console.log(`[Upload] File saved: ${finalName} (${mb}MB)`);
    });

    writeStream.on('error', (err) => {
      console.error('[Upload] Write error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erro ao salvar arquivo: ' + err.message });
      }
    });

    file.on('limit', () => {
      console.error('[Upload] File size limit exceeded');
      writeStream.destroy();
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      if (!res.headersSent) {
        res.status(413).json({ error: 'Arquivo excede o limite de 3GB' });
      }
    });
  });

  busboy.on('finish', () => {
    if (res.headersSent) return;

    if (!savedFile || !fileWritten) {
      // Wait a bit for writeStream to finish
      const checkInterval = setInterval(() => {
        if (fileWritten || !savedFile) {
          clearInterval(checkInterval);
          sendResponse();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkInterval);
        sendResponse();
      }, 5000);
    } else {
      sendResponse();
    }

    function sendResponse() {
      if (res.headersSent) return;
      if (!savedFile) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const baseName = path.parse(savedFile.filename).name;
      const outputDir = path.join(HLS_DIR, baseName);
      const directUrl = `/videos/${savedFile.filename}`;
      const hlsUrl = `/videos/hls/${baseName}/master.m3u8`;

      fs.mkdirSync(outputDir, { recursive: true });

      console.log(`[Upload] Complete! Responding with URLs...`);
      res.json({
        success: true,
        video_url: directUrl,
        hls_url: hlsUrl,
        job_id: baseName,
        message: 'Upload concluído. Transcoding HLS iniciado em background.'
      });

      transcodingJobs[baseName] = { status: 'processing', progress: 0 };
      transcodeToHLS(savedFile.path, outputDir, baseName);
    }
  });

  busboy.on('error', (err) => {
    console.error('[Upload] Busboy error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro no upload: ' + err.message });
    }
  });

  req.pipe(busboy);
});

// Check transcoding status
app.get('/api/video/status/:jobId', (req, res) => {
  const job = transcodingJobs[req.params.jobId];
  if (!job) {
    const masterPath = path.join(HLS_DIR, req.params.jobId, 'master.m3u8');
    if (fs.existsSync(masterPath)) {
      return res.json({ status: 'completed', progress: 100 });
    }
    return res.json({ status: 'unknown' });
  }
  res.json(job);
});

// List uploaded videos
app.get('/api/video/list', (req, res) => {
  try {
    const files = fs.readdirSync(VIDEOS_DIR)
      .filter(f => !fs.statSync(path.join(VIDEOS_DIR, f)).isDirectory())
      .filter(f => /\.(mp4|webm|mkv|avi|mov)$/i.test(f))
      .map(f => ({
        name: f,
        url: `/videos/${f}`,
        size: fs.statSync(path.join(VIDEOS_DIR, f)).size,
        created: fs.statSync(path.join(VIDEOS_DIR, f)).birthtime,
      }));
    res.json({ success: true, files });
  } catch (e) {
    res.json({ success: true, files: [] });
  }
});

// Delete video
app.delete('/api/video/:filename', (req, res) => {
  const filePath = path.join(VIDEOS_DIR, req.params.filename);
  const baseName = path.parse(req.params.filename).name;
  const hlsDir = path.join(HLS_DIR, baseName);

  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(hlsDir)) fs.rmSync(hlsDir, { recursive: true });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function transcodeToHLS(inputPath, outputDir, jobId) {
  console.log(`[HLS] Starting transcoding for ${jobId}`);

  try {
    const probeCmd = `ffprobe -v quiet -print_format json -show_streams "${inputPath}"`;
    const videoInfo = await execPromise(probeCmd);
    const streams = JSON.parse(videoInfo);
    const videoStream = streams.streams.find(s => s.codec_type === 'video');
    const height = videoStream ? parseInt(videoStream.height) : 1080;

    const qualities = [];
    if (height >= 480) qualities.push({ h: 480, br: '800k', maxrate: '856k', bufsize: '1200k', crf: 28 });
    if (height >= 720) qualities.push({ h: 720, br: '2800k', maxrate: '2996k', bufsize: '4200k', crf: 24 });
    if (height >= 1080) qualities.push({ h: 1080, br: '5000k', maxrate: '5350k', bufsize: '7500k', crf: 22 });

    if (qualities.length === 0) {
      qualities.push({ h: 480, br: '800k', maxrate: '856k', bufsize: '1200k', crf: 28 });
    }

    for (let i = 0; i < qualities.length; i++) {
      const q = qualities[i];
      const progress = Math.round(((i) / qualities.length) * 100);
      transcodingJobs[jobId] = { status: 'processing', progress, currentQuality: `${q.h}p` };

      console.log(`[HLS] Transcoding ${q.h}p...`);

      const cmd = [
        'ffmpeg', '-i', `"${inputPath}"`,
        '-vf', `scale=-2:${q.h}`,
        '-c:v', 'libx264',
        '-crf', q.crf,
        '-preset', 'fast',
        '-c:a', 'aac', '-b:a', q.h >= 1080 ? '192k' : '128k',
        '-f', 'hls',
        '-hls_time', '6',
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', `"${outputDir}/${q.h}p_%03d.ts"`,
        `"${outputDir}/${q.h}p.m3u8"`
      ].join(' ');

      await execPromise(cmd);
      console.log(`[HLS] ${q.h}p done!`);
    }

    let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n';
    for (const q of qualities) {
      const bandwidth = parseInt(q.br) * 1000;
      const resolution = q.h === 480 ? '854x480' : q.h === 720 ? '1280x720' : '1920x1080';
      masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution}\n${q.h}p.m3u8\n`;
    }

    fs.writeFileSync(path.join(outputDir, 'master.m3u8'), masterPlaylist);
    transcodingJobs[jobId] = { status: 'completed', progress: 100 };
    console.log(`[HLS] Transcoding complete for ${jobId}`);

  } catch (error) {
    console.error(`[HLS] Transcoding error for ${jobId}:`, error);
    transcodingJobs[jobId] = { status: 'error', error: error.message };
  }
}

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

app.listen(PORT, () => {
  console.log(`Video server running on port ${PORT}`);
  console.log(`Videos directory: ${VIDEOS_DIR}`);
  console.log(`HLS directory: ${HLS_DIR}`);
});
