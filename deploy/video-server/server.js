const express = require('express');
const multer = require('multer');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.VIDEO_PORT || 3001;
const VIDEOS_DIR = process.env.VIDEOS_DIR || '/var/www/ia-mro/videos';
const HLS_DIR = path.join(VIDEOS_DIR, 'hls');

// Ensure directories exist
fs.mkdirSync(VIDEOS_DIR, { recursive: true });
fs.mkdirSync(HLS_DIR, { recursive: true });

// Track transcoding jobs
const transcodingJobs = {};

const storage = multer.diskStorage({
  destination: VIDEOS_DIR,
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 * 1024 }, // 3GB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de vídeo são aceitos'));
    }
  }
});

// Upload endpoint
app.post('/api/video/upload', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const inputPath = req.file.path;
  const baseName = path.parse(req.file.filename).name;
  const outputDir = path.join(HLS_DIR, baseName);
  const directUrl = `/videos/${req.file.filename}`;
  const hlsUrl = `/videos/hls/${baseName}/master.m3u8`;

  fs.mkdirSync(outputDir, { recursive: true });

  // Return direct URL immediately so live can start
  res.json({
    success: true,
    video_url: directUrl,
    hls_url: hlsUrl,
    job_id: baseName,
    message: 'Upload concluído. Transcoding HLS iniciado em background.'
  });

  // Start HLS transcoding in background
  transcodingJobs[baseName] = { status: 'processing', progress: 0 };
  transcodeToHLS(inputPath, outputDir, baseName);
});

// Check transcoding status
app.get('/api/video/status/:jobId', (req, res) => {
  const job = transcodingJobs[req.params.jobId];
  if (!job) {
    // Check if HLS files exist
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
    // Get video info first
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

    // Transcode each quality sequentially
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

    // Create master playlist
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
