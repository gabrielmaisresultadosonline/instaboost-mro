const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Storage
const activeClients = new Map();
const qrCodes = new Map();
const messageHistory = new Map(); // sessionId -> messages[]
const flowsConfig = new Map(); // sessionId -> flows[]

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ==================== ROUTES ====================

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', sessions: activeClients.size, uptime: process.uptime() });
});

// Serve frontend
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Create session
app.post('/api/create-session', (req, res) => {
  const sessionId = generateSessionId();

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: sessionId }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--single-process'
      ]
    }
  });

  activeClients.set(sessionId, {
    client,
    socketId: null,
    status: 'initializing',
    phoneNumber: null,
    name: null,
    connectedAt: null
  });

  messageHistory.set(sessionId, []);

  // QR event
  client.on('qr', async (qr) => {
    console.log(`QR generated for: ${sessionId}`);
    try {
      const qrImage = await qrcode.toDataURL(qr);
      qrCodes.set(sessionId, qrImage);
      io.emit('qr-generated', { sessionId, qr: qrImage });
      io.emit('session-update', { sessionId, status: 'waiting_qr' });
    } catch (err) {
      console.error('QR generation error:', err);
    }
  });

  // Ready event
  client.on('ready', () => {
    console.log(`Client ready: ${sessionId}`);
    const data = activeClients.get(sessionId);
    if (data) {
      data.status = 'connected';
      data.phoneNumber = client.info?.wid?.user || null;
      data.name = client.info?.pushname || null;
      data.connectedAt = new Date().toISOString();
      qrCodes.delete(sessionId);
      io.emit('client-ready', { sessionId, phoneNumber: data.phoneNumber, name: data.name });
      io.emit('session-update', { sessionId, status: 'connected', phoneNumber: data.phoneNumber, name: data.name });
    }
  });

  client.on('authenticated', () => {
    console.log(`Authenticated: ${sessionId}`);
    const data = activeClients.get(sessionId);
    if (data) data.status = 'authenticated';
  });

  client.on('auth_failure', (msg) => {
    console.log(`Auth failure: ${sessionId}`, msg);
    const data = activeClients.get(sessionId);
    if (data) {
      data.status = 'auth_failed';
      io.emit('auth-failed', { sessionId, error: msg });
      io.emit('session-update', { sessionId, status: 'auth_failed' });
    }
  });

  client.on('disconnected', (reason) => {
    console.log(`Disconnected: ${sessionId}`, reason);
    activeClients.delete(sessionId);
    qrCodes.delete(sessionId);
    messageHistory.delete(sessionId);
    io.emit('session-removed', { sessionId });
  });

  // Message handler - store + broadcast + check flows
  client.on('message', async (message) => {
    const msgObj = {
      id: message.id?.id || Date.now().toString(),
      from: message.from,
      to: message.to,
      body: message.body,
      timestamp: message.timestamp,
      fromMe: false,
      type: message.type,
      hasMedia: message.hasMedia
    };

    const history = messageHistory.get(sessionId) || [];
    history.push(msgObj);
    if (history.length > 500) history.shift();
    messageHistory.set(sessionId, history);

    io.emit('message-received', { sessionId, message: msgObj });

    // Check flows
    const sessionFlows = flowsConfig.get(sessionId) || [];
    for (const flow of sessionFlows) {
      if (!flow.isActive) continue;
      const triggerWords = flow.trigger.toLowerCase().split(',').map(w => w.trim());
      const msgLower = (message.body || '').toLowerCase();
      if (triggerWords.some(w => msgLower.includes(w))) {
        for (const step of flow.steps) {
          if (step.type === 'delay') {
            await new Promise(r => setTimeout(r, (step.delay || 1) * 1000));
          } else if (step.type === 'message') {
            try { await client.sendMessage(message.from, step.content); } catch (e) { console.error('Flow send error:', e); }
          }
        }
        break;
      }
    }
  });

  // Message sent by user
  client.on('message_create', (message) => {
    if (message.fromMe) {
      const msgObj = {
        id: message.id?.id || Date.now().toString(),
        from: message.from,
        to: message.to,
        body: message.body,
        timestamp: message.timestamp,
        fromMe: true,
        type: message.type
      };
      const history = messageHistory.get(sessionId) || [];
      history.push(msgObj);
      messageHistory.set(sessionId, history);
      io.emit('message-sent', { sessionId, message: msgObj });
    }
  });

  client.initialize();

  res.json({ success: true, sessionId, message: 'Session created' });
});

// Get QR code for session
app.get('/api/qr/:sessionId', (req, res) => {
  const qr = qrCodes.get(req.params.sessionId);
  if (qr) {
    res.json({ success: true, qr });
  } else {
    const data = activeClients.get(req.params.sessionId);
    if (data && data.status === 'connected') {
      res.json({ success: true, qr: null, status: 'connected' });
    } else {
      res.json({ success: false, qr: null, status: data?.status || 'unknown' });
    }
  }
});

// Disconnect session
app.post('/api/disconnect-session', async (req, res) => {
  const { sessionId } = req.body;
  const data = activeClients.get(sessionId);
  if (data) {
    try {
      await data.client.destroy();
      activeClients.delete(sessionId);
      qrCodes.delete(sessionId);
      messageHistory.delete(sessionId);
      io.emit('session-removed', { sessionId });
      res.json({ success: true });
    } catch (error) {
      console.error('Disconnect error:', error);
      activeClients.delete(sessionId);
      res.json({ success: true, message: 'Force removed' });
    }
  } else {
    res.status(404).json({ success: false, message: 'Session not found' });
  }
});

