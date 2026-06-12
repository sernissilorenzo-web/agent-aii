// ============================================
//  Messages – Webhook WhatsApp + risposte AI
// ============================================
const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { sendMessage, verifyWebhook, parseIncomingMessage } = require('../services/whatsapp');
const { generateReply } = require('../services/claude');

// GET /api/messages/webhook – verifica webhook Meta
router.get('/webhook', verifyWebhook);

// POST /api/messages/webhook – ricevi messaggi WhatsApp
router.post('/webhook', async (req, res) => {
  // Meta richiede risposta immediata 200
  res.sendStatus(200);

  const incoming = parseIncomingMessage(req.body);
  if (!incoming || !incoming.text) return;

  try {
    // Trova a quale cliente (user) appartiene questo numero WhatsApp
    const { data: assistant } = await supabase
      .from('assistants')
      .select('user_id')
      .eq('whatsapp_number', incoming.from)
      .single();

    // Se non trovato, cerca per numero base
    // (in produzione ogni cliente ha un numero diverso)
    if (!assistant) {
      console.log('Numero WhatsApp non associato a nessun utente:', incoming.from);
      return;
    }

    const userId = assistant.user_id;

    // Trova o crea conversazione
    let { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('customer_phone', incoming.from)
      .single();

    if (!conv) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          customer_phone: incoming.from,
          customer_name: incoming.customerName,
          last_message: incoming.text,
          message_count: 0
        })
        .select()
        .single();
      conv = newConv;
    }

    // Salva messaggio in arrivo
    await supabase.from('messages').insert({
      conversation_id: conv.id,
      user_id: userId,
      direction: 'inbound',
      content: incoming.text,
      whatsapp_message_id: incoming.messageId
    });

    // Carica storico ultimi 10 messaggi
    const { data: history } = await supabase
      .from('messages')
      .select('direction, content')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Genera risposta AI
    const reply = await generateReply(userId, incoming.text, (history || []).reverse());

    // Invia risposta WhatsApp
    await sendMessage(incoming.from, reply);

    // Salva risposta nel DB
    await supabase.from('messages').insert({
      conversation_id: conv.id,
      user_id: userId,
      direction: 'outbound',
      content: reply
    });

    // Aggiorna statistiche
    const today = new Date().toISOString().split('T')[0];
    await supabase.rpc('increment_stat', { p_user_id: userId, p_date: today, p_field: 'messages_count' })
      .catch(() => supabase.from('daily_stats').upsert({
        user_id: userId, date: today, messages_count: 1
      }, { onConflict: 'user_id,date', ignoreDuplicates: false }));

    // Aggiorna contatore conversazione
    await supabase.from('conversations')
      .update({ last_message: incoming.text, last_message_at: new Date(), message_count: (conv.message_count || 0) + 1 })
      .eq('id', conv.id);

  } catch (error) {
    console.error('Errore gestione messaggio:', error);
  }
});

// GET /api/messages/conversations – lista conversazioni
const { authMiddleware } = require('./auth');
router.get('/conversations', authMiddleware, async (req, res) => {
  const { data } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', req.user.userId)
    .order('last_message_at', { ascending: false });
  res.json(data || []);
});

// GET /api/messages/conversations/:id – messaggi di una conversazione
router.get('/conversations/:id', authMiddleware, async (req, res) => {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', req.params.id)
    .order('created_at', { ascending: true });
  res.json(data || []);
});

module.exports = router;
