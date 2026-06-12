// ============================================
//  WhatsApp Business API – Invio messaggi
// ============================================
const axios = require('axios');

const BASE_URL = 'https://graph.facebook.com/v18.0';

/**
 * Invia un messaggio WhatsApp
 * @param {string} to - Numero destinatario (con prefisso, es. 393331234567)
 * @param {string} text - Testo del messaggio
 */
async function sendMessage(to, text) {
  try {
    const response = await axios.post(
      `${BASE_URL}/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to.replace('+', '').replace(/\s/g, ''),
        type: 'text',
        text: { body: text }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Errore WhatsApp invio:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Verifica il webhook Meta (necessario per attivarlo)
 */
function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook WhatsApp verificato');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
}

/**
 * Estrae il messaggio in arrivo dal payload Meta
 */
function parseIncomingMessage(body) {
  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];
    if (!message) return null;
    return {
      from: message.from,         // numero mittente
      text: message.text?.body,   // testo del messaggio
      messageId: message.id,
      timestamp: message.timestamp,
      customerName: value.contacts?.[0]?.profile?.name || 'Cliente'
    };
  } catch {
    return null;
  }
}

module.exports = { sendMessage, verifyWebhook, parseIncomingMessage };
