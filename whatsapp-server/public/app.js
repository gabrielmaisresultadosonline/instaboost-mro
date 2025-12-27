document.addEventListener('DOMContentLoaded', function() {
    // Detectar base URL (para funcionar tanto em / quanto em /whatsapp-api/)
    const BASE_URL = window.location.pathname.endsWith('/') 
        ? window.location.pathname.slice(0, -1) 
        : window.location.pathname.replace(/\/[^\/]*$/, '');
    
    const API_BASE = BASE_URL || '';
    
    // Socket.io - conectar ao mesmo host
    const socket = io({
        path: '/socket.io/',
        transports: ['websocket', 'polling']
    });
    
    let currentSessionId = null;
    
    // Elementos DOM
    const createSessionBtn = document.getElementById('createSessionBtn');
    const qrContainer = document.getElementById('qrContainer');
    const qrCodeImg = document.getElementById('qrCode');
    const sessionInfo = document.getElementById('sessionInfo');
    const sessionsContainer = document.getElementById('sessionsContainer');
    const refreshSessionsBtn = document.getElementById('refreshSessionsBtn');
    const sessionSelect = document.getElementById('sessionSelect');
    const phoneNumber = document.getElementById('phoneNumber');
    const messageText = document.getElementById('messageText');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    
    // Stats
    const totalSessions = document.getElementById('totalSessions');
    const connectedSessions = document.getElementById('connectedSessions');
    const pendingSessions = document.getElementById('pendingSessions');
    
    // Helper para fazer requisições
    async function apiRequest(endpoint, options = {}) {
        const url = API_BASE + endpoint;
        console.log('API Request:', url);
        const response = await fetch(url, options);
        return response;
    }
    
    // Criar nova sessão
    createSessionBtn.addEventListener('click', async () => {
        createSessionBtn.disabled = true;
        createSessionBtn.innerHTML = '<span class="loader"></span> Criando...';
        
        try {
            const response = await apiRequest('/api/create-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                currentSessionId = data.sessionId;
                
                // Mostrar container do QR Code
                qrContainer.style.display = 'block';
                qrCodeImg.src = '';
                qrCodeImg.style.opacity = '1';
                
                sessionInfo.innerHTML = `
                    <div class="session-details">
                        <p><strong>ID:</strong> ${data.sessionId}</p>
                        <p class="pulse"><i class="fas fa-spinner fa-spin"></i> Gerando QR Code...</p>
                    </div>
                `;
                
                // Vincular socket à sessão
                socket.emit('bind-session', currentSessionId);
                
                // Scroll para o QR Code
                qrContainer.scrollIntoView({ behavior: 'smooth' });
                
                // Atualizar lista de sessões
                loadActiveSessions();
            } else {
                alert('Erro: ' + (data.message || 'Falha ao criar sessão'));
            }
        } catch (error) {
            console.error('Erro ao criar sessão:', error);
            alert('Erro ao criar sessão. Verifique o console.');
        } finally {
            createSessionBtn.disabled = false;
            createSessionBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Nova Conexão';
        }
    });
    
    // Atualizar lista de sessões
    refreshSessionsBtn.addEventListener('click', () => {
        refreshSessionsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
        loadActiveSessions();
        setTimeout(() => {
            refreshSessionsBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar Lista';
        }, 500);
    });
    
    // Enviar mensagem
    sendMessageBtn.addEventListener('click', async () => {
        const selectedSession = sessionSelect.value;
        const phone = phoneNumber.value.trim();
        const message = messageText.value.trim();
        
        if (!selectedSession) {
            alert('Selecione uma sessão!');
            return;
        }
        
        if (!phone) {
            alert('Digite o número do WhatsApp!');
            return;
        }
        
        if (!message) {
            alert('Digite uma mensagem!');
            return;
        }
        
        sendMessageBtn.disabled = true;
        sendMessageBtn.innerHTML = '<span class="loader"></span> Enviando...';
        
        try {
            const response = await apiRequest('/api/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: selectedSession,
                    number: phone,
                    message: message
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Mensagem enviada com sucesso!');
                messageText.value = '';
            } else {
                alert('Erro: ' + data.message);
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            alert('Erro ao enviar mensagem');
        } finally {
            sendMessageBtn.disabled = false;
            sendMessageBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Mensagem';
        }
    });
    
    // Socket.io listeners
    socket.on('connect', () => {
        console.log('Socket conectado:', socket.id);
    });
    
    socket.on('connect_error', (err) => {
        console.error('Erro de conexão socket:', err);
    });
    
    socket.on('qr-generated', (data) => {
        console.log('QR recebido:', data.sessionId);
        if (data.sessionId === currentSessionId) {
            qrCodeImg.src = data.qr;
            sessionInfo.innerHTML = `
                <div class="session-details">
                    <p><strong>ID:</strong> ${data.sessionId}</p>
                    <p><strong>Status:</strong> <span class="status pending">Aguardando QR</span></p>
                </div>
            `;
        }
    });
    
    socket.on('client-ready', (data) => {
        console.log('Cliente pronto:', data);
        if (data.sessionId === currentSessionId) {
            sessionInfo.innerHTML = `
                <div class="session-details">
                    <p><strong>ID:</strong> ${data.sessionId}</p>
                    <p><strong>Status:</strong> <span class="status connected">Conectado</span></p>
                    <p><strong>Número:</strong> ${data.phoneNumber}</p>
                    <p><strong>Nome:</strong> ${data.name || 'Não informado'}</p>
                </div>
            `;
            qrCodeImg.style.opacity = '0.3';
            
            // Atualizar lista de sessões
            loadActiveSessions();
        }
    });
    
    socket.on('auth-failed', (data) => {
        if (data.sessionId === currentSessionId) {
            sessionInfo.innerHTML = `
                <div class="session-details">
                    <p><strong>ID:</strong> ${data.sessionId}</p>
                    <p><strong>Status:</strong> <span class="status disconnected">Falha na autenticação</span></p>
                    <p><strong>Erro:</strong> ${data.error}</p>
                </div>
            `;
        }
    });
    
    socket.on('session-update', (data) => {
        console.log('Sessão atualizada:', data);
        loadActiveSessions();
    });
    
    socket.on('session-removed', (data) => {
        console.log('Sessão removida:', data);
        loadActiveSessions();
        
        if (data.sessionId === currentSessionId) {
            qrContainer.style.display = 'none';
            currentSessionId = null;
        }
    });
    
    socket.on('message-received', (data) => {
        console.log('Mensagem recebida:', data);
    });
    
    // Carregar sessões ativas
    async function loadActiveSessions() {
        try {
            const response = await apiRequest('/api/active-sessions');
            const data = await response.json();
            
            renderSessions(data.sessions);
            updateStats(data.sessions);
            updateSessionSelect(data.sessions);
        } catch (error) {
            console.error('Erro ao carregar sessões:', error);
        }
    }
    
    // Atualizar estatísticas
    function updateStats(sessions) {
        const connected = sessions.filter(s => s.status === 'connected').length;
        const pending = sessions.filter(s => s.status !== 'connected' && s.status !== 'auth_failed').length;
        
        totalSessions.textContent = sessions.length;
        connectedSessions.textContent = connected;
        pendingSessions.textContent = pending;
    }
    
    // Atualizar select de sessões
    function updateSessionSelect(sessions) {
        const connectedSessions = sessions.filter(s => s.status === 'connected');
        
        sessionSelect.innerHTML = '<option value="">-- Selecione uma sessão conectada --</option>';
        
        connectedSessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session.sessionId;
            option.textContent = `${session.name || 'WhatsApp'} (${session.phoneNumber})`;
            sessionSelect.appendChild(option);
        });
    }
    
    // Renderizar lista de sessões
    function renderSessions(sessions) {
        if (sessions.length === 0) {
            sessionsContainer.innerHTML = `
                <div class="no-session">
                    <i class="fas fa-plug"></i>
                    <p>Nenhuma conexão ativa no momento</p>
                </div>
            `;
            return;
        }
        
        sessionsContainer.innerHTML = '';
        
        sessions.forEach(session => {
            const sessionCard = document.createElement('div');
            
            let statusClass = 'pending';
            let statusText = 'Inicializando';
            let cardClass = 'pending';
            
            if (session.status === 'connected') {
                statusClass = 'connected';
                statusText = 'Conectado';
                cardClass = 'connected';
            } else if (session.status === 'auth_failed') {
                statusClass = 'disconnected';
                statusText = 'Falha';
                cardClass = 'error';
            } else if (session.status === 'authenticated') {
                statusText = 'Autenticado';
            } else if (session.status === 'waiting_qr') {
                statusText = 'Aguardando QR';
            }
            
            sessionCard.className = `session-card ${cardClass}`;
            
            sessionCard.innerHTML = `
                <div class="session-header">
                    <div class="session-info">
                        <h4>
                            <i class="fab fa-whatsapp" style="color: #25D366;"></i>
                            ${session.name || 'WhatsApp'}
                        </h4>
                        <p><i class="fas fa-phone"></i> ${session.phoneNumber || 'Não conectado'}</p>
                        <p><i class="fas fa-fingerprint"></i> ${session.sessionId.substring(0, 20)}...</p>
                        ${session.connectedAt ? `<p><i class="fas fa-clock"></i> ${new Date(session.connectedAt).toLocaleString('pt-BR')}</p>` : ''}
                    </div>
                    <div class="session-actions">
                        <span class="status ${statusClass}">${statusText}</span>
                        <button class="btn btn-danger btn-sm" onclick="disconnectSession('${session.sessionId}')">
                            <i class="fas fa-power-off"></i>
                        </button>
                    </div>
                </div>
            `;
            
            sessionsContainer.appendChild(sessionCard);
        });
    }
    
    // Função global para desconectar sessão
    window.disconnectSession = async function(sessionId) {
        if (confirm('Tem certeza que deseja desconectar esta sessão?')) {
            try {
                const response = await apiRequest('/api/disconnect-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ sessionId })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    if (sessionId === currentSessionId) {
                        qrContainer.style.display = 'none';
                        currentSessionId = null;
                    }
                    loadActiveSessions();
                } else {
                    alert('Erro: ' + data.message);
                }
            } catch (error) {
                console.error('Erro ao desconectar sessão:', error);
                alert('Erro ao desconectar sessão');
            }
        }
    };
    
    // Carregar sessões ao iniciar
    loadActiveSessions();
    
    // Atualizar sessões periodicamente
    setInterval(loadActiveSessions, 30000);
});
