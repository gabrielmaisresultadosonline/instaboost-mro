import express from 'express';
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
 * VPS WhatsApp Bridge - Audio Transcoder & Sender
 * 
 * Este script deve ser executado em um servidor VPS com FFmpeg instalado.
 * Ele recebe um áudio (WebM/MP3/etc), converte para OGG Opus (padrão WhatsApp PTT)
 * e envia via API Oficial da Meta.
 * 
 * Requisitos:
 * 1. Node.js
 * 2. FFmpeg instalado no sistema (sudo apt install ffmpeg)
 * 3. npm install express axios fluent-ffmpeg form-data uuid
 */

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TEMP_DIR = path.join(__dirname, 'temp');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

// Configurações da Meta (Devem ser passadas via variáveis de ambiente ou aqui)
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || 'SEU_TOKEN_AQUI';
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || 'SEU_PHONE_ID_AQUI';

app.post('/send-voice', async (req, res) => {
  const { to, audioUrl } = req.body;

  if (!to || !audioUrl) {
    return res.status(400).json({ error: 'Parâmetros "to" e "audioUrl" são obrigatórios' });
  }

  const requestId = uuidv4();
  const inputPath = path.join(TEMP_DIR, `${requestId}_input`);
  const outputPath = path.join(TEMP_DIR, `${requestId}_voice.ogg`);

  try {
    console.log(`[${requestId}] Iniciando processo para: ${to}`);
    console.log(`[${requestId}] Baixando áudio: ${audioUrl}`);

    // 1. Baixar o áudio original
    const response = await axios({
      method: 'get',
      url: audioUrl,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(inputPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // 2. Transcodificar para OGG Opus (Requisito da Meta para Mensagem de Voz)
    console.log(`[${requestId}] Transcodificando para OGG Opus...`);
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('ogg')
        .audioCodec('libopus')
        .audioChannels(1)
        .audioFrequency(16000)
        .on('end', resolve)
        .on('error', (err) => {
          console.error(`[${requestId}] Erro FFmpeg:`, err);
          reject(err);
        })
        .save(outputPath);
    });

    // 3. Upload para a Meta
    console.log(`[${requestId}] Fazendo upload para a Meta...`);
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', 'audio');
    form.append('file', fs.createReadStream(outputPath), {
      filename: 'voice.ogg',
      contentType: 'audio/ogg; codecs=opus'
    });

    const uploadRes = await axios.post(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/media`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`
        }
      }
    );

    const mediaId = uploadRes.data.id;
    console.log(`[${requestId}] Media ID obtido: ${mediaId}`);

    // 4. Enviar Mensagem
    console.log(`[${requestId}] Enviando mensagem de voz...`);
    const sendRes = await axios.post(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'audio',
        audio: {
          id: mediaId,
          voice: true // Isso torna o áudio "gravado na hora" (PTT)
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[${requestId}] Sucesso! Message ID:`, sendRes.data.messages[0].id);
    
    res.json({ 
      success: true, 
      messageId: sendRes.data.messages[0].id,
      mediaId: mediaId
    });

  } catch (error) {
    console.error(`[${requestId}] Erro no processo:`, error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Falha ao processar/enviar áudio', 
      details: error.response?.data || error.message 
    });
  } finally {
    // Limpar arquivos temporários
    [inputPath, outputPath].forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor de Áudio rodando na porta ${PORT}`);
  console.log(`Para ver os logs em tempo real, use: pm2 logs (se usar PM2) ou apenas observe este terminal.`);
});
