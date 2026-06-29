/* ============================================================
   VELORRA — Payments Routes
   Supports: COD, Card (Stripe test mode), Bank Transfer
   ============================================================ */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const store = require('../utils/store');

const router = express.Router();

const PAYMENT_METHODS = ['cod', 'card', 'bank_transfer'];

/* ── POST /api/payments/initiate ──
   Called when customer selects a payment method at checkout.
   Returns payment instructions / redirect URL.
*/
router.post('/initiate', async (req, res) => {
  try {
    const { paymentMethod, amount, orderRef, customerPhone, customerEmail } = req.body;

    if (!paymentMethod || !amount || !orderRef) {
      return res.status(400).json({ error: 'paymentMethod, amount, and orderRef are required.' });
    }
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ error: `Invalid payment method. Supported: ${PAYMENT_METHODS.join(', ')}` });
    }

    const txnId = 'TXN-' + uuidv4().replace(/-/g, '').toUpperCase().slice(0, 10);

    switch (paymentMethod) {

      case 'cod':
        return res.json({
          method:       'cod',
          txnId,
          status:       'pending',
          instructions: 'Pay in cash when your order arrives. Our courier will collect the payment at delivery.',
          amount,
          orderRef,
        });

      case 'card': {
        /*
          Stripe integration for card payments.
          Set STRIPE_SECRET_KEY in .env — use sk_test_... for testing.
          The frontend uses Stripe.js with your STRIPE_PUBLISHABLE_KEY.
        */
        if (!process.env.STRIPE_SECRET_KEY) {
          return res.json({
            method:        'card',
            txnId,
            status:        'demo',
            amount,
            orderRef,
            instructions:  'Card payment is in demo mode. Set STRIPE_SECRET_KEY in .env to enable live card payments.',
            demoMode:      true,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
            setupRequired: 'Set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in .env to enable card payments.',
          });
        }

        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        const paymentIntent = await stripe.paymentIntents.create({
          amount:      Math.round(amount * 100), /* Stripe uses smallest currency unit */
          currency:    'pkr',
          description: `Velorra Jewelry Order ${orderRef}`,
          metadata:    { orderRef },
        });

        return res.json({
          method:       'card',
          txnId,
          status:       'requires_payment',
          clientSecret: paymentIntent.client_secret,
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
          amount,
          orderRef,
        });
      }

      case 'bank_transfer':
        return res.json({
          method:       'bank_transfer',
          txnId,
          status:       'pending',
          amount,
          orderRef,
          instructions: `Transfer PKR ${amount.toLocaleString()} to:\nBank: HBL\nAccount Title: Velorra Jewelry\nAccount No: 1234-5678-9012\nIBAN: PK00HABB0000000000000000\nReference: ${orderRef}\n\nEmail your transfer receipt to velorrajewelry@gmail.com with your order number.`,
        });
    }

  } catch (err) {
    console.error('Payment initiate error:', err);
    return res.status(500).json({ error: 'Payment initiation failed: ' + err.message });
  }
});

/* ── POST /api/payments/verify ── Verify a payment by txnId ── */
router.post('/verify', async (req, res) => {
  try {
    const { txnId, orderRef } = req.body;
    if (!txnId || !orderRef) return res.status(400).json({ error: 'txnId and orderRef are required.' });

    /* In production: query payment gateway API to verify */
    /* For demo mode: mark order as payment_received */
    const order = store.findOrder(orderRef);
    if (order) {
      order.paymentStatus = 'received';
      order.txnId         = txnId;
      order.updatedAt     = new Date().toISOString();
    }

    return res.json({ verified: true, txnId, orderRef, message: 'Payment verified successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Payment verification failed.' });
  }
});

/* ── POST /api/payments/stripe-webhook ── Stripe event webhook ── */
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) return res.sendStatus(200);
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const event  = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'payment_intent.succeeded') {
      const pi    = event.data.object;
      const order = store.findOrder(pi.metadata?.orderRef);
      if (order) { order.paymentStatus = 'received'; order.txnId = pi.id; }
    }
    res.sendStatus(200);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
