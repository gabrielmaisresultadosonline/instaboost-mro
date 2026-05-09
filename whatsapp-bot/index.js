/**
 * Bot WhatsApp - Renda Extra v2 / I.A MRO
 * --------------------------------------------------------------
 * Conecta via whatsapp-web.js (LocalAuth + puppeteer headless),
 * processa mensagens da fila e atua como Bridge para áudios do CRM.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Defaults públicos do projeto Lovable Cloud
const DEFAULT_SUPABASE_URL = 'https://adljdeekwifwcdcgbpit.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkbGpkZWVrd2lmd2NkY2dicGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjk0MDMsImV4cCI6MjA4MDcwNTQwM30.odKBOAuEEW0WJEburLRTL9Qj1EbitETmhxqNoE_F_g4';

const SUPABASE_URL = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
const WPP_BOT_TOKEN = process.env.WPP_BOT_TOKEN || 'wpp-bot-default-token-change-me';
const POLL_INTERVAL = Math.max(2, parseInt(process.env.POLL_INTERVAL || '5', 10)) * 1000;
const AUTH_PATH = './.wwebjs_auth';
const CLIENT_ID = 'renda-extra-v2';
const PORT = process.env.PORT || 3000;

const ENDPOINT = `${SUPABASE_URL}/functions/v1/wpp-bot-admin`;

let currentStatus = 'disconnected';
let currentQr = null;
let currentPhone = null;
let client = null;
let initializing = false;

let lastBackendError = null;
let errorCount = 0;

// ============= Express Server (Bridge) =============
const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    bot_status: currentStatus,
    phone: currentPhone,
    service: 'WhatsApp Bot & Bridge MRO',
    time: new Date().toISOString()
  });
});

// Endpoint para envio direto de áudio do CRM
app.post('/send-voice', async (req, res) => {
  const { to, audioUrl } = req.body;

  if (!client || currentStatus !== 'connected') {
    return res.status(503).json({ error: 'Bot não está conectado no WhatsApp' });
  }

  if (!to || !audioUrl) {
    return res.status(400).json({ error: 'Parâmetros "to" e "audioUrl" obrigatórios' });
  }

  try {
    const chatId = formatPhone(to);
    console.log(`🎙️ [Bridge] Enviando áudio para ${chatId}...`);
    
    // Download do áudio via axios para garantir que temos o buffer
    const mediaRes = await axios.get(audioUrl, { responseType: 'arraybuffer' });
    const mimetype = mediaRes.headers['content-type'] || 'audio/ogg';
    const media = new MessageMedia(mimetype, Buffer.from(mediaRes.data).toString('base64'), 'voice.ogg');

    await client.sendMessage(chatId, media, { sendAudioAsVoice: true });
    
    res.json({ success: true, message: 'Áudio enviado com sucesso via Bridge' });
  } catch (err) {
    console.error('❌ Erro no Bridge ao enviar áudio:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Bridge rodando na porta ${PORT}`);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`❌ Porta ${PORT} já está em uso. O bot continuará tentando inicializar o WhatsApp, mas o envio de áudio via CRM pode falhar até que o processo antigo seja encerrado.`);
  } else {
    console.error('❌ Erro no servidor Express:', e);
  }
});

// ============= Bot Logic =============

async function callBackend(action, extra = {}) {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
        'x-bot-token': WPP_BOT_TOKEN,
      },
      body: JSON.stringify({ action, ...extra }),
    });

    if (!res.ok) {
      const text = await res.text();
      const errorMsg = `Backend ${action} ${res.status}: ${text.slice(0, 100)}`;
      if (errorMsg !== lastBackendError || errorCount % 10 === 0) {
        console.error(`⚠️  ${errorMsg}${errorCount > 0 ? ` (repetido ${errorCount}x)` : ''}`);
      }
      lastBackendError = errorMsg;
      errorCount++;
      return null;
    }

    lastBackendError = null;
    errorCount = 0;
    return await res.json();
  } catch (err) {
    const errorMsg = `Erro chamando backend (${action}): ${err.message}`;
    if (errorMsg !== lastBackendError || errorCount % 10 === 0) {
      console.error(`⚠️  ${errorMsg}${errorCount > 0 ? ` (repetido ${errorCount}x)` : ''}`);
    }
    lastBackendError = errorMsg;
    errorCount++;
    return null;
  }
}

async function sendHeartbeat() {
  await callBackend('botHeartbeat', {
    status: currentStatus,
    qr_code: currentQr,
    phone_number: currentPhone,
  });
}

function wipeAuthSession() {
  try {
    const sessionDir = path.join(AUTH_PATH, `session-${CLIENT_ID}`);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      console.log('🧹 Sessão antiga apagada.');
    }
  } catch (err) {
    console.error('Erro apagando sessão:', err.message);
  }
}

function getExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const paths = ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome-stable'];
  for (const p of paths) { if (fs.existsSync(p)) return p; }
  return undefined;
}

function buildClient() {
  const executablePath = getExecutablePath();
  return new Client({
    authStrategy: new LocalAuth({ clientId: CLIENT_ID, dataPath: AUTH_PATH }),
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    },
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote'],
      executablePath,
    },
  });
}

function attachClientHandlers(c) {
  c.on('qr', async (qr) => {
    // Only show QR in terminal if we don't have a phone connected yet
    // This reduces spam in logs
    if (!currentPhone) {
      console.log('📱 Novo QR Code recebido.');
      qrcodeTerminal.generate(qr, { small: true });
    }
    currentQr = qr;
    currentStatus = 'connecting';
    await sendHeartbeat();
  });

  c.on('ready', async () => {
    currentStatus = 'connected';
    currentQr = null;
    try { currentPhone = c.info?.wid?.user || null; } catch {}
    console.log(`🚀 Bot conectado! (${currentPhone})`);
    await sendHeartbeat();
  });

  c.on('disconnected', async (reason) => {
    console.log('❌ Desconectado:', reason);
    currentStatus = 'disconnected';
    currentQr = null;
    await sendHeartbeat();
    try { await c.destroy(); } catch {}
    client = null;
    setTimeout(() => autoInitialize(), 5000);
  });
}

async function startClientForQr({ wipe = true } = {}) {
  if (initializing) return;
  if (client) {
    try { await client.destroy(); } catch {}
    client = null;
  }
  if (wipe) wipeAuthSession();

  initializing = true;
  currentStatus = 'connecting';
  await sendHeartbeat();

  console.log('🚀 Iniciando cliente WhatsApp...');
  client = buildClient();
  attachClientHandlers(client);
  try {
    await client.initialize();
  } catch (err) {
    console.error('Erro ao inicializar:', err.message);
    currentStatus = 'disconnected';
    await sendHeartbeat();
    client = null;
  } finally {
    initializing = false;
  }
}

function formatPhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 13 && digits.startsWith('55') && digits[4] === '9') {
    digits = digits.slice(0, 4) + digits.slice(5);
  }
  if (digits.length === 10 || digits.length === 11) {
    digits = '55' + digits;
  }
  return `${digits}@c.us`;
}

async function processPending() {
  const data = await callBackend('botFetchPending');
  if (!data || !data.success) return;

  const cmd = data.commands || {};
  if (cmd.request_logout) {
    if (client) {
      try { await client.logout(); } catch {}
      try { await client.destroy(); } catch {}
      client = null;
    }
    wipeAuthSession();
    currentStatus = 'disconnected';
    await callBackend('botAckCommand', { cleared: 'logout' });
    await sendHeartbeat();
    return;
  }

  if (cmd.request_qr) {
    await callBackend('botAckCommand', { cleared: 'qr' });
    await startClientForQr({ wipe: true });
    return;
  }

  if (currentStatus !== 'connected' || !client) return;

  const messages = data.messages || [];
  for (const msg of messages) {
    if (!client || currentStatus !== 'connected') break;

    const chatId = formatPhone(msg.phone);
    if (!chatId) {
      await callBackend('botUpdateMessage', { message_id: msg.id, status: 'failed', error_message: 'Telefone inválido' });
      continue;
    }

    try {
      if (msg.message_type === 'audio' || msg.message_type === 'voice') {
        const media = await MessageMedia.fromUrl(msg.media_url);
        await client.sendMessage(chatId, media, { sendAudioAsVoice: true });
      } else if (msg.message_type === 'image' || msg.message_type === 'video' || msg.message_type === 'document') {
        const media = await MessageMedia.fromUrl(msg.media_url);
        await client.sendMessage(chatId, media, { caption: msg.message });
      } else {
        await client.sendMessage(chatId, msg.message);
      }

      await callBackend('botUpdateMessage', { message_id: msg.id, status: 'sent' });
      console.log(`✉️ Enviado para ${msg.phone} (${msg.message_type || 'text'})`);
      await new Promise((r) => setTimeout(r, 2000 + Math.random() * 3000));
    } catch (err) {
      console.error(`❌ Erro enviando para ${msg.phone}:`, err.message);
      await callBackend('botUpdateMessage', { message_id: msg.id, status: 'failed', error_message: err.message?.slice(0, 500) });
    }
  }
}

setInterval(async () => {
  await sendHeartbeat();
  await processPending();
}, POLL_INTERVAL);

process.on('SIGINT', async () => {
  try { if (client) await client.destroy(); } catch {}
  process.exit(0);
});

async function autoInitialize() {
  if (initializing || (client && currentStatus === 'connected')) return;
  const sessionDir = path.join(AUTH_PATH, `session-${CLIENT_ID}`);
  // Only auto-initialize if we have a session. 
  // Don't auto-start and generate QR codes indefinitely if no session exists.
  if (fs.existsSync(sessionDir)) {
    console.log('📦 Sessão anterior encontrada. Tentando reconectar...');
    await startClientForQr({ wipe: false });
  } else {
    console.log('ℹ️ Nenhuma sessão encontrada. Aguardando comando para gerar QR Code.');
    await sendHeartbeat();
  }
}

autoInitialize();
