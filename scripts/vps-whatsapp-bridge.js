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

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    service: 'WhatsApp Audio Bridge', 
    ffmpeg: 'ready',
    mode: 'Professional Transcoder'
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

  const requestId = uuidv4();
  // Usar .bin temporário para garantir que o download funcione idependente da fonte
  const inputPath = path.join(TEMP_DIR, `${requestId}_input.bin`);
  const outputPath = path.join(TEMP_DIR, `${requestId}_voice.ogg`);

  try {
    console.log(`\n[${new Date().toISOString()}] [${requestId}] 🚀 NOVO PEDIDO`);
    console.log(`[${requestId}] 📱 Para: ${to}`);
    console.log(`[${requestId}] 🔗 Download: ${audioUrl}`);

    // 1. Baixar o áudio
    const response = await axios({
      method: 'get',
      url: audioUrl,
      responseType: 'stream',
      timeout: 15000
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

    // 2. Transcodificar Professionalmente (OGG Opus)
    console.log(`[${requestId}] ⚙️ Transcodificando para OGG Opus (PTT Style)...`);
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('ogg')
        .audioCodec('libopus')
        .audioChannels(1)
        .audioFrequency(48000)
        .on('start', (cmd) => console.log(`[${requestId}] Comando FFmpeg: ${cmd}`))
        .on('end', () => {
          console.log(`[${requestId}] ✅ Transcodificação concluída com sucesso.`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`[${requestId}] ❌ Erro FFmpeg:`, err.message);
          reject(err);
        })
        .save(outputPath);
    });

    // 3. Upload para Meta
    console.log(`[${requestId}] 📤 Fazendo upload para a Meta Cloud API...`);
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
    console.log(`[${requestId}] 🆔 Media ID gerado: ${mediaId}`);

    // Aguardar 2 segundos para garantir que a Meta processe o arquivo
    console.log(`[${requestId}] ⏳ Aguardando 2 segundos para processamento da Meta...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Enviar PTT (Mensagem de Voz)
    console.log(`[${requestId}] 💬 Enviando mensagem de voz final...`);
    const sendRes = await axios.post(
      `https://graph.facebook.com/v21.0/${phone}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'audio',
        audio: {
          id: mediaId,
          voice: true // Isso faz aparecer como "gravado na hora"
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
    console.log(`[${requestId}] ✨ SUCESSO! Message ID: ${messageId}`);
    
    res.json({ success: true, messageId, mediaId });

  } catch (error) {
    const errorData = error.response?.data || error.message;
    console.error(`[${requestId}] ❌ FALHA CRÍTICA:`, JSON.stringify(errorData, null, 2));
    res.status(500).json({ 
      error: 'Falha no processamento do áudio no VPS', 
      details: errorData 
    });
  } finally {
    // Cleanup arquivos temporários
    setTimeout(() => {
      [inputPath, outputPath].forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlink(file, (err) => {
            if (err) console.error(`[${requestId}] Erro ao limpar arquivo temp:`, err);
          });
        }
      });
    }, 10000); // Aguarda 10s para garantir que o upload terminou
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`);
  console.log(`🚀 WHATSAPP AUDIO BRIDGE - VPS ATIVO`);
  console.log(`📅 Data: ${new Date().toLocaleString()}`);
  console.log(`🌐 Porta: ${PORT}`);
  console.log(`📦 Modo: ES Modules (import/export)`);
  console.log(`📂 Pasta Temp: ${TEMP_DIR}`);
  console.log(`==================================================\n`);
  console.log(`Aguardando solicitações do CRM...`);
});
