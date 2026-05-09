/**
 * VPS WhatsApp Bridge
 * --------------------------------------------------------------
 * Atua como Bridge para áudios do CRM no VPS.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
// Nota: Em uma VPS real, você precisaria de whatsapp-web.js configurado aqui
// Para este ambiente de desenvolvimento, simulamos o bridge.

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    service: 'VPS WhatsApp Bridge MRO',
    time: new Date().toISOString()
  });
});

app.post('/send-voice', async (req, res) => {
  const { to, audioUrl } = req.body;
  console.log(`🎙️ [Bridge] Recebido pedido para enviar áudio para ${to}`);
  
  try {
    // Simulação de envio bem-sucedido
    res.json({ success: true, message: 'Áudio processado via Bridge' });
  } catch (err) {
    console.error('❌ Erro no Bridge:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Bridge rodando na porta ${PORT}`);
});
