// ============================================
//  Assistant – Configurazione assistente
// ============================================
const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { authMiddleware } = require('./auth');

// GET /api/assistant – leggi configurazione
router.get('/', authMiddleware, async (req, res) => {
  const { data } = await supabase
    .from('assistants')
    .select('*')
    .eq('user_id', req.user.userId)
    .single();
  res.json(data);
});

// PUT /api/assistant – aggiorna configurazione
router.put('/', authMiddleware, async (req, res) => {
  const { business_name, primary_color, sector, whatsapp_number, email,
          voice_name, opening_hours, system_prompt } = req.body;

  const { data, error } = await supabase
    .from('assistants')
    .update({
      business_name, primary_color, sector, whatsapp_number, email,
      voice_name, opening_hours, system_prompt,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', req.user.userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Errore salvataggio' });
  res.json({ success: true, assistant: data });
});

// GET /api/assistant/documents – documenti Cervello AI
router.get('/documents', authMiddleware, async (req, res) => {
  const { data } = await supabase
    .from('documents')
    .select('id, name, created_at')
    .eq('user_id', req.user.userId)
    .order('created_at', { ascending: false });
  res.json(data);
});

// POST /api/assistant/documents – aggiungi documento
router.post('/documents', authMiddleware, async (req, res) => {
  const { name, content } = req.body;
  if (!name || !content) return res.status(400).json({ error: 'Nome e contenuto obbligatori' });

  const { data, error } = await supabase
    .from('documents')
    .insert({ user_id: req.user.userId, name, content })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Errore salvataggio documento' });
  res.json({ success: true, document: data });
});

// DELETE /api/assistant/documents/:id
router.delete('/documents/:id', authMiddleware, async (req, res) => {
  await supabase
    .from('documents')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.userId);
  res.json({ success: true });
});

// GET /api/assistant/stats – statistiche dashboard
router.get('/stats', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  const [messages, bookings, conversations] = await Promise.all([
    supabase.from('messages').select('id', { count: 'exact' }).eq('user_id', userId),
    supabase.from('bookings').select('id', { count: 'exact' }).eq('user_id', userId),
    supabase.from('conversations').select('id', { count: 'exact' }).eq('user_id', userId)
  ]);

  // Ultimi 7 giorni
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: dailyData } = await supabase
    .from('daily_stats')
    .select('date, messages_count')
    .eq('user_id', userId)
    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true });

  res.json({
    totalMessages:      messages.count || 0,
    totalBookings:      bookings.count || 0,
    totalConversations: conversations.count || 0,
    chart: dailyData || []
  });
});

module.exports = router;
