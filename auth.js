// ============================================
//  Auth – Login, Registrazione, Codici invito
// ============================================
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../services/supabase');

// Middleware: verifica token JWT
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non autorizzato' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token non valido' });
  }
}

// ── POST /api/auth/register ──────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, password, inviteCode } = req.body;

  if (!email || !password || !inviteCode) {
    return res.status(400).json({ error: 'Email, password e codice invito obbligatori' });
  }

  // Verifica codice invito
  const { data: code } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', inviteCode.toUpperCase())
    .eq('used', false)
    .single();

  if (!code) {
    return res.status(400).json({ error: 'Codice di invito non valido o già usato' });
  }

  // Controlla se email già esiste
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    return res.status(400).json({ error: 'Email già registrata' });
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Crea utente
  const { data: user, error } = await supabase
    .from('users')
    .insert({ email, password_hash: passwordHash, invite_code: inviteCode, plan: code.plan })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Errore creazione utente' });

  // Segna codice come usato
  await supabase
    .from('invite_codes')
    .update({ used: true, used_by: user.id })
    .eq('code', inviteCode.toUpperCase());

  // Crea configurazione assistente vuota
  await supabase.from('assistants').insert({ user_id: user.id });

  // Genera token JWT
  const token = jwt.sign(
    { userId: user.id, email: user.email, plan: user.plan },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({ token, user: { id: user.id, email: user.email, plan: user.plan } });
});

// ── POST /api/auth/login ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('active', true)
    .single();

  if (!user) return res.status(401).json({ error: 'Credenziali non corrette' });

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) return res.status(401).json({ error: 'Credenziali non corrette' });

  const token = jwt.sign(
    { userId: user.id, email: user.email, plan: user.plan },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({ token, user: { id: user.id, email: user.email, plan: user.plan } });
});

// ── POST /api/auth/invite (solo admin) ──────────────────────────────
router.post('/invite', async (req, res) => {
  const { code, plan = 'start', adminSecret } = req.body;

  // Protezione semplice: chiave admin
  if (adminSecret !== process.env.JWT_SECRET) {
    return res.status(403).json({ error: 'Non autorizzato' });
  }

  const { data, error } = await supabase
    .from('invite_codes')
    .insert({ code: code.toUpperCase(), plan })
    .select()
    .single();

  if (error) return res.status(400).json({ error: 'Codice già esistente' });
  res.json({ success: true, code: data });
});

// ── GET /api/auth/invites (lista codici admin) ───────────────────────
router.get('/invites', async (req, res) => {
  const { adminSecret } = req.query;
  if (adminSecret !== process.env.JWT_SECRET) {
    return res.status(403).json({ error: 'Non autorizzato' });
  }
  const { data } = await supabase
    .from('invite_codes')
    .select('*')
    .order('created_at', { ascending: false });
  res.json(data);
});

// ── GET /api/auth/me ─────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('id, email, plan, created_at')
    .eq('id', req.user.userId)
    .single();
  res.json(user);
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
