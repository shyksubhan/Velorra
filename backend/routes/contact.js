/* ============================================================
   VELORRA — Contact Routes (uses shared store)
   ============================================================ */
const express = require('express');
const { getDB }        = require('../utils/firebase');
const { requireAdmin, requireRole } = require('../middleware/auth');
const store             = require('../utils/store');
const { sendContactNotification, sendReplyEmail } = require('../utils/email');

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
      replied:   false,
      replyText: null,
      repliedBy: null,
      repliedAt: null,
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

/* ── POST /api/contact/:id/reply (admin) — reply to a message ── */
router.post('/:id/reply', requireAdmin, async (req, res) => {
  try {
    const { replyText } = req.body;
    if (!replyText?.trim()) return res.status(400).json({ error: 'Reply text is required.' });

    const replyData = {
      read:      true,
      replied:   true,
      replyText: replyText.trim(),
      repliedBy: req.user.email || req.user.uid,
      repliedAt: new Date().toISOString(),
    };

    if (isFirebaseAvailable()) {
      const ref = getDB().collection('messages').doc(req.params.id);
      const doc = await ref.get();
      if (!doc.exists) return res.status(404).json({ error: 'Message not found.' });
      await ref.update(replyData);
    } else {
      const msg = store.messages.find(m => m.id === req.params.id);
      if (!msg) return res.status(404).json({ error: 'Message not found.' });
      Object.assign(msg, replyData);
    }

    /* ── Log staff activity ── */
    if (req.user?.role !== 'super_admin') {
      store.logActivity({
        staffId:   req.user.uid,
        staffName: req.user.email || 'Unknown',
        staffRole: req.user.role,
        action:    'message_reply',
        details:   { messageId: req.params.id },
      });
    }

    /* ── Send reply email to customer ── */
    let customerEmail, customerName, originalMessage;
    try {
      if (isFirebaseAvailable()) {
        const doc = await getDB().collection('messages').doc(req.params.id).get();
        customerEmail = doc.data()?.email;
        customerName  = doc.data()?.name;
        originalMessage = doc.data()?.message;
      } else {
        const msg = store.messages.find(m => m.id === req.params.id);
        customerEmail   = msg?.email;
        customerName    = msg?.name;
        originalMessage = msg?.message;
      }
      if (customerEmail) {
        sendReplyEmail({
          to: customerEmail,
          customerName,
          originalMessage,
          replyText: replyText.trim(),
        }).catch(e => console.error('Reply email failed:', e.message));
      }
    } catch (emailErr) {
      console.error('Could not fetch message for reply email:', emailErr.message);
    }

    return res.json({ message: 'Reply sent to customer ✓' });
  } catch (err) {
    console.error('Reply error:', err);
    return res.status(500).json({ error: 'Failed to save reply.' });
  }
});

/* ── DELETE /api/contact/:id — super_admin + admin only (supervisor can view/reply but not delete) ── */
router.delete('/:id', requireRole('super_admin', 'admin'), async (req, res) => {
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