// List active sessions
app.get('/api/active-sessions', (req, res) => {
  const sessions = [];
  activeClients.forEach((data, sessionId) => {
    sessions.push({
      sessionId,
      status: data.status,
      phoneNumber: data.phoneNumber,
      name: data.name,
      connectedAt: data.connectedAt
    });
  });
  res.json({ sessions });
});

// Send text message
app.post('/api/send-message', async (req, res) => {
  const { sessionId, number, message } = req.body;
  const data = activeClients.get(sessionId);
  if (!data) return res.status(404).json({ success: false, message: 'Session not found' });
  if (data.status !== 'connected') return res.status(400).json({ success: false, message: 'Not connected' });

  try {
    const formattedNumber = number.includes('@') ? number : `${number}@c.us`;
    await data.client.sendMessage(formattedNumber, message);
    res.json({ success: true });
  } catch (error) {
    console.error('Send error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send media message
app.post('/api/send-media', async (req, res) => {
  const { sessionId, number, mediaUrl, caption, mimetype } = req.body;
  const data = activeClients.get(sessionId);
  if (!data || data.status !== 'connected') return res.status(400).json({ success: false });

  try {
    const formattedNumber = number.includes('@') ? number : `${number}@c.us`;
    const media = await MessageMedia.fromUrl(mediaUrl);
    await data.client.sendMessage(formattedNumber, media, { caption: caption || '' });
    res.json({ success: true });
  } catch (error) {
    console.error('Send media error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send base64 media
app.post('/api/send-media-base64', async (req, res) => {
  const { sessionId, number, base64, mimetype, filename, caption } = req.body;
  const data = activeClients.get(sessionId);
  if (!data || data.status !== 'connected') return res.status(400).json({ success: false });

  try {
    const formattedNumber = number.includes('@') ? number : `${number}@c.us`;
    const media = new MessageMedia(mimetype, base64, filename);
    await data.client.sendMessage(formattedNumber, media, { caption: caption || '' });
    res.json({ success: true });
  } catch (error) {
    console.error('Send media error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get contacts
app.get('/api/contacts/:sessionId', async (req, res) => {
  const data = activeClients.get(req.params.sessionId);
  if (!data || data.status !== 'connected') return res.status(404).json({ success: false });

  try {
    const contacts = await data.client.getContacts();
    const formatted = contacts.map(c => ({
      id: c.id._serialized,
      name: c.name || c.pushname || 'Sem nome',
      number: c.number,
      isGroup: c.isGroup,
      isMyContact: c.isMyContact
    }));
    res.json({ success: true, contacts: formatted });
  } catch (error) {
    console.error('Contacts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get chats
app.get('/api/chats/:sessionId', async (req, res) => {
  const data = activeClients.get(req.params.sessionId);
  if (!data || data.status !== 'connected') return res.status(404).json({ success: false });

  try {
    const chats = await data.client.getChats();
    const formatted = chats.slice(0, 50).map(c => ({
      id: c.id._serialized,
      name: c.name,
      isGroup: c.isGroup,
      unreadCount: c.unreadCount,
      lastMessage: c.lastMessage?.body,
      timestamp: c.timestamp
    }));
    res.json({ success: true, chats: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get messages from a chat
app.get('/api/messages/:sessionId/:chatId', async (req, res) => {
  const data = activeClients.get(req.params.sessionId);
  if (!data || data.status !== 'connected') return res.status(404).json({ success: false });

  try {
    const chat = await data.client.getChatById(req.params.chatId);
    const messages = await chat.fetchMessages({ limit: 50 });
    const formatted = messages.map(m => ({
      id: m.id.id,
      from: m.from,
      to: m.to,
      body: m.body,
      timestamp: m.timestamp,
      fromMe: m.fromMe,
      type: m.type,
      hasMedia: m.hasMedia
    }));
    res.json({ success: true, messages: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Message history from memory
app.get('/api/history/:sessionId', (req, res) => {
  const history = messageHistory.get(req.params.sessionId) || [];
  res.json({ success: true, messages: history });
});

// Flow management
app.get('/api/flows/:sessionId', (req, res) => {
  const flows = flowsConfig.get(req.params.sessionId) || [];
  res.json({ success: true, flows });
});

app.post('/api/flows/:sessionId', (req, res) => {
  const { flows } = req.body;
  flowsConfig.set(req.params.sessionId, flows);
  res.json({ success: true });
});

// Bulk send
app.post('/api/bulk-send', async (req, res) => {
  const { sessionId, numbers, message, delay = 2000 } = req.body;
  const data = activeClients.get(sessionId);
  if (!data || data.status !== 'connected') return res.status(400).json({ success: false });

  let sent = 0, failed = 0;
  for (const number of numbers) {
    try {
      const formatted = number.includes('@') ? number : `${number}@c.us`;
      await data.client.sendMessage(formatted, message);
      sent++;
      await new Promise(r => setTimeout(r, delay));
    } catch (e) {
      failed++;
      console.error(`Bulk send failed for ${number}:`, e.message);
    }
  }
  res.json({ success: true, sent, failed, total: numbers.length });
});

// ==================== SOCKET.IO ====================

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('bind-session', (sessionId) => {
    const data = activeClients.get(sessionId);
    if (data) {
      data.socketId = socket.id;
    }
  });

  socket.on('get-sessions', () => {
    const sessions = [];
    activeClients.forEach((data, sessionId) => {
      sessions.push({
        sessionId,
        status: data.status,
        phoneNumber: data.phoneNumber,
        name: data.name,
        connectedAt: data.connectedAt
      });
    });
    socket.emit('sessions-list', { sessions });
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// ==================== START ====================

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  ZAP MRO Cloud - WhatsApp CRM`);
  console.log(`  Server running on port ${PORT}`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`========================================\n`);
});
