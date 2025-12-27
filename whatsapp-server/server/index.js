const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configurações
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Armazenamento de clientes ativos
const activeClients = new Map();

// Função para gerar ID único
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Rota para criar nova sessão
app.post('/api/create-session', (req, res) => {
    const sessionId = generateSessionId();
    
    // Configuração do cliente
    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: sessionId
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        },
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
        }
    });

    // Armazenar cliente
    activeClients.set(sessionId, {
        client: client,
        socketId: null,
        status: 'initializing',
        phoneNumber: null,
        name: null,
        connectedAt: null
    });

    // Eventos do cliente
    client.on('qr', async (qr) => {
        console.log(`QR gerado para sessão: ${sessionId}`);
        
        // Converter QR para base64
        const qrImage = await qrcode.toDataURL(qr);
        
        // Enviar QR para frontend
        const sessionData = activeClients.get(sessionId);
        if (sessionData && sessionData.socketId) {
            io.to(sessionData.socketId).emit('qr-generated', {
                sessionId,
                qr: qrImage
            });
        }
        
        // Broadcast para todos os clientes
        io.emit('session-update', {
            sessionId,
            status: 'waiting_qr'
        });
    });

    client.on('ready', () => {
        console.log(`Cliente pronto para sessão: ${sessionId}`);
        const sessionData = activeClients.get(sessionId);
        
        if (sessionData) {
            sessionData.status = 'connected';
            sessionData.phoneNumber = client.info.wid.user;
            sessionData.name = client.info.pushname;
            sessionData.connectedAt = new Date().toISOString();
            
            // Enviar status para frontend
            if (sessionData.socketId) {
                io.to(sessionData.socketId).emit('client-ready', {
                    sessionId,
                    phoneNumber: sessionData.phoneNumber,
                    name: sessionData.name
                });
            }
            
            // Broadcast para todos os clientes
            io.emit('session-update', {
                sessionId,
                status: 'connected',
                phoneNumber: sessionData.phoneNumber,
                name: sessionData.name
            });
        }
    });

    client.on('authenticated', () => {
        console.log(`Autenticado: ${sessionId}`);
        const sessionData = activeClients.get(sessionId);
        if (sessionData) {
            sessionData.status = 'authenticated';
        }
    });

    client.on('auth_failure', (msg) => {
        console.log(`Falha na autenticação: ${sessionId}`, msg);
        const sessionData = activeClients.get(sessionId);
        if (sessionData) {
            sessionData.status = 'auth_failed';
            if (sessionData.socketId) {
                io.to(sessionData.socketId).emit('auth-failed', {
                    sessionId,
                    error: msg
                });
            }
            
            // Broadcast para todos os clientes
            io.emit('session-update', {
                sessionId,
                status: 'auth_failed'
            });
        }
    });

    client.on('disconnected', (reason) => {
        console.log(`Cliente desconectado: ${sessionId}`, reason);
        activeClients.delete(sessionId);
        
        // Broadcast para todos os clientes
        io.emit('session-removed', { sessionId });
    });

    client.on('message', async (message) => {
        console.log(`Mensagem recebida na sessão ${sessionId}:`, message.body);
        
        // Broadcast mensagem recebida
        io.emit('message-received', {
            sessionId,
            from: message.from,
            body: message.body,
            timestamp: message.timestamp
        });
    });

    // Inicializar cliente
    client.initialize();

    res.json({
        success: true,
        sessionId,
        message: 'Sessão criada com sucesso'
    });
});

// Rota para desconectar sessão
app.post('/api/disconnect-session', async (req, res) => {
    const { sessionId } = req.body;
    
    const sessionData = activeClients.get(sessionId);
    if (sessionData) {
        try {
            await sessionData.client.destroy();
            activeClients.delete(sessionId);
            
            // Broadcast para todos os clientes
            io.emit('session-removed', { sessionId });
            
            res.json({ success: true, message: 'Sessão desconectada' });
        } catch (error) {
            console.error('Erro ao desconectar:', error);
            res.status(500).json({ success: false, message: 'Erro ao desconectar' });
        }
    } else {
        res.status(404).json({ success: false, message: 'Sessão não encontrada' });
    }
});

// Rota para listar sessões ativas
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

// Rota para enviar mensagem
app.post('/api/send-message', async (req, res) => {
    const { sessionId, number, message } = req.body;
    
    const sessionData = activeClients.get(sessionId);
    if (!sessionData) {
        return res.status(404).json({ success: false, message: 'Sessão não encontrada' });
    }
    
    if (sessionData.status !== 'connected') {
        return res.status(400).json({ success: false, message: 'Sessão não está conectada' });
    }
    
    try {
        // Formatar número (adicionar @c.us se necessário)
        const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;
        
        await sessionData.client.sendMessage(formattedNumber, message);
        
        res.json({ success: true, message: 'Mensagem enviada com sucesso' });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({ success: false, message: 'Erro ao enviar mensagem' });
    }
});

// Rota para obter contatos de uma sessão
app.get('/api/contacts/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    
    const sessionData = activeClients.get(sessionId);
    if (!sessionData || sessionData.status !== 'connected') {
        return res.status(404).json({ success: false, message: 'Sessão não encontrada ou não conectada' });
    }
    
    try {
        const contacts = await sessionData.client.getContacts();
        const formattedContacts = contacts.map(contact => ({
            id: contact.id._serialized,
            name: contact.name || contact.pushname || 'Sem nome',
            number: contact.number,
            isGroup: contact.isGroup
        }));
        
        res.json({ success: true, contacts: formattedContacts });
    } catch (error) {
        console.error('Erro ao obter contatos:', error);
        res.status(500).json({ success: false, message: 'Erro ao obter contatos' });
    }
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('Novo cliente conectado:', socket.id);
    
    // Vincular socket à sessão
    socket.on('bind-session', (sessionId) => {
        const sessionData = activeClients.get(sessionId);
        if (sessionData) {
            sessionData.socketId = socket.id;
            console.log(`Socket ${socket.id} vinculado à sessão ${sessionId}`);
        }
    });
    
    // Enviar lista atual de sessões ao conectar
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
    
    // Desvincular socket
    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  Multi WhatsApp Connect`);
    console.log(`  Servidor rodando na porta ${PORT}`);
    console.log(`  Acesse: http://localhost:${PORT}`);
    console.log(`========================================\n`);
});
