/**
 * Bot WhatsApp - Renda Extra v2 / I.A MRO
 * --------------------------------------------------------------
 * Conecta via whatsapp-web.js (LocalAuth + puppeteer headless),
 * envia o QR Code para a edge function `wpp-bot-admin` para que
 * apareça na página /rendaextra2/admin, e processa mensagens
 * pendentes da fila.
 *
 * Rodando na VPS:
 *   pm2 start index.js --name wpp-bot-mro --time
 *   pm2 logs wpp-bot-mro
 */

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const fetch = require('node-fetch');

// Defaults públicos do projeto Lovable Cloud (podem ser sobrescritos via .env)
const DEFAULT_SUPABASE_URL = 'https://adljdeekwifwcdcgbpit.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkbGpkZWVrd2lmd2NkY2dicGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjk0MDMsImV4cCI6MjA4MDcwNTQwM30.odKBOAuEEW0WJEburLRTL9Qj1EbitETmhxqNoE_F_g4';

const SUPABASE_URL = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
const WPP_BOT_TOKEN = process.env.WPP_BOT_TOKEN || 'wpp-bot-default-token-change-me';
const POLL_INTERVAL = Math.max(2, parseInt(process.env.POLL_INTERVAL || '5', 10)) * 1000;

if (!process.env.WPP_BOT_TOKEN) {
  console.warn('⚠️  WPP_BOT_TOKEN não definido em .env — usando token padrão.');
  console.warn('   Para produção defina o mesmo valor configurado em Lovable → Secrets → WPP_BOT_TOKEN.');
}

const ENDPOINT = `${SUPABASE_URL}/functions/v1/wpp-bot-admin`;

let currentStatus = 'connecting';
let currentQr = null;
let currentPhone = null;

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
      console.error(`⚠️  Backend ${action} ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`⚠️  Erro chamando backend (${action}):`, err.message);
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

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'renda-extra-v2', dataPath: './.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
    ],
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      '/usr/bin/chromium-browser' ||
      '/usr/bin/chromium' ||
      undefined,
  },
});

client.on('qr', async (qr) => {
  console.log('\n📱 QR Code recebido — enviando para o painel /rendaextra2/admin\n');
  qrcodeTerminal.generate(qr, { small: true });
  currentQr = qr;
  currentStatus = 'connecting';
  await sendHeartbeat();
});

client.on('authenticated', () => {
  console.log('✅ Autenticado com sucesso!');
  currentStatus = 'connecting';
  currentQr = null;
});

client.on('ready', async () => {
  currentStatus = 'connected';
  currentQr = null;
  try {
    currentPhone = client.info?.wid?.user || null;
  } catch {}
  console.log(`🚀 Bot conectado! Telefone: ${currentPhone || 'desconhecido'}`);
  await sendHeartbeat();
});

client.on('auth_failure', async (msg) => {
  console.error('❌ Falha na autenticação:', msg);
  currentStatus = 'disconnected';
  currentQr = null;
  await sendHeartbeat();
});

client.on('disconnected', async (reason) => {
  console.log('❌ Desconectado:', reason);
  currentStatus = 'disconnected';
  currentQr = null;
  currentPhone = null;
  await sendHeartbeat();
  // Tenta reinicializar
  try {
    await client.initialize();
  } catch (err) {
    console.error('Erro ao reinicializar:', err.message);
    process.exit(1);
  }
});

function formatPhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  // Brasil: 55 + DDD + 9 dígitos. Se vier com 13 dígitos e o 5º for "9", remove (formato antigo).
  if (digits.length === 13 && digits.startsWith('55') && digits[4] === '9') {
    digits = digits.slice(0, 4) + digits.slice(5);
  }
  // Se não tem DDI, assume Brasil
  if (digits.length === 10 || digits.length === 11) {
    digits = '55' + digits;
  }
  return `${digits}@c.us`;
}

async function processPending() {
  if (currentStatus !== 'connected') return;
  const data = await callBackend('botFetchPending');
  if (!data || !data.success) return;

  // Comandos do painel
  const cmd = data.commands || {};
  if (cmd.request_logout) {
    console.log('🔌 Logout solicitado pelo painel.');
    try {
      await client.logout();
    } catch (err) {
      console.error('Erro no logout:', err.message);
    }
    currentStatus = 'disconnected';
    currentPhone = null;
    currentQr = null;
    await callBackend('botAckCommand', { cleared: 'logout' });
    await sendHeartbeat();
    return;
  }
  if (cmd.request_qr && currentStatus !== 'connected') {
    // Forçar nova sessão
    try {
      await client.logout();
    } catch {}
    await callBackend('botAckCommand', { cleared: 'qr' });
  }

  const messages = data.messages || [];
  for (const msg of messages) {
    const chatId = formatPhone(msg.phone);
    if (!chatId) {
      await callBackend('botUpdateMessage', {
        message_id: msg.id,
        status: 'failed',
        error_message: 'Telefone inválido',
      });
      continue;
    }
    try {
      // Verifica se o número existe no WhatsApp
      const numberId = await client.getNumberId(chatId.replace('@c.us', ''));
      if (!numberId) {
        await callBackend('botUpdateMessage', {
          message_id: msg.id,
          status: 'failed',
          error_message: 'Número não está no WhatsApp',
        });
        continue;
      }
      await client.sendMessage(numberId._serialized, msg.message);
      await callBackend('botUpdateMessage', { message_id: msg.id, status: 'sent' });
      console.log(`✉️  Enviado para ${msg.phone}`);
      // Pequeno delay entre envios
      await new Promise((r) => setTimeout(r, 2000 + Math.random() * 3000));
    } catch (err) {
      console.error(`❌ Erro enviando para ${msg.phone}:`, err.message);
      await callBackend('botUpdateMessage', {
        message_id: msg.id,
        status: 'failed',
        error_message: err.message?.slice(0, 500) || 'Erro desconhecido',
      });
    }
  }
}

// Loop de polling
setInterval(async () => {
  await sendHeartbeat();
  await processPending();
}, POLL_INTERVAL);

process.on('SIGINT', async () => {
  console.log('\n👋 Encerrando bot...');
  try {
    await client.destroy();
  } catch {}
  process.exit(0);
});

console.log('🚀 Iniciando bot WhatsApp (Renda Extra v2)...');
console.log(`   Endpoint: ${ENDPOINT}`);
console.log(`   Polling:  ${POLL_INTERVAL / 1000}s`);
client.initialize().catch((err) => {
  console.error('Erro fatal ao iniciar cliente:', err);
  process.exit(1);
});
