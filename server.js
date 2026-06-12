// ============================================
//  AGENTE AI – Server principale
//  Avvia con: node server.js  oppure: npm run dev
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// ── Middleware ──
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/assistant', require('./routes/assistant'));
app.use('/api/messages',  require('./routes/messages'));
app.use('/api/bookings',  require('./routes/bookings'));
app.use('/api/twilio',    require('./routes/twilio'));
app.use('/api/stripe',    require('./routes/stripe'));

// ── Health check ──
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Agente AI API attiva 🤖' });
});

// ── Avvio server ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server attivo su http://localhost:${PORT}`);
});
