import express from 'express';
import cors from 'cors';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * VPS WhatsApp Bridge - Audio Transcoder & Sender (Professional Version)
 * 
 * Requisitos:
 * 1. Node.js (v18+)
 * 2. FFmpeg (sudo apt install ffmpeg)
 * 3. Dependências: npm install express axios fluent-ffmpeg form-data uuid
 */

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TEMP_DIR = path.join(__dirname, 'temp');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'online', service: 'WhatsApp Audio Bridge', ffmpeg: 'ready' });
});

app.post('/send-voice', async (req, res) => {
  const { to, audioUrl, metaToken, phoneId } = req.body;

  if (!to || !audioUrl) {
    return res.status(400).json({ error: 'Parâmetros "to" e "audioUrl" são obrigatórios' });
  }

  // Usar token passado no body ou env
  const token = metaToken || process.env.META_ACCESS_TOKEN;
  const phone = phoneId || process.env.PHONE_NUMBER_ID;

  if (!token || !phone) {
    return res.status(400).json({ error: 'Meta Token ou Phone ID não configurados no VPS' });
  }

  const requestId = uuidv4();
  const inputPath = path.join(TEMP_DIR, `${requestId}_input`);
  const outputPath = path.join(TEMP_DIR, `${requestId}_voice.ogg`);

  try {
    console.log(`\n[${new Date().toISOString()}] [${requestId}] 🚀 Novo pedido de áudio para: ${to}`);
    console.log(`[${requestId}] 📥 Baixando: ${audioUrl}`);

    // 1. Baixar o áudio
    const response = await axios({
      method: 'get',
      url: audioUrl,
      responseType: 'stream',
      timeout: 10000
    });

    const writer = fs.createWriteStream(inputPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // 2. Transcodificar Professionalmente (OGG Opus)
    console.log(`[${requestId}] ⚙️ Transcodificando para OGG Opus...`);
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('ogg')
        .audioCodec('libopus')
        .audioChannels(1)
        .audioFrequency(16000)
        .on('start', (cmd) => console.log(`[${requestId}] Comando FFmpeg: ${cmd}`))
        .on('end', () => {
          console.log(`[${requestId}] ✅ Transcodificação concluída.`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`[${requestId}] ❌ Erro FFmpeg:`, err);
          reject(err);
        })
        .save(outputPath);
    });

    // 3. Upload para Meta
    console.log(`[${requestId}] 📤 Fazendo upload para a Meta...`);
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', 'audio');
    form.append('file', fs.createReadStream(outputPath), {
      filename: 'voice.ogg',
      contentType: 'audio/ogg; codecs=opus'
    });

    const uploadRes = await axios.post(
      `https://graph.facebook.com/v20.0/${phone}/media`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const mediaId = uploadRes.data.id;
    console.log(`[${requestId}] 🆔 Media ID: ${mediaId}`);

    // 4. Enviar PTT
    console.log(`[${requestId}] 💬 Enviando como mensagem de voz (PTT)...`);
    const sendRes = await axios.post(
      `https://graph.facebook.com/v20.0/${phone}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'audio',
        audio: {
          id: mediaId,
          voice: true
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const messageId = sendRes.data.messages[0].id;
    console.log(`[${requestId}] ✨ Sucesso! Message ID: ${messageId}`);
    
    res.json({ success: true, messageId, mediaId });

  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    console.error(`[${requestId}] ❌ ERRO:`, JSON.stringify(errorMsg, null, 2));
    res.status(500).json({ 
      error: 'Falha no processamento do áudio', 
      details: errorMsg 
    });
  } finally {
    // Cleanup
    setTimeout(() => {
      [inputPath, outputPath].forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlink(file, (err) => {
            if (err) console.error(`[${requestId}] Erro ao deletar temp:`, err);
          });
        }
      });
    }, 5000); // Wait 5s before deleting
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`--------------------------------------------------`);
  console.log(`Servidor WhatsApp Audio Bridge Ativo!`);
  console.log(`Porta: ${PORT}`);
  console.log(`Modo: ES Modules`);
  console.log(`Temp Dir: ${TEMP_DIR}`);
  console.log(`--------------------------------------------------`);
  console.log(`Use 'pm2 logs' para monitorar em tempo real.`);
});
