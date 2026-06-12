// ============================================
//  Bookings – Prenotazioni automatiche
// ============================================
const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { authMiddleware } = require('./auth');

// GET /api/bookings – tutte le prenotazioni
router.get('/', authMiddleware, async (req, res) => {
  const { date } = req.query;
  let query = supabase
    .from('bookings')
    .select('*')
    .eq('user_id', req.user.userId)
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (date) query = query.eq('date', date);

  const { data } = await query;
  res.json(data || []);
});

// POST /api/bookings – crea prenotazione
router.post('/', authMiddleware, async (req, res) => {
  const { customer_phone, customer_name, date, time, notes } = req.body;

  if (!customer_phone || !date || !time) {
    return res.status(400).json({ error: 'Telefono, data e ora sono obbligatori' });
  }

  // Controlla se slot già occupato
  const { data: existing } = await supabase
    .from('bookings')
    .select('id')
    .eq('user_id', req.user.userId)
    .eq('date', date)
    .eq('time', time)
    .eq('status', 'confirmed')
    .single();

  if (existing) {
    return res.status(400).json({ error: 'Slot già occupato' });
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      user_id: req.user.userId,
      customer_phone, customer_name, date, time, notes
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Errore creazione prenotazione' });
  res.json({ success: true, booking: data });
});

// PATCH /api/bookings/:id/cancel – cancella prenotazione
router.patch('/:id/cancel', authMiddleware, async (req, res) => {
  await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', req.params.id)
    .eq('user_id', req.user.userId);
  res.json({ success: true });
});

module.exports = router;
