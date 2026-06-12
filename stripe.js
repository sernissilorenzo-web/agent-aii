// ============================================
//  Stripe – Pagamenti e abbonamenti
// ============================================
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../services/supabase');
const { authMiddleware } = require('./auth');

const PRICE_IDS = {
  start:    process.env.STRIPE_PRICE_START,
  pro:      process.env.STRIPE_PRICE_PRO,
  advanced: process.env.STRIPE_PRICE_ADVANCED
};

// POST /api/stripe/checkout – crea sessione pagamento
router.post('/checkout', authMiddleware, async (req, res) => {
  const { plan } = req.body;
  if (!PRICE_IDS[plan]) return res.status(400).json({ error: 'Piano non valido' });

  const { data: user } = await supabase
    .from('users')
    .select('email, stripe_customer_id')
    .eq('id', req.user.userId)
    .single();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/dashboard?payment=success`,
    cancel_url:  `${process.env.FRONTEND_URL}/pricing`,
    metadata: { userId: req.user.userId, plan }
  });

  res.json({ url: session.url });
});

// POST /api/stripe/webhook – Stripe ci avvisa dei pagamenti
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).send('Webhook error');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, plan } = session.metadata;

    // Aggiorna piano utente
    await supabase.from('users')
      .update({
        plan,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription
      })
      .eq('id', userId);
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    await supabase.from('users')
      .update({ plan: 'start', stripe_subscription_id: null })
      .eq('stripe_subscription_id', sub.id);
  }

  res.json({ received: true });
});

// GET /api/stripe/portal – portale gestione abbonamento
router.post('/portal', authMiddleware, async (req, res) => {
  const { data: user } = await supabase
    .from('users').select('stripe_customer_id').eq('id', req.user.userId).single();

  if (!user?.stripe_customer_id) {
    return res.status(400).json({ error: 'Nessun abbonamento attivo' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${process.env.FRONTEND_URL}/dashboard`
  });

  res.json({ url: session.url });
});

module.exports = router;
