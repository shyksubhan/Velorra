/* ============================================================
   VELORRA — Contact Routes (uses shared store)
   ============================================================ */
const express = require('express');
const { getDB }        = require('../utils/firebase');
const { requireAdmin }  = require('../middleware/auth');
const store             = require('../utils/store');
const { sendContactNotification } = require('../utils/email');

const router = express.Router();

function isFirebaseAvailable() {
  try { return !!getDB(); } catch { return false; }
}

/* ── POST /api/contact ── */
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    const msgData = {
      name:      name.trim(),
      email:     email.trim().toLowerCase(),
      phone:     (phone || '').trim(),
      subject:   (subject || 'General Enquiry').trim(),
      message:   message.trim(),
      read:      false,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseAvailable()) {
      const ref = await getDB().collection('messages').add(msgData);
      msgData.id = ref.id;
    } else {
      msgData.id = 'msg-' + Date.now();
      store.messages.unshift(msgData);  /* shared store — admin can see immediately */
    }

    /* Notify admin via SSE */
    store.emit('new_message', { from: msgData.name, email: msgData.email, subject: msgData.subject });

    /* Email notification (non-blocking) */
    sendContactNotification(msgData).catch(e => console.error('Contact email failed:', e.message));

    return res.status(201).json({ message: "Message sent! We'll reply within 24 hours. ✓", id: msgData.id });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ error: 'Failed to send message.' });
  }
});

/* ── GET /api/contact (admin) ── */
router.get('/', requireAdmin, async (req, res) => {
  try {
    if (isFirebaseAvailable()) {
      const snap = await getDB().collection('messages').orderBy('createdAt', 'desc').get();
      return res.json({ messages: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    }
    return res.json({ messages: store.messages, total: store.messages.length });
  } catch (err) {
    return res.json({ messages: store.messages, total: store.messages.length });
  }
});

/* ── PATCH /api/contact/:id/read (admin) ── */
router.patch('/:id/read', requireAdmin, async (req, res) => {
  try {
    if (isFirebaseAvailable()) {
      await getDB().collection('messages').doc(req.params.id).update({ read: true });
    } else {
      const msg = store.messages.find(m => m.id === req.params.id);
      if (msg) msg.read = true;
    }
    return res.json({ message: 'Marked as read.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update.' });
  }
});

/* ── DELETE /api/contact/:id (admin) ── */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (isFirebaseAvailable()) {
      await getDB().collection('messages').doc(req.params.id).delete();
    } else {
      const idx = store.messages.findIndex(m => m.id === req.params.id);
      if (idx >= 0) store.messages.splice(idx, 1);
    }
    return res.json({ message: 'Message deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete.' });
  }
});

module.exports = router;
