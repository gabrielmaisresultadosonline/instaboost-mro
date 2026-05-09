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
 * VPS WhatsApp Bridge - Audio Transcoder & Sender (Professional Version V2.2)
 * 
 * Requisitos:
 * 1. Node.js (v18+)
 * 2. FFmpeg (sudo apt install ffmpeg)
 * 3. Dependências: npm install express cors axios fluent-ffmpeg form-data uuid
 */

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TEMP_DIR = path.join(__dirname, 'temp');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Health check with basic info
app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    service: 'WhatsApp Audio Bridge', 
    version: '2.2',
    ffmpeg: 'ready',
    server_time: new Date().toISOString(),
    temp_dir_writable: fs.accessSync(TEMP_DIR, fs.constants.W_OK) === undefined
  });
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
    console.error('❌ Configuração ausente: Meta Token ou Phone ID não encontrados.');
    return res.status(400).json({ error: 'Meta Token ou Phone ID não configurados no VPS' });
  }

  const requestId = uuidv4().substring(0, 8);
  const inputPath = path.join(TEMP_DIR, `${requestId}_input.bin`);
  const outputPath = path.join(TEMP_DIR, `${requestId}_voice.ogg`);

  try {
    console.log(`\n[${new Date().toLocaleTimeString()}] [${requestId}] 🚀 NOVO PEDIDO DE ÁUDIO`);
    console.log(`[${requestId}] 📱 Destino: ${to}`);
    console.log(`[${requestId}] 🔗 URL Origem: ${audioUrl}`);

    // 1. Baixar o áudio
    console.log(`[${requestId}] ⏳ Baixando arquivo...`);
    const response = await axios({
      method: 'get',
      url: audioUrl,
      responseType: 'stream',
      timeout: 20000
    });

    const writer = fs.createWriteStream(inputPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', (err) => {
        console.error(`[${requestId}] ❌ Erro no download:`, err.message);
        reject(err);
      });
    });

    // 2. Transcodificar (OGG Opus - Requisito WhatsApp PTT)
    console.log(`[${requestId}] ⚙️ Transcodificando (libopus, 48kHz, mono)...`);
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('ogg')
        .audioCodec('libopus')
        .audioChannels(1)
        .audioFrequency(48000)
        .audioBitrate('32k')
        .on('start', (cmd) => console.log(`[${requestId}] Executando: ffmpeg ...`))
        .on('end', () => {
          console.log(`[${requestId}] ✅ Transcodificação concluída.`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`[${requestId}] ❌ Erro FFmpeg:`, err.message);
          reject(err);
        })
        .save(outputPath);
    });

    // 3. Upload para Meta Media API
    console.log(`[${requestId}] 📤 Fazendo upload para Meta API...`);
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', 'audio');
    form.append('file', fs.createReadStream(outputPath), {
      filename: 'voice.ogg',
      contentType: 'audio/ogg'
    });

    const uploadRes = await axios.post(
      `https://graph.facebook.com/v21.0/${phone}/media`,
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

    // 4. Delay de Segurança (Crítico para Meta processar o upload)
    const delayMs = 2500;
    console.log(`[${requestId}] ⏳ Aguardando ${delayMs}ms para processamento...`);
    await new Promise(resolve => setTimeout(resolve, delayMs));

    // 5. Enviar Mensagem Final (Voice/PTT mode)
    console.log(`[${requestId}] 💬 Enviando mensagem de voz...`);
    const sendRes = await axios.post(
      `https://graph.facebook.com/v21.0/${phone}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'audio',
        audio: {
          id: mediaId,
          voice: true // Crucial: Ativa o modo de visualização "Gravado"
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
    console.log(`[${requestId}] ✨ SUCESSO ABSOLUTO! Message ID: ${messageId}`);
    
    res.json({ 
      success: true, 
      messageId, 
      mediaId,
      requestId 
    });

  } catch (error) {
    const errorData = error.response?.data || error.message;
    console.error(`[${requestId}] ❌ ERRO NO PROCESSO:`, JSON.stringify(errorData, null, 2));
    res.status(500).json({ 
      error: 'Falha no VPS WhatsApp Bridge', 
      details: errorData,
      requestId
    });
  } finally {
    // Cleanup arquivos temporários após 1 minuto para garantir segurança
    setTimeout(() => {
      [inputPath, outputPath].forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlink(file, (err) => {
            if (err) console.error(`[${requestId}] Erro cleanup:`, err.message);
          });
        }
      });
    }, 60000);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`);
  console.log(`🚀 WHATSAPP AUDIO BRIDGE ATIVO`);
  console.log(`🌐 Porta: ${PORT}`);
  console.log(`🛠️ Versão: 2.2 (Profissional PTT)`);
  console.log(`📅 Início: ${new Date().toLocaleString()}`);
  console.log(`==================================================\n`);
  console.log(`Pronto para transcodificar e enviar áudios.`);
});
