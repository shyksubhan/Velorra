/* ============================================================
   VELORRA — Newsletter Routes (uses shared store)
   ============================================================ */
const express = require('express');
const { getDB }        = require('../utils/firebase');
const { requireAdmin }  = require('../middleware/auth');
const store             = require('../utils/store');
const { sendNewsletterWelcome } = require('../utils/email');

const router = express.Router();

function isFirebaseAvailable() {
  try { return !!getDB(); } catch { return false; }
}

/* ── POST /api/newsletter — Subscribe ── */
router.post('/', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    const normalEmail = email.trim().toLowerCase();

    if (isFirebaseAvailable()) {
      const db = getDB();
      const existing = await db.collection('subscribers').where('email', '==', normalEmail).limit(1).get();
      if (!existing.empty) return res.json({ message: "You're already subscribed! 💛", alreadySubscribed: true });
      const ref = await db.collection('subscribers').add({ email: normalEmail, subscribedAt: new Date().toISOString(), active: true });
      sendNewsletterWelcome(normalEmail).catch(e => console.error('Welcome email failed:', e.message));
      return res.status(201).json({ message: "Welcome to the Velorra Circle! 💛 Check your inbox for 10% off.", id: ref.id });
    }

    /* In-memory via shared store */
    if (store.subscribers.find(s => s.email === normalEmail)) {
      return res.json({ message: "You're already subscribed! 💛", alreadySubscribed: true });
    }
    const sub = { id: 'sub-' + Date.now(), email: normalEmail, subscribedAt: new Date().toISOString(), active: true };
    store.subscribers.unshift(sub);
    store.emit('new_subscriber', { email: normalEmail });
    sendNewsletterWelcome(normalEmail).catch(e => console.error('Welcome email failed:', e.message));
    return res.status(201).json({ message: "Welcome to the Velorra Circle! 💛 Check your inbox for 10% off.", id: sub.id });

  } catch (err) {
    console.error('Newsletter error:', err);
    return res.status(500).json({ error: 'Failed to subscribe.' });
  }
});

/* ── GET /api/newsletter (admin) ── */
router.get('/', requireAdmin, async (req, res) => {
  try {
    if (isFirebaseAvailable()) {
      const snap = await getDB().collection('subscribers').orderBy('subscribedAt', 'desc').get();
      return res.json({ subscribers: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    }
    return res.json({ subscribers: store.subscribers, total: store.subscribers.length });
  } catch (err) {
    return res.json({ subscribers: store.subscribers, total: store.subscribers.length });
  }
});

/* ── DELETE /api/newsletter/:id (admin) ── */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (isFirebaseAvailable()) {
      await getDB().collection('subscribers').doc(req.params.id).delete();
    } else {
      const idx = store.subscribers.findIndex(s => s.id === req.params.id);
      if (idx >= 0) store.subscribers.splice(idx, 1);
    }
    return res.json({ message: 'Subscriber removed.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove subscriber.' });
  }
});

module.exports = router;
